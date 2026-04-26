import { 
  doc, 
  getDoc, 
  updateDoc, 
  increment,
  Firestore,
  collection,
  query,
  where,
  getCountFromServer
} from 'firebase/firestore';
import { db } from '../firebase.config';
import { SubscriptionPlan, UserProfile } from '../types';

// PLAN LIMITS CONFIGURATION
export const PLAN_LIMITS = {
  [SubscriptionPlan.FREE]: {
    maxEvents: 0,
    maxAnnouncements: 0,
    hasPremiumIcon: false,
    canCreateBusiness: true,
    canFollow: true,
    canReview: true,
    canReceiveNotifications: false,
  },
  [SubscriptionPlan.BASIC]: {
    maxEvents: 0,
    maxAnnouncements: 0,
    hasPremiumIcon: false,
    canCreateBusiness: true,
    canFollow: true,
    canReview: true,
    canReceiveNotifications: true,
  },
  [SubscriptionPlan.PREMIUM]: {
    maxEvents: 5,
    maxAnnouncements: 5,
    hasPremiumIcon: true,
    canCreateBusiness: true,
    canFollow: true,
    canReview: true,
    canReceiveNotifications: true,
  },
  [SubscriptionPlan.PRO]: {
    maxEvents: 5,
    maxAnnouncements: 5,
    hasPremiumIcon: true,
    canCreateBusiness: true,
    canFollow: true,
    canReview: true,
    canReceiveNotifications: true,
  },
  [SubscriptionPlan.ELITE]: {
    maxEvents: 10,
    maxAnnouncements: 10,
    hasPremiumIcon: true,
    canCreateBusiness: true,
    canFollow: true,
    canReview: true,
    canReceiveNotifications: true,
  },
  [SubscriptionPlan.EXPERT]: {
    maxEvents: Infinity,
    maxAnnouncements: Infinity,
    hasPremiumIcon: true,
    canCreateBusiness: true,
    canFollow: true,
    canReview: true,
    canReceiveNotifications: true,
  },
} as const;

// ANNIVERSARY PRICES (monthly)
export const PLAN_PRICES: Record<SubscriptionPlan, number> = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.BASIC]: 0,
  [SubscriptionPlan.PREMIUM]: 5, // Legacy - treat as equivalent to Pro
  [SubscriptionPlan.PRO]: 5,
  [SubscriptionPlan.ELITE]: 10,
  [SubscriptionPlan.EXPERT]: 0, // Internal use
};

// CHECK IF USER CAN CREATE EVENT
export const canUserCreateEvent = async (userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  maxAllowed?: number;
}> => {
  const userRef = doc(db, 'users_v2', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return { allowed: false, reason: 'USER_NOT_FOUND' };
  }
  
  const userData = userSnap.data() as UserProfile;
  const plan = userData.plan as SubscriptionPlan;
  
  // Check subscription expiration for paid plans
  if (plan === SubscriptionPlan.PRO || plan === SubscriptionPlan.ELITE) {
    if (!userData.subscriptionEndDate || userData.subscriptionEndDate < Date.now()) {
      return { allowed: false, reason: 'SUBSCRIPTION_EXPIRED' };
    }
  }
  
  const limits = PLAN_LIMITS[plan];
  const maxEvents = limits.maxEvents;
  
  if (maxEvents === 0) {
    return { 
      allowed: false, 
      reason: 'PLAN_DOES_NOT_ALLOW_EVENTS',
      currentCount: 0,
      maxAllowed: 0
    };
  }
  
  if (maxEvents === Infinity) {
    return { allowed: true };
  }
  
  // Check current event count
  const currentCount = userData.monthlyEventCount || 0;
  
  if (currentCount >= maxEvents) {
    return {
      allowed: false,
      reason: 'EVENT_LIMIT_REACHED',
      currentCount,
      maxAllowed: maxEvents
    };
  }
  
  return {
    allowed: true,
    currentCount,
    maxAllowed: maxEvents
  };
};

