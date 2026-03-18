import React from 'react';
import {
    ChevronLeft, CheckCircle, Calendar, MapPin, Sparkles, Zap,
    MessageCircle, Navigation, CreditCard, Edit3, Banknote, Mail, Star
} from 'lucide-react';
import { SubscriptionPlan } from '../types';
import { useNavigate } from 'react-router-dom';

import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

export const Plans: React.FC = () => {
    const { user, isAdmin } = useAuthContext();
    const {
        paymentDetails,
        setShowPaymentEdit: onEditPaymentDetails
    } = useData();
    const { showConfirm } = useToast();
    const navigate = useNavigate();

    const onUpdatePlan = async (plan: SubscriptionPlan) => {
        if (plan === user?.plan) return;

        const whatsappMsg = encodeURIComponent(`Hola Montapulse, me gustaría cambiar mi plan a ${plan}. Mi email es ${user?.email}`);
        const whatsappUrl = `https://wa.me/${paymentDetails.whatsappNumber}?text=${whatsappMsg}`;

        const confirmed = await showConfirm(
            `¿Seguro que quieres cambiar al plan ${plan}?\n\nTe redirigiremos a WhatsApp para finalizar la activación con soporte.`,
            'Confirmar suscripción'
        );

        if (confirmed) {
            window.open(whatsappUrl, '_blank');
        }
    };

    return (
        <div className="relative h-full overflow-hidden bg-black">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-orange-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-[20%] -right-[20%] w-[70%] h-[70%] bg-orange-600/5 blur-[150px] rounded-full animate-pulse delay-1000" />
                <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-orange-700/10 blur-[130px] rounded-full animate-pulse delay-700" />
            </div>

            <div className="relative h-full overflow-y-auto no-scrollbar pb-32">
                <div className="p-6 pt-8 space-y-10">
                    {/* Header */}
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate('/host')}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
                                Membresía <span className="text-orange-500">Pulse.</span>
                            </h1>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Business Edition</p>
                        </div>
                    </div>

                    {/* Intro Card */}
                    <div className="relative p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl group-hover:bg-orange-500/20 transition-colors" />
                        <p className="text-slate-300 text-sm leading-relaxed font-medium relative z-10">
                            Impulsa tu negocio en el mapa de <span className="text-white font-bold italic">Montapulse</span>.
                            Conecta con locales y turistas en tiempo real y haz que tu marca sea el nuevo pulso de la ciudad.
                        </p>
                    </div>

                    {/* Plans Grid */}
                    <div className="grid gap-6">
                        {/* Visitor Plan */}
                        <div className={`relative group p-8 rounded-[3rem] bg-black/40 border transition-all ${user?.plan === SubscriptionPlan.VISITOR ? 'border-orange-500/50 shadow-[0_0_30px_#f9731615]' : 'border-white/5 hover:bg-black/60'}`}>
                            <div className="absolute top-0 right-0 p-6">
                                <CheckCircle className={`w-8 h-8 ${user?.plan === SubscriptionPlan.VISITOR ? 'text-orange-500' : 'text-slate-700'}`} />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase mb-2">Visitante</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-4xl font-black text-white tracking-tighter">GRATIS</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <PlanFeature icon={Calendar} text="Ver eventos públicos" highlight={user?.plan === SubscriptionPlan.VISITOR} />
                                <PlanFeature icon={MapPin} text="Mapa básico interactivo" highlight={user?.plan === SubscriptionPlan.VISITOR} />
                                <PlanFeature icon={Sparkles} text="Vibes generales" highlight={user?.plan === SubscriptionPlan.VISITOR} />
                            </ul>
                            <button
                                onClick={() => onUpdatePlan(SubscriptionPlan.VISITOR)}
                                className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all ${user?.plan === SubscriptionPlan.VISITOR
                                    ? 'bg-slate-800/50 text-slate-500 border border-white/5 cursor-default'
                                    : 'bg-white text-black hover:scale-[1.02] active:scale-95'
                                    }`}
                            >
                                {user?.plan === SubscriptionPlan.VISITOR ? 'TU PLAN ACTUAL' : 'SELECCIONAR'}
                            </button>
                        </div>

                        {/* Basic Plan */}
                        <div className={`relative group p-8 rounded-[3rem] bg-black/40 border transition-all ${user?.plan === SubscriptionPlan.BASIC ? 'border-orange-500/50 shadow-[0_0_30px_#f9731615]' : 'border-white/5 hover:bg-black/60'}`}>
                            <div className="absolute top-0 right-0 p-6">
                                <CheckCircle className={`w-8 h-8 ${user?.plan === SubscriptionPlan.BASIC ? 'text-orange-500' : 'text-slate-700'}`} />
                            </div>
                            <h3 className="text-xl font-black text-white italic uppercase mb-2">Plan Básico</h3>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-xs font-black text-white/60">$</span>
                                <span className="text-4xl font-black text-white tracking-tighter">3.00</span>
                                <span className="text-xs font-black text-white/40 italic">/mes</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <PlanFeature icon={Calendar} text="Hasta 3 eventos mensuales" highlight={user?.plan === SubscriptionPlan.BASIC} />
                                <PlanFeature icon={MapPin} text="Presencia básica en mapa" highlight={user?.plan === SubscriptionPlan.BASIC} />
                                <PlanFeature icon={Sparkles} text="Acceso a Dashboard Host" highlight={user?.plan === SubscriptionPlan.BASIC} />
                            </ul>
                            <button
                                onClick={() => onUpdatePlan(SubscriptionPlan.BASIC)}
                                className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all ${user?.plan === SubscriptionPlan.BASIC
                                    ? 'bg-slate-800/50 text-slate-500 border border-white/5 cursor-default'
                                    : 'bg-white text-black hover:scale-[1.02] active:scale-95'
                                    }`}
                            >
                                {user?.plan === SubscriptionPlan.BASIC ? 'TU PLAN ACTUAL' : 'SELECCIONAR'}
                            </button>
                        </div>

                        {/* Premium Plan */}
                        <div className={`relative group p-8 rounded-[3rem] bg-gradient-to-br from-orange-500/[0.08] to-transparent border transition-all ${user?.plan === SubscriptionPlan.PREMIUM ? 'border-orange-500 shadow-[0_0_40px_#f9731620]' : 'border-orange-500/30 hover:from-orange-500/20'}`}>
                            <div className="absolute top-0 right-0 p-6">
                                <div className="p-2 rounded-xl bg-orange-500 shadow-lg shadow-orange-500/40">
                                    <Zap className="w-5 h-5 text-white fill-white" />
                                </div>
                            </div>
                            <div className="flex items-center gap-2 mb-2">
                                <h3 className="text-2xl font-black text-white italic uppercase">Plan Premium</h3>
                                <div className="px-2 py-0.5 bg-orange-500 text-[8px] font-black text-white rounded-full uppercase tracking-widest">PRO</div>
                            </div>
                            <div className="flex items-baseline gap-1 mb-6">
                                <span className="text-xs font-black text-white/60">$</span>
                                <span className="text-5xl font-black text-white tracking-tighter">14.99</span>
                                <span className="text-xs font-black text-white/40 italic">/mes</span>
                            </div>
                            <ul className="space-y-4 mb-8">
                                <PlanFeature icon={Star} text="7 eventos mensuales" highlight={true} />
                                <PlanFeature icon={Zap} text="Pulse Pass" highlight={true} />
                                <PlanFeature icon={Navigation} text="Ubicación destacada VIP" highlight={true} />
                                <PlanFeature icon={MessageCircle} text="Canal de comunidad exclusiva" highlight={true} />
                            </ul>

                            <button
                                onClick={() => onUpdatePlan(SubscriptionPlan.PREMIUM)}
                                className={`w-full py-5 rounded-[2rem] font-black text-xs uppercase tracking-[0.2em] transition-all relative overflow-hidden group/btn ${user?.plan === SubscriptionPlan.PREMIUM
                                    ? 'bg-slate-800/50 text-slate-500 border border-white/5 cursor-default'
                                    : 'bg-orange-500 text-white hover:scale-[1.02] active:scale-95 shadow-2xl shadow-orange-500/30'
                                    }`}
                            >
                                <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />
                                <span className="relative z-10">{user?.plan === SubscriptionPlan.PREMIUM ? 'TU PLAN ACTUAL' : 'MEJORAR A PREMIUM'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Payment Info */}
                    <div className="relative mt-8 p-8 rounded-[3rem] bg-black border border-white/10 overflow-hidden">
                        <div className="absolute top-0 left-0 w-1.5 h-full bg-orange-500 shadow-[0_0_15px_#f97316]" />

                        <div className="flex items-center justify-between mb-8">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                                    <CreditCard className="w-6 h-6 text-orange-500" />
                                </div>
                                <h4 className="text-xl font-black text-white italic uppercase tracking-tight">Métodos de Pago</h4>
                            </div>
                            {isAdmin && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); onEditPaymentDetails(true); }}
                                    className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all active:scale-90"
                                >
                                    <Edit3 className="w-4 h-4 text-white" />
                                </button>
                            )}
                        </div>

                        <p className="text-sm text-slate-400 font-medium leading-relaxed mb-8">
                            Para una activación rápida, realiza el pago y envía una captura del comprobante por WhatsApp o Correo.
                        </p>

                        <div className="p-6 bg-white/5 rounded-[2rem] border border-white/5 space-y-4 mb-8">
                            <div className="flex items-center gap-2 pb-4 border-b border-white/5">
                                <Banknote className="w-4 h-4 text-orange-500" />
                                <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em]">{paymentDetails.bankRegion}</p>
                            </div>
                            <div className="grid gap-3">
                                <PaymentRow label="Banco" value={paymentDetails.bankName} />
                                <PaymentRow label="Cuenta" value={paymentDetails.accountType} />
                                <PaymentRow label="Número" value={paymentDetails.accountNumber} copyable />
                                <PaymentRow label="Titular" value={paymentDetails.accountOwner} />
                                <PaymentRow label="RUC/ID" value={paymentDetails.idNumber} />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
                            <a
                                href={`https://wa.me/${paymentDetails.whatsappNumber}?text=Hola,%20adjunto%20mi%20comprobante%20de%20pago%20para%20el%20Plan%20Premium.`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-5 bg-orange-600 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all hover:scale-[1.02] active:scale-95 shadow-xl shadow-orange-500/10"
                            >
                                <MessageCircle className="w-6 h-6" />
                                <span className="uppercase tracking-widest text-xs">WhatsApp Business</span>
                            </a>
                            <a
                                href="mailto:contacto@montapulse.com?subject=Comprobante de Pago - Plan Premium"
                                className="w-full py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-2xl flex items-center justify-center gap-3 transition-all border border-white/10"
                            >
                                <Mail className="w-5 h-5 text-orange-500" />
                                <span className="uppercase tracking-widest text-xs">Enviar por Correo</span>
                            </a>
                        </div>

                        <div className="mt-8 flex items-center justify-center gap-3 py-4 bg-white/5 rounded-2xl border border-white/5">
                            <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                                Activación en <span className="text-white">2 HORAS</span> máx.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

interface PlanFeatureProps {
    icon: any;
    text: string;
    highlight?: boolean;
}

const PlanFeature: React.FC<PlanFeatureProps> = ({ icon: Icon, text, highlight }) => (
    <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-500 ${highlight
            ? 'bg-orange-500/10 border-orange-500/20 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]'
            : 'bg-white/5 border-white/10 text-slate-500'
            }`}>
            <Icon className="w-5 h-5" />
        </div>
        <span className={`text-sm font-bold tracking-tight ${highlight ? 'text-white' : 'text-slate-500'}`}>
            {text}
        </span>
    </div>
);

interface PaymentRowProps {
    label: string;
    value: string;
    copyable?: boolean;
}

const PaymentRow: React.FC<PaymentRowProps> = ({ label, value, copyable }) => (
    <div className="flex justify-between items-center group/row">
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
        <span className={`text-xs font-bold text-white transition-all ${copyable ? 'group-hover/row:text-orange-500 cursor-pointer' : ''}`}>
            {value}
        </span>
    </div>
);
