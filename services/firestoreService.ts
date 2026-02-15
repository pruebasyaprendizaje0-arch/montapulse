import {
    collection,
    doc,
    addDoc,
    updateDoc,
    deleteDoc,
    getDocs,
    getDoc,
    query,
    where,
    onSnapshot,
    serverTimestamp,
    Timestamp,
    setDoc
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { MontanitaEvent, Business, UserProfile } from '../types';

// ==================== EVENTS ====================

export const createEvent = async (event: Omit<MontanitaEvent, 'id'>) => {
    try {
        const eventsRef = collection(db, 'events');
        const docRef = await addDoc(eventsRef, {
            ...event,
            startAt: Timestamp.fromDate(event.startAt),
            endAt: Timestamp.fromDate(event.endAt),
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating event:', error);
        throw error;
    }
};

export const updateEvent = async (id: string, data: Partial<MontanitaEvent>) => {
    try {
        const eventRef = doc(db, 'events', id);
        const updateData: any = { ...data };

        if (data.startAt) {
            updateData.startAt = Timestamp.fromDate(data.startAt);
        }
        if (data.endAt) {
            updateData.endAt = Timestamp.fromDate(data.endAt);
        }

        await updateDoc(eventRef, {
            ...updateData,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating event:', error);
        throw error;
    }
};

export const deleteEvent = async (id: string) => {
    try {
        const eventRef = doc(db, 'events', id);
        await deleteDoc(eventRef);
    } catch (error) {
        console.error('Error deleting event:', error);
        throw error;
    }
};

export const getEvents = async (): Promise<MontanitaEvent[]> => {
    try {
        const eventsRef = collection(db, 'events');
        const snapshot = await getDocs(eventsRef);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startAt: doc.data().startAt?.toDate() || new Date(),
            endAt: doc.data().endAt?.toDate() || new Date()
        })) as MontanitaEvent[];
    } catch (error) {
        console.error('Error getting events:', error);
        return [];
    }
};

export const subscribeToEvents = (callback: (events: MontanitaEvent[]) => void) => {
    const eventsRef = collection(db, 'events');
    return onSnapshot(eventsRef, (snapshot) => {
        const events = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            startAt: doc.data().startAt?.toDate() || new Date(),
            endAt: doc.data().endAt?.toDate() || new Date()
        })) as MontanitaEvent[];
        callback(events);
    });
};

// ==================== BUSINESSES ====================

export const createBusiness = async (business: Omit<Business, 'id'>) => {
    try {
        const businessesRef = collection(db, 'businesses');
        const docRef = await addDoc(businessesRef, {
            ...business,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating business:', error);
        throw error;
    }
};

export const updateBusiness = async (id: string, data: Partial<Business>) => {
    try {
        const businessRef = doc(db, 'businesses', id);
        await updateDoc(businessRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating business:', error);
        throw error;
    }
};

export const deleteBusiness = async (id: string) => {
    try {
        const businessRef = doc(db, 'businesses', id);
        await deleteDoc(businessRef);
    } catch (error) {
        console.error('Error deleting business:', error);
        throw error;
    }
};

export const getBusinesses = async (): Promise<Business[]> => {
    try {
        const businessesRef = collection(db, 'businesses');
        const snapshot = await getDocs(businessesRef);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Business[];
    } catch (error) {
        console.error('Error getting businesses:', error);
        return [];
    }
};

export const subscribeToBusinesses = (callback: (businesses: Business[]) => void) => {
    const businessesRef = collection(db, 'businesses');
    return onSnapshot(businessesRef, (snapshot) => {
        const businesses = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as Business[];
        callback(businesses);
    });
};

// ==================== USERS ====================

export const createUser = async (userId: string, userData: Omit<UserProfile, 'id'>) => {
    try {
        const userRef = doc(db, 'users_v2', userId);
        // Use setDoc with merge: true to create or update
        await setDoc(userRef, {
            ...userData,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error creating user:', error);
        throw error;
    }
};

export const updateUser = async (userId: string, data: Partial<UserProfile>) => {
    try {
        const userRef = doc(db, 'users_v2', userId);
        await updateDoc(userRef, {
            ...data,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error updating user:', error);
        throw error;
    }
};

export const getUser = async (userId: string): Promise<UserProfile | null> => {
    try {
        const userRef = doc(db, 'users_v2', userId);
        const snapshot = await getDoc(userRef);
        if (snapshot.exists()) {
            return {
                id: snapshot.id,
                ...snapshot.data()
            } as UserProfile;
        }
        return null;
    } catch (error) {
        console.error('Error getting user:', error);
        throw error; // Throw so we can handle errors vs "not found"
    }
};

// ==================== FAVORITES ====================

export const addFavorite = async (userId: string, eventId: string) => {
    try {
        const favoritesRef = collection(db, 'favorites');
        await addDoc(favoritesRef, {
            userId,
            eventId,
            createdAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error adding favorite:', error);
        throw error;
    }
};

export const removeFavorite = async (userId: string, eventId: string) => {
    try {
        const favoritesRef = collection(db, 'favorites');
        const q = query(favoritesRef, where('userId', '==', userId), where('eventId', '==', eventId));
        const snapshot = await getDocs(q);

        snapshot.docs.forEach(async (doc) => {
            await deleteDoc(doc.ref);
        });
    } catch (error) {
        console.error('Error removing favorite:', error);
        throw error;
    }
};

export const getUserFavorites = async (userId: string): Promise<string[]> => {
    try {
        const favoritesRef = collection(db, 'favorites');
        const q = query(favoritesRef, where('userId', '==', userId));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => doc.data().eventId);
    } catch (error) {
        console.error('Error getting favorites:', error);
        return [];
    }
};

export const subscribeToUserFavorites = (userId: string, callback: (eventIds: string[]) => void) => {
    const favoritesRef = collection(db, 'favorites');
    const q = query(favoritesRef, where('userId', '==', userId));

    return onSnapshot(q, (snapshot) => {
        const eventIds = snapshot.docs.map(doc => doc.data().eventId);
        callback(eventIds);
    });
};
