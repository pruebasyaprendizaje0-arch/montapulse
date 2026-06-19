import React, { useState, useMemo, useEffect, useRef, useDeferredValue, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Sparkles, MapPin, Store, Waves, Leaf, ExternalLink, Heart, Zap, ShieldCheck, Flame, Star, Search, Filter, Layers, ChevronDown, ChevronUp, TrendingUp, Clock, Trash2, ArrowRight, Radio, Navigation, Route, Compass } from 'lucide-react';
const MapView = lazy(() => import('../components/Map/MapView').then(m => ({ default: m.MapView })));
import { EventCard } from '../components/EventCard';
import { Sector, MontanitaEvent, Business, BusinessCategory, Vibe, SubscriptionPlan, MapEntryType } from '../types';
import { LOCALITIES, LOCALITY_SECTORS, SECTOR_INFO, LOCALITY_POLYGONS, BASE_URL } from '../constants';
import { getPlannerRecommendations, PlannerSection, getRecommendationForUser } from '../services/geminiService';
import { deleteBusiness, createBusiness, updateBusiness, incrementBusinessViewCount } from '../services/firestoreService';
import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { PageLoader } from '../components/common/PageLoader';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { ItineraryModal } from '../components/Modals/ItineraryModal';
import { AIRecommendationModal } from '../components/Modals/AIRecommendationModal';
import { PlannerChatModal } from '../components/Modals/PlannerChatModal';
import { isBusinessOpen } from '../utils/timeUtils';
import { LocalityManagerModal } from '../components/Modals/LocalityManagerModal';
import { useSEO } from '../hooks/useSEO';
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

