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
    startAfter,
    arrayUnion,
    arrayRemove
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { MontanitaEvent, Business, UserProfile, ChatRoom, ChatMessage, ProfileReview, PulseNotification, Announcement, SubscriptionPlan } from '../types';

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

// Error handling for Firestore SDK bugs
export const handleFirestoreError = (error: any, context: string) => {
    console.error(`Firestore Error [${context}]:`, error);
    const errorStr = String(error);
    if (errorStr.includes('INTERNAL ASSERTION FAILED') || errorStr.includes('ID: ca9') || errorStr.includes('ID: b815')) {
        console.warn('Critical Firestore Assertion Failure detected. The SDK internal state may be corrupted.');
        if (typeof window !== 'undefined') {
            // Dispatch a custom event so the UI can react
            window.dispatchEvent(new CustomEvent('firestore-assertion-failure', { detail: { error, context } }));
        }
    }
    return error;
};

// ==================== REVIEWS ====================

export const subscribeToProfileReviews = (targetId: string, callback: (reviews: ProfileReview[]) => void) => {
    const reviewsRef = collection(db, 'businessReviews');
    // Intentamos buscar por targetId (nuevo) o businessId (legacy para negocios)
    // Como Firestore no permite un OR simple sin configurar índices compuestos complejos si hay orderBy,
    // usaremos targetId principalmente. Para negocios legacy seguiremos usando businessId si targetId no existe.
    const q = query(reviewsRef, where('targetId', '==', targetId), orderBy('timestamp', 'desc'));
    
    // Si queremos soportar legacy businessId sin migración, tendríamos que hacer dos queries o un or() si el SDK lo permite.
    // Asumiremos que a partir de ahora se usa targetId.
    return onSnapshot(q, (snapshot) => {
        const reviews = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
        })) as ProfileReview[];
        callback(reviews);
    }, (error) => handleFirestoreError(error, 'subscribeToProfileReviews'));
};

export const addProfileReview = async (review: ProfileReview) => {
    try {
        const reviewsRef = collection(db, 'businessReviews');
        await addDoc(reviewsRef, {
            ...review,
            // Para compatibilidad con legacy businessId si es un negocio
            ...(review.targetType === 'business' ? { businessId: review.targetId } : {}),
            timestamp: serverTimestamp()
        });

        // Update statistics for either business or user
        const collectionName = review.targetType === 'business' ? 'businesses' : 'users_v2';
        const targetRef = doc(db, collectionName, review.targetId);
        const targetSnap = await getDoc(targetRef);
        
        if (targetSnap.exists()) {
            const data = targetSnap.data();
            const currentReviewCount = data.reviewCount || 0;
            const currentRating = data.rating || 0;
            
            const newReviewCount = (currentReviewCount || 0) + 1;
            const newRating = (((currentRating || 0) * (currentReviewCount || 0)) + review.rating) / newReviewCount;
            
            await updateDoc(targetRef, {
                reviewCount: newReviewCount,
                rating: Math.round(newRating * 10) / 10
            });
        }
    } catch (error) {
        console.error('Error adding profile review:', error);
        throw error;
    }
};

// ==================== EVENTS ====================

