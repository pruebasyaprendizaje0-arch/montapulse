import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from 'firebase/auth';
import { UserProfile, Vibe, SubscriptionPlan } from '../types';
import { useAuth } from '../hooks/useAuth';
import { getUser, createUser, getBusinessByEmail, updateUser } from '../services/firestoreService';
import { isSuperAdmin, logout as firebaseLogout } from '../services/authService';

interface AuthContextType {
    user: UserProfile | null;
    authUser: User | null;
    isAdmin: boolean;
    isSuperAdmin: boolean;
    isSuperUser: boolean;
    toggleSuperUser: () => void;
    userRole: string;
    loading: boolean;
    logout: () => Promise<void>;
    setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { user: authUser, loading: authLoading, isAdmin: isAuthAdmin, userRole: authUserRole } = useAuth();
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [isSuperUser, setIsSuperUser] = useState(() => {
        return localStorage.getItem('montapulse_superuser') === 'true';
    });

    const toggleSuperUser = () => {
        setIsSuperUser(prev => {
            const next = !prev;
            localStorage.setItem('montapulse_superuser', String(next));
            return next;
        });
    };

    useEffect(() => {
        const syncUserProfile = async () => {
            // If auth is still loading, wait
            if (authLoading) return;

            // If no auth user, clear profile and stop loading
            if (!authUser) {
                setUser(null);
                setLoading(false);
                setIsSuperUser(false);
                localStorage.removeItem('montapulse_superuser');
                return;
            }

            try {
                const profile = await getUser(authUser.uid);
                if (profile) {
                    // STRICT SECURITY CHECK
                    const isMaster = isSuperAdmin(authUser.email);
                    let secureRole = authUserRole;

                    if (!isMaster && (profile.role === 'admin' || authUserRole === 'admin')) {
                        console.warn(`Security Alert: User ${authUser.email} attempted to be admin but is unauthorized. Downgrading to visitor.`);
                        secureRole = 'visitor';
                    } else if (isMaster) {
                        secureRole = 'admin';
                    }

                    const profileUpdates: Partial<UserProfile> = {};
                    let hasUpdates = false;

                    // Automatically associate business by email if not assigned
                    if (!profile.businessId && authUser.email && secureRole !== 'admin') {
                        const matchingBusiness = await getBusinessByEmail(authUser.email);
                        if (matchingBusiness) {
                            profileUpdates.businessId = matchingBusiness.id;
                            secureRole = 'host';
                            hasUpdates = true;
                        }
                    }

                    if (profile.role !== secureRole) {
                        profileUpdates.role = secureRole as any;
                        hasUpdates = true;
                    }

                    if (hasUpdates) {
                        await updateUser(authUser.uid, profileUpdates);
                    }

                    setUser({
                        ...profile,
                        ...profileUpdates,
                        role: secureRole as any
                    });
                } else {
                    // If no profile exists, create a default one
                    const isMaster = isSuperAdmin(authUser.email);
                    let defaultRole = isMaster ? 'admin' : (isAuthAdmin ? 'admin' : 'visitor');
                    let assignedBusinessId: string | undefined = undefined;

                    if (!isMaster && authUser.email) {
                        const matchingBusiness = await getBusinessByEmail(authUser.email);
                        if (matchingBusiness) {
                            assignedBusinessId = matchingBusiness.id;
                            defaultRole = 'host';
                        }
                    }

                    const newUser: UserProfile = {
                        id: authUser.uid,
                        name: authUser.displayName?.split(' ')[0] || (isMaster ? 'Super' : 'Visitor'),
                        surname: authUser.displayName?.split(' ').slice(1).join(' ') || (isMaster ? 'Admin' : ''),
                        email: authUser.email || '',
                        role: defaultRole as any,
                        preferredVibe: Vibe.RELAX,
                        avatarUrl: authUser.photoURL || undefined,
                        plan: defaultRole === 'admin' ? SubscriptionPlan.PREMIUM : SubscriptionPlan.VISITOR,
                        businessId: assignedBusinessId
                    };

                    await createUser(authUser.uid, newUser);
                    setUser(newUser);
                }
            } catch (error) {
                console.error("Error syncing user profile:", error);
            } finally {
                setLoading(false);
            }
        };

        syncUserProfile();
    }, [authUser, authLoading, isAuthAdmin, authUserRole]);

    const logout = async () => {
        await firebaseLogout();
        setUser(null);
        setIsSuperUser(false);
        localStorage.removeItem('montapulse_superuser');
    };

    return (
        <AuthContext.Provider value={{
            user,
            authUser,
            isAdmin: isAuthAdmin,
            isSuperAdmin: isSuperAdmin(authUser?.email),
            isSuperUser: isSuperUser && isAuthAdmin, // Only truly superuser if also auth admin
            toggleSuperUser,
            userRole: authUserRole,
            loading: loading || authLoading,
            logout,
            setUser
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuthContext = () => {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
};
