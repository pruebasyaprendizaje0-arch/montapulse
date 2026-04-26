import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { subscribeToAuthChanges, isSuperAdmin, UserRole } from '../services/authService';
import { getUser } from '../services/firestoreService';

export const useAuth = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [userRole, setUserRole] = useState<UserRole>('visitor');

    useEffect(() => {
        const unsubscribe = subscribeToAuthChanges(async (authUser) => {
            setUser(authUser);

            if (authUser) {
                const superAdmin = isSuperAdmin(authUser.email);

                try {
                    const profile = await getUser(authUser.uid);
                    if (profile && profile.role) {
                        const role = profile.role as UserRole;
                        setUserRole(role);
                        // IsAdmin true if role is admin. We don't force isAdmin for superadmin
                        // so they can test the app as visitor/host.
                        setIsAdmin(role === 'admin');
                    } else {
                        // Si no tiene perfil, el superadmin por defecto es admin
                        setUserRole(superAdmin ? 'admin' : 'visitor');
                        setIsAdmin(superAdmin);
                    }
                } catch (error) {
                    console.error('Error fetching user role:', error);
                    setUserRole(superAdmin ? 'admin' : 'visitor');
                    setIsAdmin(superAdmin);
                }
            } else {
                setIsAdmin(false);
                setUserRole('visitor');
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading, isAdmin, userRole, isSuperAdmin: isSuperAdmin(user?.email) };
};
