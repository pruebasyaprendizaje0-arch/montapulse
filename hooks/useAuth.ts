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
                // PRIMERO: Verificar si es el Super Admin por correo
                // Esto garantiza que solo TU correo tenga acceso total pase lo que pase en la BD
                const superAdmin = isSuperAdmin(authUser.email);

                if (superAdmin) {
                    setIsAdmin(true);
                    setUserRole('admin');
                } else {
                    // Si no es super admin, verificar su rol en la base de datos
                    try {
                        const profile = await getUser(authUser.uid);
                        if (profile && profile.role) {
                            // Si en la base de datos dice admin pero no es el correo autorizado, 
                            // lo bajamos a visitor por seguridad (opcional, pero buena práctica)
                            if (profile.role === 'admin') {
                                setUserRole('visitor'); // Nadie más puede ser admin
                                setIsAdmin(false);
                            } else {
                                setUserRole(profile.role as UserRole);
                                setIsAdmin(false);
                            }
                        } else {
                            // Si no tiene perfil, es un visitante
                            setUserRole('visitor');
                            setIsAdmin(false);
                        }
                    } catch (error) {
                        console.error('Error fetching user role:', error);
                        setUserRole('visitor');
                        setIsAdmin(false);
                    }
                }
            } else {
                setIsAdmin(false);
                setUserRole('visitor');
            }

            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    return { user, loading, isAdmin, userRole };
};
