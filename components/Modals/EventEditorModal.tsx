import React, { useRef } from 'react';
import { X, Camera, Upload, Sparkles, Calendar, Clock, MapPin, Tag } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Sector, Vibe } from '../../types';
import { LOCALITIES, LOCALITY_SECTORS } from '../../constants';

export const EventEditorModal: React.FC = () => {
    const {
        showHostWizard,
        setShowHostWizard,
        newEvent,
        setNewEvent,
        editingEventId,
        handleSaveEvent,
        handleGenerateAIEvent,
        isGeneratingDesc,
        handleImageUpload,
        generatedDesc
    } = useData();

    const fileInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    if (!showHostWizard) return null;

    const sectors = LOCALITY_SECTORS[newEvent.locality] || Object.values(Sector);

    return (
        <div className="fixed inset-0 z-[2100] bg-slate-900/95 backdrop-blur-xl flex flex-col p-6 overflow-y-auto pb-32 no-scrollbar animate-in fade-in duration-300">
            <div className="flex items-center justify-between mb-8">
                <button
                    onClick={() => setShowHostWizard(false)}
                    className="p-2 hover:bg-white/10 rounded-full transition-colors"
                >
                    <X className="w-6 h-6 text-slate-400" />
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="text-white font-black uppercase tracking-[0.2em] text-xs">
                        {editingEventId ? 'EDITAR PULSO' : 'NUEVO PULSO'}
                    </h2>
                    <div className="h-1 w-8 bg-sky-500 rounded-full mt-1"></div>
                </div>
                <div className="w-10" />
            </div>

            <div className="max-w-xl mx-auto w-full space-y-8">
                {/* Image Upload Section */}
                <div className="relative w-full aspect-video bg-slate-800 rounded-[2.5rem] overflow-hidden group border-2 border-dashed border-slate-700 hover:border-sky-500/50 transition-colors">
                    <img
                        src={newEvent.imageUrl || "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?auto=format&fit=crop&q=80&w=600"}
                        className="w-full h-full object-cover opacity-60"
                        alt="Event preview"
                    />
                    <div className="absolute inset-0 flex items-center justify-center gap-6 bg-black/40 opacity-100 group-hover:bg-black/20 transition-all">
                        <button
                            type="button"
                            onClick={() => cameraInputRef.current?.click()}
                            className="p-5 bg-white/10 backdrop-blur-md rounded-3xl hover:bg-white/20 hover:scale-110 transition-all border border-white/10"
                        >
                            <Camera className="w-7 h-7 text-white" />
                        </button>
                        <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            className="p-5 bg-white/10 backdrop-blur-md rounded-3xl hover:bg-white/20 hover:scale-110 transition-all border border-white/10"
                        >
                            <Upload className="w-7 h-7 text-white" />
                        </button>
                    </div>
                </div>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'event')}
                />
                <input
                    ref={cameraInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={(e) => handleImageUpload(e, 'event')}
                />

                {/* Form Fields */}
                <div className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2">Título del Pulso</label>
                        <input
                            required
                            type="text"
                            placeholder="Ej: Sunset Techno Party"
                            className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-5 font-bold text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-500/50 transition-all"
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
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-5 font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                                value={newEvent.locality}
                                onChange={e => setNewEvent({ ...newEvent, locality: e.target.value, sector: (LOCALITY_SECTORS[e.target.value] || [])[0] || Sector.CENTRO })}
                            >
                                {LOCALITIES.map(l => <option key={l.name} value={l.name}>{l.name}</option>)}
                            </select>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 flex items-center gap-1.5">
                                <MapPin className="w-3 h-3" /> Sector
                            </label>
                            <select
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-5 font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-5 py-5 font-bold text-white appearance-none focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-6 py-5 font-bold text-white shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-5 font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
                                className="w-full bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-5 font-bold text-white focus:outline-none focus:ring-2 focus:ring-sky-500/50"
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
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-full transition-all border border-sky-500/20 disabled:opacity-50"
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
                            className="w-full bg-slate-800/50 border border-white/5 rounded-[2rem] px-6 py-5 text-slate-300 text-sm shadow-inner focus:outline-none focus:ring-2 focus:ring-sky-500/50"
                            value={newEvent.description || ''}
                            onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                        />
                    </div>

                    <button
                        onClick={handleSaveEvent}
                        disabled={!newEvent.title}
                        className="w-full py-6 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-black rounded-3xl shadow-xl shadow-sky-500/20 active:scale-95 hover:scale-[1.02] transition-all disabled:opacity-50 mt-10 uppercase tracking-widest"
                    >
                        {editingEventId ? 'GUARDAR CAMBIOS' : 'CREAR PULSO'}
                    </button>
                </div>
            </div>
        </div>
    );
};
