import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, Calendar, Heart, User, Sparkles, X, Plus, Image as ImageIcon, CheckCircle, Zap, ExternalLink, LogOut, Mail, UserCircle, Store, Camera, Upload, Trash2, Edit3, Search, SlidersHorizontal, Navigation, Layers, Minus, Clock, MapPin, ArrowRight, Settings, ChevronLeft, ChevronRight, MessageCircle, Phone, CreditCard, Banknote, ShieldCheck, Palmtree, Mountain, Activity, Users, Sun, Moon, Eye } from 'lucide-react';
import { getToken } from 'firebase/messaging';
import { messaging } from './firebase.config';
import { saveFCMToken, getUser, createUser, updateUser, createBusiness, updateBusiness, deleteBusiness, subscribeToEvents, createEvent, updateEvent, deleteEvent, subscribeToBusinesses, updateAppSettings, toggleRSVP, subscribeToUserRSVPs, incrementVisitCount, subscribeToVisitCount } from './services/firestoreService';
import { PageLoader as PremiumLoader } from './components/common/PageLoader';
import { ViewType, Sector, MontanitaEvent, Vibe, UserProfile, Business, SubscriptionPlan, BusinessCategory } from './types';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { MOCK_EVENTS, SECTOR_INFO, MOCK_BUSINESSES, SECTOR_POLYGONS, PLAN_LIMITS, PLAN_PRICES, DEFAULT_PAYMENT_DETAILS, LOCALITIES, LOCALITY_SECTORS, LOCALITY_POLYGONS, MAP_ICONS, DEFAULT_NEW_LOCALITY_SECTORS } from './constants';
import { getSmartRecommendations, generateEventDescription } from './services/geminiService';
import { useAuthContext } from './context/AuthContext';
import { logout, isSuperAdmin as checkSuperAdmin, updateUserProfile } from './services/authService';
import { compressImage } from './utils/imageUtils';
import { BottomNav } from './components/Layout/BottomNav';
import { Sidebar } from './components/Layout/Sidebar';
import { useToast } from './context/ToastContext';
import { useData } from './context/DataContext';
import { useTranslation } from 'react-i18next';
import { useTheme } from './hooks/useTheme';

// Lazy load heavy components
const EventCard = lazy(() => import('./components/EventCard').then(m => ({ default: m.EventCard })));
const EventModal = lazy(() => import('./components/EventModal').then(m => ({ default: m.EventModal })));
const MigrationPanel = lazy(() => import('./components/MigrationPanel').then(m => ({ default: m.MigrationPanel })));
const LoginScreen = lazy(() => import('./components/LoginScreen').then(m => ({ default: m.LoginScreen })));
const PulsePassModal = lazy(() => import('./components/Modals/PulsePassModal').then(m => ({ default: m.PulsePassModal })));
const BusinessEditModal = lazy(() => import('./components/Modals/BusinessEditModal').then(m => ({ default: m.BusinessEditModal })));
const EventEditorModal = lazy(() => import('./components/Modals/EventEditorModal').then(m => ({ default: m.EventEditorModal })));
const PublicProfileModal = lazy(() => import('./components/PublicProfileModal').then(m => ({ default: m.PublicProfileModal })));

// Lazy load pages for better performance
const Notifications = lazy(() => import('./pages/Notifications').then(m => ({ default: m.Notifications })));
const Passport = lazy(() => import('./pages/Passport').then(m => ({ default: m.Passport })));
const Explore = lazy(() => import('./pages/Explore').then(m => ({ default: m.Explore })));
const InfoPage = lazy(() => import('./pages/InfoPage').then(m => ({ default: m.InfoPage })));
const CalendarPage = lazy(() => import('./pages/Calendar').then(m => ({ default: m.Calendar })));
const History = lazy(() => import('./pages/History').then(m => ({ default: m.History })));
const Plans = lazy(() => import('./pages/Plans').then(m => ({ default: m.Plans })));
const Policies = lazy(() => import('./pages/Policies').then(m => ({ default: m.Policies })));

const PageLoader = () => <PremiumLoader message="Iniciando MontaPulse..." />;