export const Explore: React.FC<ExploreProps> = ({
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
        
        // Filter by locality
        result = result.filter(e => e.locality === currentLocality.name);

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
    }, [eventsWithLiveCounts, activeFilter, searchQuery, selectedMood, currentLocality.name]);

    const deferredFilteredEvents = useDeferredValue(filteredEvents);

    const filteredBusinesses = useMemo(() => {
        let result = [...businesses];

        // Filter by locality (keep 'ubicame.info' always visible for contact/buying services)
        result = result.filter(b => b.locality === currentLocality.name || b.name?.toLowerCase().includes('ubicame.info'));

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

    const deferredFilteredBusinesses = useDeferredValue(filteredBusinesses);

    // Eventos futuros para el mapa
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return eventsWithLiveCounts.filter(e => {
            const eventEnd = e.endAt ? new Date(e.endAt) : new Date(new Date(e.startAt).getTime() + 4 * 3600000);
            return eventEnd > now && e.status !== 'deactivated';
        });
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
                <div className="absolute top-6 inset-x-0 lg:left-0 lg:right-[450px] z-50 flex flex-col items-center gap-4 pointer-events-none px-6 transition-all duration-500">
                    <div className="w-full max-w-xl pointer-events-auto relative group">
                        <div className="relative flex items-center bg-[#020617]/40 backdrop-blur-3xl border border-white/10 rounded-[2rem] p-1.5 shadow-2xl shadow-black/60 ring-1 ring-white/5 transition-all group-focus-within:border-sky-500/30 group-hover:bg-[#020617]/60">
                            {/* Selector de Localidad */}
                            <div className="relative">
                                <button 
                                    onClick={() => setShowLocalityMenu(!showLocalityMenu)}
                                    className="flex items-center gap-2 pl-4 pr-3 py-2 text-white hover:bg-white/10 rounded-l-[1.8rem] transition-colors border-r border-white/10 mr-2 group/loc"
                                >
                                    <MapPin className="w-4 h-4 text-sky-400 group-hover/loc:scale-110 transition-transform" />
                                    <span className="text-sm font-bold truncate max-w-[100px]">{currentLocality.name}</span>
                                    <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showLocalityMenu ? 'rotate-180' : ''}`} />
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

                            <Search className="w-4 h-4 text-slate-400 group-focus-within:text-sky-400 transition-colors" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Busca eventos, locales o experiencias..."
                                className="flex-1 bg-transparent border-none outline-none px-4 text-sm font-bold text-white placeholder:text-slate-500 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest"
                            />
                            {searchQuery && (
                                <button 
                                    onClick={() => setSearchQuery('')}
                                    className="p-2.5 mr-1 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-all pointer-events-auto"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                             <div className="relative">
                                {/* Mood Selector Button */}
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowMoodMenu(!showMoodMenu);
                                    }}
                                    className={`w-11 h-11 rounded-full flex items-center justify-center border mr-1 shadow-lg transition-all hover:bg-slate-700 active:scale-95 ${selectedMood ? 'bg-rose-500 border-rose-400 text-white' : 'border-white/10 bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400'}`}
                                >
                                    <span className={`text-lg ${selectedMood ? 'text-white' : 'text-slate-400'}`}>🎯</span>
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
                            <div className="relative">
                                <button 
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setShowFilterMenu(!showFilterMenu);
                                    }}
                                    className={`w-11 h-11 rounded-full flex items-center justify-center border border-white/10 mr-1 shadow-lg transition-all hover:bg-slate-700 active:scale-95 ${showFilterMenu ? 'bg-sky-500 border-sky-400 text-white' : 'bg-gradient-to-br from-slate-800 to-slate-900 text-slate-400'}`}
                                >
                                    <Filter className={`w-4 h-4 ${showFilterMenu ? 'text-white' : 'text-slate-400'}`} />
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

                <div className="flex-1 relative h-full min-h-0 z-10">
                    <Suspense fallback={<div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center text-slate-500 uppercase font-black text-[10px] tracking-widest">Cargando Mapa...</div>}>
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
                    </Suspense>
                </div>

                {/* Sliding Panel - Hidden in Editor Focus mode */}
                {!isEditorFocus && (
                    <div
                        onClick={() => isPanelMinimized && setIsPanelMinimized(false)}
                        className={`antigravity bg-[#0f172a]/90 backdrop-blur-xl lg:backdrop-blur-none border-t lg:border-t-0 lg:border-l border-white/5 px-6 pt-6 transition-all duration-500 ease-in-out z-[100] shadow-[0_-20px_50px_rgba(0,0,0,0.6)] lg:shadow-none no-scrollbar flex flex-col ${
                            isPanelMinimized 
                            ? 'max-[1023px]:fixed max-[1023px]:bottom-0 max-[1023px]:inset-x-0 max-[1023px]:h-[60px] max-[1023px]:overflow-hidden cursor-pointer hover:bg-[#0f172a] lg:w-[450px]' 
                            : (isGridView 
                                ? 'lg:w-[85vw] pb-32 overflow-y-auto w-full h-[85dvh] fixed lg:absolute bottom-0 right-0' 
                                : 'max-[1023px]:fixed max-[1023px]:bottom-0 max-[1023px]:inset-x-0 max-[1023px]:h-[70dvh] pb-32 overflow-y-auto lg:w-[450px] lg:h-full lg:relative'
                              )
                        } lg:max-h-full lg:pb-10 rounded-t-[3.5rem] lg:rounded-none`}
                    >
                        <div
                            onClick={(e) => {
                                e.stopPropagation();
                                setIsPanelMinimized(!isPanelMinimized);
                            }}
                            className="w-12 h-1.5 bg-slate-800 rounded-full mx-auto mb-6 opacity-50 cursor-pointer hover:bg-slate-600 transition-colors lg:hidden"
                        ></div>

                        {/* Top Tab Switcher */}
                        <div className="flex p-1.5 bg-black/40 backdrop-blur-3xl rounded-[2rem] border border-white/5 mb-8 ring-1 ring-white/5 mx-2">
                            <button
                                onClick={() => setIsPanelMinimized(true)}
                                className="flex items-center justify-center gap-2 py-3 px-4 rounded-[1.6rem] transition-all duration-500 text-slate-400 hover:text-white hover:bg-white/5"
                            >
                                <MapPin className="w-4 h-4" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('explore.seeMap')}</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('events')}
                                className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-[1.6rem] transition-all duration-500 relative overflow-hidden group ${activeTab === 'events' ? 'text-white shadow-2xl shadow-sky-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {activeTab === 'events' && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-sky-600 to-indigo-600 animate-in fade-in zoom-in duration-500" />
                                )}
                                <div className="relative flex items-center gap-2.5">
                                    <Zap className={`w-4 h-4 ${activeTab === 'events' ? 'fill-white animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('explore.title')}</span>
                                </div>
                            </button>
                        </div>

                        {/* Section 1: ¿Cómo te sientes? - Pink (from masterVibes) */}
                        <div className="px-4 py-3 border-b border-white/5 relative">
                            <p style={{ color: '#ec4899', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>🎯 ¿Cómo te sientes?</p>
                            
                            {/* Custom Dropdown Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowVibesDropdown(!showVibesDropdown)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-semibold text-slate-300 transition-all active:scale-[0.98] outline-none focus:outline-none"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="text-base">🎯</span>
                                        <span>
                                            {selectedMood && (
                                                masterVibes?.some((v: any) => v.name === selectedMood || v.label === selectedMood) ||
                                                ["Aburrido", "Agradecido", "Cansado", "Curioso", "Enfermo", "Feliz", "Hambriento", "Inspirado", "Relajado", "Triste"].includes(selectedMood)
                                            ) ? selectedMood : 'Selecciona tu ánimo / vibra...'}
                                        </span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {selectedMood && (
                                            masterVibes?.some((v: any) => v.name === selectedMood || v.label === selectedMood) ||
                                            ["Aburrido", "Agradecido", "Cansado", "Curioso", "Enfermo", "Feliz", "Hambriento", "Inspirado", "Relajado", "Triste"].includes(selectedMood)
                                        ) && (
                                            <span 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedMood(null);
                                                }}
                                                className="p-1 hover:bg-white/15 rounded-full text-slate-400 hover:text-white transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </span>
                                        )}
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showVibesDropdown ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {showVibesDropdown && (
                                    <>
                                        {/* Overlay to handle click outside */}
                                        <div 
                                            className="fixed inset-0 z-[105]" 
                                            onClick={() => setShowVibesDropdown(false)}
                                        />
                                        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-[110] max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                                            <button
                                                onClick={() => {
                                                    setSelectedMood(null);
                                                    setShowVibesDropdown(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-white/10 ${!selectedMood ? 'text-[#ec4899] bg-[#ec4899]/10 font-black' : 'text-slate-400'}`}
                                            >
                                                Todos los ánimos
                                            </button>
                                            {masterVibes && masterVibes.length > 0 ? (
                                                masterVibes.map((vibe: any) => {
                                                    const vibeName = vibe.label || vibe.name;
                                                    const isSelected = selectedMood === vibe.name || selectedMood === vibe.label;
                                                    return (
                                                        <button
                                                            key={vibe.id}
                                                            onClick={() => {
                                                                setSelectedMood(isSelected ? null : vibeName);
                                                                setShowVibesDropdown(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10 ${isSelected ? 'text-[#ec4899] bg-[#ec4899]/10 font-black' : 'text-slate-300'}`}
                                                        >
                                                            {vibeName}
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
                                                                setShowVibesDropdown(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10 ${isSelected ? 'text-[#ec4899] bg-[#ec4899]/10 font-black' : 'text-slate-300'}`}
                                                        >
                                                            {mood}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Section 2: ¿Qué quieres hacer? - Amber (from masterActivities) */}
                        <div className="px-4 py-3 border-b border-white/5 relative">
                            <p style={{ color: '#f59e0b', fontSize: '13px', fontWeight: 'bold', marginBottom: '8px' }}>⚡ ¿Qué quieres hacer?</p>
                            
                            {/* Custom Dropdown Selector */}
                            <div className="relative">
                                <button
                                    onClick={() => setShowActivitiesDropdown(!showActivitiesDropdown)}
                                    className="w-full flex items-center justify-between px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-sm font-semibold text-slate-300 transition-all active:scale-[0.98] outline-none focus:outline-none"
                                >
                                    <span className="flex items-center gap-2">
                                        <span className="text-base">⚡</span>
                                        <span>
                                            {selectedMood && (
                                                masterActivities?.some((a: any) => a.name === selectedMood) ||
                                                ["Bailar", "Comer", "Cuidado Personal", "Deporte", "Descansar", "Farrear", "Plan Relax", "Surf", "Trabajar", "Turismo"].includes(selectedMood)
                                            ) ? selectedMood : 'Selecciona una actividad...'}
                                        </span>
                                    </span>
                                    <div className="flex items-center gap-2">
                                        {selectedMood && (
                                            masterActivities?.some((a: any) => a.name === selectedMood) ||
                                            ["Bailar", "Comer", "Cuidado Personal", "Deporte", "Descansar", "Farrear", "Plan Relax", "Surf", "Trabajar", "Turismo"].includes(selectedMood)
                                        ) && (
                                            <span 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setSelectedMood(null);
                                                }}
                                                className="p-1 hover:bg-white/15 rounded-full text-slate-400 hover:text-white transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                            </span>
                                        )}
                                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-300 ${showActivitiesDropdown ? 'rotate-180' : ''}`} />
                                    </div>
                                </button>

                                {showActivitiesDropdown && (
                                    <>
                                        {/* Overlay to handle click outside */}
                                        <div 
                                            className="fixed inset-0 z-[105]" 
                                            onClick={() => setShowActivitiesDropdown(false)}
                                        />
                                        <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-[#0f172a]/95 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-[110] max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                                            <button
                                                onClick={() => {
                                                    setSelectedMood(null);
                                                    setShowActivitiesDropdown(false);
                                                }}
                                                className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-white/10 ${!selectedMood ? 'text-[#f59e0b] bg-[#f59e0b]/10 font-black' : 'text-slate-400'}`}
                                            >
                                                Todas las actividades
                                            </button>
                                            {masterActivities && masterActivities.length > 0 ? (
                                                masterActivities.map((activity: any) => {
                                                    const isSelected = selectedMood === activity.name;
                                                    return (
                                                        <button
                                                            key={activity.id}
                                                            onClick={() => {
                                                                setSelectedMood(isSelected ? null : activity.name);
                                                                setShowActivitiesDropdown(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10 ${isSelected ? 'text-[#f59e0b] bg-[#f59e0b]/10 font-black' : 'text-slate-300'}`}
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
                                                                setSelectedMood(isSelected ? null : activity as Vibe);
                                                                setShowActivitiesDropdown(false);
                                                            }}
                                                            className={`w-full text-left px-4 py-2.5 text-sm font-semibold transition-colors hover:bg-white/10 ${isSelected ? 'text-[#f59e0b] bg-[#f59e0b]/10 font-black' : 'text-slate-300'}`}
                                                        >
                                                            {activity}
                                                        </button>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Recommended Businesses for selected Activity */}
                        {selectedMood && ACTIVITY_TO_CATEGORIES[selectedMood] && recommendedBusinesses.length > 0 && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-amber-500 animate-pulse" />
                                        <h3 className="text-sm font-black text-amber-500 uppercase tracking-widest italic">
                                            Locales de {selectedMood} recomendados
                                        </h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                                        Por Cercanía y Plan
                                    </span>
                                </div>
                                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6">
                                    {recommendedBusinesses.map(biz => {
                                        const refCoords = userLocation || currentLocality.coords;
                                        const distance = getDistance(refCoords, biz.coordinates);
                                        const status = biz.openingHours ? isBusinessOpen(biz.openingHours) : null;
                                        const isExpert = biz.plan === SubscriptionPlan.EXPERT;
                                        const isElite = biz.plan === SubscriptionPlan.ELITE;

                                        return (
                                            <div 
                                                key={biz.id} 
                                                onClick={() => {
                                                    setPublicProfileId(biz.id);
                                                    setPublicProfileType('business');
                                                    setShowPublicProfile(true);
                                                }}
                                                className={`min-w-[280px] w-[280px] shrink-0 relative overflow-hidden rounded-[2rem] border p-4 cursor-pointer hover:-translate-y-1 transition-all duration-300 ${
                                                    isExpert ? 'glass-expert expert-glow' :
                                                    isElite ? 'glass-premium premium-glow' :
                                                    'bg-[#0f172a]/40 border-white/5'
                                                }`}
                                                style={{
                                                    borderColor: isExpert ? '#f59e0b33' : 
                                                                 isElite ? '#38bdf833' : 'rgba(255,255,255,0.05)'
                                                }}
                                            >
                                                <div className="h-28 rounded-xl overflow-hidden mb-3 relative">
                                                    <img src={biz.imageUrl} className="w-full h-full object-cover" alt={biz.name} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                                                    {biz.plan !== SubscriptionPlan.FREE && (
                                                        <span className={`absolute top-2 right-2 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest rounded-full border backdrop-blur-md ${
                                                            isExpert ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' :
                                                            'bg-sky-500/20 border-sky-500/30 text-sky-400'
                                                        }`}>
                                                            ⭐ {biz.plan}
                                                        </span>
                                                    )}
                                                </div>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-[9px] font-black text-sky-400 uppercase tracking-wider">{biz.category}</span>
                                                    <span className="text-[9px] font-bold text-slate-400">📍 {distance.toFixed(2)} km</span>
                                                </div>
                                                <h4 className="text-sm font-black text-white truncate uppercase italic">{biz.name}</h4>
                                                <p className="text-[10px] text-slate-400 line-clamp-2 mt-1 leading-relaxed">{biz.description}</p>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Flash Offers Carousel */}
                        {(loading || deferredFilteredEvents.some(e => e.isFlashOffer)) && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                                        <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest italic">{t('explore.flashOffers')}</h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('explore.flashHeader')}</span>
                                </div>
                                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6">
                                    {loading ? (
                                        [1, 2, 3].map(i => (
                                            <Skeleton key={`flash-skeleton-${i}`} className="min-w-[280px] h-[350px]" />
                                        ))
                                    ) : (
                                        deferredFilteredEvents.filter(e => e.isFlashOffer).map(event => (
                                            <div key={event.id} className="min-w-[280px] w-[280px] shrink-0">
                                                <EventCard event={event} onClick={setSelectedEvent} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <button
                                    onClick={() => {
                                        setSelectedSector(null);
                                        setActiveFilter('All');
                                        setSearchQuery('');
                                    }}
                                    className="text-2xl font-black text-white tracking-tight flex items-center gap-2 hover:text-rose-500 transition-all group/title text-left"
                                >
                                    <span>
                                        {activeTab === 'events' ? (selectedSector ? `${t('explore.pulseIn')} ${selectedSector}` : t('explore.title')) : 
                                         activeTab === 'landmarks' ? t('explore.referencePoints') : t('explore.directory')}
                                    </span>
                                    {(selectedSector || activeFilter !== 'All' || searchQuery) && (
                                        <X className="w-5 h-5 text-rose-500 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                                    )}
                                </button>
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                                    {activeTab === 'events' ? `${filteredEvents.length} ${t('explore.subTitle')}` : 
                                     activeTab === 'landmarks' ? `${filteredBusinesses.length} Puntos de Interés` : 
                                     `${filteredBusinesses.length} Locales Activos`}
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                {(activeTab === 'directory' || activeTab === 'landmarks') && (
                                    <button
                                        onClick={() => setIsGridView(!isGridView)}
                                        className={`w-11 h-11 flex items-center justify-center rounded-2xl border border-white/10 transition-all ${isGridView ? 'bg-amber-500 text-white border-amber-400' : 'bg-slate-800/50 text-slate-400 hover:text-white'}`}
                                    >
                                        <Layers className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {aiRecData && (
                            <div className="mb-8 relative">
                                <button onClick={() => setAiRecData(null)} className="absolute -top-2 -right-2 z-10 w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white border border-white/10 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="grid grid-cols-2 gap-3">
                                    {aiRecData.map((section) => (
                                        <div
                                            key={section.category}
                                            className={`relative flex flex-col gap-2 p-4 rounded-[1.75rem] border transition-all ${section.isPremium
                                                ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 border-amber-500/30'
                                                : 'bg-slate-900/60 border-white/5'
                                                }`}
                                        >
                                            {section.isPremium && (
                                                <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest bg-amber-500 text-black px-2 py-0.5 rounded-full">⭐ Premium</span>
                                            )}
                                            <span className="text-2xl">{section.emoji}</span>
                                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{section.title}</p>
                                            {section.businessName && (
                                                <p className={`text-xs font-black ${section.isPremium ? 'text-amber-400' : 'text-sky-400'}`}>{section.businessName}</p>
                                            )}
                                            <p className="text-[11px] text-slate-300 leading-relaxed">{section.recommendation}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {askRecData && askRecData.length > 0 && (
                            <div className="mb-8 relative">
                                <button onClick={() => { setAskRecData(null); setShowingDirections(null); }} className="absolute -top-2 -right-2 z-10 w-7 h-7 bg-slate-800 rounded-full flex items-center justify-center text-slate-400 hover:text-white border border-white/10 transition-colors">
                                    <X className="w-4 h-4" />
                                </button>
                                <div className="flex items-center gap-2 mb-4 px-2">
                                    <Sparkles className="w-4 h-4 text-sky-400" />
                                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Resultados IA</h3>
                                </div>
                                <div className="space-y-3">
                                    {askRecData.map((rec) => {
                                        const biz = rec.businessId ? businesses.find(b => b.id === rec.businessId) : null;
                                        const hasLocation = !!(biz?.coordinates || biz?.location);
                                        const isDirectionsActive = showingDirections === rec.businessId;

                                        return (
                                            <div
                                                key={rec.title + rec.businessName}
                                                className={`relative p-4 rounded-[1.75rem] border transition-all ${rec.isPremium
                                                    ? 'bg-gradient-to-br from-amber-500/15 to-orange-500/10 border-amber-500/30'
                                                    : 'bg-slate-900/60 border-white/5'
                                                    }`}
                                            >
                                                {rec.isPremium && (
                                                    <span className="absolute top-3 right-3 text-[9px] font-black uppercase tracking-widest bg-amber-500 text-black px-2 py-0.5 rounded-full">⭐ Premium</span>
                                                )}
                                                <div className="flex items-start gap-3">
                                                    <span className="text-2xl shrink-0">{rec.emoji}</span>
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">{rec.category}</span>
                                                        </div>
                                                        <h4 className="text-sm font-black text-white uppercase italic tracking-tight mb-1">{rec.title}</h4>
                                                        {rec.businessName && (
                                                            <div className="flex items-center gap-1.5 mb-2">
                                                                <MapPin className="w-3 h-3 text-slate-400" />
                                                                <span className="text-[11px] font-bold text-slate-300">{rec.businessName}</span>
                                                            </div>
                                                        )}
                                                        <p className="text-[11px] text-slate-400 leading-relaxed mb-3">{rec.recommendation}</p>
                                                        {hasLocation && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={() => {
                                                                        if (rec.businessId) {
                                                                            focusBusinessOnMap(rec.businessId);
                                                                        }
                                                                    }}
                                                                    disabled={!rec.businessId}
                                                                    className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/20 border border-sky-500/30 rounded-xl text-[10px] font-black text-sky-400 uppercase tracking-widest hover:bg-sky-500/30 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                                                >
                                                                    <MapPin className="w-3 h-3" />
                                                                    Ver en mapa
                                                                </button>
                                                                <button
                                                                    onClick={() => rec.businessId && getDirectionsTo(rec.businessId)}
                                                                    disabled={!rec.businessId}
                                                                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all disabled:opacity-30 disabled:cursor-not-allowed ${isDirectionsActive
                                                                        ? 'bg-emerald-500/30 border border-emerald-500/50 text-emerald-400'
                                                                        : 'bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/25'
                                                                        }`}
                                                                >
                                                                    <Navigation className="w-3 h-3" />
                                                                    Cómo llegar
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {isAskLoading && (
                            <div className="mb-8 px-2">
                                <div className="p-6 rounded-[2rem] bg-slate-900/60 border border-white/5 flex items-center gap-3">
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-2 h-2 bg-sky-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Buscando las mejores opciones...</span>
                                </div>
                            </div>
                        )}

                        {/* Trending Section */}
                        {popularVibe && (
                            <div className="mb-8 px-2">
                                <div className="p-5 rounded-[2.5rem] bg-gradient-to-r from-rose-500/20 to-orange-500/10 border border-rose-500/20 relative overflow-hidden group">
                                    <div className="absolute -right-4 -top-4 w-24 h-24 bg-rose-500/20 blur-3xl rounded-full group-hover:bg-rose-500/30 transition-colors" />
                                    <div className="flex items-center justify-between relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 rounded-2xl bg-rose-500/20 border border-rose-500/30">
                                                <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
                                            </div>
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em]">{t('explore.trendingLive')}</span>
                                                    <div className="w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                                                </div>
                                                <h3 className="text-lg font-black text-white uppercase italic tracking-tight">{t('explore.trendingNow')}</h3>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{t('explore.popularVibe')}</p>
                                            <p className="text-xl font-black text-orange-400 italic">#{popularVibe}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}


                        {/* Landmarks & Sectors Section - Show when Points tab is active */}
                        {activeTab === 'landmarks' && (
                            <div className="mb-8">
                                {/* Sectors / Neighborhoods Subsection */}
                                <div className="px-6 mb-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <Compass className="w-4 h-4 text-emerald-400" />
                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Sectores y Barrios</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {businesses.filter(b => (b.mapType === MapEntryType.SECTOR) && b.locality === currentLocality.name).map((sector, idx) => (
                                            <div
                                                key={`sector-${sector.id}-${idx}`}
                                                onClick={() => {
                                                    setPublicProfileId(sector.id);
                                                    setPublicProfileType('business');
                                                    setShowPublicProfile(true);
                                                }}
                                                className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:bg-emerald-500 group-hover:text-white transition-all">
                                                        <Compass className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-white uppercase truncate group-hover:text-emerald-400 transition-colors">{sector.name}</p>
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 truncate">{sector.sector}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {businesses.filter(b => (b.mapType === MapEntryType.SECTOR) && b.locality === currentLocality.name).length === 0 && (
                                        <p className="text-[10px] font-bold text-slate-600 text-center py-4 bg-white/5 rounded-2xl border border-dashed border-white/10 italic">No hay sectores registrados</p>
                                    )}
                                </div>

                                {/* Reference Points Subsection */}
                                <div className="px-6">
                                    <div className="flex items-center gap-2 mb-4">
                                        <MapPin className="w-4 h-4 text-sky-400" />
                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Puntos de Referencia</h3>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        {businesses.filter(b => 
                                            (b.mapType === MapEntryType.LANDMARK || (b.isReference && !b.mapType) || (b.category === BusinessCategory.REFERENCIA && !b.mapType)) && 
                                            b.locality === currentLocality.name
                                        ).map((landmark, idx) => (
                                            <div
                                                key={`landmark-${landmark.id}-${idx}`}
                                                onClick={() => {
                                                    setPublicProfileId(landmark.id);
                                                    setPublicProfileType('business');
                                                    setShowPublicProfile(true);
                                                }}
                                                className="p-4 bg-white/5 rounded-2xl border border-white/10 hover:border-sky-500/30 hover:bg-sky-500/5 transition-all cursor-pointer group"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <div className="w-10 h-10 rounded-xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400 group-hover:bg-sky-500 group-hover:text-white transition-all">
                                                        <MapPin className="w-5 h-5" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-black text-white uppercase truncate group-hover:text-sky-400 transition-colors">{landmark.name}</p>
                                                        <p className="text-[9px] text-slate-500 font-bold uppercase mt-0.5 truncate">{landmark.sector}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    {businesses.filter(b => 
                                        (b.mapType === MapEntryType.LANDMARK || (b.isReference && !b.mapType) || (b.category === BusinessCategory.REFERENCIA && !b.mapType)) && 
                                        b.locality === currentLocality.name
                                    ).length === 0 && (
                                        <p className="text-[10px] font-bold text-slate-600 text-center py-4 bg-white/5 rounded-2xl border border-dashed border-white/10 italic">No hay puntos de referencia</p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* For You Section */}
                        {user?.preferredVibe && filteredEvents.filter(e => e.vibe === user.preferredVibe).length > 0 && (
                            <div className="mb-10 p-6 bg-gradient-to-br from-sky-500/10 to-indigo-500/5 rounded-[2.5rem] border border-sky-500/10 relative overflow-hidden group">
                                <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-500/5 blur-3xl rounded-full" />
                                <div className="flex items-center justify-between mb-5 relative z-10">
                                    <div className="flex items-center gap-2">
                                        <Sparkles className="w-4 h-4 text-sky-400" />
                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{t('explore.forYou')}</h3>
                                    </div>
                                    <div className="flex items-center gap-2 bg-sky-500/20 px-3 py-1 rounded-full border border-sky-500/30">
                                        <div className="w-1.5 h-1.5 bg-sky-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
                                        <span className="text-[9px] font-black text-sky-400 uppercase tracking-widest">{user.preferredVibe}</span>
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-2 px-2 relative z-10">
                                    {loading ? (
                                        [1, 2, 3].map(i => (
                                            <Skeleton key={`foryou-skeleton-${i}`} className="min-w-[280px] h-[350px]" />
                                        ))
                                    ) : (
                                        deferredFilteredEvents.filter(e => e.vibe === user.preferredVibe).map(event => (
                                            <div key={`foryou-${event.id}`} className="min-w-[280px] w-[280px] shrink-0 px-2 transform transition-all hover:scale-[1.02]">
                                                <EventCard event={event} onClick={setSelectedEvent} />
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {activeTab === 'events' ? (
                                loading ? (
                                    [1, 2, 3, 4].map(i => (
                                        <Skeleton key={`event-skeleton-${i}`} className="w-full h-48 rounded-[2.5rem]" />
                                    ))
                                ) : (
                                    deferredFilteredEvents.map(event => (
                                        <div key={event.id} className="relative">
                                            <EventCard event={event} onClick={setSelectedEvent} />
                                            <button
                                                onClick={(e) => toggleFavorite(event.id, e)}
                                                className="absolute top-6 right-6 z-10 p-3 bg-black/30 backdrop-blur-xl rounded-full border border-white/10 hover:scale-110 active:scale-95 transition-all group"
                                            >
                                                <Heart className={`w-5 h-5 transition-colors ${favorites.includes(event.id) ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                                            </button>
                                        </div>
                                    ))
                                )
                            ) : (
                                <div className={`${isGridView ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'flex flex-col gap-6'} pb-10`}>
                                    {loading ? (
                                        [1, 2, 3, 4, 5, 6].map(i => (
                                            <Skeleton key={`biz-skeleton-${i}`} className={`w-full ${isGridView ? 'h-[300px]' : 'h-48'} rounded-[2.5rem]`} />
                                        ))
                                    ) : (
                                        deferredFilteredBusinesses.map(business => {
                                            const status = business.openingHours ? isBusinessOpen(business.openingHours) : null;
                                            return (
                                                <div
                                                    key={business.id}
                                                    onClick={() => {
                                                        setPublicProfileId(business.id);
                                                        setPublicProfileType('business');
                                                        setShowPublicProfile(true);
                                                    }}
                                                    className={`relative group cursor-pointer transition-all duration-700 hover:-translate-y-2 ${isGridView ? 'h-[350px]' : ''}`}
                                                >
                                                    {/* Background Glow */}
                                                    <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-700 opacity-10 blur-3xl group-hover:opacity-40 rounded-[3rem] ${
                                                        business.plan === SubscriptionPlan.EXPERT ? 'from-amber-400 via-orange-500 to-rose-600' :
                                                        business.plan === SubscriptionPlan.ELITE ? 'from-sky-400 via-indigo-500 to-purple-600' :
                                                        business.plan === SubscriptionPlan.PRO ? 'from-emerald-400 via-teal-500 to-cyan-600' :
                                                        'from-slate-400 to-slate-600'
                                                    }`} />
                                                
                                                    {/* Main Container */}
                                                    <div className={`h-full relative overflow-hidden rounded-[2.5rem] border backdrop-blur-3xl transition-all duration-500 flex flex-col ${
                                                        business.plan === SubscriptionPlan.EXPERT ? 'glass-expert expert-glow' :
                                                        business.plan === SubscriptionPlan.ELITE ? 'glass-premium premium-glow' :
                                                        business.plan === SubscriptionPlan.PRO ? 'glass-pro pro-glow' :
                                                        'bg-[#0f172a]/40 border-white/5'
                                                    }`}>
                                                        {/* Business Image */}
                                                        <div className={`${isGridView ? 'h-32' : 'h-40'} relative overflow-hidden shrink-0 transition-all duration-700`}>
                                                            <img src={business.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={business.name} />
                                                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-80" />
                                                            
                                                            {/* Plan Badge */}
                                                            {business.plan !== SubscriptionPlan.FREE && (
                                                                <div className="absolute top-4 right-4 z-10">
                                                                    <div className={`px-4 py-1.5 rounded-full border backdrop-blur-2xl flex items-center gap-2.5 ${
                                                                        business.plan === SubscriptionPlan.EXPERT ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 
                                                                        business.plan === SubscriptionPlan.ELITE ? 'bg-sky-500/20 border-sky-500/30 text-sky-400' :
                                                                        'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                                                                    }`}>
                                                                        <Star className={`w-3.5 h-3.5 ${
                                                                            business.plan === SubscriptionPlan.EXPERT ? 'fill-amber-400' : 
                                                                            business.plan === SubscriptionPlan.ELITE ? 'fill-sky-400' :
                                                                            'fill-emerald-400'
                                                                        }`} />
                                                                        <span className="text-[10px] font-black uppercase tracking-widest italic">{business.plan}</span>
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>

                                                        {/* Content Area */}
                                                        <div className="p-6 flex flex-col flex-1 gap-4">
                                                            <div className="flex flex-col gap-2">
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex flex-col">
                                                                        <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em]">{business.category}</span>
                                                                        {status && (
                                                                            <div className="flex items-center gap-1.5 mt-1">
                                                                                <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${status.isOpen ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                                                                                <span className={`text-[9px] font-bold uppercase tracking-wider ${status.isOpen ? 'text-emerald-400' : 'text-rose-400'}`}>
                                                                                    {status.message}
                                                                                </span>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-1">
                                                                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                                        <span className="text-[10px] font-black text-white italic">{(business as any).rating || '5.0'}</span>
                                                                    </div>
                                                                </div>
                                                                
                                                                <h3 className={`text-xl font-black uppercase tracking-tight transition-colors line-clamp-1 ${
                                                                    business.plan === SubscriptionPlan.EXPERT ? 'text-pulsar-expert' :
                                                                    business.plan === SubscriptionPlan.ELITE ? 'text-pulsar-premium' :
                                                                    'text-white group-hover:text-sky-400'
                                                                }`}>
                                                                    {business.name}
                                                                </h3>
                                                                <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{business.description}</p>
                                                            </div>

                                                            {/* Services */}
                                                            {business.services && business.services.length > 0 && (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {business.services.slice(0, 3).map((service, idx) => (
                                                                        <span key={idx} className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-md text-[9px] font-bold text-sky-400 uppercase">
                                                                            {service}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            )}

                                                            {/* Footer Info */}
                                                            <div className="mt-auto pt-4 border-t border-white/5 flex items-center justify-between">
                                                                <div className="flex items-center gap-2">
                                                                    <div className="p-2 rounded-xl bg-slate-800/50">
                                                                        <MapPin className="w-4 h-4 text-slate-400" />
                                                                    </div>
                                                                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-widest">{business.sector}</span>
                                                                </div>
                                                                
                                                                <div className="flex items-center gap-3">
                                                                    <button 
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            window.open(`https://wa.me/${business.whatsapp}`, '_blank');
                                                                        }}
                                                                        className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all duration-300"
                                                                    >
                                                                        <Waves className="w-4 h-4" />
                                                                    </button>
                                                                    <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-500 group-hover:bg-sky-500 group-hover:text-white transition-all duration-500">
                                                                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            )}
                        </div>
                        </div>
                    )}
                </div>
            )}

            {/* Quick Sector Nav - Only show in Explore */}
            {(isPanelMinimized || isEditorFocus) && (
                <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[1100] animate-in fade-in slide-in-from-bottom duration-500">
                    <button
                        onClick={() => {
                            setSelectedSector(null);
                            setActiveFilter('All');
                            setSearchQuery('');
                            setIsPanelMinimized(false);
                            setIsEditorFocus(false);
                        }}
                        onTouchEnd={(e) => {
                            e.preventDefault();
                            setSelectedSector(null);
                            setActiveFilter('All');
                            setSearchQuery('');
                            setIsPanelMinimized(false);
                            setIsEditorFocus(false);
                        }}
                        className="flex items-center gap-2.5 px-6 py-3.5 bg-rose-500 hover:bg-rose-400 active:scale-95 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-2xl shadow-rose-500/40 transition-all border border-rose-400/30 cursor-pointer"
                    >
                        <span className="animate-pulse w-2 h-2 rounded-full bg-white inline-block" />
                        Pulse of Today
                        <span className="text-base">⚡</span>
                    </button>
                </div>
            )}
            
            <ItineraryModal
                isOpen={showItinerary}
                onClose={() => setShowItinerary(false)}
            />
            <PlannerChatModal
                isOpen={showPlannerChat}
                onClose={() => setShowPlannerChat(false)}
            />
            <LocalityManagerModal />
        </>
    );
};


