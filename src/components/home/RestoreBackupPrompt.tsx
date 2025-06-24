
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, ShieldCheck, KeyRound } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { decryptPrivateKeyFromCloud, getEncryptedKeyFromFirestore } from '@/services/encryptionService';

interface RestoreBackupPromptProps {
  isOpen: boolean;
  onClose: (restored: boolean) => void;
}

export default function RestoreBackupPrompt({ isOpen, onClose }: RestoreBackupPromptProps) {
  const { authUser } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleRestore = async () => {
    if (!pin) {
      setError('Please enter your backup PIN.');
      return;
    }
    if (!authUser?.id) {
      setError('You must be logged in to restore a backup.');
      return;
    }
    setError('');
    setIsProcessing(true);

    try {
      const encryptedPackage = await getEncryptedKeyFromFirestore(authUser.id);
      if (!encryptedPackage) {
        throw new Error('No cloud backup found for your account.');
      }

      const privateKeyBase64 = await decryptPrivateKeyFromCloud(encryptedPackage, pin);

      localStorage.setItem(`privateKey_${authUser.id}`, privateKeyBase64);

      toast({
        title: 'Restore Successful',
        description: 'Your encryption key has been restored. Reloading...',
        variant: 'default',
        action: <ShieldCheck className="w-5 h-5 text-green-500" />,
      });
      
      onClose(true); // Signal success
      
      // Force a full page reload to ensure all components and contexts re-read the new key
      setTimeout(() => window.location.reload(), 1000);

    } catch (err: any) {
      console.error('Restore failed:', err);
      setError(err.message || 'An unknown error occurred during restore.');
      toast({ variant: 'destructive', title: 'Restore Failed', description: err.message });
      setIsProcessing(false);
    }
  };

  const handleNoBackup = () => {
    toast({
        title: "Continuing Without Backup",
        description: "Past chats will remain unreadable on this device."
    });
    onClose(false);
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose(false)}>
      <DialogContent onInteractOutside={(e) => e.preventDefault()} showCloseButton={false}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Unlock Your Chats</DialogTitle>
          <DialogDescription>To read your past chats on this device, enter the backup PIN you created.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="restore-pin">Backup PIN</Label>
            <Input
              id="restore-pin"
              type="password"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              disabled={isProcessing}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
        </div>
        <DialogFooter className="grid grid-cols-2 gap-2 sm:flex-col-reverse sm:space-x-0">
          <Button type="button" variant="outline" onClick={handleNoBackup} disabled={isProcessing}>
            Continue Without Backup
          </Button>
          <Button onClick={handleRestore} disabled={isProcessing || !pin}>
            {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            {isProcessing ? 'Unlocking...' : 'Unlock Chats'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
