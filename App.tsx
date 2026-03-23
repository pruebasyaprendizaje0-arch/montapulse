import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Compass, Calendar, Heart, User, Sparkles, X, Plus, Image as ImageIcon, CheckCircle, Zap, ExternalLink, LogOut, Mail, UserCircle, Store, Camera, Upload, Trash2, Edit3, Search, SlidersHorizontal, Navigation, Layers, Minus, Clock, MapPin, ArrowRight, Settings, ChevronLeft, ChevronRight, MessageCircle, Phone, CreditCard, Banknote, ShieldCheck, Palmtree, Mountain, Activity, Users } from 'lucide-react';
import { MapView } from './components/MapView.tsx';
import { EventCard } from './components/EventCard.tsx';
import { EventModal } from './components/EventModal.tsx';
import { MigrationPanel } from './components/MigrationPanel.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { ViewType, Sector, MontanitaEvent, Vibe, UserProfile, Business, SubscriptionPlan, BusinessCategory } from './types.ts';
import { MOCK_EVENTS, SECTOR_INFO, MOCK_BUSINESSES, SECTOR_POLYGONS, PLAN_LIMITS, PLAN_PRICES, DEFAULT_PAYMENT_DETAILS, LOCALITIES, LOCALITY_SECTORS, LOCALITY_POLYGONS, MAP_ICONS } from './constants.ts';
import { getSmartRecommendations, generateEventDescription } from './services/geminiService.ts';
import { useAuthContext } from './context/AuthContext.tsx';
import { logout, isSuperAdmin as checkSuperAdmin, updateUserProfile } from './services/authService.ts';
import {
  getUser, createUser, updateUser, createBusiness, updateBusiness, deleteBusiness,
  subscribeToEvents, createEvent, updateEvent, deleteEvent,
  subscribeToBusinesses, subscribeToAppSettings, updateAppSettings,
  toggleRSVP, subscribeToUserRSVPs, subscribeToUsers
} from './services/firestoreService.ts';
import { compressImage } from './services/uiService.ts';
import { Community } from './pages/Community.tsx';
import { Passport } from './pages/Passport.tsx';
import { Explore } from './pages/Explore.tsx';
import { InfoPage } from './pages/InfoPage.tsx';
import { Calendar as CalendarPage } from './pages/Calendar.tsx';
import { History } from './pages/History.tsx';
import { Plans } from './pages/Plans.tsx';
import { AdminUsers } from './pages/AdminUsers.tsx';
import { Policies } from './pages/Policies.tsx';
import { BottomNav } from './components/Layout/BottomNav.tsx';
import { Sidebar } from './components/Layout/Sidebar.tsx';
// CalendarModal removed
import { PulseModal } from './components/Modals/PulseModal.tsx';
import { PulsePassModal } from './components/Modals/PulsePassModal.tsx';
import { useToast } from './context/ToastContext.tsx';
import { useData } from './context/DataContext.tsx';
import { useTranslation } from 'react-i18next';
import { BusinessEditModal } from './components/Modals/BusinessEditModal.tsx';
import { PublicProfileModal } from './components/PublicProfileModal.tsx';