export const createEvent = async (event: Omit<MontanitaEvent, 'id'>, userPlan?: SubscriptionPlan, hasBusiness?: boolean) => {
    try {
        // Validate plan for event creation (client-side + server-side via rules)
        if (!hasBusiness) {
            const validPlans = [SubscriptionPlan.PREMIUM, SubscriptionPlan.PRO, SubscriptionPlan.ELITE, SubscriptionPlan.EXPERT];
            if (userPlan === SubscriptionPlan.FREE || !validPlans.includes(userPlan as SubscriptionPlan)) {
                throw new Error('UPGRADE_REQUIRED');
            }
        }

        const eventsRef = collection(db, 'events');
        const docRef = await addDoc(eventsRef, {
            ...sanitizeData(event),
            startAt: Timestamp.fromDate(event.startAt),
            endAt: Timestamp.fromDate(event.endAt),
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        if ((error as Error).message === 'UPGRADE_REQUIRED') {
            throw error;
        }
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

export const incrementEventClickCount = async (eventId: string) => {
    try {
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
            clickCount: increment(1),
            weeklyClicks: increment(1)
        });
    } catch (error) {
        // Silently fail
    }
};

export const incrementEventViewCount = async (eventId: string) => {
    try {
        const eventRef = doc(db, 'events', eventId);
        await updateDoc(eventRef, {
            viewCount: increment(1),
            weeklyViews: increment(1)
        });
    } catch (error) {
        // Silently fail
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
    }, (error) => handleFirestoreError(error, 'subscribeToEvents'));
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
        const sanitized = sanitizeData(business);
        console.log('Creating business with sanitized data:', JSON.stringify(sanitized, null, 2));
        
        // Reference points need a custom ID with the ref- prefix for map styling
        if ((business as any).isReference) {
            const refId = `ref-${Date.now()}`;
            const docRef = doc(businessesRef, refId);
            await setDoc(docRef, {
                ...sanitized,
                createdAt: serverTimestamp()
            });
            return refId;
        }
        const docRef = await addDoc(businessesRef, {
            ...sanitized,
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        console.error('Error creating business:', error);
        throw error;
    }
};


export const updateBusiness = async (id: string, data: Partial<Business>): Promise<void> => {
    try {
        const businessRef = doc(db, 'businesses', id);
        const sanitized = sanitizeData(data);
        delete sanitized.updatedAt;

        await updateDoc(businessRef, {
            ...sanitized,
            updatedAt: new Date().toISOString()
        });
    } catch (error: any) {
        console.error('Error updating business:', error);
        throw error; // Re-throw to allow caller to handle
    }
};

export const deleteBusiness = async (id: string, permanent: boolean = false) => {
    try {
        const businessRef = doc(db, 'businesses', id);
        if (permanent) {
            await deleteDoc(businessRef);
        } else {
            await updateDoc(businessRef, { 
                isDeleted: true, 
                deletedAt: serverTimestamp() 
            });
        }
    } catch (error) {
        console.error('Error deleting business:', error);
        throw error;
    }
};

export const restoreBusiness = async (id: string) => {
    try {
        const businessRef = doc(db, 'businesses', id);
        await updateDoc(businessRef, { 
            isDeleted: false,
            deletedAt: null,
            updatedAt: serverTimestamp()
        });
    } catch (error) {
        console.error('Error restoring business:', error);
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
    }, (error) => handleFirestoreError(error, 'subscribeToBusinesses'));
};

export const incrementBusinessViewCount = async (businessId: string) => {
    try {
        const bizRef = doc(db, 'businesses', businessId);
        // We increment both total and weekly. 
        // Note: A real weekly reset would need a Cloud Function or lazy reset on first view of the week.
        await updateDoc(bizRef, {
            viewCount: increment(1),
            weeklyViews: increment(1)
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
        if (!userId) {
            console.error('UserId is missing for update');
            throw new Error('UserId is missing');
        }

        // Clean data for Firestore
        const cleanData = sanitizeData(data);
        
        // NEVER include 'id' in the update payload as it's the document ID
        if (cleanData.id) {
            delete cleanData.id;
        }

        const userRef = doc(db, 'users_v2', userId);
        await updateDoc(userRef, {
            ...cleanData,
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
    // ─ OPTIMIZACIÓN: Limitar a los 500 usuarios más recientes.
    // Solo admin y premium hosts llegan a este query. El límite evita abrir
    // una escucha sin tope sobre usuarios_v2 completos.
    const usersRef = collection(db, 'users_v2');
    const q = query(usersRef, orderBy('createdAt', 'desc'), limit(500));
    return onSnapshot(q, (snapshot) => {
        const users = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        })) as UserProfile[];
        callback(users);
    }, (error) => handleFirestoreError(error, 'subscribeToUsers'));
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
    }, (error) => handleFirestoreError(error, 'subscribeToUserFollows'));
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
    }, (error) => handleFirestoreError(error, 'subscribeToBusinessFollowers'));
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
    }, (error) => handleFirestoreError(error, 'subscribeToUserFavorites'));
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
    }, (error) => handleFirestoreError(error, 'subscribeToUserRSVPs'));
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
    }, (error) => handleFirestoreError(error, 'subscribeToRSVPCounts'));
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
    }, (error) => handleFirestoreError(error, 'subscribeToAppSettings'));
};

