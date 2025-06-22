"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Phone, PhoneOff, UserCircle2, Video } from "lucide-react";
import type { CallDocument } from "@/types";

interface IncomingCallModalProps {
  call: CallDocument;
  onAccept: () => void;
  onDecline: () => void;
}

export default function IncomingCallModal({ call, onAccept, onDecline }: IncomingCallModalProps) {
  if (!call) return null;

  return (
    <div className="fixed inset-0 bg-black/70 z-[200] flex items-center justify-center animate-in fade-in-0">
      <Card className="w-full max-w-sm m-4 text-center shadow-2xl animate-in slide-in-from-bottom-10">
        <CardHeader>
          <CardTitle>Incoming {call.callType} call</CardTitle>
          <CardDescription>from</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center gap-4">
          <Avatar className="w-24 h-24 border-4 border-primary">
            <AvatarImage src={call.callerAvatarUrl || ''} alt={call.callerName} />
            <AvatarFallback>
                <UserCircle2 className="w-16 h-16 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <p className="text-xl font-semibold">{call.callerName}</p>
        </CardContent>
        <CardFooter className="grid grid-cols-2 gap-4">
          <Button onClick={onDecline} variant="destructive" size="lg" className="h-14">
            <PhoneOff className="mr-2" /> Decline
          </Button>
          <Button onClick={onAccept} size="lg" className="h-14 bg-green-600 hover:bg-green-700">
            {call.callType === 'video' ? <Video className="mr-2" /> : <Phone className="mr-2" />}
            Accept
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
