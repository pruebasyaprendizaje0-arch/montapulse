import React, { useState, useEffect, useMemo } from 'react';
import { X, Ticket, CheckCircle, AlertTriangle, Clock, Loader2, ShieldCheck } from 'lucide-react';
import { Coupon } from '../../types';
import { validateCoupon, obtainCoupon } from '../../services/couponService';

import { QRCodeSVG } from 'qrcode.react';

interface CouponRedeemModalProps {
    isOpen: boolean;
    onClose: () => void;
    coupon: Coupon;
    userId: string;
    userName: string;
    userCoords?: [number, number];
}

export const CouponRedeemModal: React.FC<CouponRedeemModalProps> = ({
    isOpen, onClose, coupon, userId, userName, userCoords
}) => {
    const [step, setStep] = useState<'preview' | 'validating' | 'success' | 'error'>('preview');
    const [errorMsg, setErrorMsg] = useState('');
    const [reservationCode, setReservationCode] = useState('');
    const [timeLeft, setTimeLeft] = useState(120); // 2 minutes
    const [isRedeeming, setIsRedeeming] = useState(false);

    // QR payload
    const qrPayload = useMemo(() => JSON.stringify({
        couponId: coupon.id,
        reservationCode: reservationCode,
        userId,
        businessId: coupon.businessId,
        ts: Date.now()
    }), [coupon, userId, reservationCode]);

    // Timer countdown for success/QR view
    useEffect(() => {
        if (step !== 'success') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer);
                    onClose(); // Automatically close when QR expires for security
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [step, onClose]);

    if (!isOpen) return null;

    const handleObtain = async () => {
        setStep('validating');
        try {
            const result = await obtainCoupon(
                coupon.id,
                coupon.code,
                userId,
                userName,
                coupon.businessId
            );

            if (result.success && result.reservationCode) {
                setReservationCode(result.reservationCode);
                setStep('success');
            } else {
                setErrorMsg(result.error || 'No se pudo obtener el cupón');
                setStep('error');
            }
        } catch (err: any) {
            setErrorMsg(err.message || 'Error de conexión');
            setStep('error');
        }
    };


    const formatTime = (s: number) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${m}:${sec.toString().padStart(2, '0')}`;
    };

    return (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-orange-600/20 to-amber-500/10 shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Ticket className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white tracking-tight">Obtener Cupón</h2>
                            <p className="text-orange-400 text-[9px] font-bold uppercase tracking-widest mt-0.5">{coupon.code}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {/* Preview step */}
                    {step === 'preview' && (
                        <div className="space-y-6 animate-in fade-in duration-300">
                            <div className="text-center">
                                <div className={`inline-flex items-center gap-2 px-5 py-3 rounded-2xl mb-4 ${
                                    coupon.type === 'percentage'
                                        ? 'bg-emerald-500/10 border border-emerald-500/20'
                                        : 'bg-sky-500/10 border border-sky-500/20'
                                }`}>
                                    <span className={`text-3xl font-black ${
                                        coupon.type === 'percentage' ? 'text-emerald-400' : 'text-sky-400'
                                    }`}>
                                        {coupon.type === 'percentage' ? `${coupon.value}% OFF` : `$${coupon.value} OFF`}
                                    </span>
                                </div>
                                {coupon.description && (
                                    <p className="text-sm text-slate-400 max-w-[280px] mx-auto">{coupon.description}</p>
                                )}
                                {coupon.businessName && (
                                    <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mt-3">
                                        en {coupon.businessName}
                                    </p>
                                )}
                            </div>

                            {coupon.minPurchase > 0 && (
                                <div className="flex items-center gap-2 p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                                    <span className="text-[10px] font-bold text-amber-300">
                                        Compra mínima de ${coupon.minPurchase} requerida
                                    </span>
                                </div>
                            )}

                            {errorMsg && (
                                <div className="flex items-center gap-2 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                                    <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                    <span className="text-[10px] font-bold text-rose-300">{errorMsg}</span>
                                </div>
                            )}

                             <button
                                onClick={handleObtain}
                                className="w-full py-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-black font-black text-sm uppercase tracking-widest rounded-2xl transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-orange-500/20"
                            >
                                ¡Lo quiero! (Obtener)
                            </button>
                        </div>
                    )}

                    {/* Validating step */}
                    {step === 'validating' && (
                        <div className="py-16 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-6" />
                            <h3 className="text-lg font-black text-white mb-2">Validando...</h3>
                            <p className="text-xs text-slate-500">Verificando elegibilidad del cupón</p>
                        </div>
                    )}

                    {/* Success step */}
                    {step === 'success' && (
                        <div className="space-y-6 animate-in zoom-in duration-500">
                            <div className="flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mb-4 border border-emerald-500/30">
                                    <CheckCircle className="w-8 h-8 text-emerald-400" />
                                </div>
                                <h3 className="text-xl font-black text-white mb-1">¡Cupón Guardado!</h3>
                                <p className="text-xs text-slate-400">Ya puedes verlo en tu billetera</p>
                            </div>

                            {/* QR Code */}
                            <div className="flex justify-center">
                                <div className="bg-white p-4 rounded-[2rem] shadow-2xl shadow-black/50">
                                    {QRCodeSVG ? (
                                        <QRCodeSVG value={qrPayload} size={200} level="M" />
                                    ) : (
                                        <div className="w-[200px] h-[200px] bg-slate-100 rounded-2xl flex items-center justify-center">
                                            <Ticket className="w-12 h-12 text-slate-400" />
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Reservation code */}
                            <div className="bg-black/40 rounded-3xl p-5 border border-white/5 text-center">
                                <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">Código de Validación</p>
                                <p className="text-3xl font-black text-orange-400 font-mono tracking-[0.25em]">{reservationCode}</p>
                            </div>

                            <div className="p-4 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                                <p className="text-[11px] text-orange-400/80 leading-relaxed text-center font-medium">
                                    Presenta este código o QR en el local para hacer efectivo tu descuento.
                                </p>
                            </div>

                            <button
                                onClick={onClose}
                                className="w-full py-4 bg-white/5 hover:bg-white/10 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all border border-white/5"
                            >
                                Entendido
                            </button>
                        </div>
                    )}

                    {/* Error step */}
                    {step === 'error' && (
                        <div className="py-16 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
                            <div className="w-20 h-20 bg-rose-500/20 rounded-full flex items-center justify-center mb-6 border border-rose-500/30">
                                <AlertTriangle className="w-10 h-10 text-rose-400" />
                            </div>
                            <h3 className="text-xl font-black text-white mb-2">No Disponible</h3>
                            <p className="text-sm text-slate-400 mb-6">{errorMsg}</p>
                            <button
                                onClick={() => { setStep('preview'); setErrorMsg(''); }}
                                className="px-8 py-3 bg-white/10 hover:bg-white/15 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all"
                            >
                                Intentar de Nuevo
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
