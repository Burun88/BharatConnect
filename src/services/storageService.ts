'use client'; 

import { storage } from '@/lib/firebase';
import { ref, deleteObject, uploadString, getDownloadURL } from 'firebase/storage';

// Helper function to read file as Data URL
function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
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
    // 1. Read the file as a Data URL string
    const dataUrl = await readFileAsDataURL(file);
    
    // 2. Upload the string using the 'data_url' format
    const snapshot = await uploadString(storageRef, dataUrl, 'data_url');
    console.log('[StorageService] Upload via uploadString successful.');

    // 3. Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    console.error('[StorageService-Client] Error uploading profile image with uploadString:', error);
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