export const suggestIconFromDescription = (description: string): string => {
  const desc = (description || '').toLowerCase();

  if (desc.includes('pizza') || desc.includes('hamburguesa') || desc.includes('restaurante') || desc.includes('comida') || desc.includes('cena') || desc.includes('almuerzo') || desc.includes('food')) return 'food';
  if (desc.includes('cocktail') || desc.includes('coctel') || desc.includes('trago') || desc.includes('bar') || desc.includes('cerveza') || desc.includes('copa') || desc.includes('drink')) return 'cocktail';
  if (desc.includes('café') || desc.includes('coffee') || desc.includes('brunch') || desc.includes('desayuno')) return 'coffee';
  if (desc.includes('baile') || desc.includes('fiesta') || desc.includes('party') || desc.includes('discoteca') || desc.includes('club') || desc.includes('dj') || desc.includes('musica') || desc.includes('música')) return 'music';
  if (desc.includes('hotel') || desc.includes('hostal') || desc.includes('alojamiento') || desc.includes('hospedaje') || desc.includes('stay') || desc.includes('cama')) return 'hotel';
  if (desc.includes('surf') || desc.includes('tabla') || desc.includes('ola') || desc.includes('waves')) return 'surf';
  if (desc.includes('playa') || desc.includes('mar') || desc.includes('arena') || desc.includes('malecón') || desc.includes('costa')) return 'palmtree';
  if (desc.includes('montaña') || desc.includes('cerro') || desc.includes('senderismo') || desc.includes('mountain') || desc.includes('tigrillo')) return 'mountain';
  if (desc.includes('iglesia') || desc.includes('parque') || desc.includes('pueblo') || desc.includes('centro') || desc.includes('cultura')) return 'church';
  if (desc.includes('compras') || desc.includes('tienda') || desc.includes('mercado') || desc.includes('ropa') || desc.includes('shop') || desc.includes('market')) return 'shopping';
  if (desc.includes('bus') || desc.includes('terminal') || desc.includes('transporte') || desc.includes('clp') || desc.includes('carro') || desc.includes('taxi')) return 'bus';
  if (desc.includes('mirador') || desc.includes('vista') || desc.includes('foto') || desc.includes('sunset') || desc.includes('atardecer') || desc.includes('camera')) return 'camera';
  if (desc.includes('paz') || desc.includes('verde') || desc.includes('hoja') || desc.includes('naturaleza') || desc.includes('eco')) return 'leaf';

  return 'palmtree';
};

