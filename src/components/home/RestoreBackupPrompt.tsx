
"use client";

import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ShieldQuestion, UploadCloud } from 'lucide-react';

interface RestoreBackupPromptProps {
  onDismiss: () => void;
}

export default function RestoreBackupPrompt({ onDismiss }: RestoreBackupPromptProps) {
  const router = useRouter();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 text-center">
      <Card className="w-full max-w-sm">
        <CardHeader className="items-center">
          <ShieldQuestion className="w-16 h-16 text-primary mb-3" />
          <CardTitle className="text-2xl">Restore Your Chats</CardTitle>
        </CardHeader>
        <CardContent>
          <CardDescription>
            Your chat history is end-to-end encrypted. To see your past messages on this new device, you need to restore them from a backup file.
          </CardDescription>
        </CardContent>
        <CardFooter className="flex-col space-y-3">
          <Button className="w-full" onClick={() => router.push('/account')}>
            <UploadCloud className="mr-2 h-4 w-4" />
            Go to Account to Restore
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={onDismiss}>
            Continue Without Restoring
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
