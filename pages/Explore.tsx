import React, { useState, useMemo, useEffect, useRef, useDeferredValue, lazy, Suspense } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Sparkles, MapPin, Store, Waves, Leaf, ExternalLink, Heart, Zap, ShieldCheck, Flame, Star, Search, Filter, Layers, ChevronDown, ChevronUp, TrendingUp, Clock, Trash2, ArrowRight, Radio, Navigation, Route, Compass } from 'lucide-react';
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
import { getWhatsAppUrl } from '../utils/social';
import { useSEO } from '../hooks/useSEO';
import type { PlannerSection } from '../services/geminiService';

import { ItineraryModal } from '../components/Modals/ItineraryModal';
import { PlannerChatModal } from '../components/Modals/PlannerChatModal';
import { LocalityManagerModal } from '../components/Modals/LocalityManagerModal';
import { Skeleton } from '../components/Skeleton';
import { ECUADOR_GEO_DATA, LocationStructure } from '../utils/ecuadorGeoData';

const ECUADOR_LOCATIONS: LocationStructure = ECUADOR_GEO_DATA;
import { getCriteriaForMoodOrActivity, filterBusinessesByCriteria, filterEventsByCriteria } from '../utils/activityVibeMatcher';

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
}

export const Explore: React.FC<ExploreProps> = ({
    onEditBusiness
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
    const [showingDirections, setShowingDirections] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [selectedProvince, setSelectedProvince] = useState<string>('Santa Elena');
    const [selectedCanton, setSelectedCanton] = useState<string>('Santa Elena');
    const [selectedParroquia, setSelectedParroquia] = useState<string>('Manglaralto');
    const [selectedComuna, setSelectedComuna] = useState<string>('Montañita');
    const [showGeoFilters, setShowGeoFilters] = useState<boolean>(false);

    // Sync selectedComuna when currentLocality changes
    useEffect(() => {
        if (currentLocality?.name && (currentLocality?.name || 'Montañita') !== selectedComuna && selectedComuna !== 'Todas') {
            setSelectedComuna((currentLocality?.name || 'Montañita'));
        }
    }, [currentLocality?.name]);

    // Dynamic Lists for Ecuador Geo
    const provincesList = useMemo(() => Object.keys(ECUADOR_LOCATIONS), []);
    
    const cantonsList = useMemo(() => {
        if (selectedProvince !== 'Todas') {
            return Object.keys(ECUADOR_LOCATIONS[selectedProvince] || {});
        }
        const set = new Set<string>();
        Object.values(ECUADOR_LOCATIONS).forEach(provObj => {
            Object.keys(provObj).forEach(c => set.add(c));
        });
        return Array.from(set);
    }, [selectedProvince]);

    const parroquiasList = useMemo(() => {
        if (selectedProvince !== 'Todas' && selectedCanton !== 'Todos') {
            return Object.keys(ECUADOR_LOCATIONS[selectedProvince]?.[selectedCanton] || {});
        }
        if (selectedProvince !== 'Todas') {
            const set = new Set<string>();
            const provObj = ECUADOR_LOCATIONS[selectedProvince] || {};
            Object.values(provObj).forEach(cantonObj => {
                Object.keys(cantonObj).forEach(p => set.add(p));
            });
            return Array.from(set);
        }
        const set = new Set<string>();
        Object.values(ECUADOR_LOCATIONS).forEach(provObj => {
            Object.values(provObj).forEach(cantonObj => {
                Object.keys(cantonObj).forEach(p => set.add(p));
            });
        });
        return Array.from(set);
    }, [selectedProvince, selectedCanton]);

    const comunasList = useMemo(() => {
        if (selectedProvince !== 'Todas' && selectedCanton !== 'Todos' && selectedParroquia !== 'Todas') {
            const list = ECUADOR_LOCATIONS[selectedProvince]?.[selectedCanton]?.[selectedParroquia];
            return list ? list.filter(c => c !== 'Todas') : [];
        }
        const set = new Set<string>();
        if (selectedProvince !== 'Todas' && selectedCanton !== 'Todos') {
            const cantonObj = ECUADOR_LOCATIONS[selectedProvince]?.[selectedCanton] || {};
            Object.values(cantonObj).forEach(arr => {
                arr.forEach(c => { if (c !== 'Todas') set.add(c); });
            });
        } else if (selectedProvince !== 'Todas') {
            const provObj = ECUADOR_LOCATIONS[selectedProvince] || {};
            Object.values(provObj).forEach(cantonObj => {
                Object.values(cantonObj).forEach(arr => {
                    arr.forEach(c => { if (c !== 'Todas') set.add(c); });
                });
            });
        } else {
            Object.values(ECUADOR_LOCATIONS).forEach(provObj => {
                Object.values(provObj).forEach(cantonObj => {
                    Object.values(cantonObj).forEach(arr => {
                        arr.forEach(c => { if (c !== 'Todas') set.add(c); });
                    });
                });
            });
            (customLocalities || []).forEach(cl => {
                if (cl.name) set.add(cl.name);
            });
        }
        return Array.from(set);
    }, [selectedProvince, selectedCanton, selectedParroquia, customLocalities]);

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
        description: `Encuentra los mejores lugares y eventos en ${(currentLocality?.name || 'Montañita')} con ubicame.info PULSE.`,
        url: BASE_URL + window.location.pathname
    });
    
    // 2. Derived State
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

    const handleAiAsk = async () => {
        setIsAiLoading(true);
        setAiRecData(null);
        const { getPlannerRecommendations } = await import('../services/geminiService');
        const data = await getPlannerRecommendations(user, businesses, (currentLocality?.name || 'Montañita'));
        setAiRecData(data);
        setIsAiLoading(false);
    };


    const openBusinessProfile = (businessId: string) => {
        const business = businesses.find(b => b.id === businessId);
        if (business) {
            const _wa = getWhatsAppUrl(business.whatsapp);
            setPublicProfileId(business.id);
            setPublicProfileType('business');
            setShowPublicProfile(true);
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

        const url = `https://www.google.com/maps/dir/${userLat},${userLng}/${bizLat},${bizLng}`;
        window.open(url, '_blank');
    };

    const navigateToDirect = (businessId: string) => {
        navigate(`/community?tab=direct&businessId=${businessId}`);
    };

    const currentMoodCriteria = useMemo(() => {
        if (!selectedMood) return null;
        return getCriteriaForMoodOrActivity(selectedMood, masterActivities, masterVibes);
    }, [selectedMood, masterActivities, masterVibes]);

    const recommendedBusinesses = useMemo(() => {
        if (!currentMoodCriteria) return [];
        const refCoords = userLocation || (currentLocality?.coords || [-1.825, -80.753]);
        return filterBusinessesByCriteria(
            businesses,
            currentMoodCriteria,
            (currentLocality?.name || 'Montañita'),
            refCoords,
            getDistance
        );
    }, [currentMoodCriteria, businesses, currentLocality, userLocation]);

    const filteredEvents = useMemo(() => {
        let result = (eventsWithLiveCounts || []).filter(e => isEventPublicAndActive(e));
        
        // Filter by locality with accent normalization & fallback
        result = result.filter(e => {
            if (!currentLocality?.name) return true;
            const biz = businesses.find(b => b.id === e.businessId);
            const eventLocality = e.locality || biz?.locality || 'Montañita';
            const normLoc = (eventLocality || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normCurr = ((currentLocality?.name || 'Montañita') || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
        if (currentMoodCriteria) {
            result = filterEventsByCriteria(result, businesses, currentMoodCriteria, (currentLocality?.name || 'Montañita'));
        }
        return result;
    }, [eventsWithLiveCounts, businesses, activeFilter, searchQuery, currentMoodCriteria, (currentLocality?.name || 'Montañita')]);


        const searchMatchingBusinesses = useMemo(() => {
        if (!searchQuery || !searchQuery.trim()) return [];
        const q = searchQuery.toLowerCase().trim();
        const normLoc = (currentLocality?.name || 'Montañita').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        return businesses.filter((b: any) => {
            if (currentLocality?.name && selectedComuna !== 'Todas') {
                const bLoc = (b.locality || 'Montañita').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
                const isLocMatch = bLoc === normLoc || bLoc.includes(normLoc) || normLoc.includes(bLoc) || b.name?.toLowerCase().includes('ubicame.info');
                if (!isLocMatch) return false;
            }

            const nameMatch = b.name && b.name.toLowerCase().includes(q);
            const categoryMatch = b.category && b.category.toLowerCase().includes(q);
            const sectorMatch = b.sector && b.sector.toLowerCase().includes(q);
            const localityMatch = b.locality && b.locality.toLowerCase().includes(q);
            const descMatch = b.description && b.description.toLowerCase().includes(q);
            const addressMatch = b.address && b.address.toLowerCase().includes(q);
            const tagsMatch = b.tags && Array.isArray(b.tags) && b.tags.some((t: string) => t.toLowerCase().includes(q));

            return nameMatch || categoryMatch || sectorMatch || localityMatch || descMatch || addressMatch || tagsMatch;
        }).sort((a: any, b: any) => {
            const planWeight = (plan: string) => {
                if (plan === 'EXPERT') return 4;
                if (plan === 'ELITE') return 3;
                if (plan === 'PRO') return 2;
                return 1;
            };
            const weightA = planWeight(a.plan);
            const weightB = planWeight(b.plan);
            if (weightA !== weightB) return weightB - weightA;
            const refCoords = userLocation || (currentLocality?.coords || [-1.825, -80.753]);
            if (refCoords && a.coordinates && b.coordinates) {
                return getDistance(refCoords, a.coordinates) - getDistance(refCoords, b.coordinates);
            }
            return 0;
        });
    }, [businesses, searchQuery, currentLocality?.name, selectedComuna, userLocation]);

    const filteredBusinesses = useMemo(() => {
        let result = [...businesses];

        // Filter by locality with accent normalization & fallback
        result = result.filter(b => {
            if (!currentLocality?.name) return true;
            const bizLocality = b.locality || 'Montañita';
            const normLoc = (bizLocality || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            const normCurr = ((currentLocality?.name || 'Montañita') || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
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
    }, [businesses, activeFilter, searchQuery, selectedMood, selectedSector, activeTab, (currentLocality?.name || 'Montañita')]);


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
                <div className="min-h-screen bg-[#070c18] text-white pb-24 pt-3 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                    <div className="flex flex-col lg:flex-row lg:gap-6 xl:gap-8">
                    {/* ── SIDEBAR: Búsqueda + Filtros (sticky en desktop) ── */}
                    <div className="w-full lg:w-[340px] xl:w-[380px] shrink-0 flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto no-scrollbar">
                    {/* Unified Search & Geographic Location Card */}
                    <div className="bg-[#0b1324] border border-white/5 rounded-3xl p-3 sm:p-4 flex flex-col gap-3 shadow-xl">
                        {/* Search Input */}
                        <div className="relative">
                            <div className="relative flex items-center bg-[#070c18] border border-white/5 rounded-2xl px-3.5 py-3 group focus-within:border-white/20 transition-all">
                                <Search className="w-4 h-4 text-slate-400 shrink-0 mr-3 group-focus-within:text-amber-400 transition-colors" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Buscar eventos, negocios, servicios o referencias..."
                                    className="w-full bg-transparent border-none outline-none text-xs sm:text-sm text-slate-200 placeholder:text-slate-500 font-medium"
                                />
                                {searchQuery && (
                                    <button 
                                        onClick={() => setSearchQuery('')}
                                        className="p-1 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all ml-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Search Results Dropdown */}
                            {searchQuery.length > 2 && (
                                <div className="antigravity absolute top-full left-0 right-0 mt-2 bg-[#0d1733]/98 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 z-[3000]">
                                    <div className="p-2 max-h-[400px] overflow-y-auto no-scrollbar">
                                        <div className="space-y-1">
                                            {[...LOCALITIES, ...customLocalities]
                                                .filter(loc => (searchQuery || '').toLowerCase().includes(loc.name.toLowerCase()))
                                                .map((loc, i) => (
                                                    <button
                                                        key={`loc-${i}`}
                                                        onClick={() => {
                                                            setCurrentLocality(loc);
                                                            setSearchQuery('');
                                                        }}
                                                        className="w-full flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-all group border border-white/5 mb-1"
                                                    >
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                                                                <MapPin className="w-4 h-4" />
                                                            </div>
                                                            <div className="text-left">
                                                                <div className="text-xs font-black text-white group-hover:text-amber-400 uppercase tracking-wider">
                                                                    {loc.name}
                                                                </div>
                                                                <div className="text-[9px] text-slate-500 uppercase tracking-widest font-black">
                                                                    Localidad
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest px-2.5 py-1 bg-amber-500/10 rounded-full border border-amber-500/20">Visitar</span>
                                                    </button>
                                                ))
                                            }

                                            {[...businesses, ...eventsWithLiveCounts]
                                                .filter(item => {
                                                    const locality = 'locality' in item ? item.locality : businesses.find(b => b.id === (item as any).businessId)?.locality;
                                                    const matchesLocality = (locality || 'Montañita') === (currentLocality?.name || 'Montañita');
                                                    const itemName = 'name' in item ? (item as any).name : (item as any).title;
                                                    if (!itemName) return false;
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
                                                    const isUnpublished = (item as any).isPublished === false;
                                                    return matchesLocality && matchesSearch && !isDeactivated && !isUnpublished;
                                                })
                                                .slice(0, 8)
                                                .map((item, i) => {
                                                    const isEvent = 'title' in item || 'startAt' in item;
                                                    const isRef = !isEvent && ((item as any).isReference || (item as any).mapType === MapEntryType.LANDMARK);
                                                    const isSector = !isEvent && (item as any).mapType === MapEntryType.SECTOR;
                                                    const typeLabel = isEvent ? 'Evento' : isRef ? 'Referencia' : isSector ? 'Sector' : 'Negocio';
                                                    return (
                                                        <button
                                                            key={`search-res-${i}`}
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
                                                            className="w-full min-h-[44px] flex items-center justify-between p-3 hover:bg-white/5 rounded-xl transition-all group text-left"
                                                        >
                                                            <div className="flex items-center gap-3 truncate">
                                                                <div className="w-9 h-9 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-slate-300 text-base shrink-0">
                                                                    {isEvent ? '⚡' : isRef ? '📍' : isSector ? '🧭' : '🏪'}
                                                                </div>
                                                                <div className="text-left truncate">
                                                                    <div className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors truncate">
                                                                        {'name' in item ? (item as any).name : (item as any).title}
                                                                    </div>
                                                                    <div className="flex items-center gap-2 mt-0.5">
                                                                        <span className="text-[8px] font-black uppercase px-1.5 py-0.2 rounded border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                                                            {typeLabel}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-400 truncate">
                                                                            {(item as any).category || (item as any).sector || (currentLocality?.name || 'Montañita')}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                            <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 shrink-0 ml-2" />
                                                        </button>
                                                    );
                                                })
                                            }
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Location Details Row */}
                        <div className="flex items-center justify-between px-1 pt-0.5 relative">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#141e33] border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0 shadow-inner">
                                    <MapPin className="w-5 h-5 text-amber-400" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">UBICACIÓN GEOGRÁFICA</span>
                                    <button 
                                        onClick={() => setShowLocalityMenu(!showLocalityMenu)}
                                        className="flex items-center gap-1.5 text-sm sm:text-base font-black text-white hover:text-amber-400 transition-colors text-left"
                                    >
                                        <span>{(currentLocality?.name || 'Montañita')}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showLocalityMenu ? 'rotate-180' : ''}`} />
                                    </button>
                                </div>
                            </div>
                            <button
                                onClick={() => setShowLocalityManager(true)}
                                className="px-4 py-1.5 bg-[#141e33]/60 hover:bg-[#141e33] border border-amber-500/30 hover:border-amber-500/60 rounded-full text-amber-400 font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all active:scale-95 shadow-sm"
                            >
                                CAMBIAR UBICACIÓN
                            </button>

                            {showLocalityMenu && (
                                <>
                                    <div className="fixed inset-0 z-[65]" onClick={() => setShowLocalityMenu(false)} />
                                    <div className="absolute top-[calc(100%+8px)] left-0 w-64 bg-[#0d1733]/98 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl py-2 z-[70] animate-in fade-in slide-in-from-top-2">
                                        <div className="px-3 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Seleccionar Zona</div>
                                        <div className="max-h-60 overflow-y-auto no-scrollbar">
                                            {[...LOCALITIES, ...customLocalities].map((loc, idx) => (
                                                <button
                                                    key={`${loc.name}-${idx}`}
                                                    onClick={() => {
                                                        setCurrentLocality(loc);
                                                        setShowLocalityMenu(false);
                                                    }}
                                                    className={`w-full flex items-center justify-between px-4 py-2.5 text-xs font-bold transition-colors hover:bg-white/10 ${(currentLocality?.name || 'Montañita') === loc.name ? 'text-amber-400 bg-amber-400/10' : 'text-slate-300'}`}
                                                >
                                                    {loc.name}
                                                    {(currentLocality?.name || 'Montañita') === loc.name && <ShieldCheck className="w-4 h-4 text-amber-400" />}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Section 1: ¿Cómo te sientes? */}
                    <div className="flex flex-col gap-2 relative">
                        <div className="flex items-center gap-2">
                            <span className="text-base">🎯</span>
                            <h3 className="text-base sm:text-lg font-bold text-pink-500">¿Cómo te sientes?</h3>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowVibesDropdown(!showVibesDropdown);
                                    setShowActivitiesDropdown(false);
                                }}
                                className="w-full flex items-center justify-between px-4 py-3.5 bg-[#0b1324] hover:bg-[#0f1a30] border border-white/5 hover:border-white/10 rounded-2xl text-xs sm:text-sm font-semibold text-slate-300 transition-all shadow-md active:scale-[0.99]"
                            >
                                <span className="flex items-center gap-2.5 truncate">
                                    <span>🎯</span>
                                    <span className="truncate">
                                        {selectedMood && (
                                            masterVibes?.some((v: any) => v.name === selectedMood || v.label === selectedMood) ||
                                            ["Aburrido", "Agradecido", "Cansado", "Curioso", "Enfermo", "Feliz", "Hambriento", "Inspirado", "Relajado", "Triste"].includes(selectedMood)
                                        ) ? selectedMood : 'Selecciona tu ánimo / vibra...'}
                                    </span>
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {selectedMood && (
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedMood(null);
                                            }}
                                            className="p-1 hover:bg-white/15 rounded-full text-slate-400 hover:text-white transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showVibesDropdown ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {showVibesDropdown && (
                                <>
                                    <div className="fixed inset-0 z-[60]" onClick={() => setShowVibesDropdown(false)} />
                                    <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-[#0d1733]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-[70] max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2">
                                        <button
                                            onClick={() => {
                                                setSelectedMood(null);
                                                setShowVibesDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-white/10 ${!selectedMood ? 'text-pink-400 bg-pink-500/10 font-black' : 'text-slate-400'}`}
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
                                                        className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors hover:bg-white/10 ${isSelected ? 'text-pink-400 bg-pink-500/10 font-black' : 'text-slate-300'}`}
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
                                                        className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors hover:bg-white/10 ${isSelected ? 'text-pink-400 bg-pink-500/10 font-black' : 'text-slate-300'}`}
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

                    {/* Section 2: ¿Qué quieres hacer? */}
                    <div className="flex flex-col gap-2 relative">
                        <div className="flex items-center gap-2">
                            <span className="text-base">⚡</span>
                            <h3 className="text-base sm:text-lg font-bold text-amber-500">¿Qué quieres hacer?</h3>
                        </div>
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowActivitiesDropdown(!showActivitiesDropdown);
                                    setShowVibesDropdown(false);
                                }}
                                className="w-full flex items-center justify-between px-4 py-3.5 bg-[#0b1324] hover:bg-[#0f1a30] border border-white/5 hover:border-white/10 rounded-2xl text-xs sm:text-sm font-semibold text-slate-300 transition-all shadow-md active:scale-[0.99]"
                            >
                                <span className="flex items-center gap-2.5 truncate">
                                    <span>⚡</span>
                                    <span className="truncate">
                                        {selectedMood && (
                                            masterActivities?.some((a: any) => a.name === selectedMood) ||
                                            ["Bailar", "Comer", "Cuidado Personal", "Deporte", "Descansar", "Farrear", "Plan Relax", "Surf", "Trabajar", "Turismo"].includes(selectedMood)
                                        ) ? selectedMood : 'Selecciona una actividad...'}
                                    </span>
                                </span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    {selectedMood && (
                                        <span 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedMood(null);
                                            }}
                                            className="p-1 hover:bg-white/15 rounded-full text-slate-400 hover:text-white transition-colors"
                                        >
                                            <X className="w-3.5 h-3.5" />
                                        </span>
                                    )}
                                    <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${showActivitiesDropdown ? 'rotate-180' : ''}`} />
                                </div>
                            </button>

                            {showActivitiesDropdown && (
                                <>
                                    <div className="fixed inset-0 z-[60]" onClick={() => setShowActivitiesDropdown(false)} />
                                    <div className="absolute top-[calc(100%+6px)] left-0 right-0 bg-[#0d1733]/98 backdrop-blur-2xl border border-white/10 rounded-2xl shadow-2xl py-2 z-[70] max-h-60 overflow-y-auto no-scrollbar animate-in fade-in slide-in-from-top-2">
                                        <button
                                            onClick={() => {
                                                setSelectedMood(null);
                                                setShowActivitiesDropdown(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors hover:bg-white/10 ${!selectedMood ? 'text-amber-400 bg-amber-500/10 font-black' : 'text-slate-400'}`}
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
                                                        className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors hover:bg-white/10 ${isSelected ? 'text-amber-400 bg-amber-500/10 font-black' : 'text-slate-300'}`}
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
                                                        className={`w-full text-left px-4 py-2.5 text-xs sm:text-sm font-semibold transition-colors hover:bg-white/10 ${isSelected ? 'text-amber-400 bg-amber-500/10 font-black' : 'text-slate-300'}`}
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
                    </div>

                    {/* ── COLUMNA PRINCIPAL: Feed de eventos ── */}
                    <div className="flex-1 min-w-0 flex flex-col gap-4 mt-4 lg:mt-0">

                    {/* Header "El Pulso de hoy" */}
                    <div className="flex flex-col gap-0.5">
                        <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">El Pulso de hoy</h2>
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {filteredEvents.length} PULSES CERCA DE TI
                        </span>
                    </div>

                    {/* Banner Tendencia Ahora */}
                    <div className="p-4 sm:p-5 rounded-3xl bg-[#1d0e1f] border border-[#3b122c] flex items-center justify-between shadow-xl relative overflow-hidden">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500 shrink-0">
                                <Flame className="w-6 h-6 fill-rose-500/30 text-rose-500" />
                            </div>
                            <div className="flex flex-col">
                                <div className="flex items-center gap-1.5">
                                    <span className="text-[10px] font-black text-rose-500 uppercase tracking-wider">LIVE</span>
                                </div>
                                <span className="text-sm sm:text-base font-black text-white italic tracking-wide uppercase">TENDENCIA AHORA</span>
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest block">VIBE POPULAR</span>
                            <span className="text-sm sm:text-base font-black text-amber-500 italic">#{popularVibe || 'Foodie & Antojos'}</span>
                        </div>
                    </div>

                    {/* Feed Content — grid de 2 col en desktop */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {loading ? (
                            [1, 2, 3].map(i => (
                                <Skeleton key={`event-skel-${i}`} className="w-full h-52 rounded-[2rem]" />
                            ))
                        ) : filteredEvents.length > 0 ? (
                            filteredEvents.map(event => (
                                <div key={event.id} className="relative">
                                    <EventCard event={event} onClick={setSelectedEvent} />
                                    <button
                                        onClick={(e) => toggleFavorite(event.id, e)}
                                        className="absolute top-5 right-5 z-10 p-2.5 bg-black/40 backdrop-blur-xl rounded-full border border-white/10 hover:scale-110 active:scale-95 transition-all"
                                    >
                                        <Heart className={`w-4 h-4 transition-colors ${favorites.includes(event.id) ? 'fill-rose-500 text-rose-500' : 'text-white'}`} />
                                    </button>
                                </div>
                            ))
                        ) : (
                            <div className="flex flex-col items-center justify-center p-8 text-center bg-slate-900/60 rounded-[2rem] border border-white/5 my-2">
                                <div className="p-3 bg-amber-500/10 rounded-full mb-3">
                                    <Zap className="w-6 h-6 text-amber-400" />
                                </div>
                                <h4 className="text-sm font-black text-white mb-1">No hay eventos activos</h4>
                                <p className="text-xs text-slate-400 max-w-xs mb-4 leading-relaxed">
                                    No hay eventos para los filtros seleccionados en {(currentLocality?.name || 'Montañita')}.
                                </p>
                                <button
                                    onClick={() => {
                                        setSelectedSector(null);
                                        setActiveFilter('All');
                                        setSelectedMood(null);
                                        setSearchQuery('');
                                    }}
                                    className="px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-black font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95"
                                >
                                    Ver todos los eventos
                                </button>
                            </div>
                        )}
                    </div>
                    </div> {/* /feed-column */}
                    </div> {/* /flex-row */}
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
