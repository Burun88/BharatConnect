
'use client'; 

import { storage, firestore } from '@/lib/firebase';
import { ref, deleteObject, uploadBytes, getDownloadURL, getBytes } from 'firebase/storage';
import { getPublicKey } from '@/services/encryptionService';
import type { MediaInfo } from '@/types';
import { doc, collection, getDoc } from 'firebase/firestore';

const CHUNK_SIZE = 512 * 1024; // 512 KB

// Helper function to read file as Data URL
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

// Re-usable helper from encryptionService to avoid circular dependencies
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

export async function uploadProfileImage(uid: string, file: File): Promise<string> {
  if (!uid) throw new Error('User ID is required for profile image upload.');
  if (!file) throw new Error('File is required for upload.');

  // Basic client-side validation
  if (file.size > 5 * 1024 * 1024) { // 5MB limit
    throw new Error('File is too large. Maximum size is 5MB.');
  }
  if (!file.type.startsWith('image/')) {
    throw new Error('Invalid file type. Please upload an image.');
  }

  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const storageRef = ref(storage, `profileImages/${uid}/profileImage.${extension}`);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    console.log('[StorageService] Upload via uploadBytes successful.');
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error('[StorageService-Client] Error uploading profile image with uploadBytes:', error);
    if (error.code === 'storage/unauthorized') {
      throw new Error('You do not have permission to upload this file. Check storage rules.');
    }
    throw new Error(`Upload failed: ${error.code || error.message}`);
  }
}

export async function encryptAndUploadChunks(
  file: File,
  chatId: string,
  senderUid: string,
  recipientUids: string[],
  onProgress: (progress: number) => void
): Promise<{ mediaInfo: MediaInfo; encryptedAesKey: { [uid: string]: string }, keyId: string }> {
  const fileId = doc(collection(firestore, '_')).id; // Generate a unique ID for the file
  const fileBuffer = await file.arrayBuffer();
  
  // Get sender's active key ID
  const senderVaultRef = doc(firestore, 'userKeyVaults', senderUid);
  const senderVaultSnap = await getDoc(senderVaultRef);
  if (!senderVaultSnap.exists()) throw new Error("Sender's key vault not found.");
  const senderActiveKeyId = senderVaultSnap.data().activeKeyId as string;


  // 1. Generate a single AES key for the entire file
  const aesKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const allParticipantUids = Array.from(new Set([...recipientUids, senderUid]));
  const metadata = {
    customMetadata: {
      participants: allParticipantUids.join(','),
      chatId: chatId,
    }
  };

  const chunkPaths: string[] = [];
  const chunkIVs: string[] = [];
  const totalChunks = Math.ceil(fileBuffer.byteLength / CHUNK_SIZE);

  for (let i = 0; i < totalChunks; i++) {
    const chunk = fileBuffer.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 2. Encrypt each chunk with the AES key and a unique IV
    const encryptedChunk = await window.crypto.subtle.encrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      chunk
    );

    // 3. Upload the encrypted chunk with metadata
    const chunkPath = `mediaChunks/${chatId}/${fileId}/chunk_${i}`;
    const chunkRef = ref(storage, chunkPath);
    await uploadBytes(chunkRef, encryptedChunk, metadata);

    chunkPaths.push(chunkPath);
    chunkIVs.push(arrayBufferToBase64(iv));

    onProgress(((i + 1) / totalChunks) * 100);
  }

  // 4. Encrypt the AES key for all participants (including sender)
  const rawAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  const encryptedAesKey: { [uid: string]: string } = {};

  for (const uid of allParticipantUids) {
    const recipientVaultRef = doc(firestore, 'userKeyVaults', uid);
    const recipientVaultSnap = await getDoc(recipientVaultRef);
    if (!recipientVaultSnap.exists()) continue;
    const recipientActiveKeyId = recipientVaultSnap.data().activeKeyId as string;

    const publicKey = await getPublicKey(uid, recipientActiveKeyId);
    const encryptedKeyBuffer = await window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, rawAesKey);
    encryptedAesKey[uid] = arrayBufferToBase64(encryptedKeyBuffer);
  }
  
  const mediaInfo: MediaInfo = {
    fileName: file.name,
    fileType: file.type,
    totalChunks,
    chunkPaths,
    chunkIVs,
    fileId,
  };

  return { mediaInfo, encryptedAesKey, keyId: senderActiveKeyId };
}

export async function decryptAndAssembleChunks(
  aesKey: CryptoKey,
  mediaInfo: MediaInfo
): Promise<string> {
  const decryptedChunks: ArrayBuffer[] = [];

  for (let i = 0; i < mediaInfo.totalChunks; i++) {
    const chunkPath = mediaInfo.chunkPaths[i];
    const ivBase64 = mediaInfo.chunkIVs[i];

    const chunkRef = ref(storage, chunkPath);
    const encryptedChunk = await getBytes(chunkRef);
    
    const iv = base64ToArrayBuffer(ivBase64);

    const decryptedChunk = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv },
      aesKey,
      encryptedChunk
    );
    decryptedChunks.push(decryptedChunk);
  }

  const blob = new Blob(decryptedChunks, { type: mediaInfo.fileType });
  return URL.createObjectURL(blob);
}

// Helper needed for decryptAndAssembleChunks
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export async function deleteProfileImageByUrl(fullStorageUrl: string): Promise<void> {
  if (!fullStorageUrl) {
    console.warn('[StorageService-Client] deleteProfileImageByUrl called with no URL. Skipping deletion.');
    return;
  }

  try {
    const storageRef = ref(storage, fullStorageUrl);
    await deleteObject(storageRef);
    console.log(`[StorageService-Client] Successfully deleted ${fullStorageUrl}`);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`[StorageService-Client] File not found for deletion, which is okay: ${fullStorageUrl}`);
    } else {
      console.error('[StorageService-Client] Error deleting profile image:', error);
      throw new Error(`Failed to delete profile image: ${error.message || 'Unknown error'}`);
    }
  }
}
