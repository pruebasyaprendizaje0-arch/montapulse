import React, { useState } from 'react';
import { MapPin, Plus, Edit2, Trash2, Globe, Search } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { createCustomLocality, updateCustomLocality, deleteCustomLocality } from '../../../services/firestoreService';

export const LocalityPanel: React.FC = () => {
    const { customLocalities } = useData();
    const { showToast, showConfirm } = useToast();
    const [searchQuery, setSearchQuery] = useState('');

    const handleAddLocality = async () => {
        const name = window.prompt("Nombre de la localidad:");
        if (name && name.trim()) {
            try {
                await createCustomLocality({ name: name.trim() });
                showToast("Localidad añadida", "success");
            } catch (error) {
                showToast("Error al añadir", "error");
            }
        }
    };

    const handleEditLocality = async (id: string, currentName: string) => {
        const name = window.prompt("Nuevo nombre:", currentName);
        if (name && name.trim() && name !== currentName) {
            try {
                await updateCustomLocality(id, { name: name.trim() });
                showToast("Localidad actualizada", "success");
            } catch (error) {
                showToast("Error al actualizar", "error");
            }
        }
    };

    const handleDeleteLocality = async (id: string, name: string) => {
        if (await showConfirm(`¿Eliminar la localidad "${name}"?`, "Peligro")) {
            try {
                await deleteCustomLocality(id);
                showToast("Localidad eliminada", "success");
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
                    onClick={handleAddLocality}
                    className="p-6 bg-orange-500 hover:bg-orange-600 text-white rounded-[2rem] transition-all shadow-xl shadow-orange-500/20"
                >
                    <Plus className="w-5 h-5" />
                </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filtered.map(locality => (
                    <div key={locality.id} className="bg-neutral-900/50 border border-white/5 rounded-[2.5rem] p-6 hover:bg-neutral-900/80 transition-all group">
                        <div className="flex items-center justify-between mb-4">
                            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                                <MapPin className="w-5 h-5 text-orange-500" />
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleEditLocality(locality.id, locality.name)}
                                    className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-xl transition-all"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteLocality(locality.id, locality.localityName || locality.name)}
                                    className="p-2 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 rounded-xl transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                        <h5 className="text-sm font-black text-white mb-1 uppercase tracking-wider">{locality.name}</h5>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-bold tracking-widest">
                            <Globe className="w-3 h-3" />
                            <span>Pueblo Montapulse</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
