
"use client";

import React, { useState, useEffect, useCallback } from 'react';
import type { Message } from '@/types';
import { cn } from '@/lib/utils';
import { Check, CheckCheck, Clock, ShieldAlert, ImageIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { decryptAndAssembleChunks } from '@/services/storageService';
import { getPrivateKey } from '@/services/encryptionService';
import { Skeleton } from '@/components/ui/skeleton';

interface MessageBubbleProps {
  message: Message;
  isOutgoing: boolean;
  contactId: string | null;
  currentUserId: string;
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

export default function MessageBubble({ message, isOutgoing, contactId, currentUserId }: MessageBubbleProps) {
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

  useEffect(() => {
    return () => {
      if (decryptedImageUrl) {
        URL.revokeObjectURL(decryptedImageUrl);
      }
    };
  }, [decryptedImageUrl]);


  const alignmentClass = isOutgoing ? 'ml-auto' : 'mr-auto';
  const bubbleClass = isOutgoing ? 'message-bubble-outgoing' : 'message-bubble-incoming';
  const applyAnimation = !!message.clientTempId && !message.firestoreId;

  const DeliveryStatusIcon = () => {
    if (!isOutgoing || message.type === 'system') return null;
    
    const isReadByContact = contactId && message.readBy?.includes(contactId);

    if (isReadByContact) {
      return <CheckCheck className="w-3 h-3 text-blue-400 group-hover:text-blue-300" />;
    }
    if (message.firestoreId) { 
        return <Check className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground/80" />;
    }
    // For client-temp messages or messages without a firestoreId yet
    return <Clock className="w-3 h-3 text-muted-foreground group-hover:text-primary-foreground/80" />;
  };
  
  if (message.type === 'system') {
    return (
      <div className="px-4 py-2 my-1 w-full animate-fade-in-scale-up">
        <p className={cn("message-bubble-system", "mx-auto max-w-xs rounded-md p-2", "flex items-center gap-2")}>
           {message.text?.includes("Sending") && <Loader2 className="w-3 h-3 animate-spin"/>}
           {message.text}
        </p>
      </div>
    );
  }

  const renderMediaContent = () => {
    if (message.type !== 'image') return null;
    
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
      {message.type === 'text' && <p className="text-sm whitespace-pre-wrap break-words">{message.text}</p>}
      {message.type === 'image' && renderMediaContent()}
    </>
  );

  return (
    <div className={cn("flex flex-col max-w-[70%] my-1 group", alignmentClass, applyAnimation ? "animate-fade-in-scale-up" : "")}>
      <div className={cn(
          "px-3 py-2",
          bubbleClass,
          (message.error === 'DECRYPTION_FAILED' || decryptionError) && 'bg-destructive/50 border border-destructive'
        )}>
        {messageContent}
      </div>
      <div className={cn("flex items-center mt-0.5 px-1", isOutgoing ? 'justify-end' : 'justify-start')}>
        <span className="text-xs text-muted-foreground">
          {format(new Date(message.timestamp), 'p')}
        </span>
        {isOutgoing && <span className="ml-1"><DeliveryStatusIcon /></span>}
      </div>
    </div>
  );
}
