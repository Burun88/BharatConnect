
'use server';

// This server action is now obsolete as file uploads have been moved to a client-side service
// to work correctly with Firebase Hosting.
// This file can be safely deleted.

export async function testFormDataAction(formData: FormData): Promise<{ success: boolean; message: string; }> {
  console.warn('[testFormDataAction] OBSOLETE: This action should not be called.');
  return { success: false, message: 'This server action is obsolete.' };
}
