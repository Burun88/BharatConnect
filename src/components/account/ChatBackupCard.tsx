
"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, KeyRound, Loader2, ShieldCheck, Trash2, CloudOff } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  encryptPrivateKeyForCloud,
  getEncryptedKeyFromFirestore,
  storeEncryptedKeyInFirestore,
  deleteEncryptedKeyFromFirestore,
} from '@/services/encryptionService';

export default function ChatBackupCard() {
  const { authUser } = useAuth();
  const { toast } = useToast();

  const [isBackupSetupDialogOpen, setIsBackupSetupDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [hasCloudBackup, setHasCloudBackup] = useState<boolean | null>(null);

  useEffect(() => {
    if (!authUser?.id) {
      setHasCloudBackup(null);
      return;
    }
    
    // Check if a backup exists for the user on component mount.
    getEncryptedKeyFromFirestore(authUser.id).then(backup => {
      setHasCloudBackup(!!backup);
    });
  }, [authUser?.id]);

  const resetBackupDialog = () => {
    setPin('');
    setConfirmPin('');
    setError('');
    setIsProcessing(false);
  };

  const handleCreateOrChangeBackup = async () => {
    if (pin.length < 6) {
      setError('PIN must be at least 6 digits long.');
      return;
    }
    if (pin !== confirmPin) {
      setError('PINs do not match.');
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

      const encryptedPackage = await encryptPrivateKeyForCloud(privateKeyBase64, pin);
      await storeEncryptedKeyInFirestore(authUser.id, encryptedPackage);

      toast({
        title: 'Cloud Backup Created',
        description: 'Your encrypted key is now securely backed up.',
        variant: 'default',
        action: <ShieldCheck className="w-5 h-5" />,
      });
      setHasCloudBackup(true);
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
      setHasCloudBackup(false);
      toast({
        title: 'Cloud Backup Deleted',
        description: 'Your encrypted key has been removed from the cloud.',
        variant: 'default',
        action: <CloudOff className="w-5 h-5" />,
      });
    } catch (err: any)
    {
       console.error('Delete backup failed:', err);
       toast({ variant: 'destructive', title: 'Delete Failed', description: err.message });
    } finally {
       setIsProcessing(false);
    }
  };

  return (
    <>
      <Card className="rounded-2xl shadow-md bg-card">
        <CardHeader>
          <div className="flex items-center">
            <Cloud className="w-5 h-5 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" />
            <CardTitle className="text-lg">Cloud Chat Backup</CardTitle>
          </div>
          <CardDescription>
            Securely back up your encryption key to restore chats on a new device. We can't read it.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="w-full justify-center h-12"
            onClick={() => setIsBackupSetupDialogOpen(true)}
            disabled={hasCloudBackup === null}
          >
            <KeyRound className="w-4 h-4 mr-2" />
            {hasCloudBackup === null ? 'Checking...' : hasCloudBackup ? 'Change PIN' : 'Create Backup'}
          </Button>

          <AlertDialog>
            <AlertDialogTrigger asChild>
               <Button
                variant="destructive"
                className="w-full justify-center h-12 bg-destructive/80 hover:bg-destructive/90"
                disabled={!hasCloudBackup || isProcessing}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete Backup
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your encrypted key from the cloud. You will NOT be able to restore your chats on new devices without it.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteBackup} className="bg-destructive hover:bg-destructive/90">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </CardContent>
      </Card>

      <Dialog open={isBackupSetupDialogOpen} onOpenChange={(isOpen) => { setIsBackupSetupDialogOpen(isOpen); if (!isOpen) resetBackupDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Create Backup PIN</DialogTitle>
            <DialogDescription>This PIN encrypts your key. We don't store it, so keep it safe. You'll need it to restore your chats on a new device.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-pin">New PIN (min. 6 digits)</Label>
              <Input id="backup-pin" type="password" value={pin} onChange={(e) => setPin(e.target.value)} disabled={isProcessing} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-pin">Confirm PIN</Label>
              <Input id="confirm-pin" type="password" value={confirmPin} onChange={(e) => setConfirmPin(e.target.value)} disabled={isProcessing} />
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
            <Button onClick={handleCreateOrChangeBackup} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Encrypting...' : 'Set PIN & Backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
