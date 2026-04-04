import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Search, MapPin, Star, Zap, Phone, MessageCircle, Mail,
    Instagram, ShieldCheck, Crown, Sparkles, ChevronRight,
    SlidersHorizontal, X, Building2, ExternalLink,
    ChevronDown, ChevronUp, Navigation, Tag
} from 'lucide-react';
import { PublicProfileModal } from '../components/PublicProfileModal';
import { useData } from '../context/DataContext';
import { Business, BusinessCategory, SubscriptionPlan } from '../types';

// ── Plan badge config ──────────────────────────────────
const PLAN_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ReactNode; gradient: string }> = {
    [SubscriptionPlan.PREMIUM]: {
        label: 'Premium',
        color: 'text-amber-300',
        bg: 'bg-amber-500/15 border border-amber-500/25',
        icon: <Crown className="w-3 h-3" />,
        gradient: 'from-amber-500/10 to-orange-500/5',
    },
    [SubscriptionPlan.BASIC]: {
        label: 'Pro',
        color: 'text-sky-300',
        bg: 'bg-sky-500/15 border border-sky-500/25',
        icon: <Zap className="w-3 h-3" />,
        gradient: 'from-sky-500/10 to-indigo-500/5',
    },
    [SubscriptionPlan.EXPERT]: {
        label: 'Expert',
        color: 'text-violet-300',
        bg: 'bg-violet-500/15 border border-violet-500/25',
        icon: <Sparkles className="w-3 h-3" />,
        gradient: 'from-violet-500/10 to-purple-500/5',
    },
};

const CATEGORIES: { label: string; value: BusinessCategory | 'all'; emoji: string }[] = [
    { label: 'Todos', value: 'all', emoji: '🌐' },
    { label: 'Restaurantes', value: BusinessCategory.RESTAURANTE, emoji: '🍽️' },
    { label: 'Bar / Disco', value: BusinessCategory.BAR_DISCOTECA, emoji: '🍹' },
    { label: 'Hospedaje', value: BusinessCategory.HOSPAJE, emoji: '🏨' },
    { label: 'Surf', value: BusinessCategory.CENTRO_SURF, emoji: '🏄' },
    { label: 'Tours', value: BusinessCategory.TOUR_OPERATOR, emoji: '🗺️' },
    { label: 'Tiendas', value: BusinessCategory.SHOPPING, emoji: '🛍️' },
    { label: 'Transporte', value: BusinessCategory.TRANSPORT, emoji: '🚌' },
];

// ── Social action helpers ──────────────────────────────
const openWhatsApp = (number: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const clean = number.replace(/\D/g, '');
    window.open(`https://wa.me/${clean}`, '_blank', 'noopener');
};

const openInstagram = (handle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const clean = handle.replace('@', '');
    window.open(`https://instagram.com/${clean}`, '_blank', 'noopener');
};

const openPhone = (number: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `tel:${number}`;
};

const openEmail = (email: string, e: React.MouseEvent) => {
    e.stopPropagation();
    window.location.href = `mailto:${email}`;
};

// ── Individual Business Card ───────────────────────────
interface BusinessCardProps {
    business: Business;
    onOpenProfile: () => void;
    onGoToMap: () => void;
}

