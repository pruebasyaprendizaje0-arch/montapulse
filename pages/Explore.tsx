import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Sparkles, MapPin, Store, Waves, Leaf, ExternalLink, Heart, Zap, ShieldCheck, Flame, Star, Search, Filter, ChevronDown, ChevronUp, TrendingUp } from 'lucide-react';
import { MapView } from '../components/Map/MapView';
import { EventCard } from '../components/EventCard';
import { Sector, MontanitaEvent, Business, BusinessCategory, Vibe, SubscriptionPlan } from '../types';
import { LOCALITIES, LOCALITY_SECTORS, SECTOR_INFO, LOCALITY_POLYGONS } from '../constants';
import { getPlannerRecommendations, PlannerSection } from '../services/geminiService';
import { deleteBusiness, createBusiness, updateBusiness, incrementBusinessViewCount } from '../services/firestoreService';
import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { PulseFeed } from '../components/Social/PulseFeed';
import { ItineraryModal } from '../components/Modals/ItineraryModal';

interface ExploreProps {
    onEditBusiness?: (id: string) => void;
}

export const Explore: React.FC<ExploreProps> = ({
    onEditBusiness
}) => {
    const navigate = useNavigate();
    const { user, authUser, isAdmin, isSuperAdmin } = useAuthContext();
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
        eventsWithLiveCounts // Assuming this comes from useData now
    } = useData();
    const { t } = useTranslation();
    const { showConfirm } = useToast();

    // Local state for AI only (if not moved to context)
    const [aiRecData, setAiRecData] = useState<PlannerSection[] | null>(null);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [showItinerary, setShowItinerary] = useState(false);

    const handleAiAsk = async () => {
        setIsAiLoading(true);
        setAiRecData(null);
        const data = await getPlannerRecommendations(businesses, currentLocality.name);
        setAiRecData(data);
        setIsAiLoading(false);
    };

    // Map Handlers (Admin Logic moved here or passed via props? Some logic needs Auth/Admin checks which are passed)
    const handleAddBusinessOnMap = async (lat: number, lng: number) => {
        setBizForm({
            ...bizForm,
            name: 'Nuevo Punto',
            coordinates: [lat, lng],
            locality: currentLocality.name,
            sector: Sector.CENTRO,
            icon: 'palmtree',
            description: 'Punto de referencia añadido por el administrador.',
            category: BusinessCategory.RESTAURANTE
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
        let result = eventsWithLiveCounts;
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

                {/* AI Itinerary Trigger (Floating Premium Button) */}
                <div className="absolute top-20 left-6 z-40">
                    <button
                        onClick={() => setShowItinerary(true)}
                        className="group relative flex items-center gap-3 p-1 pr-6 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl hover:bg-slate-800 transition-all shadow-2xl hover:scale-105 active:scale-95"
                    >
                        <div className="w-10 h-10 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:rotate-12 transition-transform">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div className="flex flex-col items-start">
                            <span className="text-[10px] font-black text-white italic tracking-tight">PLAN MY DAY</span>
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">AI Itinerary</span>
                        </div>
                        {/* Glow effect */}
                        <div className="absolute inset-0 bg-indigo-500/10 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                </div>

                {/* Nearby Pulses Overlay - High Fidelity Mockup */}
                <div className="absolute bottom-[88px] left-0 right-0 z-40 bg-gradient-to-t from-black via-black/40 to-transparent pt-12">
                    <div className="px-6 mb-4 flex items-center justify-between">
                        <h2 className="text-xl font-black tracking-tight">Nearby Pulses</h2>
                        <button className="text-[11px] font-black text-orange-500 uppercase tracking-widest">See All</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-6">
                        {businesses.slice(0, 5).map((biz) => (
                            <div key={biz.id} className="min-w-[240px] w-[240px] h-[120px] bg-[#111111] rounded-3xl border border-white/5 p-3 flex gap-4 hover:border-orange-500/30 transition-all cursor-pointer group shadow-2xl">
                                <div className="w-24 h-full rounded-2xl overflow-hidden border border-white/10 shrink-0">
                                    <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                </div>
                                <div className="flex-1 flex flex-col justify-between py-1">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">{biz.category}</span>
                                        <h3 className="text-sm font-black truncate tracking-tight">{biz.name}</h3>
                                    </div>
                                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500">
                                        <div className="flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            <span>0.4 km</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <TrendingUp className="w-3 h-3 text-emerald-500" />
                                            <span className="text-emerald-500">120</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
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
                        onAddBusiness={handleAddBusinessOnMap}
                        onDeleteBusiness={handleDeleteBusinessByAdmin}
                        onUpdateBusiness={handleUpdateBusinessLocation}
                        onEditBusiness={onEditBusiness}
                        onUpdateSector={handleUpdateSectorGeometry}
                        businesses={businesses}
                        events={events}
                        sectorPolygons={sectorPolygons}
                        posts={posts}
                        isEditorFocus={isEditorFocus}
                        onToggleEditorFocus={() => setIsEditorFocus(!isEditorFocus)}
                        isPanelMinimized={true} // Default to minimized or hidden in this mockup style
                        onTogglePanel={() => setIsPanelMinimized(!isPanelMinimized)}
                        hideUI={true}
                        localityName={currentLocality.name}
                        mapCenter={currentLocality.coords}
                        onLocalityChange={(name) => {
                            const loc = LOCALITIES.find(l => l.name === name);
                            if (loc) setCurrentLocality(loc);
                        }}
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

                        {/* Quick Navigation Cards */}
                        <div className="grid grid-cols-3 gap-3 mb-8">
                            {journeyCards.map((card) => {
                                const Icon = card.icon === 'zap' ? Store : card.icon === 'waves' ? Waves : card.icon === 'leaf' ? Leaf : MapPin;
                                return (
                                    <div
                                        key={card.id}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (card.id === 'CENTRO') setSelectedSector(Sector.CENTRO);
                                            else if (card.id === 'LA PUNTA') setSelectedSector(Sector.LA_PUNTA);
                                            else if (card.id === 'TIGRILLO') setSelectedSector(Sector.TIGRILLO);
                                            else if (card.label === 'PLAYA') setSelectedSector(Sector.PLAYA);
                                            else if (card.label === 'MONTAÑA') setSelectedSector(Sector.MONTANA);
                                        }}
                                        className={`cursor-pointer hover:scale-105 transition-transform flex flex-col items-center gap-3 p-4 rounded-[2rem] border border-white/5 bg-slate-900/40 relative group hover:bg-white/5 ${selectedSector === (card.id === 'LA PUNTA' ? Sector.LA_PUNTA : card.id === 'TIGRILLO' ? Sector.TIGRILLO : Sector.CENTRO) ? 'ring-2 ring-sky-500' : ''}`}
                                    >
                                        <div className={`p-3 rounded-full ${card.bg}`}>
                                            <Icon className={`w-6 h-6 ${card.color}`} />
                                        </div>
                                        <span className="text-[10px] font-black uppercase text-white tracking-tighter text-center">{card.label}</span>
                                    </div>
                                );
                            })}
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

            {/* Floating Sector Filters */}
            {
                !isEditorFocus && (
                    <div className="fixed bottom-28 left-0 right-0 px-4 z-40 animate-in slide-in-from-bottom duration-500">


                        <div className="flex gap-2 overflow-x-auto no-scrollbar py-2">
                            {(LOCALITY_SECTORS[currentLocality.name] || Object.values(Sector)).map((sector) => {
                                const info = SECTOR_INFO[sector];
                                const isActive = selectedSector === sector;
                                if (!info) return null;
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
                )
            }
            <ItineraryModal
                isOpen={showItinerary}
                onClose={() => setShowItinerary(false)}
            />
        </>
    );
};
