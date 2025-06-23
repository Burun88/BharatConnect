'use client'; 

import { auth, storage } from '@/lib/firebase';
import { ref, deleteObject, uploadBytes, getDownloadURL } from 'firebase/storage';

export async function uploadProfileImage(uid: string, file: File): Promise<string> {
  if (!uid) throw new Error('User ID is required for profile image upload.');
  if (!file) throw new Error('File is required for upload.');

  // Basic client-side validation (can be expanded)
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
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error('[StorageService-Client] Error uploading profile image:', error);
    // Provide a more user-friendly error message for the most common issue.
    if (error.code === 'storage/unauthorized') {
      throw new Error('You do not have permission to upload this file. Check storage rules.');
    }
    throw new Error(`Upload failed: ${error.code || error.message}`);
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
    if (error.code === 'storage/object-not-found') {
      console.warn(`[StorageService-Client] File not found for deletion, which is okay: ${fullStorageUrl}`);
    } else {
      console.error('[StorageService-Client] Error deleting profile image:', error);
      throw new Error(`Failed to delete profile image: ${error.message || 'Unknown error'}`);
    }
  }
}
