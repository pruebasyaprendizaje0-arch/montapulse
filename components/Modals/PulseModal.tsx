import React, { useState, useMemo } from 'react';
import { X, Activity, Sparkles, MessageSquare, Heart, Zap, Bell, BellOff, Calendar, Clock, ArrowRight, Search, MapPin, Star, Building2, Info, CheckCircle2, AlertCircle, Check, ShieldCheck, Gift, Users, Map as MapIcon, ExternalLink } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { format, isToday, isTomorrow, isThisWeek, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Vibe, SubscriptionPlan, BusinessCategory } from '../../types';

interface PulseItem {
    id: string;
    type: 'event' | 'post' | 'notification';
    user?: string;
    title?: string;
    content: string;
    timestamp: Date | string;
    icon: React.ReactNode;
    color: string;
    borderColor: string;
    data?: any;
    timeLabel?: string;
    isPremium?: boolean;
    businessName?: string;
    businessLocation?: string;
    businessSector?: string;
    isFeatured?: boolean;
}

export const PulseModal: React.FC = () => {
    const navigate = useNavigate();
    const {
        showPulseModal,
        setShowPulseModal,
        posts = [],
        eventsWithLiveCounts = [],
        notifications = [],
        unreadNotificationsCount = 0,
        markAsRead,
        markAllAsRead,
        setSelectedEvent,
        favorites = [],
        toggleFavorite,
        businesses = [],
        currentLocality,
        setShowPublicProfile,
        setPublicProfileId,
        setPublicProfileType,
        handleLikePost,
        user,
        authUser,
        followedBusinessIds = []
    } = useData();

    const [activeTab, setActiveTab] = useState<'all' | 'events' | 'posts' | 'references' | 'followed' | 'gifts' | 'notifications'>('all');
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [showMilitaryOnly, setShowMilitaryOnly] = useState(false);

    const REFERENCE_CATEGORIES = [
        BusinessCategory.REFERENCIA,
        BusinessCategory.PARQUE,
        BusinessCategory.CANCHA,
        BusinessCategory.MALECON,
        BusinessCategory.MERCADO,
        BusinessCategory.PARADA_TAXI,
        BusinessCategory.PLAYA,
        BusinessCategory.OTRO,
        BusinessCategory.HOTEL,
        BusinessCategory.HOSTAL,
        BusinessCategory.HOSPAJE,
        BusinessCategory.RESTAURANTE,
        BusinessCategory.BAR,
        BusinessCategory.DISCOTECA,
        BusinessCategory.BAR_DISCOTECA,
        BusinessCategory.CENTRO_SURF,
        BusinessCategory.ESCUELA_SURF,
        BusinessCategory.TOUR_OPERATOR,
        BusinessCategory.SHOPPING,
        BusinessCategory.TRANSPORT
    ];

    const referencePoints = useMemo(() => {
        return (businesses || []).filter((b: any) => 
            b.locality === currentLocality?.name && 
            REFERENCE_CATEGORIES.includes(b.category) &&
            (!selectedCategory || b.category === selectedCategory) &&
            (!showMilitaryOnly || b.hasMilitaryBenefit)
        );
    }, [businesses, currentLocality, selectedCategory, showMilitaryOnly]);

    const premiumBusinesses = useMemo(() => {
        return (businesses || []).filter((b: any) => 
            b.locality === currentLocality?.name && 
            b.plan === SubscriptionPlan.EXPERT &&
            (!selectedCategory || b.category === selectedCategory) &&
            (!showMilitaryOnly || b.hasMilitaryBenefit)
        );
    }, [businesses, currentLocality, selectedCategory, showMilitaryOnly]);
    const [searchQuery, setSearchQuery] = useState('');

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const businessList = businesses || [];

    const isPremiumEvent = (event: any) => {
        if (!event?.businessId) return false;
        const business = businessList.find((b: any) => b.id === event.businessId);
        return business?.plan === SubscriptionPlan.EXPERT;
    };

    const formatEventDate = (date: Date | string) => {
        const d = typeof date === 'string' ? new Date(date) : date;
        if (isToday(d)) return `Hoy, ${format(d, 'HH:mm')}`;
        if (isTomorrow(d)) return `Mañana, ${format(d, 'HH:mm')}`;
        if (isThisWeek(d)) return format(d, 'EEEE, HH:mm', { locale: es });
        return format(d, 'dd MMM, HH:mm', { locale: es });
    };

    const getVibeColor = (vibe: string) => {
        const colors: Record<string, string> = {
            [Vibe.FIESTA]: 'bg-pink-500/20 border-pink-500/30 text-pink-400',
            [Vibe.TECHNO]: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-400',
            [Vibe.RELAX]: 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400',
            [Vibe.ADRENALINA]: 'bg-red-500/20 border-red-500/30 text-red-400',
            [Vibe.FAMILIA]: 'bg-amber-500/20 border-amber-500/30 text-amber-400',
            [Vibe.WELLNESS]: 'bg-violet-500/20 border-violet-500/30 text-violet-400',
            [Vibe.SURF]: 'bg-sky-500/20 border-sky-500/30 text-sky-400',
            [Vibe.GASTRONOMIA]: 'bg-orange-500/20 border-orange-500/30 text-orange-400',
            [Vibe.FUTBOL]: 'bg-green-500/20 border-green-500/30 text-green-400',
            [Vibe.OTRO]: 'bg-slate-500/20 border-slate-500/30 text-slate-400',
        };
        return colors[vibe] || 'bg-slate-500/20 border-slate-500/30 text-slate-400';
    };

    const todayEvents = useMemo(() => {
        return (eventsWithLiveCounts || [])
            .filter((e: any) => {
                const eventDate = new Date(e.startAt);
                const isDeactivated = e.status === 'deactivated';
                return eventDate >= today && eventDate < tomorrow && !isDeactivated;
            })
            .sort((a: any, b: any) => {
                const aPremium = isPremiumEvent(a) ? 0 : 1;
                const bPremium = isPremiumEvent(b) ? 0 : 1;
                if (aPremium !== bPremium) return aPremium - bPremium;
                return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
            });
    }, [eventsWithLiveCounts]);

    const upcomingEvents = useMemo(() => {
        return (eventsWithLiveCounts || [])
            .filter((e: any) => new Date(e.startAt) >= tomorrow && e.status !== 'deactivated')
            .sort((a: any, b: any) => {
                const aPremium = isPremiumEvent(a) ? 0 : 1;
                const bPremium = isPremiumEvent(b) ? 0 : 1;
                if (aPremium !== bPremium) return aPremium - bPremium;
                return new Date(a.startAt).getTime() - new Date(b.startAt).getTime();
            })
            .slice(0, 10);
    }, [eventsWithLiveCounts]);

    const todayPosts = useMemo(() => {
        return (posts || []).filter((post: any) => new Date(post.timestamp) >= today);
    }, [posts]);

    const todayActivities: PulseItem[] = useMemo(() => {
        const activities: PulseItem[] = [];
        
        todayEvents.forEach((event: any) => {
            activities.push({
                id: event.id,
                type: 'event',
                title: event.title,
                content: event.description?.slice(0, 80) + '...' || '',
                timestamp: event.startAt,
                icon: <Calendar className="w-4 h-4" />,
                color: getVibeColor(event.vibe),
                borderColor: 'border-pink-500/30',
                data: event,
                timeLabel: 'HOY',
                isFeatured: event.isFeatured
            });
        });

        todayPosts.forEach((post: any) => {
            const business = businessList.find((b: any) => b.id === post.authorId);
            const isPremiumBusiness = business?.plan === SubscriptionPlan.EXPERT;
            
            activities.push({
                id: post.id,
                type: 'post',
                user: post.authorName,
                content: post.content,
                timestamp: post.timestamp,
                icon: <MessageSquare className="w-4 h-4" />,
                color: isPremiumBusiness ? 'bg-amber-500/20 border-amber-500/30 text-amber-400' : 'bg-sky-500/20 border-sky-500/30 text-sky-400',
                borderColor: isPremiumBusiness ? 'border-amber-500/30' : 'border-sky-500/30',
                data: { ...post, isPremium: isPremiumBusiness, business },
                timeLabel: 'HOY',
                isPremium: isPremiumBusiness,
                isFeatured: post.isFeatured || business?.isFeatured,
                businessName: business?.name,
                businessLocation: business?.locality,
                businessSector: business?.sector
            });
        });

        return activities.sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
            return timeB - timeA;
        });
    }, [todayEvents, todayPosts]);

    const upcomingActivities: PulseItem[] = useMemo(() => {
        return upcomingEvents.map((event: any) => ({
            id: event.id,
            type: 'event',
            title: event.title,
            content: event.description?.slice(0, 80) + '...' || '',
            timestamp: event.startAt,
            icon: <Calendar className="w-4 h-4" />,
            color: getVibeColor(event.vibe),
            borderColor: 'border-violet-500/30',
            data: event,
            timeLabel: isTomorrow(new Date(event.startAt)) ? 'MAÑANA' : format(new Date(event.startAt), 'dd MMM', { locale: es }),
            isFeatured: event.isFeatured
        }));
    }, [upcomingEvents]);

    const activityFeed = useMemo(() => {
        return [...todayActivities, ...upcomingActivities].sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
            return timeB - timeA;
        });
    }, [todayActivities, upcomingActivities]);

    const filteredFeed = useMemo(() => {
        let feed = activeTab === 'all' 
            ? activityFeed 
            : activeTab === 'events' 
                ? activityFeed.filter(i => i.type === 'event')
                : activityFeed.filter(i => i.type === 'post');
        
        const sq = searchQuery || '';
        if (sq.trim()) {
            const query = sq.toLowerCase();
            feed = feed.filter(item => {
                const title = item.title?.toLowerCase() || '';
                const content = item.content?.toLowerCase() || '';
                const user = item.user?.toLowerCase() || '';
                const vibe = item.data?.vibe?.toLowerCase() || '';
                return title.includes(query) || content.includes(query) || user.includes(query) || vibe.includes(query);
            });
        }
        
        return feed.sort((a, b) => {
            // Priorizar Featured
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;

            // Priorizar Premium (Eventos destacados y Posts Premium)
            const aIsPremium = a.isPremium || (a.type === 'event' && isPremiumEvent(a.data));
            const bIsPremium = b.isPremium || (b.type === 'event' && isPremiumEvent(b.data));
            
            if (aIsPremium && !bIsPremium) return -1;
            if (!aIsPremium && bIsPremium) return 1;

            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
            return timeB - timeA;
        });
    }, [activityFeed, activeTab, searchQuery]);

    const premiumInFiltered = filteredFeed.filter(i => i.type === 'event' && isPremiumEvent(i.data)).length;

    if (!showPulseModal) return null;

    const onClose = () => setShowPulseModal(false);

    const handleItemClick = (item: PulseItem) => {
        if (item.type === 'event' && item.data) {
            setSelectedEvent(item.data);
            onClose();
        } else if (item.type === 'post') {
            navigate('/community');
            onClose();
        }
    };

    const handleToggleFavorite = (e: React.MouseEvent, eventId: string) => {
        e.stopPropagation();
        if (toggleFavorite) toggleFavorite(eventId);
    };

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchQuery(e.target.value);
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-24 md:pb-6">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg bg-slate-900/40 backdrop-blur-3xl border border-white/20 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
                <div className="absolute inset-0 rounded-[3rem] border border-violet-500/20 pointer-events-none" />

                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-violet-500/20 rounded-2xl border border-violet-500/30">
                            <Activity className="w-5 h-5 text-violet-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight italic">VENTANA DE PULSE</h2>
                            <p className="text-[10px] font-black text-violet-500 uppercase tracking-[0.2em] leading-none mt-1">Actividad en Tiempo Real</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setActiveTab('notifications')}
                            className={`relative w-10 h-10 rounded-full border flex items-center justify-center transition-all ${
                                activeTab === 'notifications' 
                                    ? 'bg-violet-500/20 border-violet-500/50 text-violet-400' 
                                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                            }`}
                        >
                            <Bell className="w-5 h-5" />
                            {unreadNotificationsCount > 0 && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-pink-500 text-white text-[10px] font-black flex items-center justify-center rounded-[0.5rem] border-2 border-slate-900 animate-pulse">
                                    {unreadNotificationsCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => {
                                onClose();
                                navigate('/info');
                            }}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <Info className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="px-6 pt-4 pb-2">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar eventos, vibes, lugares..."
                            value={searchQuery}
                            onChange={handleSearch}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/30 transition-all"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="px-6 pt-2 pb-4 flex gap-2 border-b border-white/5">
                    {[
                        { id: 'all', label: 'Todo', count: filteredFeed.length },
                        { id: 'events', label: 'Eventos', count: upcomingEvents.length },
                        { id: 'posts', label: 'Posts', count: todayPosts.length },
                        { id: 'references', label: 'Puntos de Interés', count: referencePoints.length + premiumBusinesses.length },
                        { id: 'followed', label: 'Me Siguen', count: businesses.filter(b => followedBusinessIds.includes(b.id)).length },
                        { id: 'gifts', label: 'Regalos', count: upcomingEvents.filter(e => e.isFlashOffer || e.isPremium).length },
                        { id: 'notifications', label: 'Alertas', count: unreadNotificationsCount }
                    ].map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                activeTab === tab.id 
                                    ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' 
                                    : 'text-slate-500 hover:text-white'
                            }`}
                        >
                            {tab.label} {tab.count > 0 && <span className="ml-1 opacity-70">({tab.count})</span>}
                        </button>
                    ))}
                </div>

            {/* SECCIÓN PUNTOS DE INTERÉS */}
            {activeTab === 'references' && (
                <div className="p-4 space-y-4 pb-20 max-w-4xl mx-auto overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {referencePoints.concat(premiumBusinesses).map(biz => (
                            <div
                                key={biz.id}
                                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 cursor-pointer hover:border-[#FF6A00]/30 transition-all"
                                onClick={() => {
                                    setPublicProfileType('business');
                                    setPublicProfileId(biz.id);
                                    setShowPublicProfile(true);
                                }}
                            >
                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                    <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold truncate">{biz.name}</h4>
                                    <p className="text-xs text-white/40 mb-2">{biz.category}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-[10px] text-white/40">
                                            <MapPin className="w-3 h-3" />
                                            {biz.sector}
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-white/40">
                                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                            {biz.rating || '5.0'}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* SECCIÓN ME SIGUEN */}
            {activeTab === 'followed' && (
                <div className="p-4 space-y-4 pb-20 max-w-4xl mx-auto overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {businesses.filter(b => followedBusinessIds.includes(b.id)).map(biz => (
                            <div
                                key={biz.id}
                                className="bg-white/5 border border-white/10 rounded-2xl p-4 flex gap-4 cursor-pointer hover:border-[#FF6A00]/30 transition-all hover:-translate-y-1"
                                onClick={() => {
                                    setPublicProfileType('business');
                                    setPublicProfileId(biz.id);
                                    setShowPublicProfile(true);
                                }}
                            >
                                <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/10 shrink-0">
                                    <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-white font-bold truncate">{biz.name}</h4>
                                    <p className="text-xs text-white/40 mb-2">{biz.category}</p>
                                    <div className="flex items-center gap-2">
                                        <div className="flex items-center gap-1 text-[10px] text-white/40">
                                            <Users className="w-3 h-3" />
                                            {biz.followerCount || 0} seguidores
                                        </div>
                                        <div className="flex items-center gap-1 text-[10px] text-white/40">
                                            <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                                            {biz.rating || '5.0'}
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col justify-between items-end">
                                    <div className="bg-[#FF6A00]/20 text-[#FF6A00] p-1.5 rounded-full">
                                        <Check className="w-4 h-4" />
                                    </div>
                                    <span className="text-[10px] text-white/40 whitespace-nowrap">Siguiendo</span>
                                </div>
                            </div>
                        ))}
                        {businesses.filter(b => followedBusinessIds.includes(b.id)).length === 0 && (
                            <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <Heart className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                <h3 className="text-white font-bold mb-1">Aún no sigues a nadie</h3>
                                <p className="text-white/40 text-sm">Sigue tus negocios favoritos para verlos aquí.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* SECCIÓN REGALOS */}
            {activeTab === 'gifts' && (
                <div className="p-4 space-y-4 pb-20 max-w-4xl mx-auto overflow-y-auto max-h-[80vh]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {upcomingEvents.filter(e => e.isFlashOffer || e.isPremium).map(event => (
                            <div
                                key={event.id}
                                className="relative group rounded-3xl overflow-hidden bg-gradient-to-br from-[#FF6A00] to-[#EE0979] p-[1px] shadow-xl cursor-pointer hover:scale-[1.02] transition-all"
                                onClick={() => setSelectedEvent(event)}
                            >
                                <div className="bg-[#121212] rounded-[23px] h-full overflow-hidden flex flex-col">
                                    <div className="absolute top-4 right-4 z-10 bg-white text-[#FF6A00] px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tighter shadow-lg flex items-center gap-1">
                                        <Gift className="w-3 h-3" />
                                        {event.isFlashOffer ? 'Oferta Flash' : 'Beneficio Premium'}
                                    </div>

                                    <div className="relative h-32 overflow-hidden">
                                        <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                                    </div>
                                    
                                    <div className="p-4 flex-1">
                                        <h4 className="text-white font-black text-lg mb-1 leading-tight group-hover:text-[#FF6A00] transition-colors">{event.title}</h4>
                                        <p className="text-white/60 text-xs line-clamp-2 mb-4 leading-relaxed">{event.description}</p>
                                        
                                        <div className="flex items-center justify-between mt-auto">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-white/40 uppercase font-bold">Vence en</span>
                                                <span className="text-sm text-white font-mono flex items-center gap-1">
                                                    <Clock className="w-3 h-3 text-[#FF6A00]" />
                                                    {new Date(event.endAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                            <button className="bg-white text-black px-4 py-2 rounded-full text-xs font-black hover:bg-[#FF6A00] hover:text-white transition-all shadow-lg">
                                                RECLAMAR
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {upcomingEvents.filter(e => e.isFlashOffer || e.isPremium).length === 0 && (
                            <div className="col-span-full py-20 text-center bg-white/5 rounded-3xl border border-dashed border-white/10">
                                <Gift className="w-12 h-12 text-white/20 mx-auto mb-4" />
                                <h3 className="text-white font-bold mb-1">Sin regalos por hoy</h3>
                                <p className="text-white/40 text-sm">Descubre nuevas ofertas flash activando el Pulse Pass.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}
     <div className="px-6 py-4 flex gap-4 overflow-x-auto no-scrollbar border-b border-white/5 bg-black/20">
                    {premiumInFiltered > 0 && (
                        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl border border-amber-500/30 shrink-0">
                            <Zap className="w-4 h-4 text-amber-400" />
                            <span className="text-[10px] font-black text-amber-400 uppercase truncate">{premiumInFiltered} Destacados</span>
                        </div>
                    )}
                    <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-2xl border border-white/10 shrink-0">
                        <Zap className="w-4 h-4 text-amber-400" />
                        <span className="text-[10px] font-black text-white uppercase truncate">{filteredFeed.length} Resultados</span>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-6">
                    <div className="space-y-4">
                        {filteredFeed.length > 0 ? (
                            <>
                                {premiumInFiltered > 0 && activeTab !== 'posts' && (
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">★ DESTACADOS</span>
                                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                                    </div>
                                )}
                                {filteredFeed.map((item, index) => (
                                    <div key={item.id || index}>
                                        {index === premiumInFiltered && premiumInFiltered > 0 && !searchQuery && (
                                            <div className="flex items-center gap-3 mb-4 mt-6">
                                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                                                <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em]">{searchQuery ? 'RESULTADOS' : 'MÁS EVENTOS'}</span>
                                                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-violet-500/50 to-transparent" />
                                            </div>
                                        )}
                                        <div className="relative animate-in slide-in-from-bottom-4 duration-300">
                                            {item.type === 'event' && item.data ? (
                                                <div 
                                                    onClick={() => handleItemClick(item)}
                                                    className="p-4 rounded-[2rem] bg-black/40 border border-white/10 hover:border-pink-500/30 transition-all cursor-pointer group"
                                                >
                                                    <div className="flex items-start gap-4">
                                                        <div className={`w-12 h-12 rounded-2xl ${item.color} border flex items-center justify-center shrink-0`}>
                                                            {item.icon}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <h4 className="text-sm font-black text-white truncate">{item.title}</h4>
                                                                <button
                                                                    onClick={(e) => handleToggleFavorite(e, item.id)}
                                                                    className={`p-2 rounded-xl transition-colors ${favorites.includes(item.id) ? 'bg-pink-500/20 text-pink-400' : 'bg-white/5 text-slate-500 hover:text-pink-400'}`}
                                                                >
                                                                    <Heart className={`w-4 h-4 ${favorites.includes(item.id) ? 'fill-current' : ''}`} />
                                                                </button>
                                                            </div>
                                                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-2">{item.content}</p>
                                                            <div className="flex items-center gap-3 mt-2">
                                                                <div className="flex items-center gap-1 text-[10px] text-slate-500">
                                                                    <Clock className="w-3 h-3" />
                                                                    {formatEventDate(item.timestamp)}
                                                                </div>
                                                                <div className="flex items-center gap-1 text-[10px] text-pink-400">
                                                                    <Heart className="w-3 h-3 fill-current" />
                                                                    {item.data.interestedCount || 0}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            {isPremiumEvent(item.data) && (
                                                                <span className="text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg bg-gradient-to-r from-amber-500/30 to-orange-500/30 text-amber-400 border border-amber-500/40">
                                                                    PREMIUM
                                                                </span>
                                                            )}
                                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg ${item.color}`}>
                                                                {item.data.vibe}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center gap-1 text-violet-400 text-[10px] font-bold group-hover:translate-x-1 transition-transform">
                                                            Ver evento <ArrowRight className="w-3 h-3" />
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div 
                                                    onClick={() => handleItemClick(item)}
                                                    className="relative pl-12 cursor-pointer group"
                                                >
                                                    <div className={`absolute left-0 top-0 w-9 h-9 rounded-xl flex items-center justify-center z-10 ${item.isPremium ? 'bg-amber-500/20 border border-amber-500/30' : 'bg-white/5 border border-white/10'}`}>
                                                        {item.isPremium ? (
                                                            <Zap className="w-4 h-4 text-amber-400" />
                                                        ) : (
                                                            item.icon
                                                        )}
                                                    </div>

                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-2">
                                                                {item.isPremium && (
                                                                    <span className="text-[8px] font-black text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.5 rounded">
                                                                        ★
                                                                    </span>
                                                                )}
                                                                <span className={`text-[11px] font-black uppercase tracking-tight ${item.isPremium ? 'text-amber-400' : 'text-white'}`}>
                                                                    {item.user || 'Sistema'}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                {item.type === 'post' && (
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (handleLikePost) handleLikePost(item.id);
                                                                        }}
                                                                        className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-white/5 hover:bg-rose-500/10 border border-white/10 group/like transition-all active:scale-95"
                                                                    >
                                                                        <Heart 
                                                                            className={`w-3 h-3 transition-all duration-300 transform group-active/like:scale-125 ${
                                                                                item.data?.likes?.includes(authUser?.uid || user?.id || '') 
                                                                                ? 'fill-rose-500 text-rose-500' 
                                                                                : 'text-slate-500 group-hover/like:text-rose-400'
                                                                            }`} 
                                                                        />
                                                                        {item.data?.likes?.length > 0 && (
                                                                            <span className="text-[9px] font-black text-rose-500">{item.data.likes.length}</span>
                                                                        )}
                                                                    </button>
                                                                )}
                                                                <span className="text-[9px] font-medium text-slate-500 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                                                    {format(new Date(item.timestamp), "HH:mm")}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        {item.businessName && (
                                                            <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                                                <span className="font-medium">{item.businessName}</span>
                                                                {item.businessLocation && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{item.businessLocation}</span>
                                                                    </>
                                                                )}
                                                                {item.businessSector && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span>{item.businessSector}</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        )}
                                                        <div className={`p-4 rounded-[2rem] border transition-all ${item.isPremium ? 'bg-amber-500/5 border-amber-500/20 group-hover:bg-amber-500/10' : 'bg-white/5 border-white/5 group-hover:bg-white/10'}`}>
                                                            <p className="text-xs text-slate-300 leading-relaxed">{item.content}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </>
                        ) : (
                            <div className="py-20 text-center flex flex-col items-center gap-4">
                                <div className="w-20 h-20 bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-inner">
                                    <Sparkles className="w-10 h-10 text-slate-600" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black text-white uppercase tracking-widest italic">PULSE SILENCIOSO</p>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No hay actividad reciente aún</p>
                                </div>
                            </div>
                        )}

                        {activeTab === 'references' && (
                            <div className="space-y-6">
                                {/* Category Filter */}
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        onClick={() => setShowMilitaryOnly(!showMilitaryOnly)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
                                            showMilitaryOnly 
                                                ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]' 
                                                : 'bg-white/5 text-slate-500 border border-white/10 hover:text-white'
                                        }`}
                                    >
                                        <ShieldCheck className={`w-3 h-3 ${showMilitaryOnly ? 'animate-pulse' : ''}`} />
                                        Militar
                                    </button>
                                    
                                    <button
                                        onClick={() => setSelectedCategory(null)}
                                        className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                            selectedCategory === null 
                                                ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30' 
                                                : 'bg-white/5 text-slate-500 border border-white/10 hover:text-white'
                                        }`}
                                    >
                                        Todos ({referencePoints.length + premiumBusinesses.length})
                                    </button>
                                    {Object.values(BusinessCategory).map(cat => {
                                        const count = (referencePoints.length + premiumBusinesses.length) || 0;
                                        const catCount = (businesses || []).filter((b: any) => 
                                            b.category === cat && 
                                            b.locality === currentLocality?.name &&
                                            (!showMilitaryOnly || b.hasMilitaryBenefit)
                                        ).length;
                                        if (catCount === 0) return null;
                                        return (
                                            <button
                                                key={cat}
                                                onClick={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
                                                className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                                    selectedCategory === cat 
                                                        ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' 
                                                        : 'bg-white/5 text-slate-500 border border-white/10 hover:text-white'
                                                }`}
                                            >
                                                {cat} ({catCount})
                                            </button>
                                        );
                                    })}
                                </div>
                                
                                {premiumBusinesses.length > 0 && (
                                    <>
                                        <div className="flex items-center gap-3 mb-4">
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">★ DESTACADOS</span>
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            {premiumBusinesses.map((biz: any) => (
                                                <div
                                                    key={biz.id}
                                                    onClick={() => {
                                                        setPublicProfileId(biz.id);
                                                        setPublicProfileType('business');
                                                        setShowPublicProfile(true);
                                                        onClose();
                                                    }}
                                                    className="relative aspect-square rounded-[2rem] overflow-hidden border-2 border-amber-500/20 group cursor-pointer"
                                                >
                                                    <img src={biz.imageUrl} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={biz.name} loading="lazy" />
                                                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent group-hover:from-black/70 transition-colors" />
                                                    <div className="absolute inset-0 border border-white/10 rounded-[2rem] pointer-events-none" />
                                                    <div className="absolute top-3 right-3 flex flex-col gap-2">
                                                        {biz.hasMilitaryBenefit && (
                                                            <div className="bg-indigo-600/90 text-white text-[8px] font-black px-2 py-1 rounded-lg backdrop-blur-md border border-indigo-400/50 flex items-center gap-1 shadow-lg animate-in zoom-in-50 duration-300">
                                                                <ShieldCheck className="w-2.5 h-2.5" />
                                                                MILITAR
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="absolute bottom-3 left-3 right-3">
                                                        <p className="text-[10px] font-black text-white uppercase tracking-tight truncate group-hover:text-amber-400 transition-colors">{biz.name}</p>
                                                        <div className="flex items-center gap-1 mt-0.5">
                                                            <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                                            <span className="text-[8px] font-bold text-slate-400 uppercase truncate">{biz.sector}</span>
                                                        </div>
                                                    </div>
                                                    <div className="absolute top-3 right-3">
                                                        <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {referencePoints.length > 0 && (
                                    <>
                                        <div className="flex items-center gap-3 mb-4 mt-6">
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
                                            <span className="text-[10px] font-black text-sky-400 uppercase tracking-[0.3em]">REFERENCIAS</span>
                                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-sky-500/50 to-transparent" />
                                        </div>
                                        <div className="space-y-3">
                                            {referencePoints.map((ref: any) => (
                                                <div
                                                    key={ref.id}
                                                    onClick={() => {
                                                        setPublicProfileId(ref.id);
                                                        setPublicProfileType('business');
                                                        setShowPublicProfile(true);
                                                        onClose();
                                                    }}
                                                    className="p-4 rounded-[2rem] bg-black/40 border border-white/10 hover:border-sky-500/30 transition-all cursor-pointer group"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                                                            {ref.imageUrl ? (
                                                                <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                                            ) : (
                                                                <MapPin className="w-6 h-6 text-sky-400" />
                                                            )}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between gap-2">
                                                                <h4 className="text-sm font-black text-white truncate">{ref.name}</h4>
                                                                {ref.hasMilitaryBenefit && (
                                                                    <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 text-[8px] font-black uppercase tracking-tight shadow-[0_0_10px_rgba(99,102,241,0.1)]">
                                                                        <ShieldCheck className="w-2.5 h-2.5" />
                                                                        MILITAR
                                                                    </div>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-1">
                                                                <span className="text-[9px] font-medium text-sky-400 uppercase bg-sky-500/20 px-2 py-0.5 rounded-lg">
                                                                    {ref.category}
                                                                </span>
                                                                {ref.sector && (
                                                                    <span className="text-[9px] text-slate-500">
                                                                        {ref.sector}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </>
                                )}

                                {referencePoints.length === 0 && premiumBusinesses.length === 0 && (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-inner">
                                            <MapPin className="w-10 h-10 text-slate-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-white uppercase tracking-widest italic">SIN REFERENCIAS</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No hay puntos de referencia en esta localidad</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {activeTab === 'notifications' && (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between mb-2">
                                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Centro de Alertas</h3>
                                    {unreadNotificationsCount > 0 && (
                                        <button 
                                            onClick={() => markAllAsRead && markAllAsRead()}
                                            className="flex items-center gap-2 text-[10px] font-black text-violet-400 hover:text-violet-300 uppercase tracking-widest transition-colors"
                                        >
                                            <Check className="w-3 h-3" />
                                            Marcar todo
                                        </button>
                                    )}
                                </div>
                                
                                {notifications.length > 0 ? (
                                    notifications.map((n: any) => (
                                        <div 
                                            key={n.id}
                                            onClick={() => {
                                                if (!n.read && markAsRead) markAsRead(n.id);
                                            }}
                                            className={`p-4 rounded-[2rem] border transition-all cursor-pointer relative overflow-hidden group ${
                                                !n.read 
                                                    ? 'bg-violet-500/10 border-violet-500/30' 
                                                    : 'bg-black/40 border-white/5'
                                            }`}
                                        >
                                            {!n.read && (
                                                <div className="absolute top-4 right-4 w-2 h-2 bg-pink-500 rounded-full shadow-[0_0_8px_rgba(236,72,153,0.8)]" />
                                            )}
                                            
                                            <div className="flex gap-4">
                                                <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                                                    n.type === 'alert' ? 'bg-red-500/20 text-red-400' : 
                                                    n.type === 'offer' ? 'bg-amber-500/20 text-amber-400' :
                                                    'bg-violet-500/20 text-violet-400'
                                                }`}>
                                                    {n.type === 'alert' ? <AlertCircle className="w-5 h-5" /> : 
                                                     n.type === 'offer' ? <Sparkles className="w-5 h-5" /> :
                                                     <Bell className="w-5 h-5" />}
                                                </div>
                                                
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between">
                                                        <h4 className={`text-sm font-black truncate ${!n.read ? 'text-white' : 'text-slate-300'}`}>
                                                            {n.title}
                                                        </h4>
                                                    </div>
                                                    <p className={`text-xs mt-1 leading-relaxed ${!n.read ? 'text-slate-300' : 'text-slate-500'}`}>
                                                        {n.message || n.body}
                                                    </p>
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <Clock className="w-3 h-3 text-slate-600" />
                                                                <span className="text-[10px] font-bold text-slate-600 uppercase">
                                                                    {n.createdAt?.seconds 
                                                                        ? formatDistanceToNow(new Date(n.createdAt.seconds * 1000), { addSuffix: true, locale: es })
                                                                        : n.createdAt instanceof Date 
                                                                            ? formatDistanceToNow(n.createdAt, { addSuffix: true, locale: es })
                                                                            : 'Recientemente'}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {n.postId && (
                                                            <div className="flex items-center gap-2">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (handleLikePost) handleLikePost(n.postId!);
                                                                    }}
                                                                    className={`p-2 rounded-xl transition-all ${posts?.find(p => p.id === n.postId)?.likes?.includes(user?.id || '') ? 'bg-pink-500/20 text-pink-500' : 'bg-white/5 text-slate-500 hover:text-pink-100'}`}
                                                                >
                                                                    <Heart className={`w-4 h-4 ${posts?.find(p => p.id === n.postId)?.likes?.includes(user?.id || '') ? 'fill-current' : ''}`} />
                                                                </button>
                                                            </div>
                                                        )}
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-20 text-center flex flex-col items-center gap-4">
                                        <div className="w-20 h-20 bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-inner">
                                            <BellOff className="w-10 h-10 text-slate-600" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black text-white uppercase tracking-widest italic">BANDEJA VACÍA</p>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No tienes notificaciones pendientes</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-white/[0.02] border-t border-white/5">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest leading-none">Status</span>
                            <div className="flex items-center gap-2 mt-1">
                                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest leading-none">En Vivo</span>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button 
                                onClick={() => { navigate('/'); onClose(); }}
                                className="px-4 py-2 bg-violet-500/20 text-violet-400 rounded-xl text-xs font-black uppercase hover:bg-violet-500/30 transition-colors"
                            >
                                Explorar
                            </button>
                            <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20">
                                <Activity className="w-4 h-4 text-violet-400 animate-pulse" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


