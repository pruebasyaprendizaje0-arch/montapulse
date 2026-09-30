import React, { useState } from 'react';
import {
    Eye, TrendingUp, Users, Zap, Star, BarChart2, Activity,
    Edit3, Sparkles, Ticket, QrCode, CalendarCheck, Link,
    Store, CheckCircle, Plus, ExternalLink, Share2,
    ArrowUpRight, Calendar, Clock, Award, Navigation, Copy, CheckCheck
} from 'lucide-react';
import { Business, SubscriptionPlan } from '../../types';
import { MAP_ICONS, SECTOR_INFO, BASE_URL } from '../../constants';
import { EventCard } from '../EventCard';
import { MontanitaEvent } from '../../types';

interface BusinessDashboardProps {
    biz: Business;
    businessEvents: MontanitaEvent[];
    businessFollowers: string[];
    availableCredits: number;
    planCreditsLimit: number | null;
    creditsRemaining: number | null;
    isPremium: boolean;
    referredBusinesses: Business[];
    onEditBusiness: () => void;
    onViewProfile: () => void;
    onShareBusiness: () => void;
    onOpenAIMarketing: () => void;
    onOpenCouponManager: () => void;
    onOpenQR: () => void;
    onCreateEvent: () => void;
    onViewEvent: (event: MontanitaEvent) => void;
    onOpenReferrals: () => void;
    onNavigatePlans: () => void;
    onOpenBusinessOS?: () => void;
    showCopied?: boolean;
}

type DashTab = 'metricas' | 'herramientas' | 'eventos';

