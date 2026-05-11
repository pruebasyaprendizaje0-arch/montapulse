import React from 'react';
import { Ticket, Copy, Clock, MapPin, CheckCircle, Percent, DollarSign, AlertTriangle } from 'lucide-react';
import { Coupon } from '../../types';

interface CouponCardProps {
    coupon: Coupon;
    onRedeem?: (coupon: Coupon) => void;
    isOwner?: boolean;
    compact?: boolean;
    pendingCount?: number;
    onShowStats?: (coupon: Coupon, type: 'redeemed' | 'reserved') => void;
}

const getTimeRemaining = (expiresAt: any): string => {
    const expires = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    const now = new Date();
    const diff = expires.getTime() - now.getTime();
    if (diff <= 0) return 'Expirado';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    if (days > 0) return `${days}d ${hours}h restantes`;
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${mins}m restantes`;
};

const isExpired = (expiresAt: any): boolean => {
    const expires = expiresAt?.toDate ? expiresAt.toDate() : new Date(expiresAt);
    return expires <= new Date();
};

export const CouponCard: React.FC<CouponCardProps> = ({ coupon, onRedeem, isOwner = false, compact = false, pendingCount = 0, onShowStats }) => {
    const expired = isExpired(coupon.expiresAt);
    const exhausted = coupon.maxUses > 0 && coupon.currentUses >= coupon.maxUses;
    const available = coupon.isActive && !expired && !exhausted;

    const handleCopy = (e: React.MouseEvent) => {
        e.stopPropagation();
        navigator.clipboard.writeText(coupon.code);
    };

    if (compact) {
        return (
            <button
                onClick={() => available && onRedeem?.(coupon)}
                disabled={!available}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all group ${
                    available
                        ? 'bg-gradient-to-r from-orange-500/10 to-amber-500/5 border-orange-500/20 hover:border-orange-500/40 hover:scale-[1.01] active:scale-[0.99]'
                        : 'bg-white/5 border-white/5 opacity-50'
                }`}
            >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                    available ? 'bg-orange-500/20 text-orange-400' : 'bg-white/5 text-slate-600'
                }`}>
                    <Ticket className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-white truncate">{coupon.code}</span>
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase ${
                            coupon.type === 'percentage' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-sky-500/10 text-sky-400'
                        }`}>
                            {coupon.type === 'percentage' ? `-${coupon.value}%` : `-$${coupon.value}`}
                        </span>
                    </div>
                    {coupon.description && (
                        <p className="text-[9px] text-slate-500 truncate mt-0.5">{coupon.description}</p>
                    )}
                </div>
                {available && (
                    <div className="text-[8px] font-black text-orange-500 uppercase tracking-wider shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        Canjear →
                    </div>
                )}
            </button>
        );
    }

    return (
        <div 
            onClick={() => available && !isOwner && onRedeem?.(coupon)}
            className={`relative overflow-hidden rounded-[2rem] border transition-all ${
            available
                ? `bg-gradient-to-br from-[#0f172a] to-[#1a1a2e] border-orange-500/20 hover:border-orange-500/40 shadow-lg shadow-orange-500/5 ${!isOwner ? 'cursor-pointer hover:scale-[1.01] active:scale-[0.99]' : ''}`
                : 'bg-neutral-900/50 border-white/5 opacity-60'
        }`}>
            {/* Decorative cutout effect */}
            <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1/2 w-6 h-6 rounded-full bg-[#050505] border border-white/10" />
            <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-1/2 w-6 h-6 rounded-full bg-[#050505] border border-white/10" />

            <div className="p-6">
                {/* Header: Discount badge + Status */}
                <div className="flex items-start justify-between mb-4">
                    <div className={`flex items-center gap-2 px-4 py-2 rounded-2xl ${
                        coupon.type === 'percentage'
                            ? 'bg-gradient-to-r from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20'
                            : 'bg-gradient-to-r from-sky-500/20 to-sky-500/5 border border-sky-500/20'
                    }`}>
                        {coupon.type === 'percentage' ? (
                            <Percent className="w-5 h-5 text-emerald-400" />
                        ) : (
                            <DollarSign className="w-5 h-5 text-sky-400" />
                        )}
                        <span className={`text-2xl font-black tracking-tighter ${
                            coupon.type === 'percentage' ? 'text-emerald-400' : 'text-sky-400'
                        }`}>
                            {coupon.type === 'percentage' ? `${coupon.value}%` : `$${coupon.value}`}
                        </span>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[8px] font-black uppercase tracking-widest border ${
                        available
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : expired
                                ? 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                                : 'bg-slate-500/10 text-slate-400 border-white/5'
                    }`}>
                        {available ? 'Activo' : expired ? 'Expirado' : exhausted ? 'Agotado' : 'Inactivo'}
                    </div>
                </div>

                {/* Description */}
                {coupon.description && (
                    <p className="text-xs text-slate-400 mb-4 leading-relaxed">{coupon.description}</p>
                )}

                {/* Dashed divider */}
                <div className="border-t border-dashed border-white/10 my-4 mx-2" />

                {/* Code */}
                <div className="flex items-center justify-between bg-black/40 rounded-2xl px-5 py-3 border border-white/5 mb-4">
                    <div>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Código</p>
                        <p className="text-lg font-black text-white tracking-[0.2em] font-mono">{coupon.code}</p>
                    </div>
                    <button
                        onClick={handleCopy}
                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all active:scale-90"
                        title="Copiar código"
                    >
                        <Copy className="w-4 h-4" />
                    </button>
                </div>

                {/* Meta info */}
                <div className="grid grid-cols-2 gap-2 mb-4">
                    <div className="flex items-center gap-2 text-[9px] text-slate-500">
                        <Clock className="w-3 h-3" />
                        <span className={`font-bold ${!available ? 'text-rose-400' : ''}`}>
                            {getTimeRemaining(coupon.expiresAt)}
                        </span>
                    </div>
                    {coupon.requiresProximity && (
                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                            <MapPin className="w-3 h-3 text-sky-400" />
                            <span className="font-bold">{coupon.proximityRadius || 500}m del local</span>
                        </div>
                    )}
                    {coupon.minPurchase > 0 && (
                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                            <DollarSign className="w-3 h-3" />
                            <span className="font-bold">Min. ${coupon.minPurchase}</span>
                        </div>
                    )}
                    {coupon.maxUses > 0 && (
                        <div className="flex items-center gap-2 text-[9px] text-slate-500">
                            <CheckCircle className="w-3 h-3" />
                            <span className="font-bold">{coupon.currentUses}/{coupon.maxUses} usados</span>
                        </div>
                    )}
                </div>

                {/* Redeem button */}
                {!isOwner && available && onRedeem && (
                    <button
                        onClick={() => onRedeem(coupon)}
                        className="w-full py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2"
                    >
                        <Ticket className="w-4 h-4" />
                        Canjear Cupón
                    </button>
                )}

                {/* Owner stats */}
                {isOwner && (
                    <div className="mt-4 grid grid-cols-2 gap-2">
                        <div 
                            onClick={(e) => { e.stopPropagation(); onShowStats?.(coupon, 'redeemed'); }}
                            className="bg-white/5 hover:bg-white/10 rounded-2xl px-4 py-3 border border-white/5 flex items-center justify-between cursor-pointer transition-all active:scale-95"
                        >
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Canjes</span>
                            <span className="text-sm font-black text-emerald-400">{coupon.currentUses}</span>
                        </div>
                        <div 
                            onClick={(e) => { e.stopPropagation(); onShowStats?.(coupon, 'reserved'); }}
                            className="bg-white/5 hover:bg-white/10 rounded-2xl px-4 py-3 border border-white/5 flex items-center justify-between cursor-pointer transition-all active:scale-95"
                        >
                            <span className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Reservas</span>
                            <span className="text-sm font-black text-amber-400">{pendingCount}</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
