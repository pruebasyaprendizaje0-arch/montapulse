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
    setDoc,
    increment,
    orderBy,
    limit,
    startAfter
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { MontanitaEvent, Business, UserProfile, ChatRoom, ChatMessage, BusinessReview } from '../types';

// Helper to sanitize data for Firestore
const sanitizeData = (data: any): any => {
    if (data === undefined) {
        return null;
    }
    if (Array.isArray(data)) {
        return data.map(item => sanitizeData(item));
    }
    if (data !== null && typeof data === 'object' && !(data instanceof Date) && !(data instanceof Timestamp)) {
        return Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, v === undefined ? null : sanitizeData(v)])
        );
    }
    return data;
};

// ==================== REVIEWS ====================

export const subscribeToBusinessReviews = (businessId: string, callback: (reviews: BusinessReview[]) => void) => {
    const reviewsRef = collection(db, 'businessReviews');
    const q = query(reviewsRef, where('businessId', '==', businessId), orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as BusinessReview[];
        callback(reviews);
    });
};

export const addBusinessReview = async (review: BusinessReview) => {
    try {
        const reviewsRef = collection(db, 'businessReviews');
        const reviewDoc = await addDoc(reviewsRef, {
            ...review,
            timestamp: serverTimestamp()
        });

        // Update business reviewCount and calculate new rating
        const businessRef = doc(db, 'businesses', review.businessId);
        const businessSnap = await getDoc(businessRef);
        
        if (businessSnap.exists()) {
            const businessData = businessSnap.data();
            const currentReviewCount = businessData.reviewCount || 0;
            const currentRating = businessData.rating || 0;
            
            // Calculate new average rating
            const newReviewCount = currentReviewCount + 1;
            const newRating = ((currentRating * currentReviewCount) + review.rating) / newReviewCount;
            
            await updateDoc(businessRef, {
                reviewCount: newReviewCount,
                rating: Math.round(newRating * 10) / 10
            });
        }
    } catch (error) {
        console.error('Error adding business review:', error);
        throw error;
    }
};

// ==================== EVENTS ====================