// ==================== COMMUNITY ====================

export const subscribeToPosts = (callback: (posts: any[]) => void) => {
    // AUMENTADO: De 30 a 500 posts para el muro de la comunidad
    const postsRef = collection(db, 'posts');
    const q = query(postsRef, orderBy('timestamp', 'desc'), limit(500));
    return onSnapshot(q, (snapshot) => {
        const posts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        callback(posts);
    }, (error) => handleFirestoreError(error, 'subscribeToPosts'));
};

export const createPost = async (post: any, isAuthenticated: boolean = false) => {
    // Validate user is authenticated before creating post
    if (!isAuthenticated) {
        throw new Error('AUTH_REQUIRED');
    }
    
    try {
        const postsRef = collection(db, 'posts');
        await addDoc(postsRef, {
            ...post,
            timestamp: serverTimestamp(),
            likes: [],
            likesCount: 0,
            comments: [],
            commentsCount: 0
        });
    } catch (error) {
        if ((error as Error).message === 'AUTH_REQUIRED') {
            throw error;
        }
        console.error('Error creating post:', error);
        throw error;
    }
};

export const toggleLikePost = async (postId: string, userId: string, isLiked: boolean, authorId: string) => {
    const postRef = doc(db, 'posts', postId);
    try {
        if (isLiked) {
            await updateDoc(postRef, {
                likes: arrayRemove(userId),
                likesCount: increment(-1)
            });
        } else {
            await updateDoc(postRef, {
                likes: arrayUnion(userId),
                likesCount: increment(1)
            });
            // Award 2 points to the author for each like received
            if (authorId) {
                await addPoints(authorId, 2);
            }
        }
    } catch (error) {
        console.error('Error toggling like:', error);
        throw error;
    }
};

export const addCommentToPost = async (postId: string, comment: any) => {
    const postRef = doc(db, 'posts', postId);
    try {
        await updateDoc(postRef, {
            comments: arrayUnion({
                ...comment,
                id: Math.random().toString(36).substr(2, 9),
                timestamp: new Date().toISOString() // Using string for nested timestamp to avoid Firestore nesting issues sometimes
            }),
            commentsCount: increment(1)
        });
        // Award points for commenting
        if (comment.authorId) {
            await addPoints(comment.authorId, 2);
        }
    } catch (error) {
        console.error('Error adding comment:', error);
        throw error;
    }
};

// ==================== GLOBAL MESSAGES (OLD) ====================

export const subscribeToMessages = (limitNum: number, callback: (messages: any[]) => void) => {
    const messagesRef = collection(db, 'pulso_global');
    const q = query(messagesRef, orderBy('timestamp', 'desc'), limit(limitNum));
    return onSnapshot(q, (snapshot) => {
        const messages = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate() || new Date()
        }));
        callback(messages.reverse());
    }, (error) => handleFirestoreError(error, 'subscribeToMessages'));
};

export const sendMessage = async (message: any) => {
    try {
        const messagesRef = collection(db, 'pulso_global');
        await addDoc(messagesRef, {
            ...message,
            timestamp: serverTimestamp(),
            likes: [],
            likesCount: 0
        });
    } catch (error) {
        console.error('Error sending message:', error);
        throw error;
    }
};

