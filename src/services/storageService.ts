'use server';

import { storage, auth } from '@/lib/firebase';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

export async function uploadProfileImage(formData: FormData): Promise<string> {
  console.log('[StorageService] uploadProfileImage server action STARTED.');
  const file = formData.get('profileImageFile') as File | null;
  const uid = formData.get('uid') as string | null;
  const baseFileName = 'profileImage';

  if (!uid) throw new Error('User ID is required in FormData for profile image upload.');
  if (!file) throw new Error('File (profileImageFile) is required in FormData for profile image upload.');
  if (file.size === 0) throw new Error('Profile image file cannot be empty.');
  if (!storage) throw new Error('Firebase Storage is not initialized.');

  const extension = file.name.split('.').pop();
  if (!extension) throw new Error('Profile image file must have an extension.');

  const finalFileNameWithExtension = `${baseFileName}.${extension.toLowerCase()}`;
  const storagePath = `profileImages/${uid}/${finalFileNameWithExtension}`;
  const imageRef = ref(storage, storagePath);

  try {
    // Convert the File to an ArrayBuffer before uploading to make it more robust.
    const fileBuffer = await file.arrayBuffer();
    // Explicitly pass the contentType when uploading from a buffer.
    const snapshot = await uploadBytes(imageRef, fileBuffer, { contentType: file.type });
    
    const downloadURL = await getDownloadURL(snapshot.ref);
    return downloadURL;
  } catch (error: any) {
    // Enhanced logging to capture the full error details from Firebase.
    console.error('[StorageService] Firebase Storage operation failed. Full error object:', JSON.stringify(error, null, 2));
    throw new Error(`Firebase Storage operation failed: ${error.message || 'Unknown error'} (Code: ${error.code || 'N/A'})`);
  }
}

function getPathFromStorageUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('firebasestorage.googleapis.com')) {
      const pathParts = urlObj.pathname.split('/o/');
      if (pathParts.length > 1) {
        const encodedPath = pathParts[1].split('?')[0];
        return decodeURIComponent(encodedPath);
      }
    }
  } catch (e) {
    console.error("[StorageService] Error parsing storage URL:", e, "URL:", url);
  }
  return null;
}

export async function deleteProfileImageByUrl(fullStorageUrl: string): Promise<void> {
   if (!fullStorageUrl) {
    console.warn('[StorageService] deleteProfileImageByUrl called with no URL. Skipping deletion.');
    return;
  }
  const storagePath = getPathFromStorageUrl(fullStorageUrl);
  if (!storagePath) {
    console.error(`[StorageService] Could not extract storage path from URL: ${fullStorageUrl}.`);
    return;
  }
  const imageRef = ref(storage, storagePath);
  try {
    await deleteObject(imageRef);
  } catch (error: any) {
    if (error.code === 'storage/object-not-found') {
      console.warn(`[StorageService] Profile image not found for deletion: ${storagePath}`);
    } else {
      console.error('[StorageService] Error deleting profile image:', error);
      throw new Error(`Failed to delete profile image: ${error.message || 'Unknown error'}`);
    }
  }
}

// Aura image functions removed as they are no longer needed
// export async function uploadAuraImage(...) { ... }
// export async function deleteAuraImage(...) { ... }
