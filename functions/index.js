
const functions = require("firebase-functions");
const admin = require("firebase-admin");

admin.initializeApp();

exports.sendChatNotification = functions.region('asia-south1').firestore
  .document("chats/{chatId}/messages/{messageId}")
  .onCreate(async (snap, context) => {
    const messageData = snap.data();
    const senderId = messageData.senderId;

    if (!senderId) {
      console.log("Message is missing senderId. Exiting function.");
      return null;
    }
    
    const chatId = context.params.chatId;
    const chatRef = admin.firestore().collection("chats").doc(chatId);
    const chatDoc = await chatRef.get();

    if (!chatDoc.exists) {
      console.log(`Chat document ${chatId} not found. Exiting.`);
      return null;
    }

    const chatData = chatDoc.data();
    const participants = chatData.participants;

    if (!participants || participants.length < 2) {
      console.log("Chat has fewer than 2 participants. Exiting.");
      return null;
    }
    
    const receiverId = participants.find(p => p !== senderId);
    if (!receiverId) {
        console.log("Could not determine receiverId. Exiting.");
        return null;
    }

    const senderProfileRef = admin.firestore().collection("bharatConnectUsers").doc(senderId);
    const senderProfileDoc = await senderProfileRef.get();
    const senderName = senderProfileDoc.exists ? senderProfileDoc.data().displayName : "Someone";

    const receiverProfileRef = admin.firestore().collection("bharatConnectUsers").doc(receiverId);
    const receiverProfileDoc = await receiverProfileRef.get();
    const fcmToken = receiverProfileDoc.exists ? receiverProfileDoc.data().fcmToken : null;
    
    if (fcmToken) {
        console.log(`Sending notification to ${receiverId} with token ${fcmToken}`);
        const payload = {
            notification: {
                title: `New message from ${senderName}`,
                body: "Tap to open the chat.",
            },
            token: fcmToken,
            data: {
                chatId: chatId,
            },
            android: {
                priority: "high",
            },
            webpush: {
                fcmOptions: {
                    link: `/chat/${chatId}`
                }
            }
        };
        
        return admin.messaging().send(payload);
    } else {
        console.log(`No FCM token found for receiver ${receiverId}.`);
        return null;
    }
  });

exports.sendCallNotification = functions.region('asia-south1').firestore
  .document("calls/{callId}")
  .onCreate(async (snap, context) => {
    const callData = snap.data();
    const { callerId, callerName, calleeId, callType } = callData;

    if (!callerId || !calleeId) {
      console.log("Call is missing callerId or calleeId. Exiting function.");
      return null;
    }

    const calleeProfileRef = admin.firestore().collection("bharatConnectUsers").doc(calleeId);
    const calleeProfileDoc = await calleeProfileRef.get();

    if (!calleeProfileDoc.exists) {
        console.log(`Callee profile ${calleeId} not found. Exiting.`);
        return null;
    }
    
    const fcmToken = calleeProfileDoc.data().fcmToken;

    if (fcmToken) {
        console.log(`Sending call notification to ${calleeId} with token ${fcmToken}`);
        const payload = {
            token: fcmToken,
            notification: {
                title: `Incoming ${callType} call`,
                body: `${callerName || 'Someone'} is calling you.`,
            },
            data: {
                type: 'call',
                callId: context.params.callId,
                callerId: callerId,
                callerName: callerName || 'Someone',
                callType: callType,
            },
            android: {
                priority: "high",
                notification: {
                    channelId: "call_notifications", 
                    sound: "default",
                }
            },
            webpush: {
                fcmOptions: {
                    link: `/call/${context.params.callId}`
                }
            }
        };

        return admin.messaging().send(payload);
    } else {
        console.log(`No FCM token found for callee ${calleeId}.`);
        return null;
    }
  });