export const createEvent = async (event: Omit<MontanitaEvent, 'id'>) => {
    try {
        const eventsRef = collection(db, 'events');
        const docRef = await addDoc(eventsRef, {
            ...sanitizeData(event),
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
            ...sanitizeData(updateData),
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
    // ─ OPTIMIZACIÓN: Filtramos en el SERVIDOR solo eventos del mes pasado hacia adelante.
    // Antes: descargaba TODA la colección events sin importar la fecha.
    // Ahorro estimado: ~70% de lecturas cuando la colección supera los 50 docs.
    const now = new Date();
    const firstDayOfPastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const cutoffTimestamp = Timestamp.fromDate(firstDayOfPastMonth);

    const eventsRef = collection(db, 'events');
    const q = query(
        eventsRef,
        where('endAt', '>=', cutoffTimestamp),
        orderBy('endAt', 'asc'),
        limit(150) // Tope de seguridad: máx 150 eventos activos
    );
    return onSnapshot(q, (snapshot) => {
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

export const incrementViewCount = async (id: string) => {
    try {
        const bizRef = doc(db, 'businesses', id);
        await updateDoc(bizRef, {
            viewCount: increment(1)
        });
    } catch (error) {
        // Silently fail as this is not critical
    }
};

export const createBusiness = async (business: Omit<Business, 'id'>) => {
    try {
        const businessesRef = collection(db, 'businesses');
        

        // Reference points need a custom ID with the ref- prefix for map styling
        if ((business as any).isReference) {
            const refId = `ref-${Date.now()}`;
            const docRef = doc(businessesRef, refId);
            await setDoc(docRef, {
                ...sanitizeData(business),
                createdAt: serverTimestamp()
            });
            return refId;
        }
        const docRef = await addDoc(businessesRef, {
            ...sanitizeData(business),
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

        // Using setDoc with merge to support reference points that may not exist in Firestore yet
        await setDoc(businessRef, {
            ...sanitizeData(data),
            updatedAt: serverTimestamp()
        }, { merge: true });
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

export const purgeAllReferencePoints = async () => {
    try {
        const businessesRef = collection(db, 'businesses');
        const snapshot = await getDocs(businessesRef);
        const toDelete = snapshot.docs.filter(doc => {
            const data = doc.data();
            const id = doc.id.toLowerCase();
            const name = (data.name || '').toLowerCase();
            const category = (data.category as string || '').toLowerCase();
            
            return data.isReference || 
                   id.startsWith('ref-') || 
                   category.includes('referencia') ||
                   category.includes('reference') ||
                   name.includes('ref-') ||
                   name.includes('referencia') ||
                   name.includes('reference') ||
                   name.includes('punto de');
        });

        console.log(`Purger: Found ${toDelete.length} points to delete.`);
        
        const deletePromises = toDelete.map(d => deleteDoc(d.ref));
        await Promise.all(deletePromises);
        
        return toDelete.length;
    } catch (error) {
        console.error('Error purging reference points:', error);
        throw error;
    }
};

export const getBusinessById = async (id: string): Promise<Business | null> => {
    try {
        const bizRef = doc(db, 'businesses', id);
        const snapshot = await getDoc(bizRef);
        if (snapshot.exists()) {
            return { id: snapshot.id, ...snapshot.data() } as Business;
        }
        return null;
    } catch (error) {
        console.error('Error getting business:', error);
        return null;
    }
};

export const getBusinessByEmail = async (email: string): Promise<Business | null> => {
    try {
        const businessesRef = collection(db, 'businesses');
        const q = query(businessesRef, where('email', '==', email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as Business;
        }
        return null;
    } catch (error) {
        console.error('Error getting business by email:', error);
        return null;
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

export const incrementBusinessViewCount = async (businessId: string) => {
    try {
        const bizRef = doc(db, 'businesses', businessId);
        await updateDoc(bizRef, {
            viewCount: increment(1)
        });
    } catch (error) {
        console.error('Error incrementing business view count:', error);
    }
};

// ==================== USERS ====================

export const createUser = async (userId: string, userData: Omit<UserProfile, 'id'>) => {
    try {
        const userRef = doc(db, 'users_v2', userId);
        await setDoc(userRef, {
            ...sanitizeData(userData),
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
            ...sanitizeData(data),
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
        throw error;
    }
};

export const getUserByEmail = async (email: string): Promise<UserProfile | null> => {
    try {
        const usersRef = collection(db, 'users_v2');
        const q = query(usersRef, where('email', '==', email));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() } as UserProfile;
        }
        return null;
    } catch (error) {
        console.error('Error getting user by email:', error);
        return null;
    }
};

export const subscribeToUsers = (callback: (users: UserProfile[]) => void) => {
    // ─ OPTIMIZACIÓN: Limitar a los 200 usuarios más recientes.
    // Solo admin y premium hosts llegan a este query. El límite evita abrir
    // una escucha sin tope sobre usuarios_v2 completos.
    const usersRef = collection(db, 'users_v2');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(200));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UserProfile[];
        callback(users);
    });
};

// ==================== POINTS & PASS ====================

export const addPoints = async (userId: string, amount: number) => {
    const userRef = doc(db, 'users_v2', userId);
    await updateDoc(userRef, {
        points: increment(amount)
    });
};

export const redeemPoints = async (userId: string, amount: number) => {
    const userRef = doc(db, 'users_v2', userId);
    await updateDoc(userRef, {
        points: increment(-amount)
    });
};

export const togglePulsePass = async (userId: string, active: boolean) => {
    const userRef = doc(db, 'users_v2', userId);
    await updateDoc(userRef, {
        pulsePassActive: active
    });
};

// ==================== FOLLOWS ====================

export const toggleFollowBusiness = async (userId: string, businessId: string) => {
    const followsRef = collection(db, 'follows');
    const q = query(followsRef, where('userId', '==', userId), where('businessId', '==', businessId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
        await deleteDoc(snapshot.docs[0].ref);
        // Decrement follower count
        const businessRef = doc(db, 'businesses', businessId);
        await updateDoc(businessRef, {
            followerCount: increment(-1)
        });
        return false;
    } else {
        await addDoc(followsRef, {
            userId,
            businessId,
            createdAt: serverTimestamp()
        });
        // Increment follower count
        const businessRef = doc(db, 'businesses', businessId);
        await updateDoc(businessRef, {
            followerCount: increment(1)
        });
        return true;
    }
};

export const getFollowedBusinessIds = async (userId: string): Promise<string[]> => {
    const followsRef = collection(db, 'follows');
    const q = query(followsRef, where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().businessId);
};

export const subscribeToUserFollows = (userId: string, callback: (businessIds: string[]) => void) => {
    const followsRef = collection(db, 'follows');
    const q = query(followsRef, where('userId', '==', userId));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => doc.data().businessId));
    });
};

export const getBusinessFollowers = async (businessId: string): Promise<string[]> => {
    const followsRef = collection(db, 'follows');
    const q = query(followsRef, where('businessId', '==', businessId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data().userId);
};

export const subscribeToBusinessFollowers = (businessId: string, callback: (userIds: string[]) => void) => {
    const followsRef = collection(db, 'follows');
    const q = query(followsRef, where('businessId', '==', businessId));
    return onSnapshot(q, (snapshot) => {
        callback(snapshot.docs.map(doc => doc.data().userId));
    });
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

export const subscribeToUserFavorites = (userId: string, callback: (eventIds: string[]) => void) => {
    const favoritesRef = collection(db, 'favorites');
    const q = query(favoritesRef, where('userId', '==', userId));

    return onSnapshot(q, (snapshot) => {
        const eventIds = snapshot.docs.map(doc => doc.data().eventId);
        callback(eventIds);
    });
};

// ==================== RSVPS ====================

export const toggleRSVP = async (userId: string, eventId: string) => {
    try {
        const rsvpsRef = collection(db, 'rsvps');
        const q = query(rsvpsRef, where('userId', '==', userId), where('eventId', '==', eventId));
        const snapshot = await getDocs(q);

        const eventRef = doc(db, 'events', eventId);

        if (!snapshot.empty) {
            await deleteDoc(snapshot.docs[0].ref);
            await updateDoc(eventRef, {
                interestedCount: increment(-1)
            });
            return false;
        } else {
            await addDoc(rsvpsRef, {
                userId,
                eventId,
                createdAt: serverTimestamp()
            });
            await updateDoc(eventRef, {
                interestedCount: increment(1)
            });
            return true;
        }
    } catch (error) {
        console.error('Error toggling RSVP:', error);
        throw error;
    }
};

export const subscribeToUserRSVPs = (userId: string, callback: (eventIds: string[]) => void) => {
    const rsvpsRef = collection(db, 'rsvps');
    const q = query(rsvpsRef, where('userId', '==', userId));

    return onSnapshot(q, (snapshot) => {
        const eventIds = snapshot.docs.map(doc => doc.data().eventId);
        callback(eventIds);
    });
};

export const subscribeToRSVPCounts = (callback: (counts: Record<string, number>) => void) => {
    // ─ OPTIMIZACIÓN: Antes descargaba TODOS los RSVPs sin límite — el mayor gasto
    // de lecturas de toda la app. Ahora limitamos a los 500 más recientes.
    // La solución ideal a largo plazo es almacenar el conteo denormalizado
    // directamente en cada documento de 'events' (campo interestedCount),
    // que ya existe y se actualiza con increment() en toggleRSVP. En ese
    // escenario, este listener puede eliminarse completamente.
    const rsvpsRef = collection(db, 'rsvps');
    const q = query(rsvpsRef, orderBy('createdAt', 'desc'), limit(500));
    return onSnapshot(q, (snapshot) => {
        const counts: Record<string, number> = {};
        snapshot.docs.forEach(doc => {
            const eventId = doc.data().eventId;
            counts[eventId] = (counts[eventId] || 0) + 1;
        });
        callback(counts);
    });
};

// ==================== SETTINGS ====================

export const getAppSettings = async (settingId: string) => {
    try {
        const settingRef = doc(db, 'settings', settingId);
        const snapshot = await getDoc(settingRef);
        return snapshot.exists() ? snapshot.data() : null;
    } catch (error) {
        console.error('Error getting settings:', error);
        return null;
    }
};

export const updateAppSettings = async (settingId: string, data: any) => {
    try {
        const settingRef = doc(db, 'settings', settingId);
        await setDoc(settingRef, {
            ...data,
            updatedAt: serverTimestamp()
        }, { merge: true });
    } catch (error) {
        console.error('Error updating settings:', error);
        throw error;
    }
};

export const subscribeToAppSettings = (settingId: string, callback: (data: any) => void) => {
    const settingRef = doc(db, 'settings', settingId);
    return onSnapshot(settingRef, (doc) => {
        if (doc.exists()) {
            callback(doc.data());
        }
    });
};

// ==================== COMMUNITY ====================

export const subscribeToPosts = (callback: (posts: any[]) => void) => {
    // ─ OPTIMIZACIÓN: Limitar a los 30 posts más recientes.
    // Sin este límite, cada apertura del chat descargaba toda la colección.
    // Ahorro: ~N-30 lecturas por sesión (donde N = total de posts).
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('timestamp', 'desc'), limit(30));
    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        callback(posts);
    });
};

export const createPost = async (post: any) => {
    try {
        const postsRef = collection(db, 'posts');
        await addDoc(postsRef, {
            ...post,
            timestamp: serverTimestamp(),
            likes: 0,
            comments: 0
        });
    } catch (error) {
        console.error('Error creating post:', error);
        throw error;
    }
};

export const toggleLikePost = async (postId: string, userId: string) => {
    const postRef = doc(db, 'posts', postId);
    await updateDoc(postRef, {
        likes: increment(1)
    });
};

// ==================== GLOBAL MESSAGES (OLD) ====================

export const subscribeToMessages = (limitNum: number, callback: (messages: any[]) => void) => {
    const messagesRef = collection(db, 'messages');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitNum));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        callback(messages.reverse());
    });
};

export const sendMessage = async (message: any) => {
    try {
        const messagesRef = collection(db, 'messages');
        await addDoc(messagesRef, {
            ...message,
            timestamp: serverTimestamp()
        });
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

// ==================== CHAT ROOMS (NEW) ====================

export const subscribeToChatRooms = (userId: string, callback: (rooms: ChatRoom[]) => void) => {
    const roomsRef = collection(db, 'chatRooms');
    const q = query(roomsRef, where('participants', 'array-contains', userId));
    return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            lastMessageTime: doc.data().lastMessageTime?.toDate() || new Date()
        })) as ChatRoom[];
        callback(rooms);
    });
};

