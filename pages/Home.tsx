import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    Calendar, Clock, MapPin, Store, Utensils, Bed, Waves, 
    Bus, HeartPulse, Sparkles, ChevronRight, Search, Compass, 
    ShieldCheck, Star, Navigation, ArrowRight, Heart
} from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuthContext } from '../context/AuthContext';
import { EventCard } from '../components/EventCard';
import { MontanitaEvent, Business, BusinessCategory, Sector, SubscriptionPlan, MapEntryType } from '../types';
import { getEcuadorDate, isBusinessOpen, isEventPublicAndActive } from '../utils/timeUtils';
import { PageLoader } from '../components/common/PageLoader';

const getDistanceKm = (coords1: [number, number], coords2: [number, number]): number => {
    const [lat1, lon1] = coords1;
    const [lat2, lon2] = coords2;
    const R = 6371; // Radio de la Tierra en km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
};

export const Home: React.FC = () => {
    const navigate = useNavigate();
    const { 
        eventsWithLiveCounts, 
        businesses, 
        currentLocality, 
        setSelectedEvent, 
        setShowPublicProfile, 
        setPublicProfileId, 
        setPublicProfileType,
        favorites,
        toggleFavorite,
        loading
    } = useData();
    const { user } = useAuthContext();

    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [locationDenied, setLocationDenied] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Request geolocation
    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    setUserLocation([pos.coords.latitude, pos.coords.longitude]);
                    setLocationDenied(false);
                },
                (err) => {
                    setLocationDenied(true);
                },
                { enableHighAccuracy: false, timeout: 5000 }
            );
        } else {
            setLocationDenied(true);
        }
    }, []);

    // Filter valid non-generic businesses in current locality
    const validBusinesses = useMemo(() => {
        const normLoc = (currentLocality?.name || 'Montañita').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        return (businesses || []).filter((b: Business) => {
            // Must have a valid name
            if (!b.name || typeof b.name !== 'string' || b.name.trim() === '' || b.name === 'undefined') return false;
            // Exclude generic reference points
            if (b.isReference || b.category === BusinessCategory.REFERENCIA || b.mapType === MapEntryType.LANDMARK || b.mapType === MapEntryType.SECTOR) {
                return false;
            }
            // Match locality
            const bLoc = (b.locality || 'Montañita').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return bLoc === normLoc || bLoc.includes(normLoc) || normLoc.includes(bLoc);
        });
    }, [businesses, currentLocality]);

    // 1. "Eventos confirmados hoy" & Fallback "Próximos eventos confirmados"
    const { todayEvents, upcomingEvents } = useMemo(() => {
        const ecuadorNow = getEcuadorDate();
        const startOfToday = new Date(ecuadorNow.getFullYear(), ecuadorNow.getMonth(), ecuadorNow.getDate());
        const endOfToday = new Date(ecuadorNow.getFullYear(), ecuadorNow.getMonth(), ecuadorNow.getDate(), 23, 59, 59);

        const normLoc = (currentLocality?.name || 'Montañita').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

        const validEvents = (eventsWithLiveCounts || []).filter((e: MontanitaEvent) => {
            if (!isEventPublicAndActive(e)) return false;
            
            // Match locality if specified
            const biz = businesses.find(b => b.id === e.businessId);
            const eventLoc = (e.locality || biz?.locality || 'Montañita').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
            return eventLoc === normLoc || eventLoc.includes(normLoc) || normLoc.includes(eventLoc);
        });

        const today: MontanitaEvent[] = [];
        const upcoming: MontanitaEvent[] = [];

        validEvents.forEach(e => {
            const start = new Date(e.startAt);
            const end = e.endAt ? new Date(e.endAt) : new Date(start.getTime() + 4 * 3600000);
            
            // Is it happening today or currently ongoing?
            if ((start >= startOfToday && start <= endOfToday) || (start <= ecuadorNow && end >= ecuadorNow)) {
                today.push(e);
            } else if (start > endOfToday) {
                upcoming.push(e);
            }
        });

        // Sort today events by start time
        today.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
        // Sort upcoming events chronologically
        upcoming.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

        return { todayEvents: today, upcomingEvents: upcoming.slice(0, 6) };
    }, [eventsWithLiveCounts, businesses, currentLocality]);

    // 2. "Abierto ahora"
    const { openBusinesses, fallbackBusinesses } = useMemo(() => {
        const openList: Business[] = [];
        const fallbackList: Business[] = [];

        validBusinesses.forEach(b => {
            const status = isBusinessOpen(b.openingHours);
            if (status.isOpen) {
                openList.push(b);
            } else {
                fallbackList.push(b);
            }
        });

        // Sort open businesses by plan hierarchy
        const planWeight = (plan?: string) => {
            if (plan === SubscriptionPlan.EXPERT) return 4;
            if (plan === SubscriptionPlan.ELITE) return 3;
            if (plan === SubscriptionPlan.PRO) return 2;
            return 1;
        };

        openList.sort((a, b) => planWeight(b.plan) - planWeight(a.plan));
        fallbackList.sort((a, b) => planWeight(b.plan) - planWeight(a.plan));

        return { 
            openBusinesses: openList, 
            fallbackBusinesses: fallbackList.slice(0, 6) 
        };
    }, [validBusinesses]);

    // 3. "Cerca de ti" (or local businesses if no geolocation)
    const nearbyBusinesses = useMemo(() => {
        if (userLocation) {
            return [...validBusinesses]
                .map(b => ({
                    business: b,
                    distance: b.coordinates ? getDistanceKm(userLocation, b.coordinates) : 9999
                }))
                .filter(item => item.distance < 20) // Within 20km
                .sort((a, b) => a.distance - b.distance)
                .slice(0, 8);
        }
        // Fallback: top businesses in locality
        return validBusinesses.slice(0, 8).map(b => ({
            business: b,
            distance: null
        }));
    }, [validBusinesses, userLocation]);

    // 4. "Destacados verificados"
    const verifiedBusinesses = useMemo(() => {
        return validBusinesses
            .filter(b => b.isVerified || b.plan === SubscriptionPlan.EXPERT || b.plan === SubscriptionPlan.ELITE || b.plan === SubscriptionPlan.PRO)
            .sort((a, b) => {
                if (a.isVerified && !b.isVerified) return -1;
                if (!a.isVerified && b.isVerified) return 1;
                return 0;
            })
            .slice(0, 8);
    }, [validBusinesses]);

    const handleCategoryClick = (categoryName: string) => {
        navigate(`/info?category=${encodeURIComponent(categoryName)}`);
    };

    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            navigate(`/info?search=${encodeURIComponent(searchQuery.trim())}`);
        } else {
            navigate('/info');
        }
    };

    if (loading) {
        return <PageLoader message="Cargando las mejores opciones..." />;
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white pb-28 select-text">
            {/* ─── Hero Header con Buscador Rápido ─── */}
            <div className="px-5 pt-6 pb-6 bg-gradient-to-b from-slate-900 via-slate-900/80 to-slate-950 border-b border-white/5">
                <div className="max-w-5xl mx-auto">
                    <div className="flex items-center justify-between gap-3 mb-4">
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.25em] text-orange-500">
                                Guía en Vivo • {currentLocality.name}
                            </span>
                            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight mt-0.5">
                                ¿Qué buscas hoy?
                            </h1>
                        </div>
                        <button 
                            onClick={() => navigate('/info')}
                            className="px-3.5 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-xs font-bold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 shrink-0"
                            aria-label="Abrir Directorio Completo"
                        >
                            <Compass className="w-4 h-4 text-orange-400" />
                            <span className="hidden sm:inline">Directorio</span>
                        </button>
                    </div>

                    {/* Buscador Rápido */}
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar comida, hospedaje, surf, taxis..."
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-24 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/40 transition-all"
                            aria-label="Buscar actividades o negocios"
                        />
                        <button
                            type="submit"
                            className="absolute right-2 top-1/2 -translate-y-1/2 px-3.5 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-orange-500/20"
                        >
                            Buscar
                        </button>
                    </form>
                </div>
            </div>

            <div className="max-w-5xl mx-auto px-5 space-y-10 mt-6">

                {/* ─── 1. EVENTOS CONFIRMADOS HOY ─── */}
                <section aria-labelledby="section-events-today">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-orange-500 rounded-full animate-pulse shadow-[0_0_10px_#f97316]" />
                            <h2 id="section-events-today" className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                                {todayEvents.length > 0 ? 'Eventos Confirmados Hoy' : 'Próximos Eventos Confirmados'}
                            </h2>
                        </div>
                        <button
                            onClick={() => navigate('/calendar')}
                            className="text-xs font-bold text-orange-400 hover:text-orange-300 flex items-center gap-1 transition-colors"
                        >
                            <span>Ver Agenda</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {todayEvents.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {todayEvents.map(event => (
                                <EventCard
                                    key={event.id}
                                    event={event}
                                    onClick={setSelectedEvent}
                                    onRsvp={() => {}}
                                    isRsvp={!!favorites.includes(event.id)}
                                />
                            ))}
                        </div>
                    ) : upcomingEvents.length > 0 ? (
                        <div>
                            <div className="p-3 mb-4 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-xs font-semibold text-orange-300 flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-orange-400 shrink-0" />
                                <span>No hay eventos registrados para hoy en {currentLocality.name}. Estos son los próximos confirmados:</span>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {upcomingEvents.map(event => (
                                    <EventCard
                                        key={event.id}
                                        event={event}
                                        onClick={setSelectedEvent}
                                        onRsvp={() => {}}
                                        isRsvp={!!favorites.includes(event.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 rounded-[2rem] bg-slate-900/60 border border-white/5 text-center flex flex-col items-center gap-3">
                            <Calendar className="w-8 h-8 text-slate-600" />
                            <p className="text-sm font-bold text-slate-400">No hay eventos próximos en {currentLocality.name}.</p>
                            <button
                                onClick={() => navigate('/calendar')}
                                className="px-5 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs font-black uppercase tracking-wider text-slate-200 transition-all"
                            >
                                Explorar Calendario Completo
                            </button>
                        </div>
                    )}
                </section>

                {/* ─── 2. ABIERTO AHORA ─── */}
                <section aria-labelledby="section-open-now">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-ping" />
                            <h2 id="section-open-now" className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                                {openBusinesses.length > 0 ? 'Abierto Ahora' : 'Lugares Recomendados'}
                            </h2>
                        </div>
                        <button
                            onClick={() => navigate('/info')}
                            className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 transition-colors"
                        >
                            <span>Ver Todos</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    {openBusinesses.length > 0 ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                            {openBusinesses.slice(0, 6).map(biz => (
                                <div
                                    key={biz.id}
                                    onClick={() => {
                                        setPublicProfileId(biz.id);
                                        setPublicProfileType('business');
                                        setShowPublicProfile(true);
                                    }}
                                    className="bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-emerald-500/40 rounded-3xl p-4 transition-all cursor-pointer group shadow-lg flex flex-col"
                                >
                                    <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden mb-3 relative bg-slate-800">
                                        <img 
                                            src={biz.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=400'} 
                                            alt={biz.name}
                                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                            loading="lazy"
                                            onError={(e) => {
                                                (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=400';
                                            }}
                                        />
                                        <div className="absolute top-2 left-2 px-2.5 py-1 bg-emerald-500/90 text-white text-[9px] font-black uppercase tracking-wider rounded-lg shadow-md flex items-center gap-1">
                                            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                                            Abierto
                                        </div>
                                        {biz.sector && (
                                            <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/60 backdrop-blur-sm text-white text-[9px] font-bold uppercase rounded-md">
                                                {biz.sector}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider truncate">{biz.category}</span>
                                        {biz.rating && (
                                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-0.5 shrink-0">
                                                ⭐ {biz.rating}
                                            </span>
                                        )}
                                    </div>
                                    <h3 className="text-base font-black text-white leading-tight uppercase truncate">{biz.name}</h3>
                                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed flex-1">{biz.description}</p>
                                </div>
                            ))}
                        </div>
                    ) : fallbackBusinesses.length > 0 ? (
                        <div>
                            <div className="p-3 mb-4 rounded-2xl bg-slate-900 border border-white/10 text-xs font-semibold text-slate-300 flex items-center gap-2">
                                <Clock className="w-4 h-4 text-amber-400 shrink-0" />
                                <span>No se detectaron negocios con horario abierto en este momento. Te recomendamos estos lugares destacados:</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                {fallbackBusinesses.map(biz => (
                                    <div
                                        key={biz.id}
                                        onClick={() => {
                                            setPublicProfileId(biz.id);
                                            setPublicProfileType('business');
                                            setShowPublicProfile(true);
                                        }}
                                        className="bg-slate-900/80 hover:bg-slate-900 border border-white/10 hover:border-white/20 rounded-3xl p-4 transition-all cursor-pointer group shadow-lg flex flex-col"
                                    >
                                        <div className="aspect-[16/9] w-full rounded-2xl overflow-hidden mb-3 relative bg-slate-800">
                                            <img 
                                                src={biz.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=400'} 
                                                alt={biz.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=400';
                                                }}
                                            />
                                        </div>
                                        <span className="text-[10px] font-black text-orange-400 uppercase tracking-wider truncate mb-1">{biz.category}</span>
                                        <h3 className="text-base font-black text-white leading-tight uppercase truncate">{biz.name}</h3>
                                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed flex-1">{biz.description}</p>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : null}
                </section>

                {/* ─── 3. CERCA DE TI ─── */}
                <section aria-labelledby="section-nearby">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <MapPin className="w-5 h-5 text-sky-400" />
                            <h2 id="section-nearby" className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                                {userLocation ? 'Cerca de ti' : `En ${currentLocality.name}`}
                            </h2>
                        </div>
                        <button
                            onClick={() => navigate('/explore')}
                            className="text-xs font-bold text-sky-400 hover:text-sky-300 flex items-center gap-1 transition-colors"
                        >
                            <span>Ver en Mapa</span>
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
                        {nearbyBusinesses.map(({ business: biz, distance }) => (
                            <div
                                key={biz.id}
                                onClick={() => {
                                    setPublicProfileId(biz.id);
                                    setPublicProfileType('business');
                                    setShowPublicProfile(true);
                                }}
                                className="p-3.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-sky-500/30 rounded-2xl transition-all cursor-pointer flex flex-col justify-between"
                            >
                                <div>
                                    <div className="flex items-center justify-between gap-1 mb-1.5">
                                        <span className="text-[9px] font-black uppercase text-sky-400 tracking-wider truncate">{biz.category}</span>
                                        {distance !== null && (
                                            <span className="text-[9px] font-bold text-slate-400 shrink-0">
                                                {distance < 1 ? `A ${Math.round(distance * 1000)} m` : `A ${distance.toFixed(1)} km`}
                                            </span>
                                        )}
                                    </div>
                                    <h4 className="text-sm font-black text-white uppercase truncate">{biz.name}</h4>
                                    <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{biz.description}</p>
                                </div>
                                <div className="mt-3 pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-bold text-slate-400">
                                    <span>{biz.locality || currentLocality.name}</span>
                                    <span className="text-sky-400 flex items-center gap-0.5">Ver <ChevronRight className="w-3 h-3" /></span>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* ─── 4. DESTACADOS VERIFICADOS ─── */}
                {verifiedBusinesses.length > 0 && (
                    <section aria-labelledby="section-verified">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-amber-400" />
                                <h2 id="section-verified" className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                                    Destacados Verificados
                                </h2>
                            </div>
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                                Calidad Garantizada
                            </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                            {verifiedBusinesses.map(biz => (
                                <div
                                    key={biz.id}
                                    onClick={() => {
                                        setPublicProfileId(biz.id);
                                        setPublicProfileType('business');
                                        setShowPublicProfile(true);
                                    }}
                                    className="p-4 bg-gradient-to-b from-amber-500/10 to-slate-900/60 border border-amber-500/20 hover:border-amber-500/40 rounded-3xl transition-all cursor-pointer group flex flex-col justify-between"
                                >
                                    <div>
                                        <div className="aspect-[16/9] w-full rounded-xl overflow-hidden mb-3 relative bg-slate-800">
                                            <img
                                                src={biz.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=300'}
                                                alt={biz.name}
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                                loading="lazy"
                                                onError={(e) => {
                                                    (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=300';
                                                }}
                                            />
                                            <span className="absolute top-2 right-2 px-2 py-0.5 bg-amber-500 text-black text-[9px] font-black uppercase rounded-md shadow-md flex items-center gap-1">
                                                <ShieldCheck className="w-3 h-3" /> Verificado
                                            </span>
                                        </div>
                                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-wider block mb-1">{biz.category}</span>
                                        <h4 className="text-sm font-black text-white uppercase truncate">{biz.name}</h4>
                                        <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">{biz.description}</p>
                                    </div>
                                    <div className="mt-3 pt-2.5 border-t border-amber-500/15 flex items-center justify-between text-xs font-bold text-amber-400">
                                        <span>Conocer más</span>
                                        <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {/* ─── 5. CATEGORÍAS RÁPIDAS ─── */}
                <section aria-labelledby="section-categories">
                    <div className="mb-4">
                        <h2 id="section-categories" className="text-lg sm:text-xl font-black text-white tracking-tight uppercase">
                            Categorías Rápidas
                        </h2>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mt-0.5">
                            Explora por tipo de actividad o servicio
                        </p>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                        {/* Comer */}
                        <button
                            onClick={() => handleCategoryClick('Restaurante')}
                            className="p-4 rounded-2xl bg-white/5 hover:bg-orange-500/15 border border-white/10 hover:border-orange-500/30 text-left transition-all group flex flex-col justify-between h-28"
                        >
                            <div className="w-10 h-10 rounded-xl bg-orange-500/10 group-hover:bg-orange-500/20 text-orange-400 flex items-center justify-center transition-colors">
                                <Utensils className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white group-hover:text-orange-400 transition-colors uppercase block">Comer</span>
                                <span className="text-[10px] font-bold text-slate-500">Restaurantes y Cafés</span>
                            </div>
                        </button>

                        {/* Dormir */}
                        <button
                            onClick={() => handleCategoryClick('Hospedaje')}
                            className="p-4 rounded-2xl bg-white/5 hover:bg-amber-500/15 border border-white/10 hover:border-amber-500/30 text-left transition-all group flex flex-col justify-between h-28"
                        >
                            <div className="w-10 h-10 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 text-amber-400 flex items-center justify-center transition-colors">
                                <Bed className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white group-hover:text-amber-400 transition-colors uppercase block">Dormir</span>
                                <span className="text-[10px] font-bold text-slate-500">Hoteles y Hostales</span>
                            </div>
                        </button>

                        {/* Surf */}
                        <button
                            onClick={() => handleCategoryClick('Escuela de Surf')}
                            className="p-4 rounded-2xl bg-white/5 hover:bg-sky-500/15 border border-white/10 hover:border-sky-500/30 text-left transition-all group flex flex-col justify-between h-28"
                        >
                            <div className="w-10 h-10 rounded-xl bg-sky-500/10 group-hover:bg-sky-500/20 text-sky-400 flex items-center justify-center transition-colors">
                                <Waves className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white group-hover:text-sky-400 transition-colors uppercase block">Surf</span>
                                <span className="text-[10px] font-bold text-slate-500">Escuelas y Olas</span>
                            </div>
                        </button>

                        {/* Transporte */}
                        <button
                            onClick={() => handleCategoryClick('Transporte / Taxi')}
                            className="p-4 rounded-2xl bg-white/5 hover:bg-emerald-500/15 border border-white/10 hover:border-emerald-500/30 text-left transition-all group flex flex-col justify-between h-28"
                        >
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 text-emerald-400 flex items-center justify-center transition-colors">
                                <Bus className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white group-hover:text-emerald-400 transition-colors uppercase block">Transporte</span>
                                <span className="text-[10px] font-bold text-slate-500">Taxis y Buses</span>
                            </div>
                        </button>

                        {/* Salud */}
                        <button
                            onClick={() => handleCategoryClick('Hospital / Salud')}
                            className="p-4 rounded-2xl bg-white/5 hover:bg-rose-500/15 border border-white/10 hover:border-rose-500/30 text-left transition-all group flex flex-col justify-between h-28"
                        >
                            <div className="w-10 h-10 rounded-xl bg-rose-500/10 group-hover:bg-rose-500/20 text-rose-400 flex items-center justify-center transition-colors">
                                <HeartPulse className="w-5 h-5" />
                            </div>
                            <div>
                                <span className="text-sm font-black text-white group-hover:text-rose-400 transition-colors uppercase block">Salud</span>
                                <span className="text-[10px] font-bold text-slate-500">Emergencias</span>
                            </div>
                        </button>
                    </div>
                </section>

                {/* ─── Footer Informativo con enlace a Nosotros / Historia ─── */}
                <footer className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
                    <p>© 2026 ubicame.info PULSE. La guía digital de la ruta del spondylus.</p>
                    <div className="flex items-center gap-4">
                        <button 
                            onClick={() => navigate('/history')}
                            className="hover:text-white transition-colors underline underline-offset-4"
                        >
                            Nosotros / Historia
                        </button>
                        <button 
                            onClick={() => navigate('/policies')}
                            className="hover:text-white transition-colors underline underline-offset-4"
                        >
                            Políticas y Privacidad
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default Home;
