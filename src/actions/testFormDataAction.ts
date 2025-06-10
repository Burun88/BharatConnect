
'use server';

export async function testFormDataAction(formData: FormData): Promise<{ success: boolean; message: string; fileDetails?: string; textDetails?: string }> {
  console.log('[testFormDataAction] SERVER ACTION STARTED --- FormData received on server:');

  const file = formData.get('profileImageFile') as File | null;
  const uid = formData.get('uid') as string | null;
  let fileDetails = 'No file received or file field name mismatch.';
  let textDetails = 'No UID received or uid field name mismatch.';

  if (uid) {
    console.log(`[testFormDataAction] UID from FormData: ${uid}`);
    textDetails = `UID: ${uid}`;
  } else {
    console.log('[testFormDataAction] UID not found in FormData.');
  }

  if (file) {
    console.log(`[testFormDataAction] File from FormData: name=${file.name}, size=${file.size}, type=${file.type}`);
    fileDetails = `File: ${file.name}, Size: ${file.size}, Type: ${file.type}`;
  } else {
    console.log('[testFormDataAction] "profileImageFile" not found in FormData or is null.');
  }

  // Log all FormData entries
  console.log('[testFormDataAction] All FormData entries:');
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(`  ${key}: File - name=${value.name}, size=${value.size}, type=${value.type}`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }

  if (uid && file) {
    return { success: true, message: 'Test FormData Action received data.', fileDetails, textDetails };
  } else if (uid && !file) {
    return { success: true, message: 'Test FormData Action received UID but no file.', fileDetails, textDetails };
  } else if (!uid && file) {
    return { success: true, message: 'Test FormData Action received file but no UID.', fileDetails, textDetails };
  }
   else {
    return { success: false, message: 'Test FormData Action did not receive expected uid and/or file.', fileDetails, textDetails };
  }
}
