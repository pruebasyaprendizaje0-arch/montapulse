import {
    collection, doc, addDoc, updateDoc, deleteDoc, getDocs, getDoc,
    query, where, onSnapshot, serverTimestamp, Timestamp, increment, orderBy, writeBatch
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { Coupon, CouponRedemption, Business } from '../types';
import { getBusinessFollowers, createNotification, getBusinessById } from './firestoreService';

// ==================== HELPERS ====================

const sanitizeData = (data: any): any => {
    if (data === undefined) return null;
    if (Array.isArray(data)) return data.map(item => sanitizeData(item));
    if (data !== null && typeof data === 'object' && !(data instanceof Date) && !(data instanceof Timestamp)) {
        return Object.fromEntries(
            Object.entries(data).map(([k, v]) => [k, v === undefined ? null : sanitizeData(v)])
        );
    }
    return data;
};

/**
 * Haversine distance in meters between two [lat, lng] coordinates
 */
const haversineDistance = (coord1: [number, number], coord2: [number, number]): number => {
    const R = 6371000; // Earth radius in meters
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(coord2[0] - coord1[0]);
    const dLng = toRad(coord2[1] - coord1[1]);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(coord1[0])) * Math.cos(toRad(coord2[0])) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

/**
 * Generate a random coupon code (6 chars uppercase alphanumeric)
 */
export const generateCouponCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded I,O,0,1 to avoid confusion
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
};

// ==================== SUBSCRIPTIONS ====================

/**
 * Subscribe to all coupons for a specific business (real-time)
 */
export const subscribeToBusinessCoupons = (businessId: string, callback: (coupons: Coupon[]) => void) => {
    const q = query(
        collection(db, 'coupons'),
        where('businessId', '==', businessId)
    );
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : doc.data().createdAt
        } as Coupon));
        
        // Memory sort instead of Firestore Index
        items.sort((a, b) => {
            const dateA = a.createdAt?.getTime ? a.createdAt.getTime() : 0;
            const dateB = b.createdAt?.getTime ? b.createdAt.getTime() : 0;
            return dateB - dateA;
        });
        
        callback(items);
    }, (error) => {
        console.error('Error subscribing to coupons:', error);
        callback([]);
    });
};

/**
 * Subscribe to all active, non-expired public coupons (for client view)
 */
export const subscribeToPublicCoupons = (callback: (coupons: Coupon[]) => void) => {
    const q = query(
        collection(db, 'coupons'),
        where('isActive', '==', true)
    );
    return onSnapshot(q, (snapshot) => {
        const now = new Date();
        const items = snapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() } as Coupon))
            .filter(c => {
                const expiresAt = c.expiresAt?.toDate ? c.expiresAt.toDate() : new Date(c.expiresAt);
                return expiresAt > now;
            })
            .filter(c => c.maxUses === 0 || c.currentUses < c.maxUses);
        callback(items);
    }, (error) => {
        console.error('Error subscribing to public coupons:', error);
        callback([]);
    });
};

/**
 * Subscribe to redemptions for a specific business
 */
export const subscribeToCouponRedemptions = (businessId: string, callback: (redemptions: CouponRedemption[]) => void) => {
    const q = query(
        collection(db, 'couponRedemptions'),
        where('businessId', '==', businessId)
    );
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            reservedAt: doc.data().reservedAt?.toDate ? doc.data().reservedAt.toDate() : doc.data().reservedAt,
            expiresAt: doc.data().expiresAt?.toDate ? doc.data().expiresAt.toDate() : doc.data().expiresAt,
            redeemedAt: doc.data().redeemedAt?.toDate ? doc.data().redeemedAt.toDate() : doc.data().redeemedAt
        } as CouponRedemption));

        // Memory sort instead of Firestore Index
        items.sort((a, b) => {
            const dateA = a.redeemedAt?.getTime ? a.redeemedAt.getTime() : 0;
            const dateB = b.redeemedAt?.getTime ? b.redeemedAt.getTime() : 0;
            return dateB - dateA;
        });

        callback(items);
    }, (error) => {
        console.error('Error subscribing to coupon redemptions:', error);
        callback([]);
    });
};

/**
 * Subscribe to redemptions for a specific user (Wallet)
 */
