import React, { useState, useMemo, useEffect, useRef, useDeferredValue, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Sparkles, MapPin, Store, Waves, Leaf, ExternalLink, Heart, Zap, ShieldCheck, Flame, Star, Search, Filter, Layers, ChevronDown, ChevronUp, TrendingUp, Clock, Trash2, ArrowRight, Radio, Navigation, Route, Compass } from 'lucide-react';
import { MapView } from '../components/Map/MapView';
import { EventCard } from '../components/EventCard';
import { Sector, MontanitaEvent, Business, BusinessCategory, Vibe, SubscriptionPlan, MapEntryType } from '../types';
import { LOCALITIES, LOCALITY_SECTORS, SECTOR_INFO, LOCALITY_POLYGONS, BASE_URL } from '../constants';
import { deleteBusiness, createBusiness, updateBusiness, incrementBusinessViewCount } from '../services/firestoreService';
import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { PageLoader } from '../components/common/PageLoader';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { isBusinessOpen, isEventPublicAndActive } from '../utils/timeUtils';
import { useSEO } from '../hooks/useSEO';
import type { PlannerSection } from '../services/geminiService';

const ItineraryModal = lazy(() => import('../components/Modals/ItineraryModal').then(m => ({ default: m.ItineraryModal })));
const PlannerChatModal = lazy(() => import('../components/Modals/PlannerChatModal').then(m => ({ default: m.PlannerChatModal })));
const LocalityManagerModal = lazy(() => import('../components/Modals/LocalityManagerModal').then(m => ({ default: m.LocalityManagerModal })));
import { Skeleton } from '../components/Skeleton';

const ACTIVITY_TO_CATEGORIES: Record<string, BusinessCategory[]> = {
  "Bailar": [BusinessCategory.BAR, BusinessCategory.DISCOTECA, BusinessCategory.BAR_DISCOTECA],
  "Comer": [BusinessCategory.RESTAURANTE, BusinessCategory.MERCADO],
  "Cuidado Personal": [BusinessCategory.HOSPITAL],
  "Deporte": [BusinessCategory.CANCHA, BusinessCategory.ESCUELA_SURF, BusinessCategory.CENTRO_SURF],
  "Descansar": [BusinessCategory.HOSTAL, BusinessCategory.HOTEL, BusinessCategory.HOSPAJE],
  "Farrear": [BusinessCategory.BAR, BusinessCategory.DISCOTECA, BusinessCategory.BAR_DISCOTECA],
  "Plan Relax": [BusinessCategory.HOTEL, BusinessCategory.HOSTAL, BusinessCategory.HOSPAJE, BusinessCategory.PLAYA, BusinessCategory.PARQUE],
  "Surf": [BusinessCategory.ESCUELA_SURF, BusinessCategory.CENTRO_SURF, BusinessCategory.PLAYA],
  "Trabajar": [BusinessCategory.HOTEL, BusinessCategory.HOSTAL, BusinessCategory.HOSPAJE, BusinessCategory.OTRO],
  "Turismo": [BusinessCategory.TOUR_OPERATOR, BusinessCategory.REFERENCIA, BusinessCategory.PLAYA, BusinessCategory.PARQUE, BusinessCategory.MALECON]
};

