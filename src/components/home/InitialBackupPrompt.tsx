
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ShieldCheck, KeyRound } from 'lucide-react';

interface InitialBackupPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InitialBackupPrompt({ isOpen, onClose }: InitialBackupPromptProps) {
  const router = useRouter();

  const handleSetupBackup = () => {
    onClose();
    router.push('/account');
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} showCloseButton={false} className="max-w-sm">
        <DialogHeader className="items-center text-center">
          <ShieldCheck className="w-14 h-14 text-primary mb-2" />
          <DialogTitle className="text-xl">Secure Your Chat History</DialogTitle>
        </DialogHeader>
        <DialogDescription className="text-center space-y-3 px-2 text-foreground/80">
            <p>
                Enable encrypted cloud backup to restore your chats if you ever lose your phone or switch devices.
            </p>
             <p className="font-semibold text-foreground/90 p-3 bg-muted/50 rounded-lg border border-border">
                Only you can unlock your backup with a secret PIN. We can never access your chats or your PIN.
            </p>
             <p className="text-xs text-amber-500">
                <span className="font-bold">Important:</span> If you forget your PIN, we cannot recover it for you, and your backup will be lost forever.
            </p>
        </DialogDescription>
        <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button type="button" variant="outline" onClick={onClose}>
                Maybe Later
            </Button>
            <Button onClick={handleSetupBackup}>
                <KeyRound className="mr-2 h-4 w-4" />
                Set Up Backup
            </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
