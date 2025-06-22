'use client';

import { firestore } from '@/lib/firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

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

const rsaImportParams: RsaHashedImportParams = {
  name: 'RSA-OAEP',
  hash: 'SHA-256',
};

/**
 * Generates an RSA key pair, stores the public key in Firestore, and the private key in localStorage.
 * This should only be called if no keys exist for the user.
 * @param uid The user's unique ID.
 */
export async function generateAndStoreKeyPair(uid: string): Promise<void> {
  try {
    const keyPair = await window.crypto.subtle.generateKey(rsaKeygenParams, true, ['encrypt', 'decrypt']);

    const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = arrayBufferToBase64(publicKeyBuffer);

    const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
    const privateKeyBase64 = arrayBufferToBase64(privateKeyBuffer);

    // Save public key to Firestore
    const userDocRef = doc(firestore, 'bharatConnectUsers', uid);
    await updateDoc(userDocRef, { publicKey: publicKeyBase64 });

    // Save private key to local storage, keyed by UID for multi-user safety
    localStorage.setItem(`privateKey_${uid}`, privateKeyBase64);

    console.warn(`[Encryption] E2EE Key pair generated and stored for user ${uid}.`);
  } catch (error) {
    console.error('[Encryption] Error generating key pair:', error);
    throw new Error('Could not generate or store encryption keys.');
  }
}

/**
 * Retrieves the current user's private key from localStorage and imports it for use.
 * @returns A CryptoKey object representing the private key.
 */
async function getPrivateKey(uid: string): Promise<CryptoKey> {
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
async function getPublicKey(uid: string): Promise<CryptoKey> {
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
      return '[Unsupported message format]';
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
