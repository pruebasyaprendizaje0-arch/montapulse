import { initializeApp } from 'firebase/app';
import {
    initializeFirestore,
    getFirestore,
    terminate,
    clearIndexedDbPersistence,
    memoryLocalCache,
    persistentLocalCache,
    persistentMultipleTabManager
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

// Initialize Firestore con caché persistente (IndexedDB) para carga rápida en visitas repetidas.
// Jerarquía de fallbacks: IndexedDB → MemoryCache → Firestore base (sin caché)
let db: any;
try {
    // Prioridad 1: Persistencia IndexedDB — visitas repetidas cargan desde disco, no red.
    // Nota: CACHE_SIZE_UNLIMITED fue eliminado en Firebase 12+; se maneja automáticamente.
    // experimentalForceLongPolling fue removido → usa WebSockets (más rápido).
    db = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        }),
        ignoreUndefinedProperties: true
    });
    console.log('Firestore: Persistent IndexedDB cache + WebSockets activos.');
} catch (persistenceError) {
    // Fallback 2: Si IndexedDB falla (ej. Safari privado, storage lleno), usar memoria
    console.warn('Firestore: IndexedDB no disponible, usando Memory Cache.', persistenceError);
    try {
        db = initializeFirestore(app, {
            localCache: memoryLocalCache(),
            ignoreUndefinedProperties: true
        });
    } catch (error) {
        // Fallback 3: Firestore ya inicializado
        console.warn("Firestore: ya inicializado, obteniendo instancia existente.");
        db = getFirestore(app);
    }
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
