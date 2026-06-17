import React, { useState } from 'react';
import { Search, ShieldCheck, Trash2, CheckCircle, Edit3, MapPin, Compass, Store, Filter, RotateCcw, Eye } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { updateBusiness, deleteBusiness } from '../../../services/firestoreService';
import { Sector, MapEntryType } from '../../../types';
import { LOCALITIES } from '../../../constants';

export const BusinessesPanel: React.FC = () => {
    const { 
        businesses, deletedBusinesses, handleRestoreBusiness,
        setEditingBusinessId, setShowBusinessEdit, customLocalities,
        isSuperUser, handleRegisterNewBusiness
    } = useData();
    const { showToast, showConfirm } = useToast();
    
    // Filter States
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLocality, setSelectedLocality] = useState('');
    const [selectedType, setSelectedType] = useState('');
    const [selectedSector, setSelectedSector] = useState('');
    const [viewMode, setViewMode] = useState<'active' | 'deleted'>('active');

    // Helper to determine accurate granular point classification (business, landmark, sector)
    const getPointType = (b: any): 'business' | 'landmark' | 'sector' => {
        if (b.mapType === MapEntryType.SECTOR) return 'sector';
        if (b.mapType === MapEntryType.LANDMARK || b.isReference) return 'landmark';
        return 'business';
    };

    // Robust combination of default, custom, and existing localities
    const allLocalities = [
        'Todas las localidades',
        ...Array.from(new Set([
            ...LOCALITIES.map(l => l.name),
            ...(customLocalities || []).map((l: any) => l.name),
            ...businesses.map(b => b.locality),
            ...deletedBusinesses.map(b => b.locality)
        ])).filter(Boolean) as string[]
    ];

    // Robust combination of physical sectors
    const allSectors = [
        'Todos los sectores',
        ...Array.from(new Set([
            ...Object.values(Sector),
            ...businesses.map(b => b.sector),
            ...deletedBusinesses.map(b => b.sector)
        ])).filter(Boolean) as string[]
    ];

    // Filtering execution
    const applyFilters = (list: any[]) => {
        return list.filter(b => {
            // Search filter
            const q = searchQuery.toLowerCase().trim();
            const name = String(b.name || '').toLowerCase();
            const cat = String(b.category || '').toLowerCase();
            const matchesSearch = !q || name.includes(q) || cat.includes(q);

            // Locality filter
            const matchesLocality = !selectedLocality || b.locality === selectedLocality;

            // Type filter
            const matchesType = !selectedType || getPointType(b) === selectedType;

            // Sector filter
            const matchesSector = !selectedSector || b.sector === selectedSector;

            return matchesSearch && matchesLocality && matchesType && matchesSector;
        });
    };

    const filteredBusinesses = applyFilters(businesses);
    const filteredDeleted = applyFilters(deletedBusinesses);

    const hasActiveFilters = !!(selectedLocality || selectedType || selectedSector || searchQuery);
    
    const resetFilters = () => {
        setSelectedLocality('');
        setSelectedType('');
        setSelectedSector('');
        setSearchQuery('');
    };

    return (
        <div className="space-y-4 sm:space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
            <div className="flex flex-col gap-3 sm:gap-4 px-1">
                
                {/* View Mode Tabs (Active vs Trash) */}
                <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <button
                        onClick={() => setViewMode('active')}
                        className={`flex-1 py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${
                            viewMode === 'active' 
                                ? 'bg-orange-500 text-black border-orange-500' 
                                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                        }`}
                    >
                        Puntos Activos ({businesses.length})
                    </button>
                    <button
                        onClick={() => setViewMode('deleted')}
                        className={`flex-1 py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border transition-all ${
                            viewMode === 'deleted' 
                                ? 'bg-rose-500 text-black border-rose-500' 
                                : 'bg-white/5 text-white/40 border-white/5 hover:bg-white/10'
                        }`}
                    >
                        Papelera ({deletedBusinesses.length})
                    </button>
                    {isSuperUser && (
                        <button
                            onClick={handleRegisterNewBusiness}
                            className="flex-1 py-2.5 sm:py-3.5 px-4 sm:px-6 rounded-xl sm:rounded-2xl text-[9px] sm:text-[10px] font-black uppercase tracking-widest border border-orange-500/30 bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-black hover:border-orange-500 transition-all flex items-center justify-center gap-2"
                        >
                            <Store className="w-3.5 h-3.5" />
                            Añadir Negocio
                        </button>
                    )}
                </div>

                {/* Filter and Search Panel */}
                <div className="bg-neutral-900/50 p-4 sm:p-5 rounded-2xl sm:rounded-[2rem] border border-white/5 shadow-xl space-y-3.5">
                    {/* Search & Reset Row */}
                    <div className="flex gap-2 sm:gap-3 items-center">
                        <div className="flex-1 flex items-center gap-3 bg-black/40 px-4 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/5 focus-within:border-orange-500/50 transition-all">
                            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-500 shrink-0" />
                            <input 
                                type="text" 
                                placeholder="Buscar por nombre, categoría o tipo..." 
                                className="bg-transparent border-none text-white text-xs sm:text-sm w-full focus:outline-none placeholder-slate-500 font-medium"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                            />
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={resetFilters}
                                className="p-2.5 sm:p-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 rounded-xl sm:rounded-2xl border border-orange-500/20 transition-all flex items-center gap-2 text-xs font-black uppercase tracking-wider shrink-0"
                                title="Limpiar filtros"
                            >
                                <RotateCcw className="w-4 h-4 shrink-0" />
                                <span className="hidden md:inline">Limpiar</span>
                            </button>
                        )}
                    </div>

                    {/* Filter Dropdowns Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                        {/* Locality Selector */}
                        <div className="relative flex items-center bg-black/40 rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                            <select
                                value={selectedLocality}
                                onChange={e => setSelectedLocality(e.target.value)}
                                className="w-full bg-transparent text-white font-medium text-xs py-2.5 px-4 pr-12 focus:outline-none cursor-pointer appearance-none"
                            >
                                {allLocalities.map(loc => (
                                    <option key={loc} value={loc === 'Todas las localidades' ? '' : loc} className="bg-neutral-900 text-white">
                                        {loc}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 pointer-events-none text-slate-500 text-[8px] sm:text-[9px] uppercase font-black tracking-widest shrink-0">
                                LOCALIDAD
                            </div>
                        </div>

                        {/* Type Selector */}
                        <div className="relative flex items-center bg-black/40 rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                            <select
                                value={selectedType}
                                onChange={e => setSelectedType(e.target.value)}
                                className="w-full bg-transparent text-white font-medium text-xs py-2.5 px-4 pr-12 focus:outline-none cursor-pointer appearance-none"
                            >
                                <option value="" className="bg-neutral-900 text-white">Todos los tipos</option>
                                <option value="business" className="bg-neutral-900 text-white">Negocios</option>
                                <option value="landmark" className="bg-neutral-900 text-white">Referencias</option>
                                <option value="sector" className="bg-neutral-900 text-white">Sectores</option>
                            </select>
                            <div className="absolute right-4 pointer-events-none text-slate-500 text-[8px] sm:text-[9px] uppercase font-black tracking-widest shrink-0">
                                TIPO
                            </div>
                        </div>

                        {/* Physical Sector Selector */}
                        <div className="relative flex items-center bg-black/40 rounded-xl sm:rounded-2xl border border-white/5 hover:border-white/10 transition-all">
                            <select
                                value={selectedSector}
                                onChange={e => setSelectedSector(e.target.value)}
                                className="w-full bg-transparent text-white font-medium text-xs py-2.5 px-4 pr-12 focus:outline-none cursor-pointer appearance-none"
                            >
                                {allSectors.map(sec => (
                                    <option key={sec} value={sec === 'Todos los sectores' ? '' : sec} className="bg-neutral-900 text-white">
                                        {sec}
                                    </option>
                                ))}
                            </select>
                            <div className="absolute right-4 pointer-events-none text-slate-500 text-[8px] sm:text-[9px] uppercase font-black tracking-widest shrink-0">
                                SECTOR
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* List Grid */}
            <div className="grid grid-cols-1 gap-3 sm:gap-4">
                {(viewMode === 'deleted' ? filteredDeleted : filteredBusinesses).map(biz => (
                    <div key={biz.id} className="bg-neutral-900/50 border border-white/5 rounded-2xl sm:rounded-[2rem] p-3.5 sm:p-6 hover:bg-neutral-900/80 transition-all group shadow-lg">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3.5 sm:gap-4 overflow-hidden">
                                
                                {/* Image or fallbacks */}
                                <div className={`w-10 h-10 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-black overflow-hidden border border-white/10 relative shrink-0 ${viewMode === 'deleted' ? 'grayscale opacity-50' : ''}`}>
                                    {biz.imageUrl ? (
                                        <img src={biz.imageUrl} className="w-full h-full object-cover" alt={biz.name} />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-neutral-800 text-slate-500">
                                            {getPointType(biz) === 'sector' ? (
                                                <Compass className="w-5 h-5 text-emerald-500" />
                                            ) : getPointType(biz) === 'landmark' ? (
                                                <MapPin className="w-5 h-5 text-sky-500" />
                                            ) : (
                                                <Store className="w-5 h-5 text-orange-500" />
                                            )}
                                        </div>
                                    )}
                                    {biz.isVerified && viewMode !== 'deleted' && (
                                        <div className="absolute -top-1 -right-1 bg-sky-500 p-0.5 sm:p-1 rounded-md sm:rounded-lg border border-black">
                                            <CheckCircle className="w-1.5 h-1.5 sm:w-2 sm:h-2 text-white" />
                                        </div>
                                    )}
                                </div>

                                <div className="min-w-0">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <h5 className="text-xs sm:text-sm font-black text-white truncate">{biz.name}</h5>
                                        {viewMode !== 'deleted' && biz.category && (
                                            <span className="text-[7px] sm:text-[9px] px-1.5 py-0.5 bg-white/5 rounded-md text-slate-500 uppercase font-black">{biz.category}</span>
                                        )}
                                    </div>

                                    {/* Location details (Locality & Physical Sector) */}
                                    <div className="flex items-center gap-1.5 text-[8px] sm:text-[10px] text-slate-400 mt-1 font-medium flex-wrap">
                                        <MapPin className="w-2.5 h-2.5 text-orange-500 shrink-0" />
                                        <span>{biz.locality || 'Sin Localidad'}</span>
                                        <span className="text-slate-700 font-bold">•</span>
                                        <span>{biz.sector || 'Sin Sector'}</span>
                                        <span className="text-slate-700 font-bold">•</span>
                                        <Eye className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                        <span>{biz.viewCount || 0} visitas</span>
                                    </div>

                                    <p className="text-[8px] sm:text-[9px] text-slate-500 mt-1 truncate">Dueño ID: {biz.ownerId?.slice(0, 8)}...</p>

                                    {/* Point Type Badges */}
                                    {viewMode !== 'deleted' && (
                                        <div className="mt-1.5">
                                            {getPointType(biz) === 'sector' ? (
                                                <span className="inline-flex items-center gap-1 text-[7px] sm:text-[8px] px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-full font-black uppercase tracking-wider">
                                                    <Compass className="w-2 h-2 shrink-0" />
                                                    Sector / Barrio
                                                </span>
                                            ) : getPointType(biz) === 'landmark' ? (
                                                <span className="inline-flex items-center gap-1 text-[7px] sm:text-[8px] px-2 py-0.5 bg-sky-500/10 border border-sky-500/20 text-sky-400 rounded-full font-black uppercase tracking-wider">
                                                    <MapPin className="w-2 h-2 shrink-0" />
                                                    Referencia
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 text-[7px] sm:text-[8px] px-2 py-0.5 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full font-black uppercase tracking-wider">
                                                    <Store className="w-2 h-2 shrink-0" />
                                                    Negocio ({biz.plan || 'Free'})
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Administrative Operations (Edit, Verify, Delete, Restore) */}
                            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                {viewMode !== 'deleted' ? (
                                    <>
                                        {/* Verify Toggle Button (only applicable/shown for businesses) */}
                                        {getPointType(biz) === 'business' && (
                                            <button 
                                                onClick={async () => {
                                                    if (!isSuperUser) {
                                                        showToast("Activa el Modo Super User en el Panel de Administración para realizar cambios.", "error");
                                                        return;
                                                    }
                                                    const v = !biz.isVerified;
                                                    await updateBusiness(biz.id, { isVerified: v });
                                                    showToast(v ? "Negocio verificado" : "Verificación removida", "success");
                                                }}
                                                className={`p-2.5 sm:p-3 rounded-xl border transition-all ${biz.isVerified ? 'bg-sky-500/10 text-sky-400 border-sky-500/20' : 'bg-black/40 text-slate-500 border-white/5 hover:bg-black/60'}`}
                                                title={biz.isVerified ? "Desverificar" : "Verificar"}
                                            >
                                                <ShieldCheck className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>
                                        )}
                                        
                                        {/* Edit Button */}
                                        <button 
                                            onClick={() => {
                                                if (!isSuperUser) {
                                                    showToast("Activa el Modo Super User en el Panel de Administración para realizar cambios.", "error");
                                                    return;
                                                }
                                                setEditingBusinessId(biz.id);
                                                setShowBusinessEdit(true);
                                            }}
                                            className="p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl border border-white/10 transition-all"
                                            title="Editar"
                                        >
                                            <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                        </button>
 
                                        {/* Delete Button (Soft Delete) */}
                                        <button 
                                            onClick={async () => {
                                                if (!isSuperUser) {
                                                    showToast("Activa el Modo Super User en el Panel de Administración para realizar cambios.", "error");
                                                    return;
                                                }
                                                const pointTypeLabel = getPointType(biz) === 'sector' ? 'sector/barrio' : getPointType(biz) === 'landmark' ? 'referencia' : 'negocio';
                                                if (await showConfirm(`¿Mover ${pointTypeLabel} "${biz.name}" a la papelera?`, "Papelera")) {
                                                    await deleteBusiness(biz.id, false);
                                                    showToast("Punto movido a la papelera", "success");
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
                                        {/* Restore Button */}
                                        <button 
                                            onClick={async () => {
                                                if (!isSuperUser) {
                                                    showToast("Activa el Modo Super User en el Panel de Administración para realizar cambios.", "error");
                                                    return;
                                                }
                                                await handleRestoreBusiness(biz.id);
                                                showToast("Punto restaurado con éxito", "success");
                                            }}
                                            className="px-3 sm:px-4 py-1.5 sm:py-2 bg-orange-500 text-black text-[8px] sm:text-[10px] font-black uppercase rounded-lg sm:rounded-xl hover:scale-105 transition-all"
                                        >
                                            Restaurar
                                        </button>
 
                                        {/* Hard Delete Button */}
                                        <button 
                                            onClick={async () => {
                                                if (!isSuperUser) {
                                                    showToast("Activa el Modo Super User en el Panel de Administración para realizar cambios.", "error");
                                                    return;
                                                }
                                                if (await showConfirm(`¿ELIMINAR PERMANENTEMENTE "${biz.name}"? Esta acción es irreversible.`, "¡PELIGRO!")) {
                                                    await deleteBusiness(biz.id, true);
                                                    showToast("Punto eliminado permanentemente", "error");
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
                        <p className="text-xs sm:text-sm font-bold uppercase tracking-[0.2em]">No se encontraron puntos</p>
                    </div>
                )}
            </div>
        </div>
    );
};