export const toggleLikeGlobalMessage = async (messageId: string, userId: string, isLiked: boolean) => {
    const msgRef = doc(db, 'pulso_global', messageId);
    try {
        if (isLiked) {
            await updateDoc(msgRef, {
                likes: arrayRemove(userId),
                likesCount: increment(-1)
            });
        } else {
            await updateDoc(msgRef, {
                likes: arrayUnion(userId),
                likesCount: increment(1)
            });
        }
    } catch (error) {
        console.error('Error toggling like on global message:', error);
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
    }, (error) => handleFirestoreError(error, 'subscribeToChatRooms'));
};

export const sendRoomMessage = async (roomId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> => {
    try {
        const messagesRef = collection(db, `chatRooms/${roomId}/messages`);
        const docRef = await addDoc(messagesRef, {
            ...message,
            timestamp: serverTimestamp(),
            likes: [],
            likesCount: 0
        });

        const roomRef = doc(db, 'chatRooms', roomId);
        const prefix = message.isBusinessMessage ? '🏪 ' : '👤 ';
        
        // Fetch room to get participants and update unread counts
        const roomSnap = await getDoc(roomRef);
        const unreadUpdates: Record<string, any> = {};
        
        if (roomSnap.exists()) {
            const data = roomSnap.data();
            const participants = data.participants || [];
            participants.forEach((pId: string) => {
                if (pId !== message.senderId) {
                    unreadUpdates[`unreadCounts.${pId}`] = increment(1);
                }
            });
        }
        
        await updateDoc(roomRef, {
            lastMessage: `${prefix}${message.senderName}: ${message.text}`,
            lastMessageTime: serverTimestamp(),
            ...unreadUpdates
        });
        
        return docRef.id;
    } catch (error) {
        console.error('Error sending room message:', error);
        throw error;
    }
};

export const markRoomAsRead = async (roomId: string, userId: string): Promise<void> => {
    try {
        const roomRef = doc(db, 'chatRooms', roomId);
        await updateDoc(roomRef, {
            [`unreadCounts.${userId}`]: 0
        });
    } catch (error) {
        console.error('Error marking room as read:', error);
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
    }, (error) => handleFirestoreError(error, 'subscribeToRoomMessages'));
};

/**
 * Auto-delete messages to keep a history of up to 120 messages in a chat room.
 * Called client-side when a user opens a room (Spark plan — no Cloud Functions).
 */
export const deleteOldRoomMessages = async (roomId: string): Promise<void> => {
    try {
        const messagesRef = collection(db, `chatRooms/${roomId}/messages`);
        const q = query(messagesRef, orderBy('timestamp', 'asc'), limit(300));
        const snapshot = await getDocs(q);
        
        if (snapshot.size > 120) {
            const messagesToDelete = snapshot.size - 120;
            const docsToDelete = snapshot.docs.slice(0, messagesToDelete);
            const deletes = docsToDelete.map(d => deleteDoc(d.ref));
            await Promise.all(deletes);
            console.log(`[AutoClean] Deleted ${messagesToDelete} old messages from room ${roomId}`);
        }
    } catch (error) {
        // Non-critical — silently fail so it doesn't break the chat experience
        console.warn('[AutoClean] Could not delete old messages:', error);
    }
};

/**
 * Clear all messages in a chat room.
 * Warning: This is a destructive action for all participants in this room.
 */
export const clearRoomMessages = async (roomId: string): Promise<void> => {
    try {
        const messagesRef = collection(db, `chatRooms/${roomId}/messages`);
        const snapshot = await getDocs(messagesRef);
        
        // Use batches if there are many messages, but for mobile usually not many
        const deletes = snapshot.docs.map(d => deleteDoc(d.ref));
        await Promise.all(deletes);
        
        // Reset last message in room doc
        const roomRef = doc(db, 'chatRooms', roomId);
        await updateDoc(roomRef, {
            lastMessage: 'Chat vaciado',
            lastMessageTime: serverTimestamp()
        });
    } catch (error) {
        console.error('Error clearing room messages:', error);
        throw error;
    }
};

