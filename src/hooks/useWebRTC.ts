
"use client";

import { useState, useEffect, useRef, useCallback } from 'react';
import { firestore } from '@/lib/firebase';
import {
  doc,
  getDoc,
  collection,
  addDoc,
  onSnapshot,
  updateDoc,
  deleteDoc,
  writeBatch,
  query,
  where,
  serverTimestamp,
  getDocs,
} from 'firebase/firestore';
import type { CallDocument, CallType } from '@/types';
import { useAuth } from '@/contexts/AuthContext';

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export function useWebRTC(callId: string) {
  const { authUser } = useAuth();
  const [peerConnection, setPeerConnection] = useState<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callData, setCallData] = useState<CallDocument | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);

  const pcRef = useRef<RTCPeerConnection | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const remoteStreamRef = useRef<MediaStream | null>(null);

  const setupStreams = useCallback(async (callType: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: callType === 'video',
        audio: true,
      });
      setLocalStream(stream);
      localStreamRef.current = stream;

      const newRemoteStream = new MediaStream();
      setRemoteStream(newRemoteStream);
      remoteStreamRef.current = newRemoteStream;
    } catch (error) {
      console.error("Error accessing media devices.", error);
    }
  }, []);

  const hangUp = useCallback(async () => {
    if (callId && callData) {
      const callDocRef = doc(firestore, 'calls', callId);
      const currentStatus = callData.status;

      if (['ended', 'declined', 'missed'].includes(currentStatus)) {
        return; // Already in a terminal state, no need to update.
      }
      
      const newStatus = currentStatus === 'ringing' ? 'missed' : 'ended';
      
      await updateDoc(callDocRef, { status: newStatus, endedAt: serverTimestamp() });
      
      // The rest of the cleanup (closing connections, stopping streams) is now handled
      // by the onSnapshot listener when it detects the status change.
    }
  }, [callId, callData]);
  
  useEffect(() => {
    const pc = new RTCPeerConnection(servers);
    pcRef.current = pc;
    setPeerConnection(pc);

    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        if(pc.signalingState !== 'closed') {
          pc.addTrack(track, localStreamRef.current!);
        }
      });
    }

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        remoteStreamRef.current?.addTrack(track);
      });
    };
    
    return () => {
       if (pcRef.current && pcRef.current.signalingState !== 'closed') {
           pcRef.current.close();
       }
    };
  }, []);

  useEffect(() => {
    if (!authUser?.id || !pcRef.current) return;
    const pc = pcRef.current;
    
    const callDocRef = doc(firestore, 'calls', callId);
    const unsubscribeCall = onSnapshot(callDocRef, (snapshot) => {
      const data = snapshot.data() as CallDocument;
      setCallData(data);

      if (data?.answer && !pc.currentRemoteDescription && pc.signalingState !== 'closed') {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription).catch((err) => {
            console.error("Error setting remote description:", err);
        });
      }
      
      if (data && ['ended', 'declined', 'missed'].includes(data.status)) {
        if (pc && pc.signalingState !== 'closed') {
          pc.getSenders().forEach(sender => sender.track?.stop());
          pc.close();
        }
        if(localStreamRef.current) {
            localStreamRef.current.getTracks().forEach(track => track.stop());
        }
        setPeerConnection(null);
        pcRef.current = null;
        setLocalStream(null);
        localStreamRef.current = null;
      }
    });
    
    const callerId = callData?.callerId;
    const calleeId = callData?.calleeId;
    
    if(!callerId || !calleeId) {
        return () => {
            unsubscribeCall();
        };
    }

    const myRole = authUser.id === callerId ? 'caller' : 'callee';
    const otherRole = myRole === 'caller' ? 'callee' : 'caller';
    const candidatesCollection = collection(firestore, `calls/${callId}/${otherRole}Candidates`);
    
    const unsubscribeCandidates = onSnapshot(candidatesCollection, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === 'added' && pc.signalingState !== 'closed') {
                try {
                    const candidate = new RTCIceCandidate(change.doc.data());
                    await pc.addIceCandidate(candidate);
                } catch (e) {
                    console.error('Error adding ICE candidate:', e);
                }
            }
        });
    });

    pc.onicecandidate = (event) => {
        if (event.candidate) {
            const myCandidatesCollection = collection(firestore, `calls/${callId}/${myRole}Candidates`);
            addDoc(myCandidatesCollection, event.candidate.toJSON());
        }
    };

    return () => {
        unsubscribeCall();
        unsubscribeCandidates();
    };

  }, [callId, authUser?.id, callData?.callerId, callData?.calleeId]);
  
  const createOffer = async () => {
    if (!pcRef.current || pcRef.current.signalingState !== 'stable') return;
    const callDoc = doc(firestore, 'calls', callId);
    const offerDescription = await pcRef.current.createOffer();
    await pcRef.current.setLocalDescription(offerDescription);
    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    };
    await updateDoc(callDoc, { offer });
  };
  
  const createAnswer = async () => {
    if (!pcRef.current || pcRef.current.signalingState === 'closed') return;
    const callDoc = doc(firestore, 'calls', callId);
    const callSnapshot = await getDoc(callDoc);
    const callData = callSnapshot.data();
    if(callData?.offer && pcRef.current.signalingState !== 'closed') {
      try {
        const offerDescription = new RTCSessionDescription(callData.offer);
        await pcRef.current.setRemoteDescription(offerDescription);
      } catch (e) {
        console.error("Error setting remote description on answer:", e);
        return;
      }
    }

    if (pcRef.current.signalingState === 'have-remote-offer') {
        const answerDescription = await pcRef.current.createAnswer();
        await pcRef.current.setLocalDescription(answerDescription);

        const answer = {
          type: answerDescription.type,
          sdp: answerDescription.sdp,
        };
        await updateDoc(callDoc, { answer, status: 'connected' });
    }
  };

  const toggleMute = () => {
    if (!localStream) return;
    localStream.getAudioTracks().forEach(track => {
      track.enabled = !track.enabled;
      setIsMuted(!track.enabled);
    });
  };

  const toggleVideo = () => {
    if (!localStream) return;
    localStream.getVideoTracks().forEach(track => {
      track.enabled = !track.enabled;
      setIsVideoEnabled(!track.enabled);
    });
  };

  return { 
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
  };
}
