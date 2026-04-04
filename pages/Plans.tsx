import React, { useState, useEffect } from 'react';
import { 
    ChevronLeft, ChevronRight, CheckCircle, Calendar, MapPin, Sparkles, Zap,
    MessageCircle, Navigation, CreditCard, Edit3, Banknote, Mail, Star,
    Check, Crown, Info, ShieldCheck, Smartphone, TrendingUp, Copy, CopyCheck, Award
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { SubscriptionPlan, PlanFeatureDefinition } from '../types';
import { PLAN_LIMITS, PLAN_FEATURES } from '../constants';
import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

interface PlanFeatureProps {
    icon?: any;
    text: string;
    description?: string;
    isIncluded?: boolean;
    highlight?: boolean;
}

const PlanFeature: React.FC<PlanFeatureProps> = ({ icon: Icon, text, description, isIncluded = true, highlight }) => (
    <div className="group relative flex items-start gap-3 py-1">
        <div className={`mt-0.5 flex-shrink-0 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-500 ${isIncluded 
            ? (highlight ? 'bg-orange-500/10 border border-orange-500/20 text-orange-500 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'bg-orange-500/10 text-orange-500')
            : 'bg-white/5 text-white/20'}`}>
            {Icon ? <Icon size={16} /> : (isIncluded ? <Check size={14} strokeWidth={3} /> : <Check size={14} strokeWidth={2} />)}
        </div>
        <div className="flex flex-col">
            <span className={`text-sm font-bold tracking-tight ${isIncluded ? 'text-white/90' : 'text-white/30 line-through'}`}>{text}</span>
            {description && isIncluded && (
                <span className="text-[10px] text-white/50 leading-tight mt-0.5 group-hover:text-orange-300/70 transition-colors">
                    {description}
                </span>
            )}
        </div>
    </div>
);

export const Plans: React.FC = () => {
    const { user, isAdmin, isSuperAdmin } = useAuthContext();
    const {
        paymentDetails,
        setShowPaymentEdit,
        planPrices,
        handleUpdatePlanPrices,
        planFeatures,
        handleUpdatePlanFeatures,
        planLimits,
        handleUpdatePlanLimits,
        planNames,
        planSubtitles,
        handleUpdatePlanNames,
        handleUpdatePlanSubtitles
    } = useData();
    const { showConfirm, showToast } = useToast();
    const navigate = useNavigate();

    const [isEditingPrices, setIsEditingPrices] = useState(false);
    const [isEditingFeatures, setIsEditingFeatures] = useState(false);
    const [tempPrices, setTempPrices] = useState<Record<SubscriptionPlan, number>>(planPrices);
    const [tempFeatures, setTempFeatures] = useState<Record<SubscriptionPlan, PlanFeatureDefinition[]>>(planFeatures);
    const [tempLimits, setTempLimits] = useState<Record<SubscriptionPlan, number>>(planLimits);
    const [tempPlanNames, setTempPlanNames] = useState<Record<SubscriptionPlan, string>>(planNames);
    const [tempPlanSubtitles, setTempPlanSubtitles] = useState<Record<SubscriptionPlan, string>>(planSubtitles);
    const [copiedField, setCopiedField] = useState<string | null>(null);

    // Sync temp state when plan data updates from context
    useEffect(() => {
        setTempPrices(planPrices);
        setTempFeatures(planFeatures);
        setTempLimits(planLimits);
        setTempPlanNames(planNames);
        setTempPlanSubtitles(planSubtitles);
    }, [planPrices, planFeatures, planLimits, planNames, planSubtitles]);

    const handleCopy = (text: string, field: string) => {
        navigator.clipboard.writeText(text);
        setCopiedField(field);
        showToast(`${field} copiado al portapapeles`, 'success');
        setTimeout(() => setCopiedField(null), 2000);
    };

    const savePrices = async () => {
        try {
            await handleUpdatePlanPrices(tempPrices);
            setIsEditingPrices(false);
            showToast('Precios actualizados correctamente', 'success');
        } catch (error) {
            showToast('Error al actualizar precios', 'error');
        }
    };

    const saveFeatures = async () => {
        try {
            await handleUpdatePlanFeatures(tempFeatures);
            await handleUpdatePlanLimits(tempLimits);
            await handleUpdatePlanNames(tempPlanNames);
            await handleUpdatePlanSubtitles(tempPlanSubtitles);
            setIsEditingFeatures(false);
            showToast('Configuración de planes actualizada correctamente', 'success');
        } catch (error) {
            showToast('Error al actualizar configuración', 'error');
        }
    };

    const toggleFeatureIncluded = (plan: SubscriptionPlan, idx: number) => {
        const newFeatures = { ...tempFeatures };
        newFeatures[plan] = [...newFeatures[plan]];
        newFeatures[plan][idx] = { ...newFeatures[plan][idx], isIncluded: !newFeatures[plan][idx].isIncluded };
        setTempFeatures(newFeatures);
    };

    const updateFeatureText = (plan: SubscriptionPlan, idx: number, text: string) => {
        const newFeatures = { ...tempFeatures };
        newFeatures[plan] = [...newFeatures[plan]];
        newFeatures[plan][idx] = { ...newFeatures[plan][idx], text };
        setTempFeatures(newFeatures);
    };

    const updateFeatureDescription = (plan: SubscriptionPlan, idx: number, description: string) => {
        const newFeatures = { ...tempFeatures };
        newFeatures[plan] = [...newFeatures[plan]];
        newFeatures[plan][idx] = { ...newFeatures[plan][idx], description };
        setTempFeatures(newFeatures);
    };

    const addFeature = (plan: SubscriptionPlan) => {
        const newFeatures = { ...tempFeatures };
        newFeatures[plan] = [...newFeatures[plan], { text: 'Nuevo beneficio', isIncluded: true }];
        setTempFeatures(newFeatures);
    };

    const removeFeature = (plan: SubscriptionPlan, idx: number) => {
        const newFeatures = { ...tempFeatures };
        newFeatures[plan] = newFeatures[plan].filter((_, i) => i !== idx);
        setTempFeatures(newFeatures);
    };

    const onUpdatePlan = async (plan: SubscriptionPlan) => {
        if (plan === user?.plan) {
            showToast('Ya tienes este plan activo', 'info');
            return;
        }

        const price = planPrices[plan];
        if (plan === SubscriptionPlan.FREE || price === 0) {
            showToast('Este plan no requiere pago.', 'info');
            return;
        }

        const confirmed = await showConfirm(
            `¿Seguro que quieres mejorar al plan ${tempPlanNames[plan]} por $${price.toFixed(2)}?\n\nSerás redirigido a la pasarela de pago segura de dLocal Go para finalizar la transacción.`,
            'Mejorar suscripción'
        );

        if (confirmed) {
            try {
                showToast('Conectando con dLocal Go...', 'info');
                
                const response = await fetch('/api/create-checkout', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        amount: Number(price),
                        currency: 'USD', // Ajustar según moneda local si es necesario
                        description: `Plan ${tempPlanNames[plan]} - ${user?.email || 'Huésped'}`
                    })
                });

                const data = await response.json();

                if (data.checkout_url) {
                    // Redirigir a la pasarela de dLocal Go
                    window.location.href = data.checkout_url;
                } else {
                    throw new Error('Error en la respuesta del servidor');
                }
            } catch (error) {
                console.error('Checkout error:', error);
                showToast('No pudimos iniciar el pago. Por favor intenta más tarde.', 'error');
            }
        }
    };

    const PaymentRow = ({ label, value, copyable = false, fieldName }: { label: string, value: string, copyable?: boolean, fieldName?: string }) => (
        <div className="flex justify-between items-center py-2.5 border-b border-white/5 last:border-0 group/row">
            <span className="text-[10px] text-white/50 font-black uppercase tracking-widest">{label}</span>
            <div className="flex items-center gap-2">
                <span className={`text-xs font-bold text-white transition-all ${copyable ? 'group-hover/row:text-orange-400 cursor-pointer' : ''}`}>
                    {value}
                </span>
                {copyable && (
                    <button 
                        onClick={() => handleCopy(value, fieldName || label)}
                        className="p-1.5 rounded-md hover:bg-white/10 text-white/30 hover:text-white transition-all active:scale-95"
                    >
                        {copiedField === (fieldName || label) ? <CopyCheck size={14} className="text-green-400" /> : <Copy size={14} />}
                    </button>
                )}
            </div>
        </div>
    );

    return (
        <div className="relative min-h-screen bg-black overflow-y-auto no-scrollbar">
            {/* Background Effects */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-20">
                <div className="absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-orange-500/10 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute top-[20%] -right-[20%] w-[70%] h-[70%] bg-orange-600/5 blur-[150px] rounded-full animate-pulse delay-1000" />
                <div className="absolute -bottom-[10%] left-[20%] w-[50%] h-[50%] bg-orange-700/10 blur-[130px] rounded-full animate-pulse delay-700" />
            </div>

            <div className="relative h-full pb-32 max-w-7xl mx-auto z-10">
                <div className="p-6 pt-8 space-y-10">
                    {/* Header */}
                    <div className="flex items-center gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        <button
                            onClick={() => navigate('/host')}
                            className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all active:scale-95"
                        >
                            <ChevronLeft className="w-6 h-6 text-white" />
                        </button>
                        <div className="flex-1">
                            <h1 className="text-3xl font-black text-white tracking-tighter uppercase italic leading-none">
                                Membresía <span className="text-orange-500">Pulse.</span>
                            </h1>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mt-2">Business Edition</p>
                        </div>
                        {(isSuperAdmin || isAdmin) && (
                            <div className="flex gap-2">
                                {isEditingPrices ? (
                                    <>
                                        <button
                                            onClick={() => { setIsEditingPrices(false); setTempPrices(planPrices); }}
                                            className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 text-[10px] font-black uppercase tracking-widest border border-white/5"
                                        >
                                            Cancelar
                                        </button>
                                        <button
                                            onClick={savePrices}
                                            className="px-4 py-2 rounded-xl bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/20"
                                        >
                                            Guardar
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setIsEditingPrices(true)}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/5 transition-all group"
                                        title="Editar Precios"
                                    >
                                        <Edit3 className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Intro Card */}
                    <div className="relative p-8 rounded-[2.5rem] bg-white/[0.03] border border-white/10 overflow-hidden group animate-in fade-in slide-in-from-bottom-4 duration-700">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl group-hover:bg-orange-500/20 transition-colors" />
                        <p className="text-slate-300 text-sm leading-relaxed font-medium relative z-10 max-w-2xl">
                            Impulsa tu negocio en el mapa de <span className="text-white font-bold italic">Montapulse</span>.
                            Conecta con locales y turistas en tiempo real y haz que tu marca sea el nuevo pulso de la ciudad.
                        </p>
                    </div>

                    {/* Plans Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {[SubscriptionPlan.FREE, SubscriptionPlan.BASIC, SubscriptionPlan.PREMIUM].map((planType) => {
                            const isCurrent = user?.plan === planType;
                            const isPremium = planType === SubscriptionPlan.PREMIUM;
                            const isBasic = planType === SubscriptionPlan.BASIC;
                            const isFree = planType === SubscriptionPlan.FREE;

                            return (
                                <div key={planType} className={`relative group flex flex-col p-8 rounded-[3rem] border transition-all duration-500 hover:translate-y-[-6px] shadow-2xl overflow-hidden
                                    ${isPremium ? 'bg-gradient-to-br from-indigo-900/40 to-black border-indigo-500 shadow-indigo-500/20 scale-105 z-20' : 'bg-black/40 border-white/5 hover:bg-black/60 z-10'}`}>
                                    
                                    {isPremium && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-indigo-500 text-white text-[9px] font-black uppercase tracking-widest shadow-xl shadow-indigo-500/40 z-30">
                                            RECOMENDADO
                                        </div>
                                    )}

                                    <div className="mb-6">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110 
                                            ${isPremium ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/30 group-hover:rotate-6' : 
                                              isBasic ? 'bg-orange-500/10 text-orange-500' : 'bg-white/5 text-white/40'}`}>
                                            {isPremium ? <Crown size={28} /> : isBasic ? <TrendingUp size={24} /> : <Smartphone size={24} />}
                                        </div>

                                        {isEditingFeatures ? (
                                            <div className="space-y-4 mb-4">
                                                <div className="group/input">
                                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 block">Título</label>
                                                    <input
                                                        type="text"
                                                        value={tempPlanNames[planType]}
                                                        onChange={(e) => setTempPlanNames(prev => ({ ...prev, [planType]: e.target.value }))}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white font-black text-lg italic uppercase outline-none focus:border-orange-500/50"
                                                    />
                                                </div>
                                                <div className="group/input">
                                                    <label className="text-[9px] font-black text-white/30 uppercase tracking-widest mb-1 block">Subtítulo</label>
                                                    <input
                                                        type="text"
                                                        value={tempPlanSubtitles[planType]}
                                                        onChange={(e) => setTempPlanSubtitles(prev => ({ ...prev, [planType]: e.target.value }))}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white/60 font-bold text-xs uppercase tracking-widest outline-none focus:border-orange-500/50"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <>
                                                <h3 className={`text-xl font-black italic uppercase mb-1 ${isPremium ? 'text-white' : 'text-white/90'}`}>
                                                    {planNames[planType]}
                                                </h3>
                                                <p className={`text-[10px] mb-4 uppercase tracking-widest font-bold ${isPremium ? 'text-indigo-400/70' : 'text-white/40'}`}>
                                                    {planSubtitles[planType]}
                                                </p>
                                            </>
                                        )}

                                        {isEditingPrices ? (
                                            <div className="relative group/input">
                                                <span className="text-xs font-black text-white/60 mr-1">$</span>
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={tempPrices[planType]}
                                                    onChange={(e) => setTempPrices(prev => ({ ...prev, [planType]: parseFloat(e.target.value) || 0 }))}
                                                    className={`bg-white/5 border rounded-xl px-4 py-2 text-white font-black text-2xl w-32 outline-none focus:border-orange-500/50
                                                        ${isPremium ? 'border-indigo-500/40' : 'border-white/10'}`}
                                                />
                                            </div>
                                        ) : (
                                            <div className={`flex items-baseline gap-1 ${isPremium ? 'text-white' : 'text-white/90'}`}>
                                                <span className="text-xs font-black text-white/60">$</span>
                                                <span className={`font-black tracking-tighter ${isPremium ? 'text-5xl' : 'text-4xl'}`}>
                                                    {(planPrices[planType] ?? 0).toFixed(2)}
                                                </span>
                                                <span className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1">/mes</span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-4 flex-grow mb-8">
                                        {isEditingFeatures ? (
                                            <div className="space-y-3">
                                                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mb-4">
                                                    <label className="text-[10px] font-black text-white/40 uppercase mb-1 block">Límite de Pulsos</label>
                                                    <input
                                                        type="number"
                                                        value={tempLimits[planType]}
                                                        onChange={(e) => setTempLimits(prev => ({ ...prev, [planType]: parseInt(e.target.value) || 0 }))}
                                                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-bold"
                                                    />
                                                </div>
                                                {tempFeatures[planType].map((feat, idx) => (
                                                    <div key={idx} className="p-4 rounded-2xl bg-white/5 border border-white/10 group/edit relative transition-all hover:bg-white/[0.07]">
                                                        <button onClick={() => removeFeature(planType, idx)} className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center text-xs opacity-0 group-hover/edit:opacity-100 transition-opacity transform hover:scale-110 shadow-lg z-10">×</button>
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <input
                                                                type="checkbox"
                                                                checked={feat.isIncluded}
                                                                onChange={() => toggleFeatureIncluded(planType, idx)}
                                                                className="w-4 h-4 rounded-md border-white/20 bg-transparent text-orange-500 focus:ring-orange-500/50"
                                                            />
                                                            <span className="text-[9px] font-black text-white/30 uppercase tracking-tighter">Incluido en el plan</span>
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={feat.text}
                                                            onChange={(e) => updateFeatureText(planType, idx, e.target.value)}
                                                            placeholder="Nombre del beneficio"
                                                            className="w-full bg-transparent border-none text-white font-bold text-sm outline-none mb-1 placeholder:text-white/10"
                                                        />
                                                        <input
                                                            type="text"
                                                            value={feat.description || ''}
                                                            onChange={(e) => updateFeatureDescription(planType, idx, e.target.value)}
                                                            placeholder="Descripción opcional"
                                                            className="w-full bg-transparent border-none text-white/40 text-[10px] outline-none placeholder:text-white/5"
                                                        />
                                                    </div>
                                                ))}
                                                <button onClick={() => addFeature(planType)} className="w-full py-4 border-2 border-dashed border-white/5 rounded-[2rem] text-white/20 hover:text-orange-500 hover:border-orange-500/30 transition-all text-[10px] font-black uppercase tracking-widest mt-2">
                                                    + AGREGAR BENEFICIO
                                                </button>
                                            </div>
                                        ) : (
                                            <>
                                                <PlanFeature 
                                                    text={`${tempLimits[planType]} Pulsos activos/mes`} 
                                                    description="Tus eventos en tiempo real" 
                                                    highlight={isCurrent || isPremium} 
                                                />
                                                {tempFeatures[planType].filter(f => !f.text.includes('Pulsos')).map((feat, idx) => (
                                                    <PlanFeature 
                                                        key={idx} 
                                                        text={feat.text} 
                                                        description={feat.description} 
                                                        isIncluded={feat.isIncluded} 
                                                        highlight={feat.highlight || isCurrent || isPremium} 
                                                    />
                                                ))}
                                            </>
                                        )}
                                    </div>

                                    <button
                                        onClick={() => onUpdatePlan(planType)}
                                        className={`w-full py-5 rounded-[2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all relative overflow-hidden group/btn 
                                            ${isCurrent ? 'bg-slate-800/50 text-slate-500 border border-white/5 cursor-default' : 
                                              isPremium ? 'bg-white text-indigo-900 shadow-xl shadow-white/10 hover:scale-[1.02]' : 
                                              isFree ? 'bg-white/10 text-white border border-white/10 hover:bg-white/20 hover:scale-[1.02]' :
                                              'bg-orange-500 text-white hover:scale-[1.02] shadow-orange-500/20 active:scale-95'}`}
                                    >
                                        {isPremium && !isCurrent && <div className="absolute inset-0 bg-indigo-500/10 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000" />}
                                        <span className="relative z-10">
                                            {isCurrent ? 'PLAN ACTUAL' : 
                                             isPremium ? '¡MEJORAR AHORA!' :
                                             isFree ? 'SELECCIONAR' : 'ACTUALIZAR'}
                                        </span>
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                </div>

                    {/* Activation Section */}
                    <div className="max-w-4xl mx-auto rounded-[3rem] overflow-hidden border border-white/10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-1000 mt-12 bg-black/60">
                        <div className="p-8 bg-gradient-to-r from-orange-500 to-orange-600 flex justify-between items-center relative overflow-hidden">
                            <div className="absolute inset-0 bg-white/10 opacity-20 pointer-events-none">
                                <div className="absolute top-0 right-0 w-64 h-64 bg-white/20 blur-3xl -translate-y-1/2 translate-x-1/2" />
                            </div>
                            <div className="flex items-center gap-4 relative z-10">
                                <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center">
                                    <ShieldCheck size={32} className="text-white" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-white italic uppercase tracking-tighter">Método de Activación</h2>
                                    <p className="text-white/80 text-[10px] font-black uppercase tracking-[0.2em]">Seguro • Directo • Verificado</p>
                                </div>
                            </div>
                            {(isSuperAdmin || isAdmin) && (
                                <button 
                                    onClick={() => setShowPaymentEdit(true)}
                                    className="p-3 rounded-2xl bg-white/20 hover:bg-white/30 text-white transition-all active:scale-90 relative z-10 border border-white/10"
                                    title="Editar datos de pago"
                                >
                                    <Edit3 size={20} />
                                </button>
                            )}
                        </div>
                        
                        <div className="p-8 space-y-8">
                            <div className="flex items-start gap-4 p-6 rounded-[2rem] bg-orange-500/5 border border-orange-500/10">
                                <div className="mt-1 w-10 h-10 rounded-xl bg-orange-500/20 flex items-center justify-center text-orange-500 flex-shrink-0">
                                    <Info size={20} />
                                </div>
                                <div className="text-sm text-slate-300 leading-relaxed font-medium">
                                    Para activar tu plan empresarial, selecciona tu plan y paga automáticamente con <span className="text-white font-black italic">dLocal Go</span>. Recibirás activación instantánea tras confirmar el pago. También mantenemos los métodos manuales para tu comodidad.
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-1">
                                <PaymentRow label="Banco" value={paymentDetails.bankName} />
                                <PaymentRow label="Tipo de Cuenta" value={paymentDetails.accountType} />
                                <PaymentRow 
                                    label="Número de Cuenta" 
                                    value={paymentDetails.accountNumber} 
                                    copyable={true} 
                                    fieldName="Número de cuenta"
                                />
                                <PaymentRow 
                                    label="Titular" 
                                    value={paymentDetails.accountOwner} 
                                    copyable={true} 
                                    fieldName="Nombre del titular"
                                />
                                <PaymentRow 
                                    label="R.U.C / I.D." 
                                    value={paymentDetails.idNumber} 
                                    copyable={true} 
                                    fieldName="Número de identificación"
                                />
                                <PaymentRow label="Región / País" value={paymentDetails.bankRegion} />
                            </div>

                            <div className="flex flex-col sm:flex-row gap-4 pt-4">
                                <a 
                                    href={`https://wa.me/${paymentDetails.whatsappNumber}?text=${encodeURIComponent('Hola! Acabo de realizar el pago de mi plan PULSE. Aquí envío mi comprobante.')}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex-1 py-5 bg-orange-500 hover:bg-orange-600 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-xl shadow-orange-500/20 active:scale-95 group"
                                >
                                    <MessageCircle className="w-5 h-5 fill-white" />
                                    <span className="uppercase tracking-[0.2em] text-xs">Enviar Comprobante</span>
                                    <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </a>
                                <a
                                    href="mailto:contacto@montapulse.com?subject=Comprobante de Pago - Plan Pulse"
                                    className="flex-1 py-5 bg-white/5 hover:bg-white/10 text-white font-black rounded-[2rem] flex items-center justify-center gap-3 transition-all border border-white/10 active:scale-95"
                                >
                                    <Mail className="w-5 h-5 text-orange-500" />
                                    <span className="uppercase tracking-[0.2em] text-xs">Usar E-mail</span>
                                </a>
                            </div>

                            <div className="flex items-center justify-center gap-3 py-4 bg-white/[0.02] rounded-2xl border border-white/5 opacity-60">
                                <div className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">
                                    Soporte comercial disponible de 09:00 a 22:00
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Footer Warning */}
                    <div className="flex justify-center pt-8 pb-12">
                        <div className="flex items-center gap-3 text-slate-600">
                            <ShieldCheck size={14} />
                            <p className="text-[10px] font-bold uppercase tracking-widest">Transacciones seguras mediante sistema verificado</p>
                        </div>
                    </div>
                </div>
            </div>
        );
};

export default Plans;
