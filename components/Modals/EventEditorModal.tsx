import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, Upload, Sparkles, Calendar, Clock, MapPin, Tag, Zap, AlertTriangle, Crown, Store, Link as LinkIcon, Image as ImageIcon } from 'lucide-react';
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
        events,
        businesses,
        customLocalities,
        masterCategories,
        masterSectors,
        masterVibes,
        isAdmin
    } = useData();

    const userBusiness = user?.businessId && businesses ? businesses.find(b => b.id === user.businessId) : null;
    const userBusinessEvents = userBusiness && events ? events.filter(e => e.businessId === userBusiness.id) : [];
    const isSpecialUser = user?.email === 'ubicameinformacion@gmail.com' || user?.role === 'admin' || isAdmin;
    const userPlan = userBusiness?.plan || user?.plan || SubscriptionPlan.FREE;
    const isEliteOrAbove = userPlan === SubscriptionPlan.ELITE || userPlan === SubscriptionPlan.EXPERT || isSpecialUser;
    const isPro = userPlan === SubscriptionPlan.PRO;
    const isPremium = isPro || isEliteOrAbove;

    const [imageMode, setImageMode] = useState<'camera' | 'url'>(isEliteOrAbove ? 'camera' : 'url');

    useEffect(() => {
        if (isEliteOrAbove) {
            setImageMode('camera');
        } else {
            setImageMode('url');
        }
    }, [isEliteOrAbove]);

    const planCreditsLimit = isPremium ? Infinity : (PLAN_LIMITS[userBusiness?.plan || SubscriptionPlan.FREE] || 0);
    const availableCredits = userBusiness?.eventCredits ?? 0;
    const isAtLimit = !isPremium && availableCredits <= 0;

    if (!showHostWizard) return null;

    const allLocalities = [...LOCALITIES, ...(customLocalities || [])];
    const availableSectors = newEvent.locality ? (LOCALITY_SECTORS[newEvent.locality] || DEFAULT_NEW_LOCALITY_SECTORS) : [];

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
                                    {isSpecialUser ? 'Plan Admin' : userBusiness?.plan === SubscriptionPlan.EXPERT ? 'Plan Expert' : userBusiness?.plan === SubscriptionPlan.ELITE ? 'Plan Elite' : userBusiness?.plan === SubscriptionPlan.PRO ? 'Plan Pro' : 'Plan Gratis'}
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
                {/* Image Section */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between pl-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                            <ImageIcon className="w-3.5 h-3.5 text-orange-400" /> Imagen del Pulso
                        </label>
                        {isEliteOrAbove ? (
                            <span className="text-[9px] font-black text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <Crown className="w-3 h-3" /> Elite: Cámara & URL
                            </span>
                        ) : (
                            <span className="text-[9px] font-black text-orange-400 bg-orange-500/10 border border-orange-500/30 px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                                <LinkIcon className="w-3 h-3" /> Plan Pro: Solo URL
                            </span>
                        )}
                    </div>

                    {/* Selector de modo para Plan Elite / Expert / Admin */}
                    {isEliteOrAbove && (
                        <div className="flex p-1 bg-slate-800/80 rounded-2xl border border-white/10 shadow-inner">
                            <button
                                type="button"
                                onClick={() => setImageMode('camera')}
                                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    imageMode === 'camera'
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <Camera className="w-4 h-4" />
                                <span>Cámara del Celular</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setImageMode('url')}
                                className={`flex-1 py-3 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer ${
                                    imageMode === 'url'
                                        ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg'
                                        : 'text-slate-400 hover:text-white'
                                }`}
                            >
                                <LinkIcon className="w-4 h-4" />
                                <span>Enlace / URL</span>
                            </button>
                        </div>
                    )}

                    {/* Contenido según modo o plan */}
                    {isEliteOrAbove && imageMode === 'camera' ? (
                        <OptimizedImageUploader 
                            path={`events/${user?.id || 'anonymous'}`}
                            currentImageUrl={newEvent.imageUrl}
                            onImageProcessed={(url) => setNewEvent({ ...newEvent, imageUrl: url })}
                        />
                    ) : (
                        <div className="space-y-3">
                            <div className="relative">
                                <input
                                    type="url"
                                    placeholder="Pega aquí la URL de la imagen (ej: https://...)"
                                    className="w-full bg-slate-800/60 border border-white/10 rounded-2xl pl-4 pr-10 py-4 font-bold text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-orange-500/50 shadow-inner text-sm"
                                    value={newEvent.imageUrl || ''}
                                    onChange={(e) => setNewEvent({ ...newEvent, imageUrl: e.target.value })}
                                />
                                {newEvent.imageUrl && (
                                    <button
                                        type="button"
                                        onClick={() => setNewEvent({ ...newEvent, imageUrl: '' })}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors cursor-pointer"
                                        title="Limpiar URL"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>

                            {/* Previsualización del enlace */}
                            {newEvent.imageUrl ? (
                                <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-white/10 bg-slate-950 group shadow-lg">
                                    <img 
                                        src={newEvent.imageUrl} 
                                        alt="Vista previa del pulso" 
                                        className="w-full h-full object-cover"
                                        onError={(e) => {
                                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?auto=format&fit=crop&q=80';
                                        }}
                                    />
                                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-md px-3 py-1 rounded-xl text-[10px] font-bold text-white border border-white/10">
                                        Vista Previa de Imagen
                                    </div>
                                </div>
                            ) : (
                                !isEliteOrAbove && (
                                    <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                        <div className="flex items-center gap-2.5 text-xs text-amber-200/90 font-medium">
                                            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center shrink-0">
                                                <Camera className="w-4 h-4 text-amber-400" />
                                            </div>
                                            <span>¿Quieres tomar fotos directamente con la cámara del celular? Pasa a <strong>Plan ELITE</strong>.</span>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={() => { setShowHostWizard(false); window.location.href = '/plans'; }}
                                            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white rounded-xl text-xs font-black uppercase tracking-wider shrink-0 shadow-lg shadow-orange-500/20 self-start sm:self-auto cursor-pointer"
                                        >
                                            Ver Plan Elite
                                        </button>
                                    </div>
                                )
                            )}
                        </div>
                    )}
                </div>

                {/* Form Fields */}
                <div className="space-y-6">
                    {/* Admin Business Selector */}
                    {isAdmin && (
                        <div className="space-y-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl">
                            <label className="text-[10px] font-black text-amber-400 uppercase tracking-widest pl-1 flex items-center gap-1.5">
                                <Store className="w-3.5 h-3.5" /> Adjudicar a Negocio / Punto de Interés (Solo Admin)
                            </label>
                            <select
                                className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-4 py-3 font-bold text-amber-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                                value={newEvent.businessId || ""}
                                onChange={e => setNewEvent({ ...newEvent, businessId: e.target.value })}
                            >
                                <option value="">Mi propio perfil de usuario / negocio predeterminado</option>
                                {(businesses || []).map(b => (
                                    <option key={b.id} value={b.id}>
                                        {b.name} ({b.locality || 'Sin localidad'} - {b.category})
                                    </option>
                                ))}
                            </select>
                            <p className="text-[10px] text-amber-300/70 pl-1">
                                Permite publicar eventos a nombre de un comercio o sitio para promocionarlo en la app.
                            </p>
                        </div>
                    )}

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
                                value={newEvent.locality || ""}
                                onChange={e => {
                                    const loc = e.target.value;
                                    const locSectors = LOCALITY_SECTORS[loc] || DEFAULT_NEW_LOCALITY_SECTORS;
                                    setNewEvent({ ...newEvent, locality: loc, sector: locSectors[0] as Sector || Sector.CENTRO });
                                }}
                            >
                                <option value="" disabled>Selecciona una localidad</option>
                                {allLocalities.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" /> Sector
                            </label>
                            <select
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-5 font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50 disabled:opacity-50"
                                value={newEvent.sector || ""}
                                onChange={e => setNewEvent({ ...newEvent, sector: e.target.value as Sector })}
                                disabled={!newEvent.locality}
                            >
                                <option value="" disabled>Selecciona un sector</option>
                                {[...availableSectors, ...(masterSectors || []).filter(s => s.locality === newEvent.locality).map(s => s.name)].map(s => <option key={s} value={s}>{s}</option>)}
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
                                {(masterVibes && masterVibes.length > 0 
                                    ? masterVibes.map((v: any) => v.name) 
                                    : Object.values(Vibe)
                                ).map((v: string) => (
                                    <option key={v} value={v}>{v}</option>
                                ))}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1.5">
                                <Tag className="w-3 h-3" /> Categoría
                            </label>
                            <select
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-5 font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-orange-500/50"
                                value={newEvent.category}
                                onChange={e => setNewEvent({ ...newEvent, category: e.target.value })}
                            >
                                <option value="">Seleccionar Categoría</option>
                                {masterCategories?.map(c => <option key={c.name} value={c.name}>{c.name}</option>)}
                                {(!masterCategories || masterCategories.length === 0) && (
                                    <>
                                        <option value="Fiesta">Fiesta</option>
                                        <option value="Cena">Cena</option>
                                        <option value="Música">Música</option>
                                        <option value="Deporte">Deporte</option>
                                        <option value="Sunset">Sunset</option>
                                    </>
                                )}
                            </select>
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
                        <div className="pl-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción</label>
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