export const toggleLikeRoomMessage = async (roomId: string, messageId: string, userId: string, isLiked: boolean) => {
    const msgRef = doc(db, `chatRooms/${roomId}/messages`, messageId);
    try {
        if (isLiked) {
            await updateDoc(msgRef, {
                likes: arrayRemove(userId),
                likesCount: increment(-1)
            });
        } else {
            await updateDoc(msgRef, {
                likes: arrayUnion(userId),
                likesCount: increment(1)
            });
        }
    } catch (error) {
        console.error('Error toggling like on room message:', error);
        throw error;
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
export const deleteGlobalMessage = async (messageId: string) => {
    try {
        const messageRef = doc(db, 'pulso_global', messageId);
        await deleteDoc(messageRef);
    } catch (error) {
        console.error('Error deleting global message:', error);
        throw error;
    }
};

// ==================== FCM TOKENS ====================

/**
 * Saves an FCM token to the user document for push notifications.
 * @param userId The ID of the authenticated user
 * @param token The FCM token generated by Firebase Messaging
 */
export const saveFCMToken = async (userId: string, token: string) => {
    try {
        const userRef = doc(db, 'users_v2', userId);
        const userSnap = await getDoc(userRef);
        
        if (userSnap.exists()) {
            const data = userSnap.data();
            const tokens = data.fcmTokens || [];
            
            if (!tokens.includes(token)) {
                await updateDoc(userRef, {
                    fcmTokens: [...tokens, token],
                    updatedAt: serverTimestamp()
                });
            }
        }
    } catch (error) {
        console.error('Error saving FCM token:', error);
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
    hasBeach: boolean;
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

export const subscribeToCustomLocalities = (callback: (localities: CustomLocality[]) => void) => {
    const localitiesRef = collection(db, 'customLocalities');
    return onSnapshot(localitiesRef, (snapshot) => {
        const localities = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        })) as CustomLocality[];
        callback(localities);
    }, (error) => handleFirestoreError(error, 'subscribeToCustomLocalities'));
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

export const incrementPulseCount = async (amount: number = 1) => {
    try {
        const pulseRef = doc(db, 'metrics', 'pulse');
        await setDoc(pulseRef, {
            activity: increment(amount)
        }, { merge: true });
    } catch (error) {
        console.error('Error incrementing pulse count:', error);
    }
};

// ==================== NOTIFICATIONS ====================

export const createNotification = async (notification: Omit<PulseNotification, 'id' | 'createdAt' | 'read'>) => {
    try {
        const notificationRef = collection(db, 'notifications');
        const sanitized = sanitizeData(notification);
        await addDoc(notificationRef, {
            ...sanitized,
            createdAt: serverTimestamp(),
            read: false,
            timestamp: serverTimestamp() // Compatibility
        });
    } catch (error) {
        console.error('Error creating notification:', error);
        throw error;
    }
};

export const subscribeToNotifications = (userId: string, callback: (notifications: PulseNotification[]) => void) => {
    const notificationRef = collection(db, 'notifications');
    // AUMENTADO: De 100 a 500 notificaciones
    const q = query(
        notificationRef, 
        where('userId', '==', userId), 
        limit(500)
    );
    return onSnapshot(q, (snapshot) => {
        const notifications = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate() || new Date()
        })).sort((a, b) => b.createdAt - a.createdAt) as PulseNotification[];
        callback(notifications);
    }, (error) => handleFirestoreError(error, 'subscribeToNotifications'));
};

export const markNotificationRead = async (notificationId: string) => {
    try {
        const notificationRef = doc(db, 'notifications', notificationId);
        await updateDoc(notificationRef, { read: true });
    } catch (error) {
        console.error('Error marking notification read:', error);
    }
};

// ==================== ANNOUNCEMENTS ====================