export const BusinessDashboard: React.FC<BusinessDashboardProps> = ({
    biz,
    businessEvents,
    businessFollowers,
    availableCredits,
    planCreditsLimit,
    creditsRemaining,
    isPremium,
    referredBusinesses,
    onEditBusiness,
    onViewProfile,
    onShareBusiness,
    onOpenAIMarketing,
    onOpenCouponManager,
    onOpenQR,
    onCreateEvent,
    onViewEvent,
    onOpenReferrals,
    onNavigatePlans,
    onOpenBusinessOS,
    showCopied,
}) => {
    const [activeTab, setActiveTab] = useState<DashTab>('metricas');

    const getCategoryEmoji = (category: string) => {
        const cat = (category || '').toLowerCase();
        const icon = MAP_ICONS.find(i => i.label.toLowerCase() === cat || i.id === cat);
        if (icon) return icon.emoji;
        if (cat.includes('restaurante') || cat.includes('comida')) return '🍕';
        if (cat.includes('fiesta') || cat.includes('discoteca') || cat.includes('bar')) return '🍹';
        if (cat.includes('hospedaje') || cat.includes('hotel') || cat.includes('hostal')) return '🏨';
        if (cat.includes('surf')) return '🏄';
        return '🏷️';
    };

    const totalViews = biz.viewCount || 0;
    const monthlyViews = biz.monthlyViews || 0;
    const totalClicks = businessEvents.reduce((s, e) => s + (e.clickCount || 0), 0);
    const totalInterest = businessEvents.reduce((s, e) => s + Math.max(0, e.interestedCount || 0), 0);
    const followersCount = businessFollowers.length;
    const eventsCount = businessEvents.length;
    const referralsCount = referredBusinesses.length;

    const TABS: { id: DashTab; label: string; icon: any }[] = [
        { id: 'metricas', label: 'Métricas', icon: BarChart2 },
        { id: 'herramientas', label: 'Herramientas', icon: Zap },
        { id: 'eventos', label: `Eventos (${eventsCount})`, icon: Calendar },
    ];

    const TOOLS = [
        {
            label: 'Reservas & Turnos OS',
            desc: 'Gestión de unidades y turnos',
            icon: CalendarCheck,
            color: 'from-teal-500 to-emerald-600',
            shadow: 'shadow-teal-500/30',
            action: onOpenBusinessOS,
        },
        {
            label: 'Editar Negocio',
            desc: 'Fotos, descripción, horarios',
            icon: Edit3,
            color: 'from-orange-500 to-amber-500',
            shadow: 'shadow-orange-500/20',
            action: onEditBusiness,
        },
        {
            label: 'Asistente IA',
            desc: 'Marketing y contenido',
            icon: Sparkles,
            color: 'from-indigo-500 to-purple-500',
            shadow: 'shadow-indigo-500/20',
            action: onOpenAIMarketing,
        },
        {
            label: 'Mis Cupones',
            desc: 'Gestionar promociones',
            icon: Ticket,
            color: 'from-emerald-500 to-teal-500',
            shadow: 'shadow-emerald-500/20',
            action: onOpenCouponManager,
        },
        {
            label: 'Código QR',
            desc: 'QR oficial del negocio',
            icon: QrCode,
            color: 'from-sky-500 to-blue-600',
            shadow: 'shadow-sky-500/20',
            action: onOpenQR,
        },
        {
            label: 'Vista Previa',
            desc: 'Ver como cliente',
            icon: Eye,
            color: 'from-slate-600 to-slate-700',
            shadow: 'shadow-slate-500/10',
            action: onViewProfile,
        },
        {
            label: showCopied ? '¡Enlace Copiado!' : 'Compartir',
            desc: 'Copiar link del negocio',
            icon: showCopied ? CheckCheck : Share2,
            color: showCopied ? 'from-emerald-500 to-green-600' : 'from-rose-500 to-pink-600',
            shadow: 'shadow-rose-500/20',
            action: onShareBusiness,
        },
        {
            label: 'Crear Evento',
            desc: creditsRemaining !== null && creditsRemaining <= 0 ? 'Sin créditos' : `${creditsRemaining !== null ? creditsRemaining : '∞'} créditos`,
            icon: Plus,
            color: creditsRemaining !== null && creditsRemaining <= 0 ? 'from-slate-700 to-slate-800' : 'from-amber-500 to-orange-500',
            shadow: 'shadow-amber-500/20',
            action: creditsRemaining !== null && creditsRemaining <= 0 ? onNavigatePlans : onCreateEvent,
        },
        {
            label: 'Mis Sugeridos',
            desc: `${referralsCount} negocios referidos`,
            icon: Users,
            color: 'from-pink-500 to-rose-500',
            shadow: 'shadow-pink-500/10',
            action: onOpenReferrals,
        },
    ];

    const METRICS = [
        { label: 'Vistas este mes', value: monthlyViews, total: totalViews, icon: Eye, color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', badge: 'Total: ' + totalViews },
        { label: 'Seguidores', value: followersCount, total: null, icon: Users, color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20', badge: null },
        { label: 'Interés en eventos', value: totalInterest, total: null, icon: TrendingUp, color: 'text-sky-400', bg: 'bg-sky-500/10 border-sky-500/20', badge: null },
        { label: 'Clicks en eventos', value: totalClicks, total: null, icon: Activity, color: 'text-emerald-400', bg: 'bg-emerald-500/10 border-emerald-500/20', badge: null },
        { label: 'Eventos creados', value: eventsCount, total: null, icon: Calendar, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', badge: null },
        { label: 'Referidos', value: referralsCount, total: null, icon: Star, color: 'text-pink-400', bg: 'bg-pink-500/10 border-pink-500/20', badge: null },
    ];

    return (
        <div className="w-full rounded-[2rem] overflow-hidden bg-[#0d0d0d] border border-white/8 shadow-2xl">
            {/* Business Header */}
            <div className="relative overflow-hidden">
                {/* Cover image */}
                <div className="absolute inset-0">
                    <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover opacity-20" />
                    <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-[#0d0d0d]/80 to-[#0d0d0d]" />
                </div>

                <div className="relative p-5 sm:p-6">
                    {/* Plan badge + quick actions */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-2">
                            <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                                isPremium
                                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400'
                                    : 'bg-white/5 border-white/10 text-slate-400'
                            }`}>
                                {isPremium ? '⚡ Plan Activo' : '🔓 Plan Gratuito'}
                            </div>
                            {biz.isVerified && (
                                <div className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center gap-1">
                                    <CheckCircle className="w-3 h-3 text-sky-400" />
                                    <span className="text-[9px] font-black text-sky-400 uppercase">Verificado</span>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={onNavigatePlans}
                            className="px-3 py-1.5 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full text-[10px] font-black text-black uppercase tracking-wider hover:scale-105 active:scale-95 transition-all shadow-lg shadow-amber-500/20 flex items-center gap-1"
                        >
                            <Zap className="w-3 h-3 fill-current" />
                            {isPremium ? 'Ver Plan' : 'Mejorar'}
                        </button>
                    </div>

                    {/* Business identity */}
                    <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-2xl bg-black/60 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center shadow-xl">
                            {biz.icon ? (
                                (biz.icon.startsWith('http') || biz.icon.startsWith('data:image')) ? (
                                    <img src={biz.icon} alt="Icon" className="w-full h-full object-cover" />
                                ) : (
                                    <span className="text-3xl">{MAP_ICONS.find(i => i.id === biz.icon || i.emoji === biz.icon)?.emoji || biz.icon}</span>
                                )
                            ) : (
                                <Store className="w-8 h-8 text-orange-500" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                                <h2 className="text-xl font-black text-white truncate leading-tight">{biz.name}</h2>
                            </div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-black text-slate-400 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
                                    {getCategoryEmoji(biz.category)} {biz.category}
                                </span>
                                <span className="text-[10px] font-black text-slate-400 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
                                    {SECTOR_INFO[biz.sector as any]?.symbol || '📍'} {biz.sector}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Business OS Quick Access Banner */}
                    <div className="mt-4 p-3.5 rounded-2xl bg-gradient-to-r from-teal-500/20 via-emerald-500/10 to-teal-500/5 border border-teal-500/30 flex items-center justify-between backdrop-blur-md">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-teal-500 text-slate-950 flex items-center justify-center font-black shadow-lg shadow-teal-500/30">
                                <CalendarCheck className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="text-xs font-black text-white uppercase tracking-wider leading-tight">Gestión de Reservas & Turnos OS</h4>
                                <p className="text-[10px] font-bold text-teal-300">Habitaciones, disponibilidades, calendarios y clientes</p>
                            </div>
                        </div>
                        <button
                            onClick={onOpenBusinessOS}
                            className="px-3.5 py-2 bg-teal-500 hover:bg-teal-400 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md shadow-teal-500/20 shrink-0"
                        >
                            Abrir OS →
                        </button>
                    </div>

                    {/* Credits bar */}
                    <div className="mt-4 flex items-center gap-3 p-3 rounded-2xl bg-white/5 border border-white/10">
                        <Zap className={`w-4 h-4 shrink-0 ${creditsRemaining !== null && creditsRemaining <= 1 ? 'text-rose-400' : 'text-amber-400'}`} />
                        <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Créditos de Evento</p>
                            {planCreditsLimit === null ? (
                                <div className="w-full h-1.5 rounded-full bg-emerald-500/30">
                                    <div className="h-full w-full rounded-full bg-emerald-500 animate-pulse" />
                                </div>
                            ) : (
                                <div className="w-full h-1.5 rounded-full bg-white/10">
                                    <div
                                        className={`h-full rounded-full transition-all ${creditsRemaining !== null && creditsRemaining <= 1 ? 'bg-rose-500' : 'bg-amber-500'}`}
                                        style={{ width: planCreditsLimit > 0 ? `${Math.min(100, (availableCredits / planCreditsLimit) * 100)}%` : '0%' }}
                                    />
                                </div>
                            )}
                        </div>
                        <span className={`text-xs font-black shrink-0 ${creditsRemaining !== null && creditsRemaining <= 1 ? 'text-rose-400' : 'text-amber-400'}`}>
                            {planCreditsLimit === null ? '∞' : `${availableCredits}/${planCreditsLimit}`}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-white/8 bg-black/40">
                {TABS.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-[11px] font-black uppercase tracking-wider transition-all ${
                            activeTab === tab.id
                                ? 'text-orange-400 border-b-2 border-orange-500 bg-orange-500/5'
                                : 'text-slate-600 hover:text-slate-400'
                        }`}
                    >
                        <tab.icon className="w-3.5 h-3.5" />
                        <span className="hidden sm:block">{tab.label}</span>
                        <span className="sm:hidden">{tab.id === 'metricas' ? 'Stats' : tab.id === 'herramientas' ? 'Tools' : 'Eventos'}</span>
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div className="p-4 sm:p-5">

                {/* ── MÉTRICAS ── */}
                {activeTab === 'metricas' && (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {METRICS.map((m, i) => (
                                <div key={i} className={`p-4 rounded-2xl border ${m.bg} flex flex-col gap-2`}>
                                    <div className={`flex items-center gap-1.5 ${m.color}`}>
                                        <m.icon className="w-3.5 h-3.5" />
                                        <span className="text-[9px] font-black uppercase tracking-widest">{m.label}</span>
                                    </div>
                                    <span className="text-2xl font-black text-white leading-none">{m.value.toLocaleString()}</span>
                                    {m.badge && (
                                        <span className="text-[9px] font-bold text-slate-500">{m.badge}</span>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Performance summary */}
                        <div className="p-4 rounded-2xl bg-white/3 border border-white/8 space-y-3">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resumen de Rendimiento</p>
                            {[
                                { label: 'Visibilidad mensual', value: monthlyViews, max: Math.max(monthlyViews * 1.5, 100), color: 'bg-orange-500' },
                                { label: 'Engagement (interés/views)', value: totalViews > 0 ? Math.round((totalInterest / Math.max(totalViews, 1)) * 100) : 0, max: 100, color: 'bg-sky-500', pct: true },
                                { label: 'Conversión (clicks/interés)', value: totalInterest > 0 ? Math.round((totalClicks / Math.max(totalInterest, 1)) * 100) : 0, max: 100, color: 'bg-emerald-500', pct: true },
                            ].map((bar, i) => (
                                <div key={i} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-bold text-slate-400">{bar.label}</span>
                                        <span className="text-[10px] font-black text-white">{bar.value}{bar.pct ? '%' : ''}</span>
                                    </div>
                                    <div className="h-1.5 w-full rounded-full bg-white/5">
                                        <div
                                            className={`h-full rounded-full ${bar.color} transition-all duration-700`}
                                            style={{ width: `${Math.min(100, (bar.value / (bar.max || 1)) * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {!isPremium && (
                            <button
                                onClick={onNavigatePlans}
                                className="w-full py-3 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/20 flex items-center justify-center gap-2 text-[11px] font-black text-amber-400 uppercase tracking-wider hover:bg-amber-500/15 transition-all"
                            >
                                <Zap className="w-3.5 h-3.5 fill-current" />
                                Desbloquear Métricas Avanzadas con Pro
                                <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                )}

                {/* ── HERRAMIENTAS ── */}
                {activeTab === 'herramientas' && (
                    <div className="grid grid-cols-2 gap-3">
                        {TOOLS.map((tool, i) => (
                            <button
                                key={i}
                                onClick={tool.action}
                                className="group relative overflow-hidden rounded-2xl p-4 flex flex-col items-start gap-3 bg-white/3 border border-white/8 hover:border-white/15 hover:bg-white/6 transition-all active:scale-[0.97] text-left"
                            >
                                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${tool.color} flex items-center justify-center shadow-lg ${tool.shadow} group-hover:scale-110 transition-transform duration-300`}>
                                    <tool.icon className="w-5 h-5 text-white" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs font-black text-white leading-tight mb-0.5">{tool.label}</p>
                                    <p className="text-[9px] font-bold text-slate-500 leading-tight">{tool.desc}</p>
                                </div>
                                <ArrowUpRight className="absolute top-3 right-3 w-3 h-3 text-slate-700 group-hover:text-slate-400 transition-colors" />
                            </button>
                        ))}
                    </div>
                )}

                {/* ── EVENTOS ── */}
                {activeTab === 'eventos' && (
                    <div className="space-y-4">
                        {/* Credits summary + create button */}
                        <div className="flex items-center justify-between gap-3">
                            <div className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black uppercase ${
                                planCreditsLimit === null
                                    ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                                    : creditsRemaining !== null && creditsRemaining <= 1
                                        ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                                        : 'bg-orange-500/10 border-orange-500/20 text-orange-400'
                            }`}>
                                <Zap className="w-3.5 h-3.5" />
                                {planCreditsLimit === null ? 'Ilimitados' : `${availableCredits} créditos`}
                            </div>
                            <button
                                onClick={() => {
                                    if (creditsRemaining !== null && creditsRemaining <= 0) {
                                        onNavigatePlans();
                                    } else {
                                        onCreateEvent();
                                    }
                                }}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:brightness-110 shadow-lg shadow-orange-500/20 active:scale-95 cursor-pointer"
                            >
                                <Plus className="w-4 h-4" />
                                Crear Evento
                            </button>
                        </div>

                        {/* Events list */}
                        {businessEvents.length > 0 ? (
                            <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
                                {businessEvents.map(event => (
                                    <div key={event.id} className="min-w-[240px] w-[240px] shrink-0">
                                        <EventCard event={event} onClick={onViewEvent} />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-10 flex flex-col items-center justify-center gap-3 bg-white/2 rounded-2xl border border-dashed border-white/10">
                                <Sparkles className="w-8 h-8 text-slate-700" />
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Sin eventos aún</p>
                                <button
                                    onClick={onCreateEvent}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20 active:scale-95"
                                >
                                    <Plus className="w-4 h-4" />
                                    Crear Primer Evento
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default BusinessDashboard;
