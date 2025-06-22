// This server action is now obsolete as message sending has been moved to the client-side
// in src/app/chat/[chatId]/page.tsx.
// This file can be safely deleted from the project.

export async function sendMessageAction(): Promise<{ success: boolean; error?: string }> {
  console.warn("[sendMessageAction] OBSOLETE: Message sending is now handled client-side.");
  return { success: false, error: "This action is obsolete." };
}
