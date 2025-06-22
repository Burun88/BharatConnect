// Import the Firebase app and messaging packages
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCmVRTIvMTgZ_IBhzlc-Ml0yt106l0EyOk",
  authDomain: "bharatconnect-i8510.firebaseapp.com",
  projectId: "bharatconnect-i8510",
  storageBucket: "bharatconnect-i8510.firebasestorage.app",
  messagingSenderId: "1011856991455",
  appId: "1:1011856991455:web:b8611aad228c31ccbf756a"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification.title || 'BharatConnect';
  const notificationOptions = {
    body: payload.notification.body || 'You have a new message.',
    icon: '/logo192.png', // Default icon
    data: payload.data, // Pass along all data from the FCM payload
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  const urlToOpen = new URL(event.notification.data.link || '/', self.location.origin).href;

  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url == urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});
