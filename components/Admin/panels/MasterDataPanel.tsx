import React, { useState } from 'react';
import { 
    Globe, Building2, Zap, Activity, MessageSquare, 
    Trash2, Edit2, Plus, Save, X, Search 
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { 
    createMasterDataItem, updateMasterDataItem, deleteMasterDataItem 
} from '../../../services/firestoreService';
import { LOCALITIES } from '../../../constants';

export const MasterDataPanel: React.FC = () => {
    const { 
        masterCategories, masterTags, masterSectors, masterVibes, customLocalities 
    } = useData();
    const { showToast, showConfirm } = useToast();

    const [activeTab, setActiveTab] = useState<'localities' | 'categories' | 'tags' | 'sectors' | 'vibes'>('localities');
    const [showCreator, setShowCreator] = useState(false);
    const [editingItemId, setEditingItemId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [form, setForm] = useState({ name: '', locality: '' });

    const collections = [
        { id: 'localities', label: 'Localidades', icon: Globe, desc: 'Gestión de pueblos y zonas', color: 'text-sky-400', bg: 'bg-sky-400/10' },
        { id: 'categories', label: 'Categorías', icon: Building2, desc: 'Tipos de negocios y servicios', color: 'text-orange-400', bg: 'bg-orange-400/10' },
        { id: 'tags', label: 'Etiquetas', icon: Zap, desc: 'Atributos y características', color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
        { id: 'sectors', label: 'Sectores', icon: Activity, desc: 'Barrios y subdivisiones', color: 'text-violet-400', bg: 'bg-violet-400/10' },
        { id: 'vibes', label: 'Vibras', icon: MessageSquare, desc: 'Estilos y ambientes', color: 'text-rose-400', bg: 'bg-rose-400/10' },
    ];

    const getCurrentItems = () => {
        switch(activeTab) {
            case 'localities': return customLocalities;
            case 'categories': return masterCategories;
            case 'tags': return masterTags;
            case 'sectors': return masterSectors;
            case 'vibes': return masterVibes;
            default: return [];
        }
    };

    const allLocalities = Array.from(new Set([
        ...LOCALITIES.map(l => l.name),
        ...(customLocalities || []).map(l => l.name)
    ])).sort();

    const handleAdd = async () => {
        if (!form.name) {
            showToast("El nombre es obligatorio", "error");
            return;
        }

        if (activeTab === 'sectors' && !form.locality) {
            showToast("Debes seleccionar una localidad", "error");
            return;
        }

        try {
            setIsLoading(true);
            const collectionName = activeTab === 'localities' ? 'customLocalities' : activeTab;
            
            if (editingItemId) {
                await updateMasterDataItem(collectionName, editingItemId, { 
                    name: form.name,
                    ...(activeTab === 'sectors' ? { locality: form.locality } : {})
                });
                showToast("Actualizado correctamente", "success");
            } else {
                await createMasterDataItem(collectionName, { 
                    name: form.name,
                    ...(activeTab === 'sectors' ? { locality: form.locality } : {})
                });
                showToast("Creado correctamente", "success");
            }
            
            setShowCreator(false);
            setEditingItemId(null);
            setForm({ name: '', locality: '' });
        } catch (error) {
            showToast(`Error al ${editingItemId ? 'actualizar' : 'crear'}`, "error");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEdit = (item: any) => {
        setEditingItemId(item.id);
        setForm({ 
            name: item.name, 
            locality: item.locality || '' 
        });
        setShowCreator(true);
    };

    const handleDelete = async (id: string) => {
        if (await showConfirm("¿Eliminar este registro? Esta acción no se puede deshacer.", "Confirmar eliminación")) {
            try {
                await deleteMasterDataItem(activeTab === 'localities' ? 'customLocalities' : activeTab, id);
                showToast("Registro eliminado", "success");
            } catch (error) {
                showToast("Error al eliminar", "error");
            }
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {collections.map(col => (
                    <button
                        key={col.id}
                        onClick={() => {
                            setActiveTab(col.id as any);
                            setShowCreator(false);
                        }}
                        className={`relative overflow-hidden group p-4 rounded-3xl border transition-all ${activeTab === col.id ? 'bg-orange-500 border-orange-500 shadow-xl shadow-orange-500/20 scale-[1.02]' : 'bg-neutral-900/50 border-white/5 hover:border-white/10'}`}
                    >
                        <div className={`w-10 h-10 rounded-2xl mb-3 flex items-center justify-center transition-all ${activeTab === col.id ? 'bg-black/20' : col.bg}`}>
                            <col.icon className={`w-5 h-5 ${activeTab === col.id ? 'text-black' : col.color}`} />
                        </div>
                        <p className={`text-[10px] font-black uppercase tracking-widest ${activeTab === col.id ? 'text-black' : 'text-white'}`}>{col.label}</p>
                        <p className={`text-[8px] font-medium mt-1 leading-tight ${activeTab === col.id ? 'text-black/60' : 'text-slate-500'}`}>{col.desc}</p>
                    </button>
                ))}
            </div>

            <div className="bg-neutral-900/50 p-8 rounded-[2.5rem] border border-white/5 shadow-xl space-y-8">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
                            {React.createElement(collections.find(c => c.id === activeTab)?.icon || Globe, { 
                                className: "w-6 h-6 text-orange-500" 
                            })}
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-white tracking-tight capitalize">{activeTab}</h3>
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1">
                                {getCurrentItems().length} registros activos
                            </p>
                        </div>
                    </div>
                    {!showCreator && (
                        <button 
                            onClick={() => setShowCreator(true)}
                            className="px-6 py-3 bg-white text-black rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:scale-105 active:scale-95 shadow-xl shadow-white/5 flex items-center gap-2"
                        >
                            <Plus className="w-3.5 h-3.5" />
                            Nuevo Registro
                        </button>
                    )}
                </div>

                {showCreator && (
                    <div className="bg-white/5 p-6 rounded-3xl border border-white/10 animate-in zoom-in-95 duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Nombre</label>
                                <input 
                                    type="text" 
                                    className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-orange-500/50"
                                    placeholder={`Ej: ${activeTab === 'localities' ? 'Montañita' : 'Restaurante'}`}
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>
                            {activeTab === 'sectors' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Localidad</label>
                                    <select 
                                        className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 text-sm text-white outline-none focus:border-orange-500/50"
                                        value={form.locality}
                                        onChange={e => setForm({ ...form, locality: e.target.value })}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {allLocalities.map(l => <option key={l} value={l}>{l}</option>)}
                                    </select>
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button 
                                onClick={handleAdd}
                                disabled={isLoading}
                                className="flex-1 bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {editingItemId ? 'Guardar Cambios' : 'Crear Registro'}
                            </button>
                            <button 
                                onClick={() => {
                                    setShowCreator(false);
                                    setEditingItemId(null);
                                    setForm({ name: '', locality: '' });
                                }}
                                className="px-6 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {getCurrentItems().map((item: any) => (
                        <div key={item.id} className="p-6 bg-black/20 rounded-3xl border border-white/5 hover:bg-black/40 transition-all group flex items-center justify-between">
                            <div className="min-w-0">
                                <h5 className="text-xs font-black text-white uppercase truncate">{item.name}</h5>
                                {item.locality && (
                                    <p className="text-[9px] text-slate-500 font-black uppercase mt-1 tracking-wider">{item.locality}</p>
                                )}
                            </div>
                            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={() => handleEdit(item)}
                                    className="p-2 bg-white/5 hover:bg-white/10 text-slate-400 rounded-lg transition-all"
                                >
                                    <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button 
                                    onClick={() => handleDelete(item.id)}
                                    className="p-2 bg-rose-500/5 hover:bg-rose-500/10 text-rose-500 rounded-lg transition-all"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};
