import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode, useRef } from 'react';
import { MontanitaEvent, Business, Sector, BusinessCategory, UserProfile, CommunityPost, ChatMessage, ChatRoom, Vibe, ServiceCategory, SubscriptionPlan, PulseNotification, ViewType, AgendaRange, HelpSupportItem, PolicyData, AppSettings } from '../types';
import { DEFAULT_PAYMENT_DETAILS, SECTOR_POLYGONS, LOCALITIES, LOCALITY_SECTORS, MOCK_BUSINESSES, SECTOR_FOCUS_COORDS, PLAN_PRICES, DEFAULT_POLICIES, PLAN_LIMITS, PLAN_FEATURES, PlanFeatureDefinition } from '../constants';
import {
    subscribeToEvents, subscribeToBusinesses, subscribeToAppSettings,
    incrementViewCount, updateAppSettings, subscribeToUsers,
    getUserByEmail, getBusinessById, createUser, createBusiness, updateBusiness, deleteBusiness, updateUser,
    toggleRSVP, deleteEvent, updateEvent, createEvent, subscribeToRSVPCounts,
    subscribeToPosts, createPost, toggleLikePost, addCommentToPost,
    subscribeToMessages, sendMessage,
    addPoints, redeemPoints, togglePulsePass, incrementPulseCount,
    toggleFollowBusiness, getFollowedBusinessIds, subscribeToUserFollows, subscribeToBusinessFollowers,
    addFavorite, removeFavorite, subscribeToUserFavorites,
    purgeAllReferencePoints,
    restoreBusiness,
    getCustomLocalities, subscribeToCustomLocalities, createCustomLocality, deleteCustomLocality,
    subscribeToNotifications, createNotification, markNotificationRead,
    incrementEventViewCount, incrementEventClickCount as serviceIncrementClick,
    subscribeToChatRooms, markRoomAsRead
} from '../services/firestoreService';
import { generateEventDescription } from '../services/geminiService';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthContext } from './AuthContext';
import { useToast } from './ToastContext';
import { compressImage } from '../utils/imageUtils';

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
        plannerCategory?: 'hospedaje' | 'comida' | 'baile' | 'surf' | null;
        isReference?: boolean;
        email: string;
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
        plannerCategory?: 'hospedaje' | 'comida' | 'baile' | 'surf' | null;
        isReference?: boolean;
        email: string;
    }>>;
    rsvpStatus: Record<string, boolean>;
    setRsvpStatus: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
    handleRegister: (e: React.FormEvent) => Promise<void>;
    handleBusinessRegister: (e: React.FormEvent) => Promise<void>;
    handleRSVP: (id: string) => Promise<void>;
    handleDeleteEvent: (id: string) => Promise<void>;
    handleSaveEvent: () => Promise<void>;
    handleOpenNewEventWizard: (initialDate?: Date) => void;
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
    isCalendarFilterActive: boolean;
    setIsCalendarFilterActive: (active: boolean) => void;
    calendarBaseDate: Date;
    setCalendarBaseDate: (date: Date) => void;
    showCalendarModal: boolean;
    setShowCalendarModal: (show: boolean) => void;
    showPulseModal: boolean;
    showPulsePassModal: boolean;
    setShowPulsePassModal: (show: boolean) => void;
    setShowPulseModal: (show: boolean) => void;
    sectorPolygons: Record<Sector, [number, number][]>;
    setSectorPolygons: React.Dispatch<React.SetStateAction<Record<Sector, [number, number][]>>>;
    sectorLabels: Record<string, string>;
    setSectorLabels: React.Dispatch<React.SetStateAction<Record<string, string>>>;
    loading: boolean;
    currentLocality: { name: string; coords: [number, number]; zoom: number };
    setCurrentLocality: (locality: any) => void;
    selectedSector: Sector | null;
    setSelectedSector: (sector: Sector | null) => void;
    sectorFocusCoords: [number, number] | null;
    setSectorFocusCoords: (coords: [number, number] | null) => void;
    activeFilter: string;
    setActiveFilter: (filter: string) => void;
    notifications: PulseNotification[];
    markAllAsRead: () => void;
    unreadNotificationsCount: number;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    selectedMood: Vibe | null;
    setSelectedMood: (mood: Vibe | null) => void;
    user: UserProfile | null;
    authUser: any;
    isAdmin: boolean;
    isSuperUser: boolean;
    isSuperAdmin: boolean;
    customLocalities: { name: string; coords: [number, number]; zoom: number }[];
    customLocalitySectors: Record<string, Sector[]>;
    handleAddCustomLocality: (name: string, coords: [number, number], hasBeach: boolean) => Promise<void>;
    handleDeleteCustomLocality: (name: string) => Promise<void>;
    filteredEvents: MontanitaEvent[];
    filteredBusinesses: Business[];
    pastEvents: MontanitaEvent[];
    journeyCards: any[];
    setJourneyCards: React.Dispatch<React.SetStateAction<any[]>>;
    toggleSector: (sector: Sector) => void;
    handleImageUpload: (e: React.ChangeEvent<HTMLInputElement>, target: 'event' | 'business') => void;

    // UI & CRUD State
    showBusinessEdit: boolean;
    setShowBusinessEdit: (show: boolean) => void;
    showProfileEdit: boolean;
    setShowProfileEdit: (show: boolean) => void;
    editingBusinessId: string | null;
    setEditingBusinessId: (id: string | null) => void;
    showPaymentEdit: boolean;
    setShowPaymentEdit: (show: boolean) => void;
    planPrices: Record<SubscriptionPlan, number>;
    handleUpdatePlanPrices: (prices: Record<SubscriptionPlan, number>) => Promise<void>;
    planFeatures: Record<SubscriptionPlan, PlanFeatureDefinition[]>;
    handleUpdatePlanFeatures: (features: Record<SubscriptionPlan, PlanFeatureDefinition[]>) => Promise<void>;
    planLimits: Record<SubscriptionPlan, number>;
    handleUpdatePlanLimits: (limits: Record<SubscriptionPlan, number>) => Promise<void>;
    planNames: Record<SubscriptionPlan, string>;
    handleUpdatePlanNames: (names: Record<SubscriptionPlan, string>) => Promise<void>;
    planSubtitles: Record<SubscriptionPlan, string>;
    handleUpdatePlanSubtitles: (subtitles: Record<SubscriptionPlan, string>) => Promise<void>;
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
    handleCreateBusinessOnMap: (lat: number, lng: number, isReference?: boolean) => Promise<void>;
    handleUpdateBusinessLocation: (id: string, lat: number, lng: number) => Promise<void>;
    isPanelMinimized: boolean;
    setIsPanelMinimized: (min: boolean) => void;
    isNearbyMinimized: boolean;
    setIsNearbyMinimized: (min: boolean) => void;
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
    handleLikePost: (postId: string) => Promise<void>;
    handleComment: (postId: string, content: string) => Promise<void>;
    handleAddPoints: (amount: number) => Promise<void>;
    handleRedeemPoints: (amount: number) => Promise<void>;
    handleTogglePulsePass: (active: boolean) => Promise<void>;
    messages: ChatMessage[];
    handleSendMessage: (content: string, asBusiness?: boolean, type?: 'text' | 'image' | 'system', imageUrl?: string) => Promise<void>;
    services: ServiceCategory[];
    handleUpdateServices: (services: ServiceCategory[]) => Promise<void>;
    helpSupport: HelpSupportItem[];
    handleUpdateHelpSupport: (items: HelpSupportItem[]) => Promise<void>;
    handleToggleFollow: (businessId: string) => Promise<void>;
    isBusinessFollowed: (businessId: string) => boolean;
    followedBusinessIds: string[];
    businessFollowers: string[];
    updateBusiness: (id: string, data: Partial<Business>) => Promise<void>;
    handlePurgeAllReferences: () => Promise<void>;
    handleRestoreBusiness: (id: string) => Promise<void>;
    setActiveView: (view: ViewType) => void;
    policyData: PolicyData;
    handleUpdatePolicies: (data: PolicyData) => Promise<void>;
    appSettings: AppSettings | null;
    setAppSettings: React.Dispatch<React.SetStateAction<AppSettings | null>>;
    handleUpdateAppSettings: (settings: Partial<AppSettings>) => Promise<void>;
    communityTab: 'global' | 'chats' | 'users';
    setCommunityTab: (tab: 'global' | 'chats' | 'users') => void;
    sendPushNotification: (userId: string, title: string, body: string, type: string, metadata?: any) => Promise<void>;
    markAsRead: (id: string) => Promise<void>;
    incrementEventView: (id: string) => Promise<void>;
    incrementEventClick: (id: string) => Promise<void>;
    deletedBusinesses: Business[];
    chatRooms: ChatRoom[];
    unreadChatCount: number;
    markRoomAsRead: (roomId: string, userId: string) => Promise<void>;
    markAllRoomsAsRead: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const { authUser, user, setUser, isAdmin, isSuperAdmin, isSuperUser } = useAuthContext();
    const { showToast, showConfirm, showPrompt } = useToast();
    const navigate = useNavigate();
    const [events, setEvents] = useState<MontanitaEvent[]>([]);
    const [businesses, setBusinesses] = useState<Business[]>([]);
    const rawBusinessesRef = useRef<Business[]>([]);
    const [rsvpCounts, setRsvpCounts] = useState<Record<string, number>>({});
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [favorites, setFavorites] = useState<string[]>([]);
    const [paymentDetails, setPaymentDetails] = useState(DEFAULT_PAYMENT_DETAILS);
    const [planPrices, setPlanPrices] = useState<Record<SubscriptionPlan, number>>(PLAN_PRICES);
    const [planFeatures, setPlanFeatures] = useState<Record<SubscriptionPlan, PlanFeatureDefinition[]>>(PLAN_FEATURES);
    const [planLimits, setPlanLimits] = useState<Record<SubscriptionPlan, number>>(PLAN_LIMITS);
    const [planNames, setPlanNames] = useState<Record<SubscriptionPlan, string>>({
        [SubscriptionPlan.FREE]: 'Free',
        [SubscriptionPlan.BASIC]: 'Pulse Pro',
        [SubscriptionPlan.PREMIUM]: 'Pulse Elite',
        [SubscriptionPlan.EXPERT]: 'Pulse Expert'
    });
    const [planSubtitles, setPlanSubtitles] = useState<Record<SubscriptionPlan, string>>({
        [SubscriptionPlan.FREE]: 'Tu inicio en la comunidad.',
        [SubscriptionPlan.BASIC]: 'Visibilidad potenciada.',
        [SubscriptionPlan.PREMIUM]: 'Máximo alcance y control.',
        [SubscriptionPlan.EXPERT]: 'Solución total para tu negocio.'
    });
    const [selectedEvent, setSelectedEvent] = useState<MontanitaEvent | null>(null);
    const [posts, setPosts] = useState<CommunityPost[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [services, setServices] = useState<ServiceCategory[]>([]);
    const [helpSupport, setHelpSupport] = useState<HelpSupportItem[]>([
        { id: '1', label: 'Enviar Email', type: 'email', value: 'fhernandezcalle@gmail.com', icon: 'Mail' },
        { id: '2', label: 'WhatsApp', type: 'whatsapp', value: '593994916012', icon: 'MessageCircle' },
        { id: '3', label: 'Preguntas Frecuentes', type: 'toast', value: 'FAQ disponible pronto', icon: 'Info' },
        { id: '4', label: 'Términos y Condiciones', type: 'toast', value: 'Términos y condiciones disponible pronto', icon: 'FileText' }
    ]);
    const [loading, setLoading] = useState(true);
    const [policyData, setPolicyData] = useState<PolicyData>(DEFAULT_POLICIES);
    const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
    const [communityTab, setCommunityTab] = useState<'global' | 'chats' | 'users'>('global');
    const [chatRooms, setChatRooms] = useState<ChatRoom[]>([]);
    const [deletedBusinesses, setDeletedBusinesses] = useState<Business[]>([]);
    const [notifications, setNotifications] = useState<PulseNotification[]>([]);

    const [agendaRange, setAgendaRange] = useState<'day' | 'week' | 'month'>('day');
    const [calendarBaseDate, setCalendarBaseDate] = useState(new Date());
    const [isCalendarFilterActive, setIsCalendarFilterActive] = useState(false);
    const [showCalendarModal, setShowCalendarModal] = useState(false);
    const [showPulseModal, setShowPulseModal] = useState(false);
    const [showPulsePassModal, setShowPulsePassModal] = useState(false);

    const [showBusinessEdit, setShowBusinessEdit] = useState(false);
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
    const [showPaymentEdit, setShowPaymentEdit] = useState(false);
    const [showMigrationPanel, setShowMigrationPanel] = useState(false);
    const [showBusinessReg, setShowBusinessReg] = useState(false);
    const [showPublicProfile, setShowPublicProfile] = useState(false);
    const [publicProfileId, setPublicProfileId] = useState<string | null>(null);
    const [publicProfileType, setPublicProfileType] = useState<'business' | 'user'>('business');
    const [showLogin, setShowLogin] = useState(false);
    const [showHostWizard, setShowHostWizard] = useState(false);
    const [regForm, setRegForm] = useState({ name: '', surname: '', email: '', vibe: Vibe.RELAX, role: 'visitor' as 'visitor' | 'host' });
    const INITIAL_BIZ_FORM = {
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
        coordinates: null as any,
        plannerCategory: null,
        isReference: false,
        email: ''
    };

    const [bizForm, setBizForm] = useState(INITIAL_BIZ_FORM);
    const [followedBusinessIds, setFollowedBusinessIds] = useState<string[]>([]);
    const [businessFollowers, setBusinessFollowers] = useState<string[]>([]);
    const [rsvpStatus, setRsvpStatus] = useState<Record<string, boolean>>({});
    const [isPanelMinimized, setIsPanelMinimized] = useState(false);
    const [isNearbyMinimized, setIsNearbyMinimized] = useState(true);
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
    const [sectorFocusCoords, setSectorFocusCoords] = useState<[number, number] | null>(null);
    const [activeFilter, setActiveFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedMood, setSelectedMood] = useState<Vibe | null>(null);
    
    const [customLocalities, setCustomLocalities] = useState<{ name: string; coords: [number, number]; zoom: number }[]>([]);
    const [customLocalitySectors, setCustomLocalitySectors] = useState<Record<string, Sector[]>>({});

    useEffect(() => {
        if (!user) {
            setNotifications([]);
            return;
        }

        const baseNotifications: PulseNotification[] = [
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
            baseNotifications.push({
                id: 'n2',
                userId: user.id,
                title: 'Pulse Pass Active!',
                message: 'You have exclusive access to golden markers today.',
                type: 'offer',
                createdAt: Date.now() - 1000 * 60 * 60,
                read: false
            });
        }

        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        const eventNotifications: PulseNotification[] = [];

        events.forEach(event => {
            if (event.status === 'deactivated') return;

            const eventStart = new Date(event.startAt);
            const eventEnd = new Date(event.endAt);

            // Verifica que el evento coincide con "hoy" y aún no ha terminado.
            const happensToday = eventStart < tomorrow && eventEnd >= today;
            const hasNotEnded = now < eventEnd;

            if (happensToday && hasNotEnded) {
                const business = businesses.find(b => b.id === event.businessId);
                const isPremium = event.isPremium || business?.plan === SubscriptionPlan.EXPERT || business?.plan === SubscriptionPlan.PREMIUM;
                const isAdminEvent = event.isFeatured || business?.isReference || event.ownerId === user.id;
                const isLiked = favorites.includes(event.id);

                if (isLiked || isPremium || isAdminEvent) {
                    eventNotifications.push({
                        id: `evt-${event.id}`,
                        userId: user.id,
                        title: event.title,
                        message: `¡Hoy! ${eventStart.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - ${eventEnd.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`,
                        type: 'alert',
                        createdAt: eventStart,
                        read: false,
                        postId: event.id
                    });
                }
            }
        });

        setNotifications(prev => {
            const allNew = [...baseNotifications, ...eventNotifications];
            return allNew.map(n => {
                const existing = prev.find(p => p.id === n.id);
                if (existing) {
                    return { ...n, read: existing.read };
                }
                return n;
            });
        });
    }, [user?.id, user?.pulsePassActive, events, businesses, favorites]);

    const unreadNotificationsCount = useMemo(() =>
        notifications.filter(n => !n.read).length
        , [notifications]);

    const markAllAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };
    const [journeyCards, setJourneyCards] = useState(() => {
        const saved = localStorage.getItem('montapulse_journey_cards_v3');
        if (saved) return JSON.parse(saved);
        return [];
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
        if (!user?.businessId) return;
        
        const unsubscribe = subscribeToBusinessFollowers(user.businessId, (followerIds) => {
            setBusinessFollowers(followerIds);
        });

        return () => unsubscribe();
    }, [user?.businessId]);

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
        const unsubscribe = subscribeToAppSettings('plan_prices', (data) => {
            if (data && data.prices) {
                setPlanPrices(data.prices);
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
        const unsubscribe = subscribeToAppSettings('help_support', (data) => {
            if (data && data.items) {
                setHelpSupport(data.items);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubscribe = subscribeToAppSettings('policies', (data) => {
            if (data) {
                setPolicyData(data as PolicyData);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const unsubEvents = subscribeToEvents((data) => {
            setEvents(data);
        });
        const unsubBusinesses = subscribeToBusinesses((data) => {
            rawBusinessesRef.current = data;
            const unique: Business[] = [];
            const seen = new Set<string>();

            data.forEach(b => {
                const locality = b.locality || 'Montañita';
                const lat = (b.location?.lat || b.coordinates?.[0] || 0).toFixed(3);
                const lng = (b.location?.lng || b.coordinates?.[1] || 0).toFixed(3);
                const normalizedPrefix = (b.name?.trim() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 5);
                const key = `${normalizedPrefix}_${lat}_${lng}_${locality.toLowerCase()}`;

                if (!seen.has(key)) {
                    seen.add(key);
                    unique.push(b);
                }
            });

            setBusinesses(unique);
            setLoading(false);
            
            if (data.length > unique.length && isSuperUser) {
                console.log(`[Data] Found ${data.length - unique.length} hidden clones in businesses collection.`);
            }
        });
        const unsubRSVPs = subscribeToRSVPCounts((counts) => {
            setRsvpCounts(counts);
        });

        const unsubPosts = subscribeToPosts((data) => {
            setPosts(data);
        });
        const unsubMessages = subscribeToMessages(50, (data) => {
            setMessages(data);
        });

        const loadCustomLocalities = async () => {
            try {
                const customs = await getCustomLocalities();
                setCustomLocalities(customs.map(c => ({ name: c.name, coords: c.coords, zoom: c.zoom })));
                const sectorsMap: Record<string, Sector[]> = {};
                customs.forEach(c => {
                    sectorsMap[c.name] = (c.sectors || [Sector.CENTRO, Sector.PLAYA, Sector.MONTANA]) as Sector[];
                });
                setCustomLocalitySectors(sectorsMap);
            } catch (error) {
                console.error('Error loading custom localities:', error);
            }
        };
        loadCustomLocalities();

        return () => {
            unsubEvents();
            unsubBusinesses();
            unsubRSVPs();
            unsubPosts();
            unsubMessages();
        };
    }, []);

    // Only subscribe to ALL users if admin OR premium business owner 
    // This allows premium hosts to see who follows them (follower details)
    useEffect(() => {
        const isPremiumHost = user?.businessId && businesses.find(b => b.id === user.businessId)?.plan === SubscriptionPlan.PREMIUM;
        
        if (!isAdmin && !isPremiumHost) {
            setAllUsers([]);
            return;
        }
        const unsubUsers = subscribeToUsers((data) => {
            setAllUsers(data);
        });
        return () => unsubUsers();
    }, [isAdmin, user?.businessId, businesses]);


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
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        let filtered = eventsWithLiveCounts.filter(e => {
            const biz = businesses.find(b => b.id === e.businessId);
            const eventLocality = e.locality || biz?.locality || 'Montañita';
            const matchesLocality = eventLocality === currentLocality.name;
            const matchesSector = !selectedSector || e.sector === selectedSector;
            const matchesSearch = !searchQuery ||
                (e.title ?? '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (e.description ?? '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = activeFilter === 'All' || e.vibe === activeFilter || e.category === activeFilter;
            const matchesMood = !selectedMood || e.vibe === selectedMood;

            // Calendar filtering
            const eventDate = new Date(e.startAt);
            const matchesCalendarDate = !isCalendarFilterActive || (
                eventDate.getDate() === calendarBaseDate.getDate() &&
                eventDate.getMonth() === calendarBaseDate.getMonth() &&
                eventDate.getFullYear() === calendarBaseDate.getFullYear()
            );

            // "cada mes se actualicen los eventos" -> Solo mostrar eventos del mes actual o futuros
            const isCurrentOrFutureMonth = eventDate >= startOfMonth;
            const isActive = now <= new Date(e.endAt);

            return matchesLocality && matchesSector && matchesSearch && matchesFilter && matchesMood && isCurrentOrFutureMonth && isActive && matchesCalendarDate;
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

    const filteredBusinesses = useMemo(() => {
        return businesses.filter(b => {
            const locality = b.locality || 'Montañita';
            const matchesLocality = locality === currentLocality.name;
            const matchesSector = !selectedSector || b.sector === selectedSector;
            const matchesSearch = !searchQuery || (b.name ?? '').toLowerCase().includes(searchQuery.toLowerCase());
            const matchesFilter = activeFilter === 'All' || b.category === activeFilter;

            return matchesLocality && matchesSector && matchesSearch && matchesFilter;
        });
    }, [businesses, currentLocality, selectedSector, searchQuery, activeFilter]);

    const pastEvents = useMemo(() => {
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const firstDayOfPastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        return eventsWithLiveCounts
            .filter(e => {
                const eventDate = new Date(e.startAt);
                // "los 10 del mes pasado se puedan ver en el historial"
                // Obtenemos los eventos que ocurrieron ANTES de este mes pero DESPUÉS o EN el inicio del mes pasado
                return eventDate < firstDayOfMonth && eventDate >= firstDayOfPastMonth;
            })
            .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime())
            .slice(0, 10);
    }, [eventsWithLiveCounts]);

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
        if (path === '/info') return 'info';
        if (path === '/policies') return 'policies';
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
        setSelectedSector(prev => {
            const newSector = prev === sector ? null : sector;
            if (newSector && SECTOR_FOCUS_COORDS[currentLocality.name]?.[newSector]) {
                setSectorFocusCoords(SECTOR_FOCUS_COORDS[currentLocality.name][newSector]);
            } else if (!newSector) {
                setSectorFocusCoords(null);
            }
            return newSector;
        });
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

        const isCurrentlyFavorited = favorites.includes(id);

        // Optimistic Update
        const nextFavs = isCurrentlyFavorited
            ? favorites.filter(eid => eid !== id)
            : [...favorites, id];
        setFavorites(nextFavs);

        try {
            if (isCurrentlyFavorited) {
                await removeFavorite(authUser.uid, id);
            } else {
                await addFavorite(authUser.uid, id);
            }
        } catch (error) {
            console.error('Error toggling favorite:', error);
            // Rollback on error
            setFavorites(favorites);
            showToast('Error al guardar favorito.', 'error');
        }
    };

    const handleUpdateBusinessProfile = async () => {
        const targetBusinessId = editingBusinessId || user?.businessId;
        if (!targetBusinessId) return;

        const business = businesses.find(b => b.id === targetBusinessId);
        if (!business) return;

        // Validation: Mismo nombre, mismo sector (Ignore if it's a reference point)
        const isRef = business.isReference || business.id?.startsWith('ref-');
        const duplicateNameSector = !isRef && businesses.some(b => 
            b.id !== targetBusinessId &&
            !b.isReference &&
            !b.id.startsWith('ref-') &&
            b.name.toLowerCase().trim() === (business.name || '').toLowerCase().trim() && 
            b.sector === business.sector
        );

        if (duplicateNameSector) {
            showToast("Ya existe un negocio con este nombre en este sector.", "error");
            return;
        }

        const isAdminUser = user?.role === 'admin';

        try {
            const updatePayload: Partial<Business> = {
                name: business.name || '',
                description: business.description || '',
                locality: business.locality || 'Montañita',
                sector: business.sector || Sector.CENTRO,
                icon: business.icon || 'palmtree',
                whatsapp: business.whatsapp || '',
                phone: business.phone || '',
                category: business.category || BusinessCategory.RESTAURANTE,
                imageUrl: business.imageUrl || 'https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?auto=format&fit=crop&q=80&w=400',
                coordinates: business.coordinates || [-1.8253, -80.7523],
                plannerCategory: (business as any).plannerCategory || null
            };

            // Que los cambios como superusuario prevalezcan
            if (isAdminUser || isSuperUser || business.isReference || business.id?.startsWith('ref-')) {
                (updatePayload as any).isPublished = business.isPublished !== undefined ? business.isPublished : true;
                (updatePayload as any).isReference = business.isReference || business.id?.startsWith('ref-') || false;
                (updatePayload as any).isVerified = business.isVerified !== undefined ? business.isVerified : false;
                (updatePayload as any).email = business.email || '';
            }

            await updateBusiness(targetBusinessId, updatePayload as any);
            setBusinesses(prev => prev.map(b => b.id === targetBusinessId ? { ...b, ...(updatePayload as any) } : b));
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
            showToast('Información de pago actualizada correctamente', 'success');
            setShowPaymentEdit(false);
        } catch (error) {
            console.error('Error updating payment details:', error);
            showToast('Error al actualizar información de pago', 'error');
        }
    };

    const handleUpdatePlanPrices = async (prices: Record<SubscriptionPlan, number>) => {
        try {
            await updateAppSettings('plan_prices', { prices });
            showToast('Precios de planes actualizados correctamente', 'success');
        } catch (error) {
            console.error('Error updating plan prices:', error);
            showToast('Error al actualizar precios de planes', 'error');
            throw error;
        }
    };

    const handleUpdatePlanFeatures = async (features: Record<SubscriptionPlan, PlanFeatureDefinition[]>) => {
        try {
            await updateAppSettings('plan_features', { features });
            setPlanFeatures(features);
            showToast('Características de planes actualizadas', 'success');
        } catch (error) {
            console.error('Error updating plan features:', error);
            showToast('Error al actualizar características de planes', 'error');
            throw error;
        }
    };

    const handleUpdatePlanLimits = async (limits: Record<SubscriptionPlan, number>) => {
        try {
            await updateAppSettings('plan_limits', { limits });
            setPlanLimits(limits);
            showToast('Límites de planes actualizados', 'success');
        } catch (error) {
            console.error('Error updating plan limits:', error);
            showToast('Error al actualizar límites de planes', 'error');
            throw error;
        }
    };

    const handleUpdatePlanNames = async (names: Record<SubscriptionPlan, string>) => {
        try {
            await updateAppSettings('plan_names', { names });
            setPlanNames(names);
            showToast('Nombres de planes actualizados', 'success');
        } catch (error) {
            console.error('Error updating plan names:', error);
            showToast('Error al actualizar nombres de planes', 'error');
            throw error;
        }
    };

    const handleUpdatePlanSubtitles = async (subtitles: Record<SubscriptionPlan, string>) => {
        try {
            await updateAppSettings('plan_subtitles', { subtitles });
            setPlanSubtitles(subtitles);
            showToast('Subtítulos de planes actualizados', 'success');
        } catch (error) {
            console.error('Error updating plan subtitles:', error);
            showToast('Error al actualizar subtítulos de planes', 'error');
            throw error;
        }
    };

    const handleUpdateAppSettings = async (settings: Partial<AppSettings>) => {
        try {
            await updateAppSettings('general_settings', settings);
            setAppSettings(prev => prev ? { ...prev, ...settings } : settings as AppSettings);
            showToast('Ajustes de la aplicación actualizados', 'success');
        } catch (error) {
            console.error('Error updating app settings:', error);
            showToast('Error al actualizar ajustes', 'error');
        }
    };

    const handleUpdatePolicies = async (data: PolicyData) => {
        try {
            await updateAppSettings('policies', data);
            setPolicyData(data);
            showToast('Políticas actualizadas correctamente', 'success');
        } catch (error) {
            console.error('Error updating policies:', error);
            showToast('Error al actualizar políticas', 'error');
            throw error;
        }
    };

    const handleRestoreBusiness = async (id: string) => {
        try {
            await restoreBusiness(id);
            const b = deletedBusinesses.find(db => db.id === id);
            if (b) {
                setBusinesses(prev => [...prev, b]);
                setDeletedBusinesses(prev => prev.filter(db => db.id !== id));
            }
            showToast('Negocio restaurado exitosamente', 'success');
        } catch (error) {
            console.error('Error restoring business:', error);
            showToast('Error al restaurar negocio', 'error');
        }
    };

    // handlePurgeAllReferences moved/consolidated later in file

    const handleBusinessImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        // Reset input so camera can be re-triggered on mobile
        e.target.value = '';
        const targetBusinessId = editingBusinessId || user?.businessId;
        if (file && targetBusinessId) {
            try {
                // Square crop for business profile photos, max 800px
                const dataUrl = await compressImage(file, { maxWidth: 800, quality: 0.88, squareCrop: true });
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
                const dataUrl = await compressImage(file, { maxWidth: 1280, quality: 0.88, squareCrop: isSquare });
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
        const confirmed = await showConfirm('¿Eliminar este punto (negocio o referencia) permanentemente? Esta acción limpiará todos los duplicados ocultos.');
        if (confirmed) {
            try {
                const target = rawBusinessesRef.current.find(b => b.id === id);
                if (target && (isSuperUser || isAdmin)) {
                    const targetLat = (target.location?.lat || target.coordinates?.[0] || 0).toFixed(3);
                    const targetLng = (target.location?.lng || target.coordinates?.[1] || 0).toFixed(3);
                    const targetLocality = (target.locality || 'Montañita').toLowerCase();
                    const targetPrefix = (target.name?.trim() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 5);

                    // Find ALL clones in the raw list using the same fuzzy logic as unique de-duplication
                    const clones = rawBusinessesRef.current.filter(b => 
                        b.id !== id && 
                        (b.locality || 'Montañita').toLowerCase() === targetLocality &&
                        (b.location?.lat || b.coordinates?.[0] || 0).toFixed(3) === targetLat &&
                        (b.location?.lng || b.coordinates?.[1] || 0).toFixed(3) === targetLng &&
                        (b.name?.trim() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '').substring(0, 5) === targetPrefix
                    );

                    if (clones.length > 0) {
                        showToast(`Eliminando ${clones.length} duplicados adicionales...`, 'info');
                        for (const clone of clones) {
                            await deleteBusiness(clone.id);
                        }
                    }
                }

                await deleteBusiness(id);
                showToast('Punto y duplicados eliminados permanentemente.', 'success');
                setShowBusinessEdit(false);
                setEditingBusinessId(null);
            } catch (error) {
                console.error('Error during deletion:', error);
                showToast('Error al eliminar el punto.', 'error');
            }
        }
    };

    const handlePurgeAllReferences = async () => {
        // If they are not super admin or admin, they shouldn't see it, but we check here too
        if (!isSuperUser && !isAdmin) {
            showToast('No tienes permisos suficientes.', 'error');
            return;
        }

        // Search for anything that LOOKS like a reference point in the RAW list (to count clones)
        const allRefPoints = rawBusinessesRef.current.filter(b => {
            const id = (b.id || '').toLowerCase();
            const name = (b.name || '').toLowerCase();
            const category = (b.category as string || '').toLowerCase();
            
            return b.isReference || 
                   id.startsWith('ref-') || 
                   category.includes('referencia') ||
                   category.includes('reference') ||
                   name.includes('ref-') ||
                   name.includes('referencia') ||
                   name.includes('reference') ||
                   name.includes('punto de');
        });

        const count = allRefPoints.length;
        
        if (count === 0) {
            showToast('No se encontraron puntos de referencia registrados.', 'info');
            return;
        }
        
        const confirmed = await showConfirm(`⚠️ ACCIÓN CRÍTICA ⚠️\n\n¿BORRAR LOS ${count} PUNTOS DE REFERENCIA?\n\nEsta acción es irreversible y los eliminará de la base de datos para SIEMPRE.`);
        if (confirmed) {
            try {
                showToast('Limpiando base de datos...', 'info');
                const deletedCount = await purgeAllReferencePoints();
                showToast(`Éxito: Se han eliminado ${deletedCount} puntos permanentemente.`, 'success');
                // Force refresh businesses would be good, but they should auto-update via snapshot
            } catch (error) {
                console.error('Purge error:', error);
                showToast('Error crítico durante la purga masiva.', 'error');
            }
        }
    };

    const handleCreateBusinessOnMap = async (lat: number, lng: number, isReference?: boolean) => {
        const label = isReference ? 'punto de referencia' : 'negocio';
        const name = await showPrompt(
            `Introduce el nombre del nuevo ${label}:`,
            isReference ? 'Ej. Mirador Norte' : 'Ej. Mi Local',
            isReference ? 'Nuevo Punto de Referencia' : 'Nuevo Negocio'
        );
        if (!name) return;
        
        // Mismo nombre, mismo sector en la localidad actual (Ignore if it's a reference point)
        const duplicateNameSector = !isReference && businesses.some(b => 
            !b.isReference &&
            b.name.toLowerCase().trim() === name.toLowerCase().trim() && 
            b.locality === currentLocality.name
        );

        if (duplicateNameSector) {
            showToast("Ya existe un negocio con este nombre en este sector.", "error");
            return;
        }

        const newBiz: Omit<Business, 'id'> = {
            name,
            ownerId: authUser?.uid || 'admin',
            locality: currentLocality.name,
            sector: Sector.CENTRO,
            icon: isReference ? 'mappin' : 'palmtree',
            description: isReference
                ? 'Punto de referencia añadido por Administrador'
                : 'Nuevo negocio añadido por Administrador',
            isVerified: true,
            isPublished: true, // Superusers create published points directly
            isReference: isReference || false,
            coordinates: [lat, lng],
            imageUrl: 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?auto=format&fit=crop&q=80&w=400',
            category: BusinessCategory.OTRO,
            plan: SubscriptionPlan.BASIC,
            monthlyEventCount: 0,
            lastResetDate: new Date().toISOString(),
            plannerCategory: null
        };
        const id = await createBusiness(newBiz);
        setEditingBusinessId(id);
        setShowBusinessEdit(true);
        showToast(`${isReference ? 'Punto de referencia' : 'Negocio'} creado en el mapa.`, 'success');
    };

    const handleUpdateBusinessLocation = async (id: string, lat: number, lng: number) => {
        setBusinesses(prev => prev.map(b => b.id === id ? { ...b, coordinates: [lat, lng], location: { lat, lng } } : b));
        await updateBusiness(id, { coordinates: [lat, lng], location: { lat, lng } });
        showToast('Ubicación actualizada y guardada.', 'success');
    };

    useEffect(() => {
        if (!user) return;
        let unsubscribeUserRooms: () => void;
        let unsubscribeBizRooms: (() => void) | undefined;
        
        let userRooms: ChatRoom[] = [];
        let bizRooms: ChatRoom[] = [];
        
        const updateMergedRooms = () => {
            const merged = [...userRooms, ...bizRooms];
            const unique = Array.from(new Map(merged.map(r => [r.id, r])).values());
            setChatRooms(unique);
        };
        
        // Timeout to allow initial auth states to settle if needed, though usually safe without
        unsubscribeUserRooms = subscribeToChatRooms(user.id, (rooms) => {
            userRooms = rooms;
            updateMergedRooms();
        });
        
        if (user.businessId) {
            unsubscribeBizRooms = subscribeToChatRooms(user.businessId, (rooms) => {
                bizRooms = rooms;
                updateMergedRooms();
            });
        }
        
        return () => {
            if (unsubscribeUserRooms) unsubscribeUserRooms();
            if (unsubscribeBizRooms) unsubscribeBizRooms();
        };
    }, [user?.id, user?.businessId]);

    const unreadChatCount = useMemo(() => {
        if (!user) return 0;
        let count = 0;
        chatRooms.forEach(room => {
            if (room.unreadCounts?.[user.id] && room.unreadCounts[user.id] > 0) {
                count += room.unreadCounts[user.id];
            }
            if (user.businessId && room.unreadCounts?.[user.businessId] && room.unreadCounts[user.businessId] > 0) {
                count += room.unreadCounts[user.businessId];
            }
        });
        return count;
    }, [chatRooms, user]);

    const markAllRoomsAsRead = async () => {
        if (!user) return;
        const roomsToMark = chatRooms.filter(room => 
            (room.unreadCounts?.[user.id] && room.unreadCounts[user.id] > 0) ||
            (user.businessId && room.unreadCounts?.[user.businessId] && room.unreadCounts[user.businessId] > 0)
        );
        
        const promises = roomsToMark.flatMap(room => {
            const p = [];
            if (room.unreadCounts?.[user.id] && room.unreadCounts[user.id] > 0) {
                p.push(markRoomAsRead(room.id, user.id));
            }
            if (user.businessId && room.unreadCounts?.[user.businessId] && room.unreadCounts[user.businessId] > 0) {
                p.push(markRoomAsRead(room.id, user.businessId));
            }
            return p;
        });

        if (promises.length > 0) {
            await Promise.all(promises);
        }
    };

    return (
        <DataContext.Provider value={{
            chatRooms,
            unreadChatCount,
            markRoomAsRead,
            markAllRoomsAsRead,
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
            sectorFocusCoords,
            setSectorFocusCoords,
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
                    name: regForm.name,
                    surname: regForm.surname,
                    email: regForm.email,
                    preferredVibe: Vibe.RELAX,
                    role: regForm.role,
                    avatarUrl: authUser.photoURL || undefined,
                    plan: SubscriptionPlan.FREE
                };
                await createUser(authUser.uid, { ...newUser, avatarUrl: newUser.avatarUrl || null });
                setUser(newUser);
                showToast('Registro exitoso.', 'success');
            },
            handleBusinessRegister: async (e: React.FormEvent) => {
                e.preventDefault();
                if (!authUser) return;
                const isSuperAdmin = user?.role === 'admin' || isSuperUser || isAdmin;
                
                // Mismo nombre, mismo sector (Ignore if it's a reference point)
                const duplicateNameSector = !bizForm.isReference && businesses.some(b => 
                    !b.isReference &&
                    b.name.toLowerCase().trim() === bizForm.name.toLowerCase().trim() && 
                    b.sector === bizForm.sector
                );

                if (duplicateNameSector) {
                    showToast("Ya existe un negocio con este nombre en este sector.", "error");
                    return;
                }

                // Un correo un negocio (Ignore if it's a reference point or if user is superuser)
                const isReferenceItem = !!bizForm.isReference;
                const hasBusinessByOwner = businesses.some(b => b.ownerId === authUser.uid && !b.isReference && !b.id.startsWith('ref-'));
                const hasBusinessByEmail = businesses.some(b => 
                    b.email?.toLowerCase().trim() === user?.email?.toLowerCase().trim() && 
                    !b.isReference && 
                    !b.id.startsWith('ref-')
                );
                const hasReferenceByOwner = businesses.some(b => b.ownerId === authUser.uid && b.isReference);
                
                if (!isReferenceItem) {
                    // Limitar a 1 negocio por usuario
                    if ((hasBusinessByOwner || hasBusinessByEmail) && !isSuperUser && !isSuperAdmin) {
                        showToast("Solo puedes tener un negocio asociado a tu cuenta.", "error");
                        return;
                    }
                } else {
                    // Limitar a 1 punto de referencia por usuario premium
                    if (hasReferenceByOwner && !isSuperUser && !isSuperAdmin) {
                        showToast("Solo puedes tener un punto de referencia en el mapa.", "error");
                        return;
                    }
                }

                const locObj = LOCALITIES.find(l => l.name === bizForm.locality) || LOCALITIES[0];
                const userEmail = authUser?.email || user?.email || bizForm.email || '';
                const businessData = {
                    ...bizForm,
                    ownerId: isSuperAdmin ? 'admin' : authUser.uid,
                    email: userEmail,
                    isVerified: isSuperAdmin,
                    isPublished: isSuperAdmin,
                    coordinates: bizForm.coordinates || locObj.coords,
                    plan: SubscriptionPlan.BASIC,
                    monthlyEventCount: 0,
                    lastResetDate: new Date().toISOString(),
                    plannerCategory: bizForm.plannerCategory || null,
                    isReference: !!bizForm.isReference
                };
                
                // Firestore rejects undefined values — strip them before saving
                const newBusinessId = await createBusiness(businessData as any);
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
                setBizForm(INITIAL_BIZ_FORM);
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
                if (!user) return;
                
                const userBusiness = user.businessId ? businesses.find(b => b.id === user.businessId) : null;
                const isPremium = userBusiness?.plan === SubscriptionPlan.PREMIUM;
                const eventLimit = isPremium ? Infinity : 7;
                
                if (!editingEventId && eventLimit !== Infinity) {
                    const businessEvents = events.filter(e => e.businessId === userBusiness?.id);
                    if (businessEvents.length >= eventLimit) {
                        showToast("Has alcanzado el límite de eventos de tu plan. ¡Actualiza a Premium!", "error");
                        return;
                    }
                }

                const bizId = user?.businessId || businesses.find(b => b.ownerId === authUser?.uid)?.id || user.id;

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
            handleOpenNewEventWizard: (initialDate?: Date) => {
                const baseDate = initialDate || new Date();
                setNewEvent({
                    title: '',
                    locality: LOCALITIES[0].name,
                    sector: Sector.CENTRO,
                    vibe: Vibe.FIESTA,
                    category: 'Fiesta',
                    description: '',
                    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600',
                    startAt: new Date(baseDate.getTime() - baseDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16),
                    endAt: new Date(baseDate.getTime() + 3 * 3600000 - baseDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
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
            isCalendarFilterActive,
            setIsCalendarFilterActive,
            calendarBaseDate,
            setCalendarBaseDate,
            showCalendarModal,
            setShowCalendarModal,
            sectorPolygons,
            setSectorPolygons,
            sectorLabels,
            setSectorLabels,
            loading,
            showBusinessEdit,
            setShowBusinessEdit,
            showProfileEdit,
            setShowProfileEdit,
            editingBusinessId,
            setEditingBusinessId,
            showPaymentEdit,
            setShowPaymentEdit,
            planPrices,
            handleUpdatePlanPrices,
            planFeatures,
            handleUpdatePlanFeatures,
            planLimits,
            handleUpdatePlanLimits,
            planNames,
            handleUpdatePlanNames,
            planSubtitles,
            handleUpdatePlanSubtitles,
            handleUpdateBusinessProfile,
            handleUpdatePaymentDetails,
            handleBusinessImageUpload,
            handleDeleteBusiness,
            handleCreateBusinessOnMap,
            handleUpdateBusinessLocation,
            handleRestoreBusiness,
            handlePurgeAllReferences,
            updateBusiness,
            appSettings,
            setAppSettings,
            handleUpdateAppSettings,
            policyData,
            handleUpdatePolicies,
            communityTab,
            setCommunityTab,
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
            isNearbyMinimized,
            setIsNearbyMinimized,
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
            handleLikePost: async (postId: string) => {
                if (!authUser) return;
                const post = posts.find(p => p.id === postId);
                if (!post) return;
                const isLiked = post.likes?.includes(authUser.uid) || false;

                // Optimistic update
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? {
                            ...p,
                            likes: isLiked
                                ? (p.likes || []).filter(uid => uid !== authUser.uid)
                                : [...(p.likes || []), authUser.uid]
                        }
                        : p
                ));

                try {
                    await toggleLikePost(postId, authUser.uid, isLiked, post.authorId);
                    // Sincronizar Pulso Global (+1)
                    if (!isLiked) {
                        await incrementPulseCount(1);
                    }
                } catch (error) {
                    console.error("Error liking post:", error);
                    // Rollback
                    setPosts(posts);
                    showToast("No se pudo dar like. Intenta de nuevo.", "error");
                }
            },
            handleToggleLike: async (postId: string) => {
                if (!authUser) return;
                const post = posts.find(p => p.id === postId);
                if (!post) return;
                const isLiked = post.likes?.includes(authUser.uid) || false;

                // Optimistic update
                setPosts(prev => prev.map(p =>
                    p.id === postId
                        ? {
                            ...p,
                            likes: isLiked
                                ? (p.likes || []).filter(uid => uid !== authUser.uid)
                                : [...(p.likes || []), authUser.uid]
                        }
                        : p
                ));

                try {
                    await toggleLikePost(postId, authUser.uid, isLiked, post.authorId);
                    // Sincronizar Pulso Global (+1)
                    if (!isLiked) {
                        await incrementPulseCount(1);
                    }
                } catch (error) {
                    console.error("Error toggling like:", error);
                    // Rollback
                    setPosts(posts);
                    showToast("Error al dar like.", "error");
                }
            },
            handleComment: async (postId: string, content: string) => {
                if (!authUser) return;
                const authorProfile = user || { name: authUser.displayName || 'Usuario' };
                await addCommentToPost(postId, {
                    authorId: authUser.uid,
                    authorName: (authorProfile as any).name || (authorProfile as any).surname ? `${(authorProfile as any).name} ${(authorProfile as any).surname}`.trim() : (authUser.displayName || 'Usuario'),
                    authorAvatar: (authorProfile as any).authorAvatar || (authorProfile as any).avatarUrl || authUser.photoURL || undefined,
                    text: content
                });
                // Sincronizar Pulso Global (+2 por comentario)
                await incrementPulseCount(2);
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
            handleSendMessage: async (content: string, asBusiness = false, type: 'text' | 'image' | 'system' = 'text', imageUrl?: string) => {
                if (!authUser) return;
                const userPlan = user?.plan || SubscriptionPlan.FREE;
                let senderId = authUser.uid;
                let senderName = user ? `${user.name} ${user.surname}` : (authUser.displayName || 'User');
                let senderAvatar = user?.avatarUrl || authUser.photoURL || undefined;

                if (asBusiness && user?.businessId && userPlan === SubscriptionPlan.PREMIUM) {
                    const business = businesses.find(b => b.id === user.businessId);
                    if (business) {
                        senderId = business.id;
                        senderName = business.name;
                        senderAvatar = business.imageUrl;
                    }
                }

                await sendMessage({
                    senderId,
                    senderName,
                    senderAvatar,
                    text: content,
                    type,
                    imageUrl,
                    isBusinessMessage: asBusiness
                });
                // Sincronizar Pulso Global (+5 por mensaje)
                await incrementPulseCount(5);
            },
            services,
            handleUpdateServices: async (newServices: ServiceCategory[]) => {
                await updateAppSettings('services_guide', { categories: newServices });
            },
            helpSupport,
            handleUpdateHelpSupport: async (newItems: HelpSupportItem[]) => {
                await updateAppSettings('help_support', { items: newItems });
            },
            handleToggleFollow: async (businessId: string) => {
                if (!authUser) {
                    setShowLogin(true);
                    return;
                }
                const isCurrentlyFollowing = followedBusinessIds.includes(businessId);

                // Optimistic Update
                setFollowedBusinessIds(prev =>
                    isCurrentlyFollowing
                        ? prev.filter(id => id !== businessId)
                        : [...prev, businessId]
                );

                try {
                    await toggleFollowBusiness(authUser.uid, businessId);
                } catch (error) {
                    console.error("Error toggling follow:", error);
                    // Rollback using latest state from scope
                    setFollowedBusinessIds(followedBusinessIds);
                    showToast("Error al seguir este negocio.", "error");
                }
            },
            filteredEvents,
            filteredBusinesses,
            pastEvents,
            followedBusinessIds,
            businessFollowers,
            isBusinessFollowed: (businessId: string) => followedBusinessIds.includes(businessId),
            notifications,
            markAllAsRead,
            unreadNotificationsCount,
            markAsRead: async (id: string) => {
                await markNotificationRead(id);
            },
            sendPushNotification: async (userId: string, title: string, body: string, type: string, metadata?: any) => {
                const validTypes: ('system' | 'community' | 'offer' | 'alert')[] = ['system', 'community', 'offer', 'alert'];
                const notificationType = validTypes.includes(type as any) ? type as any : 'system';
                await createNotification({ userId, title, body, type: notificationType, metadata });
            },
            incrementEventView: async (id: string) => {
                await incrementEventViewCount(id);
            },
            incrementEventClick: async (id: string) => {
                await serviceIncrementClick(id);
            },
            showPulseModal,
            setShowPulseModal,
            deletedBusinesses,
            showPulsePassModal,
            setShowPulsePassModal,
            customLocalities,
            customLocalitySectors,
            handleAddCustomLocality: async (name: string, coords: [number, number], hasBeach: boolean) => {
                try {
                    const sectors = [Sector.CENTRO, Sector.NORTE, Sector.SUR];
                    if (hasBeach) sectors.push(Sector.PLAYA);

                    await createCustomLocality({
                        name,
                        coords,
                        zoom: 15,
                        sectors,
                        createdBy: authUser?.uid || 'admin',
                        hasBeach
                    });
                    setCustomLocalities(prev => [...prev, { name, coords, zoom: 15 }]);
                    setCustomLocalitySectors(prev => ({ ...prev, [name]: sectors }));
                    showToast(`Localidad "${name}" creada exitosamente`, 'success');
                } catch (error) {
                    showToast('Error al crear localidad', 'error');
                }
            },
            handleDeleteCustomLocality: async (name: string) => {
                try {
                    const customs = await getCustomLocalities();
                    const toDelete = customs.find(c => c.name === name);
                    if (toDelete?.id) {
                        await deleteCustomLocality(toDelete.id);
                    }
                    setCustomLocalities(prev => prev.filter(l => l.name !== name));
                    setCustomLocalitySectors(prev => {
                        const newSectors = { ...prev };
                        delete newSectors[name];
                        return newSectors;
                    });
                    showToast(`Localidad "${name}" eliminada`, 'success');
                } catch (error) {
                    showToast('Error al eliminar localidad', 'error');
                }
            },
            setActiveView: (view: ViewType) => {
                const paths: Record<string, string> = {
                    'explore': '/',
                    'calendar': '/calendar',
                    'community': '/community',
                    'host': '/host',
                    'favorites': '/passport',
                    'history': '/history',
                    'plans': '/plans',
                    'all-favorites': '/saved-events',
                    'policies': '/policies'
                };
                if (paths[view]) navigate(paths[view]);
            },
            user,
            authUser,
            isAdmin,
            isSuperUser,
            isSuperAdmin
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
