import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User,
    updateProfile,
    sendEmailVerification
} from 'firebase/auth';
import { auth } from '../firebase.config';
import { createUser } from './firestoreService';
import { Vibe, SubscriptionPlan } from '../types';
import { uploadBase64Image } from './storageService';

// Super admin emails - ONLY these emails have full admin access
const SUPER_ADMIN_EMAILS = [
    'pruebasyaprendizaje0@gmail.com',
    'fhernandezcalle@gmail.com',
    'ubicameinformacion@gmail.com'
];

export type UserRole = 'visitor' | 'host' | 'admin';

export const isSuperAdmin = (email: string | null | undefined): boolean => {
    if (!email) return false;
    return SUPER_ADMIN_EMAILS.some(adminEmail => adminEmail.toLowerCase() === email.toLowerCase());
};

export const getUserRole = (email: string | null | undefined): UserRole => {
    return 'visitor'; // Default to visitor, real role comes from Firestore
};

export const loginWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider();
        const result = await signInWithPopup(auth, provider);
        return result.user;
    } catch (error: any) {
        console.error('Login error:', error);
        throw error;
    }
};

export const loginWithEmail = async (email: string, password: string) => {
    try {
        const result = await signInWithEmailAndPassword(auth, email, password);
        return result.user;
    } catch (error: any) {
        console.error('Login error:', error);
        throw error;
    }
};

export const registerWithEmail = async (
    email: string,
    password: string,
    name: string,
    surname: string,
    role: 'visitor' | 'host',
    avatarUrl?: string
) => {
    try {
        // Create Firebase Auth account
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // Send email verification immediately
        try {
            await sendEmailVerification(result.user);
        } catch (verificationError) {
            console.error('Error sending email verification:', verificationError);
        }

        // Upload avatar to Storage if it's base64
        let finalAvatarUrl = avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff&size=200`;
        
        if (avatarUrl && avatarUrl.startsWith('data:image')) {
            try {
                const storagePath = `avatars/${result.user.uid}_${Date.now()}.jpg`;
                finalAvatarUrl = await uploadBase64Image(storagePath, avatarUrl);
            } catch (uploadError) {
                console.error('Error uploading avatar during registration:', uploadError);
                // Fallback to default avatar if upload fails
                finalAvatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff&size=200`;
            }
        }

        // Create user profile in Firestore
        await createUser(result.user.uid, {
            name,
            surname,
            email,
            role,
            preferredVibe: Vibe.RELAX,
            avatarUrl: finalAvatarUrl,
            plan: SubscriptionPlan.FREE,
            acceptedTerms: true
        });

        return result.user;
    } catch (error: any) {
        console.error('Registration error:', error);
        throw error;
    }
};


export const updateUserProfile = async (user: User, displayName?: string, photoURL?: string) => {
    try {
        await updateProfile(user, {
            displayName: displayName || user.displayName,
            photoURL: photoURL || user.photoURL
        });
    } catch (error) {
        console.error('Error updating auth profile:', error);
        // Don't throw, just log. Firestore is primary.
    }
};

export const logout = async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Logout error:', error);
        throw error;
    }
};

export const subscribeToAuthChanges = (callback: (user: User | null) => void) => {
    return onAuthStateChanged(auth, (user) => {
        callback(user);
    });
};

export const getAuthToken = async (): Promise<string | null> => {
    if (!auth.currentUser) return null;
    try {
        return await auth.currentUser.getIdToken();
    } catch (e) {
        console.error('Error fetching auth token:', e);
        return null;
    }
};

export const getAuthorizedHeaders = async (extraHeaders: Record<string, string> = {}): Promise<Record<string, string>> => {
    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...extraHeaders
    };
    const token = await getAuthToken();
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
};