export const sendRoomMessage = async (roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>) => {
    try {
        const messagesRef = collection(db, `chatRooms/${roomId}/messages`);
        await addDoc(messagesRef, {
            ...message,
            timestamp: serverTimestamp()
        });

        const roomRef = doc(db, 'chatRooms', roomId);
        const prefix = message.isBusinessMessage ? '🏪 ' : '👤 ';
        await updateDoc(roomRef, {
            lastMessage: `${prefix}${message.senderName}: ${message.text}`,
            lastMessageTime: serverTimestamp()
        });
    } catch (error) {
        console.error('Error sending room message:', error);
        throw error;
    }
};

export const subscribeToRoomMessages = (roomId: string, callback: (messages: ChatMessage[]) => void) => {
    const messagesRef = collection(db, `chatRooms/${roomId}/messages`);
    const q = query(messagesRef, orderBy('timestamp', 'asc'));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as ChatMessage[];
        callback(messages);
    });
};

/**
 * Auto-delete messages older than 7 days from a chat room.
 * Called client-side when a user opens a room (Spark plan — no Cloud Functions).
 */
export const deleteOldRoomMessages = async (roomId: string): Promise<void> => {
    try {
        const ONE_WEEK_AGO = Timestamp.fromDate(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        const messagesRef = collection(db, `chatRooms/${roomId}/messages`);
        const q = query(messagesRef, where('timestamp', '<', ONE_WEEK_AGO), limit(50));
        const snapshot = await getDocs(q);
        const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletes);
        if (snapshot.size > 0) {
            console.log(`[AutoClean] Deleted ${snapshot.size} old messages from room ${roomId}`);
        }
    } catch (error) {
        // Non-critical — silently fail so it doesn't break the chat experience
        console.warn('[AutoClean] Could not delete old messages:', error);
    }
};

