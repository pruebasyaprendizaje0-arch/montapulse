import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { X, Sparkles, MapPin, Store, Waves, Leaf, ExternalLink, Heart, Zap, ShieldCheck, Flame, Star, Search, Filter, Layers, ChevronDown, ChevronUp, TrendingUp, Clock, Trash2, ArrowRight, Radio } from 'lucide-react';
import { MapView } from '../components/Map/MapView';
import { EventCard } from '../components/EventCard';
import { Sector, MontanitaEvent, Business, BusinessCategory, Vibe, SubscriptionPlan } from '../types';
import { LOCALITIES, LOCALITY_SECTORS, SECTOR_INFO, LOCALITY_POLYGONS } from '../constants';
import { getPlannerRecommendations, PlannerSection, getRecommendationForUser } from '../services/geminiService';
import { deleteBusiness, createBusiness, updateBusiness, incrementBusinessViewCount } from '../services/firestoreService';
import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { ItineraryModal } from '../components/Modals/ItineraryModal';
import { AIRecommendationModal } from '../components/Modals/AIRecommendationModal';

interface ExploreProps {
    onEditBusiness?: (id: string) => void;
    userBusinessId?: string;
}

export const Explore: React.FC<ExploreProps> = ({
    onEditBusiness,
    userBusinessId
}) => {
    const navigate = useNavigate();
    const location = useLocation();
    const { user, authUser, isAdmin, isSuperAdmin } = useAuthContext();
    
    // Unified State
    const [activeTab, setActiveTab] = useState<'events' | 'directory' | 'landmarks' | null>('events');
    const [isGridView, setIsGridView] = useState(false);
    const isSpecialUser = user?.email === 'ubicameinformacion@gmail.com' || user?.role === 'admin';
    const isPremiumUser = user?.plan === SubscriptionPlan.BASIC || user?.plan === SubscriptionPlan.PREMIUM || user?.plan === SubscriptionPlan.EXPERT || isSpecialUser;
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
        // filteredEvents, // This is now calculated locally
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
        eventsWithLiveCounts, // Assuming this comes from useData now
        handlePurgeAllReferences,
        customLocalities,
        handleAddCustomLocality
    } = useData();
    const userBusinessIdResolved = userBusinessId || businesses.find(b => b.ownerId === authUser?.uid)?.id;
    const { t } = useTranslation();
    const { showToast, showConfirm, showPrompt } = useToast();

    // Local state for AI only (if not moved to context)
    const [aiRecData, setAiRecData] = useState<PlannerSection[] | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showItinerary, setShowItinerary] = useState(false);

    // Ask Anything State
    const [askRecData, setAskRecData] = useState<PlannerSection[] | null>(null);
    const [isAskLoading, setIsAskLoading] = useState(false);
    const [showAskModal, setShowAskModal] = useState(false);
    const [showLocalityMenu, setShowLocalityMenu] = useState(false);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [focusedBusinessId, setFocusedBusinessId] = useState<string | null>(null);
    const mapRef = useRef<any>(null);

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

    const handleAiAsk = async () => {
        setIsAiLoading(true);
        setAiRecData(null);
        const data = await getPlannerRecommendations(businesses, currentLocality.name);
        setAiRecData(data);
        setIsAiLoading(false);
    };

    const handleAskAnything = async (initialQuery?: string) => {
        const question = initialQuery || await showPrompt('¿Qué estás buscando hoy?', 'Ej: Un lugar tranquilo para ver el atardecer', 'Pregunta a la IA');
        if (!question) return;

        setIsAskLoading(true);
        setShowAskModal(true);
        try {
            const results = await getRecommendationForUser(events, question);
            setAskRecData(results);
        } catch (error) {
            console.error("AI Ask error:", error);
        } finally {
            setIsAskLoading(false);
        }
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

    const filteredEvents = useMemo(() => {
        const now = new Date();
        let result = eventsWithLiveCounts.filter(e => e.endAt > now && e.status !== 'deactivated'); 
        if (activeFilter !== 'All') {
            result = result.filter(e => e.category === activeFilter);
        }
        if (searchQuery) {
            const q = (searchQuery || '').toLowerCase();
            result = result.filter(e =>
                (e.title || '').toLowerCase().includes(q) ||
                (e.description || '').toLowerCase().includes(q)
            );
        }
        return result.sort((a, b) => {
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            return 0;
        });
    }, [eventsWithLiveCounts, activeFilter, searchQuery]);

    const filteredBusinesses = useMemo(() => {
        if (activeTab === 'landmarks') {
            return businesses.filter(b => b.isReference);
        }

        let result = businesses.filter(b => !b.isReference);

        if (activeTab === 'directory') {
            if (activeFilter !== 'All') {
                result = result.filter(b => b.category === activeFilter);
            }
            if (selectedSector) {
                result = result.filter(b => b.sector === selectedSector);
            }
        }

        if (activeTab === 'events') {
            if (selectedSector) {
                result = result.filter(b => b.sector === selectedSector);
            }
        }

        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(b => 
                (b.name || '').toLowerCase().includes(q) || 
                (b.description || '').toLowerCase().includes(q) ||
                (b.category || '').toLowerCase().includes(q)
            );
        }
        
        return result.sort((a, b) => {
            const planOrder = { [SubscriptionPlan.EXPERT]: 0, [SubscriptionPlan.PREMIUM]: 1, [SubscriptionPlan.BASIC]: 2, [SubscriptionPlan.FREE]: 3 };
            return (planOrder[a.plan] ?? 4) - (planOrder[b.plan] ?? 4);
        });
    }, [businesses, activeFilter, searchQuery, selectedMood, selectedSector, activeTab]);

    // Eventos futuros para el mapa
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return eventsWithLiveCounts.filter(e => e.endAt > now && e.status !== 'deactivated');
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
                            <div className="absolute top-full left-0 right-0 mt-3 bg-[#020617]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 z-[3000]">
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
                                                            incrementBusinessViewCount(item.id);
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

                                        <div className="px-2 pt-2 border-t border-white/5">
                                            <button 
                                                onClick={() => handleAskAnything(searchQuery)}
                                                className="w-full p-3.5 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-between group/ai transition-all hover:bg-sky-500/20"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-sky-500 rounded-lg shadow-lg shadow-sky-500/20">
                                                        <Sparkles className="w-3.5 h-3.5 text-white" />
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black text-white uppercase tracking-widest">Pulse IA</p>
                                                        <p className="text-[9px] text-sky-400 font-bold">Consultar sobre "{searchQuery}"</p>
                                                    </div>
                                                </div>
                                                <ArrowRight className="w-4 h-4 text-sky-500 group-hover/ai:translate-x-1 transition-transform" />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Quick Tools Bar */}
                    <div className="flex items-center gap-2 pointer-events-auto">
                        <button
                            onClick={() => handleAskAnything()}
                            className="px-6 py-2.5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-2.5 hover:bg-slate-900 transition-all shadow-xl hover:scale-105 active:scale-95 group"
                        >
                            <div className="relative">
                                <Sparkles className="w-4 h-4 text-sky-400 fill-sky-400 font-black animate-pulse" />
                                <div className="absolute inset-0 bg-sky-400/20 blur-md rounded-full" />
                            </div>
                            <span className="text-[10px] font-black text-white italic tracking-tighter uppercase tracking-widest">IA Chat</span>
                        </button>

                        <button
                            onClick={() => setShowItinerary(true)}
                            className="px-6 py-2.5 bg-black/60 backdrop-blur-2xl border border-white/10 rounded-2xl flex items-center gap-2.5 hover:bg-slate-900 transition-all shadow-xl hover:scale-105 active:scale-95 group"
                        >
                            <div className="relative">
                                <Zap className="w-4 h-4 text-amber-500 font-black" />
                                <div className="absolute inset-0 bg-amber-500/10 blur-sm rounded-full" />
                            </div>
                            <span className="text-[10px] font-black text-white italic tracking-tighter uppercase tracking-widest">24h Planner</span>
                        </button>

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
                    <MapView
                        onBusinessSelect={(b) => {
                            incrementBusinessViewCount(b.id);
                            setPublicProfileId(b.id);
                            setPublicProfileType('business');
                            setShowPublicProfile(true);
                        }}
                        selectedSector={selectedSector}
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        activeFilter={activeFilter}
                        onFilterChange={setActiveFilter}
                        isAdmin={isAdmin}
                        isSuperAdmin={isSuperAdmin}
                        isPremiumUser={isPremiumUser}
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
                        localityName={currentLocality.name}
                        mapCenter={currentLocality.coords}
                        customLocalities={customLocalities}
                        onLocalityChange={(name) => {
                            const loc = LOCALITIES.find(l => l.name === name) || customLocalities.find(l => l.name === name);
                            if (loc) setCurrentLocality(loc);
                        }}
                        onAddLocality={isSuperAdmin ? async (name, coords, hasBeach) => {
                            await handleAddCustomLocality(name, coords, hasBeach);
                        } : undefined}
                        onResetFilters={() => {
                            setSelectedSector(null);
                            setActiveFilter('All');
                            setSearchQuery('');
                        }}
                        activeTab={activeTab}
                        focusedBusinessId={focusedBusinessId}
                    />
                </div>

                {/* Sliding Panel - Hidden in Editor Focus mode */}
                {!isEditorFocus && (
                    <div
                        onClick={() => isPanelMinimized && setIsPanelMinimized(false)}
                        className={`bg-[#0f172a]/90 backdrop-blur-3xl lg:backdrop-blur-none border-t lg:border-t-0 lg:border-l border-white/5 px-6 pt-6 transition-all duration-500 ease-in-out ${isPanelMinimized ? 'max-[1023px]:max-h-[40px] max-[1023px]:pb-0 overflow-hidden cursor-pointer hover:bg-[#0f172a] lg:!w-[450px]' : (isGridView ? 'lg:w-[85vw] pb-32 overflow-y-auto w-full h-[85vh] fixed lg:absolute bottom-0 right-0' : 'max-[1023px]:max-h-[55vh] pb-32 overflow-y-auto lg:w-[450px]')} lg:max-h-full lg:h-full lg:pb-10 rounded-t-[3.5rem] lg:rounded-none -mt-10 lg:mt-0 z-20 shadow-[0_-20px_50px_rgba(0,0,0,0.5)] lg:shadow-none no-scrollbar relative flex flex-col`}
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
                                onClick={() => setActiveTab(activeTab === 'events' ? null : 'events')}
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
                            <button
                                onClick={() => setActiveTab(activeTab === 'landmarks' ? null : 'landmarks')}
                                className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-[1.6rem] transition-all duration-500 relative overflow-hidden group ${activeTab === 'landmarks' ? 'text-white shadow-2xl shadow-emerald-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {activeTab === 'landmarks' && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-emerald-600 to-teal-600 animate-in fade-in zoom-in duration-500" />
                                )}
                                <div className="relative flex items-center gap-2.5">
                                    <MapPin className={`w-4 h-4 ${activeTab === 'landmarks' ? 'fill-white animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Puntos</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab(activeTab === 'directory' ? null : 'directory')}
                                className={`flex-1 flex items-center justify-center gap-3 py-3.5 rounded-[1.6rem] transition-all duration-500 relative overflow-hidden group ${activeTab === 'directory' ? 'text-white shadow-2xl shadow-amber-500/20' : 'text-slate-500 hover:text-slate-300'}`}
                            >
                                {activeTab === 'directory' && (
                                    <div className="absolute inset-0 bg-gradient-to-tr from-amber-600 to-orange-600 animate-in fade-in zoom-in duration-500" />
                                )}
                                <div className="relative flex items-center gap-2.5">
                                    <Store className={`w-4 h-4 ${activeTab === 'directory' ? 'fill-white animate-pulse' : 'group-hover:scale-110 transition-transform'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">{t('explore.directory')}</span>
                                </div>
                            </button>
                        </div>

                        {/* Pulse Pass Exclusive Banner */}
                        {user?.pulsePassActive && (
                            <div className="mb-8 p-3 lg:p-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-2xl lg:rounded-3xl border border-indigo-500/30 flex items-center justify-between group cursor-default">
                                <div className="flex items-center gap-3 lg:gap-4">
                                    <div className="w-8 h-8 lg:w-10 lg:h-10 bg-indigo-500 rounded-xl lg:rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <Zap className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-[10px] lg:text-sm font-black uppercase tracking-tight">{t('explore.pulsePassBenefit')}</h4>
                                        <p className="text-indigo-300 text-[8px] lg:text-[10px] font-bold uppercase">{t('explore.pulsePassDesc')}</p>
                                    </div>
                                </div>
                                <ShieldCheck className="w-5 h-5 lg:w-6 lg:h-6 text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity" />
                            </div>
                        )}

                        {/* Flash Offers Carousel */}
                        {filteredEvents.some(e => e.isFlashOffer) && (
                            <div className="mb-8">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-rose-500 rounded-full animate-pulse" />
                                        <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest italic">{t('explore.flashOffers')}</h3>
                                    </div>
                                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{t('explore.flashHeader')}</span>
                                </div>
                                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6">
                                    {filteredEvents.filter(e => e.isFlashOffer).map(event => (
                                        <div key={event.id} className="min-w-[280px] w-[280px] shrink-0">
                                            <EventCard event={event} onClick={setSelectedEvent} />
                                        </div>
                                    ))}
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
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setIsPanelMinimized(true);
                                    }}
                                    className="bg-slate-800/50 text-slate-400 hover:bg-slate-800 hover:text-white px-4 py-2.5 rounded-2xl border border-white/5 transition-all flex items-center gap-2 lg:hidden"
                                >
                                    <MapPin className="w-4 h-4" />
                                    <span className="text-[11px] font-black uppercase tracking-wider">{t('explore.seeMap')}</span>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleAiAsk();
                                    }}
                                    disabled={isAiLoading}
                                    className="bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 px-5 py-2.5 rounded-2xl border border-sky-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Sparkles className={`w-4 h-4 ${isAiLoading ? 'animate-spin' : ''}`} />
                                    <span className="text-[11px] font-black uppercase tracking-wider">{t('explore.aiPlanner')}</span>
                                </button>
                            </div>
                        </div>

                        {/* Mood Selector: How do you feel? */}
                        <div className="mb-8">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 px-1">{t('explore.moodPrompt')}</p>
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2">
                                {Object.values(Vibe).map((vibe) => (
                                    <button
                                        key={vibe}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedMood(selectedMood === vibe ? null : vibe);
                                        }}
                                        className={`px-6 py-3 rounded-2xl border transition-all flex items-center gap-2 shrink-0 ${selectedMood === vibe
                                            ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-500/20 scale-105'
                                            : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800 hover:text-white'
                                            }`}
                                    >
                                        <span className="text-sm font-bold">{vibe}</span>
                                        {selectedMood === vibe && <Sparkles className="w-3 h-3 animate-pulse" />}
                                    </button>
                                ))}
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

                        {/* Featured Businesses Carousel */}
                        {businesses.some(b => b.plan === SubscriptionPlan.EXPERT) && (
                            <div className="mb-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{t('explore.featured')}</h3>
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6">
                                    {businesses.filter(b => b.plan === SubscriptionPlan.EXPERT).map(business => (
                                        <div
                                            key={`featured-${business.id}`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setPublicProfileId(business.id);
                                                setPublicProfileType('business');
                                                setShowPublicProfile(true);
                                                incrementBusinessViewCount(business.id);
                                            }}
                                            className="min-w-[130px] w-[130px] shrink-0 group cursor-pointer"
                                        >
                                            <div className="relative aspect-square rounded-[2rem] overflow-hidden border-2 border-amber-500/20 group-hover:border-amber-500 transition-all shadow-xl shadow-black/20">
                                                <img src={business.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={business.name} loading="lazy" />
                                                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent group-hover:from-black/70 transition-colors" />
                                                <div className="absolute inset-0 border border-white/10 rounded-[2rem] pointer-events-none" />
                                                <div className="absolute bottom-3 left-3 right-3">
                                                    <p className="text-[10px] font-black text-white uppercase tracking-tight truncate group-hover:text-amber-400 transition-colors">{business.name}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                                        <span className="text-[8px] font-bold text-slate-400 uppercase truncate">{business.sector}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
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
                                    {filteredEvents.filter(e => e.vibe === user.preferredVibe).map(event => (
                                        <div key={`foryou-${event.id}`} className="min-w-[280px] w-[280px] shrink-0 px-2 transform transition-all hover:scale-[1.02]">
                                            <EventCard event={event} onClick={setSelectedEvent} />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="space-y-6">
                            {activeTab === 'events' ? (
                                filteredEvents.map(event => (
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
                            ) : (
                                <div className={`${isGridView ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6' : 'flex flex-col gap-6'} pb-10`}>
                                    {filteredBusinesses.map(business => (
                                        <div
                                            key={business.id}
                                            onClick={() => {
                                                incrementBusinessViewCount(business.id);
                                                setPublicProfileId(business.id);
                                                setPublicProfileType('business');
                                                setShowPublicProfile(true);
                                            }}
                                            className={`relative group cursor-pointer transition-all duration-700 hover:-translate-y-2 ${isGridView ? 'h-[300px]' : ''}`}
                                        >
                                            <div className={`absolute inset-0 bg-gradient-to-br transition-all duration-700 opacity-10 blur-3xl group-hover:opacity-40 rounded-[3rem] ${
                                                business.plan === SubscriptionPlan.EXPERT ? 'from-amber-400 via-orange-500 to-rose-600' :
                                                business.plan === SubscriptionPlan.PREMIUM ? 'from-sky-400 via-indigo-500 to-purple-600' :
                                                'from-slate-400 to-slate-600'
                                            }`} />
                                            
                                            <div className={`h-full relative overflow-hidden rounded-[2.5rem] border backdrop-blur-3xl transition-all duration-500 flex flex-col ${
                                                business.plan === SubscriptionPlan.EXPERT ? 'glass-expert expert-glow' :
                                                business.plan === SubscriptionPlan.PREMIUM ? 'glass-premium premium-glow' :
                                                'bg-[#0f172a]/40 border-white/5'
                                            }`}>
                                                <div className={`${isGridView ? 'h-32' : 'h-40'} relative overflow-hidden group-hover:h-32 transition-all duration-700`}>
                                                    <img src={business.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-1000" alt={business.name} />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f172a] via-transparent to-transparent opacity-80" />
                                                    {business.plan !== SubscriptionPlan.FREE && (
                                                        <div className="absolute top-4 right-4 animate-in zoom-in duration-500">
                                                            <div className={`px-4 py-1.5 rounded-full border backdrop-blur-2xl flex items-center gap-2.5 ${
                                                                business.plan === SubscriptionPlan.EXPERT ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-sky-500/20 border-sky-500/30 text-sky-400'
                                                            }`}>
                                                                <Star className={`w-3.5 h-3.5 ${business.plan === SubscriptionPlan.EXPERT ? 'fill-amber-400' : 'fill-sky-400'}`} />
                                                                <span className="text-[10px] font-black uppercase tracking-widest italic">{business.plan}</span>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="p-6 flex flex-col flex-1 justify-between gap-4">
                                                    <div>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em]">{business.category}</span>
                                                            <div className="flex items-center gap-1">
                                                                <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                                                                <span className="text-[10px] font-black text-white italic">{(business as any).rating || '5.0'}</span>
                                                            </div>
                                                        </div>
                                                        <h3 className={`text-xl font-black uppercase tracking-tight transition-colors mb-2 ${
                                                            business.plan === SubscriptionPlan.EXPERT ? 'text-pulsar-expert' :
                                                            business.plan === SubscriptionPlan.PREMIUM ? 'text-pulsar-premium' :
                                                            'text-white grow-hover:text-sky-400'
                                                        }`}>
                                                            {business.name}
                                                        </h3>
                                                        <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{business.description}</p>
                                                        {business.services && business.services.length > 0 && (
                                                            <div className="flex flex-wrap gap-1 mt-3">
                                                                {business.services.slice(0, 3).map((service, idx) => (
                                                                    <span key={idx} className="px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 rounded-md text-[9px] font-bold text-sky-400 uppercase">
                                                                        {service}
                                                                    </span>
                                                                ))}
                                                                {business.services.length > 3 && (
                                                                    <span className="text-[9px] font-bold text-slate-500 self-center ml-1">
                                                                        +{business.services.length - 3} more
                                                                    </span>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
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
                                                                title="WhatsApp"
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
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div >

            {/* Quick Sector Nav - Only show in Explore */}
            {
                (isPanelMinimized || isEditorFocus) && (
                    <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-bottom duration-500">
                        <button
                            onClick={() => {
                                setSelectedSector(null);
                                setActiveFilter('All');
                                setSearchQuery('');
                                setIsPanelMinimized(false);
                                setIsEditorFocus(false);
                            }}
                            className="flex items-center gap-2.5 px-6 py-3.5 bg-rose-500 hover:bg-rose-400 active:scale-95 text-white font-black text-sm uppercase tracking-widest rounded-full shadow-2xl shadow-rose-500/40 transition-all border border-rose-400/30"
                        >
                            <span className="animate-pulse w-2 h-2 rounded-full bg-white inline-block" />
                            Pulse of Today
                            <span className="text-base">⚡</span>
                        </button>
                    </div>
                )
            }
            <ItineraryModal
                isOpen={showItinerary}
                onClose={() => setShowItinerary(false)}
            />
        </>
    );
};


