import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { MontanitaEvent, Business, Sector, BusinessCategory, UserProfile, CommunityPost, ChatMessage, Vibe, ServiceCategory, SubscriptionPlan, PulseNotification } from '../types';
import { DEFAULT_PAYMENT_DETAILS, SECTOR_POLYGONS, LOCALITIES, LOCALITY_SECTORS } from '../constants';
import {
    subscribeToEvents, subscribeToBusinesses, subscribeToAppSettings,
    incrementViewCount, updateAppSettings, subscribeToUsers,
    getUserByEmail, getBusinessById, createUser, createBusiness, updateBusiness, deleteBusiness, updateUser,
    toggleRSVP, deleteEvent, updateEvent, createEvent, subscribeToRSVPCounts,
    subscribeToPosts, createPost, toggleLikePost,
    subscribeToMessages, sendMessage,
    addPoints, redeemPoints, togglePulsePass,
    toggleFollowBusiness, getFollowedBusinessIds, subscribeToUserFollows,
    addFavorite, removeFavorite, subscribeToUserFavorites
} from '../services/firestoreService';
import { generateEventDescription } from '../services/geminiService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from './AuthContext';
import { useToast } from './ToastContext';
import { compressImage } from '../services/uiService';

interface DataContextType {
    events: MontanitaEvent[];
    eventsWithLiveCounts: MontanitaEvent[];
    businesses: Business[];
    setBusinesses: React.Dispatch<React.SetStateAction<Business[]>>;
    allUsers: UserProfile[];
    setAllUsers: React.Dispatch<React.SetStateAction<UserProfile[]>>;
    favorites: string[];
    setFavorites: React.Dispatch<React.SetStateAction<string[]>>;
    favoritedEvents: MontanitaEvent[];
    paymentDetails: any;
    showLogin: boolean;
    setShowLogin: (show: boolean) => void;
    regForm: { name: string; email: string; vibe: Vibe; role: 'visitor' | 'host' };
    setRegForm: React.Dispatch<React.SetStateAction<{ name: string; email: string; vibe: Vibe; role: 'visitor' | 'host' }>>;
    bizForm: {
        name: string;
        locality: string;
        sector: Sector;
        icon: string;
        description: string;
        imageUrl: string;
        whatsapp: string;
        phone: string;
        instagram: string;
        category: BusinessCategory;
        coordinates?: [number, number];
        plannerCategory?: 'hospedaje' | 'comida' | 'baile' | 'surf';
    };
    setBizForm: React.Dispatch<React.SetStateAction<{
        name: string;
        locality: string;
        sector: Sector;
        icon: string;
        description: string;
        imageUrl: string;
        whatsapp: string;
        phone: string;
        instagram: string;
        category: BusinessCategory;
        coordinates?: [number, number];
        plannerCategory?: 'hospedaje' | 'comida' | 'baile' | 'surf';
    }>>;
    rsvpStatus: Record<string, boolean>;
    setRsvpStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    handleRegister: (e: React.FormEvent) => Promise<void>;
    handleBusinessRegister: (e: React.FormEvent) => Promise<void>;
    handleRSVP: (id: string) => Promise<void>;
    handleDeleteEvent: (id: string) => Promise<void>;
    handleSaveEvent: () => Promise<void>;
    handleOpenNewEventWizard: () => void;
    handleEditEvent: (event: MontanitaEvent) => void;
    handleCheckEmailBlur: () => Promise<void>;
    showHostWizard: boolean;
    setShowHostWizard: (show: boolean) => void;
    newEvent: any;
    setNewEvent: React.Dispatch<React.SetStateAction<any>>;
    isGeneratingDesc: boolean;
    generatedDesc: string;
    setGeneratedDesc: (desc: string) => void;
    handleGenerateAIEvent: () => Promise<void>;
    setPaymentDetails: React.Dispatch<React.SetStateAction<any>>;
    selectedEvent: MontanitaEvent | null;
    setSelectedEvent: (event: MontanitaEvent | null) => void;
    toggleFavorite: (id: string, e?: React.MouseEvent) => void;
    agendaRange: 'day' | 'week' | 'month';
    setAgendaRange: (range: 'day' | 'week' | 'month') => void;
    calendarBaseDate: Date;
    setCalendarBaseDate: (date: Date) => void;
    sectorPolygons: Record<Sector, [number, number][]>;
    setSectorPolygons: React.Dispatch<React.SetStateAction<Record<Sector, [number, number][]>>>;
    sectorLabels: Record<string, string>;
    setSectorLabels: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    loading: boolean;
    currentLocality: { name: string; coords: [number, number]; zoom: number };
    setCurrentLocality: (locality: any) => void;
    selectedSector: Sector | null;
    setSelectedSector: (sector: Sector | null) => void;
    activeFilter: string;
    setActiveFilter: (filter: string) => void;
    notifications: PulseNotification[];
    markAllAsRead: () => void;
    unreadNotificationsCount: number;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedMood: Vibe | null;
    setSelectedMood: (mood: Vibe | null) => void;
    filteredEvents: MontanitaEvent[];
    journeyCards: any[];
    setJourneyCards: React.Dispatch<React.SetStateAction<any[]>>;
    toggleSector: (sector: Sector) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, target: 'event' | 'business') => void;

    // UI & CRUD State
    showBusinessEdit: boolean;
    setShowBusinessEdit: (show: boolean) => void;
    editingBusinessId: string | null;
    setEditingBusinessId: (id: string | null) => void;
    showPaymentEdit: boolean;
    setShowPaymentEdit: (show: boolean) => void;
    showMigrationPanel: boolean;
    setShowMigrationPanel: (show: boolean) => void;
    showBusinessReg: boolean;
    setShowBusinessReg: (show: boolean) => void;
    // Public profile modal
    showPublicProfile: boolean;
    setShowPublicProfile: (show: boolean) => void;
    publicProfileId: string | null;
    setPublicProfileId: (id: string | null) => void;
    publicProfileType: 'business' | 'user';
    setPublicProfileType: (type: 'business' | 'user') => void;
    handleUpdateBusinessProfile: () => Promise<void>;
    handleUpdatePaymentDetails: () => Promise<void>;
    handleBusinessImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
    handleDeleteBusiness: (id: string) => Promise<void>;
    handleCreateBusinessOnMap: (lat: number, lng: number) => Promise<void>;
    handleUpdateBusinessLocation: (id: string, lat: number, lng: number) => Promise<void>;
    isPanelMinimized: boolean;
    setIsPanelMinimized: (min: boolean) => void;
    isEditorFocus: boolean;
    setIsEditorFocus: (focus: boolean) => void;
    editingEventId: string | null;
    setEditingEventId: (id: string | null) => void;

    // Navigation & View State
    activeView: string;
    navigationEvents: MontanitaEvent[];
    navigateToNextEvent: () => void;
    navigateToPreviousEvent: () => void;
    hasNextEvent: boolean;
    hasPreviousEvent: boolean;
    posts: CommunityPost[];
    handleCreatePost: (content: string, imageUrl?: string) => Promise<void>;
    handleToggleLike: (postId: string) => Promise<void>;
    handleAddPoints: (amount: number) => Promise<void>;
    handleRedeemPoints: (amount: number) => Promise<void>;
    handleTogglePulsePass: (active: boolean) => Promise<void>;
    messages: ChatMessage[];
    handleSendMessage: (content: string, type?: 'text' | 'image' | 'system') => Promise<void>;
    services: ServiceCategory[];
    handleUpdateServices: (services: ServiceCategory[]) => Promise<void>;
    handleToggleFollow: (businessId: string) => Promise<void>;
    isBusinessFollowed: (businessId: string) => boolean;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { authUser, user, setUser, isAdmin } = useAuthContext();
    const { showToast, showConfirm, showPrompt } = useToast();
    const navigate = useNavigate();
    const [events, setEvents] = useState<MontanitaEvent[]>([]);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [paymentDetails, setPaymentDetails] = useState(DEFAULT_PAYMENT_DETAILS);
    const [selectedEvent, setSelectedEvent] = useState<MontanitaEvent | null>(null);
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [services, setServices] = useState<ServiceCategory[]>([]);
    const [loading, setLoading] = useState(true);

    const [agendaRange, setAgendaRange] = useState<'day' | 'week' | 'month'>('day');
    const [calendarBaseDate, setCalendarBaseDate] = useState(new Date());

    const [showBusinessEdit, setShowBusinessEdit] = useState(false);
    const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
    const [showPaymentEdit, setShowPaymentEdit] = useState(false);
    const [showMigrationPanel, setShowMigrationPanel] = useState(false);
    const [showBusinessReg, setShowBusinessReg] = useState(false);
    const [showPublicProfile, setShowPublicProfile] = useState(false);
    const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
    const [publicProfileType, setPublicProfileType] = useState<'business' | 'user'>('business');
    const [showLogin, setShowLogin] = useState(false);
    const [showHostWizard, setShowHostWizard] = useState(false);
    const [regForm, setRegForm] = useState({ name: '', email: '', vibe: Vibe.RELAX, role: 'visitor' as 'visitor' | 'host' });
    const [bizForm, setBizForm] = useState({
        name: '',
        locality: LOCALITIES[0].name,
        sector: Sector.CENTRO,
        icon: 'palmtree',
        description: '',
        imageUrl: 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?auto=format&fit=crop&q=80&w=400',
        whatsapp: '',
        phone: '',
        instagram: '',
        category: BusinessCategory.RESTAURANTE,
        coordinates: undefined,
        plannerCategory: undefined
    });
    const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>([]);
    const [rsvpStatus, setRsvpStatus] = useState<Record<string, boolean>>({});
    const [isPanelMinimized, setIsPanelMinimized] = useState(false);
    const [isEditorFocus, setIsEditorFocus] = useState(false);
    const [editingEventId, setEditingEventId] = useState<string | null>(null);
    const [newEvent, setNewEvent] = useState({
        title: '',
        locality: LOCALITIES[0].name,
        sector: Sector.CENTRO,
        vibe: Vibe.FIESTA,
        category: 'Fiesta',
        description: '',
        imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600',
        startAt: new Date().toISOString().slice(0, 16),
        endAt: new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 16)
    });
    const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
    const [generatedDesc, setGeneratedDesc] = useState('');

    const [currentLocality, setCurrentLocality] = useState(LOCALITIES[0]);
    const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMood, setSelectedMood] = useState<Vibe | null>(null);
    const [notifications, setNotifications] = useState<PulseNotification[]>([]);

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const mockNotifications: PulseNotification[] = [
            {
                id: 'n1',
                userId: user.id,
                title: 'Welcome to Montapulse!',
                message: 'Explore the map to find the best vibes in town.',
                type: 'system',
                createdAt: Date.now(),
                read: false
            }
        ];

        if (user.pulsePassActive) {
            mockNotifications.push({
                id: 'n2',
                userId: user.id,
                title: 'Pulse Pass Active!',
                message: 'You have exclusive access to golden markers today.',
                type: 'offer',
                createdAt: Date.now() - 1000 * 60 * 60,
                read: false
            });
        }

        setNotifications(mockNotifications);
    }, [user?.id, user?.pulsePassActive]);

    const unreadNotificationsCount = useMemo(() =>
        notifications.filter(n => !n.read).length
        , [notifications]);

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };
    const [journeyCards, setJourneyCards] = useState(() => {
        const saved = localStorage.getItem('montapulse_journey_cards_v3');
        if (saved) return JSON.parse(saved);
        return [
            { id: 'CENTRO', label: 'CENTRO', icon: 'zap', active: true, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
            { id: 'LA PUNTA', label: 'PLAYA', icon: 'waves', active: true, color: 'text-sky-400', bg: 'bg-sky-500/10' },
            { id: 'TIGRILLO', label: 'MONTAÑA', icon: 'leaf', active: true, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
        ];
    });

    // Sector Polygons & Labels Persistence
    const [sectorPolygons, setSectorPolygons] = useState<Record<Sector, [number, number][]>>(() => {
        const saved = localStorage.getItem('montapulse_polygons');
        if (saved) {
            const parsed = JSON.parse(saved);
            if (!parsed['Playa'] || !parsed['Montaña'] || parsed['Malecón']) {
                localStorage.removeItem('montapulse_polygons');
                return SECTOR_POLYGONS;
            }
            return parsed;
        }
        return SECTOR_POLYGONS;
    });

    const [sectorLabels, setSectorLabels] = useState<Record<string, string>>(() => {
        const saved = localStorage.getItem('montapulse_sector_labels');
        if (saved) return JSON.parse(saved);
        const defaults: Record<string, string> = {};
        Object.values(Sector).forEach(s => {
            defaults[s] = s;
        });
        return defaults;
    });

    useEffect(() => {
        if (!authUser) {
            const saved = localStorage.getItem('montapulse_favorites');
            if (saved) setFavorites(JSON.parse(saved));
            return;
        }

        const unsubscribe = subscribeToUserFavorites(authUser.uid, (eventIds) => {
            setFavorites(eventIds);
        });

        return () => unsubscribe();
    }, [authUser]);

    useEffect(() => {
        if (!authUser) {
            setFollowedBusinessIds([]);
            return;
        }

        const unsubscribe = subscribeToUserFollows(authUser.uid, (businessIds) => {
            setFollowedBusinessIds(businessIds);
        });

        return () => unsubscribe();
    }, [authUser]);

    useEffect(() => {
        localStorage.setItem('montapulse_polygons', JSON.stringify(sectorPolygons));
    }, [sectorPolygons]);

    useEffect(() => {
        localStorage.setItem('montapulse_sector_labels', JSON.stringify(sectorLabels));
    }, [sectorLabels]);

    useEffect(() => {
        localStorage.setItem('montapulse_journey_cards_v3', JSON.stringify(journeyCards));
    }, [journeyCards]);

    // Firestore Sync for Global Settings
    useEffect(() => {
        const unsubscribe = subscribeToAppSettings('journey_cards', (data) => {
            if (data && data.cards) {
                setJourneyCards(data.cards);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToAppSettings('polygons', (data) => {
            if (data && data.data) {
                setSectorPolygons(data.data);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToAppSettings('sector_labels', (data) => {
            if (data && data.labels) {
                setSectorLabels(data.labels);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToAppSettings('payment_info', (data) => {
            if (data) {
                setPaymentDetails(prev => ({ ...prev, ...data }));
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToAppSettings('services_guide', (data) => {
            if (data && data.categories) {
                setServices(data.categories);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubEvents = subscribeToEvents((data) => {
            setEvents(data);
        });
        const unsubBusinesses = subscribeToBusinesses((data) => {
            setBusinesses(data);
            setLoading(false);
        });
        const unsubRSVPs = subscribeToRSVPCounts((counts) => {
            setRsvpCounts(counts);
        });

        const unsubUsers = subscribeToUsers((data) => {
            setAllUsers(data);
        });
        const unsubPosts = subscribeToPosts((data) => {
            setPosts(data);
        });
        const unsubMessages = subscribeToMessages(50, (data) => {
            setMessages(data);
        });

        return () => {
            unsubEvents();
            unsubBusinesses();
            unsubRSVPs();
            unsubUsers();
            unsubPosts();
            unsubMessages();
        };
    }, []);


    useEffect(() => {
        if (selectedEvent) {
            incrementViewCount(selectedEvent.id);
        }
    }, [selectedEvent?.id]);

    // Keep selectedEvent's interestedCount in sync with live rsvpCounts (all users)
    useEffect(() => {
        if (selectedEvent) {
            const liveCount = rsvpCounts[selectedEvent.id] ?? 0;
            if (selectedEvent.interestedCount !== liveCount) {
                setSelectedEvent(prev => prev ? { ...prev, interestedCount: liveCount } : prev);
            }
        }
    }, [rsvpCounts, selectedEvent?.id]);

    const eventsWithLiveCounts = useMemo(() =>
        events.map(e => ({ ...e, interestedCount: rsvpCounts[e.id] ?? e.interestedCount ?? 0 })),
        [events, rsvpCounts]
    );

    const favoritedEvents = useMemo(() => {
        return eventsWithLiveCounts.filter(e => favorites.includes(e.id));
    }, [eventsWithLiveCounts, favorites]);

    const filteredEvents = useMemo(() => {
        let filtered = eventsWithLiveCounts.filter(e => {
            const biz = businesses.find(b => b.id === e.businessId);
            const eventLocality = e.locality || biz?.locality || 'Montañita';
            const matchesLocality = eventLocality === currentLocality.name;
            const matchesSector = !selectedSector || e.sector === selectedSector;
            const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.description || '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = activeFilter === 'All' || e.vibe === activeFilter || e.category === activeFilter;
            const matchesMood = !selectedMood || e.vibe === selectedMood;
            const isActive = new Date() <= new Date(e.endAt);
            return matchesLocality && matchesSector && matchesSearch && matchesFilter && matchesMood && isActive;
        });

        // Boost premium events if they match mood
        if (selectedMood) {
            filtered = filtered.sort((a, b) => {
                if (a.isPremium && !b.isPremium) return -1;
                if (!a.isPremium && b.isPremium) return 1;
                return 0;
            });
        }

        return filtered.sort((a, b) => {
            if (a.isPremium && !b.isPremium) return -1;
            if (!a.isPremium && b.isPremium) return 1;
            return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
        });
    }, [eventsWithLiveCounts, businesses, currentLocality, selectedSector, searchQuery, activeFilter, selectedMood]);

    const location = useLocation();
    const activeView = useMemo(() => {
        const path = location.pathname;
        if (path === '/') return 'explore';
        if (path === '/calendar') return 'calendar';
        if (path === '/passport') return 'favorites';
        if (path === '/admin-users') return 'admin-users';
        if (path === '/host') return 'host';
        if (path === '/history') return 'history';
        if (path === '/plans') return 'plans';
        if (path === '/saved-events') return 'all-favorites';
        if (path === '/community') return 'community';
        if (path === '/chat') return 'chat';
        return 'explore';
    }, [location.pathname]);

    // Determine which events to navigate through based on current view
    const navigationEvents = useMemo(() => {
        if (activeView === 'favorites' || activeView === 'all-favorites') {
            return favoritedEvents.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        }

        if (activeView === 'calendar') {
            if (agendaRange === 'day') {
                return events.filter(e => {
                    const eDate = new Date(e.startAt);
                    return eDate.getDate() === calendarBaseDate.getDate() &&
                        eDate.getMonth() === calendarBaseDate.getMonth() &&
                        eDate.getFullYear() === calendarBaseDate.getFullYear();
                }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
            }
            if (agendaRange === 'week') {
                const weekEnd = new Date(calendarBaseDate);
                weekEnd.setDate(weekEnd.getDate() + 7);
                return events.filter(e => {
                    const eDate = new Date(e.startAt);
                    return eDate >= calendarBaseDate && eDate < weekEnd;
                }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
            }
            // Monthly
            return events.filter(e => {
                const eDate = new Date(e.startAt);
                return eDate.getMonth() === calendarBaseDate.getMonth() &&
                    eDate.getFullYear() === calendarBaseDate.getFullYear();
            }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        }

        if (activeView === 'explore') return filteredEvents;

        return [...events]
            .filter(e => new Date() <= new Date(e.endAt))
            .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }, [activeView, events, favoritedEvents, filteredEvents, agendaRange, calendarBaseDate]);

    const navigateToNextEvent = () => {
        if (!selectedEvent) return;
        const currentIndex = navigationEvents.findIndex(e => e.id === selectedEvent.id);
        if (currentIndex < navigationEvents.length - 1) {
            setSelectedEvent(navigationEvents[currentIndex + 1]);
        }
    };

    const navigateToPreviousEvent = () => {
        if (!selectedEvent) return;
        const currentIndex = navigationEvents.findIndex(e => e.id === selectedEvent.id);
        if (currentIndex > 0) {
            setSelectedEvent(navigationEvents[currentIndex - 1]);
        }
    };

    const hasNextEvent = useMemo(() => {
        if (!selectedEvent) return false;
        const currentIndex = navigationEvents.findIndex(e => e.id === selectedEvent.id);
        return currentIndex < navigationEvents.length - 1;
    }, [selectedEvent, navigationEvents]);

    const hasPreviousEvent = useMemo(() => {
        if (!selectedEvent) return false;
        const currentIndex = navigationEvents.findIndex(e => e.id === selectedEvent.id);
        return currentIndex > 0;
    }, [selectedEvent, navigationEvents]);

    const toggleSector = (sector: Sector) => {
        setSelectedSector(prev => prev === sector ? null : sector);
    };

    const toggleFavorite = async (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();

        if (!authUser) {
            // Local fallback for guests
            const nextFavs = favorites.includes(id)
                ? favorites.filter(eid => eid !== id)
                : [...favorites, id];

            setFavorites(nextFavs);
            localStorage.setItem('montapulse_favorites', JSON.stringify(nextFavs));
            return;
        }

        try {
            if (favorites.includes(id)) {
                await removeFavorite(authUser.uid, id);
            } else {
                await addFavorite(authUser.uid, id);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            showToast('Error al guardar favorito.', 'error');
        }
    };

    const handleUpdateBusinessProfile = async () => {
        const targetBusinessId = editingBusinessId || user?.businessId;
        if (!targetBusinessId) return;

        const business = businesses.find(b => b.id === targetBusinessId);
        if (!business) return;

        try {
            await updateBusiness(targetBusinessId, {
                name: business.name || '',
                description: business.description || '',
                locality: business.locality || 'Montañita',
                sector: business.sector || Sector.CENTRO,
                icon: business.icon || 'palmtree',
                whatsapp: business.whatsapp || '',
                phone: business.phone || '',
                category: business.category || BusinessCategory.RESTAURANTE,
                imageUrl: business.imageUrl || 'https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?auto=format&fit=crop&q=80&w=400',
                coordinates: business.coordinates || [-1.8253, -80.7523]
            });
            setShowBusinessEdit(false);
            setEditingBusinessId(null);
            showToast("Perfil de negocio actualizado.", "success");
        } catch (error: any) {
            console.error("Error updating business:", error);
            showToast(`Error al guardar cambios: ${error.message || 'Error desconocido'}`, "error");
        }
    };

    const handleUpdatePaymentDetails = async () => {
        try {
            await updateAppSettings('payment_info', paymentDetails);
            setShowPaymentEdit(false);
            showToast("Información de pago actualizada.", "success");
        } catch (error) {
            console.error("Error updating payment details:", error);
            showToast("Error al actualizar información de pago.", "error");
        }
    };

    // Utility removed - now using shared uiService.ts

    const handleBusinessImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset input so camera can be re-triggered on mobile
        e.target.value = '';
        const targetBusinessId = editingBusinessId || user?.businessId;
        if (file && targetBusinessId) {
            try {
                // Square crop for business profile photos, max 800px
                const dataUrl = await compressImage(file, 800, 0.88, true);
                setBusinesses(prev => prev.map(b =>
                    b.id === targetBusinessId ? { ...b, imageUrl: dataUrl } : b
                ));
                setBizForm(prev => ({ ...prev, imageUrl: dataUrl }));
            } catch (err) {
                console.error('Error procesando imagen de negocio:', err);
                showToast('No se pudo procesar la imagen. Intenta con otra foto.', 'error');
            }
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, target: 'event' | 'business') => {
        const file = e.target.files?.[0];
        // Reset input so camera can be re-triggered on mobile
        e.target.value = '';
        if (file) {
            try {
                // 16:9 style max for events (1280px wide), square for business
                const isSquare = target === 'business';
                const dataUrl = await compressImage(file, 1280, 0.88, isSquare);
                if (target === 'event') {
                    setNewEvent((prev: any) => ({ ...prev, imageUrl: dataUrl }));
                } else {
                    setBizForm(prev => ({ ...prev, imageUrl: dataUrl }));
                }
            } catch (err) {
                console.error('Error procesando imagen:', err);
                showToast('No se pudo procesar la imagen. Intenta con otra foto.', 'error');
            }
        }
    };

    const handleDeleteBusiness = async (id: string) => {
        const confirmed = await showConfirm('¿Eliminar este negocio permanentemente?');
        if (confirmed) {
            await deleteBusiness(id);
            showToast('Negocio eliminado.', 'success');
        }
    };

    const handleCreateBusinessOnMap = async (lat: number, lng: number) => {
        const name = await showPrompt('Introduce el nombre del nuevo punto comercial:', 'Ej. Mi Local', 'Nuevo Punto Comercial');
        if (!name) return;
        const newBiz: Omit<Business, 'id'> = {
            name,
            ownerId: authUser?.uid || 'admin',
            locality: currentLocality.name,
            sector: Sector.CENTRO,
            icon: 'palmtree',
            description: 'Nuevo punto añadido por Administrador',
            isVerified: true,
            coordinates: [lat, lng],
            imageUrl: 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?auto=format&fit=crop&q=80&w=400',
            plan: SubscriptionPlan.BASIC,
            monthlyEventCount: 0,
            lastResetDate: new Date().toISOString()
        };
        const id = await createBusiness(newBiz);
        setEditingBusinessId(id);
        setShowBusinessEdit(true);
        showToast('Negocio creado en el mapa.', 'success');
    };

    const handleUpdateBusinessLocation = async (id: string, lat: number, lng: number) => {
        await updateBusiness(id, { coordinates: [lat, lng] });
        showToast('Ubicación del negocio actualizada.', 'success');
    };

    return (
        <DataContext.Provider value={{
            events,
            eventsWithLiveCounts,
            businesses,
            setBusinesses,
            allUsers,
            setAllUsers,
            favorites,
            setFavorites,
            favoritedEvents,
            paymentDetails,
            selectedMood,
            setSelectedMood,
            currentLocality,
            setCurrentLocality,
            selectedSector,
            setSelectedSector,
            activeFilter,
            setActiveFilter,
            searchQuery,
            setSearchQuery,
            journeyCards,
            setJourneyCards,
            showHostWizard,
            setShowHostWizard,
            newEvent,
            setNewEvent,
            isGeneratingDesc,
            generatedDesc,
            setGeneratedDesc,
            showLogin,
            setShowLogin,
            regForm,
            setRegForm,
            bizForm,
            setBizForm,
            rsvpStatus,
            setRsvpStatus,
            handleRegister: async (e: React.FormEvent) => {
                e.preventDefault();
                if (regForm.email) {
                    const existingUser = await getUserByEmail(regForm.email);
                    if (existingUser && existingUser.businessId) {
                        const biz = await getBusinessById(existingUser.businessId);
                        if (biz) {
                            const confirmed = await showConfirm(
                                `El correo ${regForm.email} ya tiene el negocio "${biz.name}" registrado.\n\n¿Deseas iniciar sesión en su lugar?`,
                                "Negocio Registrado"
                            );
                            if (confirmed) {
                                setShowLogin(true);
                                return;
                            }
                        }
                    }
                }
                if (regForm.role === 'host') {
                    // Logic for showing business reg handled in Host view
                    return;
                }
                if (!authUser) return;
                const newUser: UserProfile = {
                    id: authUser.uid,
                    name: regForm.name.split(' ')[0],
                    surname: regForm.name.split(' ').slice(1).join(' ') || '',
                    email: regForm.email,
                    preferredVibe: regForm.vibe,
                    role: 'visitor',
                    avatarUrl: authUser.photoURL || `https://i.pravatar.cc/150?u=${regForm.email}`,
                    plan: SubscriptionPlan.VISITOR
                };
                await createUser(authUser.uid, { ...newUser, avatarUrl: newUser.avatarUrl || null });
                setUser(newUser);
                showToast('Registro exitoso.', 'success');
            },
            handleBusinessRegister: async (e: React.FormEvent) => {
                e.preventDefault();
                if (!authUser) return;
                const isSuperAdmin = user?.role === 'admin';
                const hasBusiness = businesses.some(b => b.ownerId === authUser.uid);
                if (hasBusiness && !isSuperAdmin) {
                    showToast("Solo puedes tener un negocio asociado a tu cuenta.", "info");
                    return;
                }
                const locObj = LOCALITIES.find(l => l.name === bizForm.locality) || LOCALITIES[0];
                const businessData = {
                    ...bizForm,
                    ownerId: isSuperAdmin ? 'admin' : authUser.uid,
                    isVerified: isSuperAdmin,
                    coordinates: bizForm.coordinates || locObj.coords,
                    plan: SubscriptionPlan.BASIC,
                    monthlyEventCount: 0,
                    lastResetDate: new Date().toISOString()
                };
                // Firestore rejects undefined values — strip them before saving
                const sanitize = (obj: Record<string, any>) =>
                    Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
                const newBusinessId = await createBusiness(sanitize(businessData) as any);
                if (!isSuperAdmin) {
                    const newUserProfile: UserProfile = {
                        id: authUser.uid,
                        name: user?.name || authUser.displayName?.split(' ')[0] || 'Host',
                        surname: user?.surname || authUser.displayName?.split(' ').slice(1).join(' ') || '',
                        email: user?.email || authUser.email || '',
                        preferredVibe: user?.preferredVibe || Vibe.RELAX,
                        role: 'host',
                        avatarUrl: user?.avatarUrl || authUser.photoURL || undefined,
                        businessId: newBusinessId,
                        plan: SubscriptionPlan.BASIC
                    };
                    await updateUser(authUser.uid, { businessId: newBusinessId, role: 'host' });
                    setUser(newUserProfile);
                } else if (!user?.businessId) {
                    // If it's the first business for admin, we can still associate it if we want,
                    // but keeping admin role is crucial.
                    await updateUser(authUser.uid, { businessId: newBusinessId });
                    if (user) setUser({ ...user, businessId: newBusinessId });
                }

                setBusinesses(prev => [...prev, { id: newBusinessId, ...businessData } as any]);
                setShowBusinessReg(false);
                showToast('Negocio registrado exitosamente.', 'success');
            },
            handleRSVP: async (id: string) => {
                if (!authUser) {
                    navigate('/host');
                    return;
                }
                const isCurrentlyRsvp = !!rsvpStatus[id];
                // Optimistic update: flip rsvp status and update count immediately
                setRsvpStatus(prev => ({ ...prev, [id]: !prev[id] }));
                setEvents(prev => prev.map(e =>
                    e.id === id
                        ? { ...e, interestedCount: Math.max(0, (e.interestedCount || 0) + (isCurrentlyRsvp ? -1 : 1)) }
                        : e
                ));
                // Also update selectedEvent if it's the one being RSVP'd
                setSelectedEvent(prev => prev?.id === id
                    ? { ...prev, interestedCount: Math.max(0, (prev.interestedCount || 0) + (isCurrentlyRsvp ? -1 : 1)) }
                    : prev
                );
                try {
                    await toggleRSVP(authUser.uid, id);
                    showToast(isCurrentlyRsvp ? 'RSVP cancelado.' : 'RSVP confirmado.', 'success');
                } catch (error) {
                    // Revert on error
                    setRsvpStatus(prev => ({ ...prev, [id]: !prev[id] }));
                    setEvents(prev => prev.map(e =>
                        e.id === id
                            ? { ...e, interestedCount: Math.max(0, (e.interestedCount || 0) + (isCurrentlyRsvp ? 1 : -1)) }
                            : e
                    ));
                    setSelectedEvent(prev => prev?.id === id
                        ? { ...prev, interestedCount: Math.max(0, (prev.interestedCount || 0) + (isCurrentlyRsvp ? 1 : -1)) }
                        : prev
                    );
                    showToast("No se pudo registrar tu asistencia. Intenta de nuevo.", "error");
                }
            },
            handleDeleteEvent: async (id: string) => {
                const confirmed = await showConfirm('¿Estás seguro de que quieres eliminar este pulso?');
                if (confirmed) {
                    await deleteEvent(id);
                    setFavorites(prev => prev.filter(eid => eid !== id));
                    showToast('Pulso eliminado.', 'success');
                }
            },
            handleSaveEvent: async () => {
                if (!user?.businessId && !isAdmin) return;
                const bizId = user?.businessId || businesses.find(b => b.ownerId === authUser?.uid)?.id || 'admin';

                const eventData = {
                    title: newEvent.title || 'Evento sin nombre',
                    locality: newEvent.locality,
                    description: newEvent.description || 'Un evento increíble en Montañita.',
                    startAt: new Date(newEvent.startAt),
                    endAt: new Date(newEvent.endAt),
                    category: newEvent.category,
                    vibe: newEvent.vibe,
                    sector: newEvent.sector,
                    imageUrl: newEvent.imageUrl || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600',
                    isPremium: user?.plan === SubscriptionPlan.PREMIUM,
                    businessId: bizId,
                    interestedCount: 0,
                    viewCount: 0
                };

                try {
                    if (editingEventId) {
                        await updateEvent(editingEventId, eventData);
                    } else {
                        await createEvent(eventData);
                    }
                    setShowHostWizard(false);
                    setEditingEventId(null);
                    setGeneratedDesc('');
                    showToast("Evento guardado correctamente", "success");
                } catch (error) {
                    console.error("Error saving event:", error);
                    showToast("Error al guardar el pulso.", "error");
                }
            },
            handleGenerateAIEvent: async () => {
                if (!newEvent.title) {
                    showToast("Ponle un título al evento primero.", "info");
                    return;
                }
                setIsGeneratingDesc(true);
                try {
                    const desc = await generateEventDescription(newEvent.title, newEvent.sector);
                    setGeneratedDesc(desc);
                    setNewEvent(prev => ({ ...prev, description: desc }));
                } catch (error) {
                    console.error("Error generating AI description:", error);
                } finally {
                    setIsGeneratingDesc(false);
                }
            },
            handleOpenNewEventWizard: () => {
                setNewEvent({
                    title: '',
                    locality: LOCALITIES[0].name,
                    sector: Sector.CENTRO,
                    vibe: Vibe.FIESTA,
                    category: 'Fiesta',
                    description: '',
                    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600',
                    startAt: new Date().toISOString().slice(0, 16),
                    endAt: new Date(Date.now() + 3 * 3600000).toISOString().slice(0, 16)
                });
                setEditingEventId(null);
                setGeneratedDesc('');
                setShowHostWizard(true);
            },
            handleEditEvent: (event: MontanitaEvent) => {
                setEditingEventId(event.id);
                setNewEvent({
                    title: event.title,
                    locality: event.locality || 'Montañita',
                    sector: event.sector,
                    vibe: event.vibe,
                    category: event.category,
                    description: event.description || '',
                    imageUrl: event.imageUrl,
                    startAt: new Date(event.startAt).toISOString().slice(0, 16),
                    endAt: new Date(event.endAt).toISOString().slice(0, 16)
                });
                setShowHostWizard(true);
            },
            handleCheckEmailBlur: async () => {
                if (regForm.email) {
                    const existingUser = await getUserByEmail(regForm.email);
                    if (existingUser && existingUser.businessId) {
                        const biz = await getBusinessById(existingUser.businessId);
                        if (biz) {
                            const confirmed = await showConfirm(
                                `El correo ${regForm.email} ya tiene el negocio "${biz.name}" registrado.\n\n¿Deseas iniciar sesión en su lugar?`,
                                "Negocio Registrado"
                            );
                            if (confirmed) {
                                setShowLogin(true);
                            }
                        }
                    }
                }
            },
            toggleSector,
            handleImageUpload,
            showMigrationPanel,
            setShowMigrationPanel,
            setPaymentDetails,
            selectedEvent,
            setSelectedEvent,
            toggleFavorite,
            agendaRange,
            setAgendaRange,
            calendarBaseDate,
            setCalendarBaseDate,
            sectorPolygons,
            setSectorPolygons,
            sectorLabels,
            setSectorLabels,
            loading,
            showBusinessEdit,
            setShowBusinessEdit,
            editingBusinessId,
            setEditingBusinessId,
            showPaymentEdit,
            setShowPaymentEdit,
            handleUpdateBusinessProfile,
            handleUpdatePaymentDetails,
            handleBusinessImageUpload,
            handleDeleteBusiness,
            handleCreateBusinessOnMap,
            handleUpdateBusinessLocation,
            showBusinessReg,
            setShowBusinessReg,
            showPublicProfile,
            setShowPublicProfile,
            publicProfileId,
            setPublicProfileId,
            publicProfileType,
            setPublicProfileType,
            isPanelMinimized,
            setIsPanelMinimized,
            isEditorFocus,
            setIsEditorFocus,
            editingEventId,
            setEditingEventId,
            activeView,
            navigationEvents,
            navigateToNextEvent,
            navigateToPreviousEvent,
            hasNextEvent,
            hasPreviousEvent,
            posts,
            handleCreatePost: async (content: string, imageUrl?: string) => {
                if (!authUser) return;
                const authorProfile = user || {
                    id: authUser.uid,
                    name: authUser.displayName?.split(' ')[0] || 'User',
                    surname: authUser.displayName?.split(' ').slice(1).join(' ') || '',
                    role: 'visitor',
                    avatarUrl: authUser.photoURL || undefined
                };
                await createPost({
                    authorId: authUser.uid,
                    authorName: `${authorProfile.name} ${authorProfile.surname}`,
                    authorRole: (authorProfile as any).role || 'visitor',
                    authorAvatar: authorProfile.avatarUrl || undefined,
                    content,
                    imageUrl
                });
            },
            handleToggleLike: async (postId: string) => {
                if (!authUser) return;
                await toggleLikePost(postId, authUser.uid);
            },
            handleAddPoints: async (amount: number) => {
                if (!authUser) return;
                await addPoints(authUser.uid, amount);
            },
            handleRedeemPoints: async (amount: number) => {
                if (!authUser) return;
                await redeemPoints(authUser.uid, amount);
            },
            handleTogglePulsePass: async (active: boolean) => {
                if (!authUser) return;
                await togglePulsePass(authUser.uid, active);
            },
            messages,
            handleSendMessage: async (content: string, type: 'text' | 'image' | 'system' = 'text') => {
                if (!authUser) return;
                const authorProfile = user || {
                    id: authUser.uid,
                    name: authUser.displayName?.split(' ')[0] || 'User',
                    surname: authUser.displayName?.split(' ').slice(1).join(' ') || '',
                    avatarUrl: authUser.photoURL || undefined
                };
                await sendMessage({
                    authorId: authUser.uid,
                    authorName: `${authorProfile.name} ${authorProfile.surname}`,
                    authorAvatar: authorProfile.avatarUrl || undefined,
                    content,
                    type
                });
            },
            services,
            handleUpdateServices: async (newServices: ServiceCategory[]) => {
                await updateAppSettings('services_guide', { categories: newServices });
            },
            handleToggleFollow: async (businessId: string) => {
                if (!authUser) {
                    setShowLogin(true);
                    return;
                }
                const isNowFollowing = await toggleFollowBusiness(authUser.uid, businessId);
                setFollowedBusinessIds(prev =>
                    isNowFollowing
                        ? [...prev, businessId]
                        : prev.filter(id => id !== businessId)
                );
            },
            filteredEvents,
            isBusinessFollowed: (businessId: string) => followedBusinessIds.includes(businessId),
            notifications,
            markAllAsRead,
            unreadNotificationsCount,
        }}>
            {children}
        </DataContext.Provider>
    );
};

export const useData = () => {
    const context = useContext(DataContext);
    if (context === undefined) {
        throw new Error('useData must be used within a DataProvider');
    }
    return context;
};
