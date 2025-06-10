
'use server';

import { storage } from '@/lib/firebase'; // Assuming storage is correctly initialized and exported
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Uploads a profile image to Firebase Storage using FormData.
 * @param formData The FormData object containing 'uid' and 'profileImageFile'.
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export async function uploadProfileImage(formData: FormData): Promise<string> {
  console.log('[StorageService] uploadProfileImage server action STARTED.'); // <<< --- ADDED THIS LINE

  const file = formData.get('profileImageFile') as File | null;
  const uid = formData.get('uid') as string | null;
  const baseFileName = 'profileImage'; // Consistent base name for the profile image

  console.log(`[StorageService] Attempting to upload profile image via FormData.`);
  
  if (!uid) {
    console.error('[StorageService] Error: UID is missing in FormData.');
    throw new Error('User ID is required in FormData for upload.');
  }
  if (!file) {
    console.error('[StorageService] Error: File (profileImageFile) is missing in FormData.');
    throw new Error('File (profileImageFile) is required in FormData for upload.');
  }
   if (file.size === 0) {
    console.error('[StorageService] Error: File is empty (size 0).');
    throw new Error('File cannot be empty.');
  }
  if (!storage) {
    console.error('[StorageService] Error: Firebase Storage instance is not available. Check firebase.ts.');
    throw new Error('Firebase Storage is not initialized.');
  }

  console.log(`[StorageService] Received UID: ${uid}`);
  console.log(`[StorageService] Received File details: name=${file.name}, size=${file.size}, type=${file.type}`);

  const extension = file.name.split('.').pop();
  if (!extension) {
    console.error('[StorageService] Error: File has no extension.');
    throw new Error('File must have an extension.');
  }

  const finalFileNameWithExtension = `${baseFileName}.${extension.toLowerCase()}`; // Use lowercase extension
  const storagePath = `profileImages/${uid}/${finalFileNameWithExtension}`;
  console.log(`[StorageService] Constructed full storage path: ${storagePath}`);

  const imageRef = ref(storage, storagePath);

  try {
    console.log(`[StorageService] Calling uploadBytes for path: ${storagePath}...`);
    const snapshot = await uploadBytes(imageRef, file);
    console.log(`[StorageService] uploadBytes successful. Snapshot fullPath: ${snapshot.ref.fullPath}, size: ${snapshot.metadata.size}`);
    
    console.log(`[StorageService] Calling getDownloadURL for ref: ${snapshot.ref.fullPath}...`);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`[StorageService] getDownloadURL successful. URL: ${downloadURL}`);
    return downloadURL;
  } catch (error: any) {
    console.error('[StorageService] Firebase Storage operation failed during upload or URL retrieval.');
    console.error(`[StorageService] Error Code: ${error.code || 'N/A'}`);
    console.error(`[StorageService] Error Message: ${error.message || 'No message'}`);
    console.error(`[StorageService] Full Error Object:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    throw new Error(`Firebase Storage operation failed: ${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`);
  }
}

/**
 * Deletes a profile image from Firebase Storage.
 * @param uid The user's UID.
 * @param fullFileNameInStorage The full name of the file in storage (e.g., "profileImage.jpg").
 * @returns A promise that resolves when the image is deleted.
 */
export async function deleteProfileImage(uid: string, fullFileNameInStorage: string): Promise<void> {
   if (!uid || !fullFileNameInStorage) {
    console.error('[StorageService] UID and fullFileNameInStorage are required for deletion.');
    throw new Error('User ID and the full file name in storage are required for deletion.');
  }
 
  const storagePath = `profileImages/${uid}/${fullFileNameInStorage}`;
  console.log(`[StorageService] Attempting to delete profile image at path: ${storagePath}`);
  const imageRef = ref(storage, storagePath);

  try {
    await deleteObject(imageRef);
    console.log(`[StorageService] Profile image deleted successfully: ${storagePath}`);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`[StorageService] Profile image not found for deletion (this might be okay): ${storagePath}`);
    } else {
      console.error('[StorageService] Error deleting profile image.');
      console.error(`[StorageService] Error Code: ${error.code || 'N/A'}`);
      console.error(`[StorageService] Error Message: ${error.message || 'No message'}`);
      console.error(`[StorageService] Full Error Object:`, JSON.stringify(error, Object.getOwnPropertyNames(error)));
      throw new Error(`Failed to delete profile image: ${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`);
    }
  }
}
