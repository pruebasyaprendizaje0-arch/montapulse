import React, { useState } from 'react';
import { Search, ShieldCheck, Trash2, CheckCircle, Edit3 } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { updateBusiness, deleteBusiness } from '../../../services/firestoreService';

export const BusinessesPanel: React.FC = () => {
    const { 
        businesses, deletedBusinesses, handleRestoreBusiness,
        setEditingBusinessId, setShowBusinessEdit 
    } = useData();
    const { showToast, showConfirm } = useToast();
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'all' | 'reference' | 'deleted'>('all');

    const filteredBusinesses = businesses.filter(b => {
        const q = (searchQuery || '').toLowerCase();
        const name = String(b.name || '').toLowerCase();
        const cat = String(b.category || '').toLowerCase();
        
        const matchesSearch = name.includes(q) || cat.includes(q);
        const matchesView = viewMode === 'reference' ? b.isReference : !b.isReference;
        
        return matchesSearch && matchesView;
    });

    const filteredDeleted = deletedBusinesses.filter(b => {
        const q = (searchQuery || '').toLowerCase();
        return String(b.name || '').toLowerCase().includes(q);
    });

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col gap-3 sm:gap-4 px-1">
                <div className="flex items-center gap-3 sm:gap-4 bg-neutral-900/50 p-3.5 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-xl">
                    <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar por nombre o categoría..." 
                        className="bg-transparent border-none text-white text-xs sm:text-sm w-full focus:outline-none"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                    />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setViewMode('all')}
                        className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${viewMode === 'all' ? 'bg-orange-500 text-black border-orange-500' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                    >
                        Negocios ({businesses.filter(b => !b.isReference).length})
                    </button>
                    <button
                        onClick={() => setViewMode('reference')}
                        className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${viewMode === 'reference' ? 'bg-sky-500 text-black border-sky-500' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                    >
                        Referencias ({businesses.filter(b => b.isReference).length})
                    </button>
                    <button
                        onClick={() => setViewMode('deleted')}
                        className={`flex-1 py-2.5 sm:py-3 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${viewMode === 'deleted' ? 'bg-rose-500 text-black border-rose-500' : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'}`}
                    >
                        Papelera ({deletedBusinesses.length})
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {(viewMode === 'deleted' ? filteredDeleted : filteredBusinesses).map(biz => (
                    <div key={biz.id} className="bg-neutral-900/50 border border-white/5 rounded-2xl sm:rounded-[2rem] p-3.5 sm:p-6 hover:bg-neutral-900/80 transition-all group shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 sm:gap-4 overflow-hidden">
                                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-black overflow-hidden border border-white/10 relative shrink-0 ${viewMode === 'deleted' ? 'grayscale opacity-50' : ''}`}>
                                    <img src={biz.imageUrl} className="w-full h-full object-cover" alt={biz.name} />
                                    {biz.isVerified && viewMode !== 'deleted' && (
                                        <div className="absolute -top-1 -right-1 bg-sky-500 p-0.5 sm:p-1 rounded-md sm:rounded-lg border border-black">
                                            <CheckCircle className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h5 className="text-xs sm:text-sm font-black text-white truncate">{biz.name}</h5>
                                        {viewMode !== 'deleted' && (
                                            <span className="text-[7px] sm:text-[9px] px-1.5 py-0.5 bg-white/5 rounded-md text-slate-500 uppercase font-black">{biz.category}</span>
                                        )}
                                    </div>
                                    <p className="text-[8px] sm:text-[10px] text-slate-400 mt-0.5 truncate">Dueño ID: {biz.ownerId?.slice(0, 8)}...</p>
                                    {viewMode !== 'deleted' && !biz.isReference && (
                                        <p className="text-[8px] sm:text-[10px] text-orange-500 font-black uppercase tracking-widest mt-0.5">{biz.plan}</p>
                                    )}
                                    {biz.isReference && (
                                        <p className="text-[8px] sm:text-[10px] text-sky-400 font-black uppercase tracking-widest mt-0.5">Punto de Referencia</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                {viewMode !== 'deleted' ? (
                                    <>
                                        <button 
                                            onClick={async () => {
                                                const v = !biz.isVerified;
                                                await updateBusiness(biz.id, { isVerified: v });
                                                showToast(v ? "Negocio verificado" : "Verificación removida", "success");
                                            }}
                                            className={`p-2.5 sm:p-3 rounded-xl border transition-all ${biz.isVerified ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-black/40 text-slate-500 border-white/5 hover:bg-black/60'}`}
                                            title={biz.isVerified ? "Desverificar" : "Verificar"}
                                        >
                                            <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                setEditingBusinessId(biz.id);
                                                setShowBusinessEdit(true);
                                            }}
                                            className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 transition-all"
                                            title="Editar Negocio"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (await showConfirm(`¿Mover negocio "${biz.name}" a la papelera?`, "Papelera")) {
                                                    await deleteBusiness(biz.id, false);
                                                    showToast("Negocio movido a la papelera", "success");
                                                }
                                            }}
                                            className="p-2.5 sm:p-3 bg-white/5 hover:bg-rose-500/10 text-rose-500 rounded-xl border border-white/10 transition-all"
                                            title="Mover a papelera"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button 
                                            onClick={async () => {
                                                await handleRestoreBusiness(biz.id);
                                                showToast("Negocio restaurado", "success");
                                            }}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-black text-[8px] sm:text-[10px] font-black uppercase rounded-lg sm:rounded-xl hover:scale-105 transition-all"
                                        >
                                            Restaurar
                                        </button>
                                        <button 
                                            onClick={async () => {
                                                if (await showConfirm(`¿BORRADO DEFINITIVO de "${biz.name}"? Esta acción no se puede deshacer.`, "¡PELIGRO!")) {
                                                    await deleteBusiness(biz.id, true);
                                                    showToast("Negocio eliminado permanentemente", "error");
                                                }
                                            }}
                                            className="p-2.5 sm:p-3 bg-red-500/10 text-red-500 rounded-xl border border-red-500/20 hover:bg-red-500 hover:text-white transition-all"
                                            title="Eliminar permanentemente"
                                        >
                                            <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
                {(viewMode === 'deleted' ? filteredDeleted : filteredBusinesses).length === 0 && (
                    <div className="text-center py-20 opacity-30">
                        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em]">No se encontraron negocios</p>
                    </div>
                )}
            </div>
        </div>
    );
};

const Store = ({ className }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7" /><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4" /><path d="M2 7h20" /><path d="M22 7v3a2 2 0 0 1-2 2v0a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 16 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 12 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 8 12a2.7 2.7 0 0 1-1.59-.63.7.7 0 0 0-.82 0A2.7 2.7 0 0 1 4 12v0a2 2 0 0 1-2-2V7" />
    </svg>
);
