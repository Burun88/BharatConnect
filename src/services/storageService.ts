
'use server';

import { storageAdmin } from '@/lib/firebase-admin';

// Helper function to extract the GCS path from a public URL
function getPathFromStorageUrl(url: string): string | null {
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname.includes('storage.googleapis.com')) {
      // The path starts after the first '/' after the hostname.
      // e.g., https://storage.googleapis.com/bucket-name/path/to/file
      // pathname would be /bucket-name/path/to/file
      const path = urlObj.pathname.substring(urlObj.pathname.indexOf('/', 1) + 1);
      return decodeURIComponent(path);
    }
  } catch (e) {
    console.error("[StorageService-Admin] Error parsing storage URL:", e, "URL:", url);
  }
  return null;
}

export async function uploadProfileImage(formData: FormData): Promise<string> {
  console.log('[StorageService-Admin] uploadProfileImage server action STARTED.');
  const file = formData.get('profileImageFile') as File | null;
  const uid = formData.get('uid') as string | null;
  const baseFileName = 'profileImage';

  if (!uid) throw new Error('User ID is required in FormData for profile image upload.');
  if (!file) throw new Error('File (profileImageFile) is required for upload.');
  if (file.size === 0) throw new Error('Profile image file cannot be empty.');

  const extension = file.name.split('.').pop();
  if (!extension) throw new Error('Profile image file must have an extension.');

  const finalFileNameWithExtension = `${baseFileName}.${extension.toLowerCase()}`;
  const storagePath = `profileImages/${uid}/${finalFileNameWithExtension}`;

  try {
    const bucket = storageAdmin.bucket();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileUpload = bucket.file(storagePath);

    await fileUpload.save(fileBuffer, {
      public: true, // Make the file publicly readable
      contentType: file.type,
    });
    
    // The public URL is now predictable and doesn't require a separate SDK call.
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${storagePath}`;
    console.log('[StorageService-Admin] File uploaded successfully. Public URL:', publicUrl);
    return publicUrl;
    
  } catch (error: any) {
    console.error('[StorageService-Admin] Firebase Admin Storage operation failed. Full error object:', JSON.stringify(error, null, 2));
    throw new Error(`Firebase Admin Storage operation failed: ${error.message || 'Unknown error'}`);
  }
}

export async function deleteProfileImageByUrl(fullStorageUrl: string): Promise<void> {
   if (!fullStorageUrl) {
    console.warn('[StorageService-Admin] deleteProfileImageByUrl called with no URL. Skipping deletion.');
    return;
  }
  const storagePath = getPathFromStorageUrl(fullStorageUrl);
  if (!storagePath) {
    console.error(`[StorageService-Admin] Could not extract storage path from URL: ${fullStorageUrl}.`);
    return;
  }

  try {
    const bucket = storageAdmin.bucket();
    await bucket.file(storagePath).delete();
    console.log(`[StorageService-Admin] Successfully deleted ${storagePath}`);
  } catch (error: any) {
    // Error code for "not found" in Admin SDK is 404
    if (error.code === 404) {
      console.warn(`[StorageService-Admin] Profile image not found for deletion: ${storagePath}`);
    } else {
      console.error('[StorageService-Admin] Error deleting profile image:', error);
      throw new Error(`Failed to delete profile image with Admin SDK: ${error.message || 'Unknown error'}`);
    }
  }
}