export const subscribeToUserWallet = (userId: string, callback: (redemptions: CouponRedemption[]) => void) => {
    // Cleanup first (one-time)
    cleanupExpiredRedemptions(userId);

    const q = query(
        collection(db, 'couponRedemptions'),
        where('userId', '==', userId)
    );
    return onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ 
            id: doc.id, 
            ...doc.data(),
            reservedAt: doc.data().reservedAt?.toDate ? doc.data().reservedAt.toDate() : doc.data().reservedAt,
            expiresAt: doc.data().expiresAt?.toDate ? doc.data().expiresAt.toDate() : doc.data().expiresAt,
            redeemedAt: doc.data().redeemedAt?.toDate ? doc.data().redeemedAt.toDate() : doc.data().redeemedAt
        } as CouponRedemption));

        // Memory sort instead of Firestore Index
        items.sort((a, b) => {
            const dateA = a.reservedAt?.getTime ? a.reservedAt.getTime() : 0;
            const dateB = b.reservedAt?.getTime ? b.reservedAt.getTime() : 0;
            return dateB - dateA;
        });

        callback(items);
    }, (error) => {
        console.error('Error subscribing to user wallet:', error);
        callback([]);
    });
};

// ==================== CRUD ====================

/**
 * Create a new coupon
 */
export const createCoupon = async (data: Omit<Coupon, 'id' | 'createdAt' | 'currentUses'>): Promise<string> => {
    try {
        // Check for duplicate code
        const existing = await getDocs(
            query(collection(db, 'coupons'), where('code', '==', data.code.toUpperCase()))
        );
        if (!existing.empty) {
            throw new Error('DUPLICATE_CODE');
        }

        const colRef = collection(db, 'coupons');
        const docRef = await addDoc(colRef, {
            ...sanitizeData(data),
            code: data.code.toUpperCase().trim(),
            currentUses: 0,
            createdAt: serverTimestamp(),
        });

        // Async: Notify followers
        try {
            const followers = await getBusinessFollowers(data.businessId);
            if (followers.length > 0) {
                const business = await getBusinessById(data.businessId);
                const businessName = business?.name || 'Un negocio';
                
                const notificationPromises = followers.map(followerId => 
                    createNotification({
                        userId: followerId,
                        title: '🎁 ¡Nuevo Cupón Disponible!',
                        message: `${businessName} ha publicado un nuevo cupón: "${data.code.toUpperCase()}". ¡Aprovéchalo antes de que se agote!`,
                        type: 'coupon',
                        businessId: data.businessId,
                        imageUrl: business?.imageUrl || ''
                    })
                );
                await Promise.all(notificationPromises);
            }
        } catch (notifError) {
            console.error('Error sending coupon notifications:', notifError);
        }

        return docRef.id;
    } catch (error: any) {
        console.error('Error creating coupon:', error);
        throw error;
    }
};

/**
 * Update an existing coupon
 */
export const updateCoupon = async (id: string, data: Partial<Coupon>): Promise<void> => {
    try {
        const docRef = doc(db, 'coupons', id);
        const cleanData = sanitizeData(data);
        delete cleanData.id;
        delete cleanData.createdAt;
        await updateDoc(docRef, {
            ...cleanData,
            updatedAt: serverTimestamp(),
        });
    } catch (error) {
        console.error('Error updating coupon:', error);
        throw error;
    }
};

/**
 * Delete a coupon
 */
export const deleteCoupon = async (id: string): Promise<void> => {
    try {
        await deleteDoc(doc(db, 'coupons', id));
    } catch (error) {
        console.error('Error deleting coupon:', error);
        throw error;
    }
};

// ==================== VALIDATION & REDEMPTION ====================

export interface CouponValidationResult {
    valid: boolean;
    coupon?: Coupon;
    error?: 'NOT_FOUND' | 'INACTIVE' | 'EXPIRED' | 'MAX_USES_REACHED' | 'ALREADY_REDEEMED' | 'TOO_FAR' | 'MIN_PURCHASE';
    errorMessage?: string;
    distance?: number;
}

/**
 * Validate a coupon code with full business logic
 */
