
"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import type { CallDocument, CallType } from "@/types";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { ArrowDownLeft, ArrowUpRight, Phone, UserCircle2, Video } from "lucide-react";

interface CallHistoryItemProps {
  call: CallDocument;
  currentUserId: string;
  onCall: (contactId: string, callType: CallType) => void;
}

export default function CallHistoryItem({ call, currentUserId, onCall }: CallHistoryItemProps) {
  const isOutgoing = call.callerId === currentUserId;
  const isMissed = call.status === 'declined' || call.status === 'missed';

  const contactName = isOutgoing ? call.calleeName : call.callerName;
  const contactAvatar = isOutgoing ? call.calleeAvatarUrl : call.callerAvatarUrl;
  const contactId = isOutgoing ? call.calleeId : call.callerId;

  const CallIcon = isOutgoing ? ArrowUpRight : ArrowDownLeft;
  const iconColor = isMissed ? 'text-destructive' : 'text-primary';

  const formatTimestamp = (timestamp: any) => {
    if (!timestamp) return 'Unknown time';
    const date = timestamp.toDate();
    return format(date, 'MMM d, h:mm a');
  };
  
  const handleItemClick = () => {
    // Default to a new audio call when the main item is clicked
    onCall(contactId, 'audio');
  };
  
  const handleIconClick = (e: React.MouseEvent, callType: CallType) => {
    e.stopPropagation(); // Prevent the main item's click handler from firing
    onCall(contactId, callType);
  };

  return (
    <div 
        className="flex items-center p-2.5 hover:bg-muted/30 rounded-lg cursor-pointer transition-colors"
        onClick={handleItemClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && handleItemClick()}
    >
      <Avatar className="w-12 h-12 mr-4">
        <AvatarImage src={contactAvatar || undefined} alt={contactName} data-ai-hint="person avatar" />
        <AvatarFallback className="bg-muted">
          <UserCircle2 className="w-8 h-8 text-muted-foreground" />
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <p className={cn("font-semibold text-foreground truncate", isMissed && "text-destructive")}>{contactName}</p>
        <div className="flex items-center text-sm text-muted-foreground">
          <CallIcon className={cn("w-4 h-4 mr-1.5", iconColor)} />
          <span>{formatTimestamp(call.createdAt)}</span>
        </div>
      </div>
      <Button variant="ghost" size="icon" className="w-10 h-10 shrink-0" onClick={(e) => handleIconClick(e, call.callType)}>
        {call.callType === 'video' ? <Video className="text-primary"/> : <Phone className="text-primary"/>}
      </Button>
    </div>
  );
}
