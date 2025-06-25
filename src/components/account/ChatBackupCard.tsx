
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { KeyRound, Loader2, ShieldCheck, Trash2, CloudUpload } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  encryptPrivateKeyForCloud,
  getEncryptedKeyFromFirestore,
  storeEncryptedKeyInFirestore,
  deleteEncryptedKeyFromFirestore,
} from '@/services/encryptionService';
import type { EncryptedKeyPackage } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

export default function ChatBackupCard() {
  const { authUser } = useAuth();
  const { toast } = useToast();

  const [isBackupSetupDialogOpen, setIsBackupSetupDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [backupDetails, setBackupDetails] = useState<EncryptedKeyPackage | null>(null);

  useEffect(() => {
    if (!authUser?.id) {
      setBackupDetails(null);
      return;
    }
    
    getEncryptedKeyFromFirestore(authUser.id).then(backup => {
      setBackupDetails(backup);
    });
  }, [authUser?.id]);

  const resetBackupDialog = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setIsProcessing(false);
  };

  const handleCreateOrChangeBackup = async () => {
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
      const keyVaultJSON = localStorage.getItem(`keyVault_${authUser.id}`);
      const keyVault = keyVaultJSON ? JSON.parse(keyVaultJSON) : {};
      const privateKeyBase64 = keyVault['main'];

      if (!privateKeyBase64) {
        throw new Error('Your local encryption key is missing. Cannot create a backup.');
      }

      const encryptedPackage = await encryptPrivateKeyForCloud(privateKeyBase64, password);
      await storeEncryptedKeyInFirestore(authUser.id, encryptedPackage);

      toast({
        title: 'Backup Secured',
        description: 'Your encrypted key is now stored in the cloud.',
        variant: 'default',
        action: <ShieldCheck className="w-5 h-5" />,
      });
      setBackupDetails(encryptedPackage);
      setIsBackupSetupDialogOpen(false);
    } catch (err: any) {
      console.error('Cloud backup failed:', err);
      setError(err.message || 'An unknown error occurred during backup.');
      toast({ variant: 'destructive', title: 'Backup Failed', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!authUser?.id) return;
    setIsProcessing(true);
    try {
      await deleteEncryptedKeyFromFirestore(authUser.id);
      setBackupDetails(null);
      toast({
        title: 'Cloud Backup Disabled',
        description: 'Your encrypted key has been removed from the cloud.',
        variant: 'default',
        action: <ShieldCheck className="w-5 h-5 text-destructive" />,
      });
    } catch (err: any)
    {
       console.error('Delete backup failed:', err);
       toast({ variant: 'destructive', title: 'Delete Failed', description: err.message });
    } finally {
       setIsProcessing(false);
    }
  };

  const lastBackupTimestamp =
    backupDetails?.lastBackupTimestamp &&
    typeof backupDetails.lastBackupTimestamp.toDate === 'function'
      ? backupDetails.lastBackupTimestamp.toDate()
      : null;
  
  return (
    <>
      <Card className="rounded-2xl shadow-md bg-card">
        <CardHeader>
          <div className="flex items-center">
            <CloudUpload className="w-5 h-5 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" />
            <CardTitle className="text-lg">Encrypted Cloud Backup</CardTitle>
          </div>
          <CardDescription>
            {backupDetails ? `Last backup: ${lastBackupTimestamp ? format(lastBackupTimestamp, "PPP, p") : 'Just now'}` : 'Your chats are only stored on this device.'}
          </CardDescription>
        </CardHeader>
        <CardContent className={cn("grid gap-4", backupDetails ? 'grid-cols-2' : 'grid-cols-1')}>
          <Button
            variant={backupDetails ? "outline" : "default"}
            className={cn("w-full justify-center h-12", !backupDetails && "bg-gradient-to-r from-primary to-accent text-primary-foreground hover:opacity-90")}
            onClick={() => setIsBackupSetupDialogOpen(true)}
            disabled={!authUser}
          >
            <KeyRound className="w-4 h-4 mr-2" />
            {backupDetails ? 'Manage Backup' : 'Enable Backup'}
          </Button>

          {backupDetails && (
            <AlertDialog>
                <AlertDialogTrigger asChild>
                <Button
                    variant="destructive"
                    className="w-full justify-center h-12 bg-destructive/80 hover:bg-destructive/90"
                    disabled={!backupDetails || isProcessing}
                >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete Backup
                </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Delete Cloud Backup?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This will permanently delete your encrypted backup from the cloud. You will NOT be able to restore your chats on new devices without it. This action cannot be undone.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteBackup} className="bg-destructive hover:bg-destructive/90">Yes, Delete It</AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
          )}
        </CardContent>
      </Card>

      <Dialog open={isBackupSetupDialogOpen} onOpenChange={(isOpen) => { setIsBackupSetupDialogOpen(isOpen); if (!isOpen) resetBackupDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Secure Your Cloud Backup</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>Create a password to protect your encrypted backup. You will need this password to restore your chats.</p>
              <p className="font-bold text-amber-500">Important: If you forget this password, we cannot recover it for you, and your backup will be lost forever.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-password">Password (min. 6 characters)</Label>
              <Input id="backup-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} disabled={isProcessing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm Password</Label>
              <Input id="confirm-password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} disabled={isProcessing} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
            <Button onClick={handleCreateOrChangeBackup} disabled={isProcessing || !password || !confirmPassword}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Encrypting...' : 'Save & Encrypt Backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
