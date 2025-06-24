
'use client';

import { firestore, serverTimestamp } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc } from 'firebase/firestore';
import type { EncryptedKeyPackage } from '@/types';

// --- Helper Functions ---
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

// --- RSA Key Management ---
const rsaKeygenParams: RsaHashedKeyGenParams = {
  name: 'RSA-OAEP',
  modulusLength: 2048,
  publicExponent: new Uint8Array([1, 0, 1]),
  hash: 'SHA-256',
};

export const rsaImportParams: RsaHashedImportParams = {
  name: 'RSA-OAEP',
  hash: 'SHA-256',
};

/**
 * Generates an RSA key pair if one doesn't exist.
 * Stores public key in Firestore and private key in localStorage.
 * CRITICAL: This function now checks for an existing public key and will NOT overwrite it.
 */
export async function generateAndStoreKeyPair(uid: string): Promise<void> {
  try {
    const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const docSnap = await getDoc(userDocRef);

    if (docSnap.exists() && docSnap.data().publicKey) {
      console.log(`[Encryption] Public key already exists for user ${uid}. Skipping key generation.`);
      return;
    }

    const keyPair = await window.crypto.subtle.generateKey(rsaKeygenParams, true, ['encrypt', 'decrypt']);

    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);

    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBase64 = arrayBufferToBase64(privateKeyBuffer);

    await setDoc(userDocRef, { publicKey: publicKeyBase64 }, { merge: true });
    localStorage.setItem(`privateKey_${uid}`, privateKeyBase64);

    console.warn(`[Encryption] NEW E2EE Key pair generated and stored for user ${uid}.`);
  } catch (error) {
    console.error('[Encryption] Error generating key pair:', error);
    throw new Error('Could not generate or store encryption keys.');
  }
}

/**
 * Retrieves the user's private key from localStorage.
 */
export async function getPrivateKey(uid: string): Promise<CryptoKey> {
  const privateKeyBase64 = localStorage.getItem(`privateKey_${uid}`);
  if (!privateKeyBase64) {
    throw new Error('Private key not found in local storage.');
  }

  const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
  return window.crypto.subtle.importKey('pkcs8', privateKeyBuffer, rsaImportParams, true, ['decrypt']);
}

/**
 * Fetches a user's public key from Firestore.
 */
export async function getPublicKey(uid: string): Promise<CryptoKey> {
  const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists() || !userDocSnap.data()?.publicKey) {
    throw new Error(`Public key not found for user ${uid}.`);
  }

  const publicKeyBase64 = userDocSnap.data().publicKey;
  const publicKeyBuffer = base64ToArrayBuffer(publicKeyBase64);

  return window.crypto.subtle.importKey('spki', publicKeyBuffer, rsaImportParams, true, ['encrypt']);
}

// --- Message Encryption / Decryption ---

const aesKeygenParams: AesKeyGenParams = {
  name: 'AES-GCM',
  length: 256,
};

/**
 * Encrypts a text message for one or more recipients.
 */
export async function encryptMessage(text: string, recipientUids: string[], senderUid: string) {
  try {
    const aesKey = await window.crypto.subtle.generateKey(aesKeygenParams, true, ['encrypt', 'decrypt']);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(text);
    const encryptedMessageBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encodedMessage);
    const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const allParticipantUids = Array.from(new Set([...recipientUids, senderUid]));
    const encryptedKeys: { [uid: string]: string } = {};

    for (const uid of allParticipantUids) {
      const publicKey = await getPublicKey(uid);
      const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey);
      encryptedKeys[uid] = arrayBufferToBase64(encryptedAesKeyBuffer);
    }

    return {
      encryptedText: arrayBufferToBase64(encryptedMessageBuffer),
      iv: arrayBufferToBase64(iv),
      encryptedKeys,
    };
  } catch (error) {
    console.error('[Encryption] Failed to encrypt message:', error);
    throw new Error('Message encryption failed.');
  }
}

/**
 * Decrypts a message payload.
 */
