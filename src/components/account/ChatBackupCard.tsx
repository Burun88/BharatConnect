
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
import type { EncryptedKeyPackage } from '@/types';
import { format } from 'date-fns';

export default function ChatBackupCard() {
  const { authUser } = useAuth();
  const { toast } = useToast();

  const [isBackupSetupDialogOpen, setIsBackupSetupDialogOpen] = useState(false);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
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
        title: 'Cloud Backup Secured',
        description: 'Your encrypted key is now safely stored.',
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
            <Cloud className="w-5 h-5 mr-2 text-transparent bg-clip-text bg-gradient-to-r from-accent to-primary" />
            <CardTitle className="text-lg">Cloud Chat Backup</CardTitle>
          </div>
          <CardDescription>
            {backupDetails ? `Last backup: ${lastBackupTimestamp ? format(lastBackupTimestamp, "PPP, p") : 'Just now'}` : 'No cloud backup found.'}
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="w-full justify-center h-12"
            onClick={() => setIsBackupSetupDialogOpen(true)}
            disabled={backupDetails === null && !authUser}
          >
            <KeyRound className="w-4 h-4 mr-2" />
            {backupDetails ? 'Change PIN' : 'Create Backup'}
          </Button>

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
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete your encrypted key from the cloud. You will NOT be able to restore your chats on new devices without it. This action cannot be undone.
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
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> Your Backup is Safe!</DialogTitle>
            <DialogDescription className="space-y-2 pt-2">
              <p>Your chats are encrypted using a secret key that only you know. We cannot read your messages—even if we wanted to.</p>
              <p>Create a password/PIN to protect your encrypted key. This is the only way to restore your chats on a new device.</p>
              <p className="font-bold">Remember this password. We can't recover it for you.</p>
            </DialogDescription>
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
            <Button onClick={handleCreateOrChangeBackup} disabled={isProcessing || !pin || !confirmPin}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Encrypting...' : 'Set PIN & Backup'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
