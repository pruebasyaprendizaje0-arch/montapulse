import React, { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Globe, Search } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';

export const LocalityPanel: React.FC = () => {
    const { 
        customLocalities, 
        handleAddCustomLocality,
        handleUpdateCustomLocality,
        handleDeleteCustomLocality 
    } = useData();
    const { showToast, showConfirm } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [isAdding, setIsAdding] = useState(false);
    const [name, setName] = useState('');
    const [coords, setCoords] = useState<[number, number]>([-1.8021, -80.7516]); // Default near Olón
    const [hasBeach, setHasBeach] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);

    const handleAddLocality = async () => {
        if (!name.trim()) return;
        try {
            if (editingId) {
                await handleUpdateCustomLocality(
                    editingId, 
                    name.trim(), 
                    coords, 
                    hasBeach
                );
            } else {
                await handleAddCustomLocality(name.trim(), coords, hasBeach);
            }
            resetForm();
        } catch (error) {
            showToast("Error al guardar", "error");
        }
    };

    const resetForm = () => {
        setName('');
        setCoords([-1.8021, -80.7516]);
        setHasBeach(false);
        setEditingId(null);
        setIsAdding(false);
    };

    const handleEdit = (locality: any) => {
        setEditingId(locality.id);
        setName(locality.name);
        setCoords(locality.coords || [-1.8021, -80.7516]);
        setHasBeach(locality.hasBeach || false);
        setIsAdding(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (await showConfirm(`¿Eliminar la localidad "${name}"?`, "Peligro")) {
            try {
                await handleDeleteCustomLocality(id, name);
            } catch (error) {
                showToast("Error al eliminar", "error");
            }
        }
    };

    const filtered = customLocalities.filter(l => 
        l.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between gap-4">
                <div className="flex-1 flex items-center gap-4 bg-neutral-900/50 p-6 rounded-[2rem] border border-white/5 shadow-xl">
                    <Search className="w-5 h-5 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar localidades..." 
                        className="bg-transparent border-none text-white text-sm w-full focus:outline-none"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>
                <button 
                    onClick={() => { 
                        if (isAdding) resetForm();
                        else setIsAdding(true);
                    }}
                    className="p-6 bg-orange-500 hover:bg-orange-600 text-white rounded-[2rem] transition-all shadow-xl shadow-orange-500/20"
                >
                    <Plus className={`w-5 h-5 transition-transform duration-300 ${isAdding ? 'rotate-45' : ''}`} />
                </button>
            </div>

            {isAdding && (
                <div className="bg-neutral-900/80 p-6 rounded-[2rem] border border-white/10 space-y-6 animate-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del Pueblo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full bg-neutral-800 p-4 rounded-2xl text-white placeholder-slate-500 border border-white/5 focus:outline-none focus:border-orange-500/50 transition-all"
                                placeholder="Ej: Olón, Manglaralto..."
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Estado</label>
                            <button
                                onClick={() => setHasBeach(!hasBeach)}
                                className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all ${
                                    hasBeach 
                                        ? 'bg-sky-500/10 border-sky-500/40 text-sky-400' 
                                        : 'bg-neutral-800 border-white/5 text-slate-500'
                                }`}
                            >
                                <span className="text-xs font-bold uppercase tracking-wider">{hasBeach ? 'Tiene Playa' : 'Sin Playa'}</span>
                                <Globe className={`w-4 h-4 ${hasBeach ? 'animate-pulse' : ''}`} />
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Latitud</label>
                            <input
                                type="number"
                                step="any"
                                value={coords[0]}
                                onChange={(e) => setCoords([parseFloat(e.target.value) || 0, coords[1]])}
                                className="w-full bg-neutral-800 p-4 rounded-2xl text-white border border-white/5 focus:outline-none focus:border-orange-500/50 transition-all text-sm font-mono"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Longitud</label>
                            <input
                                type="number"
                                step="any"
                                value={coords[1]}
                                onChange={(e) => setCoords([coords[0], parseFloat(e.target.value) || 0])}
                                className="w-full bg-neutral-800 p-4 rounded-2xl text-white border border-white/5 focus:outline-none focus:border-orange-500/50 transition-all text-sm font-mono"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={resetForm}
                            className="flex-1 bg-white/5 text-slate-400 py-4 rounded-2xl hover:bg-white/10 font-black text-xs uppercase tracking-widest transition-all"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleAddLocality}
                            className="flex-[2] bg-orange-500 text-white py-4 rounded-2xl hover:bg-orange-600 font-black text-xs uppercase tracking-widest shadow-lg shadow-orange-500/20 transition-all active:scale-[0.98]"
                        >
                            {editingId ? 'Actualizar Localidad' : 'Crear Localidad'}
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {filtered.map(locality => (
                    <div key={locality.id} className="bg-neutral-900/50 border border-white/5 rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 hover:bg-neutral-900/80 transition-all group relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3 sm:mb-4">
                            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20 shrink-0">
                                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
                            </div>
                            <div className="flex gap-1.5 sm:gap-2">
                                <button 
                                    onClick={() => handleEdit(locality)}
                                    className="p-2 sm:p-2.5 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg sm:rounded-xl transition-all active:scale-90"
                                >
                                    <Edit2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(locality.id, locality.name)}
                                    className="p-2 sm:p-2.5 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 rounded-lg sm:rounded-xl transition-all active:scale-90"
                                >
                                    <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </button>
                            </div>
                        </div>
                        <h5 className="text-xs sm:text-sm font-black text-white mb-1 uppercase tracking-wider truncate">{locality.name}</h5>
                        <div className="flex items-center gap-2 text-[8px] sm:text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                            <Globe className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                            <span>Pueblo Montapulse {locality.hasBeach && '• Playa'}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