const BusinessCard: React.FC<BusinessCardProps> = ({ business, onOpenProfile, onGoToMap }) => {
    const [expanded, setExpanded] = useState(false);
    const planCfg = PLAN_CONFIG[business.plan];
    const avatarFallback = `https://ui-avatars.com/api/?name=${encodeURIComponent(business.name)}&background=f59e0b&color=fff&size=400`;

    const hasSocials = !!(business.whatsapp || business.instagram || business.phone || business.email);

    return (
        <div className={`w-full bg-gradient-to-br ${planCfg?.gradient ?? 'from-slate-900 to-slate-900'} bg-slate-900/60 backdrop-blur-sm border border-white/8 rounded-[2rem] overflow-hidden hover:border-amber-500/25 hover:shadow-xl hover:shadow-amber-500/5 transition-all duration-300`}>

            {/* ── Banner ── */}
            <div
                className="relative h-48 overflow-hidden cursor-pointer"
                onClick={onOpenProfile}
            >
                <img
                    src={business.imageUrl || avatarFallback}
                    alt={business.name}
                    className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
                    loading="lazy"
                    onError={e => { (e.target as HTMLImageElement).src = avatarFallback; }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />

                {/* Plan badge */}
                {planCfg && (
                    <div className={`absolute top-3 right-3 flex items-center gap-1.5 px-2.5 py-1 rounded-full ${planCfg.bg}`}>
                        <span className={planCfg.color}>{planCfg.icon}</span>
                        <span className={`text-[10px] font-black uppercase tracking-widest ${planCfg.color}`}>{planCfg.label}</span>
                    </div>
                )}

                {/* Military Benefit badge */}
                {business.hasMilitaryBenefit && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-orange-500/20 border border-orange-500/30 shadow-lg shadow-orange-500/10">
                        <ShieldCheck className="w-3 h-3 text-orange-400" />
                        <span className="text-[10px] font-black text-orange-400 uppercase">Beneficio Militar</span>
                    </div>
                )}

                {/* Verified badge */}
                {business.isVerified && !business.hasMilitaryBenefit && (
                    <div className="absolute top-3 left-3 flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        <span className="text-[10px] font-black text-emerald-400 uppercase">Verificado</span>
                    </div>
                )}

                {/* Rating overlay */}
                {(business.rating && business.rating > 0) ? (
                    <div className="absolute bottom-3 right-3 flex items-center gap-1 px-2.5 py-1 bg-black/60 backdrop-blur-sm border border-amber-500/30 rounded-full">
                        <Star className="w-3 h-3 text-amber-400 fill-current" />
                        <span className="text-[11px] font-black text-amber-300">{Number(business.rating).toFixed(1)}</span>
                    </div>
                ) : null}
            </div>

            {/* ── Content ── */}
            <div className="p-5">

                {/* Name + Category + Location */}
                <div className="mb-3 cursor-pointer" onClick={onOpenProfile}>
                    <h3 className="font-black text-white text-xl leading-tight hover:text-amber-400 transition-colors">
                        {business.name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <div className="flex items-center gap-1 text-slate-400 text-xs font-bold">
                            <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                            <span>{business.locality || 'Montañita'}</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/8">
                            <Tag className="w-3 h-3 text-amber-400" />
                            <span className="text-xs font-bold text-amber-400">{business.category}</span>
                        </div>
                    </div>
                </div>

                {/* Services/Offerings - Using services array */}
                {business.services && business.services.length > 0 && (
                    <div className="mb-4 p-4 bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/10 rounded-2xl">
                        <div className="flex items-center gap-2 mb-3">
                            <Sparkles className="w-4 h-4 text-amber-400" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-amber-400">Servicios ofrecidos</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {business.services.map((service, idx) => (
                                <span key={idx} className="px-3 py-1.5 bg-white/5 border border-white/10 rounded-full text-xs font-bold text-slate-300">
                                    {service}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                {/* Expand/Collapse toggle for services */}
                {(business.description || '').length > 100 && (
                    <button
                        onClick={() => setExpanded(v => !v)}
                        className="flex items-center gap-1 text-[11px] font-black text-amber-500/70 hover:text-amber-400 transition-colors mb-4 uppercase tracking-wider"
                    >
                        {expanded ? <><ChevronUp className="w-3 h-3" />Menos</> : <><ChevronDown className="w-3 h-3" />Ver más</>}
                    </button>
                )}

                {/* ── Social Action Buttons ── */}
                {hasSocials && (
                    <div className="mb-4">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600 mb-2">Contacto</p>
                        <div className="flex flex-wrap gap-2">

                            {business.whatsapp && (
                                <button
                                    onClick={(e) => openWhatsApp(business.whatsapp!, e)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/25 hover:bg-emerald-500/20 hover:border-emerald-500/50 active:scale-95 transition-all"
                                >
                                    <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                                    <span className="text-[11px] font-black text-emerald-400">WhatsApp</span>
                                    <ExternalLink className="w-3 h-3 text-emerald-500/50" />
                                </button>
                            )}

                            {business.instagram && (
                                <button
                                    onClick={(e) => openInstagram(business.instagram!, e)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-pink-500/10 border border-pink-500/25 hover:bg-pink-500/20 hover:border-pink-500/50 active:scale-95 transition-all"
                                >
                                    <Instagram className="w-3.5 h-3.5 text-pink-400" />
                                    <span className="text-[11px] font-black text-pink-400">Instagram</span>
                                    <ExternalLink className="w-3 h-3 text-pink-500/50" />
                                </button>
                            )}

                            {business.phone && (
                                <button
                                    onClick={(e) => openPhone(business.phone!, e)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-500/10 border border-sky-500/25 hover:bg-sky-500/20 hover:border-sky-500/50 active:scale-95 transition-all"
                                >
                                    <Phone className="w-3.5 h-3.5 text-sky-400" />
                                    <span className="text-[11px] font-black text-sky-400">Llamar</span>
                                </button>
                            )}

                            {business.email && (
                                <button
                                    onClick={(e) => openEmail(business.email!, e)}
                                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-indigo-500/10 border border-indigo-500/25 hover:bg-indigo-500/20 hover:border-indigo-500/50 active:scale-95 transition-all"
                                >
                                    <Mail className="w-3.5 h-3.5 text-indigo-400" />
                                    <span className="text-[11px] font-black text-indigo-400">Email</span>
                                </button>
                            )}
                        </div>
                    </div>
                )}

                {/* ── Bottom CTAs ── */}
                <div className="flex gap-2 pt-3 border-t border-white/5">
                    {/* Ver en mapa */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onGoToMap(); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-slate-800/60 border border-white/8 hover:bg-slate-800 hover:border-amber-500/30 active:scale-95 transition-all"
                    >
                        <Navigation className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-black text-slate-300 uppercase tracking-wide">Ver en Mapa</span>
                    </button>

                    {/* Ver perfil completo */}
                    <button
                        onClick={(e) => { e.stopPropagation(); onOpenProfile(); }}
                        className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/50 active:scale-95 transition-all"
                    >
                        <ChevronRight className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[11px] font-black text-amber-400 uppercase tracking-wide">Ver Perfil</span>
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Services Page ─────────────────────────────────
export const Services: React.FC = () => {
    const { businesses } = useData();
    const navigate = useNavigate();

    const [search, setSearch] = useState('');
    const [activeCategory, setActiveCategory] = useState<BusinessCategory | 'all'>('all');
    const [showFilters, setShowFilters] = useState(false);
    const [activePlan, setActivePlan] = useState<SubscriptionPlan | 'all'>('all');
    const [onlyMilitary, setOnlyMilitary] = useState(false);

    // Modal state
    const [selectedBusinessId, setSelectedBusinessId] = useState<string | null>(null);

    // Navigate to Explore/Map centered on the business
    const handleGoToMap = (business: Business) => {
        navigate('/explore', {
            state: {
                highlightBusinessId: business.id,
                businessName: business.name,
                coords: business.coordinates,
                locality: business.locality,
            }
        });
    };

    // Filter: premium businesses only (not FREE, not reference, not deleted, published)
    const premiumBusinesses = useMemo(() => {
        return businesses.filter(b =>
            !b.isReference &&
            !b.isDeleted &&
            b.isPublished !== false &&
            b.plan !== SubscriptionPlan.FREE
        );
    }, [businesses]);

    const filtered = useMemo(() => {
        return premiumBusinesses.filter(b => {
            const matchesSearch =
                !search ||
                b.name.toLowerCase().includes(search.toLowerCase()) ||
                (b.description || '').toLowerCase().includes(search.toLowerCase()) ||
                (b.category || '').toLowerCase().includes(search.toLowerCase());

            const matchesCategory = activeCategory === 'all' || b.category === activeCategory;
            const matchesPlan = activePlan === 'all' || b.plan === activePlan;
            const matchesMilitary = !onlyMilitary || b.hasMilitaryBenefit;

            return matchesSearch && matchesCategory && matchesPlan && matchesMilitary;
        });
    }, [premiumBusinesses, search, activeCategory, activePlan, onlyMilitary]);

    // Sort: EXPERT → PREMIUM → BASIC
    const sorted = useMemo(() => {
        const order: Record<string, number> = {
            [SubscriptionPlan.EXPERT]: 0,
            [SubscriptionPlan.PREMIUM]: 1,
            [SubscriptionPlan.BASIC]: 2,
        };
        return [...filtered].sort((a, b) => (order[a.plan] ?? 9) - (order[b.plan] ?? 9));
    }, [filtered]);

    const clearAll = () => { setSearch(''); setActiveCategory('all'); setActivePlan('all'); setOnlyMilitary(false); };
    const hasActiveFilter = search || activeCategory !== 'all' || activePlan !== 'all' || onlyMilitary;

    return (
        <div className="min-h-screen bg-[#020617] pb-32 pt-4">
            <div className="px-6 lg:px-12 max-w-2xl lg:max-w-7xl mx-auto pt-8">

                {/* ── Page Title & Hero ── */}
                <div className="mb-12 flex flex-col lg:flex-row lg:items-end justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-[1.5rem] shadow-xl shadow-amber-500/5 rotate-3 hover:rotate-0 transition-transform duration-500">
                                <Building2 className="w-6 h-6 text-amber-400" />
                            </div>
                            <div className="h-px w-12 bg-gradient-to-r from-amber-500/50 to-transparent hidden lg:block" />
                            <span className="text-[10px] font-black tracking-[0.3em] text-amber-500 uppercase leading-none">Guía de Negocios</span>
                        </div>
                        <h1 className="text-4xl lg:text-6xl font-black text-white tracking-tighter mb-4 leading-none">
                            Directorio <span className="text-transparent bg-clip-text bg-gradient-to-br from-amber-400 to-orange-500 uppercase">Premium</span>
                        </h1>
                        <p className="text-slate-400 text-base max-w-xl font-medium leading-relaxed">
                            Descubre los comercios, emprendimientos y puntos de referencia más importantes de <span className="text-white font-black underline decoration-amber-500/30 decoration-4 underline-offset-4">Montañita</span>. 
                            Verificados por Ubicame Pulse.
                        </p>
                    </div>
                </div>

                {/* ── Search Bar ── */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Buscar negocio, categoría, servicio…"
                        className="w-full bg-slate-900/60 border border-white/8 rounded-2xl py-3.5 pl-11 pr-12 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/40 transition-all"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors">
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* ── Category Chips ── */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar mb-4">
                    {CATEGORIES.map(cat => (
                        <button
                            key={cat.value}
                            onClick={() => setActiveCategory(cat.value)}
                            className={`shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-black uppercase tracking-wide transition-all ${activeCategory === cat.value
                                ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/25'
                                : 'bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white border border-white/5'
                                }`}
                        >
                            <span>{cat.emoji}</span>
                            <span>{cat.label}</span>
                        </button>
                    ))}
                </div>

                {/* ── Filter by Plan ── */}
                <div className="mb-5">
                    <button
                        onClick={() => setShowFilters(f => !f)}
                        className="flex items-center gap-2 text-xs font-black text-slate-500 uppercase tracking-widest hover:text-amber-400 transition-colors"
                    >
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                        Filtrar por plan
                        {activePlan !== 'all' && (
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-[10px]">activo</span>
                        )}
                    </button>

                    {showFilters && (
                        <div className="flex gap-2 mt-3 flex-wrap">
                            {(['all', SubscriptionPlan.PREMIUM, SubscriptionPlan.BASIC] as const).map(plan => (
                                <button
                                    key={plan}
                                    onClick={() => setActivePlan(plan)}
                                    className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wide border transition-all ${activePlan === plan
                                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-lg shadow-amber-500/20'
                                        : 'bg-white/5 text-slate-400 border-white/10 hover:border-amber-500/30 hover:text-amber-400'
                                        }`}
                                >
                                    {plan === 'all' ? 'Todos' : PLAN_CONFIG[plan]?.label || plan}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* ── Military Benefits Toggle ── */}
                <div className="mb-8">
                    <button
                        onClick={() => setOnlyMilitary(v => !v)}
                        className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all duration-300 ${onlyMilitary 
                            ? 'bg-orange-500/10 border-orange-500/40 shadow-lg shadow-orange-500/5' 
                            : 'bg-white/5 border-white/8 hover:border-white/15'
                        }`}
                    >
                        <div className="flex items-center gap-3 text-left">
                            <div className={`p-2 rounded-xl transition-colors ${onlyMilitary ? 'bg-orange-500 text-slate-950' : 'bg-white/5 text-slate-400'}`}>
                                <ShieldCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className={`text-sm font-black uppercase tracking-tight ${onlyMilitary ? 'text-orange-400' : 'text-white'}`}>Beneficios Militares</h4>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">Ver solo comercios con descuentos para fuerzas armadas</p>
                            </div>
                        </div>
                        <div className={`w-10 h-5 rounded-full relative transition-colors ${onlyMilitary ? 'bg-orange-500' : 'bg-slate-700'}`}>
                            <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${onlyMilitary ? 'left-6' : 'left-1'}`} />
                        </div>
                    </button>
                </div>

                {/* ── Results count ── */}
                <div className="flex items-center justify-between mb-5">
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                        {sorted.length} {sorted.length === 1 ? 'negocio' : 'negocios'}
                    </p>
                    {hasActiveFilter && (
                        <button
                            onClick={clearAll}
                            className="text-xs font-bold text-amber-500 hover:text-amber-400 transition-colors flex items-center gap-1"
                        >
                            <X className="w-3 h-3" /> Limpiar filtros
                        </button>
                    )}
                </div>

                {/* ── Business Cards ── */}
                {sorted.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                        {sorted.map(business => (
                            <BusinessCard
                                key={business.id}
                                business={business}
                                onOpenProfile={() => setSelectedBusinessId(business.id)}
                                onGoToMap={() => handleGoToMap(business)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="py-20 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 bg-slate-800/60 rounded-[2rem] flex items-center justify-center">
                            <Building2 className="w-7 h-7 text-slate-600" />
                        </div>
                        <p className="text-slate-500 font-bold text-sm">No se encontraron negocios</p>
                        <p className="text-slate-600 text-xs mt-1">
                            {search ? `Sin resultados para "${search}"` : 'Ajusta los filtros para ver más opciones'}
                        </p>
                        {hasActiveFilter && (
                            <button onClick={clearAll} className="mt-4 px-5 py-2 text-xs font-black uppercase tracking-widest bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full hover:bg-amber-500/20 transition-all">
                                Ver todos
                            </button>
                        )}
                    </div>
                )}

                {/* ── Empty state: no premium businesses exist ── */}
                {premiumBusinesses.length === 0 && (
                    <div className="mt-10 p-6 bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/15 rounded-[2.5rem] text-center">
                        <Crown className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                        <h4 className="font-black text-white mb-1">Sé el primero en aparecer aquí</h4>
                        <p className="text-xs text-amber-400/80 leading-relaxed">
                            Actualiza tu negocio a un plan Premium o Pro para que aparezca en esta sección.
                        </p>
                    </div>
                )}
            </div>

            {/* ── Business Detail Modal ── */}
            <PublicProfileModal
                isOpen={!!selectedBusinessId}
                onClose={() => setSelectedBusinessId(null)}
                businessId={selectedBusinessId ?? undefined}
            />
        </div>
    );
};
