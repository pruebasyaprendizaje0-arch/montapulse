import { useState, useEffect } from 'react';
import {
    subscribeToEvents,
    subscribeToBusinesses,
    subscribeToUserFavorites,
    createEvent,
    updateEvent,
    deleteEvent,
    createBusiness,
    updateBusiness,
    deleteBusiness
} from '../services/firestoreService';
import { MontanitaEvent, Business } from '../types';

// ==================== EVENTS HOOK ====================

export const useEvents = () => {
    const [events, setEvents] = useState<MontanitaEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToEvents((newEvents) => {
            setEvents(newEvents);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addEvent = async (event: Omit<MontanitaEvent, 'id'>) => {
        try {
            await createEvent(event);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    const editEvent = async (id: string, data: Partial<MontanitaEvent>) => {
        try {
            await updateEvent(id, data);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    const removeEvent = async (id: string) => {
        try {
            await deleteEvent(id);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    return { events, loading, error, addEvent, editEvent, removeEvent };
};

// ==================== BUSINESSES HOOK ====================

export const useBusinesses = () => {
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    useEffect(() => {
        setLoading(true);
        const unsubscribe = subscribeToBusinesses((newBusinesses) => {
            setBusinesses(newBusinesses);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const addBusiness = async (business: Omit<Business, 'id'>) => {
        try {
            await createBusiness(business);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    const editBusiness = async (id: string, data: Partial<Business>) => {
        try {
            await updateBusiness(id, data);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    const removeBusiness = async (id: string) => {
        try {
            await deleteBusiness(id);
        } catch (err) {
            setError(err as Error);
            throw err;
        }
    };

    return { businesses, loading, error, addBusiness, editBusiness, removeBusiness };
};

// ==================== FAVORITES HOOK ====================

export const useFavorites = (userId: string | null) => {
    const [favorites, setFavorites] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!userId) {
            setFavorites([]);
            setLoading(false);
            return;
        }

        setLoading(true);
        const unsubscribe = subscribeToUserFavorites(userId, (eventIds) => {
            setFavorites(eventIds);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    return { favorites, loading };
};
