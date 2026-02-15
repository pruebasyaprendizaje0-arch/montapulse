import React, { useState, useMemo, useRef } from 'react';
import { Compass, Calendar, Heart, User, Sparkles, X, Plus, Image as ImageIcon, CheckCircle, Zap, ExternalLink, LogOut, Mail, UserCircle, Store, Camera, Upload, Trash2, Edit3, Search, SlidersHorizontal, Navigation, Layers, Minus, Clock, MapPin, ArrowRight, Settings, ChevronLeft, MessageCircle, Phone } from 'lucide-react';
import { MapView } from './components/MapView.tsx';
import { EventCard } from './components/EventCard.tsx';
import { MigrationPanel } from './components/MigrationPanel.tsx';
import { LoginScreen } from './components/LoginScreen.tsx';
import { ViewType, Sector, MontanitaEvent, Vibe, UserProfile, Business } from './types.ts';
import { MOCK_EVENTS, SECTOR_INFO, MOCK_BUSINESSES, SECTOR_POLYGONS } from './constants.ts';
import { getSmartRecommendations, generateEventDescription } from './services/geminiService.ts';
import { useAuth } from './hooks/useAuth.ts';
// Imports cleaned up
import { logout, isSuperAdmin, updateUserProfile } from './services/authService.ts';
import {
  getUser, createUser, updateUser, createBusiness, updateBusiness, deleteBusiness,
  subscribeToEvents, createEvent, updateEvent, deleteEvent,
  subscribeToBusinesses
} from './services/firestoreService.ts';




