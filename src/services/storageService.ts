
'use client'; 

import { auth, storage } from '@/lib/firebase';
import { ref, deleteObject } from 'firebase/storage';

export async function uploadProfileImage(uid: string, file: File): Promise<string> {
  console.log('[StorageService-API] uploadProfileImage via API route STARTED.');
  
  if (!uid) throw new Error('User ID is required for profile image upload.');
  if (!file) throw new Error('File is required for upload.');

  const currentUser = auth.currentUser;
  if (!currentUser) {
    throw new Error("User not authenticated.");
  }
  
  const token = await currentUser.getIdToken();

  const formData = new FormData();
  formData.append('file', file);
  formData.append('uid', uid);

  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData,
  });

  const result = await response.json();

  if (!response.ok) {
    console.error('[StorageService-API] API route returned an error:', result);
    throw new Error(result.error || 'Failed to upload file via server.');
  }
  
  console.log('[StorageService-API] File uploaded successfully. Public URL:', result.downloadURL);
  return result.downloadURL;
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
