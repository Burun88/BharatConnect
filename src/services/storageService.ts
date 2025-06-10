
'use server';

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Uploads a profile image to Firebase Storage.
 * @param uid The user's UID.
 * @param file The image file to upload.
 * @param fileName The name to use for the file in storage (e.g., "profileImage.jpg").
 * @returns A promise that resolves with the public download URL of the uploaded image.
 */
export async function uploadProfileImage(uid: string, file: File, fileName: string = "profileImage"): Promise<string> {
  if (!uid || !file) {
    throw new Error('User ID and file are required for upload.');
  }

  // Append file extension to fileName if not already present
  const extension = file.name.split('.').pop();
  const finalFileName = fileName.includes('.') ? fileName : `${fileName}.${extension}`;
  const storagePath = `profileImages/${uid}/${finalFileName}`;
  const imageRef = ref(storage, storagePath);

  try {
    console.log(`[StorageService] Uploading to: ${storagePath}`);
    const snapshot = await uploadBytes(imageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log(`[StorageService] File uploaded successfully. URL: ${downloadURL}`);
    return downloadURL;
  } catch (error) {
    console.error('[StorageService] Error uploading profile image:', error);
    throw new Error(`Failed to upload profile image: ${(error as Error).message}`);
  }
}

/**
 * Deletes a profile image from Firebase Storage.
 * @param uid The user's UID.
 * @param fileName The name of the file in storage (e.g., "profileImage.jpg").
 * @returns A promise that resolves when the image is deleted.
 */
export async function deleteProfileImage(uid: string, fileName: string = "profileImage"): Promise<void> {
   if (!uid) {
    throw new Error('User ID is required for deletion.');
  }
  // Note: If the original file had an extension and fileName doesn't, this might not find it.
  // It's safer if the calling component knows the full path or the exact stored name.
  // For simplicity now, we assume fileName might need an extension if the original upload used it.
  // However, our uploadProfileImage now standardizes the name before extension.
  const storagePath = `profileImages/${uid}/${fileName}`; // Assuming fileName includes extension if needed
  const imageRef = ref(storage, storagePath);

  try {
    await deleteObject(imageRef);
    console.log(`[StorageService] Profile image deleted: ${storagePath}`);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`[StorageService] Profile image not found for deletion (this might be okay): ${storagePath}`);
    } else {
      console.error('[StorageService] Error deleting profile image:', error);
      throw new Error(`Failed to delete profile image: ${error.message}`);
    }
  }
}
