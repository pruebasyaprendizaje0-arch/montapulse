import React, { useRef } from 'react';
import { X, Camera, Upload, Sparkles, Calendar, Clock, MapPin, Tag, Zap, AlertTriangle, Crown } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Sector, Vibe, SubscriptionPlan } from '../../types';
import { LOCALITIES, LOCALITY_SECTORS, PLAN_LIMITS, DEFAULT_NEW_LOCALITY_SECTORS } from '../../constants';
import { useAuthContext } from '../../context/AuthContext';
import { OptimizedImageUploader } from '../OptimizedImageUploader';

export const EventEditorModal: React.FC = () => {
    const { user } = useAuthContext();
    const {
        showHostWizard,
        setShowHostWizard,
        newEvent,
        setNewEvent,
        editingEventId,
        handleSaveEvent,
        handleGenerateAIEvent,
        isGeneratingDesc,
        generatedDesc,
        businesses,
        events,
        customLocalities
    } = useData();

    const userBusiness = user?.businessId ? businesses.find(b => b.id === user.businessId) : null;
    const userBusinessEvents = userBusiness ? events.filter(e => e.businessId === userBusiness.id) : [];
    const isSpecialUser = user?.email === 'ubicameinformacion@gmail.com' || user?.role === 'admin';
    const isPremium = userBusiness?.plan === SubscriptionPlan.BASIC || userBusiness?.plan === SubscriptionPlan.PREMIUM || userBusiness?.plan === SubscriptionPlan.EXPERT || isSpecialUser;
    const planCreditsLimit = isPremium ? Infinity : (PLAN_LIMITS[userBusiness?.plan || SubscriptionPlan.FREE] || 0);
    const availableCredits = userBusiness?.eventCredits ?? 0;
    const isAtLimit = !isPremium && availableCredits <= 0;

    if (!showHostWizard) return null;

    const sectors = LOCALITY_SECTORS[newEvent.locality] || DEFAULT_NEW_LOCALITY_SECTORS;

    const handleClose = () => {
        setShowHostWizard(false);
    };

    return (
        <div className="fixed inset-0 z-[2100] bg-slate-900/98 backdrop-blur-2xl flex flex-col p-6 overflow-y-auto pb-32 no-scrollbar animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8 sticky top-0 py-2 bg-slate-900/50 backdrop-blur-md z-30 -mx-6 px-6">
                <button
                    onClick={handleClose}
                    className="text-slate-400 font-bold hover:text-white transition-colors text-sm"
                >
                    Cerrar
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="text-white font-black uppercase tracking-[0.2em] text-[11px]">
                        {editingEventId ? 'EDITAR PULSO' : 'NUEVO PULSO'}
                    </h2>
                </div>
                <button
                    onClick={handleSaveEvent}
                    disabled={!newEvent.title || (isAtLimit && !editingEventId && !isPremium)}
                    className="text-orange-500 font-black uppercase tracking-widest text-[11px] disabled:opacity-30"
                >
                    Guardar
                </button>
            </div>

            {/* Plan Info Banner */}
            {userBusiness && (
                <div className={`max-w-xl mx-auto w-full mb-6 rounded-3xl p-4 border-2 ${isPremium ? 'bg-gradient-to-r from-amber-500/20 to-orange-500/20 border-amber-500/40' : isAtLimit ? 'bg-red-500/20 border-red-500/40' : 'bg-orange-500/10 border-orange-500/30'}`}>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            {isPremium ? (
                                <div className="p-2 bg-amber-500/30 rounded-xl">
                                    <Crown className="w-5 h-5 text-amber-400" />
                                </div>
                            ) : (
                                <div className="p-2 bg-orange-500/30 rounded-xl">
                                    <Zap className="w-5 h-5 text-orange-400" />
                                </div>
                            )}
                            <div>
                                <p className="text-xs font-black text-white uppercase tracking-wider">
                                    {isSpecialUser ? 'Plan Admin' : userBusiness?.plan === SubscriptionPlan.EXPERT ? 'Plan Expert' : userBusiness?.plan === SubscriptionPlan.PREMIUM ? 'Plan Premium' : userBusiness?.plan === SubscriptionPlan.BASIC ? 'Plan Basic' : 'Plan Gratis'}
                                </p>
                                {isSpecialUser ? (
                                    <p className="text-[10px] text-amber-400 font-medium">Pulses ilimitados</p>
                                ) : (
                                    <p className="text-[10px] text-orange-400 font-medium">
                                        {availableCredits}/{planCreditsLimit} Créditos de pulse restantes
                                    </p>
                                )}
                            </div>
                        </div>
                        {!isPremium && (
                            <button
                                onClick={() => { setShowHostWizard(false); window.location.href = '/plans'; }}
                                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl text-xs font-black uppercase tracking-wider hover:from-amber-400 hover:to-orange-400 transition-all shadow-lg shadow-orange-500/30"
                            >
                                Actualizar Plan
                            </button>
                        )}
                    </div>
                    {!isPremium && availableCredits <= 1 && availableCredits > 0 && (
                        <div className="mt-3 pt-3 border-t border-white/10 flex items-center gap-2 text-[10px] text-orange-400">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Te queda poco crédito de pulse. ¡Actualiza a Premium para ilimitados!</span>
                        </div>
                    )}
                </div>
            )}

            <div className="max-w-xl mx-auto w-full space-y-8">
                {/* Image Upload Section */}
                <OptimizedImageUploader 
                    path={`events/${user?.id || 'anonymous'}`}
                    currentImageUrl={newEvent.imageUrl}
                    onImageProcessed={(url) => setNewEvent({ ...newEvent, imageUrl: url })}
                />

                {/* Form Fields */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Título del Pulso</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Sunset Techno Party"
                            className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-5 font-bold text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500/50 transition-all"
                            value={newEvent.title}
                            onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" /> Localidad
                            </label>
                            <select
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-5 font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                value={newEvent.locality}
                                onChange={e => setNewEvent({ ...newEvent, locality: e.target.value, sector: (LOCALITY_SECTORS[e.target.value] || DEFAULT_NEW_LOCALITY_SECTORS)[0] || Sector.CENTRO })}
                            >
                                {[...LOCALITIES, ...(customLocalities || [])].map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" /> Sector
                            </label>
                            <select
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-5 font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                value={newEvent.sector}
                                onChange={e => setNewEvent({ ...newEvent, sector: e.target.value as Sector })}
                            >
                                {sectors.map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Vibra</label>
                            <select
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-5 font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                value={newEvent.vibe}
                                onChange={e => setNewEvent({ ...newEvent, vibe: e.target.value as Vibe })}
                            >
                                {Object.values(Vibe).map(v => <option key={v} value={v}>{v}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1.5">
                                <Tag className="w-3 h-3" /> Categoría
                            </label>
                            <input
                                type="text"
                                placeholder="Ej: Música, Surf..."
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-5 font-bold text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                value={newEvent.category}
                                onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1.5">
                                <Calendar className="w-3 h-3" /> Inicio
                            </label>
                            <input
                                type="datetime-local"
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-5 font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                value={newEvent.startAt}
                                onChange={e => setNewEvent({ ...newEvent, startAt: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1.5">
                                <Clock className="w-3 h-3" /> Fin
                            </label>
                            <input
                                type="datetime-local"
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-5 font-bold text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                value={newEvent.endAt}
                                onChange={e => setNewEvent({ ...newEvent, endAt: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between pl-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción</label>
                            <button
                                type="button"
                                onClick={handleGenerateAIEvent}
                                disabled={isGeneratingDesc || !newEvent.title}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-full transition-all border border-orange-500/20 disabled:opacity-50"
                            >
                                <Sparkles className={`w-3 h-3 ${isGeneratingDesc ? 'animate-spin' : ''}`} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {isGeneratingDesc ? 'Generando...' : 'AI Generar'}
                                </span>
                            </button>
                        </div>
                        <textarea
                            rows={4}
                            placeholder="Cuéntanos más sobre este pulso..."
                            className="w-full bg-slate-800/50 border border-white/5 rounded-[2rem] px-6 py-5 text-slate-300 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                            value={newEvent.description || ''}
                            onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                        />
                    </div>

                    <button
                        onClick={handleSaveEvent}
                        disabled={!newEvent.title || (isAtLimit && !editingEventId && !isPremium)}
                        className="w-full py-6 bg-gradient-to-r from-orange-500 to-amber-600 text-white font-black rounded-3xl shadow-xl shadow-orange-500/20 active:scale-95 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-10 uppercase tracking-widest"
                    >
                        {editingEventId ? 'GUARDAR CAMBIOS' : isAtLimit ? 'LÍMITE ALCANZADO' : 'CREAR PULSO'}
                    </button>
                    {isAtLimit && !isPremium && (
                        <p className="text-center text-[10px] text-red-400 mt-2">
                            No tienes créditos de pulse suficientes para este mes. ¡Actualiza tu plan!
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
};


