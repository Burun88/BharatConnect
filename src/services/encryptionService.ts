
'use client';

import { firestore, serverTimestamp } from '@/lib/firebase';
import { doc, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import type { EncryptedKeyPackage, UserKeyVault, UserKeyInfo } from '@/types';

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

// --- RSA & AES Key Algorithm Definitions ---
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

const aesKeygenParams: AesKeyGenParams = {
  name: 'AES-GCM',
  length: 256,
};

// --- Local Key Vault Management ---
async function getLocalKeyVault(uid: string): Promise<Record<string, CryptoKey>> {
  const vault: Record<string, CryptoKey> = {};
  const storedVaultJSON = localStorage.getItem(`keyVault_${uid}`);
  if (!storedVaultJSON) return vault;

  const storedVault = JSON.parse(storedVaultJSON) as Record<string, string>;
  for (const keyId in storedVault) {
    try {
      const privateKeyBase64 = storedVault[keyId];
      const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
      vault[keyId] = await window.crypto.subtle.importKey('pkcs8', privateKeyBuffer, rsaImportParams, true, ['decrypt']);
    } catch (e) {
      console.error(`Failed to import key ${keyId} from local vault`, e);
    }
  }
  return vault;
}

async function saveKeyToLocalVault(uid: string, keyId: string, privateKey: CryptoKey): Promise<void> {
  const storedVaultJSON = localStorage.getItem(`keyVault_${uid}`);
  const storedVault = storedVaultJSON ? (JSON.parse(storedVaultJSON) as Record<string, string>) : {};
  
  const privateKeyBuffer = await window.crypto.subtle.exportKey('pkcs8', privateKey);
  storedVault[keyId] = arrayBufferToBase64(privateKeyBuffer);
  
  localStorage.setItem(`keyVault_${uid}`, JSON.stringify(storedVault));
}

export function hasLocalKeys(uid: string): boolean {
  const vault = localStorage.getItem(`keyVault_${uid}`);
  try {
    // Check if the vault is not just an empty object string `{}`
    return !!vault && Object.keys(JSON.parse(vault)).length > 0;
  } catch {
    return false;
  }
}

export async function getPrivateKey(uid: string, keyId: string = 'main'): Promise<CryptoKey> {
    const vault = await getLocalKeyVault(uid);
    const key = vault[keyId];
    if (!key) {
        throw new Error(`Private key for keyId '${keyId}' not found locally.`);
    }
    return key;
}


// --- Remote Key Vault & Key Management ---

/**
 * Fetches a user's public key from their Firestore key vault.
 */
export async function getPublicKey(uid: string, keyId: string): Promise<CryptoKey> {
  const vaultRef = doc(firestore, 'userKeyVaults', uid);
  const vaultSnap = await getDoc(vaultRef);

  if (!vaultSnap.exists()) throw new Error(`Key vault not found for user ${uid}.`);
  
  const vaultData = vaultSnap.data() as UserKeyVault;
  const keyInfo = vaultData.keys[keyId];

  if (!keyInfo) throw new Error(`Key ID ${keyId} not found in vault for user ${uid}.`);

  const publicKeyBuffer = base64ToArrayBuffer(keyInfo.publicKey);
  return window.crypto.subtle.importKey('spki', publicKeyBuffer, rsaImportParams, true, ['encrypt']);
}

/**
 * Generates the first "main" key pair for a user during profile setup.
 */
export async function generateInitialKeyPair(uid: string): Promise<void> {
  const vaultRef = doc(firestore, 'userKeyVaults', uid);
  const vaultSnap = await getDoc(vaultRef);

  if (vaultSnap.exists()) {
    console.log(`[Encryption] Key vault already exists for user ${uid}. Skipping initial key generation.`);
    return;
  }

  const keyPair = await window.crypto.subtle.generateKey(rsaKeygenParams, true, ['encrypt', 'decrypt']);
  const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);

  const keyId = 'main';
  const newKeyInfo: UserKeyInfo = {
    type: 'main',
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    createdAt: serverTimestamp(),
  };

  const newVault: UserKeyVault = {
    activeKeyId: keyId,
    keys: { [keyId]: newKeyInfo },
  };

  await setDoc(vaultRef, newVault);
  await saveKeyToLocalVault(uid, keyId, keyPair.privateKey);
  console.log(`[Encryption] Initial 'main' key pair created for user ${uid}.`);
}