export async function decryptMessage(payload: any, myUid: string): Promise<string> {
  try {
    const { encryptedText, iv: ivBase64, encryptedKeys } = payload;
    if (!encryptedText || !ivBase64 || !encryptedKeys || !encryptedKeys[myUid]) {
      if (payload.text) return payload.text;
      return '[Message not encrypted for you]';
    }

    const privateKey = await getPrivateKey(myUid);
    const encryptedAesKeyBase64 = encryptedKeys[myUid];
    const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedAesKeyBase64);
    const rawAesKey = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encryptedAesKeyBuffer);
    const aesKey = await window.crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
    const iv = base64ToArrayBuffer(ivBase64);
    const encryptedMessageBuffer = base64ToArrayBuffer(encryptedText);
    const decryptedMessageBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, encryptedMessageBuffer);

    return new TextDecoder().decode(decryptedMessageBuffer);
  } catch (error) {
    console.error('[Encryption] Failed to decrypt message:', error);
    throw new Error('[Message could not be decrypted]');
  }
}

// --- Cloud Backup Encryption / Decryption ---

/**
 * Derives a 256-bit AES key from a password/PIN and salt using PBKDF2.
 */
async function deriveKeyFromPin(pin: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const pinBuffer = encoder.encode(pin);
  const baseKey = await window.crypto.subtle.importKey('raw', pinBuffer, { name: 'PBKDF2' }, false, ['deriveKey']);
  return window.crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt: salt, iterations: 100000, hash: 'SHA-256' },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts the user's private key for cloud backup.
 * @param privateKey The user's raw private key string from localStorage.
 * @param pin The user-provided PIN for encryption.
 * @returns The encrypted package ready for Firestore.
 */
export async function encryptPrivateKeyForCloud(privateKeyBase64: string, pin: string): Promise<EncryptedKeyPackage> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const derivedKey = await deriveKeyFromPin(pin, salt);

  const privateKeyBuffer = new TextEncoder().encode(privateKeyBase64);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, privateKeyBuffer);
  
  // Create a check value to verify PIN on decryption without exposing the key
  const checkText = new TextEncoder().encode("OK");
  const checkValueCipher = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, checkText);

  return {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext),
    checkValue: arrayBufferToBase64(checkValueCipher),
    lastBackupTimestamp: serverTimestamp(), // Add timestamp here
  };
}

/**
 * Decrypts the cloud backup package to restore the private key.
 * @param encryptedPackage The package from Firestore.
 * @param pin The user-provided PIN.
 * @returns The user's private key as a base64 string.
 */
export async function decryptPrivateKeyFromCloud(encryptedPackage: EncryptedKeyPackage, pin: string): Promise<string> {
  try {
    const salt = base64ToArrayBuffer(encryptedPackage.salt);
    const iv = base64ToArrayBuffer(encryptedPackage.iv);
    const ciphertext = base64ToArrayBuffer(encryptedPackage.ciphertext);
    const checkValueCipher = base64ToArrayBuffer(encryptedPackage.checkValue);

    const derivedKey = await deriveKeyFromPin(pin, salt);

    // First, try to decrypt the check value to verify the PIN is correct.
    const decryptedCheckBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, checkValueCipher);
    const decryptedCheckText = new TextDecoder().decode(decryptedCheckBuffer);

    if (decryptedCheckText !== "OK") {
      throw new Error('Decryption check failed.');
    }

    // If check passes, decrypt the actual private key.
    const decryptedKeyBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, ciphertext);
    return new TextDecoder().decode(decryptedKeyBuffer);
  } catch (error) {
    console.error('Cloud key decryption failed:', error);
    throw new Error('Decryption failed. The PIN may be incorrect or the backup is corrupted.');
  }
}

// --- Firestore Backup Service ---

/**
 * Stores the encrypted key package in Firestore.
 */
export async function storeEncryptedKeyInFirestore(uid: string, encryptedPackage: EncryptedKeyPackage): Promise<void> {
  const backupDocRef = doc(firestore, 'userBackups', uid);
  await setDoc(backupDocRef, encryptedPackage);
}

/**
 * Retrieves the encrypted key package from Firestore.
 */
export async function getEncryptedKeyFromFirestore(uid: string): Promise<EncryptedKeyPackage | null> {
  const backupDocRef = doc(firestore, 'userBackups', uid);
  const docSnap = await getDoc(backupDocRef);
  if (docSnap.exists()) {
    return docSnap.data() as EncryptedKeyPackage;
  }
  return null;
}

/**
 * Deletes the encrypted key package from Firestore.
 */
export async function deleteEncryptedKeyFromFirestore(uid: string): Promise<void> {
  const backupDocRef = doc(firestore, 'userBackups', uid);
  await deleteDoc(backupDocRef);
}
