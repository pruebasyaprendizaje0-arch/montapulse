import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, MapPin, Store, Waves, Leaf, ExternalLink, Heart, Zap, ShieldCheck, Flame, Star, Search, Filter, Layers, ChevronDown, ChevronUp, TrendingUp, Clock, Trash2, ArrowRight } from 'lucide-react';
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
import { PulseFeed } from '../components/Social/PulseFeed';
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
    const { user, authUser, isAdmin, isSuperAdmin } = useAuthContext();
    const isPremiumUser = user?.plan === SubscriptionPlan.PREMIUM;
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
    const { showConfirm, showPrompt } = useToast();

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
        let result = eventsWithLiveCounts.filter(e => e.endAt > now); // Solo eventos futuros o actuales
        if (activeFilter !== 'All') { // Changed from 'all' to 'All' to match usage
            result = result.filter(e => e.category === activeFilter);
        }
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            result = result.filter(e =>
                e.title.toLowerCase().includes(q) ||
                e.description.toLowerCase().includes(q)
            );
        }
        return result;
    }, [eventsWithLiveCounts, activeFilter, searchQuery]);

    // Eventos futuros para el mapa
    const upcomingEvents = useMemo(() => {
        const now = new Date();
        return events.filter(e => e.endAt > now);
    }, [events]);

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
            <div className="h-full relative flex flex-col bg-[#020617] overflow-hidden">
                <PulseFeed />

                {/* Search Bar & Admin Tools */}
                <div className="absolute top-6 inset-x-0 z-50 flex flex-col items-center gap-4 pointer-events-none px-6">
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
                                    <div className="absolute top-[calc(100%+12px)] left-0 w-48 bg-[#020617]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl py-2 z-[60] animate-in fade-in slide-in-from-top-2">
                                        <div className="px-3 py-1.5 text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Cambiar Zona</div>
                                        {LOCALITIES.map(loc => (
                                            <button
                                                key={loc.name}
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
                        {searchQuery.length > 1 && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-[#020617]/95 backdrop-blur-3xl border border-white/10 rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 z-[3000]">
                                <div className="p-2 max-h-[450px] overflow-y-auto no-scrollbar">
                                    <div className="space-y-1">
                                        {[...businesses, ...events]
                                            .filter(item => {
                                                const locality = 'locality' in item ? item.locality : businesses.find(b => b.id === (item as any).businessId)?.locality;
                                                const matchesLocality = (locality || 'Montañita') === currentLocality.name;
                                                const matchesSearch = (('name' in item ? item.name : item.title).toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                    (item as any).category?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                                    (item as any).sector?.toLowerCase().includes(searchQuery.toLowerCase()));
                                                return matchesLocality && matchesSearch;
                                            })
                                            .slice(0, 6)
                                            .map((item, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => {
                                                        const lat = 'location' in item ? item.location?.lat : (item as any).coordinates?.[0];
                                                        const lng = 'location' in item ? item.location?.lng : (item as any).coordinates?.[1];
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
                                    if (msg) alert("Aviso enviado a la comunidad (Simulado)");
                                }}
                                className="px-4 py-2.5 bg-amber-500/10 backdrop-blur-2xl border border-amber-500/20 rounded-2xl text-amber-500 hover:bg-amber-500/20 transition-all shadow-xl hover:scale-105"
                                title="Global Broadcast"
                            >
                                <Layers className="w-5 h-5" />
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

                <div className="flex-1 relative h-full min-h-0">
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
                        isPanelMinimized={true}
                        onTogglePanel={() => setIsPanelMinimized(!isPanelMinimized)}
                        hideUI={true}
                        localityName={currentLocality.name}
                        mapCenter={currentLocality.coords}
                        customLocalities={customLocalities}
                        onLocalityChange={(name) => {
                            const loc = LOCALITIES.find(l => l.name === name) || customLocalities.find(l => l.name === name);
                            if (loc) setCurrentLocality(loc);
                        }}
                        onAddLocality={isSuperAdmin ? async (name, coords) => {
                            await handleAddCustomLocality(name, coords, [Sector.CENTRO, Sector.PLAYA, Sector.MONTANA]);
                        } : undefined}
                        onResetFilters={() => {
                            setSelectedSector(null);
                            setActiveFilter('All');
                            setSearchQuery('');
                        }}
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

                        {/* Pulse Pass Exclusive Banner */}
                        {user?.pulsePassActive && (
                            <div className="mb-8 p-4 bg-gradient-to-r from-indigo-600/20 to-purple-600/20 rounded-3xl border border-indigo-500/30 flex items-center justify-between group cursor-default">
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                                        <Zap className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <h4 className="text-white text-sm font-black uppercase tracking-tight">{t('explore.pulsePassBenefit')}</h4>
                                        <p className="text-indigo-300 text-[10px] font-bold uppercase">{t('explore.pulsePassDesc')}</p>
                                    </div>
                                </div>
                                <ShieldCheck className="w-6 h-6 text-indigo-400 opacity-50 group-hover:opacity-100 transition-opacity" />
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
                                    <span>{selectedSector ? `${t('explore.pulseIn')} ${selectedSector}` : t('explore.title')}</span>
                                    {(selectedSector || activeFilter !== 'All' || searchQuery) && (
                                        <X className="w-5 h-5 text-rose-500 opacity-0 group-hover/title:opacity-100 transition-opacity" />
                                    )}
                                </button>
                                <span className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-0.5">{filteredEvents.length} {t('explore.subTitle')}</span>
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
                        {businesses.some(b => b.plan === SubscriptionPlan.PREMIUM) && (
                            <div className="mb-10">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                        <h3 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">{t('explore.featured')}</h3>
                                    </div>
                                </div>
                                <div className="flex gap-4 overflow-x-auto no-scrollbar -mx-6 px-6">
                                    {businesses.filter(b => b.plan === SubscriptionPlan.PREMIUM).map(business => (
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
            </div >

            {/* Quick Sector Nav - Only show in Explore */}
            {
                (isPanelMinimized || isEditorFocus) && (
                    <div className="fixed bottom-44 left-1/2 -translate-x-1/2 z-[70] animate-in fade-in slide-in-from-bottom duration-500">
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