// Helper to suggest an icon based on description
export const suggestIconFromDescription = (description: string): string => {
  const desc = (description || '').toLowerCase();

  if (desc.includes('pizza') || desc.includes('hamburguesa') || desc.includes('restaurante') || desc.includes('comida') || desc.includes('cena') || desc.includes('almuerzo') || desc.includes('food')) return 'food';
  if (desc.includes('cocktail') || desc.includes('coctel') || desc.includes('trago') || desc.includes('bar') || desc.includes('cerveza') || desc.includes('copa') || desc.includes('drink')) return 'cocktail';
  if (desc.includes('cafÃ©') || desc.includes('coffee') || desc.includes('brunch') || desc.includes('desayuno')) return 'coffee';
  if (desc.includes('baile') || desc.includes('fiesta') || desc.includes('party') || desc.includes('discoteca') || desc.includes('club') || desc.includes('dj') || desc.includes('musica') || desc.includes('mÃºsica')) return 'music';
  if (desc.includes('hotel') || desc.includes('hostal') || desc.includes('alojamiento') || desc.includes('hospedaje') || desc.includes('stay') || desc.includes('cama')) return 'hotel';
  if (desc.includes('surf') || desc.includes('tabla') || desc.includes('ola') || desc.includes('waves')) return 'surf';
  if (desc.includes('playa') || desc.includes('mar') || desc.includes('arena') || desc.includes('malecÃ³n') || desc.includes('costa')) return 'palmtree';
  if (desc.includes('montaÃ±a') || desc.includes('cerro') || desc.includes('senderismo') || desc.includes('mountain') || desc.includes('tigrillo')) return 'mountain';
  if (desc.includes('iglesia') || desc.includes('parque') || desc.includes('pueblo') || desc.includes('centro') || desc.includes('cultura')) return 'church';
  if (desc.includes('compras') || desc.includes('tienda') || desc.includes('mercado') || desc.includes('ropa') || desc.includes('shop') || desc.includes('market')) return 'shopping';
  if (desc.includes('bus') || desc.includes('terminal') || desc.includes('transporte') || desc.includes('clp') || desc.includes('carro') || desc.includes('taxi')) return 'bus';
  if (desc.includes('mirador') || desc.includes('vista') || desc.includes('foto') || desc.includes('sunset') || desc.includes('atardecer') || desc.includes('camera')) return 'camera';
  if (desc.includes('paz') || desc.includes('verde') || desc.includes('hoja') || desc.includes('naturaleza') || desc.includes('eco')) return 'leaf';

  return 'palmtree'; // Default
};