// CHECK IF USER CAN CREATE ANNOUNCEMENT
export const canUserCreateAnnouncement = async (userId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount?: number;
  maxAllowed?: number;
}> => {
  const userRef = doc(db, 'users_v2', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return { allowed: false, reason: 'USER_NOT_FOUND' };
  }
  
  const userData = userSnap.data() as UserProfile;
  const plan = userData.plan as SubscriptionPlan;
  
  if (plan === SubscriptionPlan.PRO || plan === SubscriptionPlan.ELITE) {
    if (!userData.subscriptionEndDate || userData.subscriptionEndDate < Date.now()) {
      return { allowed: false, reason: 'SUBSCRIPTION_EXPIRED' };
    }
  }
  
  const limits = PLAN_LIMITS[plan];
  const maxAnnouncements = limits.maxAnnouncements;
  
  if (maxAnnouncements === 0) {
    return {
      allowed: false,
      reason: 'PLAN_DOES_NOT_ALLOW_ANNOUNCEMENTS',
      currentCount: 0,
      maxAllowed: 0
    };
  }
  
  if (maxAnnouncements === Infinity) {
    return { allowed: true };
  }
  
  const currentCount = userData.monthlyAnnouncementCount || 0;
  
  if (currentCount >= maxAnnouncements) {
    return {
      allowed: false,
      reason: 'ANNOUNCEMENT_LIMIT_REACHED',
      currentCount,
      maxAllowed: maxAnnouncements
    };
  }
  
  return {
    allowed: true,
    currentCount,
    maxAllowed: maxAnnouncements
  };
};

// INCREMENT EVENT COUNT (with monthly reset logic)
export const incrementUserEventCount = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users_v2', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userSnap.data() as UserProfile;
  const now = Date.now();
  const lastReset = userData.lastEventResetDate || 0;
  
  // Reset if more than 30 days
  if (now - lastReset > 30 * 24 * 60 * 60 * 1000) {
    await updateDoc(userRef, {
      monthlyEventCount: 1,
      lastEventResetDate: now
    });
  } else {
    await updateDoc(userRef, {
      monthlyEventCount: increment(1)
    });
  }
};

// INCREMENT ANNOUNCEMENT COUNT (with monthly reset logic)
export const incrementUserAnnouncementCount = async (userId: string): Promise<void> => {
  const userRef = doc(db, 'users_v2', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    throw new Error('User not found');
  }
  
  const userData = userSnap.data() as UserProfile;
  const now = Date.now();
  const lastReset = userData.lastAnnouncementResetDate || 0;
  
  if (now - lastReset > 30 * 24 * 60 * 60 * 1000) {
    await updateDoc(userRef, {
      monthlyAnnouncementCount: 1,
      lastAnnouncementResetDate: now
    });
  } else {
    await updateDoc(userRef, {
      monthlyAnnouncementCount: increment(1)
    });
  }
};

// GET USER PLAN INFO
export const getUserPlanInfo = async (userId: string) => {
  const userRef = doc(db, 'users_v2', userId);
  const userSnap = await getDoc(userRef);
  
  if (!userSnap.exists()) {
    return null;
  }
  
  const userData = userSnap.data() as UserProfile;
  const plan = userData.plan as SubscriptionPlan;
  const limits = PLAN_LIMITS[plan];
  
  return {
    plan,
    limits,
    monthlyEventCount: userData.monthlyEventCount || 0,
    monthlyAnnouncementCount: userData.monthlyAnnouncementCount || 0,
    subscriptionEndDate: userData.subscriptionEndDate,
    hasPremiumIcon: limits.hasPremiumIcon,
    canUpgrade: plan === SubscriptionPlan.FREE || plan === SubscriptionPlan.BASIC,
    nextPlan: plan === SubscriptionPlan.FREE ? SubscriptionPlan.PRO : 
           plan === SubscriptionPlan.BASIC ? SubscriptionPlan.PRO :
           plan === SubscriptionPlan.PRO ? SubscriptionPlan.ELITE : null,
  };
};