const Dashboard: React.FC = () => {
  const { user: authUser, isAdmin, userRole } = useAuth();

  const [activeView, setActiveView] = useState<ViewType>('explore');
  const [events, setEvents] = useState<MontanitaEvent[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [sectorPolygons, setSectorPolygons] = useState<Record<Sector, [number, number][]>>(() => {
    const saved = localStorage.getItem('montapulse_polygons');
    if (saved) {
      const parsed = JSON.parse(saved);
      // Migration check: if 'Playa' or 'Montaña' (internal keys) are missing, or if old names exist
      if (!parsed['Playa'] || !parsed['Montaña'] || parsed['Malecón']) {
        localStorage.removeItem('montapulse_polygons');
        localStorage.removeItem('montapulse_businesses');
        localStorage.removeItem('montapulse_events');
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

  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('montapulse_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  React.useEffect(() => {
    localStorage.setItem('montapulse_sector_labels', JSON.stringify(sectorLabels));
  }, [sectorLabels]);

  // Persistence Effects
  // Firestore Subscriptions
  React.useEffect(() => {
    const unsubEvents = subscribeToEvents((data) => {
      setEvents(data);
    });
    const unsubBusinesses = subscribeToBusinesses((data) => {
      setBusinesses(data);
    });
    return () => {
      unsubEvents();
      unsubBusinesses();
    };
  }, []);

  React.useEffect(() => {
    localStorage.setItem('montapulse_polygons', JSON.stringify(sectorPolygons));
  }, [sectorPolygons]);

  React.useEffect(() => {
    localStorage.setItem('montapulse_favorites', JSON.stringify(favorites));
  }, [favorites]);

  const [journeyCards, setJourneyCards] = useState<{ id: string, label: string, icon: string, active: boolean, color: string, bg: string }[]>(() => {
    const saved = localStorage.getItem('montapulse_journey_cards_v2');
    if (saved) return JSON.parse(saved);
    return [
      { id: 'CENTRO', label: 'CENTRO', icon: 'zap', active: true, color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
      { id: 'LA PUNTA', label: 'LA PUNTA', icon: 'waves', active: true, color: 'text-sky-400', bg: 'bg-sky-500/10' },
      { id: 'TIGRILLO', label: 'TIGRILLO', icon: 'leaf', active: true, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
    ];
  });

  React.useEffect(() => {
    localStorage.setItem('montapulse_journey_cards_v2', JSON.stringify(journeyCards));
  }, [journeyCards]);

  const [selectedSector, setSelectedSector] = useState<Sector | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<MontanitaEvent | null>(null);
  const [aiRecData, setAiRecData] = useState<{ text: string, sources: any[] } | null>(null);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showHostWizard, setShowHostWizard] = useState(false);
  const [showBusinessReg, setShowBusinessReg] = useState(false);
  const [showProfileEdit, setShowProfileEdit] = useState(false);
  const [showBusinessEdit, setShowBusinessEdit] = useState(false);
  const [showMigrationPanel, setShowMigrationPanel] = useState(false);
  const [rsvpStatus, setRsvpStatus] = useState<Record<string, boolean>>({});
  const [agendaRange, setAgendaRange] = useState<'day' | 'week' | 'month'>('day');

  const [editingEventId, setEditingEventId] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const bizFileInputRef = useRef<HTMLInputElement>(null);
  const bizCameraInputRef = useRef<HTMLInputElement>(null);
  const bizEditFileInputRef = useRef<HTMLInputElement>(null);
  const bizEditCameraInputRef = useRef<HTMLInputElement>(null);
  const profileFileInputRef = useRef<HTMLInputElement>(null);
  const profileCameraInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<UserProfile | null>(null);

  const userBusiness = useMemo(() => {
    if (!user?.businessId) return null;
    return businesses.find(b => b.id === user.businessId);
  }, [user, businesses]);

  // Sync user profile from auth and Firestore
  React.useEffect(() => {
    const syncUserProfile = async () => {
      if (!authUser) {
        setUser(null);
        return;
      }

      // Fetch real user profile for all users
      try {
        const profile = await getUser(authUser.uid);
        if (profile) {
          // STRICT SECURITY CHECK:
          // If the database says 'admin' or useAuth says 'admin',
          // BUT the email is not the Master Email, force downgrade to 'visitor'.
          const isMaster = isSuperAdmin(authUser.email);
          let secureRole = userRole;

          if (!isMaster && (profile.role === 'admin' || userRole === 'admin')) {
            console.warn(`Security Alert: User ${authUser.email} attempted to be admin but is unauthorized. Downgrading to visitor.`);
            secureRole = 'visitor';
          } else if (isMaster) {
            secureRole = 'admin'; // Ensure Master is always admin
          }

          setUser({
            ...profile,
            // Trust the secured role
            role: secureRole
          });

          // Check if host needs to register business
          if (profile.role === 'host' && !profile.businessId) {
            setShowBusinessReg(true);
          }
        } else {
          // If no profile exists, create a default one based on Auth info
          const isMaster = isSuperAdmin(authUser.email);
          const defaultRole = isMaster ? 'admin' : (isAdmin ? 'admin' : 'visitor');

          const newUser: UserProfile = {
            id: authUser.uid,
            name: authUser.displayName || (isMaster ? 'Super Admin' : 'Visitor'),
            email: authUser.email || '',
            role: defaultRole, // Will be 'visitor' for most new Google logins
            preferredVibe: Vibe.RELAX,
            avatarUrl: authUser.photoURL || undefined
          };

          // Set local state
          setUser(newUser);
        }
      } catch (error) {
        console.error("Error syncing user profile:", error);
      }
    };

    syncUserProfile();
  }, [authUser, isAdmin, userRole]);
  const [isEditorFocus, setIsEditorFocus] = useState(false);
  const [isPanelMinimized, setIsPanelMinimized] = useState(false);
  const [regForm, setRegForm] = useState({ name: '', email: '', vibe: Vibe.RELAX, role: 'visitor' as 'visitor' | 'host' });
  const [bizForm, setBizForm] = useState({
    name: '',
    sector: Sector.CENTRO,
    description: '',
    imageUrl: 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?auto=format&fit=crop&q=80&w=400',
    whatsapp: '',
    phone: ''
  });

  const handleAddBusinessOnMap = async (lat: number, lng: number) => {
    const name = prompt('Nombre del nuevo punto comercial:');
    if (!name) return;
    const newBiz: Omit<Business, 'id'> = {
      name,
      sector: Sector.CENTRO, // Defaulting to Centro for now
      description: 'Nuevo punto añadido por Administrador',
      isVerified: true,
      coordinates: [lat, lng],
      imageUrl: 'https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?auto=format&fit=crop&q=80&w=400'
    };
    await createBusiness(newBiz);
  };

  const handleDeleteBusinessByAdmin = async (id: string) => {
    if (confirm('¿Eliminar este negocio permanentemente?')) {
      await deleteBusiness(id);
    }
  };

  const handleUpdateBusinessLocation = async (id: string, lat: number, lng: number) => {
    await updateBusiness(id, { coordinates: [lat, lng] });
  };

  const handleUpdateSectorGeometry = (sector: Sector, coords: [number, number][]) => {
    setSectorPolygons(prev => ({ ...prev, [sector]: coords }));
  };

  const handleEditBusiness = async (id: string) => {
    const biz = businesses.find(b => b.id === id);
    if (!biz) return;

    const newName = prompt('Nuevo nombre:', biz.name);
    const newDesc = prompt('Nueva descripción:', biz.description);
    if (newName) {
      await updateBusiness(id, { name: newName, description: newDesc || biz.description });
    }
  };

  const getLocalISOString = (date: Date) => {
    const tzOffset = date.getTimezoneOffset() * 60000;
    return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
  };

  const initialNewEvent = {
    title: '',
    sector: Sector.CENTRO,
    vibe: Vibe.FIESTA,
    category: 'Fiesta',
    imageUrl: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600',
    startAt: getLocalISOString(new Date()),
    endAt: getLocalISOString(new Date(Date.now() + 3 * 3600000))
  };

  const [newEvent, setNewEvent] = useState(initialNewEvent);
  const [isGeneratingDesc, setIsGeneratingDesc] = useState(false);
  const [generatedDesc, setGeneratedDesc] = useState('');

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('All');

  const filteredEvents = useMemo(() => {
    return events.filter(e => {
      const matchesSector = !selectedSector || e.sector === selectedSector;
      const matchesSearch = e.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesFilter = activeFilter === 'All' || e.vibe === activeFilter || e.category === activeFilter;
      const isActive = new Date() <= e.endAt;
      return matchesSector && matchesSearch && matchesFilter && isActive;
    });
  }, [selectedSector, events, searchQuery, activeFilter]);

  const favoritedEvents = useMemo(() => {
    return events.filter(e => favorites.includes(e.id));
  }, [favorites, events]);

  const handleAiAsk = async () => {
    setIsAiLoading(true);
    const data = await getSmartRecommendations(events, `El usuario se llama ${user?.name || 'Visitante'} y le gusta el ${user?.preferredVibe || 'ambiente playero'}. Recomiéndame lo mejor para hoy.`);
    setAiRecData(data);
    setIsAiLoading(false);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (regForm.role === 'host') {
      setShowBusinessReg(true);
      return;
    }

    if (!authUser) return; // Should not happen if rendering this view

    // Create visitor profile
    const newUser: UserProfile = {
      id: authUser.uid,
      name: regForm.name,
      email: regForm.email,
      preferredVibe: regForm.vibe,
      role: 'visitor',
      avatarUrl: authUser.photoURL || `https://i.pravatar.cc/150?u=${regForm.email}`
    };

    try {
      await createUser(authUser.uid, {
        name: newUser.name,
        email: newUser.email,
        preferredVibe: newUser.preferredVibe,
        role: newUser.role,
        avatarUrl: newUser.avatarUrl
      });
      setUser(newUser);
    } catch (error) {
      console.error("Error creating user:", error);
      alert("Error al guardar perfil. Intenta de nuevo.");
    }
  };

  const handleBusinessRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!authUser) return;

    try {
      // 1. Create Business
      const businessData = {
        name: bizForm.name,
        sector: bizForm.sector,
        description: bizForm.description,
        imageUrl: bizForm.imageUrl,
        whatsapp: bizForm.whatsapp,
        phone: bizForm.phone,
        isVerified: false,
        coordinates: [-1.8253, -80.7523] as [number, number] // Default coords, user should update map
      };

      const newBusinessId = await createBusiness(businessData);

      // 2. Create Host Profile linked to business
      const newUserProfile: UserProfile = {
        id: authUser.uid,
        name: user?.name || authUser.displayName || 'Host',
        email: user?.email || authUser.email || '',
        preferredVibe: user?.preferredVibe || Vibe.RELAX,
        role: 'host',
        avatarUrl: user?.avatarUrl || authUser.photoURL || undefined,
        businessId: newBusinessId
      };

      await updateUser(authUser.uid, {
        businessId: newBusinessId,
        role: 'host'
      });

      // Update local state
      const newBusiness: Business = { id: newBusinessId, ...businessData };
      setBusinesses(prev => [...prev, newBusiness]);
      setUser(newUserProfile);
      setShowBusinessReg(false);

    } catch (error) {
      console.error("Error creating business profile:", error);
      alert("Error al registrar negocio.");
    }
  };

  const toggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) {
      setActiveView('host');
      return;
    }
    setFavorites(prev => prev.includes(id) ? prev.filter(f => f !== id) : [...prev, id]);
  };

  const handleRSVP = (id: string) => {
    if (!user) {
      setActiveView('host');
      return;
    }
    setRsvpStatus(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleSector = (sector: Sector) => {
    setSelectedSector(prev => prev === sector ? null : sector);
  };

  const handleGenerateAIEvent = async () => {
    if (!newEvent.title) return;
    setIsGeneratingDesc(true);
    const desc = await generateEventDescription(newEvent.title, newEvent.sector);
    setGeneratedDesc(desc);
    setIsGeneratingDesc(false);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>, target: 'event' | 'business') => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (target === 'event') {
          setNewEvent({ ...newEvent, imageUrl: reader.result as string });
        } else {
          setBizForm({ ...bizForm, imageUrl: reader.result as string });
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleBusinessImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user?.businessId) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinesses(prev => prev.map(b =>
          b.id === user.businessId ? { ...b, imageUrl: reader.result as string } : b
        ));
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper for image compression
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          // Compress to JPEG at 0.7 quality
          const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
          resolve(dataUrl);
        };
        img.onerror = (error) => reject(error);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && user) {
      try {
        // Compress image before setting state
        const compressedBase64 = await compressImage(file);
        setUser({ ...user, avatarUrl: compressedBase64 });
      } catch (error) {
        console.error("Error compressing image:", error);
        alert("Error al procesar la imagen. Intenta con otra.");
      }
    }
  };

  const handleUpdateUserProfile = async () => {
    if (!user) return;
    try {
      // 1. Update Firestore (Persistent DB)
      await createUser(user.id, {
        name: user.name,
        email: user.email,
        preferredVibe: user.preferredVibe,
        avatarUrl: user.avatarUrl || null,
        role: user.role,
        businessId: user.businessId || null
      });

      // 2. Update Firebase Auth Profile (Session / Cache)
      if (authUser) {
        await updateUserProfile(authUser, user.name, user.avatarUrl);
      }

      setShowProfileEdit(false);
      alert("Perfil actualizado correctamente.");
    } catch (error) {
      console.error("Error updating user profile:", error);
      alert(`Error al actualizar perfil: ${error}`);
    }
  };

  const handleUpdateBusinessProfile = async () => {
    if (!user?.businessId) return;

    const business = businesses.find(b => b.id === user.businessId);
    if (!business) return;

    try {
      await updateBusiness(user.businessId, {
        name: business.name,
        description: business.description,
        sector: business.sector,
        whatsapp: business.whatsapp,
        phone: business.phone,
        imageUrl: business.imageUrl
      });
      setShowBusinessEdit(false);
    } catch (error) {
      console.error("Error updating business:", error);
      alert("Error saving business changes.");
    }
  };




  const handleSaveEvent = async () => {
    const eventInput = {
      title: newEvent.title || 'Evento sin nombre',
      description: generatedDesc || 'Un evento increíble en Montañita.',
      startAt: new Date(newEvent.startAt),
      endAt: new Date(newEvent.endAt),
      category: newEvent.category,
      vibe: newEvent.vibe,
      sector: newEvent.sector,
      imageUrl: newEvent.imageUrl || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600',
    };

    try {
      if (editingEventId) {
        await updateEvent(editingEventId, eventInput);
      } else {
        // New Event
        const newEventData = {
          ...eventInput,
          businessId: user?.businessId || bizForm.name || user?.name || 'Host Local',
          interestedCount: 0
        };
        await createEvent(newEventData);
      }

      setShowHostWizard(false);
      setEditingEventId(null);
      setNewEvent(initialNewEvent);
      setGeneratedDesc('');
    } catch (err) {
      console.error("Error saving event:", err);
      alert("Wait, error saving event.");
    }
  };

  const handleEditEvent = (event: MontanitaEvent) => {
    setEditingEventId(event.id);
    setNewEvent({
      title: event.title,
      sector: event.sector,
      vibe: event.vibe,
      category: event.category,
      imageUrl: event.imageUrl,
      startAt: getLocalISOString(event.startAt),
      endAt: getLocalISOString(event.endAt)
    });
    setGeneratedDesc(event.description);
    setShowHostWizard(true);
  };

  const handleDeleteEvent = async (id: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este pulso?')) {
      await deleteEvent(id);
      // Also remove from favorites locally if needed, but Firestore sub handles favorites list updates?
      // Actually favorites sub is to favorites collection. Deleting event doesn't auto-delete favorites
      // usually, but client side check filters them out.
      // We also update local 'interested' list if needed, but 'rsvpStatus' is local?
      // The original code updated RSVP status.
      setRsvpStatus(prev => {
        const newStatus = { ...prev };
        delete newStatus[id];
        return newStatus;
      });
      setFavorites(prev => prev.filter(eid => eid !== id));
    }
  };

  const renderView = () => {
    switch (activeView) {
      case 'explore':
        return (
          <div className="h-full relative flex flex-col bg-[#020617]">
            <div className="flex-1 min-h-[45vh]">
              <MapView
                onBusinessSelect={(b) => {
                  setSearchQuery(b.name);
                }}
                selectedSector={selectedSector}
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                activeFilter={activeFilter}
                onFilterChange={setActiveFilter}
                isAdmin={user?.role === 'admin'}
                onAddBusiness={handleAddBusinessOnMap}
                onDeleteBusiness={handleDeleteBusinessByAdmin}
                onUpdateBusiness={handleUpdateBusinessLocation}
                onEditBusiness={handleEditBusiness}
                onUpdateSector={handleUpdateSectorGeometry}
                onRenameSector={(sector, newName) => {
                  setSectorLabels(prev => ({ ...prev, [sector]: newName }));
                }}
                businesses={businesses}
                sectorPolygons={sectorPolygons}
                isEditorFocus={isEditorFocus}
                onToggleEditorFocus={() => setIsEditorFocus(!isEditorFocus)}
                isPanelMinimized={isPanelMinimized}
                onTogglePanel={() => setIsPanelMinimized(!isPanelMinimized)}
                hideUI={!!selectedEvent}
              />
            </div>

            {/* Sliding Panel - Hidden in Editor Focus mode */}
            {!isEditorFocus && (
              <div
                onClick={() => isPanelMinimized && setIsPanelMinimized(false)}
                className={`bg-[#0f172a]/90 backdrop-blur-3xl border-t border-white/5 px-6 pt-6 transition-all duration-500 ease-in-out ${isPanelMinimized ? 'max-h-[40px] pb-0 overflow-hidden cursor-pointer hover:bg-[#0f172a]' : 'max-h-[55vh] pb-32 overflow-y-auto'} rounded-t-[3.5rem] -mt-10 z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] no-scrollbar relative`}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsPanelMinimized(!isPanelMinimized);
                  }}
                  className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-8 opacity-50 cursor-pointer hover:bg-slate-600 transition-colors"
                ></div>

                <div className="flex items-center justify-between mb-6">
                  <div className="flex flex-col">
                    <h2 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                      {selectedSector ? `Pulso en ${selectedSector}` : 'Pulse of today'}
                    </h2>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{filteredEvents.length} pulses near you</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setIsPanelMinimized(true);
                      }}
                      className="bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-2xl border border-white/5 transition-all flex items-center gap-2"
                    >
                      <MapPin className="w-4 h-4" />
                      <span className="text-[11px] font-black uppercase tracking-wider">Ver Mapa</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent panel expansion if clicked while minimized (though header is hidden when minimized usually)
                        handleAiAsk();
                      }}
                      disabled={isAiLoading}
                      className="bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 px-5 py-2.5 rounded-2xl border border-sky-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                    >
                      <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
                      <span className="text-[11px] font-black uppercase tracking-wider">AI Planner</span>
                    </button>
                  </div>
                </div>

                {aiRecData && (
                  <div className="bg-sky-500/10 border border-sky-500/20 p-6 rounded-[2.5rem] mb-8 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-sky-500/5 blur-3xl -mr-10 -mt-10 group-hover:scale-150 transition-transform"></div>
                    <p className="text-sm italic text-sky-100/90 leading-relaxed font-medium mb-4 pr-6">"{aiRecData.text}"</p>

                    {aiRecData.sources.length > 0 && (
                      <div className="flex flex-wrap gap-2 pt-3 border-t border-white/5">
                        {aiRecData.sources.slice(0, 2).map((s, idx) => (
                          <a key={idx} href={s.web?.uri} target="_blank" className="text-[10px] text-sky-400/80 font-bold hover:text-sky-300 transition-colors uppercase tracking-widest flex items-center gap-1">
                            <ExternalLink className="w-2.5 h-2.5" /> {s.web?.title || 'Explore'}
                          </a>
                        ))}
                      </div>
                    )}

                    <button onClick={() => setAiRecData(null)} className="absolute top-4 right-4 text-sky-500/40 hover:text-sky-400 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                )}

                <div className="space-y-6">
                  {filteredEvents.map(event => (
                    <div key={event.id} className="relative">
                      <EventCard event={event} onClick={setSelectedEvent} />
                      <button
                        onClick={(e) => toggleFavorite(event.id, e)}
                        className="absolute top-6 right-6 z-10 p-3 bg-black/30 backdrop-blur-xl rounded-full border border-white/10 hover:scale-110 active:scale-95 transition-all group"
                      >
                        <Heart className={`w-5 h-5 transition-colors ${favorites.includes(event.id) ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'calendar':
        return (
          <div className="flex flex-col h-full bg-[#020617] overflow-y-auto no-scrollbar pb-32">
            {/* Header / Tabs */}
            <div className="p-6 pt-16 space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                    <Calendar className="w-6 h-6 text-white" />
                  </div>
                  <h1 className="text-xl font-black text-white tracking-tight">Pulse Calendar</h1>
                </div>
                <div className="flex gap-2">
                  <button className="p-2.5 bg-slate-900 rounded-[1rem] border border-white/5 text-slate-400"><Search className="w-5 h-5" /></button>
                  <div className="w-10 h-10 rounded-full border-2 border-orange-500/50 p-0.5"><img src={user?.avatarUrl || "https://i.pravatar.cc/100?u=123"} className="w-full h-full rounded-full object-cover" /></div>
                </div>
              </div>

              <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5">
                {(['day', 'week', 'month'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setAgendaRange(range)}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-all ${agendaRange === range ? 'bg-sky-500 text-white shadow-lg' : 'text-slate-500'}`}
                  >
                    {range === 'day' ? 'Daily' : range === 'week' ? 'Weekly' : 'Monthly'}
                  </button>
                ))}
              </div>

              {agendaRange === 'day' ? (
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-white tracking-tighter">
                    Today, {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Events until 6:00 AM tomorrow</p>
                </div>
              ) : agendaRange === 'week' ? (
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-white tracking-tighter">Next 7 Days</h2>
                  <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Your week ahead</p>
                </div>
              ) : (
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-white tracking-tighter">
                    {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </h2>
                  <p className="text-xs text-slate-500 font-medium tracking-wide uppercase">Full month schedule</p>
                </div>
              )}

              {agendaRange === 'day' && (
                <div className="flex items-center gap-3 py-2">
                  <div className="w-8 h-8 bg-amber-400 rounded-lg flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-black fill-current" />
                  </div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Sun & Sand</span>
                </div>
              )}
            </div>

            {/* Event List */}
            <div className="px-6 space-y-6">
              {agendaRange === 'day' ? (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-6 bg-sky-500 rounded-full"></div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Day Vibes</h3>
                  </div>
                  {events.filter(e => {
                    const now = new Date();
                    const isToday = e.startAt.getDate() === now.getDate() && e.startAt.getMonth() === now.getMonth() && e.startAt.getFullYear() === now.getFullYear();
                    return isToday && e.startAt.getHours() >= 6 && e.startAt.getHours() < 18;
                  }).length > 0 ? (
                    events.filter(e => {
                      const now = new Date();
                      const isToday = e.startAt.getDate() === now.getDate() && e.startAt.getMonth() === now.getMonth() && e.startAt.getFullYear() === now.getFullYear();
                      return isToday && e.startAt.getHours() >= 6 && e.startAt.getHours() < 18;
                    }).map(event => (
                      <EventCard key={event.id} event={event} onClick={setSelectedEvent} />
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm italic">Nothing happening during the day today.</p>
                  )}

                  <div className="flex items-center gap-2 mt-8 mb-2">
                    <div className="w-1 h-6 bg-indigo-500 rounded-full"></div>
                    <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-indigo-400" /> Pulse of the Night
                    </h3>
                  </div>
                  {events.filter(e => {
                    const now = new Date();
                    const eventDate = new Date(e.startAt);
                    const isToday = eventDate.getDate() === now.getDate() && eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
                    const isTonight = isToday && eventDate.getHours() >= 18;
                    const tomorrow = new Date(now);
                    tomorrow.setDate(tomorrow.getDate() + 1);
                    const isTomorrowEarly = eventDate.getDate() === tomorrow.getDate() &&
                      eventDate.getMonth() === tomorrow.getMonth() &&
                      eventDate.getFullYear() === tomorrow.getFullYear() &&
                      eventDate.getHours() < 6;
                    return isTonight || isTomorrowEarly;
                  }).length > 0 ? (
                    events.filter(e => {
                      const now = new Date();
                      const eventDate = new Date(e.startAt);
                      const isToday = eventDate.getDate() === now.getDate() && eventDate.getMonth() === now.getMonth() && eventDate.getFullYear() === now.getFullYear();
                      const isTonight = isToday && eventDate.getHours() >= 18;
                      const tomorrow = new Date(now);
                      tomorrow.setDate(tomorrow.getDate() + 1);
                      const isTomorrowEarly = eventDate.getDate() === tomorrow.getDate() &&
                        eventDate.getMonth() === tomorrow.getMonth() &&
                        eventDate.getFullYear() === tomorrow.getFullYear() &&
                        eventDate.getHours() < 6;
                      return isTonight || isTomorrowEarly;
                    }).map(event => (
                      <EventCard key={event.id} event={event} onClick={setSelectedEvent} />
                    ))
                  ) : (
                    <p className="text-slate-500 text-sm italic">No night pulses yet.</p>
                  )}
                </>
              ) : agendaRange === 'week' ? (
                /* Weekly View Logic */
                <div className="space-y-8">
                  {Array.from({ length: 7 }).map((_, i) => {
                    const date = new Date();
                    date.setDate(date.getDate() + i);
                    const dayEvents = events.filter(e => {
                      const eDate = new Date(e.startAt);
                      return eDate.getDate() === date.getDate() &&
                        eDate.getMonth() === date.getMonth() &&
                        eDate.getFullYear() === date.getFullYear();
                    }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

                    if (dayEvents.length === 0) return null;

                    return (
                      <div key={i} className="space-y-3">
                        <div className="sticky top-0 z-10 bg-[#020617]/95 backdrop-blur-md py-2 border-b border-white/5">
                          <h3 className="text-lg font-black text-rose-500">
                            {date.toLocaleDateString('en-US', { weekday: 'long' })}
                            <span className="text-slate-500 text-sm font-bold ml-2">
                              {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </h3>
                        </div>
                        {dayEvents.map(event => (
                          <EventCard key={event.id} event={event} onClick={setSelectedEvent} />
                        ))}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Monthly View Logic */
                <div className="grid gap-4">
                  {events.filter(e => {
                    const now = new Date();
                    const eDate = new Date(e.startAt);
                    return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear() && eDate >= now;
                  }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime()).length > 0 ? (
                    events.filter(e => {
                      const now = new Date();
                      const eDate = new Date(e.startAt);
                      return eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear() && eDate >= now;
                    }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime()).map(event => (
                      <div key={event.id} className="relative pl-6 border-l-2 border-slate-800 hover:border-sky-500 transition-colors">
                        <div className="absolute top-0 left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-800 ring-4 ring-[#020617] group-hover:bg-sky-500"></div>
                        <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">
                          {event.startAt.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })} • {event.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                        <EventCard event={event} onClick={setSelectedEvent} />
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-500 text-center py-10">No upcoming events this month.</p>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'favorites':
        return (
          <div className="flex flex-col h-full bg-[#020617] overflow-y-auto no-scrollbar pb-32">
            {/* Passport Header */}
            <div className="p-6 pt-16 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setActiveView('explore')} className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
                  <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-xl font-black text-white tracking-tight uppercase">Passport</h1>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowProfileEdit(true)} className="p-2 rounded-full hover:bg-slate-800 transition-colors">
                  <Edit3 className="w-6 h-6 text-slate-400" />
                </button>
                <button
                  onClick={async () => {
                    if (confirm('¿Seguro que quieres cerrar sesión?')) {
                      await logout();
                    }
                  }}
                  className="p-2 rounded-full hover:bg-red-900/30 transition-colors"
                >
                  <LogOut className="w-6 h-6 text-red-400" />
                </button>
              </div>
            </div>

            {/* Profile Section */}
            <div className="flex flex-col items-center gap-4 py-4">
              <div className="relative">
                <div className="w-32 h-32 rounded-full border-4 border-slate-800 p-1.5 bg-slate-900 shadow-2xl relative">
                  <img src={user?.avatarUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?ixlib=rb-1.2.1&auto=format&fit=crop&w=300&q=80"} className="w-full h-full rounded-full object-cover" />
                  <div className="absolute bottom-2 right-2 bg-sky-500 p-2 rounded-full ring-4 ring-[#020617]">
                    <CheckCircle className="w-4 h-4 text-white fill-current" />
                  </div>
                </div>
              </div>
              <div className="text-center space-y-1">
                <h2 className="text-3xl font-black text-white tracking-tighter">{user?.name || "Visitante"}</h2>
                <div className="flex items-center justify-center gap-2 text-slate-500 font-bold text-xs">
                  <MapPin className="w-3 h-3" /> Citizen of Montañita
                  <span>•</span>
                  Traveler Level 5
                </div>
              </div>
            </div>

            {/* Progress Card */}
            <div className="px-6 mt-4">
              <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-6 space-y-3">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-black text-sky-400 uppercase tracking-widest">Local Legend Progress</span>
                  <span className="text-xs font-black text-white">2/3 Sectors</span>
                </div>
                <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" style={{ width: '66%' }} />
                </div>
              </div>
            </div>

            {/* My Journey */}
            <div className="px-6 mt-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white">My Journey</h3>
                <button onClick={() => setActiveView('explore')} className="text-xs font-bold text-sky-400">View Map</button>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {journeyCards.map(b => (
                  <div
                    key={b.id}
                    onClick={() => {
                      let sectorToSelect: Sector | null = null;
                      if (b.id === 'CENTRO') sectorToSelect = Sector.CENTRO;
                      if (b.id === 'LA PUNTA') sectorToSelect = Sector.LA_PUNTA;
                      if (b.id === 'TIGRILLO') sectorToSelect = Sector.TIGRILLO;

                      if (sectorToSelect) {
                        setSelectedSector(sectorToSelect);
                        setActiveView('explore');
                      }
                    }}
                    className={`cursor-pointer hover:scale-105 transition-transform flex flex-col items-center gap-3 p-4 rounded-[2rem] border border-white/5 ${b.active ? b.bg : 'opacity-40'} relative group`}
                  >
                    <div className={`p-3 rounded-full ${b.active ? 'bg-white/10' : 'bg-slate-800'}`}>
                      <Store className={`w-6 h-6 ${b.color}`} />
                    </div>
                    <span className="text-[10px] font-black uppercase text-white tracking-tighter text-center">{b.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Business Info - Only for hosts */}
            {user?.role === 'host' && user?.businessId && (
              <div className="px-6 mt-8">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-black text-white">Mi Negocio</h3>
                  <button onClick={() => setShowBusinessEdit(true)} className="text-xs font-bold text-sky-400 flex items-center gap-1">
                    <Edit3 className="w-3 h-3" /> Edit Business
                  </button>
                </div>
                <div className="bg-slate-900/40 border border-white/5 rounded-[2rem] p-4">
                  {(() => {
                    const business = businesses.find(b => b.id === user.businessId);
                    if (!business) return <p className="text-slate-500 text-sm">Negocio no encontrado</p>;
                    return (
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <img src={business.imageUrl} className="w-16 h-16 rounded-xl object-cover" alt={business.name} />
                          <div>
                            <h4 className="font-bold text-white">{business.name}</h4>
                            <p className="text-xs text-slate-500">{business.sector}</p>
                          </div>
                        </div>
                        <p className="text-sm text-slate-400">{business.description}</p>
                        {business.whatsapp && (
                          <a
                            href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 px-3 py-2 bg-green-500/10 border border-green-500/20 rounded-xl text-sm text-green-400 hover:bg-green-500/20 transition"
                          >
                            <MessageCircle className="w-4 h-4" />
                            <span className="font-bold">WhatsApp:</span> {business.whatsapp}
                          </a>
                        )}
                        {business.phone && (
                          <a
                            href={`tel:${business.phone}`}
                            className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 border border-slate-700 rounded-xl text-sm text-slate-300 hover:bg-slate-800 transition"
                          >
                            <Phone className="w-4 h-4" />
                            <span className="font-bold">Phone:</span> {business.phone}
                          </a>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            )}

            {/* Saved Events */}
            <div className="px-6 mt-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-black text-white">Saved Events</h3>
                <button
                  onClick={() => setActiveView('all-favorites')}
                  className="text-xs font-bold text-slate-500 hover:text-white transition-colors"
                >
                  See All
                </button>
              </div>
              <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4 -mx-6 px-6">
                {favoritedEvents.length > 0 ? favoritedEvents.map(event => (
                  <div key={event.id} className="min-w-[280px] w-[280px]">
                    <EventCard event={event} onClick={setSelectedEvent} />
                  </div>
                )) : (
                  <div className="w-full py-8 text-center text-slate-600 bg-slate-900/40 rounded-[2rem] border border-dashed border-slate-800">
                    No events saved yet
                  </div>
                )}
              </div>
            </div>

            {/* Your Vibe */}
            <div className="px-6 mt-6 mb-12">
              <h3 className="text-lg font-black text-white mb-4">Your Vibe</h3>
              <div className="flex flex-wrap gap-2">
                {Object.values(Vibe).map(v => (
                  <button
                    key={v}
                    onClick={() => {
                      if (user) setUser({ ...user, preferredVibe: v });
                      setActiveFilter(v);
                      setActiveView('explore');
                    }}
                    className={`px-6 py-2.5 rounded-xl border font-black text-xs transition-all ${user?.preferredVibe === v ? 'bg-sky-500 border-sky-400 text-white' : 'bg-slate-900 border-white/5 text-slate-400'}`}
                  >
                    {v}
                  </button>
                ))}
              </div>

              {/* Migrate to Firestore Button */}
              {/* Migrate to Firestore Button - Admin Only */}
              {isAdmin && (
                <button
                  onClick={() => setShowMigrationPanel(true)}
                  className="mt-6 w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black py-4 rounded-2xl hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  <span>Migrate to Firestore</span>
                </button>
              )}
            </div>
          </div>
        );

      case 'host':
        if (!user) {
          return (
            <div className="p-6 pt-24 flex flex-col gap-8 animate-in slide-in-from-bottom duration-500 h-full overflow-y-auto pb-32 no-scrollbar">
              <div className="space-y-2 text-center">
                <h1 className="text-5xl font-black tracking-tighter leading-tight text-white">ÚNETE AL <span className="text-rose-500">PULSO.</span></h1>
                <p className="text-slate-400 font-medium">Crea tu perfil y empieza a vibrar con Montañita.</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setRegForm({ ...regForm, role: 'visitor' })}
                  className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all duration-300 ${regForm.role === 'visitor' ? 'bg-rose-500/10 border-rose-500 shadow-lg shadow-rose-500/10' : 'bg-slate-800/40 border-slate-700 text-slate-500'}`}
                >
                  <Compass className={`w-8 h-8 ${regForm.role === 'visitor' ? 'text-rose-500' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Soy Visitante</span>
                </button>
                <button
                  onClick={() => setRegForm({ ...regForm, role: 'host' })}
                  className={`flex flex-col items-center gap-3 p-6 rounded-[2rem] border-2 transition-all duration-300 ${regForm.role === 'host' ? 'bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/10' : 'bg-slate-800/40 border-slate-700 text-slate-500'}`}
                >
                  <Store className={`w-8 h-8 ${regForm.role === 'host' ? 'text-indigo-500' : ''}`} />
                  <span className="text-[10px] font-black uppercase tracking-widest">Soy Negocio</span>
                </button>
              </div>



              <form onSubmit={handleRegister} className="space-y-5 bg-slate-800/30 p-8 rounded-[2.5rem] border border-slate-700 backdrop-blur-xl">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tu Nombre</label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      required
                      type="text"
                      placeholder="Ej. Juan Montañita"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-12 pr-5 py-4 focus:border-rose-500 outline-none font-bold text-white transition-all shadow-inner"
                      value={regForm.name}
                      onChange={e => setRegForm({ ...regForm, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                    <input
                      required
                      type="email"
                      placeholder="hola@playa.com"
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl pl-12 pr-5 py-4 focus:border-rose-500 outline-none font-bold text-white transition-all shadow-inner"
                      value={regForm.email}
                      onChange={e => setRegForm({ ...regForm, email: e.target.value })}
                    />
                  </div>
                </div>

                {regForm.role === 'visitor' && (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Tu Vibra Favorita</label>
                    <select
                      className="w-full bg-slate-900/50 border border-slate-700 rounded-2xl px-5 py-4 focus:border-rose-500 outline-none font-bold text-white appearance-none cursor-pointer"
                      value={regForm.vibe}
                      onChange={e => setRegForm({ ...regForm, vibe: e.target.value as Vibe })}
                    >
                      {Object.values(Vibe).map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                )}

                <button
                  type="submit"
                  className={`w-full py-5 active:scale-95 transition-all text-white font-black rounded-2xl flex items-center justify-center gap-3 shadow-xl mt-4 ${regForm.role === 'host' ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-rose-500 shadow-rose-500/20'}`}
                >
                  {regForm.role === 'host' ? 'SIGUIENTE: DATOS NEGOCIO' : 'REGISTRARME AHORA'}
                  <ArrowRight className="w-5 h-5" />
                </button>
              </form>
            </div>
          );
        }

        if (user.role === 'visitor' || user.role === 'admin') {
          return (
            <div className="p-6 pt-20 flex flex-col gap-6 animate-in fade-in duration-300 h-full overflow-y-auto pb-24 no-scrollbar">
              <div className="flex items-center justify-between">
                <h1 className="text-4xl font-black tracking-tighter text-white">PERFIL</h1>
                <button onClick={() => setUser(null)} className="p-3 bg-slate-800 rounded-2xl border border-slate-700 text-slate-400 hover:text-rose-500 transition-colors">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>

              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[2.5rem] p-8 border border-slate-700 space-y-6 shadow-2xl relative overflow-hidden group">
                <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 blur-[80px] rounded-full"></div>
                <div className="flex items-center gap-6 relative z-10">
                  <div className="w-20 h-20 rounded-[2rem] overflow-hidden ring-4 ring-rose-500/20 shadow-xl">
                    <img src={user.avatarUrl} alt="User Avatar" className="w-full h-full object-cover" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white">{user.name}</h3>
                    <span className="text-[10px] font-black uppercase tracking-widest text-rose-500 bg-rose-500/10 px-2 py-1 rounded-lg">
                      {user.preferredVibe}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-indigo-500/10 border-2 border-dashed border-indigo-500/30 p-8 rounded-[2.5rem] flex flex-col items-center text-center gap-4">
                <Store className="w-12 h-12 text-indigo-400" />
                <div>
                  <h3 className="text-xl font-black text-white">¿Te cambiaste al bando business?</h3>
                  <p className="text-slate-400 text-sm mt-1">Registra tu local para empezar a publicar eventos.</p>
                </div>
                <button
                  onClick={() => setShowBusinessReg(true)}
                  className="w-full py-4 bg-indigo-500 text-white font-black rounded-2xl shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                >
                  REGISTRAR MI NEGOCIO
                </button>
              </div>
            </div>
          );
        }

        return (
          <div className="p-6 pt-20 flex flex-col gap-6 h-full overflow-y-auto pb-24 no-scrollbar bg-[#020617]">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <h1 className="text-2xl font-black text-white tracking-tight">Host Hub</h1>
                <span className="text-xs text-slate-500 font-medium">Dashboard Control • Montañita</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setActiveView('calendar')}
                  className="p-2.5 bg-slate-900 rounded-xl border border-white/5 text-slate-400 relative hover:text-white transition-colors"
                >
                  <span className="absolute top-2 right-2 w-2 h-2 bg-sky-500 rounded-full ring-2 ring-slate-900"></span>
                  <Calendar className="w-5 h-5" />
                </button>
                <button onClick={() => setUser(null)} className="p-2.5 bg-slate-900 rounded-xl border border-white/5 text-slate-400">
                  <LogOut className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Profile Header Block */}
            <div className="flex items-center gap-4 py-4">
              <div className="relative">
                <div className="w-20 h-20 rounded-full border-2 border-slate-800 p-1 bg-slate-900 shadow-xl overflow-hidden">
                  <img src={userBusiness?.imageUrl || bizForm.imageUrl || user?.avatarUrl || "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=400"} className="w-full h-full object-cover rounded-full" />
                </div>
                <div className="absolute -bottom-1 -right-1 bg-sky-500 p-1.5 rounded-full ring-4 ring-[#020617]">
                  <CheckCircle className="w-3 h-3 text-white fill-current" />
                </div>
              </div>
              <div>
                <h2 className="text-2xl font-black text-white tracking-tight">{userBusiness?.name || bizForm.name || user?.name || "Mi Negocio"}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <MapPin className="w-3 h-3 text-slate-500" />
                  <span className="text-xs text-slate-400 font-medium">Sector: {userBusiness?.sector || bizForm.sector}, Montañita</span>
                </div>
                <button
                  onClick={() => setActiveView('favorites')}
                  className="mt-2 text-[10px] font-bold text-sky-400 bg-sky-500/10 px-3 py-1 rounded-full border border-sky-500/20"
                >
                  Premium Partner
                </button>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                <div className="absolute bottom-0 left-0 w-full h-1 bg-emerald-500/50" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Views</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-2xl font-black text-white">1.2k</span>
                  <span className="text-[10px] font-bold text-emerald-500 mb-1">+12%</span>
                </div>
              </div>
              <div className="bg-slate-900/40 p-5 rounded-[2rem] border border-white/5 relative overflow-hidden group">
                <div className="absolute bottom-0 left-0 w-1/2 h-1 bg-sky-500" />
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">RSVPs This Week</span>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-2xl font-black text-white">84</span>
                  <span className="text-[10px] font-bold text-sky-500 mb-1">Live</span>
                </div>
              </div>
            </div>

            {/* Profile Completion */}
            <div className="bg-slate-900/40 p-6 rounded-[2rem] border border-white/5 space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-white">Profile Completion</h4>
                  <p className="text-[10px] text-slate-500">Add social links for 100%</p>
                </div>
                <span className="text-lg font-black text-sky-500">85%</span>
              </div>
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
                <div className="h-full bg-sky-500 rounded-full shadow-[0_0_10px_rgba(14,165,233,0.5)]" style={{ width: '85%' }} />
              </div>
            </div>

            <button
              onClick={() => {
                setEditingEventId(null);
                setNewEvent(initialNewEvent);
                setGeneratedDesc('');
                setShowHostWizard(true);
              }}
              className="w-full py-5 bg-sky-500 hover:bg-sky-600 active:scale-95 transition-all text-white font-black rounded-[1.5rem] flex items-center justify-center gap-3 shadow-[0_8px_30px_rgb(14,165,233,0.3)]"
            >
              <Plus className="w-6 h-6" /> Create New Event
            </button>

            <div className="flex items-center justify-between mt-4">
              <h3 className="text-lg font-black text-white">Active Events</h3>
              <button
                onClick={() => setActiveView('history')}
                className="text-xs font-bold text-sky-400 hover:text-sky-300 transition-colors"
              >
                View History
              </button>
            </div>

            <div className="space-y-4">
              {events.filter(e => {
                const now = new Date();
                const isMyEvent = userBusiness ? e.businessId === userBusiness.id : e.businessId === (bizForm.name || user?.name || 'Host Local');
                return isMyEvent && e.endAt > now;
              }).length > 0 ? (
                events.filter(e => {
                  const now = new Date();
                  const isMyEvent = userBusiness ? e.businessId === userBusiness.id : e.businessId === (bizForm.name || user?.name || 'Host Local');
                  return isMyEvent && e.endAt > now;
                }).map(event => (
                  <div key={event.id} className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-4 flex items-center gap-4 group">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-800 flex-shrink-0">
                      <img src={event.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-white text-base truncate">{event.title}</h4>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold mt-1">
                        <Calendar className="w-3 h-3" />
                        <span>Today, {event.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${Object.values(rsvpStatus).filter(v => v).length > 0 ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                        <span className="text-[10px] font-black text-slate-300 uppercase">
                          Attendance: {Object.values(rsvpStatus).filter(v => v).length} Pulse Requests
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleEditEvent(event)} className="p-2 bg-slate-800 text-slate-400 rounded-full hover:bg-slate-700"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDeleteEvent(event.id)} className="p-2 bg-slate-800 text-rose-500/80 rounded-full hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-center flex flex-col items-center gap-3">
                  <ImageIcon className="w-10 h-10 text-slate-700" />
                  <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No active pulses</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="p-6 pt-20 flex flex-col gap-6 h-full overflow-y-auto pb-24 no-scrollbar bg-[#020617]">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveView('host')} className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-2xl font-black text-white tracking-tight">Event History</h1>
            </div>

            <div className="space-y-4">
              {events.filter(e => {
                const now = new Date();
                const isMyEvent = userBusiness ? e.businessId === userBusiness.id : e.businessId === (bizForm.name || user?.name || 'Host Local');
                return isMyEvent && e.endAt <= now;
              }).length > 0 ? (
                events.filter(e => {
                  const now = new Date();
                  const isMyEvent = userBusiness ? e.businessId === userBusiness.id : e.businessId === (bizForm.name || user?.name || 'Host Local');
                  return isMyEvent && e.endAt <= now;
                }).sort((a, b) => b.endAt.getTime() - a.endAt.getTime()).map(event => (
                  <div key={event.id} className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-4 flex items-center gap-4 group opacity-75 hover:opacity-100 transition-opacity">
                    <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 grayscale group-hover:grayscale-0 transition-all flex-shrink-0">
                      <img src={event.imageUrl} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-slate-300 text-base truncate">{event.title}</h4>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold mt-1">
                        <Clock className="w-3 h-3" />
                        <span>Ended: {event.endAt.toLocaleDateString()}</span>
                      </div>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-500 uppercase">
                          Final Attendance: {Object.values(rsvpStatus).filter(v => v).length /* This is global, should be event specific ideally but using mock logic */}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => handleDeleteEvent(event.id)} className="p-2 bg-slate-800 text-rose-500/80 rounded-full hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-center flex flex-col items-center gap-3">
                  <Clock className="w-10 h-10 text-slate-700" />
                  <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No past events</p>
                </div>
              )}
            </div>
          </div>
        );

      case 'all-favorites':
        return (
          <div className="p-6 pt-20 flex flex-col gap-6 h-full overflow-y-auto pb-24 no-scrollbar bg-[#020617]">
            <div className="flex items-center gap-4">
              <button onClick={() => setActiveView('favorites')} className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
                <ChevronLeft className="w-6 h-6 text-white" />
              </button>
              <h1 className="text-2xl font-black text-white tracking-tight">Saved Events</h1>
            </div>

            <div className="space-y-4">
              {favoritedEvents.length > 0 ? (
                favoritedEvents.map(event => (
                  <div key={event.id} className="w-full">
                    <EventCard event={event} onClick={setSelectedEvent} />
                  </div>
                ))
              ) : (
                <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-center flex flex-col items-center gap-3">
                  <Heart className="w-10 h-10 text-slate-700" />
                  <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No events saved yet</p>
                </div>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="relative h-screen w-screen bg-slate-900 overflow-hidden flex flex-col font-sans select-none">
      <div className="fixed top-0 left-0 right-0 z-50 bg-slate-900/60 backdrop-blur-xl border-b border-white/5 h-16 flex items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-gradient-to-br from-rose-500 to-orange-500 rounded-xl flex items-center justify-center shadow-lg shadow-rose-500/20 rotate-3">
            <div className="w-2.5 h-2.5 bg-white rounded-full animate-ping"></div>
          </div>
          <div className="flex flex-col">
            <span className="text-base font-black tracking-tighter text-white leading-none">MONTAÑITA</span>
            <span className="text-[10px] font-black tracking-[0.3em] text-rose-500 leading-none mt-0.5">PULSE</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="flex items-center gap-2 pr-2">
              <span className="text-[10px] font-black text-white uppercase tracking-tighter hidden sm:inline">{user.name}</span>
              <div className="w-6 h-6 rounded-full border border-rose-500 overflow-hidden ring-2 ring-rose-500/20">
                <img src={user.avatarUrl} className="w-full h-full object-cover" />
              </div>
            </div>
          )}
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">PULSOS</span>
            <span className="text-xs font-black text-rose-500 leading-none">+{events.length} Hoy</span>
          </div>
        </div>
      </div>

      <main className="flex-1 overflow-hidden">
        {renderView()}
      </main>

      {activeView === 'explore' && !selectedEvent && (
        <div className="fixed bottom-28 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom duration-500">
          <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
            {Object.values(Sector).map((sector) => {
              const info = SECTOR_INFO[sector];
              const isActive = selectedSector === sector;
              return (
                <button
                  key={sector}
                  onClick={() => {
                    toggleSector(sector);
                    setActiveFilter('All');
                  }}
                  className={`flex flex-col items-center justify-center gap-1 px-6 py-2.5 rounded-2xl whitespace-nowrap border-2 transition-all duration-300 backdrop-blur-md ${isActive
                    ? `${info.bg} border-${info.color.split('-')[1]}-500 shadow-xl scale-105`
                    : 'bg-slate-900/60 border-white/5 text-slate-500 hover:bg-slate-800'
                    }`}
                >
                  <div className={`w-2 h-2 rounded-full ${isActive ? info.color.replace('text-', 'bg-') : 'bg-slate-700'}`}></div>
                  <span className={`text-[10px] font-black uppercase tracking-widest ${isActive ? 'text-white' : ''}`}>
                    {sectorLabels[sector] || sector}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 bg-[#0f172a]/80 backdrop-blur-2xl border-t border-white/5 h-20 px-4 pb-0 z-[60] flex items-center justify-around">
        {[
          { id: 'explore', icon: Compass, label: 'Discover' },
          { id: 'calendar', icon: Calendar, label: 'Calendar' },
          { id: 'favorites', icon: Heart, label: 'Saved' },
          { id: 'host', icon: User, label: user ? 'Profile' : 'Login' }
        ].map((item) => {
          const Icon = item.icon;
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id as ViewType)}
              className="flex flex-col items-center gap-1 group py-1 min-w-[64px] transition-all"
            >
              <div className={`p-2 rounded-xl transition-all duration-300 ${isActive ? 'bg-sky-500/10 text-sky-400' : 'text-slate-500 group-hover:text-slate-400'}`}>
                <Icon className={`w-6 h-6 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              </div>
              <span className={`text-[10px] font-bold transition-all duration-300 ${isActive ? 'text-sky-400' : 'text-slate-600 opacity-60'}`}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute top-0 w-8 h-1 bg-sky-500 rounded-full blur-[2px] opacity-80" />
              )}
            </button>
          );
        })}
      </nav>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'event')} />
      <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageUpload(e, 'event')} />
      <input ref={bizFileInputRef} type="file" accept="image/*" className="hidden" onChange={(e) => handleImageUpload(e, 'business')} />
      <input ref={bizCameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleImageUpload(e, 'business')} />

      {showBusinessReg && (
        <div className="fixed inset-0 z-[2120] bg-slate-900 flex flex-col p-8 overflow-y-auto pb-32 no-scrollbar">
          <div className="space-y-2 text-center mb-8">
            <Store className="w-12 h-12 text-indigo-500 mx-auto mb-4" />
            <h2 className="text-3xl font-black text-white tracking-tighter">Tu espacio en Montañita</h2>
          </div>
          <div className="relative w-full aspect-video bg-slate-800 rounded-3xl border-2 border-dashed border-slate-700 flex items-center justify-center gap-3 text-slate-500 overflow-hidden mb-6">
            <img src={bizForm.imageUrl} className="absolute inset-0 w-full h-full object-cover opacity-60" />
            <div className="absolute inset-0 flex items-center justify-center gap-4 bg-black/40">
              <button onClick={() => bizCameraInputRef.current?.click()} className="p-4 bg-white/20 rounded-full"><Camera className="w-6 h-6 text-white" /></button>
              <button onClick={() => bizFileInputRef.current?.click()} className="p-4 bg-white/20 rounded-full"><Upload className="w-6 h-6 text-white" /></button>
            </div>
          </div>
          <form onSubmit={handleBusinessRegister} className="space-y-6">
            <input required type="text" placeholder="Nombre Comercial" className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 font-bold text-white shadow-inner" value={bizForm.name} onChange={e => setBizForm({ ...bizForm, name: e.target.value })} />
            <select className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 font-bold text-white appearance-none" value={bizForm.sector} onChange={e => setBizForm({ ...bizForm, sector: e.target.value as Sector })}>
              {Object.values(Sector).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            <textarea rows={3} placeholder="Bio del Local" className="w-full bg-slate-800 border border-slate-700 rounded-3xl px-6 py-5 text-slate-300 text-sm shadow-inner" value={bizForm.description} onChange={e => setBizForm({ ...bizForm, description: e.target.value })} />
            <button type="submit" className="w-full py-5 bg-indigo-500 text-white font-black rounded-2xl shadow-xl shadow-indigo-500/20 active:scale-95 transition-all">FINALIZAR REGISTRO</button>
          </form>
        </div>
      )}

      {showHostWizard && (
        <div className="fixed inset-0 z-[2110] bg-slate-900 flex flex-col p-6 overflow-y-auto pb-32 no-scrollbar">
          <div className="flex items-center justify-between mb-8">
            <button onClick={() => { setShowHostWizard(false); setEditingEventId(null); }} className="text-slate-400 font-bold">Cerrar</button>
            <h2 className="text-white font-black uppercase tracking-widest text-xs">{editingEventId ? 'EDITAR PULSO' : 'NUEVO PULSO'}</h2>
            <button onClick={handleSaveEvent} className="text-emerald-500 font-black">Guardar</button>
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
            <div className="grid grid-cols-2 gap-4">
              <select className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 font-bold text-white appearance-none" value={newEvent.sector} onChange={e => setNewEvent({ ...newEvent, sector: e.target.value as Sector })}>
                {Object.values(Sector).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 font-bold text-white appearance-none" value={newEvent.vibe} onChange={e => setNewEvent({ ...newEvent, vibe: e.target.value as Vibe })}>
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
                <button onClick={handleGenerateAIEvent} className="text-[10px] font-black text-indigo-400 uppercase tracking-widest"><Sparkles className="w-3 h-3 inline mr-1" /> AI Draft</button>
              </div>
              <textarea rows={4} placeholder="Descripción" className="w-full bg-slate-800 border border-slate-700 rounded-3xl px-6 py-5 text-slate-300 text-sm shadow-inner" value={generatedDesc} onChange={e => setGeneratedDesc(e.target.value)} />
            </div>
          </div>
        </div>
      )}

      {selectedEvent && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/80 backdrop-blur-xl flex items-end justify-center animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-slate-900 rounded-t-[3.5rem] overflow-hidden flex flex-col max-h-[95vh] shadow-2xl animate-in slide-in-from-bottom duration-500 relative">
            <div className="relative h-80 flex-shrink-0">
              <img src={selectedEvent.imageUrl} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent"></div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="absolute top-6 right-6 w-14 h-14 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-2xl z-[100] active:scale-90 transition-transform"
              >
                <X className="w-8 h-8 stroke-[3]" />
              </button>
              <div className="absolute bottom-6 left-8 flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-2 overflow-hidden ring-4 ring-white/5">
                  <img
                    src={businesses.find(b => b.id === selectedEvent.businessId)?.imageUrl || `https://i.pravatar.cc/100?u=${selectedEvent.businessId}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase text-slate-400">Publicado por</span>
                  <h4 className="text-white font-black">
                    {businesses.find(b => b.id === selectedEvent.businessId)?.name || 'Anónimo'}
                  </h4>
                </div>
              </div>
            </div>
            <div className="p-8 overflow-y-auto no-scrollbar flex-1 space-y-6">
              <div>
                <div className="flex gap-2 mb-4">
                  <span className="px-3 py-1 bg-rose-500/10 text-rose-500 rounded-lg text-[10px] font-black uppercase tracking-widest border border-rose-500/20">{selectedEvent.sector}</span>
                  <span className="px-3 py-1 bg-slate-800 text-slate-400 rounded-lg text-[10px] font-black uppercase tracking-widest border border-slate-700">{selectedEvent.vibe}</span>
                </div>
                <h2 className="text-3xl font-black text-white leading-tight mb-4">{selectedEvent.title}</h2>
                <p className="text-slate-400 text-sm leading-relaxed">{selectedEvent.description}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-2xl border border-slate-700/50">
                  <Clock className="w-5 h-5 text-rose-500" />
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-500 uppercase">Horario</span>
                    <span className="text-white font-bold text-sm">
                      {selectedEvent.startAt.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric', month: 'short' })}, {selectedEvent.startAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <span className="text-slate-400 font-bold text-xs mt-0.5">
                      Hasta: {selectedEvent.endAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      {selectedEvent.startAt.getDate() !== selectedEvent.endAt.getDate() &&
                        ` (${selectedEvent.endAt.toLocaleDateString('es-EC', { weekday: 'short', day: 'numeric' })})`
                      }
                    </span>
                  </div>
                </div>

                {(() => {
                  const business = businesses.find(b => b.id === selectedEvent.businessId || b.name === selectedEvent.businessId);
                  if (business?.whatsapp) {
                    return (
                      <a
                        href={`https://wa.me/${business.whatsapp.replace(/[^0-9]/g, '')}?text=Hola, vi su evento ${selectedEvent.title} en MontaPulse!`}
                        target="_blank"
                        className="flex items-center justify-center gap-2 p-4 bg-green-500/10 hover:bg-green-500/20 rounded-2xl border border-green-500/20 transition-all group"
                      >
                        <MessageCircle className="w-6 h-6 text-green-500 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-black text-green-400 uppercase tracking-wider">WhatsApp</span>
                      </a>
                    );
                  }
                  return null;
                })()}
              </div>

              <div className="pb-8 pt-4">
                {new Date() > selectedEvent.endAt ? (
                  <button disabled className="w-full py-6 rounded-[2.5rem] font-black text-xs sm:text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 shadow-none bg-slate-800/50 text-slate-500 border-2 border-slate-700/50 cursor-not-allowed">
                    <Clock className="w-5 h-5" /> TE PERDISTE EL SENTIR EL PULSO
                  </button>
                ) : (
                  <button onClick={() => handleRSVP(selectedEvent.id)} className={`w-full py-6 rounded-[2.5rem] font-black text-sm uppercase tracking-[0.25em] transition-all flex items-center justify-center gap-3 shadow-2xl ${rsvpStatus[selectedEvent.id] ? 'bg-slate-800 text-emerald-500 border-2 border-emerald-500/40' : 'bg-gradient-to-r from-rose-600 via-rose-500 to-orange-500 text-white'}`}>
                    {rsvpStatus[selectedEvent.id] ? <><CheckCircle className="w-5 h-5" /> ASISTIRÉ</> : 'SENTIR EL PULSO'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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
              <div>
                <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Name</label>
                <input
                  type="text"
                  value={user.name}
                  onChange={(e) => setUser({ ...user, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                />
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
                className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl hover:bg-sky-600 transition"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Business Edit Modal */}
      {showBusinessEdit && user?.role === 'host' && user?.businessId && (
        <div className="fixed inset-0 z-[2100] bg-slate-900/80 backdrop-blur-md flex items-end justify-center">
          <div className="w-full max-w-lg bg-slate-900 rounded-t-[3.5rem] p-8 pb-12 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-black text-white">Edit Business</h2>
              <button onClick={() => setShowBusinessEdit(false)} className="p-2 rounded-full hover:bg-slate-800">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>

            {(() => {
              const business = businesses.find(b => b.id === user.businessId);
              if (!business) return <p className="text-slate-500">Business not found</p>;

              return (
                <div className="space-y-6">
                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Business Name</label>
                    <input
                      type="text"
                      value={business.name}
                      onChange={(e) => setBusinesses(prev => prev.map(b =>
                        b.id === user.businessId ? { ...b, name: e.target.value } : b
                      ))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Description</label>
                    <textarea
                      rows={3}
                      value={business.description}
                      onChange={(e) => setBusinesses(prev => prev.map(b =>
                        b.id === user.businessId ? { ...b, description: e.target.value } : b
                      ))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Sector</label>
                    <select
                      value={business.sector}
                      onChange={(e) => setBusinesses(prev => prev.map(b =>
                        b.id === user.businessId ? { ...b, sector: e.target.value as Sector } : b
                      ))}
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                    >
                      {Object.values(Sector).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block">WhatsApp</label>
                    <input
                      type="tel"
                      value={business.whatsapp || ''}
                      onChange={(e) => setBusinesses(prev => prev.map(b =>
                        b.id === user.businessId ? { ...b, whatsapp: e.target.value } : b
                      ))}
                      placeholder="+593 99 999 9999"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Phone</label>
                    <input
                      type="tel"
                      value={business.phone || ''}
                      onChange={(e) => setBusinesses(prev => prev.map(b =>
                        b.id === user.businessId ? { ...b, phone: e.target.value } : b
                      ))}
                      placeholder="+593 99 999 9999"
                      className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-black text-slate-500 uppercase mb-2 block">Business Image</label>

                    {/* Image Preview */}
                    <div className="mb-4 rounded-2xl overflow-hidden border-2 border-slate-700">
                      <img
                        src={business.imageUrl}
                        alt="Business"
                        className="w-full h-48 object-cover"
                      />
                    </div>

                    {/* Upload Buttons */}
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => bizEditCameraInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white hover:bg-slate-700 transition"
                      >
                        <Camera className="w-5 h-5" />
                        <span className="text-sm font-bold">Camera</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => bizEditFileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-white hover:bg-slate-700 transition"
                      >
                        <Upload className="w-5 h-5" />
                        <span className="text-sm font-bold">Gallery</span>
                      </button>
                    </div>
                  </div>

                  <button
                    onClick={handleUpdateBusinessProfile}
                    className="w-full bg-sky-500 text-white font-black py-4 rounded-2xl hover:bg-sky-600 transition"
                  >
                    Save Changes
                  </button>
                </div>
              );
            })()}

            {/* Hidden file inputs dedicated for editing */}
            <input
              type="file"
              ref={bizEditCameraInputRef}
              accept="image/*"
              capture="environment"
              onChange={handleBusinessImageUpload}
              className="hidden"
            />
            <input
              type="file"
              ref={bizEditFileInputRef}
              accept="image/*"
              onChange={handleBusinessImageUpload}
              className="hidden"
            />
          </div>
        </div>
      )}

      {/* Migration Panel */}
      {showMigrationPanel && (
        <MigrationPanel onClose={() => setShowMigrationPanel(false)} />
      )}
    </div>
  );
};

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen />;
  }

  return <Dashboard />;
}