export const validateCoupon = async (
    code: string,
    userId: string,
    userCoords?: [number, number],
    purchaseAmount?: number
): Promise<CouponValidationResult> => {
    try {
        // 1. Find coupon by code
        const couponQuery = query(
            collection(db, 'coupons'),
            where('code', '==', code.toUpperCase().trim())
        );
        const couponSnap = await getDocs(couponQuery);

        if (couponSnap.empty) {
            return { valid: false, error: 'NOT_FOUND', errorMessage: 'Cupón no encontrado' };
        }

        const couponDoc = couponSnap.docs[0];
        const coupon = { id: couponDoc.id, ...couponDoc.data() } as Coupon;

        // 2. Check active status
        if (!coupon.isActive) {
            return { valid: false, coupon, error: 'INACTIVE', errorMessage: 'Este cupón está desactivado' };
        }

        // 3. Check expiration
        const expiresAt = coupon.expiresAt?.toDate ? coupon.expiresAt.toDate() : new Date(coupon.expiresAt);
        if (expiresAt <= new Date()) {
            return { valid: false, coupon, error: 'EXPIRED', errorMessage: 'Este cupón ha expirado' };
        }

        // 4. Check max uses
        if (coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses) {
            return { valid: false, coupon, error: 'MAX_USES_REACHED', errorMessage: 'Este cupón ha alcanzado su límite de usos' };
        }

        // 5. Check single-use per user
        const redemptionQuery = query(
            collection(db, 'couponRedemptions'),
            where('couponId', '==', coupon.id),
            where('userId', '==', userId)
        );
        const redemptionSnap = await getDocs(redemptionQuery);
        if (!redemptionSnap.empty) {
            return { valid: false, coupon, error: 'ALREADY_REDEEMED', errorMessage: 'Ya canjeaste este cupón' };
        }

        // 6. Check minimum purchase
        if (coupon.minPurchase > 0 && purchaseAmount !== undefined && purchaseAmount < coupon.minPurchase) {
            return { valid: false, coupon, error: 'MIN_PURCHASE', errorMessage: `Compra mínima de $${coupon.minPurchase} requerida` };
        }

        // 7. Check geofence proximity
        if (coupon.requiresProximity && userCoords) {
            // Get business coordinates
            const bizDoc = await getDoc(doc(db, 'businesses', coupon.businessId));
            if (bizDoc.exists()) {
                const biz = bizDoc.data() as Business;
                if (biz.coordinates) {
                    const distance = haversineDistance(userCoords, biz.coordinates);
                    if (distance > (coupon.proximityRadius || 500)) {
                        return {
                            valid: false,
                            coupon,
                            error: 'TOO_FAR',
                            errorMessage: `Debes estar a menos de ${coupon.proximityRadius || 500}m del negocio`,
                            distance: Math.round(distance)
                        };
                    }
                }
            }
        }

        return { valid: true, coupon };
    } catch (error) {
        console.error('Error validating coupon:', error);
        return { valid: false, error: 'NOT_FOUND', errorMessage: 'Error al validar el cupón' };
    }
};

/**
 * Generate a unique reservation code for a user (e.g., MT-X4Y2)
 */
const generateReservationCode = (): string => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return `MT-${code}`;
};

/**
 * Step 1: Obtain/Reserve a coupon (for Clients)
 * Verifies availability and creates a 'reserved' redemption record
 */
export const obtainCoupon = async (
    couponId: string,
    couponCode: string,
    userId: string,
    userName: string,
    businessId: string
): Promise<{ success: boolean; error?: string; reservationCode?: string }> => {
    try {
        // 1. Basic validation (limits, expiry, etc)
        const validation = await validateCoupon(couponCode, userId);
        if (!validation.valid) {
            return { success: false, error: validation.errorMessage };
        }

        // 2. Check if user already has an active reservation for THIS coupon
        const q = query(
            collection(db, 'couponRedemptions'),
            where('userId', '==', userId),
            where('couponId', '==', couponId),
            where('status', '==', 'reserved')
        );
        const existing = await getDocs(q);
        if (!existing.empty) {
            return { success: false, error: 'Ya tienes una reserva activa para este cupón' };
        }

        // 3. Create the reservation record
        const reservationCode = generateReservationCode();
        const expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + 24); // Default 24h limit

        const business = await getBusinessById(businessId);

        await addDoc(collection(db, 'couponRedemptions'), {
            couponId,
            couponCode: couponCode.toUpperCase(),
            couponValue: validation.coupon?.value || 0,
            couponType: validation.coupon?.type || 'percentage',
            userId,
            userName: userName || 'Cliente',
            businessId,
            businessName: business?.name || 'Negocio',
            businessLogo: business?.imageUrl || '',
            status: 'reserved',
            reservationCode,
            reservedAt: serverTimestamp(),
            expiresAt: Timestamp.fromDate(expiresAt),
        });

        // Notify business owner
        try {
            if (business?.ownerId) {
                await createNotification({
                    userId: business.ownerId,
                    title: '🎫 ¡Nueva Reserva de Cupón!',
                    message: `${userName || 'Un cliente'} ha reservado el cupón "${couponCode.toUpperCase()}".`,
                    type: 'offer',
                    businessId: businessId,
                    metadata: { couponId, reservationCode }
                });
            }
        } catch (notifError) {
            console.error('Error notifying business of coupon reservation:', notifError);
        }

        return { success: true, reservationCode };
    } catch (error) {
        console.error('Error obtaining coupon:', error);
        return { success: false, error: 'Error al obtener el cupón' };
    }
};

