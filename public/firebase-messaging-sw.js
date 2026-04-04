importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.4.0/firebase-messaging-compat.js');

firebase.initializeApp({
    apiKey: "AIzaSyB9rX2IUTx99cWvdjTZ7YJD3ouDdordjj8",
    authDomain: "montapulse-app.firebaseapp.com",
    projectId: "montapulse-app",
    storageBucket: "montapulse-app.firebasestorage.app",
    messagingSenderId: "171684408196",
    appId: "1:171684408196:web:11eb216bd0b67ab58b0bd1"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.image || '/logo192.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
