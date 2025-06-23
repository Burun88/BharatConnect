'use client'; // This is now a client-side service

import { storage } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export async function uploadProfileImage(uid: string, file: File): Promise<string> {
  console.log('[StorageService-Client] uploadProfileImage client-side function STARTED.');
  
  if (!uid) throw new Error('User ID is required for profile image upload.');
  if (!file) throw new Error('File is required for upload.');

  const extension = file.name.split('.').pop();
  if (!extension) throw new Error('Profile image file must have an extension.');

  const finalFileNameWithExtension = `profileImage.${extension.toLowerCase()}`;
  const storagePath = `profileImages/${uid}/${finalFileNameWithExtension}`;

  try {
    const storageRef = ref(storage, storagePath);
    console.log(`[StorageService-Client] Uploading to path: ${storagePath}`);

    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('[StorageService-Client] File uploaded successfully. Public URL:', downloadURL);
    return downloadURL;
  } catch (error: any) {
    console.error('[StorageService-Client] Firebase client-side Storage operation failed:', error);
    // You can check for specific errors here if needed
    // e.g., if (error.code === 'storage/unauthorized') { ... }
    throw new Error(`Firebase Storage operation failed: ${error.message || 'Unknown error'}`);
  }
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
    // If the file doesn't exist, Firebase throws 'storage/object-not-found'. We can safely ignore this.
    if (error.code === 'storage/object-not-found') {
      console.warn(`[StorageService-Client] File not found for deletion, which is okay: ${fullStorageUrl}`);
    } else {
      console.error('[StorageService-Client] Error deleting profile image:', error);
      throw new Error(`Failed to delete profile image: ${error.message || 'Unknown error'}`);
    }
  }
}
