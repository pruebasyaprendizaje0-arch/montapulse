import React, { useState } from 'react';
import { X, MapPin, Plus, Trash2, Edit3, Save, Compass } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Sector } from '../../types';

export const LocalityManagerModal: React.FC = () => {
    const { 
        customLocalities, 
        showLocalityManager, 
        setShowLocalityManager, 
        handleAddCustomLocality,
        handleUpdateCustomLocality,
        handleDeleteCustomLocality
    } = useData();

    const [isAdding, setIsAdding] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    
    const [form, setForm] = useState({
        name: '',
        lat: -1.8253,
        lng: -80.7523,
        hasBeach: true
    });

    if (!showLocalityManager) return null;

    const handleSave = async () => {
        if (!form.name.trim()) return;
        
        if (editingId) {
            await handleUpdateCustomLocality(editingId, form.name, [form.lat, form.lng], form.hasBeach);
            setEditingId(null);
        } else {
            await handleAddCustomLocality(form.name, [form.lat, form.lng], form.hasBeach);
            setIsAdding(false);
        }
        
        setForm({ name: '', lat: -1.8253, lng: -80.7523, hasBeach: true });
    };

    const startEdit = (loc: any) => {
        setEditingId(loc.id);
        setForm({
            name: loc.name,
            lat: loc.coords?.[0] ?? -1.8253,
            lng: loc.coords?.[1] ?? -80.7523,
            hasBeach: loc.hasBeach ?? true
        });
        setIsAdding(false);
    };

    return (
        <div className="fixed inset-0 z-[2100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-sky-500/10 to-transparent">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-sky-500/20 flex items-center justify-center border border-sky-500/30">
                            <Compass className="w-6 h-6 text-sky-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic uppercase tracking-tight">Gestionar Pueblos</h2>
                            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Añade o edita localidades personalizadas</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => setShowLocalityManager(false)} 
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                    {/* Add/Edit Form */}
                    {(isAdding || editingId) && (
                        <div className="p-6 bg-white/5 border border-white/10 rounded-[2rem] space-y-6 animate-in zoom-in-95 duration-300">
                            <h3 className="text-sm font-black text-sky-400 uppercase tracking-[0.2em]">
                                {editingId ? 'Editar Localidad' : 'Nueva Localidad'}
                            </h3>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Nombre del Pueblo</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-sky-500/50 outline-none transition-all"
                                        placeholder="Ej: Olón, Manglaralto..."
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Latitud</label>
                                    <input
                                        type="number"
                                        value={form.lat}
                                        onChange={(e) => setForm({ ...form, lat: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-sky-500/50 outline-none transition-all"
                                        step="0.0001"
                                    />
                                </div>
                                
                                <div>
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Longitud</label>
                                    <input
                                        type="number"
                                        value={form.lng}
                                        onChange={(e) => setForm({ ...form, lng: parseFloat(e.target.value) })}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-5 py-4 text-white font-bold focus:border-sky-500/50 outline-none transition-all"
                                        step="0.0001"
                                    />
                                </div>

                                <div className="md:col-span-2 flex items-center gap-3">
                                    <button
                                        onClick={() => setForm({ ...form, hasBeach: !form.hasBeach })}
                                        className={`w-12 h-6 rounded-full transition-colors relative ${form.hasBeach ? 'bg-sky-500' : 'bg-slate-700'}`}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.hasBeach ? 'left-7' : 'left-1'}`} />
                                    </button>
                                    <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Incluir Sector Playa</span>
                                </div>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    onClick={handleSave}
                                    className="flex-1 bg-sky-500 hover:bg-sky-400 text-white font-black py-4 rounded-2xl transition-all flex items-center justify-center gap-2 shadow-xl shadow-sky-500/20"
                                >
                                    <Save className="w-5 h-5" />
                                    {editingId ? 'Guardar Cambios' : 'Crear Localidad'}
                                </button>
                                <button
                                    onClick={() => {
                                        setIsAdding(false);
                                        setEditingId(null);
                                    }}
                                    className="px-6 bg-white/5 hover:bg-white/10 text-slate-400 font-black py-4 rounded-2xl transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Localities List */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Pueblos Personalizados ({customLocalities.length})</h3>
                            {!isAdding && !editingId && (
                                <button
                                    onClick={() => {
                                        setIsAdding(true);
                                        setEditingId(null);
                                        setForm({ name: '', lat: -1.8253, lng: -80.7523, hasBeach: true });
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 rounded-xl border border-sky-500/20 transition-all text-[10px] font-black uppercase tracking-widest"
                                >
                                    <Plus className="w-3.5 h-3.5" />
                                    Añadir Nuevo
                                </button>
                            )}
                        </div>

                        {customLocalities.length === 0 ? (
                            <div className="text-center py-12 bg-white/2 rounded-[2rem] border border-dashed border-white/10">
                                <MapPin className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest">No hay pueblos personalizados creados.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 gap-3">
                                {customLocalities.map((loc, idx) => (
                                    <div 
                                        key={loc.id || idx}
                                        className="group flex items-center justify-between p-5 bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl transition-all"
                                    >
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-sky-400 group-hover:scale-110 transition-transform">
                                                <MapPin className="w-5 h-5" />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-black text-white uppercase tracking-tight">{loc.name}</h4>
                                                <p className="text-[9px] font-bold text-slate-500 tracking-widest">
                                                    {loc.coords ? `${loc.coords[0].toFixed(4)}, ${loc.coords[1].toFixed(4)}` : 'Sin coordenadas'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={() => startEdit(loc)}
                                                className="p-2.5 bg-white/5 hover:bg-sky-500/20 text-slate-500 hover:text-sky-400 rounded-xl transition-all"
                                                title="Editar"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    if (confirm(`¿Eliminar localidad "${loc.name}"?`)) {
                                                        handleDeleteCustomLocality(loc.id!, loc.name);
                                                    }
                                                }}
                                                className="p-2.5 bg-white/5 hover:bg-rose-500/20 text-slate-500 hover:text-rose-400 rounded-xl transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className="p-6 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                        <p className="text-[10px] font-bold text-amber-500 uppercase tracking-widest leading-relaxed">
                            <span className="inline-block mr-2 text-base">⚠️</span>
                            Los pueblos predefinidos en el sistema (Montañita, Olón, etc. que vienen del archivo constants) no se pueden editar desde aquí por seguridad de la infraestructura core.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};