/** Delete a single message from a chatRoom — only the sender can call this (enforced by Firestore rules too). */
export const deleteRoomMessage = async (roomId: string, messageId: string): Promise<void> => {
    try {
        const msgRef = doc(db, `chatRooms/${roomId}/messages`, messageId);
        await deleteDoc(msgRef);
    } catch (error) {
        console.error('Error deleting room message:', error);
        throw error;
    }
};

/** Delete a single message from the global chat (messages collection). */
export const deleteGlobalMessage = async (messageId: string): Promise<void> => {
    try {
        const msgRef = doc(db, 'messages', messageId);
        await deleteDoc(msgRef);
    } catch (error) {
        console.error('Error deleting global message:', error);
        throw error;
    }
};

export const createChatRoom = async (roomData: Omit<ChatRoom, 'id'>) => {
    try {
        const roomsRef = collection(db, 'chatRooms');
        const docRef = await addDoc(roomsRef, {
            ...roomData,
            createdAt: serverTimestamp(),
            lastMessageTime: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating chat room:', error);
        throw error;
    }
};

export interface CustomLocality {
    id?: string;
    name: string;
    coords: [number, number];
    zoom: number;
    sectors: string[];
    createdBy: string;
    createdAt: Date;
}

export const getCustomLocalities = async (): Promise<CustomLocality[]> => {
    try {
        const localitiesRef = collection(db, 'customLocalities');
        const snapshot = await getDocs(localitiesRef);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as CustomLocality[];
    } catch (error) {
        console.error('Error getting custom localities:', error);
        return [];
    }
};

export const createCustomLocality = async (locality: Omit<CustomLocality, 'id' | 'createdAt'>): Promise<string> => {
    try {
        const localitiesRef = collection(db, 'customLocalities');
        const docRef = await addDoc(localitiesRef, {
            ...locality,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating custom locality:', error);
        throw error;
    }
};

export const deleteCustomLocality = async (id: string): Promise<void> => {
    try {
        const localityRef = doc(db, 'customLocalities', id);
        await deleteDoc(localityRef);
    } catch (error) {
        console.error('Error deleting custom locality:', error);
        throw error;
    }
};

