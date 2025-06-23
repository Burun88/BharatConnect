
import { NextResponse } from 'next/server';
import { storageAdmin, authAdmin } from '@/lib/firebase-admin';

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get('file') as File | null;
  const uid = formData.get('uid') as string | null;
  
  const authToken = request.headers.get('Authorization')?.split('Bearer ')[1];

  if (!file || !uid || !authToken) {
    return NextResponse.json({ error: 'File, UID, and Auth Token are required' }, { status: 400 });
  }

  try {
      const decodedToken = await authAdmin.verifyIdToken(authToken);
      if (decodedToken.uid !== uid) {
        return NextResponse.json({ error: 'Forbidden: UID does not match token.' }, { status: 403 });
      }
  } catch (e: any) {
      console.error("Auth token verification failed in API route:", e);
      return NextResponse.json({ error: 'Unauthorized: Invalid token.', code: e.code }, { status: 401 });
  }

  const bucket = storageAdmin.bucket();
  console.log(`[API Upload] Attempting to upload to bucket: ${bucket.name}`);
  const extension = file.name.split('.').pop()?.toLowerCase() || 'png';
  const filePath = `profileImages/${uid}/profileImage.${extension}`;
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  try {
    const fileRef = bucket.file(filePath);
    await fileRef.save(fileBuffer, {
      metadata: { contentType: file.type },
      public: true, // Make the file public directly
    });
    
    // The public URL is deterministic
    const downloadURL = `https://storage.googleapis.com/${bucket.name}/${filePath}`;
    
    return NextResponse.json({ downloadURL });
  } catch (error: any) {
    console.error('Backend upload to GCS failed:', error);
    // Provide a more detailed error message
    const errorMessage = error.code ? `Storage Error (Code: ${error.code})` : 'An unknown error occurred during upload.';
    const errorDetails = error.message || 'No further details available.';
    console.error(`Detailed Error: ${errorMessage} - ${errorDetails}`);
    return NextResponse.json({ error: errorMessage, details: errorDetails }, { status: 500 });
  }
}
