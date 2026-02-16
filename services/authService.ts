import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    signOut,
    onAuthStateChanged,
    User
} from 'firebase/auth';
import { auth } from '../firebase.config';
import { createUser } from './firestoreService';
import { Vibe, SubscriptionPlan } from '../types';

// Super admin email - ONLY this email has full admin access
const SUPER_ADMIN_EMAIL = 'pruebasyaprendizaje0@gmail.com';

export type UserRole = 'visitor' | 'host' | 'admin';

export const isSuperAdmin = (email: string | null | undefined): boolean => {
    return email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase();
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
    role: 'visitor' | 'host',
    avatarUrl?: string
) => {
    try {
        // Create Firebase Auth account
        const result = await createUserWithEmailAndPassword(auth, email, password);

        // Create user profile in Firestore
        await createUser(result.user.uid, {
            name,
            email,
            role,
            preferredVibe: Vibe.RELAX,
            avatarUrl: avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0ea5e9&color=fff&size=200`,
            plan: SubscriptionPlan.VISITOR
        });

        return result.user;
    } catch (error: any) {
        console.error('Registration error:', error);
        throw error;
    }
};

import { updateProfile } from 'firebase/auth';

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