export const createAnnouncement = async (announcement: Omit<Announcement, 'id' | 'timestamp'>) => {
    try {
        const announcementsRef = collection(db, 'announcements');
        
        // Calculate expiration
        const expiresAt = new Date();
        if (announcement.type === 'ventas' || announcement.type === 'offer') {
            // Oferta: 7 days
            expiresAt.setDate(expiresAt.getDate() + 7);
        } else if (announcement.type === 'urgente' || announcement.type === 'system' || announcement.type === 'alert') {
            // Alerta & Sistema: 24 hours
            expiresAt.setDate(expiresAt.getDate() + 1);
        } else if (announcement.type === 'evento') {
            // Evento: 72 hours (3 days)
            expiresAt.setDate(expiresAt.getDate() + 3);
        } else {
            // Default: 24 hours (as per user request "todos los mensajes se borrarán automaticamente")
            expiresAt.setDate(expiresAt.getDate() + 1);
        }

        await addDoc(announcementsRef, {
            ...sanitizeData(announcement),
            timestamp: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt)
        });
    } catch (error) {
        console.error('Error creating announcement:', error);
        throw error;
    }
};

export const subscribeToAnnouncements = (senderId: string, callback: (announcements: Announcement[]) => void) => {
    const announcementsRef = collection(db, 'announcements');
    // Show all announcements - own + ones sent to "all" (mass broadcasts)
    // We get all and filter client-side for "all" target OR own senderId
    const q = query(announcementsRef, orderBy('timestamp', 'desc'));
    return onSnapshot(q, (snapshot) => {
        const announcements = snapshot.docs.map(doc => {
            const data = doc.data();
            const expiresAt = data.expiresAt?.toDate();
            return {
                id: doc.id,
                ...data,
                timestamp: data.timestamp?.toDate() || new Date(),
                expiresAt
            };
        }).filter(a => {
            const isVisible = a.target === 'all' || a.senderId === senderId;
            const isNotExpired = !a.expiresAt || a.expiresAt > new Date();
            return isVisible && isNotExpired;
        }) as Announcement[];
        callback(announcements);
    }, (error) => handleFirestoreError(error, 'subscribeToAnnouncements'));
};

export const deleteAnnouncement = async (announcementId: string, roomMessages?: { roomId: string, messageId: string }[]) => {
    try {
        // 1. Delete the announcement record
        const annRef = doc(db, 'announcements', announcementId);
        await deleteDoc(annRef);

        // 2. If it has tracked messages, delete them from chat rooms
        if (roomMessages && roomMessages.length > 0) {
            const promises = roomMessages.map(item => 
                deleteDoc(doc(db, `chatRooms/${item.roomId}/messages`, item.messageId))
            );
            // Non-blocking but we wait for them to finish for the overall operation
            await Promise.allSettled(promises);
        }
    } catch (error) {
        console.error('Error deleting announcement:', error);
        throw error;
    }
};

// ==================== BOOSTS ====================

export const purchaseBoost = async (businessId: string, userId: string, points: number, durationHours: number = 24) => {
    try {
        // 1. Deduct points from user
        const userRef = doc(db, 'users_v2', userId);
        await updateDoc(userRef, {
            points: increment(-points)
        });

        // 2. Create boost document
        const boostsRef = collection(db, 'boosts');
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + durationHours);

        await addDoc(boostsRef, {
            businessId,
            userId,
            type: 'community_boost',
            createdAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
            status: 'active'
        });

        return true;
    } catch (error) {
        console.error('Error purchasing boost:', error);
        throw error;
    }
};

export const subscribeToActiveBoosts = (businessId: string, callback: (boosts: any[]) => void) => {
    const now = new Date();
    const boostsRef = collection(db, 'boosts');
    const q = query(
        boostsRef,
        where('businessId', '==', businessId),
        where('status', '==', 'active'),
        where('expiresAt', '>', Timestamp.fromDate(now))
    );

    return onSnapshot(q, (snapshot) => {
        const boosts = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            expiresAt: doc.data().expiresAt?.toDate() || new Date()
        }));
        callback(boosts);
    });
};