const Dashboard: React.FC = () => {
  const { user, authUser, isAdmin, isSuperAdmin, isSuperUser, logout, setUser } = useAuthContext();
  const { theme, setTheme, isAuto, setIsAuto } = useTheme();
  const { showToast, showConfirm } = useToast();
  const {
    events,
    eventsWithLiveCounts,
    businesses,
    setBusinesses,
    allUsers,
    favorites, setFavorites,
    favoritedEvents,
    paymentDetails, setPaymentDetails,
    showLogin, setShowLogin,
    regForm, setRegForm,
    bizForm, setBizForm,
    rsvpStatus,
    handleRegister,
    handleBusinessRegister,
    handleRSVP,
    handleDeleteEvent,
    handleSaveEvent,
    handleOpenNewEventWizard,
    handleEditEvent,
    showHostWizard, setShowHostWizard,
    newEvent, setNewEvent,
    isGeneratingDesc,
    generatedDesc, setGeneratedDesc,
    handleGenerateAIEvent,
    selectedEvent, setSelectedEvent,
    toggleFavorite,
    agendaRange, setAgendaRange,
    isCalendarFilterActive, setIsCalendarFilterActive,
    calendarBaseDate, setCalendarBaseDate,
    showCalendarModal, setShowCalendarModal,
    showPulsePassModal, setShowPulsePassModal,
    sectorPolygons, setSectorPolygons,
    sectorLabels, setSectorLabels,
    currentLocality, setCurrentLocality,
    selectedSector, setSelectedSector,
    activeFilter, setActiveFilter,
    loading,
    searchQuery, setSearchQuery,
    selectedMood, setSelectedMood,
    notifications, markAllAsRead, unreadNotificationsCount,
    pastEvents,
    filteredEvents,
    filteredBusinesses,
    journeyCards, setJourneyCards,
    toggleSector,
    handleDeleteBusiness,
    showBusinessEdit, setShowBusinessEdit,
    showProfileEdit, setShowProfileEdit,
    editingBusinessId, setEditingBusinessId,
    showPaymentEdit, setShowPaymentEdit,
    showMigrationPanel, setShowMigrationPanel,
    showBusinessReg, setShowBusinessReg,
    showPublicProfile, setShowPublicProfile,
    publicProfileId, setPublicProfileId,
    publicProfileType, setPublicProfileType,
    handleUpdateBusinessProfile,
    handleUpdatePaymentDetails,
    handleCreateBusinessOnMap,
    handleUpdateBusinessLocation,
    isPanelMinimized, setIsPanelMinimized,
    isNearbyMinimized, setIsNearbyMinimized,
    isEditorFocus, setIsEditorFocus,
    editingEventId, setEditingEventId,
    activeView,
    navigationEvents,
    navigateToNextEvent, navigateToPreviousEvent,
    hasNextEvent, hasPreviousEvent,
    handleCreatePost, handleToggleLike,
    handleAddPoints, handleRedeemPoints, handleTogglePulsePass,
    handleSendMessage, messages,
    posts,
    services, handleUpdateServices,
    handleToggleFollow, isBusinessFollowed,
    setActiveView,
    customLocalities
  } = useData();


  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRecData, setAiRecData] = useState<any>(null);
  const [visitCount, setVisitCount] = useState<number>(0);

  useEffect(() => {
    // Increment visit count on mount
    incrementVisitCount();
    // Subscribe to visit count updates
    const unsubscribe = subscribeToVisitCount((count) => {
      setVisitCount(count);
    });
    return () => unsubscribe();
  }, []);

  const handleUpdatePlan = (plan: SubscriptionPlan) => {
    if (!user) return;
    updateUser(user.id, { plan }).then(() => {
      showToast(`Plan actualizado a ${plan}`, 'success');
    });
  };

  const handleAiAsk = async (query: string) => {
    setIsAiLoading(true);
    try {
      const result = await getSmartRecommendations(events, query);
      setAiRecData(result);
    } catch (err) {
      showToast("Error al consultar a la IA", "error");
    } finally {
      setIsAiLoading(false);
    }
  };

  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && messaging) {
      const requestPermission = async () => {
        try {
          const permission = await Notification.requestPermission();
          if (permission === 'granted') {
            let vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
              console.warn('VITE_FIREBASE_VAPID_KEY is missing. Push notifications will not be active.');
              return;
            }
            vapidKey = vapidKey.trim().replace(/\s/g, '');
            if (vapidKey.includes('PLACEHOLDER')) {
              console.warn('VITE_FIREBASE_VAPID_KEY is a placeholder. Push notifications will not be active.');
              return;
            }

            try {
              const token = await getToken(messaging, { vapidKey });
              if (token) {
                await saveFCMToken(user.id, token);
                console.log('FCM Token generated and saved');
              }
            } catch (atobError) {
              console.error('Invalid VAPID key format:', atobError);
            }
          }
        } catch (error) {
          console.error('Error requesting notification permission:', error);
        }
      };
      requestPermission();
    }
  }, [user]);

  React.useEffect(() => {
    const path = location.pathname;
    if (path === '/' || path === '/explore' || path.startsWith('/evento/')) setActiveView('explore');
    else if (path.startsWith('/negocio/')) setActiveView('services');
    else if (path === '/calendar') setActiveView('calendar');
    else if (path === '/community' || path === '/chat') setActiveView('community');
    else if (path === '/passport') setActiveView('favorites');
    else if (path === '/history') setActiveView('history');
    else if (path === '/plans') setActiveView('plans');
    else if (path === '/saved-events') setActiveView('all-favorites');
    
    else if (path === '/info') setActiveView('info');
    else if (path === '/services') setActiveView('services');
    else if (path === '/policies') setActiveView('policies');
  }, [location.pathname]);

  const urlToStateRef = React.useRef<string>('');
  const hasProcessedUrlRef = React.useRef(false);
  
  // Sincronizar URL hacia el estado (solo al cargar la página, no cuando el usuario abre algo)
  React.useEffect(() => {
    if (hasProcessedUrlRef.current) return;
    
    const path = location.pathname;
    const searchParams = new URLSearchParams(location.search);
    const hasEventUrl = path.startsWith('/evento/') || searchParams.has('event');
    const hasBusinessUrl = path.startsWith('/negocio/') || searchParams.has('business');
    
    if (!hasEventUrl && !hasBusinessUrl) {
      hasProcessedUrlRef.current = true;
      return;
    }
    
    let processed = false;
    let shouldMarkProcessed = false;
    
    // Parsear Slugs de la URL
    if (path.startsWith('/evento/')) {
      const slug = path.replace('/evento/', '');
      if (eventsWithLiveCounts.length > 0) {
        shouldMarkProcessed = true;
        const event = eventsWithLiveCounts.find(e => e.slug === slug || e.id === slug);
        if (event) {
          setSelectedEvent(event);
          processed = true;
        }
      }
    } else if (path.startsWith('/negocio/')) {
      const slug = path.replace('/negocio/', '');
      if (businesses.length > 0) {
        shouldMarkProcessed = true;
        urlToStateRef.current = path;
        const business = businesses.find(b => b.slug === slug || b.id === slug);
        if (business) {
          setPublicProfileId(business.id);
          setPublicProfileType('business');
          setShowPublicProfile(true);
          processed = true;
        }
      }
    }
    
    // Compatibilidad hacia atrás (URL Params antiguos)
    const eventId = searchParams.get('event');
    if (eventId && eventsWithLiveCounts.length > 0) {
       shouldMarkProcessed = true;
       const event = eventsWithLiveCounts.find(e => e.id === eventId);
       if (event) {
         setSelectedEvent(event);
         processed = true;
       }
    }
    const bizId = searchParams.get('business');
    if (bizId && businesses.length > 0) {
       shouldMarkProcessed = true;
       const biz = businesses.find(b => b.id === bizId);
       if (biz) {
         setPublicProfileId(biz.id);
         setPublicProfileType('business');
         setShowPublicProfile(true);
         processed = true;
       }
    }

    if (processed || shouldMarkProcessed) {
      hasProcessedUrlRef.current = true;
    }
  }, [businesses, eventsWithLiveCounts, selectedEvent]);

  const prevUrlRef = React.useRef<string>('');
  const prevShowPublicProfileRef = React.useRef(false);
  const businessesRef = React.useRef(businesses);
  businessesRef.current = businesses;
  
  // Modal open prevention flag
  const modalOpenBlockRef = React.useRef(false);
  
  // Block modal from opening if already open with same ID (prevents flicker)
  React.useEffect(() => {
    if (showPublicProfile && publicProfileId && modalOpenBlockRef.current) {
      // Modal already open with different ID, don't reopen
      modalOpenBlockRef.current = false;
    } else if (!showPublicProfile) {
      modalOpenBlockRef.current = false;
    }
  }, [showPublicProfile, publicProfileId]);
  
  // Sincronizar estado hacia la URL (cuando se abren/cierran modales)
  React.useEffect(() => {
    const currentPath = location.pathname;
    
    // Only run when modal actually opens/closes, not on every render
    if (prevShowPublicProfileRef.current === showPublicProfile) {
      if (prevUrlRef.current === currentPath) return;
    }
    prevShowPublicProfileRef.current = showPublicProfile;
    
    if (selectedEvent) {
      const slug = selectedEvent.slug || selectedEvent.id;
      if (!currentPath.includes(`/evento/${slug}`)) {
         prevUrlRef.current = `/evento/${slug}`;
         window.history.replaceState(null, '', `/evento/${slug}`);
      }
    } else if (showPublicProfile && publicProfileType === 'business' && publicProfileId) {
       const business = businessesRef.current.find(b => b.id === publicProfileId);
       if (business) {
         const slug = business.slug || business.id;
         if (!currentPath.includes(`/negocio/${slug}`)) {
            prevUrlRef.current = `/negocio/${slug}`;
            window.history.replaceState(null, '', `/negocio/${slug}`);
         }
       }
    } else if (activeView === 'services' && currentPath.startsWith('/negocio/')) {
        // Limpiar la URL a /services si se cerró el modal estando en la vista de servicios
        if (hasProcessedUrlRef.current) {
           prevUrlRef.current = '/services';
           window.history.replaceState(null, '', '/services');
        }
    } else if (activeView === 'explore' && (currentPath.startsWith('/evento/') || currentPath.startsWith('/negocio/'))) {
       // Solo limpiar la URL a /explore si ya se procesó el deep-link inicial
       if (hasProcessedUrlRef.current) {
          prevUrlRef.current = '/explore';
          window.history.replaceState(null, '', '/explore');
       }
    }
  }, [selectedEvent, showPublicProfile, publicProfileId, publicProfileType, activeView]);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [managementTab, setManagementTab] = useState<'users' | 'businesses' | 'stats'>('users');
  const [focusMapCoords, setFocusMapCoords] = useState<{ coords: [number, number]; zoom: number } | null>(null);

  const resizeRefreshRef = React.useRef(false);
  React.useEffect(() => {
    if (activeView === 'explore' && !resizeRefreshRef.current) {
      resizeRefreshRef.current = true;
      setTimeout(() => window.dispatchEvent(new Event('resize')), 100);
    }
  }, [activeView]);

  const bizEditFileInputRef = useRef<HTMLInputElement>(null);
  const bizEditCameraInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const profileCameraInputRef = useRef<HTMLInputElement>(null);

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        const compressedBase64 = await compressImage(file, { maxWidth: 300, maxHeight: 300, quality: 0.7, squareCrop: true });
        setUser({ ...user, avatarUrl: compressedBase64 });
      } catch (error) {
        showToast("Error al procesar la imagen.", 'error');
      }
    }
  };

  const handleUpdateUserProfile = async () => {
    if (!user) return;
    try {
      await updateUser(user.id, {
        name: user.name,
        surname: user.surname,
        email: user.email,
        preferredVibe: user.preferredVibe,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
        businessId: user.businessId || null,
        plan: user.plan || SubscriptionPlan.FREE
      });
      setShowProfileEdit(false);
      showToast("Perfil actualizado correctamente.", 'success');
    } catch (error) {
      showToast(`Error al actualizar perfil: ${error}`, 'error');
    }
  };

  const handleUpdateSectorGeometry = (sector: Sector, coords: [number, number][]) => {
    setSectorPolygons(prev => ({ ...prev, [sector]: coords }));
  };

  const handleEditBusinessInDashboard = (id: string) => {
    setEditingBusinessId(id);
    setShowBusinessEdit(true);
  };

  const userBusiness = useMemo(() => {
    if (user?.businessId) {
      const business = businesses.find(b => b.id === user.businessId);
      if (business) return business;
    }
    if (authUser?.uid) {
      const byOwner = businesses.find(b => b.ownerId === authUser.uid);
      if (byOwner) return byOwner;
    }
    if (user?.email) {
      const byEmail = businesses.find(b => b.email?.toLowerCase() === user.email?.toLowerCase());
      if (byEmail) return byEmail;
    }
    return null;
  }, [user, businesses, authUser]);

  const isPremiumUser = user?.plan && [
    SubscriptionPlan.PRO,
    SubscriptionPlan.ELITE,
    SubscriptionPlan.EXPERT
  ].includes(user.plan as SubscriptionPlan);

  const isEliteUser = user?.plan && [
    SubscriptionPlan.ELITE,
    SubscriptionPlan.EXPERT
  ].includes(user.plan as SubscriptionPlan);

  const canEditAllBusiness = isAdmin || isSuperUser;
  const canEditOwnBusiness = isPremiumUser && userBusiness;

  const canUserEditBusiness = (id: string): boolean => {
    if (canEditAllBusiness) return true;
    if (canEditOwnBusiness && id === user?.businessId) return true;
    return false;
  };

  const handleEditBusiness = (id: string) => {
    if (!canUserEditBusiness(id)) {
      showToast('Solo puedes editar tu propio negocio', 'error');
      return;
    }
    setEditingBusinessId(id);
    setShowBusinessEdit(true);
  };

  const handleAddBusinessMap = (lat: number, lng: number) => {
    // Permisos: Administradores o Usuarios Elite (pueden crear nuevos) o Dueños de negocio Pro (pueden mover el suyo)
    if (!canEditAllBusiness && !isEliteUser && !userBusiness) return;
    
    const businessData = userBusiness || { 
      name: '', 
      icon: 'store', 
      description: '', 
      imageUrl: '', 
      whatsapp: '', 
      phone: '', 
      instagram: '', 
      category: BusinessCategory.OTRO, 
      email: '' 
    };

    setBizForm({
      name: businessData.name || '',
      locality: currentLocality.name,
      sector: Sector.CENTRO,
      icon: businessData.icon || 'store',
      description: businessData.description || '',
      imageUrl: businessData.imageUrl || '',
      whatsapp: businessData.whatsapp || '',
      phone: businessData.phone || '',
      instagram: businessData.instagram || '',
      category: businessData.category || BusinessCategory.OTRO,
      coordinates: [lat, lng],
      email: businessData.email || ''
    });
    setShowBusinessReg(true);
  };

  const renderView = () => {
    switch (activeView) {
      case 'explore':
        return (
          <ErrorBoundary name="Explore">
            <Suspense fallback={<PageLoader />}>
              <Explore
                onEditBusiness={canEditAllBusiness ? handleEditBusiness : (canEditOwnBusiness ? handleEditBusiness : undefined)}
                userBusinessId={userBusiness?.id}
                focusCoords={focusMapCoords}
                onClearFocusCoords={() => setFocusMapCoords(null)}
              />
            </Suspense>
          </ErrorBoundary>
        );
      case 'calendar':
        return (
          <ErrorBoundary name="Calendar">
            <Suspense fallback={<PageLoader />}>
              <CalendarPage />
            </Suspense>
          </ErrorBoundary>
        );
      case 'favorites':
        return (
          <ErrorBoundary name="Passport">
            <Suspense fallback={<PageLoader />}>
              <Passport onNavigate={setActiveView} />
            </Suspense>
          </ErrorBoundary>
        );
      case 'history':
        return (
          <ErrorBoundary name="History">
            <Suspense fallback={<PageLoader />}>
              <History />
            </Suspense>
          </ErrorBoundary>
        );
      case 'plans':
        return (
          <ErrorBoundary name="Plans">
            <Suspense fallback={<PageLoader />}>
              <Plans />
            </Suspense>
          </ErrorBoundary>
        );
      case 'community':
      case 'chat':
        return (
          <ErrorBoundary name="Community">
            <Suspense fallback={<PageLoader />}>
              <Notifications />
            </Suspense>
          </ErrorBoundary>
        );
      case 'policies':
        return (
          <ErrorBoundary name="Policies">
            <Suspense fallback={<PageLoader />}>
              <Policies />
            </Suspense>
          </ErrorBoundary>
        );
      case 'info':
        return (
          <ErrorBoundary name="Info">
            <Suspense fallback={<PageLoader />}>
              <InfoPage />
            </Suspense>
          </ErrorBoundary>
        );
      default:
        return (
          <ErrorBoundary name="Default Explore">
            <Suspense fallback={<PageLoader />}>
              <Explore 
                onEditBusiness={handleEditBusiness} 
                focusCoords={focusMapCoords}
                onClearFocusCoords={() => setFocusMapCoords(null)}
              />
            </Suspense>
          </ErrorBoundary>
        );
    }
  };

  return (
    <div className={`relative h-[100dvh] w-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden flex flex-row font-sans select-none transition-colors duration-500`}>
      <Sidebar />
      <div className={`flex-1 flex flex-col h-full relative ${['favorites', 'admin-users', 'policies', 'plans', 'calendar', 'info', 'history', 'services'].includes(activeView) ? 'overflow-y-auto' : 'overflow-hidden'}`}>
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-[var(--glass)] backdrop-blur-xl border-b border-[var(--glass-border)] h-16 flex items-center justify-between px-6 transition-colors duration-500">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
              <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
            </div>
            <div className="flex flex-col">
              <span className="text-base font-black tracking-tighter text-white leading-none uppercase">ubicame.info</span>
              <span className="text-[10px] font-black tracking-[0.3em] text-orange-500 leading-none mt-0.5">PULSE</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div 
              className="px-3.5 py-2.5 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20 flex items-center gap-2 font-mono font-bold text-sm shadow-sm"
              title="Contador de visitas"
            >
              <Eye className="w-5 h-5 animate-pulse" />
              <span>{visitCount.toLocaleString()}</span>
            </div>

            {user && (
              <div className="flex items-center gap-2.5 pr-2">
                {user.plan !== 'Expert' && (
                  <button 
                    onClick={() => navigate('/plans')}
                    className="p-3 bg-orange-500 text-white rounded-xl shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                    title="Mejorar Plan"
                  >
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </button>
                )}
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:inline">{user.name}</span>
                  <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded border leading-none ${
                    user.role === 'admin' ? 'text-amber-500 bg-amber-500/10 border-amber-500/20' :
                    user.role === 'host' ? 'text-blue-500 bg-blue-500/10 border-blue-500/20' :
                    'text-green-500 bg-green-500/10 border-green-500/20'
                  }`}>
                    {user.role === 'admin' ? (isSuperAdmin ? 'King Admin' : 'Admin') : 
                     user.role === 'host' ? 'Host' : 'Visitor'}
                  </span>
                </div>
                <div className="w-8 h-8 rounded-xl border border-orange-500/50 overflow-hidden ring-2 ring-orange-500/20 shadow-lg cursor-pointer" onClick={() => navigate('/passport')}>
                  <img src={user.avatarUrl} className="w-full h-full object-cover" alt="User avatar" />
                </div>
                <button
                  onClick={logout}
                  className="p-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl transition-all active:scale-90 border border-orange-500/20"
                  title="Cerrar Sesión"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            )}
            





            <div className="flex flex-col items-end opacity-20">
              <span className="text-[7px] font-bold text-slate-500 mt-1 uppercase tracking-widest leading-none">v1.0.4 ME</span>
            </div>
          </div>
        </div>

        <main className={`flex-1 lg:pt-0 pt-16 ${['favorites', 'policies', 'plans', 'calendar', 'info', 'history'].includes(activeView) ? 'overflow-y-auto' : 'overflow-hidden'}`} style={{ height: ['favorites', 'policies', 'plans', 'calendar', 'info', 'history'].includes(activeView) ? 'auto' : '100%', minHeight: '0' }}>
          {renderView()}
        </main>
      </div>

      <BottomNav />

      {showBusinessReg && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[2000] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <BusinessEditModal
            isRegistration
            onClose={() => {
              setShowBusinessReg(false);
              [50, 200, 500, 1000].forEach(delay =>
                setTimeout(() => window.dispatchEvent(new Event('resize')), delay)
              );
            }}
          />
        </Suspense>
      )}

      <Suspense fallback={null}>
        <EventEditorModal />
      </Suspense>

      {showProfileEdit && user && (
        <div className="fixed inset-0 z-[2100] bg-slate-900/80 backdrop-blur-md flex items-end justify-center">
          <div className="w-full max-w-lg bg-slate-900 rounded-t-[3.5rem] p-8 pb-12 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white">Edit Profile</h2>
              <button onClick={() => setShowProfileEdit(false)} className="p-2 rounded-full hover:bg-slate-800">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Nombre</label>
                  <input
                    type="text"
                    value={user.name}
                    onChange={(e) => setUser({ ...user, name: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Apellido</label>
                  <input
                    type="text"
                    value={user.surname}
                    onChange={(e) => setUser({ ...user, surname: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Email</label>
                <input
                  type="email"
                  value={user.email}
                  onChange={(e) => setUser({ ...user, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Preferred Vibe</label>
                <select
                  value={user.preferredVibe}
                  onChange={(e) => setUser({ ...user, preferredVibe: e.target.value as Vibe })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                >
                  {Object.values(Vibe).map(v => (
                    <option key={v} value={v}>{v}</option>
                  ))}
                </select>
              </div>

              <input
                type="file"
                ref={profileFileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleProfileImageUpload}
              />
              <input
                type="file"
                ref={profileCameraInputRef}
                className="hidden"
                accept="image/*"
                capture="environment"
                onChange={handleProfileImageUpload}
              />

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Profile Picture</label>
                <div className="flex items-center gap-4">
                  <div className="relative w-24 h-24 rounded-full bg-slate-800 border-2 border-slate-700 overflow-hidden shrink-0">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt="Preview" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-600">
                        <User className="w-10 h-10" />
                      </div>
                    )}
                    {user.avatarUrl && (
                      <button
                        onClick={() => setUser({ ...user, avatarUrl: '' })}
                        className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"
                      >
                        <X className="w-8 h-8 text-white" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-col gap-2 w-full">
                    <button
                      onClick={() => profileFileInputRef.current?.click()}
                      className="bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2"
                    >
                      <ImageIcon className="w-4 h-4" /> Upload Photo
                    </button>
                    <button
                      onClick={() => profileCameraInputRef.current?.click()}
                      className="bg-slate-800 text-white px-4 py-3 rounded-xl text-sm font-bold hover:bg-slate-700 transition flex items-center justify-center gap-2"
                    >
                      <Camera className="w-4 h-4" /> Take Photo
                    </button>
                  </div>
                </div>
              </div>

              <button
                onClick={handleUpdateUserProfile}
                className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {showBusinessEdit && (
        <Suspense fallback={<PageLoader />}>
          <BusinessEditModal
            onClose={() => {
              setShowBusinessEdit(false);
              setEditingBusinessId(null);
            }}
          />
        </Suspense>
      )}

      {showPaymentEdit && isAdmin && (
        <div className="fixed inset-0 z-[2100] bg-slate-900/80 backdrop-blur-md flex items-end justify-center">
          <div className="w-full max-w-lg bg-slate-900 rounded-t-[3.5rem] p-8 pb-12 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white">Editar Formas de Pago</h2>
              <button onClick={() => setShowPaymentEdit(false)} className="p-2 rounded-full hover:bg-slate-800">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Región/Banco (Header)</label>
                <input
                  type="text"
                  value={paymentDetails.bankRegion}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, bankRegion: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                  placeholder="Ej: Pichincha (Ecuador)"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Nombre del Banco</label>
                  <input
                    type="text"
                    value={paymentDetails.bankName}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, bankName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Tipo de Cuenta</label>
                  <input
                    type="text"
                    value={paymentDetails.accountType}
                    onChange={(e) => setPaymentDetails({ ...paymentDetails, accountType: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Número de Cuenta</label>
                <input
                  type="text"
                  value={paymentDetails.accountNumber}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, accountNumber: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Titular de la Cuenta</label>
                <input
                  type="text"
                  value={paymentDetails.accountOwner}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, accountOwner: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">ID / RUC</label>
                <input
                  type="text"
                  value={paymentDetails.idNumber}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, idNumber: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                />
              </div>

              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">WhatsApp de Contacto (incluir código país)</label>
                <input
                  type="text"
                  value={paymentDetails.whatsappNumber}
                  onChange={(e) => setPaymentDetails({ ...paymentDetails, whatsappNumber: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                  placeholder="Ej: 593980000000"
                />
              </div>

              <button
                onClick={handleUpdatePaymentDetails}
                className="w-full bg-orange-500 text-white font-black py-4 rounded-2xl hover:bg-orange-600 transition"
              >
                Guardar Cambios
              </button>
            </div>
          </div>
        </div>
      )}


      <Suspense fallback={null}>
        <PulsePassModal
          isOpen={showPulsePassModal}
          onClose={() => setShowPulsePassModal(false)}
        />
      </Suspense>



      {/* Global Login Modal Overlay */}
      {showLogin && !user && (
        <div className="fixed inset-0 z-[5000] bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
          <Suspense fallback={<PageLoader />}>
            <LoginScreen />
          </Suspense>
          <div className="absolute top-6 right-6 z-[100]">
            <button
              onClick={() => {
                setShowLogin(false);
                navigate('/explore');
              }}
              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>
      )}

      {/* Event Modal with Navigation */}
      {selectedEvent && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[4000] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <EventModal
            key={selectedEvent.id}
            event={selectedEvent}
            business={businesses.find(b => b.id === selectedEvent.businessId)}
            dataLoading={loading}
            onClose={() => setSelectedEvent(null)}
            onNext={navigateToNextEvent}
            onPrevious={navigateToPreviousEvent}
            hasNext={hasNextEvent}
            hasPrevious={hasPreviousEvent}
            isAdmin={canEditAllBusiness}
            onEdit={event => {
              handleEditEvent(event);
              setSelectedEvent(null);
            }}
            onDelete={id => {
              handleDeleteEvent(id);
              setSelectedEvent(null);
            }}
            onEditBusiness={handleEditBusiness}
            onRsvp={() => handleRSVP(selectedEvent.id)}
            isRsvp={!!rsvpStatus[selectedEvent.id]}
          />
        </Suspense>
      )}

      {/* Public Profile Modal */}
      {showPublicProfile && (
        <Suspense fallback={
          <div className="fixed inset-0 z-[4000] bg-black/60 backdrop-blur-sm flex items-center justify-center">
            <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        }>
          <PublicProfileModal
            isOpen={showPublicProfile}
            onClose={() => {
              setShowPublicProfile(false);
              setPublicProfileId(null);
            }}
            businessId={publicProfileType === 'business' ? publicProfileId || undefined : undefined}
            userId={publicProfileType === 'user' ? publicProfileId || undefined : undefined}
            dataLoading={loading}
            onEditBusiness={(business) => handleEditBusiness(business.id)}
            onDeleteBusiness={handleDeleteBusiness}
            canEditAll={canEditAllBusiness}
            onViewOnMap={(coords) => {
              setFocusMapCoords({ coords, zoom: 19 });
              setActiveView('explore');
              setShowPublicProfile(false);
              setIsPanelMinimized(true);
            }}
          />
        </Suspense>
      )}
      {showMigrationPanel && (
        <Suspense fallback={null}>
          <MigrationPanel onClose={() => setShowMigrationPanel(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default function App() {
  const { loading } = useAuthContext();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400 text-sm font-bold tracking-widest uppercase">Cargando...</p>
        </div>
      </div>
    );
  }

  return <Dashboard />;
}


