import React, { useMemo, useState } from 'react';
import { X, MapPin, Star, Search, ArrowRight, Waves, TreePine, Store, Hotel } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { SubscriptionPlan, BusinessCategory } from '../types';
import { LOCALITIES } from '../constants';

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
    BusinessCategory.HOSTAL
];

export const InfoPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        businesses,
        currentLocality,
        setCurrentLocality,
        setShowPublicProfile,
        setPublicProfileId,
        setPublicProfileType
    } = useData();

    const [searchQuery, setSearchQuery] = useState('');

    const localityName = currentLocality?.name || 'Montañita';

    const allBusinesses = useMemo(() => {
        let all = businesses || [];
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            all = all.filter((b: any) => {
                try {
                    const nameMatch = b.name && b.name.toLowerCase().includes(q);
                    const categoryMatch = b.category && b.category.toLowerCase().includes(q);
                    const sectorMatch = b.sector && b.sector.toLowerCase().includes(q);
                    const descMatch = b.description && b.description.toLowerCase().includes(q);
                    const localityMatch = b.locality && b.locality.toLowerCase().includes(q);
                    return nameMatch || categoryMatch || sectorMatch || descMatch || localityMatch;
                } catch (e) {
                    return false;
                }
            });
        }
        return all;
    }, [businesses, searchQuery]);

    const referencePoints = useMemo(() => {
        return allBusinesses.filter((b: any) => REFERENCE_CATEGORIES.includes(b.category));
    }, [allBusinesses]);

    const premiumBusinesses = useMemo(() => {
        return allBusinesses.filter((b: any) => b.plan === SubscriptionPlan.PREMIUM);
    }, [allBusinesses]);

    const otherBusinesses = useMemo(() => {
        return allBusinesses.filter((b: any) => 
            !REFERENCE_CATEGORIES.includes(b.category) && 
            b.plan !== SubscriptionPlan.PREMIUM
        );
    }, [allBusinesses]);

    const handleBusinessClick = (id: string) => {
        setPublicProfileId(id);
        setPublicProfileType('business');
        setShowPublicProfile(true);
    };

    const getCategoryIcon = (category: string) => {
        if (category === BusinessCategory.PLAYA || category === 'Playa') return <Waves className="w-5 h-5 text-sky-400" />;
        if (category === BusinessCategory.HOTEL || category === BusinessCategory.HOSTAL || category === 'Hotel' || category === 'Hostal') return <Hotel className="w-5 h-5 text-amber-400" />;
        if (category === BusinessCategory.PARQUE || category === 'Parque') return <TreePine className="w-5 h-5 text-emerald-400" />;
        return <MapPin className="w-5 h-5 text-slate-400" />;
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] overflow-hidden">
            <div className="p-6 border-b border-white/5">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h1 className="text-3xl font-black text-amber-400 uppercase tracking-tight">★ INFO {localityName}</h1>
                        <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Puntos de Referencia y Negocios Premium</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <select
                            value={currentLocality?.name || 'Montañita'}
                            onChange={(e) => {
                                const loc = LOCALITIES.find(l => l.name === e.target.value);
                                if (loc) setCurrentLocality(loc);
                            }}
                            className="bg-white/5 border border-white/10 text-white text-xs font-black uppercase tracking-widest px-3 py-2 rounded-xl cursor-pointer hover:bg-white/10 transition-all"
                        >
                            {LOCALITIES.map(l => (
                                <option key={l.name} value={l.name} className="bg-slate-900">{l.name}</option>
                            ))}
                        </select>
                        <button
                            onClick={() => navigate('/explore')}
                            className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar negocios, referencias..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 transition-all"
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {premiumBusinesses.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">★ DESTACADOS</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                        </div>
                        <div className="space-y-3">
                            {premiumBusinesses.map((biz: any) => (
                                <div
                                    key={biz.id}
                                    onClick={() => handleBusinessClick(biz.id)}
                                    className="p-4 rounded-[2rem] bg-black/40 border border-amber-500/20 hover:border-amber-500/50 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                                            {biz.imageUrl ? (
                                                <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Star className="w-6 h-6 text-amber-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-sm font-black text-white truncate">{biz.name}</h4>
                                                <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-medium text-amber-400 uppercase bg-amber-500/20 px-2 py-0.5 rounded-lg">
                                                    {biz.category}
                                                </span>
                                                {biz.sector && (
                                                    <span className="text-[9px] text-slate-500">
                                                        {biz.sector}
                                                    </span>
                                                )}
                                            </div>
                                            {biz.description && (
                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{biz.description}</p>
                                            )}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {referencePoints.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">📍 PUNTOS DE REFERENCIA</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                        </div>
                        <div className="space-y-3">
                            {referencePoints.map((ref: any) => (
                                <div
                                    key={ref.id}
                                    onClick={() => handleBusinessClick(ref.id)}
                                    className="p-4 rounded-[2rem] bg-black/40 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                                            {ref.imageUrl ? (
                                                <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                            ) : (
                                                getCategoryIcon(ref.category)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-sm font-black text-white truncate">{ref.name}</h4>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-medium text-emerald-400 uppercase bg-emerald-500/20 px-2 py-0.5 rounded-lg">
                                                    {ref.category}
                                                </span>
                                                {ref.sector && (
                                                    <span className="text-[9px] text-slate-500">
                                                        {ref.sector}
                                                    </span>
                                                )}
                                            </div>
                                            {ref.description && (
                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{ref.description}</p>
                                            )}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {otherBusinesses.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em]">🏪 NEGOCIOS</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                        </div>
                        <div className="space-y-3">
                            {otherBusinesses.map((biz: any) => (
                                <div
                                    key={biz.id}
                                    onClick={() => handleBusinessClick(biz.id)}
                                    className="p-4 rounded-[2rem] bg-black/40 border border-white/10 hover:border-orange-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                                            {biz.imageUrl ? (
                                                <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Store className="w-6 h-6 text-orange-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-sm font-black text-white truncate">{biz.name}</h4>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-medium text-orange-400 uppercase bg-orange-500/20 px-2 py-0.5 rounded-lg">
                                                    {biz.category}
                                                </span>
                                                {biz.sector && (
                                                    <span className="text-[9px] text-slate-500">
                                                        {biz.sector}
                                                    </span>
                                                )}
                                                {biz.locality && (
                                                    <span className="text-[9px] text-cyan-400">
                                                        📍 {biz.locality}
                                                    </span>
                                                )}
                                            </div>
                                            {biz.description && (
                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{biz.description}</p>
                                            )}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {referencePoints.length === 0 && premiumBusinesses.length === 0 && otherBusinesses.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-inner">
                            <MapPin className="w-10 h-10 text-slate-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black text-white uppercase tracking-widest italic">SIN INFORMACIÓN</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No hay datos disponibles</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
