
"use client";

import React, { useState, useRef, type ChangeEvent } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogClose, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Cloud, KeyRound, Upload, Download, Loader2, ShieldCheck, ShieldX, FileCheck2, FileWarning } from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useToast } from '@/hooks/use-toast';
import { encryptBackup, decryptBackup } from '@/services/encryptionService';
import type { BackupData, Chat } from '@/types';

export default function ChatBackupCard() {
  const { chats, setChats } = useChat();
  const { toast } = useToast();

  const [isBackupDialogOpen, setIsBackupDialogOpen] = useState(false);
  const [isRestoreDialogOpen, setIsRestoreDialogOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [restorePassword, setRestorePassword] = useState('');
  const [backupFile, setBackupFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const restoreFileRef = useRef<HTMLInputElement>(null);

  const resetBackupDialog = () => {
    setPassword('');
    setConfirmPassword('');
    setError('');
    setIsProcessing(false);
  };

  const resetRestoreDialog = () => {
    setRestorePassword('');
    setBackupFile(null);
    setError('');
    setIsProcessing(false);
    if (restoreFileRef.current) restoreFileRef.current.value = '';
  };

  const handleBackup = async () => {
    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setIsProcessing(true);

    try {
      // In a real app, you would fetch ALL chats and messages from the local DB (e.g., IndexedDB)
      // Here, we just use what's in the context as a demonstration.
      const dataToBackup: BackupData = { chats };
      
      const encryptedData = await encryptBackup(dataToBackup, password);

      const blob = new Blob([encryptedData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'bharat_backup.enc';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup Successful',
        description: 'Your encrypted backup file has been downloaded.',
        variant: 'default',
        action: <FileCheck2 className="w-5 h-5" />,
      });
      setIsBackupDialogOpen(false);
    } catch (err: any) {
      console.error('Backup failed:', err);
      setError(err.message || 'An unknown error occurred during backup.');
      toast({ variant: 'destructive', title: 'Backup Failed', description: err.message });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.name.endsWith('.enc')) {
        setBackupFile(file);
        setError('');
      } else {
        setError('Invalid file type. Please select a .enc file.');
        setBackupFile(null);
        if(restoreFileRef.current) restoreFileRef.current.value = '';
      }
    }
  };

  const handleRestore = async () => {
    if (!backupFile) {
      setError('Please select a backup file to restore.');
      return;
    }
    if (!restorePassword) {
      setError('Please enter your backup password.');
      return;
    }
    setError('');
    setIsProcessing(true);

    try {
      const encryptedPackageString = await backupFile.text();
      const decryptedData = await decryptBackup(encryptedPackageString, restorePassword);

      // Here you would clear the existing local chat database
      // and then populate it with the restored data.
      // For this demo, we'll just update the context.
      setChats(decryptedData.chats as Chat[]);

      toast({
        title: 'Restore Successful',
        description: 'Your chats have been restored from the backup.',
        variant: 'default',
        action: <ShieldCheck className="w-5 h-5 text-green-500" />,
      });
      setIsRestoreDialogOpen(false);
    } catch (err: any) {
      console.error('Restore failed:', err);
      setError(err.message || 'An unknown error occurred during restore.');
      toast({ variant: 'destructive', title: 'Restore Failed', description: err.message, action: <ShieldX className="w-5 h-5" /> });
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
            <CardTitle className="text-lg">Chat Backup</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <Button
            variant="outline"
            className="w-full justify-center h-12"
            onClick={() => setIsBackupDialogOpen(true)}
          >
            <Download className="w-4 h-4 mr-2" />
            Backup Chats
          </Button>
           <Button
            variant="outline"
            className="w-full justify-center h-12"
            onClick={() => setIsRestoreDialogOpen(true)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Restore Chats
          </Button>
        </CardContent>
      </Card>

      {/* Backup Dialog */}
      <Dialog open={isBackupDialogOpen} onOpenChange={(isOpen) => { setIsBackupDialogOpen(isOpen); if (!isOpen) resetBackupDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><KeyRound className="w-5 h-5 text-primary" /> Create Backup Password</DialogTitle>
            <DialogDescription>This password encrypts your backup. We don't store it, so keep it safe. You'll need it to restore your chats.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-password">Password (min. 8 characters)</Label>
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
            <Button onClick={handleBackup} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Encrypting...' : 'Create & Download'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Dialog */}
      <Dialog open={isRestoreDialogOpen} onOpenChange={(isOpen) => { setIsRestoreDialogOpen(isOpen); if (!isOpen) resetRestoreDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-primary" /> Restore from Backup</DialogTitle>
            <DialogDescription>Select your encrypted backup file and enter the password you used to create it.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-file">Backup File (.enc)</Label>
              <Input id="backup-file" type="file" accept=".enc" onChange={handleFileChange} ref={restoreFileRef} disabled={isProcessing} />
              {backupFile && <p className="text-xs text-muted-foreground flex items-center pt-1"><FileCheck2 className="w-3 h-3 mr-1 text-green-500"/>{backupFile.name} selected.</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="restore-password">Backup Password</Label>
              <Input id="restore-password" type="password" value={restorePassword} onChange={(e) => setRestorePassword(e.target.value)} disabled={isProcessing} />
            </div>
             {error && <p className="text-sm text-destructive flex items-center"><FileWarning className="w-3.5 h-3.5 mr-1.5" />{error}</p>}
          </div>
          <DialogFooter>
            <DialogClose asChild><Button type="button" variant="outline" disabled={isProcessing}>Cancel</Button></DialogClose>
            <Button onClick={handleRestore} disabled={isProcessing || !backupFile}>
              {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              {isProcessing ? 'Decrypting...' : 'Restore Chats'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