/**
 * Step 2: Confirm/Burn a coupon (for Businesses)
 * Validates the unique reservation code and increments the usage counter
 */
export const confirmRedemption = async (
    reservationCode: string,
    businessId: string,
    validatedBy: string
): Promise<{ success: boolean; error?: string; couponData?: any; redemptionData?: CouponRedemption }> => {
    try {
        // 1. Find the reservation
        const q = query(
            collection(db, 'couponRedemptions'),
            where('reservationCode', '==', reservationCode.toUpperCase()),
            where('businessId', '==', businessId),
            where('status', '==', 'reserved')
        );
        
        const snap = await getDocs(q);
        if (snap.empty) {
            return { success: false, error: 'Código inválido, ya usado o no pertenece a este negocio' };
        }

        const redemptionDoc = snap.docs[0];
        const redemptionData = redemptionDoc.data() as CouponRedemption;

        // 2. Check expiration
        const now = new Date();
        if (redemptionData.expiresAt?.toDate() < now) {
            await updateDoc(redemptionDoc.ref, { status: 'expired' });
            return { success: false, error: 'Este cupón ha expirado' };
        }

        // 3. Atomic Update: Burn the coupon and increment usage
        const couponRef = doc(db, 'coupons', redemptionData.couponId);
        
        // We use a batch or transaction to ensure atomicity
        const batch = writeBatch(db);
        
        // Increment usage
        batch.update(couponRef, {
            currentUses: increment(1),
            updatedAt: serverTimestamp(),
        });

        // Mark as redeemed
        batch.update(redemptionDoc.ref, {
            status: 'redeemed',
            redeemedAt: serverTimestamp(),
            validatedBy
        });

        await batch.commit();
        
        return { success: true, redemptionData };
    } catch (error) {
        console.error('Error confirming redemption:', error);
        return { success: false, error: 'Error técnico al procesar el canje' };
    }
};

/**
 * Cleanup expired reservations (reserved -> expired)
 */
export const cleanupExpiredRedemptions = async (userId?: string, businessId?: string): Promise<number> => {
    try {
        let q = query(
            collection(db, 'couponRedemptions'),
            where('status', '==', 'reserved'),
            where('expiresAt', '<=', Timestamp.now())
        );

        if (userId) q = query(q, where('userId', '==', userId));
        if (businessId) q = query(q, where('businessId', '==', businessId));

        const snap = await getDocs(q);
        if (snap.empty) return 0;

        const batch = writeBatch(db);
        snap.docs.forEach(doc => {
            batch.update(doc.ref, { status: 'expired' });
        });

        await batch.commit();
        return snap.size;
    } catch (error) {
        console.error('Error cleaning up expired redemptions:', error);
        return 0;
    }
};

/**
 * Get all redemptions (Wallet) for a user
 */
export const getUserWallet = async (userId: string): Promise<CouponRedemption[]> => {
    try {
        // Cleanup first
        await cleanupExpiredRedemptions(userId);

        const q = query(
            collection(db, 'couponRedemptions'),
            where('userId', '==', userId),
            orderBy('reservedAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ 
            id: d.id, 
            ...d.data(),
            reservedAt: d.data().reservedAt?.toDate ? d.data().reservedAt.toDate() : d.data().reservedAt,
            expiresAt: d.data().expiresAt?.toDate ? d.data().expiresAt.toDate() : d.data().expiresAt,
            redeemedAt: d.data().redeemedAt?.toDate ? d.data().redeemedAt.toDate() : d.data().redeemedAt
        } as CouponRedemption));
    } catch (error) {
        console.error('Error getting user wallet:', error);
        return [];
    }
};

/**
 * Get redemption history for a specific coupon (Admin/Business view)
 */
export const getCouponRedemptions = async (couponId: string): Promise<CouponRedemption[]> => {
    try {
        const q = query(
            collection(db, 'couponRedemptions'),
            where('couponId', '==', couponId),
            orderBy('reservedAt', 'desc')
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ id: d.id, ...d.data() } as CouponRedemption));
    } catch (error) {
        console.error('Error getting coupon redemptions:', error);
        return [];
    }
};