/**
 * Generates a temporary "session" key for a user on a new device.
 */
export async function generateSessionKeyPair(uid: string): Promise<void> {
  const keyPair = await window.crypto.subtle.generateKey(rsaKeygenParams, true, ['encrypt', 'decrypt']);
  const publicKeyBuffer = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);

  const keyId = `session_${Date.now()}`;
  const newKeyInfo: UserKeyInfo = {
    type: 'session',
    publicKey: arrayBufferToBase64(publicKeyBuffer),
    createdAt: serverTimestamp(),
  };

  const vaultRef = doc(firestore, 'userKeyVaults', uid);
  await updateDoc(vaultRef, {
    [`keys.${keyId}`]: newKeyInfo,
    activeKeyId: keyId,
  });

  await saveKeyToLocalVault(uid, keyId, keyPair.privateKey);
  console.log(`[Encryption] New session key ${keyId} created for user ${uid}.`);
}


// --- Message Encryption / Decryption ---

/**
 * Encrypts a text message for one or more recipients.
 */
export async function encryptMessage(text: string, recipientUids: string[], senderUid: string) {
  try {
    const senderVaultRef = doc(firestore, 'userKeyVaults', senderUid);
    const senderVaultSnap = await getDoc(senderVaultRef);
    if (!senderVaultSnap.exists()) throw new Error("Sender's key vault not found.");
    const senderActiveKeyId = senderVaultSnap.data().activeKeyId;

    const aesKey = await window.crypto.subtle.generateKey(aesKeygenParams, true, ['encrypt', 'decrypt']);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encodedMessage = new TextEncoder().encode(text);
    const encryptedMessageBuffer = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, aesKey, encodedMessage);
    const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
    const allParticipantUids = Array.from(new Set([...recipientUids, senderUid]));
    const encryptedKeys: { [uid: string]: string } = {};

    for (const uid of allParticipantUids) {
      const recipientVaultRef = doc(firestore, 'userKeyVaults', uid);
      const recipientVaultSnap = await getDoc(recipientVaultRef);
      if (!recipientVaultSnap.exists()) continue; // Skip if recipient has no vault
      const recipientActiveKeyId = recipientVaultSnap.data().activeKeyId;

      const publicKey = await getPublicKey(uid, recipientActiveKeyId);
      const encryptedAesKeyBuffer = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey);
      encryptedKeys[uid] = arrayBufferToBase64(encryptedAesKeyBuffer);
    }

    return {
      keyId: senderActiveKeyId, // Tag message with the key used to encrypt
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
 * Decrypts a message payload using the multi-key vault.
 */
export async function decryptMessage(payload: any, myUid: string): Promise<string> {
  try {
    const { encryptedText, iv: ivBase64, encryptedKeys, keyId = 'main' } = payload;
    
    if (!encryptedText || !ivBase64 || !encryptedKeys || !encryptedKeys[myUid]) {
      if (payload.text) return payload.text; // For unencrypted system messages
      return '[Message not encrypted for you]';
    }

    const localVault = await getLocalKeyVault(myUid);
    const privateKey = localVault[keyId];

    if (!privateKey) {
      return `[Encrypted message - Restore key to read]`;
    }
    
    const encryptedAesKeyBase64 = encryptedKeys[myUid];
    const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedAesKeyBase64);
    const rawAesKey = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encryptedAesKeyBuffer);
    const aesKey = await window.crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);
    const iv = base64ToArrayBuffer(ivBase64);
    const encryptedMessageBuffer = base64ToArrayBuffer(encryptedText);
    const decryptedMessageBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, aesKey, encryptedMessageBuffer);

    return new TextDecoder().decode(decryptedMessageBuffer);
  } catch (error) {
    console.error(`[Encryption] Failed to decrypt message with keyId ${payload.keyId || 'main'}:`, error);
    return '[Message could not be decrypted]';
  }
}

