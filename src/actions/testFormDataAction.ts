
// This server action has been moved inline to src/app/profile-setup/page.tsx for diagnostic purposes.
// This file is kept to avoid breaking existing imports if any, but its content is now effectively commented out.
/*
'use server';

export async function testFormDataAction(formData: FormData): Promise<{ success: boolean; message: string; fileDetails?: string; textDetails?: string }> {
  console.log('[testFormDataAction - FILE] SERVER ACTION STARTED --- FormData received on server:');

  const file = formData.get('profileImageFile') as File | null;
  const uid = formData.get('uid') as string | null;
  let fileDetails = 'No file received or file field name mismatch.';
  let textDetails = 'No UID received or uid field name mismatch.';

  if (uid) {
    console.log(`[testFormDataAction - FILE] UID from FormData: ${uid}`);
    textDetails = `UID: ${uid}`;
  } else {
    console.log('[testFormDataAction - FILE] UID not found in FormData.');
  }

  if (file) {
    console.log(`[testFormDataAction - FILE] File from FormData: name=${file.name}, size=${file.size}, type=${file.type}`);
    fileDetails = `File: ${file.name}, Size: ${file.size}, Type: ${file.type}`;
  } else {
    console.log('[testFormDataAction - FILE] "profileImageFile" not found in FormData or is null.');
  }

  // Log all FormData entries
  console.log('[testFormDataAction - FILE] All FormData entries:');
  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      console.log(`  ${key}: File - name=${value.name}, size=${value.size}, type=${value.type}`);
    } else {
      console.log(`  ${key}: ${value}`);
    }
  }

  if (uid && file) {
    return { success: true, message: 'Test FormData Action (FILE) received data.', fileDetails, textDetails };
  } else if (uid && !file) {
    return { success: true, message: 'Test FormData Action (FILE) received UID but no file.', fileDetails, textDetails };
  } else if (!uid && file) {
    return { success: true, message: 'Test FormData Action (FILE) received file but no UID.', fileDetails, textDetails };
  }
   else {
    return { success: false, message: 'Test FormData Action (FILE) did not receive expected uid and/or file.', fileDetails, textDetails };
  }
}
*/

// To re-enable this file if the inline action works and you want to move it back:
// 1. Uncomment the code above.
// 2. Remove the inline testFormDataAction from src/app/profile-setup/page.tsx.
// 3. Update the import in src/app/profile-setup/page.tsx to point to this file.

export {}; // Add an empty export to make this a module and avoid "no-empty-pattern" lint errors if file is completely empty.


    