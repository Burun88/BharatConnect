
"use client";

import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ShieldCheck, KeyRound, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  encryptPrivateKeyForCloud,
  storeEncryptedKeyInFirestore,
} from '@/services/encryptionService';

interface InitialBackupPromptProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InitialBackupPrompt({ isOpen, onClose }: InitialBackupPromptProps) {
  const { authUser } = useAuth();
  const { toast } = useToast();
  
  const [isSetupDialogOpen, setIsSetupDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleOpenSetupDialog = () => {
    onClose(); // Close the initial informational prompt
    setIsSetupDialogOpen(true); // Open the password setup dialog
  };

  const resetBackupDialog = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setIsProcessing(false);
  };

  const handleCreateBackup = async () => {
    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!authUser?.id) {
      setError('Could not identify the current user. Please log in again.');
      return;
    }
    setError('');
    setIsProcessing(true);

    try {
      const privateKeyBase64 = localStorage.getItem(`privateKey_${authUser.id}`);
      if (!privateKeyBase64) {
        throw new Error('Your local encryption key is missing. Cannot create a backup.');
      }

      const encryptedPackage = await encryptPrivateKeyForCloud(privateKeyBase64, password);
      await storeEncryptedKeyInFirestore(authUser.id, encryptedPackage);

      toast({
        title: 'Backup Secured',
        description: 'Your encrypted key is now stored in the cloud. You can manage it in the Account section.',
        variant: 'default',
        action: <ShieldCheck className="w-5 h-5" />,
        duration: 5000,
      });
      
      setIsSetupDialogOpen(false);
      
    } catch (err: any) {
      console.error('Cloud backup failed:', err);
      setError(err.message || 'An unknown error occurred during backup.');
      toast({ variant: 'destructive', title: 'Backup Failed', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent onInteractOutside={(e) => e.preventDefault()} showCloseButton={false} className="max-w-sm">
          <DialogHeader className="items-center text-center">
            <ShieldCheck className="w-14 h-14 text-primary mb-2" />
            <DialogTitle className="text-xl">Secure Your Chat History</DialogTitle>
          </DialogHeader>
          <DialogDescription asChild>
            <div className="text-center space-y-3 px-2 text-foreground/80">
              <div>
                  Enable encrypted cloud backup to restore your chats if you ever lose your phone or switch devices.
              </div>
               <div className="font-semibold text-foreground/90 p-3 bg-muted/50 rounded-lg border border-border">
                  Only you can unlock your backup with a secret PIN. We can never access your chats or your PIN.
              </div>
               <div className="text-xs text-amber-500">
                  <span className="font-bold">Important:</span> If you forget your PIN, we cannot recover it for you, and your backup will be lost forever.
              </div>
            </div>
          </DialogDescription>
          <DialogFooter className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button type="button" variant="outline" onClick={onClose}>
                  Maybe Later
              </Button>
              <Button onClick={handleOpenSetupDialog}>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Set Up Backup
              </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isSetupDialogOpen} onOpenChange={(open) => { setIsSetupDialogOpen(open); if (!open) resetBackupDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Secure Your Cloud Backup</DialogTitle>
            <DialogDescription>
              Create a password to protect your encrypted backup. You will need this password to restore your chats.
              <strong className="block mt-2 text-amber-500">Important: If you forget this password, we cannot recover it for you, and your backup will be lost forever.</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-password-initial">Password (min. 6 characters)</Label>
              <Input id="backup-password-initial" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isProcessing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password-initial">Confirm Password</Label>
              <Input id="confirm-password-initial" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isProcessing} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
            <Button onClick={handleCreateBackup} disabled={isProcessing || !password || !confirmPassword}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Encrypting...' : 'Save & Encrypt Backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