const getDistance = (coords1: [number, number], coords2: [number, number]): number => {
    const [lat1, lon1] = coords1;
    const [lat2, lon2] = coords2;
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

interface ExploreProps {
    onEditBusiness?: (id: string) => void;
    userBusinessId?: string;
    focusCoords?: { coords: [number, number]; zoom: number } | null;
    onClearFocusCoords?: () => void;
}

export const MapHome: React.FC<ExploreProps> = ({
    onEditBusiness,
    userBusinessId,
    focusCoords,
    onClearFocusCoords
}) => {
    const {
        events,
        businesses,
        favorites,
        toggleFavorite,
        setSelectedEvent,
        sectorPolygons,
        setSectorPolygons,
        sectorLabels,
        setSectorLabels,
        journeyCards,
        setJourneyCards,
        currentLocality,
        setCurrentLocality,
        selectedSector,
        setSelectedSector,
        activeFilter,
        setActiveFilter,
        searchQuery,
        setSearchQuery,
        selectedMood,
        setSelectedMood,
        toggleSector,
        isPanelMinimized,
        setIsPanelMinimized,
        isEditorFocus,
        setIsEditorFocus,
        setShowPublicProfile,
        setPublicProfileId,
        setPublicProfileType,
        setShowBusinessReg,
        setBizForm,
        bizForm,
        posts,
        eventsWithLiveCounts,
        handlePurgeAllReferences,
        customLocalities,
        handleAddCustomLocality,
        showLocalityManager,
        setShowLocalityManager,
        appSettings,
        loading,
        masterVibes,
        masterActivities
    } = useData();

    const navigate = useNavigate();
    const location = useLocation();
    const { user, authUser, isAdmin, isSuperAdmin, isSuperUser } = useAuthContext();
    const { t } = useTranslation();
    const { showToast, showConfirm, showPrompt } = useToast();

    // 1. Unified State
    const [activeTab, setActiveTab] = useState<'events' | 'directory' | 'landmarks' | null>('events');
    const [isGridView, setIsGridView] = useState(false);
    const [aiRecData, setAiRecData] = useState<PlannerSection[] | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showItinerary, setShowItinerary] = useState(false);
    const [showPlannerChat, setShowPlannerChat] = useState(false);
    const [askRecData, setAskRecData] = useState<PlannerSection[] | null>(null);
    const [isAskLoading, setIsAskLoading] = useState(false);
    const [showAskModal, setShowAskModal] = useState(false);
    const [showLocalityMenu, setShowLocalityMenu] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [showMoodMenu, setShowMoodMenu] = useState(false);
    const [showVibesDropdown, setShowVibesDropdown] = useState(false);
    const [showActivitiesDropdown, setShowActivitiesDropdown] = useState(false);
    const [focusedBusinessId, setFocusedBusinessId] = useState<string | null>(null);
    const [showingDirections, setShowingDirections] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                },
                (err) => {
                    console.log("Geolocation error or denied:", err);
                },
                { enableHighAccuracy: true, timeout: 5000 }
            );
        }
    }, []);


    // SEO Hook
    useSEO({
        title: activeTab === 'events' ? 'Explora Eventos' : activeTab === 'landmarks' ? 'Puntos de Interés' : 'Directorio Local',
        description: `Encuentra los mejores lugares y eventos en ${currentLocality.name} con ubicame.info PULSE.`,
        url: BASE_URL + window.location.pathname
    });
    
    // 2. Refs
    const mapRef = useRef<any>(null);

    // 3. Derived State
    const isSpecialUser = user?.email === 'ubicameinformacion@gmail.com' || user?.role === 'admin';
    const isPremiumUser = user?.plan && [
        SubscriptionPlan.PRO,
        SubscriptionPlan.ELITE,
        SubscriptionPlan.EXPERT
    ].includes(user.plan as SubscriptionPlan) || isSpecialUser;

    const isEliteUser = user?.plan && [
        SubscriptionPlan.ELITE,
        SubscriptionPlan.EXPERT
    ].includes(user.plan as SubscriptionPlan) || isSpecialUser;

    const userBusinessIdResolved = userBusinessId || businesses.find(b => b.ownerId === authUser?.uid)?.id;

    useEffect(() => {
        const state = location.state as { focusBusiness?: string } | null;
        if (state?.focusBusiness) {
            setFocusedBusinessId(state.focusBusiness);
            setTimeout(() => {
                const business = businesses.find(b => b.id === state.focusBusiness);
                if (business?.coordinates) {
                    mapRef.current?.flyTo?.([business.coordinates[0], business.coordinates[1]], 16);
                }
                setFocusedBusinessId(null);
            }, 1000);
            window.history.replaceState({}, document.title);
        }
    }, [location, businesses]);

    useEffect(() => {
        if (focusCoords && onClearFocusCoords) {
            const timer = setTimeout(() => {
                onClearFocusCoords();
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [focusCoords, onClearFocusCoords]);

    const handleAiAsk = async () => {
        setIsAiLoading(true);
        setAiRecData(null);
        const { getPlannerRecommendations } = await import('../services/geminiService');
        const data = await getPlannerRecommendations(user, businesses, currentLocality.name);
        setAiRecData(data);
        setIsAiLoading(false);
    };


    const focusBusinessOnMap = (businessId: string) => {
        const business = businesses.find(b => b.id === businessId);
        if (business?.coordinates) {
            mapRef.current?.flyTo?.([business.coordinates[0], business.coordinates[1]], 17, { duration: 1.2 });
            setFocusedBusinessId(businessId);
            setShowingDirections(null);
        }
    };

    const getDirectionsTo = async (businessId: string) => {
        const business = businesses.find(b => b.id === businessId);
        if (!business?.coordinates) return;

        let userLat: number, userLng: number;

        if (navigator.geolocation) {
            try {
                const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
                });
                userLat = pos.coords.latitude;
                userLng = pos.coords.longitude;
                setUserLocation([userLat, userLng]);
            } catch {
                userLat = -1.825;
                userLng = -80.753;
            }
        } else {
            userLat = -1.825;
            userLng = -80.753;
        }

        setShowingDirections(businessId);
        const [bizLat, bizLng] = business.coordinates;

        if (mapRef.current) {
            const bounds = [
                [userLat, userLng],
                [bizLat, bizLng]
            ];
            mapRef.current.flyToBounds(bounds, { padding: [60, 60], duration: 1.2 });
        }

        const url = `https://www.google.com/maps/dir/${userLat},${userLng}/${bizLat},${bizLng}`;
        window.open(url, '_blank');
    };

    // Map Handlers (Admin Logic moved here or passed via props? Some logic needs Auth/Admin checks which are passed)
    const handleAddBusinessOnMap = async (lat: number, lng: number, isReference?: boolean) => {
        setBizForm({
            ...bizForm,
            name: isReference ? 'Nuevo Punto de Referencia' : 'Nuevo Negocio',
            coordinates: [lat, lng],
            locality: currentLocality.name,
            sector: Sector.CENTRO,
            icon: isReference ? 'palmtree' : 'store',
            description: isReference ? 'Punto de referencia añadido por el administrador.' : 'Negocio añadido por el administrador.',
            category: isReference ? BusinessCategory.REFERENCIA : BusinessCategory.RESTAURANTE,
            isReference: isReference
        });
        setShowBusinessReg(true);
    };

    const navigateToDirect = (businessId: string) => {
        navigate(`/community?tab=direct&businessId=${businessId}`);
    };

    const handleDeleteBusinessByAdmin = async (id: string) => {
        if (await showConfirm('¿Eliminar este negocio permanentemente?', 'Confirmar eliminación')) {
            await deleteBusiness(id);
        }
    };

    const handleUpdateBusinessLocation = async (id: string, lat: number, lng: number) => {
        await updateBusiness(id, { coordinates: [lat, lng] });
    };

    const handleUpdateSectorGeometry = (sector: Sector, coords: [number, number][]) => {
        setSectorPolygons(prev => ({ ...prev, [sector]: coords }));
    };

    const recommendedBusinesses = useMemo(() => {
        if (!selectedMood) return [];
        const categories = ACTIVITY_TO_CATEGORIES[selectedMood] || [];
        
        let plannerCat: string | null = null;
        let vibeEnum: Vibe | null = null;
        const moodStr = selectedMood as string;
        if (moodStr === "Plan Relax" || moodStr === "Descansar" || moodStr === "Trabajar") {
            plannerCat = "hospedaje";
            vibeEnum = Vibe.RELAX;
        } else if (moodStr === "Comer") {
            plannerCat = "comida";
            vibeEnum = Vibe.GASTRONOMIA;
        } else if (moodStr === "Bailar" || moodStr === "Farrear") {
            plannerCat = "baile";
            vibeEnum = Vibe.FIESTA;
        } else if (moodStr === "Surf") {
            plannerCat = "surf";
            vibeEnum = Vibe.SURF;
        } else if (moodStr === "Deporte") {
            plannerCat = "surf";
            vibeEnum = Vibe.ADRENALINA;
        }

        let result = businesses.filter(b => {
            const matchesCategory = categories.includes(b.category) || b.category?.toLowerCase() === selectedMood.toLowerCase();
            const matchesPlanner = plannerCat && b.plannerCategory === plannerCat;
            const matchesVibe = (vibeEnum && b.moods?.includes(vibeEnum)) || b.moods?.includes(selectedMood as Vibe);

            return (matchesCategory || matchesPlanner || matchesVibe) &&
                b.locality === currentLocality.name &&
                b.mapType !== MapEntryType.SECTOR;
        });

        const refCoords = userLocation || currentLocality.coords;

        const planWeight = (plan: SubscriptionPlan) => {
            if (plan === SubscriptionPlan.EXPERT) return 4;
            if (plan === SubscriptionPlan.ELITE) return 3;
            if (plan === SubscriptionPlan.PRO) return 2;
            return 1;
        };

        return result.sort((a, b) => {
            const weightA = planWeight(a.plan);
            const weightB = planWeight(b.plan);
            if (weightA !== weightB) {
                return weightB - weightA;
            }
            const distA = getDistance(refCoords, a.coordinates);
            const distB = getDistance(refCoords, b.coordinates);
            return distA - distB;
        });
    }, [selectedMood, businesses, currentLocality, userLocation]);

    const filteredEvents = useMemo(() => {
        let result = [...eventsWithLiveCounts];
        
        // Filter by locality with accent normalization & fallback
        result = result.filter(e => {
            if (!currentLocality?.name) return true;
            const biz = businesses.find(b => b.id === e.businessId);
            const eventLocality = e.locality || biz?.locality || 'Montañita';
            const normLoc = (eventLocality || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normCurr = (currentLocality.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return normLoc === normCurr || normLoc.includes(normCurr) || normCurr.includes(normLoc);
        });

        if (activeFilter !== 'All') {
            result = result.filter(e => e.vibe === activeFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(e => {
                const name = e.name || e.title || '';
                const desc = e.description || '';
                const vibe = e.vibe || '';
                return name.toLowerCase().includes(q) || 
                       desc.toLowerCase().includes(q) ||
                       vibe.toLowerCase().includes(q);
            });
        }
        if (selectedMood) {
            result = result.filter(e => (e.vibe || '') === selectedMood);
        }
        return result;
    }, [eventsWithLiveCounts, businesses, activeFilter, searchQuery, selectedMood, currentLocality.name]);


    const filteredBusinesses = useMemo(() => {
        let result = [...businesses];

        // Filter by locality with accent normalization & fallback
        result = result.filter(b => {
            if (!currentLocality?.name) return true;
            const bizLocality = b.locality || 'Montañita';
            const normLoc = (bizLocality || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normCurr = (currentLocality.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return normLoc === normCurr || normLoc.includes(normCurr) || normCurr.includes(normLoc) || b.name?.toLowerCase().includes('ubicame.info');
        });

        if (activeTab === 'directory') {
            // Only show actual businesses in directory
            result = result.filter(b => 
                !b.isReference && 
                b.category !== BusinessCategory.REFERENCIA &&
                (b.mapType === MapEntryType.BUSINESS || !b.mapType)
            );
        }

        if (activeFilter !== 'All') {
            result = result.filter(b => b.category === activeFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(b => {
                const name = b.name || '';
                const desc = b.description || '';
                const cat = b.category || '';
                return name.toLowerCase().includes(q) || 
                       desc.toLowerCase().includes(q) ||
                       cat.toLowerCase().includes(q);
            });
        }
        if (selectedMood) {
            result = result.filter(b => b.moods?.includes(selectedMood) || b.category?.toLowerCase() === selectedMood.toLowerCase());
        }
        if (selectedSector) {
            result = result.filter(b => b.sector === selectedSector);
        }
        
        return result;
    }, [businesses, activeFilter, searchQuery, selectedMood, selectedSector, activeTab, currentLocality.name]);


    // Eventos futuros para el mapa
    const upcomingEvents = useMemo(() => {
        return (eventsWithLiveCounts || []).filter(e => isEventPublicAndActive(e));
    }, [eventsWithLiveCounts]);

    const popularVibe = useMemo(() => {
        const counts = filteredEvents.reduce((acc, e) => {
            acc[e.vibe] = (acc[e.vibe] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
        const sorted = Object.entries(counts).sort((a, b) => (b[1] as number) - (a[1] as number));
        return sorted[0]?.[0];
    }, [filteredEvents]);

    return (
        <>
            {loading ? (
                <PageLoader />
            ) : (
                <div className="h-full relative flex flex-col lg:flex-row bg-[#020617] overflow-hidden">
                {/* Search Bar & Admin Tools */}
                <div className="absolute top-3 sm:top-6 inset-x-0 lg:left-0 lg:right-0 z-50 flex flex-col items-center gap-4 pointer-events-none px-2.5 sm:px-6 transition-all duration-500">
                    <div className="w-full max-w-xl pointer-events-auto relative group">
                        <div className="relative flex items-center bg-[#020617]/50 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-1 sm:p-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/5 transition-all group-focus-within:border-sky-500/30 group-hover:bg-[#020617]/70">
                            {/* Selector de Localidad */}
                            <div className="relative shrink-0">
                                <button 
                                    onClick={() => setShowLocalityMenu(!showLocalityMenu)}
                                    className="flex items-center gap-1 sm:gap-2 pl-3 sm:pl-4 pr-2 sm:pr-3 py-1.5 sm:py-2 text-white hover:bg-white/10 rounded-l-[1.8rem] transition-colors border-r border-white/10 mr-1 sm:mr-2 group/loc shrink-0"
                                >
                                    <MapPin className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-sky-400 group-hover/loc:scale-110 transition-transform shrink-0" />
                                    <span className="text-xs sm:text-sm font-bold truncate max-w-[70px] sm:max-w-[100px]">{currentLocality.name}</span>
                                    <ChevronDown className={`w-3 h-3 sm:w-3.5 sm:h-3.5 text-slate-400 transition-transform shrink-0 ${showLocalityMenu ? 'rotate-180' : ''}`} />
                                </button>
                                
                                {showLocalityMenu && (
                                    <div className="absolute top-[calc(100%+12px)] left-0 w-48 bg-[#020617]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in slide-in-from-top-2 overflow-hidden flex flex-col">
                                        <div className="px-3 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cambiar Zona</div>
                                        <div className="max-h-[350px] overflow-y-auto no-scrollbar">
                                            {[...LOCALITIES, ...customLocalities].map((loc, idx) => (
                                                <button
                                                    key={`${loc.name}-${idx}`}
                                                    onClick={() => {
                                                        setCurrentLocality(loc);
                                                        setShowLocalityMenu(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-sm font-medium transition-colors hover:bg-white/10 ${currentLocality.name === loc.name ? 'text-sky-400 bg-sky-400/10' : 'text-slate-300'}`}
                                                >
                                                    {loc.name}
                                                    {currentLocality.name === loc.name && <ShieldCheck className="w-4 h-4" />}
                                                </button>
                                            ))}
                                        </div>

                                        {(isAdmin || isSuperUser) && (
                                            <div className="mt-2 pt-2 border-t border-white/5 px-2">
                                                <button
                                                    onClick={() => {
                                                        setShowLocalityManager(true);
                                                        setShowLocalityMenu(false);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-black text-sky-400 hover:bg-sky-400/10 rounded-xl transition-all uppercase tracking-widest"
                                                >
                                                    <Compass className="w-3.5 h-3.5" />
                                                    Gestionar Pueblos
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400 group-focus-within:text-sky-400 transition-colors shrink-0 hidden xs:block" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Busca eventos, locales..."
                                className="flex-1 min-w-0 bg-transparent border-none outline-none px-2 sm:px-4 text-xs sm:text-sm font-bold text-white placeholder:text-slate-500 placeholder:font-black placeholder:uppercase placeholder:text-[9px] sm:placeholder:text-[10px] placeholder:tracking-wider sm:placeholder:tracking-widest"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="p-1.5 sm:p-2.5 mr-0.5 sm:mr-1 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-all pointer-events-auto shrink-0"
                                >
                                    <X className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                </button>
                            )}
                            <div className="relative shrink-0">
                                {/* Mood Selector Button */}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMoodMenu(!showMoodMenu);
                                    }}
                                    className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border mr-0.5 sm:mr-1 shadow-lg transition-all hover:bg-slate-700 active:scale-95 shrink-0 ${selectedMood ? 'bg-rose-500 border-rose-400 text-white' : 'border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400'}`}
                                >
                                    <span className={`text-sm sm:text-lg ${selectedMood ? 'text-white' : 'text-slate-400'}`}>🎯</span>
                                </button>
                                
                                {showMoodMenu && (
                                    <div className="absolute top-[calc(100%+12px)] right-0 w-72 bg-[#020617]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl py-3 z-[60] animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 border-b border-white/5 flex items-center justify-between">
                                            <span style={{ color: '#ec4899' }}>¿Cómo te sientes?</span>
                                            {selectedMood && (
                                                <button 
                                                    onClick={() => setSelectedMood(null)}
                                                    className="text-rose-400 hover:text-rose-300 transition-colors"
                                                >
                                                    Limpiar
                                                </button>
                                            )}
                                        </div>
                                        <div className="flex flex-wrap gap-2 px-3 pb-3 mb-2 border-b border-white/5">
                                            {masterVibes && masterVibes.length > 0 ? (
                                                masterVibes.map((vibe: any) => {
                                                    const isSelected = selectedMood === vibe.name || selectedMood === vibe.label;
                                                    return (
                                                        <button
                                                            key={vibe.id}
                                                            onClick={() => {
                                                                setSelectedMood(isSelected ? null : (vibe.label || vibe.name));
                                                                setShowMoodMenu(false);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isSelected ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                                        >
                                                            {vibe.label || vibe.name}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                ["Aburrido", "Agradecido", "Cansado", "Curioso", "Enfermo", "Feliz", "Hambriento", "Inspirado", "Relajado", "Triste"].map((mood) => {
                                                    const isSelected = selectedMood === mood;
                                                    return (
                                                        <button
                                                            key={mood}
                                                            onClick={() => {
                                                                setSelectedMood(isSelected ? null : mood as Vibe);
                                                                setShowMoodMenu(false);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isSelected ? 'bg-rose-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                                        >
                                                            {mood}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                        <div className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 border-b border-white/5 flex items-center justify-between">
                                            <span style={{ color: '#f59e0b' }}>¿Qué quieres hacer?</span>
                                        </div>
                                        <div className="flex flex-wrap gap-2 px-3 pt-2">
                                            {masterActivities && masterActivities.length > 0 ? (
                                                masterActivities.map((activity: any) => {
                                                    const isSelected = selectedMood === activity.name;
                                                    return (
                                                        <button
                                                            key={activity.id}
                                                            onClick={() => {
                                                                setSelectedMood(isSelected ? null : activity.name);
                                                                setShowMoodMenu(false);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isSelected ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                                        >
                                                            {activity.name}
                                                        </button>
                                                    );
                                                })
                                            ) : (
                                                ["Bailar", "Comer", "Cuidado Personal", "Deporte", "Descansar", "Farrear", "Plan Relax", "Surf", "Trabajar", "Turismo"].map((activity) => {
                                                    const isSelected = selectedMood === activity;
                                                    return (
                                                        <button
                                                            key={activity}
                                                            onClick={() => {
                                                                setSelectedMood(isSelected ? null : (activity as Vibe));
                                                                setShowMoodMenu(false);
                                                            }}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${isSelected ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                                        >
                                                            {activity}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="relative shrink-0">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFilterMenu(!showFilterMenu);
                                    }}
                                    className={`w-8 h-8 sm:w-11 sm:h-11 rounded-full flex items-center justify-center border border-white/10 mr-0.5 sm:mr-1 shadow-lg transition-all hover:bg-slate-700 active:scale-95 shrink-0 ${showFilterMenu ? 'bg-sky-500 border-sky-400 text-white' : 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400'}`}
                                >
                                    <Filter className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${showFilterMenu ? 'text-white' : 'text-slate-400'}`} />
                                </button>
                                
                                {showFilterMenu && (
                                    <div className="absolute top-[calc(100%+12px)] right-0 w-64 bg-[#020617]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl py-3 z-[60] animate-in fade-in slide-in-from-top-2">
                                        <div className="px-4 py-2 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 border-b border-white/5 flex items-center justify-between">
                                            Categorías
                                            {activeFilter !== 'All' && (
                                                <button 
                                                    onClick={() => setActiveFilter('All')}
                                                    className="text-rose-400 hover:text-rose-300 transition-colors"
                                                >
                                                    Limpiar
                                                </button>
                                            )}
                                        </div>
                                        <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                                            {Object.values(BusinessCategory).map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => {
                                                        setActiveFilter(cat === activeFilter ? 'All' : cat);
                                                        setShowFilterMenu(false);
                                                    }}
                                                    className={`w-full flex items-center gap-3 px-5 py-3 text-sm font-medium transition-colors hover:bg-white/10 ${activeFilter === cat ? 'text-sky-400 bg-sky-400/10' : 'text-slate-300'}`}
                                                >
                                                    <div className={`w-1.5 h-1.5 rounded-full ${activeFilter === cat ? 'bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]' : 'bg-slate-700'}`} />
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Search Results Dropdown */}
                        {searchQuery.length > 2 && (
                            <div className="antigravity absolute top-full left-0 right-0 mt-3 bg-[#020617]/95 backdrop-blur-xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 z-[3000]">
                                <div className="p-2 max-h-[500px] overflow-y-auto no-scrollbar">
                                    <div className="space-y-1">
                                        {/* Localities / Pueblos Results */}
                                        {[...LOCALITIES, ...customLocalities]
                                            .filter(loc => (searchQuery || '').toLowerCase().includes(loc.name.toLowerCase()))
                                            .map((loc, i) => (
                                                <button
                                                    key={`loc-${i}`}
                                                    onClick={() => {
                                                        setCurrentLocality(loc);
                                                        setSearchQuery('');
                                                    }}
                                                    className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl transition-all group border border-white/5 mb-1"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all text-lg">
                                                            <MapPin className="w-5 h-5" />
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-xs font-black text-white group-hover:text-sky-400 transition-colors uppercase tracking-widest">
                                                                {loc.name}
                                                            </div>
                                                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
                                                                {t('explore.town')} / Localidad
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="px-3 py-1 bg-sky-500/10 rounded-full border border-sky-500/20">
                                                        <span className="text-[8px] font-black text-sky-400 uppercase tracking-widest">Visitar</span>
                                                    </div>
                                                </button>
                                            ))
                                        }

                                        {/* Business & Events Results */}
                                        {[...businesses, ...eventsWithLiveCounts]
                                            .filter(item => {
                                                const locality = 'locality' in item ? item.locality : businesses.find(b => b.id === (item as any).businessId)?.locality;
                                                const matchesLocality = (locality || 'Montañita') === currentLocality.name;
                                                const itemName = 'name' in item ? (item as any).name : (item as any).title;
                                                const itemCategory = (item as any).category;
                                                const itemSector = (item as any).sector;
                                                const sq = (searchQuery || '').toLowerCase();
                                                const matchesSearch = !sq || (
                                                    (String(itemName || '')).toLowerCase().includes(sq) ||
                                                    (String(itemCategory || '')).toLowerCase().includes(sq) ||
                                                    (String(itemSector || '')).toLowerCase().includes(sq)
                                                );
                                                const isEvent = 'title' in item || 'startAt' in item;
                                                if (isEvent && !isEventPublicAndActive(item as MontanitaEvent)) return false;
                                                const isDeactivated = (item as any).status === 'deactivated';
                                                return matchesLocality && matchesSearch && !isDeactivated;
                                            })
                                            .slice(0, 6)
                                            .map((item, i) => (
                                                <button
                                                    key={`item-${i}`}
                                                    onClick={() => {
                                                        setSearchQuery('');
                                                        if ('name' in item) {
                                                            setPublicProfileId(item.id);
                                                            setPublicProfileType('business');
                                                            setShowPublicProfile(true);
                                                        } else {
                                                            setSelectedEvent(item as any);
                                                        }
                                                    }}
                                                    className="w-full flex items-center justify-between p-3.5 hover:bg-white/5 rounded-2xl transition-all group"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-sky-400 group-hover:bg-sky-400/10 transition-colors text-lg">
                                                            {('name' in item) ? (
                                                                (item as any).category === 'Restaurante' ? '🍱' : 
                                                                (item as any).category === 'Bar' ? '🍹' : '🏪'
                                                            ) : '✨'}
                                                        </div>
                                                        <div className="text-left">
                                                            <div className="text-xs font-bold text-white group-hover:text-sky-400 transition-colors">
                                                                {'name' in item ? item.name : item.title}
                                                            </div>
                                                            <div className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
                                                                {(item as any).category || (item as any).sector || 'Evento'}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
                                                </button>
                                            ))
                                        }

                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Tools Bar -hidden- */}
                    <div className="hidden pointer-events-auto">
                        {(isAdmin || isSuperAdmin) && (
                            <button
                                onClick={async () => {
                                    const msg = await showPrompt("Escribe el mensaje del aviso global:", "Aviso Importante", "BROADCAST");
                                    if (msg) showToast("Aviso enviado a la comunidad (Simulado)", "success");
                                }}
                                className="px-4 py-2.5 bg-amber-500/10 backdrop-blur-2xl border border-amber-500/20 rounded-2xl text-amber-500 hover:bg-amber-500/20 transition-all shadow-xl hover:scale-105"
                                title="Aviso Global a todos los usuarios"
                            >
                                <Radio className="w-5 h-5" />
                            </button>
                        )}

                        {isSuperAdmin && (
                            <button
                                onClick={handlePurgeAllReferences}
                                className="px-4 py-2.5 bg-rose-600/10 backdrop-blur-2xl border border-rose-500/20 rounded-2xl text-rose-500 hover:bg-rose-600/20 transition-all shadow-xl hover:scale-105"
                                title="Purge"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="w-full relative z-10 shrink-0 transition-all duration-300 flex-1 h-full">
                    <MapView
                        onBusinessSelect={(b) => {
                            setTimeout(() => {
                                requestAnimationFrame(() => {
                                    setPublicProfileId(b.id);
                                    setPublicProfileType('business');
                                    setShowPublicProfile(true);
                                });
                            }, 0);
                        }}
                        selectedSector={selectedSector}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                        isAdmin={isAdmin}
                        isSuperAdmin={isSuperAdmin}
                        isSuperUser={isSuperUser}
                        isPremiumUser={isPremiumUser}
                        isEliteUser={isEliteUser}
                        userBusinessId={userBusinessIdResolved}
                        userId={authUser?.uid}
                        onAddBusiness={handleAddBusinessOnMap}
                        onDeleteBusiness={handleDeleteBusinessByAdmin}
                        onUpdateBusiness={handleUpdateBusinessLocation}
                        onEditBusiness={onEditBusiness}
                        onUpdateSector={handleUpdateSectorGeometry}
                        businesses={businesses}
                        events={upcomingEvents}
                        sectorPolygons={sectorPolygons}
                        posts={posts}
                        isEditorFocus={isEditorFocus}
                        onToggleEditorFocus={() => setIsEditorFocus(!isEditorFocus)}
                        isPanelMinimized={isPanelMinimized}
                        onTogglePanel={() => setIsPanelMinimized(!isPanelMinimized)}
                        hideUI={true}
                        appSettings={appSettings || undefined}
                        localityName={currentLocality.name}
                        mapCenter={currentLocality.coords}
                        customLocalities={customLocalities}
                        onLocalityChange={(name) => {
                            const loc = LOCALITIES.find(l => l.name === name) || customLocalities.find(l => l.name === name);
                            if (loc) setCurrentLocality(loc);
                        }}
                        onAddLocality={isSuperUser ? async (name, coords, hasBeach) => {
                            await handleAddCustomLocality(name, coords, hasBeach);
                        } : undefined}
                        onResetFilters={() => {
                            setSelectedSector(null);
                            setActiveFilter('All');
                            setSearchQuery('');
                            setIsPanelMinimized(false);
                            setIsEditorFocus(false);
                        }}
                        activeTab={activeTab}
                        focusedBusinessId={focusedBusinessId}
                        focusCoords={focusCoords}
                    />
                </div>

                {/* FAB to open ExploreFeed (List of Events) */}
                {!isEditorFocus && (
                    <div className="fixed bottom-24 lg:bottom-10 left-1/2 -translate-x-1/2 z-[1100] animate-in fade-in slide-in-from-bottom duration-500">
                        <button
                            onClick={() => {
                                // Navigate to the feed view (handled in App.tsx or similar via setActiveView)
                                // Assuming we can use an event or state, let's use window event or Context.
                                // The cleaner way is just a standard window.location hash or dispatch event, 
                                // but we need access to setActiveView.
                                // Since MapHome doesn't have setActiveView directly mapped, we can add it to props,
                                // or we can just use an event dispatch that App.tsx listens to.
                                window.dispatchEvent(new CustomEvent('NAVIGATE_TO_FEED'));
                            }}
                            className="flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 active:scale-95 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-2xl shadow-sky-500/40 transition-all border border-sky-400/30 cursor-pointer"
                        >
                            <span className="animate-pulse w-2 h-2 rounded-full bg-white inline-block shadow-[0_0_10px_#fff]" />
                            ¿Cómo te sientes hoy?
                            <span className="text-lg leading-none">🎯</span>
                        </button>
                    </div>
                )}
            </div>
            )}
            
            <Suspense fallback={null}>
                <ItineraryModal
                    isOpen={showItinerary}
                    onClose={() => setShowItinerary(false)}
                />
                <PlannerChatModal
                    isOpen={showPlannerChat}
                    onClose={() => setShowPlannerChat(false)}
                />
                <LocalityManagerModal />
            </Suspense>
        </>
    );
};


