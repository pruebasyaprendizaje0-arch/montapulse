import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
    apiKey: "AIzaSyB9rX2IUTx99cWvdjTZ7YJD3ouDdordjj8",
    authDomain: "montapulse-app.firebaseapp.com",
    projectId: "montapulse-app",
    storageBucket: "montapulse-app.firebasestorage.app",
    messagingSenderId: "171684408196",
    appId: "1:171684408196:web:11eb216bd0b67ab58b0bd1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