const Dashboard: React.FC = () => {
  const { user, authUser, isAdmin, isSuperAdmin, isSuperUser, logout, setUser } = useAuthContext();
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
    handleImageUpload,
    handleBusinessImageUpload,
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
    setActiveView
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

  // AI states (kept local if not in context)
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

  // Sync activeView with URL
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
    else if (path === '/policies') setActiveView('policies');
  }, [location.pathname]);

  React.useEffect(() => {
    localStorage.setItem('montapulse_sector_labels', JSON.stringify(sectorLabels));
  }, [sectorLabels]);

  React.useEffect(() => {
    localStorage.setItem('montapulse_polygons', JSON.stringify(sectorPolygons));
  }, [sectorPolygons]);

  React.useEffect(() => {
    localStorage.setItem('montapulse_favorites', JSON.stringify(favorites));
  }, [favorites]);

  React.useEffect(() => {
    localStorage.setItem('montapulse_journey_cards_v3', JSON.stringify(journeyCards));
  }, [journeyCards]);


  const [profileError, setProfileError] = useState<string | null>(null);
  const [managementTab, setManagementTab] = useState<'users' | 'businesses' | 'stats'>('users');

  // Force map update on view change
  React.useEffect(() => {
    if (activeView === 'explore') {
      const refresh = () => {
        window.dispatchEvent(new Event('resize'));
      };
      [10, 150, 400, 800, 1500].forEach(delay => setTimeout(refresh, delay));
    }
  }, [activeView]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const bizFileInputRef = useRef<HTMLInputElement>(null);
  const bizCameraInputRef = useRef<HTMLInputElement>(null);
  const bizEditFileInputRef = useRef<HTMLInputElement>(null);
  const bizEditCameraInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const profileCameraInputRef = useRef<HTMLInputElement>(null);


  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        const compressedBase64 = await compressImage(file, 300, 0.7, true);
        setUser({ ...user, avatarUrl: compressedBase64 });
      } catch (error) {
        showToast("Error al procesar la imagen.", 'error');
      }
    }
  };

  const handleUpdateUserProfile = async () => {
    if (!user) return;
    try {
      await createUser(user.id, {
        name: user.name,
        surname: user.surname,
        email: user.email,
        preferredVibe: user.preferredVibe,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
        businessId: user.businessId || null,
        plan: user.plan || SubscriptionPlan.VISITOR
      });
      setShowProfileEdit(false);
      showToast("Perfil actualizado correctamente.", 'success');
    } catch (error) {
      showToast(`Error al actualizar perfil: ${error}`, 'error');
    }
  };

  // Users management


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
    // Fallback: search by ownerId
    if (authUser?.uid) {
      const byOwner = businesses.find(b => b.ownerId === authUser.uid);
      if (byOwner) return byOwner;
    }
    // Fallback: search by email (for users who registered business with same email)
    if (user?.email) {
      const byEmail = businesses.find(b => b.email?.toLowerCase() === user.email?.toLowerCase());
      if (byEmail) return byEmail;
    }
    return null;
  }, [user, businesses, authUser]);

  const isPremiumUser = user?.plan === SubscriptionPlan.PREMIUM;
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
      case 'info':
        return <InfoPage />;
      case 'explore':
        return <Explore 
          onEditBusiness={canEditAllBusiness ? handleEditBusiness : (canEditOwnBusiness ? handleEditBusiness : undefined)} 
          userBusinessId={userBusiness?.id}
        />;
      case 'calendar':
        return <CalendarPage />;
      case 'favorites':
        return <Passport onNavigate={setActiveView} />;
      case 'history':
        return <History />;
      case 'plans':
        return <Plans />;
      case 'community':
      case 'chat':
        return <Community />;
      case 'admin-users':
        return <AdminUsers />;
      case 'policies':
        return <Policies />;
      default:
        return <Explore onEditBusiness={handleEditBusiness} />;
    }
  };

  return (
    <div className="relative h-[100dvh] w-screen bg-slate-900 overflow-hidden flex flex-row font-sans select-none">
      <Sidebar />
      <div className={`flex-1 flex flex-col h-full relative ${['favorites', 'admin-users', 'policies', 'plans', 'calendar', 'info', 'history'].includes(activeView) ? 'overflow-y-auto' : 'overflow-hidden'}`}>
      <div className="fixed top-0 left-0 lg:left-64 right-0 z-50 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tighter text-white leading-none">SPONDYLUS</span>
            <span className="text-[10px] font-black tracking-[0.3em] text-orange-500 leading-none mt-0.5">PULSE</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2.5 pr-2">
              <div className="flex flex-col items-end">
                <span className="text-[10px] font-black text-white uppercase tracking-tighter hidden sm:inline">{user.name} {user.surname}</span>
                {isSuperAdmin && (
                  <span className="text-[8px] font-black text-amber-500 uppercase tracking-widest bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20 leading-none">Master Admin</span>
                )}
              </div>
              <div className="w-8 h-8 rounded-xl border border-orange-500/50 overflow-hidden ring-2 ring-orange-500/20 shadow-lg">
                <img src={user.avatarUrl} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          {isSuperAdmin && (
            <button
              onClick={() => navigate('/admin-users')}
              className="p-3 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition-all border border-amber-500/20 flex items-center gap-2"
              title="Gestión de Usuarios"
            >
              <Users className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">Admin</span>
            </button>
          )}
          <div className="flex flex-col items-end">
            <span className="text-[7px] font-bold text-slate-700 mt-1 uppercase tracking-widest leading-none">v1.0.3 Master Edition</span>
          </div>
          {isSuperAdmin && (
            <button
              onClick={logout}
              className="p-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl transition-all active:scale-90 border border-orange-500/20 ml-2"
              title="Cerrar SesiÃ³n"
            >
              <LogOut className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <main className={`flex-1 lg:pt-0 pt-16 ${['favorites', 'admin-users', 'policies', 'plans', 'calendar', 'info', 'history'].includes(activeView) ? 'overflow-y-auto' : 'overflow-hidden'}`} style={{ height: ['favorites', 'admin-users', 'policies', 'plans', 'calendar', 'info', 'history'].includes(activeView) ? 'auto' : '100%', minHeight: '0' }}>
        {renderView()}
      </main>
      </div>



      {/* Sector filter pills removed for a cleaner map view */}

      <BottomNav />

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'event')} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageUpload(e, 'event')} />

      {showBusinessReg && (
        <BusinessEditModal 
          isRegistration 
          onClose={() => {
            setShowBusinessReg(false);
            // Forzar resize del mapa al cerrar el modal para recuperar los tiles
            [50, 200, 500, 1000].forEach(delay =>
              setTimeout(() => window.dispatchEvent(new Event('resize')), delay)
            );
          }} 
        />
      )}


      {showHostWizard && (
        <div className="fixed inset-0 z-[2110] bg-slate-900 flex flex-col p-6 overflow-y-auto pb-32 no-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => { setShowHostWizard(false); setEditingEventId(null); }} className="text-slate-400 font-bold">Cerrar</button>
            <h2 className="text-white font-black uppercase tracking-widest text-xs">{editingEventId ? 'EDITAR PULSO' : 'NUEVO PULSO'}</h2>
            <button onClick={handleSaveEvent} className="text-orange-500 font-black">Guardar</button>
          </div>
          <div className="relative w-full aspect-video bg-slate-800 rounded-3xl overflow-hidden mb-6 group border-2 border-dashed border-slate-700">
            <img src={newEvent.imageUrl} className="w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/40">
              <button onClick={() => cameraInputRef.current?.click()} className="p-4 bg-white/20 rounded-full hover:bg-white/40 transition-colors"><Camera className="w-6 h-6 text-white" /></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-4 bg-white/20 rounded-full hover:bg-white/40 transition-colors"><Upload className="w-6 h-6 text-white" /></button>
            </div>
          </div>
          <div className="space-y-6">
            <input type="text" placeholder="Título" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 font-bold text-white shadow-inner" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <select className="col-span-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 font-black text-[10px] uppercase tracking-wider text-white appearance-none" value={newEvent.locality} onChange={e => setNewEvent({ ...newEvent, locality: e.target.value, sector: (LOCALITY_SECTORS[e.target.value] || [])[0] || Sector.CENTRO })}>
                {LOCALITIES.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
              </select>
              <select className="col-span-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 font-black text-[10px] uppercase tracking-wider text-white appearance-none" value={newEvent.sector} onChange={e => setNewEvent({ ...newEvent, sector: e.target.value as Sector })}>
                {(LOCALITY_SECTORS[newEvent.locality || 'Montañita'] || Object.values(Sector)).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="col-span-1 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 font-black text-[10px] uppercase tracking-wider text-white appearance-none" value={newEvent.vibe} onChange={e => setNewEvent({ ...newEvent, vibe: e.target.value as Vibe })}>
                {Object.values(Vibe).map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="datetime-local" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 font-bold text-white outline-none" value={newEvent.startAt} onChange={e => setNewEvent({ ...newEvent, startAt: e.target.value })} />
              <input type="datetime-local" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-4 font-bold text-white outline-none" value={newEvent.endAt} onChange={e => setNewEvent({ ...newEvent, endAt: e.target.value })} />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-slate-500 uppercase">Descripción</label>
                <button onClick={handleGenerateAIEvent} className="text-[10px] font-black text-orange-400 uppercase tracking-widest"><Sparkles className="w-3 h-3 inline mr-1" /> AI Draft</button>
              </div>
              <textarea rows={4} placeholder="Descripción" className="w-full bg-slate-800 border border-slate-700 rounded-3xl px-6 py-5 text-slate-300 text-sm shadow-inner" value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })} />
            </div>
          </div>
        </div>
      )}

      {/* Modal is now handled by EventModal component at the bottom */}


      {/* Profile Edit Modal */}
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

      {/* Business Edit Modal */}
      {showBusinessEdit && (
          <BusinessEditModal 
            onClose={() => {
              setShowBusinessEdit(false);
              setEditingBusinessId(null);
            }} 
          />
      )}

      {/* Migration Panel */}
      {/* Payment Edit Modal */}
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
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">RegiÃ³n/Banco (Header)</label>
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
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">NÃºmero de Cuenta</label>
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
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">WhatsApp de Contacto (incluir cÃ³digo paÃ­s)</label>
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

      {showMigrationPanel && (
        <MigrationPanel onClose={() => setShowMigrationPanel(false)} />
      )}

      {/* Calendar modal removed permanently */}
      <PulseModal />
      <PulsePassModal 
        isOpen={showPulsePassModal} 
        onClose={() => setShowPulsePassModal(false)} 
      />

      {/* Global Pulse Window FAB */}
      {!isEditorFocus && (
        <div className="fixed bottom-48 right-6 z-50 animate-in slide-in-from-right duration-500 delay-150">
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
          <div className="absolute top-6 right-6">
            <button
              onClick={() => setShowLogin(false)}
              className="p-3 bg-white/5 hover:bg-white/10 text-white rounded-2xl transition-all border border-white/10"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <LoginScreen />
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
