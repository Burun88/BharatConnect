
"use client";

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWebRTC } from '@/hooks/useWebRTC';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { PhoneOff, Mic, MicOff, Video, VideoOff, Loader2 } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

function generateChatId(uid1: string, uid2: string): string {
  if (!uid1 || !uid2) {
    console.error("Cannot generate chat ID: one or both UIDs are undefined.");
    return ''; 
  }
  return uid1 < uid2 ? `${uid1}_${uid2}` : `${uid2}_${uid1}`;
}

export default function CallPage() {
  const params = useParams();
  const callId = params.callId as string;
  const router = useRouter();
  const { toast } = useToast();
  const { authUser } = useAuth();
  const {
    localStream,
    remoteStream,
    callData,
    isMuted,
    isVideoEnabled,
    setupStreams,
    createOffer,
    createAnswer,
    hangUp,
    toggleMute,
    toggleVideo,
  } = useWebRTC(callId);

  const [hasCameraPermission, setHasCameraPermission] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const durationIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);

  const isCaller = callData?.callerId === authUser?.id;
  const otherUserName = isCaller ? callData?.calleeName : callData?.callerName;
  const otherUserAvatar = isCaller ? callData?.calleeAvatarUrl : callData?.callerAvatarUrl;
  
  // Set up media streams and create offer/answer
  useEffect(() => {
    if (authUser?.id && callData && !localStream) {
      setupStreams(callData.callType).then(() => {
        setHasCameraPermission(true);
      }).catch(err => {
        console.error("Permission error:", err);
        setHasCameraPermission(false);
        toast({
          variant: "destructive",
          title: "Media Access Denied",
          description: "Please enable camera and microphone permissions to make calls."
        });
        hangUp(); // This will trigger the redirect via the status useEffect
      });
    }
  }, [authUser, callData, localStream, setupStreams, toast, hangUp]);

  // Once local stream is ready, create offer or answer
  useEffect(() => {
    if (localStream && callData) {
      if (isCaller && callData.status === 'ringing' && !callData.offer) {
        createOffer();
      } else if (!isCaller && callData.status === 'ringing' && callData.offer && !callData.answer) {
        createAnswer();
      }
    }
  }, [localStream, callData, isCaller, createOffer, createAnswer]);

  // Attach streams to video elements
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream;
    }
  }, [localStream, remoteStream]);

  // Redirect when call has concluded
  useEffect(() => {
    if (callData && ['ended', 'declined', 'missed'].includes(callData.status)) {
      const redirectTimer = setTimeout(() => {
        if (callData.callerId && callData.calleeId) {
          const chatId = generateChatId(callData.callerId, callData.calleeId);
          router.replace(`/chat/${chatId}`);
        } else {
          // This is a fallback and shouldn't normally be reached.
          console.error("Redirecting to home page: could not determine caller/callee ID on call conclusion.");
          router.replace('/');
        }
      }, 1500); // 1.5s delay to show final status

      return () => clearTimeout(redirectTimer);
    }
  }, [callData, router]);

  // Call duration timer
  useEffect(() => {
    if (callData?.status === 'connected' && !durationIntervalRef.current) {
        durationIntervalRef.current = setInterval(() => {
            setCallDuration(prev => prev + 1);
        }, 1000);
    } else if (callData?.status && ['ended', 'declined', 'missed'].includes(callData.status)) {
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
            durationIntervalRef.current = null;
        }
    }

    return () => {
        if (durationIntervalRef.current) {
            clearInterval(durationIntervalRef.current);
        }
    };
  }, [callData?.status]);


  const handleHangUp = async () => {
    await hangUp();
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toString().padStart(2, '0');
    return `${minutes}:${secs}`;
  };

  const getStatusText = () => {
    switch (callData?.status) {
      case 'ringing': return `Calling ${otherUserName}...`;
      case 'connected': return formatDuration(callDuration);
      case 'ended':
      case 'declined':
      case 'missed': return 'Call Ended';
      default: return 'Connecting...';
    }
  }

  return (
    <div className="fixed inset-0 bg-gray-900 text-white flex flex-col items-center justify-between p-4">
      <div className="absolute top-4 left-4 text-center">
        <p className="text-xl font-semibold">{otherUserName}</p>
        <p className="text-sm text-gray-300">{getStatusText()}</p>
      </div>

      <div className="relative w-full h-full flex items-center justify-center">
        {/* Remote Video */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={cn(
            "h-full w-full object-cover transition-opacity duration-500",
            remoteStream && callData?.callType === 'video' ? "opacity-100" : "opacity-0"
          )}
        />
        {(!remoteStream || callData?.callType === 'audio' || callData?.status !== 'connected') && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-800/50">
                 <Avatar className="w-32 h-32 border-4 border-gray-600">
                    <AvatarImage src={otherUserAvatar || ''} alt={otherUserName} />
                    <AvatarFallback className="bg-gray-700">
                        <span className="text-4xl">{otherUserName?.charAt(0)}</span>
                    </AvatarFallback>
                </Avatar>
                {callData?.status === 'ringing' && <Loader2 className="w-8 h-8 animate-spin mt-6" />}
            </div>
        )}

        {/* Local Video */}
        <video
          ref={localVideoRef}
          autoPlay
          muted
          playsInline
          className={cn(
            "absolute bottom-6 right-6 w-32 h-48 object-cover bg-black rounded-lg shadow-lg border-2 border-white/20 transition-opacity duration-500",
            localStream && isVideoEnabled ? "opacity-100" : "opacity-0"
            )}
        />
         {(!isVideoEnabled && localStream) && (
            <div className="absolute bottom-6 right-6 w-32 h-48 bg-black rounded-lg shadow-lg border-2 border-white/20 flex items-center justify-center">
                <p className="text-xs text-muted-foreground">Video Off</p>
            </div>
        )}
      </div>

      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
        <Button onClick={toggleMute} variant="outline" size="icon" className="w-16 h-16 rounded-full bg-white/10 border-none hover:bg-white/20">
            {isMuted ? <MicOff /> : <Mic />}
        </Button>
        
        {callData?.callType === 'video' && (
            <Button onClick={toggleVideo} variant="outline" size="icon" className="w-16 h-16 rounded-full bg-white/10 border-none hover:bg-white/20">
                {isVideoEnabled ? <Video /> : <VideoOff />}
            </Button>
        )}

        <Button onClick={handleHangUp} variant="destructive" size="icon" className="w-16 h-16 rounded-full">
            <PhoneOff />
        </Button>
      </div>
    </div>
  );
}
