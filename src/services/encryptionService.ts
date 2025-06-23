
'use client';

import { firestore } from '@/lib/firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import type { BackupData } from '@/types';

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

export const aesImportParams: AesKeyGenParams = {
  name: 'AES-GCM',
  length: 256,
};


/**
 * Generates an RSA key pair, stores the public key in Firestore, and the private key in localStorage.
 * This should only be called if no keys exist for the user.
 * @param uid The user's unique ID.
 */
export async function generateAndStoreKeyPair(uid: string): Promise<void> {
  try {
    const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
    const docSnap = await getDoc(userDocRef);

    // If a public key already exists in Firestore, do not generate a new pair.
    // This is a CRITICAL safety check to prevent overwriting keys on a new device login.
    if (docSnap.exists() && docSnap.data().publicKey) {
      console.log(`[Encryption] Public key already exists for user ${uid}. Skipping key generation.`);
      return;
    }

    const keyPair = await window.crypto.subtle.generateKey(rsaKeygenParams, true, ['encrypt', 'decrypt']);

    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);

    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBase64 = arrayBufferToBase64(privateKeyBuffer);

    // Save public key to Firestore.
    // Using setDoc with merge: true creates the doc if it doesn't exist or updates it if it does.
    await setDoc(userDocRef, { publicKey: publicKeyBase64 }, { merge: true });

    // Save private key to local storage, keyed by UID for multi-user safety
    localStorage.setItem(`privateKey_${uid}`, privateKeyBase64);

    console.warn(`[Encryption] NEW E2EE Key pair generated and stored for user ${uid}.`);
  } catch (error) {
    console.error('[Encryption] Error generating key pair:', error);
    throw new Error('Could not generate or store encryption keys.');
  }
}

/**
 * Retrieves the current user's private key from localStorage and imports it for use.
 * @returns A CryptoKey object representing the private key.
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
 * Fetches a user's public key from Firestore and imports it for use.
 * @param uid The user ID whose public key is needed.
 * @returns A CryptoKey object representing the public key.
 */
export async function getPublicKey(uid: string): Promise<CryptoKey> {
  const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
  const userDocSnap = await getDoc(userDocRef);

  if (!userDocSnap.exists() || !userDocSnap.data()?.publicKey) {
    throw new Error(`Public key not found for user ${uid}. The user may need to log in to generate their keys.`);
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
 * @param text The plaintext message.
 * @param recipientUids An array of recipient user IDs.
 * @param senderUid The sender's user ID.
 * @returns An object containing the encrypted data payload.
 */
export async function encryptMessage(text: string, recipientUids: string[], senderUid: string) {
  try {
    // 1. Generate a one-time AES key and IV for this message
    const aesKey = await window.crypto.subtle.generateKey(aesKeygenParams, true, ['encrypt', 'decrypt']);
    const iv = window.crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV

    // 2. Encrypt the message text with the AES key
    const encodedMessage = new TextEncoder().encode(text);
    const encryptedMessageBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encodedMessage);

    // 3. Export the raw AES key to be encrypted for each participant
    const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const allParticipantUids = Array.from(new Set([...recipientUids, senderUid]));
    const encryptedKeys: { [uid: string]: string } = {};

    // 4. For each participant, encrypt the AES key with their public key
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
 * Decrypts a message payload using the user's private key.
 * @param payload The encrypted message payload from Firestore.
 * @param myUid The current user's ID.
 * @returns The decrypted plaintext message.
 */
export async function decryptMessage(payload: any, myUid: string): Promise<string> {
  try {
    const { encryptedText, iv: ivBase64, encryptedKeys } = payload;
    if (!encryptedText || !ivBase64 || !encryptedKeys || !encryptedKeys[myUid]) {
      // Return a standard text for messages encrypted before this user joined/had keys
      if (payload.text) return payload.text; // For system messages or unencrypted older messages
      return '[Message not encrypted for you]';
    }

    // 1. Get the user's private key
    const privateKey = await getPrivateKey(myUid);

    // 2. Decrypt the AES key with the private key
    const encryptedAesKeyBase64 = encryptedKeys[myUid];
    const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedAesKeyBase64);
    const rawAesKey = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encryptedAesKeyBuffer);

    // 3. Import the decrypted raw AES key
    const aesKey = await window.crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);

    // 4. Decrypt the message content
    const iv = base64ToArrayBuffer(ivBase64);
    const encryptedMessageBuffer = base64ToArrayBuffer(encryptedText);
    const decryptedMessageBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, encryptedMessageBuffer);

    return new TextDecoder().decode(decryptedMessageBuffer);
  } catch (error) {
    console.error('[Encryption] Failed to decrypt message:', error);
    throw new Error('[Message could not be decrypted]');
  }
}


// --- Backup Encryption / Decryption ---

/**
 * Derives a 256-bit AES key from a password and salt using PBKDF2.
 * @param password The user-supplied password.
 * @param salt A random 16-byte salt.
 * @returns The derived CryptoKey for AES-GCM.
 */
async function deriveKeyFromPassword(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordBuffer = encoder.encode(password);
  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passwordBuffer,
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts chat backup data using a password.
 * @param data The chat data to encrypt.
 * @param password The user's backup password.
 * @returns A stringified JSON object containing the encrypted package.
 */
export async function encryptBackup(data: BackupData, password: string): Promise<string> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassword(password, salt);

  const dataString = JSON.stringify(data);
  const dataBuffer = new TextEncoder().encode(dataString);

  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv },
    key,
    dataBuffer
  );

  const backupPackage = {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext),
  };

  return JSON.stringify(backupPackage);
}

/**
 * Decrypts a backup file's content using a password.
 * @param encryptedPackageString The string content of the .enc backup file.
 * @param password The user's backup password.
 * @returns The decrypted chat data.
 */
export async function decryptBackup(encryptedPackageString: string, password: string): Promise<BackupData> {
  try {
    const backupPackage = JSON.parse(encryptedPackageString);
    const { salt: saltBase64, iv: ivBase64, ciphertext: ciphertextBase64 } = backupPackage;

    if (!saltBase64 || !ivBase64 || !ciphertextBase64) {
      throw new Error('Invalid backup file structure.');
    }

    const salt = base64ToArrayBuffer(saltBase64);
    const iv = base64ToArrayBuffer(ivBase64);
    const ciphertext = base64ToArrayBuffer(ciphertextBase64);

    const key = await deriveKeyFromPassword(password, new Uint8Array(salt));

    const decryptedBuffer = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      key,
      ciphertext
    );

    const decryptedString = new TextDecoder().decode(decryptedBuffer);
    return JSON.parse(decryptedString);
  } catch (error) {
    console.error('Decryption failed:', error);
    // Error during decryption often means wrong password or corrupted file
    throw new Error('Decryption failed. Please check your password and try again.');
  }
}