// CHECK PLAN PERMISSIONS
export const hasPlanPermission = (
  plan: SubscriptionPlan, 
  permission: keyof typeof PLAN_LIMITS[keyof typeof PLAN_LIMITS]
): boolean => {
  return PLAN_LIMITS[plan][permission] as unknown as boolean;
};

// GET PLAN DISPLAY INFO
export const getPlanDisplayInfo = (plan: SubscriptionPlan) => {
  const limits = PLAN_LIMITS[plan];
  const price = PLAN_PRICES[plan];
  
  return {
    name: plan,
    price,
    priceDisplay: price === 0 ? 'Gratis' : `$${price}/mes`,
    maxEvents: limits.maxEvents === Infinity ? 'Ilimitados' : limits.maxEvents,
    maxAnnouncements: limits.maxAnnouncements === Infinity ? 'Ilimitados' : limits.maxAnnouncements,
    hasPremiumIcon: limits.hasPremiumIcon,
  };
};

// VALIDATE AND CREATE EVENT
export const validateAndCreateEvent = async (
  eventData: any,
  userId: string,
  userPlan: SubscriptionPlan
): Promise<string> => {
  // Server-side validation
  const canCreate = await canUserCreateEvent(userId);
  
  if (!canCreate.allowed) {
    throw new Error(canCreate.reason || 'Cannot create event');
  }
  
  const { createEvent } = await import('./firestoreService');
  const eventId = await createEvent(eventData, userPlan, true);
  
  // Increment counter
  await incrementUserEventCount(userId);
  
  return eventId;
};

// VALIDATE AND CREATE ANNOUNCEMENT  
export const validateAndCreateAnnouncement = async (
  announcementData: any,
  userId: string,
  userPlan: SubscriptionPlan
): Promise<void> => {
  const canCreate = await canUserCreateAnnouncement(userId);
  
  if (!canCreate.allowed) {
    throw new Error(canCreate.reason || 'Cannot create announcement');
  }
  
  const { createAnnouncement } = await import('./firestoreService');
  await createAnnouncement(announcementData);
  
  await incrementUserAnnouncementCount(userId);
};

// WEBHOOK HANDLER FOR PAYMENT PROCESSING
// This would be called by a Cloud Function in production
export const processPaymentWebhook = async (
  userId: string,
  plan: SubscriptionPlan,
  paymentStatus: 'completed' | 'failed' | 'expired'
): Promise<void> => {
  const userRef = doc(db, 'users_v2', userId);
  
  if (paymentStatus === 'completed') {
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
    
    await updateDoc(userRef, {
      plan,
      subscriptionEndDate: subscriptionEndDate.getTime(),
      paymentStatus: 'active',
      // Reset counters on upgrade
      ...(plan === SubscriptionPlan.PRO || plan === SubscriptionPlan.ELITE ? {
        monthlyEventCount: 0,
        monthlyAnnouncementCount: 0,
        lastEventResetDate: null,
        lastAnnouncementResetDate: null
      } : {})
    });
  } else if (paymentStatus === 'failed') {
    // Add grace period logic here if needed
    await updateDoc(userRef, {
      paymentStatus: 'pending'
    });
  } else if (paymentStatus === 'expired') {
    // Downgrade to Free
    await updateDoc(userRef, {
      plan: SubscriptionPlan.FREE,
      paymentStatus: 'expired'
    });
  }
};

// DELETE EVENT AND DECREMENT COUNT
export const deleteEventWithCountDecrement = async (
  eventId: string,
  userId: string
): Promise<void> => {
  const { deleteEvent } = await import('./firestoreService');
  await deleteEvent(eventId);
  
  const userRef = doc(db, 'users_v2', userId);
  await updateDoc(userRef, {
    monthlyEventCount: increment(-1)
  });
};