// --- Cloud Backup Encryption / Decryption ---

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

export async function encryptPrivateKeyForCloud(privateKeyBase64: string, pin: string): Promise<EncryptedKeyPackage> {
  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const derivedKey = await deriveKeyFromPin(pin, salt);

  const privateKeyBuffer = new TextEncoder().encode(privateKeyBase64);
  const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, privateKeyBuffer);
  
  const checkText = new TextEncoder().encode("OK");
  const checkValueCipher = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, derivedKey, checkText);

  return {
    salt: arrayBufferToBase64(salt),
    iv: arrayBufferToBase64(iv),
    ciphertext: arrayBufferToBase64(ciphertext),
    checkValue: arrayBufferToBase64(checkValueCipher),
    lastBackupTimestamp: serverTimestamp(),
  };
}

export async function decryptPrivateKeyFromCloud(encryptedPackage: EncryptedKeyPackage, pin: string): Promise<string> {
  try {
    const salt = base64ToArrayBuffer(encryptedPackage.salt);
    const iv = base64ToArrayBuffer(encryptedPackage.iv);
    const ciphertext = base64ToArrayBuffer(encryptedPackage.ciphertext);
    const checkValueCipher = base64ToArrayBuffer(encryptedPackage.checkValue);

    const derivedKey = await deriveKeyFromPin(pin, salt);

    const decryptedCheckBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, checkValueCipher);
    if (new TextDecoder().decode(decryptedCheckBuffer) !== "OK") {
      throw new Error('Decryption check failed.');
    }
    
    const decryptedKeyBuffer = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, derivedKey, ciphertext);
    return new TextDecoder().decode(decryptedKeyBuffer);
  } catch (error) {
    console.error('Cloud key decryption failed:', error);
    throw new Error('Decryption failed. The PIN may be incorrect or the backup is corrupted.');
  }
}

export async function storeEncryptedKeyInFirestore(uid: string, encryptedPackage: EncryptedKeyPackage): Promise<void> {
  const backupDocRef = doc(firestore, 'userBackups', uid);
  await setDoc(backupDocRef, encryptedPackage);
}

export async function getEncryptedKeyFromFirestore(uid: string): Promise<EncryptedKeyPackage | null> {
  const backupDocRef = doc(firestore, 'userBackups', uid);
  const docSnap = await getDoc(backupDocRef);
  return docSnap.exists() ? docSnap.data() as EncryptedKeyPackage : null;
}

export async function deleteEncryptedKeyFromFirestore(uid: string): Promise<void> {
  const backupDocRef = doc(firestore, 'userBackups', uid);
  await deleteDoc(backupDocRef);
}

/**
 * Special handler for restoring the main key.
 * It saves the key to the local vault and sets it as active in Firestore.
 */
export async function restoreMainKey(uid: string, pin: string): Promise<void> {
  const encryptedPackage = await getEncryptedKeyFromFirestore(uid);
  if (!encryptedPackage) {
    throw new Error("No cloud backup found to restore.");
  }
  const privateKeyBase64 = await decryptPrivateKeyFromCloud(encryptedPackage, pin);
  const privateKeyBuffer = base64ToArrayBuffer(privateKeyBase64);
  const privateKey = await window.crypto.subtle.importKey('pkcs8', privateKeyBuffer, rsaImportParams, true, ['decrypt']);

  await saveKeyToLocalVault(uid, 'main', privateKey);

  const vaultRef = doc(firestore, 'userKeyVaults', uid);
  await updateDoc(vaultRef, { activeKeyId: 'main' });
}
