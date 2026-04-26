import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    CACHE_SIZE_UNLIMITED,
    terminate,
    clearIndexedDbPersistence
} from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getAuth } from 'firebase/auth';
import { getMessaging } from 'firebase/messaging';

const firebaseConfig = {
    apiKey: "AIzaSyB9rX2IUTx99cWvdjTZ7YJD3ouDdordjj8",
    authDomain: "montapulse-app.firebaseapp.com",
    projectId: "montapulse-app",
    storageBucket: "montapulse-app.firebasestorage.app",
    messagingSenderId: "171684408196",
    appId: "1:171684408196:web:11eb216bd0b67ab58b0bd1"
};

const app = initializeApp(firebaseConfig);

const db = initializeFirestore(app, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
});

const storage = getStorage(app);
const auth = getAuth(app);
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

const resetFirestoreCache = async () => {
    try {
        await terminate(db);
        await clearIndexedDbPersistence(db);
        console.log('Firestore cache cleared successfully');
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    } catch (error) {
        console.error('Error resetting Firestore cache:', error);
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    }
};

export { db, storage, auth, messaging, resetFirestoreCache };
export default app;
