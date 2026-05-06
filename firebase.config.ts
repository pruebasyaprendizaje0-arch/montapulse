import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    getFirestore,
    CACHE_SIZE_UNLIMITED,
    terminate,
    clearIndexedDbPersistence,
    memoryLocalCache
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

// Initialize Firestore with settings only if not already initialized
let db: any;
try {
    // Optimization: Using memoryLocalCache to avoid the "Persistent cache corruption" issues
    // reported with Firestore 11.0.1 in some environments.
    db = initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
        ignoreUndefinedProperties: true
    });
    console.log('Firestore initialized with Memory Cache and Long Polling');
} catch (error) {
    console.warn("Firestore already initialized, retrieving existing instance");
    db = getFirestore(app);
}

const storage = getStorage(app);
const auth = getAuth(app);
const messaging = typeof window !== 'undefined' ? getMessaging(app) : null;

/**
 * Aggressively clears all Firestore state and reloads the application.
 * This is the primary recovery mechanism for INTERNAL ASSERTION FAILED errors.
 */
const resetFirestoreCache = async () => {
    console.warn('Starting aggressive Firestore cache reset...');
    try {
        // 1. Clear any legacy IndexedDB persistence that might be lingering
        if (typeof window !== 'undefined') {
            await clearIndexedDbPersistence(db);
        }
        
        // 2. Terminate the instance to clear in-memory state
        await terminate(db);
        
        console.log('Firestore state cleared successfully. Reloading...');
        
        if (typeof window !== 'undefined') {
            // Use a hard reload to ensure all JS state is wiped
            window.location.reload();
        }
    } catch (error) {
        console.error('Error during Firestore reset:', error);
        // Fallback: just reload if we can't terminate
        if (typeof window !== 'undefined') {
            window.location.reload();
        }
    }
};

export { db, storage, auth, messaging, resetFirestoreCache };
export default app;
