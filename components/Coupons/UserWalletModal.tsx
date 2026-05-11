import React, { useState, useEffect } from 'react';
import { X, Wallet, Ticket, Clock, CheckCircle, AlertCircle, QrCode, Tag, Loader2, Calendar, Store } from 'lucide-react';
import { subscribeToUserWallet } from '../../services/couponService';
import { CouponRedemption } from '../../types';

// Conditional QR import
import { QRCodeSVG } from 'qrcode.react';


interface UserWalletModalProps {
    isOpen: boolean;
    onClose: () => void;
    userId: string;
    initialRedemptionId?: string | null;
}

export const UserWalletModal: React.FC<UserWalletModalProps> = ({ isOpen, onClose, userId, initialRedemptionId }) => {
    const [redemptions, setRedemptions] = useState<CouponRedemption[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'reserved' | 'redeemed' | 'expired' | 'cancelled'>('reserved');
    const [selectedRedemption, setSelectedRedemption] = useState<CouponRedemption | null>(null);

    useEffect(() => {
        if (isOpen && userId) {
            setLoading(true);
            const unsubscribe = subscribeToUserWallet(userId, (data) => {
                setRedemptions(data);
                
                // Prioritize initialRedemptionId if provided
                if (initialRedemptionId) {
                    const found = data.find(r => r.id === initialRedemptionId);
                    if (found) {
                        setSelectedRedemption(found);
                        setFilter(found.status);
                    }
                } else if (data.length > 0 && !selectedRedemption) {
                    const active = data.find(r => r.status === 'reserved');
                    if (active) setSelectedRedemption(active);
                }
                setLoading(false);
            });
            return () => unsubscribe();
        }
    }, [isOpen, userId, initialRedemptionId]);

    const filteredRedemptions = redemptions.filter(r => r.status === filter);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col h-[85vh] animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-orange-600/20 to-amber-500/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Wallet className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Mi Billetera</h2>
                            <p className="text-orange-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Cupones y Recompensas</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="px-8 py-4 border-b border-white/5 flex gap-2 overflow-x-auto no-scrollbar shrink-0 bg-black/20">
                    {(['reserved', 'redeemed', 'expired'] as const).map((t) => (
                        <button
                            key={t}
                            onClick={() => { setFilter(t); setSelectedRedemption(null); }}
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${
                                filter === t 
                                ? 'bg-orange-500 text-black shadow-lg shadow-orange-500/20' 
                                : 'bg-white/5 text-slate-400 hover:bg-white/10'
                            }`}
                        >
                            {t === 'reserved' ? 'Activos' : t === 'redeemed' ? 'Usados' : 'Vencidos'}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                    {/* List */}
                    <div className={`flex-1 overflow-y-auto p-6 space-y-4 ${selectedRedemption ? 'hidden md:block md:border-r md:border-white/5' : 'block'}`}>
                        {loading ? (
                            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
                                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                <p className="text-xs font-bold uppercase tracking-widest">Cargando billetera...</p>
                            </div>
                        ) : filteredRedemptions.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-center px-10">
                                <div className="w-20 h-20 bg-white/5 rounded-[2rem] flex items-center justify-center mb-6">
                                    <Ticket className="w-10 h-10 text-slate-700" />
                                </div>
                                <h3 className="text-lg font-black text-white mb-2">No hay cupones aquí</h3>
                                <p className="text-xs text-slate-500 leading-relaxed">
                                    {filter === 'reserved' 
                                        ? 'Explora los negocios cercanos para obtener nuevos descuentos.' 
                                        : 'Aquí aparecerá tu historial de cupones.'}
                                </p>
                            </div>
                        ) : (
                            filteredRedemptions.map((redemption) => (
                                <div 
                                    key={redemption.id}
                                    onClick={() => setSelectedRedemption(redemption)}
                                    className={`group relative p-5 rounded-[2rem] border transition-all cursor-pointer ${
                                        selectedRedemption?.id === redemption.id
                                        ? 'bg-orange-500/10 border-orange-500/30'
                                        : 'bg-white/5 border-white/5 hover:border-white/10 hover:bg-white/[0.07]'
                                    }`}
                                >
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">
                                                {redemption.couponCode}
                                            </p>
                                            <h4 className="text-sm font-black text-white leading-tight">
                                                {redemption.couponValue}{redemption.couponType === 'percentage' ? '% OFF' : '$ OFF'}
                                            </h4>
                                        </div>
                                        <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-tighter ${
                                            redemption.status === 'reserved' ? 'bg-emerald-500/20 text-emerald-400' :
                                            redemption.status === 'redeemed' ? 'bg-sky-500/20 text-sky-400' :
                                            'bg-rose-500/20 text-rose-400'
                                        }`}>
                                            {redemption.status === 'reserved' ? 'Listo para usar' : 
                                             redemption.status === 'redeemed' ? 'Canjeado' : 'Expirado'}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 mt-4 text-slate-500">
                                        <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                                            {redemption.businessLogo ? (
                                                <img src={redemption.businessLogo} className="w-3 h-3 rounded-full object-cover" alt="" />
                                            ) : (
                                                <Store className="w-3 h-3" />
                                            )}
                                            <span className="text-[9px] font-bold truncate max-w-[100px]">{redemption.businessName || 'Negocio'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 bg-black/20 px-2.5 py-1 rounded-lg">
                                            <Clock className="w-3 h-3" />
                                            <span className="text-[9px] font-bold">
                                                {redemption.expiresAt ? new Date(redemption.expiresAt.seconds * 1000).toLocaleDateString() : 'Hoy'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Details / QR Display */}
                    <div className={`flex-1 overflow-y-auto p-8 bg-black/30 transition-all ${selectedRedemption ? 'block' : 'hidden md:flex items-center justify-center'}`}>
                        {selectedRedemption ? (
                            <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
                                <button 
                                    onClick={() => setSelectedRedemption(null)}
                                    className="md:hidden mb-4 flex items-center gap-2 text-slate-400 text-[10px] font-black uppercase tracking-widest"
                                >
                                    <X className="w-4 h-4" /> Volver
                                </button>

                                <div className="text-center">
                                    <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl mb-4 bg-orange-500/10 border border-orange-500/20">
                                        <span className="text-3xl font-black text-orange-400">
                                            {selectedRedemption.couponValue}{selectedRedemption.couponType === 'percentage' ? '% OFF' : '$ OFF'}
                                        </span>
                                    </div>
                                    <h3 className="text-lg font-black text-white uppercase tracking-tight">Cupón de Descuento</h3>
                                    <p className="text-[10px] font-bold text-slate-500 mt-1 uppercase tracking-widest">
                                        Válido en el local físico
                                    </p>
                                </div>

                                {/* QR Code Section */}
                                {selectedRedemption.status === 'reserved' && (
                                    <div className="space-y-6">
                                        <div className="flex justify-center">
                                            <div className="bg-white p-5 rounded-[2.5rem] shadow-2xl">
                                                {QRCodeSVG ? (
                                                    <QRCodeSVG 
                                                        value={JSON.stringify({
                                                            redemptionId: selectedRedemption.id,
                                                            code: selectedRedemption.reservationCode,
                                                            userId: selectedRedemption.userId
                                                        })} 
                                                        size={200} 
                                                        level="H" 
                                                    />
                                                ) : (
                                                    <div className="w-[200px] h-[200px] flex items-center justify-center bg-slate-100 rounded-3xl">
                                                        <QrCode className="w-12 h-12 text-slate-300" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-white/5 rounded-[2rem] p-6 border border-white/5 text-center relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 to-amber-500" />
                                            <p className="text-[8px] font-black text-slate-500 uppercase tracking-[0.3em] mb-2">Código de Validación</p>
                                            <p className="text-3xl font-black text-white font-mono tracking-[0.25em]">
                                                {selectedRedemption.reservationCode}
                                            </p>
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <Calendar className="w-4 h-4 text-slate-400" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Obtenido el</span>
                                                </div>
                                                <span className="text-[10px] font-black text-white">
                                                    {selectedRedemption.reservedAt ? new Date(selectedRedemption.reservedAt.seconds * 1000).toLocaleDateString() : 'Hoy'}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
                                                <div className="flex items-center gap-3">
                                                    <Clock className="w-4 h-4 text-rose-400" />
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase">Expira el</span>
                                                </div>
                                                <span className="text-[10px] font-black text-rose-400">
                                                    {selectedRedemption.expiresAt ? new Date(selectedRedemption.expiresAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                                                </span>
                                            </div>
                                        </div>

                                        <p className="text-[9px] text-slate-500 text-center leading-relaxed px-10 italic">
                                            Muestra este código al personal del establecimiento para validar tu descuento.
                                        </p>
                                    </div>
                                )}

                                {selectedRedemption.status === 'redeemed' && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-6 border border-emerald-500/20">
                                            <CheckCircle className="w-10 h-10 text-emerald-400" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2">¡Canjeado Exitosamente!</h3>
                                        <p className="text-xs text-slate-500 px-12">
                                            Este cupón ya fue utilizado.
                                        </p>
                                    </div>
                                )}

                                {selectedRedemption.status === 'expired' && (
                                    <div className="py-12 flex flex-col items-center justify-center text-center">
                                        <div className="w-20 h-20 bg-rose-500/10 rounded-full flex items-center justify-center mb-6 border border-rose-500/20">
                                            <AlertCircle className="w-10 h-10 text-rose-400" />
                                        </div>
                                        <h3 className="text-xl font-black text-white mb-2">Cupón Expirado</h3>
                                        <p className="text-xs text-slate-500 px-12">
                                            El plazo para utilizar este cupón ha vencido.
                                        </p>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="text-center p-12">
                                <div className="w-24 h-24 bg-white/5 rounded-[3rem] flex items-center justify-center mx-auto mb-6">
                                    <Tag className="w-10 h-10 text-slate-700" />
                                </div>
                                <h3 className="text-sm font-black text-white uppercase tracking-widest mb-2 opacity-50">Selecciona un cupón</h3>
                                <p className="text-[10px] text-slate-600 max-w-[200px] mx-auto leading-relaxed uppercase font-bold">
                                    Para ver los detalles de validación y el código QR
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
