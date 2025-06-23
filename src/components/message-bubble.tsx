
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock, ShieldAlert, ImageIcon, Loader2, UploadCloud, AlertTriangle, RefreshCw, X } from 'lucide-react';
import { format } from 'date-fns';
import { decryptAndAssembleChunks } from '@/services/storageService';
import { getPrivateKey } from '@/services/encryptionService';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
  contactId: string | null;
  currentUserId: string;
  onRetry?: (clientTempId: string) => void;
  onCancel?: (clientTempId: string) => void; // Optional: To cancel uploads
}

// Helper needed locally if not exported from encryptionService
function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary_string = window.atob(base64);
  const len = binary_string.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary_string.charCodeAt(i);
  }
  return bytes.buffer;
}

export default function MessageBubble({ message, isOutgoing, contactId, currentUserId, onRetry, onCancel }: MessageBubbleProps) {
  const [decryptedImageUrl, setDecryptedImageUrl] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);

  const decryptImage = useCallback(async () => {
    if (message.type !== 'image' || !message.mediaInfo || !message.encryptedKeys || !message.firestoreId) return;
    if (decryptedImageUrl || isDecrypting) return;

    setIsDecrypting(true);
    setDecryptionError(null);
    try {
      const privateKey = await getPrivateKey(currentUserId);
      const encryptedAesKeyBase64 = message.encryptedKeys[currentUserId];
      if (!encryptedAesKeyBase64) throw new Error("No encrypted AES key found for this user.");
      
      const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedAesKeyBase64);
      const rawAesKey = await window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encryptedAesKeyBuffer);
      
      const aesKey = await window.crypto.subtle.importKey('raw', rawAesKey, { name: 'AES-GCM' }, false, ['decrypt']);

      const blobUrl = await decryptAndAssembleChunks(aesKey, message.mediaInfo);
      setDecryptedImageUrl(blobUrl);

    } catch (err: any) {
      console.error("Image decryption failed:", err);
      setDecryptionError(err.message || "Failed to decrypt image.");
    } finally {
      setIsDecrypting(false);
    }
  }, [
    message.type, 
    message.mediaInfo, 
    message.encryptedKeys, 
    message.firestoreId, 
    currentUserId, 
    decryptedImageUrl, 
    isDecrypting
  ]);
  
  // Effect to trigger decryption for received images
  useEffect(() => {
    if (message.type === 'image' && message.firestoreId) {
      decryptImage();
    }
  }, [message.type, message.firestoreId, decryptImage]);

  // Effect to handle cleanup of blob URLs when the component is unmounted
  useEffect(() => {
    const localDecryptedUrl = decryptedImageUrl;
    const localPreviewUrl = message.mediaUrl;

    return () => {
      if (localDecryptedUrl) {
        URL.revokeObjectURL(localDecryptedUrl);
      }
      // Only revoke the preview URL if it exists (i.e., it's a temporary message)
      if (localPreviewUrl && message.clientTempId) {
        URL.revokeObjectURL(localPreviewUrl);
      }
    };
  // This effect's dependencies are crucial. It should only re-run (and clean up)
  // if the URL values themselves change, or on final unmount.
  // It should NOT re-run on every parent re-render.
  }, [decryptedImageUrl, message.mediaUrl, message.clientTempId]);


  const alignmentClass = isOutgoing ? 'ml-auto' : 'mr-auto';
  const bubbleClass = isOutgoing ? 'message-bubble-outgoing' : 'message-bubble-incoming';
  const applyAnimation = !!message.clientTempId && !message.firestoreId;

  const DeliveryStatusIcon = () => {
    if (!isOutgoing || message.type === 'system' || message.uploadStatus) return null;
    
    const isReadByContact = contactId && message.readBy?.includes(contactId);

    if (isReadByContact) {
      return <CheckCheck className="w-3 h-3 text-blue-400 group-hover:text-blue-300" />;
    }
    if (message.firestoreId) { 
        return <Check className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground/80" />;
    }
    return <Clock className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground/80" />;
  };
  
  if (message.type === 'system') {
    return (
      <div className="px-4 py-2 my-1 w-full animate-fade-in-scale-up">
        <p className={cn("message-bubble-system", "mx-auto max-w-xs rounded-md p-2")}>
          {message.text}
        </p>
      </div>
    );
  }

  const renderMediaContent = () => {
    if (message.type !== 'image') return null;

    // Handle Uploading State
    if (message.uploadStatus === 'uploading' || message.uploadStatus === 'error') {
      return (
        <div className="relative w-64 h-48 bg-black rounded-md overflow-hidden">
          {message.mediaUrl && <img src={message.mediaUrl} alt="Uploading preview" className="w-full h-full object-cover opacity-40" data-ai-hint="upload preview" />}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
            {message.uploadStatus === 'uploading' ? (
              <>
                <div className="flex items-center gap-2">
                    <Loader2 className="w-5 h-5 animate-spin"/>
                    <span className="text-sm font-medium">Sending...</span>
                </div>
                <Progress value={message.uploadProgress || 0} className="w-full h-1.5 mt-3 bg-white/20" />
              </>
            ) : ( // 'error' state
              <>
                <AlertTriangle className="w-6 h-6 text-destructive mb-2"/>
                <p className="text-sm font-semibold">Upload Failed</p>
                <p className="text-xs text-center mb-3 text-white/80">{message.error || "An unknown error occurred"}</p>
                <Button size="sm" variant="secondary" onClick={() => onRetry?.(message.clientTempId!)}>
                  <RefreshCw className="w-4 h-4 mr-2"/>
                  Retry
                </Button>
              </>
            )}
          </div>
        </div>
      );
    }
    
    // Handle Decrypting State
    if (isDecrypting) return <Skeleton className="w-64 h-48" />;
    if (decryptionError) return (
        <div className="p-4 flex flex-col items-center justify-center text-destructive-foreground/80 italic w-64 h-48">
            <ShieldAlert className="w-6 h-6 mb-2" /> <span>Image Decryption Failed</span>
        </div>
    );
    if (decryptedImageUrl) return <img src={decryptedImageUrl} alt={message.mediaInfo?.fileName || "Shared image"} className="mt-1 rounded-md max-w-full h-auto max-h-80 object-contain" data-ai-hint="chat media" />;

    // Fallback if no other state matches
    return (
       <div className="p-4 flex flex-col items-center justify-center text-current/80 w-64 h-48">
          <ImageIcon className="w-8 h-8 mb-2" /> <span>Encrypted Image</span>
        </div>
    );
  };

  const messageContent = message.type === 'text' && message.error === 'DECRYPTION_FAILED' ? (
    <div className="flex items-center text-destructive-foreground/80 italic">
        <ShieldAlert className="w-4 h-4 mr-2" />
        <span>{message.text || 'Decryption failed'}</span>
    </div>
  ) : (
    <>
      {message.type === 'text' && <p className="text-sm whitespace-pre-wrap break-words break-all">{message.text}</p>}
      {message.type === 'image' && renderMediaContent()}
    </>
  );

  const isUploadingOrError = message.uploadStatus === 'uploading' || message.uploadStatus === 'error';

  return (
    <div className={cn("flex flex-col max-w-[70%] my-1 group", alignmentClass, applyAnimation ? "animate-fade-in-scale-up" : "")}>
      <div className={cn(
          "px-3 py-2",
          bubbleClass,
          (message.error === 'DECRYPTION_FAILED' || decryptionError) && 'bg-destructive/50 border border-destructive',
          isUploadingOrError && 'p-0 bg-transparent shadow-none' // Remove padding/bg for upload bubble container
        )}>
        {messageContent}
      </div>
      <div className={cn("flex items-center mt-0.5 px-1", isOutgoing ? 'justify-end' : 'justify-start')}>
        <span className="text-xs text-muted-foreground">
          {isUploadingOrError ? message.uploadStatus : format(new Date(message.timestamp), 'p')}
        </span>
        {isOutgoing && <span className="ml-1"><DeliveryStatusIcon /></span>}
      </div>
    </div>
  );
}
