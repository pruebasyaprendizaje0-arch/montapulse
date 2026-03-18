import React, { useState, useMemo } from 'react';
import { X, Zap, Gift, Percent, Calendar, MapPin, Star, Clock, ArrowRight, Crown, Filter } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuthContext } from '../../context/AuthContext';
import { format, isToday, isTomorrow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PulsePassModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectEvent?: (event: any) => void;
}

export const PulsePassModal: React.FC<PulsePassModalProps> = ({ isOpen, onClose, onSelectEvent }) => {
    const { user } = useAuthContext();
    const { events, businesses } = useData();
    const [filter, setFilter] = useState<'all' | 'today' | 'upcoming'>('all');

    const premiumBusinesses = useMemo(() => {
        return businesses.filter(b => b.plan === 'Premium');
    }, [businesses]);

    const exclusiveOffers = useMemo(() => {
        let offers = events.filter(e => e.isFlashOffer || e.isPremium);
        
        if (filter === 'today') {
            offers = offers.filter(e => isToday(new Date(e.startAt)));
        } else if (filter === 'upcoming') {
            offers = offers.filter(e => new Date(e.startAt) > new Date());
        }
        
        return offers.sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    }, [events, filter]);

    const formatEventDate = (date: Date | string) => {
        const d = new Date(date);
        if (isToday(d)) return `Hoy ${format(d, 'HH:mm')}`;
        if (isTomorrow(d)) return `Mañana ${format(d, 'HH:mm')}`;
        return format(d, 'dd MMM, HH:mm', { locale: es });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2100] bg-black/80 backdrop-blur-xl flex items-center justify-center p-4">
            <div 
                className="absolute inset-0" 
                onClick={onClose}
            />
            
            <div className="relative w-full max-w-lg bg-[#111111] rounded-[3rem] border border-orange-500/20 shadow-2xl shadow-orange-500/10 max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="p-6 bg-gradient-to-r from-orange-600/20 to-amber-600/20 border-b border-orange-500/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                                <Crown className="w-7 h-7 text-white" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight">Pulse Pass</h2>
                                <p className="text-xs font-bold text-orange-400 uppercase tracking-widest">Ofertas Exclusivas</p>
                            </div>
                        </div>
                        <button 
                            onClick={onClose}
                            className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* User Status */}
                <div className="px-6 py-4 bg-black/40 border-b border-white/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <Zap className="w-5 h-5 text-orange-500" />
                            <span className="text-sm font-bold text-white">
                                {user?.pulsePassActive ? (
                                    <span className="text-emerald-400">✓ Miembro Activo</span>
                                ) : (
                                    <span className="text-slate-500">Activa tu Pulse Pass</span>
                                )}
                            </span>
                        </div>
                        {user?.pulsePassActive && (
                            <div className="px-3 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 rounded-full">
                                <span className="text-[10px] font-black text-white uppercase">Activo</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Filters */}
                <div className="px-6 py-3 border-b border-white/5 flex gap-2">
                    {[
                        { id: 'all', label: 'Todas' },
                        { id: 'today', label: 'Hoy' },
                        { id: 'upcoming', label: 'Próximas' }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                                filter === f.id 
                                    ? 'bg-orange-500 text-white' 
                                    : 'bg-white/5 text-slate-500 hover:text-white'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Offers List */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {exclusiveOffers.length > 0 ? (
                        exclusiveOffers.map(offer => {
                            const business = businesses.find(b => b.id === offer.businessId);
                            const isPremium = business?.plan === 'Premium';
                            
                            return (
                                <div 
                                    key={offer.id}
                                    onClick={() => { onSelectEvent?.(offer); onClose(); }}
                                    className="p-4 bg-gradient-to-r from-slate-900/80 to-black/80 rounded-2xl border border-white/5 hover:border-orange-500/30 transition-all group cursor-pointer"
                                >
                                    <div className="flex gap-4">
                                        <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0">
                                            <img 
                                                src={offer.imageUrl} 
                                                alt={offer.title}
                                                className="w-full h-full object-cover"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <h4 className="text-sm font-black text-white uppercase tracking-tight leading-tight">
                                                    {offer.title}
                                                </h4>
                                                {isPremium && (
                                                    <span className="shrink-0 px-2 py-0.5 bg-amber-500/20 border border-amber-500/30 rounded-lg">
                                                        <Crown className="w-3 h-3 text-amber-400" />
                                                    </span>
                                                )}
                                            </div>
                                            
                                            {business && (
                                                <p className="text-[10px] text-orange-400 font-bold uppercase mt-1">
                                                    {business.name}
                                                </p>
                                            )}
                                            
                                            <div className="flex items-center gap-3 mt-2">
                                                <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                                    <Calendar className="w-3 h-3" />
                                                    {formatEventDate(offer.startAt)}
                                                </div>
                                                {offer.isFlashOffer && (
                                                    <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[8px] font-black uppercase rounded-full flex items-center gap-1">
                                                        <Zap className="w-2.5 h-2.5" />
                                                        Flash
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    
                                    <div className="mt-3 pt-3 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex items-center gap-1 text-[9px] text-slate-500">
                                            <MapPin className="w-3 h-3" />
                                            {offer.locality || 'Montañita'}
                                        </div>
                                        <div className="flex items-center gap-1 text-orange-400 text-[10px] font-bold group-hover:translate-x-1 transition-transform">
                                            Ver detalle <ArrowRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="py-16 text-center">
                            <div className="w-20 h-20 bg-slate-900 rounded-[2.5rem] flex items-center justify-center mx-auto mb-4 border border-white/5">
                                <Gift className="w-10 h-10 text-slate-700" />
                            </div>
                            <p className="text-sm font-black text-slate-500 uppercase tracking-widest">No hay ofertas ahora</p>
                            <p className="text-[10px] text-slate-600 mt-2">Vuelve más tarde para nuevas ofertas</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-white/5 bg-black/40">
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>{exclusiveOffers.length} ofertas disponibles</span>
                        <span className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-500" />
                            Actualizado ahora
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
};
