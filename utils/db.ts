import { Business } from '../types';

const DB_NAME = 'UbicameLocalDB';
const DB_VERSION = 1;
const STORE_NAME = 'sitios';

export const initDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };

        request.onsuccess = (event) => {
            resolve((event.target as IDBOpenDBRequest).result);
        };

        request.onerror = (event) => {
            reject((event.target as IDBOpenDBRequest).error);
        };
    });
};

export const guardarSitiosEnLocal = async (sitios: Business[]): Promise<void> => {
    try {
        const db = await initDB();
        return new Promise<void>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readwrite');
            const store = transaction.objectStore(STORE_NAME);

            // Clear existing storage to avoid stale data
            const clearRequest = store.clear();

            clearRequest.onsuccess = () => {
                let errorOccurred = false;
                
                if (sitios.length === 0) {
                    resolve();
                    return;
                }

                sitios.forEach((sitio) => {
                    const putRequest = store.put(sitio);
                    putRequest.onerror = (event) => {
                        errorOccurred = true;
                        reject((event.target as IDBRequest).error);
                    };
                });

                transaction.oncomplete = () => {
                    if (!errorOccurred) resolve();
                };

                transaction.onerror = (event) => {
                    reject((event.target as IDBTransaction).error);
                };
            };

            clearRequest.onerror = (event) => {
                reject((event.target as IDBRequest).error);
            };
        });
    } catch (error) {
        console.error('Error al guardar sitios en IndexedDB:', error);
        throw error;
    }
};

export const obtenerSitiosLocales = async (): Promise<Business[]> => {
    try {
        const db = await initDB();
        return new Promise<Business[]>((resolve, reject) => {
            const transaction = db.transaction([STORE_NAME], 'readonly');
            const store = transaction.objectStore(STORE_NAME);
            const request = store.getAll();

            request.onsuccess = (event) => {
                resolve((event.target as IDBRequest).result as Business[]);
            };

            request.onerror = (event) => {
                reject((event.target as IDBRequest).error);
            };
        });
    } catch (error) {
        console.error('Error al obtener sitios locales de IndexedDB:', error);
        return [];
    }
};
