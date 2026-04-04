import React, { useState, useMemo, useRef, useEffect, lazy, Suspense } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, Calendar, Heart, User, Sparkles, X, Plus, Image as ImageIcon, CheckCircle, Zap, ExternalLink, LogOut, Mail, UserCircle, Store, Camera, Upload, Trash2, Edit3, Search, SlidersHorizontal, Navigation, Layers, Minus, Clock, MapPin, ArrowRight, Settings, ChevronLeft, ChevronRight, MessageCircle, Phone, CreditCard, Banknote, ShieldCheck, Palmtree, Mountain, Activity, Users, Sun, Moon } from 'lucide-react';
import { MapView } from './components/MapView.tsx';
import { EventCard } from './components/EventCard.tsx';
import { EventModal } from './components/EventModal.tsx';
import { getToken } from 'firebase/messaging';
import { messaging } from './firebase.config.ts';
import { saveFCMToken } from './services/firestoreService.ts';
import { MigrationPanel } from './components/MigrationPanel.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';

// Lazy load pages for better performance
const Community = lazy(() => import('./pages/Community.tsx').then(m => ({ default: m.Community })));
const Passport = lazy(() => import('./pages/Passport.tsx').then(m => ({ default: m.Passport })));
const Explore = lazy(() => import('./pages/Explore.tsx').then(m => ({ default: m.Explore })));
const InfoPage = lazy(() => import('./pages/InfoPage.tsx').then(m => ({ default: m.InfoPage })));
const CalendarPage = lazy(() => import('./pages/Calendar.tsx').then(m => ({ default: m.Calendar })));
const History = lazy(() => import('./pages/History.tsx').then(m => ({ default: m.History })));
const Plans = lazy(() => import('./pages/Plans.tsx').then(m => ({ default: m.Plans })));
const AdminUsers = lazy(() => import('./pages/AdminUsers.tsx').then(m => ({ default: m.AdminUsers })));
const Policies = lazy(() => import('./pages/Policies.tsx').then(m => ({ default: m.Policies })));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-12 h-12 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);
import { ViewType, Sector, MontanitaEvent, Vibe, UserProfile, Business, SubscriptionPlan, BusinessCategory } from './types.ts';
import { MOCK_EVENTS, SECTOR_INFO, MOCK_BUSINESSES, SECTOR_POLYGONS, PLAN_LIMITS, PLAN_PRICES, DEFAULT_PAYMENT_DETAILS, LOCALITIES, LOCALITY_SECTORS, LOCALITY_POLYGONS, MAP_ICONS, DEFAULT_NEW_LOCALITY_SECTORS } from './constants.ts';
import { getSmartRecommendations, generateEventDescription } from './services/geminiService.ts';
import { useAuthContext } from './context/AuthContext.tsx';
import { logout, isSuperAdmin as checkSuperAdmin, updateUserProfile } from './services/authService.ts';
import {
  getUser, createUser, updateUser, createBusiness, updateBusiness, deleteBusiness,
  subscribeToEvents, createEvent, updateEvent, deleteEvent,
  subscribeToBusinesses, subscribeToAppSettings, updateAppSettings,
  toggleRSVP, subscribeToUserRSVPs, subscribeToUsers
} from './services/firestoreService.ts';
import { compressImage } from './utils/imageUtils.ts';
import { BottomNav } from './components/Layout/BottomNav.tsx';
import { Sidebar } from './components/Layout/Sidebar.tsx';
import { PulseModal } from './components/Modals/PulseModal.tsx';
import { PulsePassModal } from './components/Modals/PulsePassModal.tsx';
import { useToast } from './context/ToastContext.tsx';
import { useData } from './context/DataContext.tsx';
import { useTranslation } from 'react-i18next';
import { BusinessEditModal } from './components/Modals/BusinessEditModal.tsx';
import { EventEditorModal } from './components/Modals/EventEditorModal.tsx';
import { PublicProfileModal } from './components/PublicProfileModal.tsx';
import { useTheme } from './hooks/useTheme.ts';

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
    showPulseModal, setShowPulseModal,
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

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiRecData, setAiRecData] = useState<any>(null);

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
    if (path === '/' || path === '/explore') setActiveView('explore');
    else if (path === '/calendar') setActiveView('calendar');
    else if (path === '/community' || path === '/chat') setActiveView('community');
    else if (path === '/passport') setActiveView('favorites');
    else if (path === '/history') setActiveView('history');
    else if (path === '/plans') setActiveView('plans');
    else if (path === '/saved-events') setActiveView('all-favorites');
    else if (path === '/admin-users') setActiveView('admin-users');
    else if (path === '/info') setActiveView('info');
    else if (path === '/services') setActiveView('services');
    else if (path === '/policies') setActiveView('policies');
  }, [location.pathname]);

  const [profileError, setProfileError] = useState<string | null>(null);
  const [managementTab, setManagementTab] = useState<'users' | 'businesses' | 'stats'>('users');

  React.useEffect(() => {
    if (activeView === 'explore') {
      const refresh = () => {
        window.dispatchEvent(new Event('resize'));
      };
      [10, 150, 400, 800, 1500].forEach(delay => setTimeout(refresh, delay));
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

  const isPremiumUser = user?.plan === SubscriptionPlan.BASIC || user?.plan === SubscriptionPlan.EXPERT;
  const canEditOwnBusiness = isPremiumUser && userBusiness;
  const canEditAllBusiness = isAdmin || isSuperUser;

  const handleAddBusinessMap = (lat: number, lng: number) => {
    if (!userBusiness && !canEditAllBusiness) return;
    const businessData = userBusiness || { name: '', icon: 'store', description: '', imageUrl: '', whatsapp: '', phone: '', instagram: '', category: BusinessCategory.OTRO, email: '' };
    setBizForm({
      name: businessData.name || '',
      locality: currentLocality.name,
      sector: Sector.CENTRO,
      icon: userBusiness.icon || 'store',
      description: userBusiness.description || '',
      imageUrl: userBusiness.imageUrl || '',
      whatsapp: userBusiness.whatsapp || '',
      phone: userBusiness.phone || '',
      instagram: userBusiness.instagram || '',
      category: userBusiness.category || BusinessCategory.OTRO,
      coordinates: [lat, lng],
      email: userBusiness.email || ''
    });
    setShowBusinessReg(true);
  };

  const renderView = () => {
    switch (activeView) {
      case 'explore':
        return <Suspense fallback={<PageLoader />}><Explore
          onEditBusiness={canEditAllBusiness ? handleEditBusiness : (canEditOwnBusiness ? handleEditBusiness : undefined)}
          userBusinessId={userBusiness?.id}
        /></Suspense>;
      case 'calendar':
        return <Suspense fallback={<PageLoader />}><CalendarPage /></Suspense>;
      case 'favorites':
        return <Suspense fallback={<PageLoader />}><Passport onNavigate={setActiveView} /></Suspense>;
      case 'history':
        return <Suspense fallback={<PageLoader />}><History /></Suspense>;
      case 'plans':
        return <Suspense fallback={<PageLoader />}><Plans /></Suspense>;
      case 'community':
      case 'chat':
        return <Suspense fallback={<PageLoader />}><Community /></Suspense>;
      case 'admin-users':
        return <Suspense fallback={<PageLoader />}><AdminUsers /></Suspense>;
      case 'policies':
        return <Suspense fallback={<PageLoader />}><Policies /></Suspense>;
      case 'info':
        return <Suspense fallback={<PageLoader />}><InfoPage /></Suspense>;
      default:
        return <Suspense fallback={<PageLoader />}><Explore onEditBusiness={handleEditBusiness} /></Suspense>;
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
            <button
              onClick={() => {
                if (isAuto) {
                  setIsAuto(false);
                  setTheme('light');
                } else if (theme === 'light') {
                  setTheme('dark');
                } else if (theme === 'dark') {
                  setTheme('night');
                } else {
                  setIsAuto(true);
                }
              }}
              className="p-3 bg-[var(--glass)] hover:bg-orange-500/10 text-orange-500 rounded-xl transition-all border border-[var(--glass-border)] flex items-center gap-2 group relative"
              title={`Cambiar Tema (Actual: ${isAuto ? 'Auto' : theme})`}
            >
              {isAuto ? (
                <Clock className="w-5 h-5 animate-pulse" />
              ) : theme === 'light' ? (
                <Sun className="w-5 h-5 text-amber-500" />
              ) : theme === 'dark' ? (
                <Moon className="w-5 h-5" />
              ) : (
                <Moon className="w-5 h-5 fill-slate-900 text-slate-400" />
              )}
            </button>

            {user && (
              <div className="flex items-center gap-2.5 pr-2">
                <div className="flex flex-col items-end">
                  <span className="text-[10px] font-black uppercase tracking-tighter hidden sm:inline">{user.name}</span>
                  {isSuperAdmin && (
                    <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 leading-none">Master Admin</span>
                  )}
                </div>
                <div className="w-8 h-8 rounded-xl border border-orange-500/50 overflow-hidden ring-2 ring-orange-500/20 shadow-lg">
                  <img src={user.avatarUrl} className="w-full h-full object-cover" alt="User avatar" />
                </div>
              </div>
            )}
            
            {isSuperAdmin && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => navigate('/admin-users')}
                  className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition-all border border-amber-500/20 flex items-center gap-2"
                  title="Gestión de Usuarios"
                >
                  <Users className="w-5 h-5" />
                  <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Admin</span>
                </button>

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

        <main className={`flex-1 lg:pt-0 pt-16 ${['favorites', 'admin-users', 'policies', 'plans', 'calendar', 'info', 'history'].includes(activeView) ? 'overflow-y-auto' : 'overflow-hidden'}`} style={{ height: ['favorites', 'admin-users', 'policies', 'plans', 'calendar', 'info', 'history'].includes(activeView) ? 'auto' : '100%', minHeight: '0' }}>
          {renderView()}
        </main>
      </div>

      <BottomNav />

      {showBusinessReg && (
        <BusinessEditModal
          isRegistration
          onClose={() => {
            setShowBusinessReg(false);
            [50, 200, 500, 1000].forEach(delay =>
              setTimeout(() => window.dispatchEvent(new Event('resize')), delay)
            );
          }}
        />
      )}

      <EventEditorModal />

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
        <BusinessEditModal
          onClose={() => {
            setShowBusinessEdit(false);
            setEditingBusinessId(null);
          }}
        />
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

      <PulseModal />
      <PulsePassModal
        isOpen={showPulsePassModal}
        onClose={() => setShowPulsePassModal(false)}
      />

      {/* Global Pulse Window FAB */}
      {!isEditorFocus && (
        <div className="fixed bottom-36 right-6 z-50 animate-in slide-in-from-right duration-500 delay-150">
          <button
            onClick={() => setShowPulseModal(true)}
            className="group relative w-16 h-16 bg-[#111111] border-2 border-orange-500/30 rounded-2xl flex flex-col items-center justify-center shadow-[0_20px_50px_rgba(0,0,0,0.8)] transition-all hover:scale-110 active:scale-95 hover:border-orange-500 hover:shadow-[0_20px_60px_rgba(249,115,22,0.3)] overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-amber-500/10 opacity-50" />
            <Activity className="w-6 h-6 text-orange-500 mb-1 group-hover:animate-pulse" />
            <span className="text-[8px] font-black text-orange-400 uppercase tracking-tighter leading-none">PULSE</span>

            <div className="absolute -top-12 right-0 bg-slate-900 border border-white/10 px-3 py-1.5 rounded-xl opacity-0 group-hover:opacity-100 transition-all pointer-events-none translate-y-2 group-hover:translate-y-0 shadow-2xl">
              <span className="text-[9px] font-black text-white uppercase tracking-widest whitespace-nowrap">Ventana de Pulse</span>
            </div>

            <div className="absolute inset-0 rounded-2xl ring-4 ring-orange-500/20 animate-pulse opacity-50" />
          </button>
        </div>
      )}

      {/* Global Login Modal Overlay */}
      {showLogin && !user && (
        <div className="fixed inset-0 z-[3000] bg-slate-900/90 backdrop-blur-xl animate-in fade-in duration-300">
          <LoginScreen />
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
        <EventModal
          event={events.find(e => e.id === selectedEvent.id) || selectedEvent}
          business={businesses.find(b => b.id === selectedEvent.businessId)}
          onClose={() => setSelectedEvent(null)}
          onNext={navigateToNextEvent}
          onPrevious={navigateToPreviousEvent}
          hasNext={hasNextEvent}
          hasPrevious={hasPreviousEvent}
          isAdmin={isAdmin}
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
      )}

      {/* Public Profile Modal */}
      {showPublicProfile && (
        <PublicProfileModal
          isOpen={showPublicProfile}
          onClose={() => {
            setShowPublicProfile(false);
            setPublicProfileId(null);
          }}
          businessId={publicProfileType === 'business' ? publicProfileId || undefined : undefined}
          userId={publicProfileType === 'user' ? publicProfileId || undefined : undefined}
        />
      )}
      {showMigrationPanel && <MigrationPanel onClose={() => setShowMigrationPanel(false)} />}
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


