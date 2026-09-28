import React, { useMemo, useState } from 'react';
import { X, MapPin, Star, Search, ArrowRight, Waves, TreePine, Store, Hotel, Droplets, Activity, Users, Settings, ChevronDown, RotateCcw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useNavigate } from 'react-router-dom';
import { SubscriptionPlan, BusinessCategory } from '../types';
import { LOCALITIES } from '../constants';
import { PageLoader } from '../components/common/PageLoader';
import { ECUADOR_GEO_DATA, LocationStructure } from '../utils/ecuadorGeoData';

const ECUADOR_LOCATIONS: LocationStructure = ECUADOR_GEO_DATA;

const REFERENCE_CATEGORIES = [
    BusinessCategory.REFERENCIA,
    BusinessCategory.PARQUE,
    BusinessCategory.CANCHA,
    BusinessCategory.MALECON,
    BusinessCategory.MERCADO,
    BusinessCategory.PARADA_TAXI,
    BusinessCategory.PLAYA,
    BusinessCategory.OTRO,
    BusinessCategory.HOTEL,
    BusinessCategory.HOSTAL,
    BusinessCategory.HIDRATACION,
    BusinessCategory.HOSPITAL
];

export const InfoPage: React.FC = () => {
    const navigate = useNavigate();
    const {
        businesses,
        currentLocality,
        setCurrentLocality,
        customLocalities,
        setShowPublicProfile,
        setPublicProfileId,
        setPublicProfileType,
        loading
    } = useData();

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedProvince, setSelectedProvince] = useState<string>('Santa Elena');
    const [selectedCanton, setSelectedCanton] = useState<string>('Santa Elena');
    const [selectedParroquia, setSelectedParroquia] = useState<string>('Manglaralto');
    const [selectedComuna, setSelectedComuna] = useState<string>('Montañita');

    // Lista dinámica de provincias
    const provincesList = useMemo(() => {
        return Object.keys(ECUADOR_LOCATIONS);
    }, []);

    // Lista dinámica de cantones
    const cantonsList = useMemo(() => {
        if (selectedProvince !== 'Todas') {
            return Object.keys(ECUADOR_LOCATIONS[selectedProvince] || {});
        }
        const set = new Set<string>();
        Object.values(ECUADOR_LOCATIONS).forEach(provObj => {
            Object.keys(provObj).forEach(c => set.add(c));
        });
        return Array.from(set);
    }, [selectedProvince]);

    // Lista dinámica de parroquias
    const parroquiasList = useMemo(() => {
        if (selectedProvince !== 'Todas' && selectedCanton !== 'Todos') {
            return Object.keys(ECUADOR_LOCATIONS[selectedProvince]?.[selectedCanton] || {});
        }
        if (selectedProvince !== 'Todas') {
            const set = new Set<string>();
            const provObj = ECUADOR_LOCATIONS[selectedProvince] || {};
            Object.values(provObj).forEach(cantonObj => {
                Object.keys(cantonObj).forEach(p => set.add(p));
            });
            return Array.from(set);
        }
        const set = new Set<string>();
        Object.values(ECUADOR_LOCATIONS).forEach(provObj => {
            Object.values(provObj).forEach(cantonObj => {
                Object.keys(cantonObj).forEach(p => set.add(p));
            });
        });
        return Array.from(set);
    }, [selectedProvince, selectedCanton]);

    // Lista dinámica de comunas o localidades
    const comunasList = useMemo(() => {
        if (selectedProvince !== 'Todas' && selectedCanton !== 'Todos' && selectedParroquia !== 'Todas') {
            const list = ECUADOR_LOCATIONS[selectedProvince]?.[selectedCanton]?.[selectedParroquia];
            return list ? list.filter(c => c !== 'Todas') : [];
        }
        
        const set = new Set<string>();
        if (selectedProvince !== 'Todas' && selectedCanton !== 'Todos') {
            const cantonObj = ECUADOR_LOCATIONS[selectedProvince]?.[selectedCanton] || {};
            Object.values(cantonObj).forEach(arr => {
                arr.forEach(c => { if (c !== 'Todas') set.add(c); });
            });
        } else if (selectedProvince !== 'Todas') {
            const provObj = ECUADOR_LOCATIONS[selectedProvince] || {};
            Object.values(provObj).forEach(cantonObj => {
                Object.values(cantonObj).forEach(arr => {
                    arr.forEach(c => { if (c !== 'Todas') set.add(c); });
                });
            });
        } else {
            Object.values(ECUADOR_LOCATIONS).forEach(provObj => {
                Object.values(provObj).forEach(cantonObj => {
                    Object.values(cantonObj).forEach(arr => {
                        arr.forEach(c => { if (c !== 'Todas') set.add(c); });
                    });
                });
            });
            // Agregar localidades custom
            (customLocalities || []).forEach(cl => {
                if (cl.name) set.add(cl.name);
            });
        }
        return Array.from(set);
    }, [selectedProvince, selectedCanton, selectedParroquia, customLocalities]);

    const handleResetFilters = () => {
        setSelectedProvince('Santa Elena');
        setSelectedCanton('Santa Elena');
        setSelectedParroquia('Manglaralto');
        setSelectedComuna('Montañita');
        setSearchQuery('');
        if (LOCALITIES && LOCALITIES.length > 0) {
            setCurrentLocality(LOCALITIES[0]);
        }
    };

    const localityName = selectedComuna !== 'Todas'
        ? selectedComuna
        : (selectedParroquia !== 'Todas' 
            ? selectedParroquia 
            : (currentLocality?.name || 'Montañita'));

    const allBusinesses = useMemo(() => {
        let all = businesses || [];

        // 1. Filtro por Comuna / Localidad
        if (selectedComuna !== 'Todas') {
            const comLow = selectedComuna.toLowerCase();
            const isMontanita = comLow.includes('montañ') || comLow.includes('montan');
            all = all.filter((b: any) => 
                (b.locality && b.locality.toLowerCase().includes(comLow)) ||
                (isMontanita && (!b.locality || b.locality.toLowerCase().includes('montan') || b.locality.toLowerCase().includes('montañ'))) ||
                (b.sector && b.sector.toLowerCase().includes(comLow)) ||
                (b.neighborhood && b.neighborhood.toLowerCase().includes(comLow)) ||
                (b.address && b.address.toLowerCase().includes(comLow)) ||
                (b.name && b.name.toLowerCase().includes(comLow)) ||
                (b.description && b.description.toLowerCase().includes(comLow)) ||
                b.name?.toLowerCase().includes('ubicame.info')
            );
        } else if (selectedParroquia !== 'Todas') {
            const parLow = selectedParroquia.toLowerCase();
            // Obtener todas las comunas de esta parroquia
            const parroquiaComunas = (selectedProvince !== 'Todas' && selectedCanton !== 'Todos' && ECUADOR_LOCATIONS[selectedProvince]?.[selectedCanton]?.[selectedParroquia])
                ? ECUADOR_LOCATIONS[selectedProvince][selectedCanton][selectedParroquia].map(c => c.toLowerCase())
                : [];

            all = all.filter((b: any) => 
                (b.parish && b.parish.toLowerCase() === parLow) ||
                (b.locality && b.locality.toLowerCase() === parLow) ||
                (b.locality && parroquiaComunas.includes(b.locality.toLowerCase())) ||
                b.name?.toLowerCase().includes('ubicame.info')
            );
        } else if (selectedCanton !== 'Todos') {
            const cantonParroquias = (selectedProvince !== 'Todas' && ECUADOR_LOCATIONS[selectedProvince]?.[selectedCanton])
                ? Object.keys(ECUADOR_LOCATIONS[selectedProvince][selectedCanton]).map(p => p.toLowerCase())
                : [];
            all = all.filter((b: any) => 
                (b.canton && b.canton.toLowerCase() === selectedCanton.toLowerCase()) || 
                cantonParroquias.includes((b.locality || 'montañita').toLowerCase()) ||
                cantonParroquias.includes((b.parish || '').toLowerCase()) ||
                b.name?.toLowerCase().includes('ubicame.info')
            );
        } else if (selectedProvince !== 'Todas') {
            const provCantons = ECUADOR_LOCATIONS[selectedProvince] || {};
            const provParroquias = Object.values(provCantons).flatMap(c => Object.keys(c)).map(p => p.toLowerCase());
            all = all.filter((b: any) => 
                (b.province && b.province.toLowerCase() === selectedProvince.toLowerCase()) || 
                provParroquias.includes((b.locality || 'montañita').toLowerCase()) ||
                b.name?.toLowerCase().includes('ubicame.info')
            );
        }

        // 2. Filtro por Búsqueda de Texto
        const sq = searchQuery || '';
        if (sq.trim()) {
            const q = sq.toLowerCase();
            all = all.filter((b: any) => {
                try {
                    const nameMatch = b.name && b.name.toLowerCase().includes(q);
                    const categoryMatch = b.category && b.category.toLowerCase().includes(q);
                    const sectorMatch = b.sector && b.sector.toLowerCase().includes(q);
                    const localityMatch = b.locality && b.locality.toLowerCase().includes(q);
                    const descMatch = b.description && b.description.toLowerCase().includes(q);
                    const addressMatch = b.address && b.address.toLowerCase().includes(q);
                    return nameMatch || categoryMatch || sectorMatch || localityMatch || descMatch || addressMatch;
                } catch (e) {
                    return false;
                }
            });
        }
        return all;
    }, [businesses, searchQuery, selectedProvince, selectedCanton, selectedParroquia, selectedComuna]);

    const referencePoints = useMemo(() => {
        return allBusinesses.filter((b: any) => REFERENCE_CATEGORIES.includes(b.category) && !b.name?.toLowerCase().includes('ubicame.info'));
    }, [allBusinesses]);

    const premiumBusinesses = useMemo(() => {
        const filtered = allBusinesses.filter((b: any) => 
            b.plan === SubscriptionPlan.EXPERT ||
            b.plan === SubscriptionPlan.ELITE ||
            b.plan === SubscriptionPlan.PRO ||
            b.name?.toLowerCase().includes('ubicame.info')
        );
        return [...filtered].sort((a: any, b: any) => {
            const aIsUbicame = a.name?.toLowerCase().includes('ubicame.info');
            const bIsUbicame = b.name?.toLowerCase().includes('ubicame.info');
            if (aIsUbicame && !bIsUbicame) return -1;
            if (!aIsUbicame && bIsUbicame) return 1;
            return 0;
        });
    }, [allBusinesses]);

    const otherBusinesses = useMemo(() => {
        return allBusinesses.filter((b: any) =>
            !REFERENCE_CATEGORIES.includes(b.category) &&
            b.plan !== SubscriptionPlan.PRO &&
            b.plan !== SubscriptionPlan.ELITE &&
            b.plan !== SubscriptionPlan.EXPERT &&
            !b.name?.toLowerCase().includes('ubicame.info')
        );
    }, [allBusinesses]);

    const hydrationPoints = useMemo(() => {
        return allBusinesses.filter((b: any) => b.category === BusinessCategory.HIDRATACION);
    }, [allBusinesses]);

    const healthPoints = useMemo(() => {
        return allBusinesses.filter((b: any) => b.category === BusinessCategory.HOSPITAL);
    }, [allBusinesses]);

    const handleBusinessClick = React.useCallback((id: string) => {
        setPublicProfileId(id);
        setPublicProfileType('business');
        setShowPublicProfile(true);
    }, [setShowPublicProfile]);

    if (loading) {
        return <PageLoader message="Cargando información local..." />;
    }

    const getCategoryIcon = (category: string) => {
        if (category === BusinessCategory.PLAYA || category === 'Playa') return <Waves className="w-5 h-5 text-sky-400" />;
        if (category === BusinessCategory.HOTEL || category === BusinessCategory.HOSTAL || category === 'Hotel' || category === 'Hostal') return <Hotel className="w-5 h-5 text-amber-400" />;
        if (category === BusinessCategory.PARQUE || category === 'Parque') return <TreePine className="w-5 h-5 text-emerald-400" />;
        if (category === BusinessCategory.HIDRATACION) return <Droplets className="w-5 h-5 text-cyan-400" />;
        if (category === BusinessCategory.HOSPITAL) return <Activity className="w-5 h-5 text-red-500" />;
        return <MapPin className="w-5 h-5 text-slate-400" />;
    };

    const hasActiveFilters = selectedProvince !== 'Santa Elena' || selectedCanton !== 'Santa Elena' || selectedParroquia !== 'Manglaralto' || selectedComuna !== 'Montañita' || searchQuery !== '';

    return (
        <div className="h-full min-h-screen flex flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 overflow-y-auto overscroll-y-contain touch-pan-y">
            <div className="p-4 sm:p-6 border-b border-white/5 shrink-0 touch-pan-y">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-black text-amber-400 uppercase tracking-tight">📱 INFO {localityName}</h1>
                            <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Puntos de Referencia y Negocios Premium</p>
                        </div>
                        {/* Botón cerrar en móvil */}
                        <button
                            onClick={() => navigate('/explore')}
                            className="sm:hidden p-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-colors shrink-0"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                        {/* Botón cerrar en escritorio */}
                        <button
                            onClick={() => navigate('/explore')}
                            className="hidden sm:flex p-2.5 sm:p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors shrink-0 items-center gap-2 text-slate-300 hover:text-white"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                            <span className="text-xs font-bold uppercase tracking-wider">Cerrar</span>
                        </button>
                    </div>
                </div>

                {/* Buscador de Texto Principal */}
                <div className="relative mb-4">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar negocios, servicios, referencias por nombre..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:border-amber-500/30 transition-all shadow-inner"
                    />
                </div>

                {/* FILTRAR POR UBICACIÓN GEOGRÁFICA (ECUADOR) */}
                <div className="p-4 sm:p-5 rounded-[2rem] bg-slate-900/60 backdrop-blur-xl border border-white/10 shadow-2xl space-y-3.5 touch-pan-y">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                                <MapPin className="w-3.5 h-3.5 text-red-500" />
                            </div>
                            <span className="text-[11px] sm:text-xs font-black text-slate-200 uppercase tracking-widest">
                                Filtrar por Ubicación Geográfica (Ecuador)
                            </span>
                        </div>
                        {hasActiveFilters && (
                            <button
                                onClick={handleResetFilters}
                                className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-400 hover:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 px-3 py-1.5 rounded-xl border border-amber-500/20 transition-all self-start sm:self-auto cursor-pointer"
                            >
                                <RotateCcw className="w-3 h-3" />
                                <span>Restablecer</span>
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                        {/* PROVINCIA */}
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">
                                Provincia
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedProvince}
                                    onChange={(e) => {
                                        setSelectedProvince(e.target.value);
                                        setSelectedCanton('Todos');
                                        setSelectedParroquia('Todas');
                                        setSelectedComuna('Todas');
                                    }}
                                    className="w-full bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-amber-500/40 focus:border-amber-500 text-slate-200 text-xs font-bold rounded-2xl px-3.5 py-3 outline-none transition-all cursor-pointer appearance-none pr-8 shadow-inner"
                                >
                                    <option value="Todas" className="bg-slate-900">Provincia: Todas</option>
                                    {provincesList.map(prov => (
                                        <option key={prov} value={prov} className="bg-slate-900">
                                            {prov}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* CANTÓN */}
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">
                                Cantón
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedCanton}
                                    onChange={(e) => {
                                        setSelectedCanton(e.target.value);
                                        setSelectedParroquia('Todas');
                                        setSelectedComuna('Todas');
                                    }}
                                    className="w-full bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-amber-500/40 focus:border-amber-500 text-slate-200 text-xs font-bold rounded-2xl px-3.5 py-3 outline-none transition-all cursor-pointer appearance-none pr-8 shadow-inner"
                                >
                                    <option value="Todos" className="bg-slate-900">Cantón: Todos</option>
                                    {cantonsList.map(canton => (
                                        <option key={canton} value={canton} className="bg-slate-900">
                                            {canton}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* PARROQUIA */}
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">
                                Parroquia
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedParroquia}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedParroquia(val);
                                        setSelectedComuna('Todas');
                                    }}
                                    className="w-full bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-amber-500/40 focus:border-amber-500 text-slate-200 text-xs font-bold rounded-2xl px-3.5 py-3 outline-none transition-all cursor-pointer appearance-none pr-8 shadow-inner"
                                >
                                    <option value="Todas" className="bg-slate-900">Parroquia: Todas</option>
                                    {parroquiasList.map(parr => (
                                        <option key={parr} value={parr} className="bg-slate-900">
                                            {parr}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>

                        {/* COMUNA / LOCALIDAD */}
                        <div>
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1.5 pl-1">
                                Comuna / Localidad
                            </label>
                            <div className="relative">
                                <select
                                    value={selectedComuna}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSelectedComuna(val);
                                        if (val !== 'Todas') {
                                            const allLocs = [...LOCALITIES, ...(customLocalities || [])];
                                            const foundLoc = allLocs.find(l => l.name.toLowerCase() === val.toLowerCase());
                                            if (foundLoc) {
                                                setCurrentLocality(foundLoc);
                                            } else {
                                                setCurrentLocality({
                                                    id: val.toLowerCase().replace(/\s+/g, '-'),
                                                    name: val,
                                                    coords: [-1.825, -80.753],
                                                    center: [-80.753, -1.825],
                                                    zoom: 15
                                                });
                                            }
                                        }
                                    }}
                                    className="w-full bg-slate-950/80 hover:bg-slate-900 border border-white/10 hover:border-amber-500/40 focus:border-amber-500 text-slate-200 text-xs font-bold rounded-2xl px-3.5 py-3 outline-none transition-all cursor-pointer appearance-none pr-8 shadow-inner"
                                >
                                    <option value="Todas" className="bg-slate-900">Comuna/Localidad: Todas</option>
                                    {comunasList.map(com => (
                                        <option key={com} value={com} className="bg-slate-900">
                                            {com}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-4 sm:p-6 space-y-8 pb-36 touch-pan-y">
                {/* SALUD / HOSPITAL */}
                {healthPoints.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                            <span className="text-[10px] font-black text-red-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Activity className="w-3 h-3" /> HOSPITALES Y SALUD
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />
                        </div>
                        <div className="space-y-3">
                            {healthPoints.map((biz: any) => (
                                <div
                                    key={biz.id}
                                    onClick={() => handleBusinessClick(biz.id)}
                                    className="p-4 rounded-[2rem] bg-red-500/5 border border-red-500/20 hover:border-red-500/40 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-red-500/20 border border-red-500/30 flex items-center justify-center shrink-0">
                                            <Activity className="w-6 h-6 text-red-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-white truncate">{biz.name}</h4>
                                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{biz.description || 'Centro de atención médica 24h'}</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-red-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* HIDRATACIÓN */}
                {hydrationPoints.length > 0 && (
                    <div className="animate-in fade-in slide-in-from-top-4 duration-700">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                            <span className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.3em] flex items-center gap-2">
                                <Droplets className="w-3 h-3" /> PUNTOS DE HIDRATACIÓN
                            </span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
                        </div>
                        <div className="space-y-3">
                            {hydrationPoints.map((biz: any) => (
                                <div
                                    key={biz.id}
                                    onClick={() => handleBusinessClick(biz.id)}
                                    className="p-4 rounded-[2rem] bg-cyan-500/5 border border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-14 h-14 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center shrink-0">
                                            <Droplets className="w-6 h-6 text-cyan-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="text-sm font-black text-white truncate">{biz.name}</h4>
                                            <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{biz.description || 'Agua potable gratuita / Venta de agua'}</p>
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                {premiumBusinesses.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                            <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.3em]">★ DESTACADOS</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
                        </div>
                        <div className="space-y-3">
                            {premiumBusinesses.map((biz: any) => (
                                <div
                                    key={biz.id}
                                    onClick={() => handleBusinessClick(biz.id)}
                                    className="p-4 rounded-[2rem] bg-black/40 border border-amber-500/20 hover:border-amber-500/50 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                                            {biz.imageUrl ? (
                                                <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Star className="w-6 h-6 text-amber-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-sm font-black text-white truncate">{biz.name}</h4>
                                                <Star className="w-4 h-4 text-amber-500 fill-amber-500 shrink-0" />
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-medium text-amber-400 uppercase bg-amber-500/20 px-2 py-0.5 rounded-lg">
                                                    {biz.category}
                                                </span>
                                                {biz.sector && (
                                                    <span className="text-[9px] text-slate-500">
                                                        {biz.sector}
                                                    </span>
                                                )}
                                            </div>
                                            {biz.description && (
                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{biz.description}</p>
                                            )}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {referencePoints.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                            <span className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.3em]">📍 PUNTOS DE REFERENCIA</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />
                        </div>
                        <div className="space-y-3">
                            {referencePoints.map((ref: any) => (
                                <div
                                    key={ref.id}
                                    onClick={() => handleBusinessClick(ref.id)}
                                    className="p-4 rounded-[2rem] bg-black/40 border border-white/10 hover:border-emerald-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                                            {ref.imageUrl ? (
                                                <img src={ref.imageUrl} alt={ref.name} className="w-full h-full object-cover" />
                                            ) : (
                                                getCategoryIcon(ref.category)
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-sm font-black text-white truncate">{ref.name}</h4>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-medium text-emerald-400 uppercase bg-emerald-500/20 px-2 py-0.5 rounded-lg">
                                                    {ref.category}
                                                </span>
                                                {ref.sector && (
                                                    <span className="text-[9px] text-slate-500">
                                                        {ref.sector}
                                                    </span>
                                                )}
                                            </div>
                                            {ref.description && (
                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{ref.description}</p>
                                            )}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {otherBusinesses.length > 0 && (
                    <div>
                        <div className="flex items-center gap-3 mb-4">
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                            <span className="text-[10px] font-black text-orange-400 uppercase tracking-[0.3em]">🏪 NEGOCIOS</span>
                            <div className="flex-1 h-px bg-gradient-to-r from-transparent via-orange-500/50 to-transparent" />
                        </div>
                        <div className="space-y-3">
                            {otherBusinesses.map((biz: any) => (
                                <div
                                    key={biz.id}
                                    onClick={() => handleBusinessClick(biz.id)}
                                    className="p-4 rounded-[2rem] bg-black/40 border border-white/10 hover:border-orange-500/30 transition-all cursor-pointer group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center shrink-0 overflow-hidden">
                                            {biz.imageUrl ? (
                                                <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                                            ) : (
                                                <Store className="w-6 h-6 text-orange-400" />
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between gap-2">
                                                <h4 className="text-sm font-black text-white truncate">{biz.name}</h4>
                                            </div>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-[9px] font-medium text-orange-400 uppercase bg-orange-500/20 px-2 py-0.5 rounded-lg">
                                                    {biz.category}
                                                </span>
                                                {biz.sector && (
                                                    <span className="text-[9px] text-slate-500">
                                                        {biz.sector}
                                                    </span>
                                                )}
                                                {biz.locality && (
                                                    <span className="text-[9px] text-cyan-400">
                                                        📍 {biz.locality}
                                                    </span>
                                                )}
                                            </div>
                                            {biz.description && (
                                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{biz.description}</p>
                                            )}
                                        </div>
                                        <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* DOCUMENTACIÓN */}
                <div className="pt-8 border-t border-white/5">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent" />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">📚 DOCUMENTACIÓN</span>
                        <div className="flex-1 h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <a 
                            href="/docs/Manual_Usuario.md" 
                            download="Guia_Usuario_MontaPulse.md"
                            className="p-5 rounded-[2rem] bg-white/5 border border-white/10 hover:border-amber-500/30 hover:bg-white/10 transition-all group flex items-center gap-4"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 flex items-center justify-center shrink-0">
                                <Users className="w-6 h-6 text-amber-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">Guía del Usuario</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Manual de uso básico</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
                        </a>

                        <a 
                            href="/docs/Manual_Funciones.md" 
                            download="Manual_Tecnico_MontaPulse.md"
                            className="p-5 rounded-[2rem] bg-white/5 border border-white/10 hover:border-cyan-500/30 hover:bg-white/10 transition-all group flex items-center gap-4"
                        >
                            <div className="w-12 h-12 rounded-2xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                                <Settings className="w-6 h-6 text-cyan-400" />
                            </div>
                            <div className="flex-1">
                                <h4 className="text-sm font-black text-white uppercase tracking-tight">Manual Técnico</h4>
                                <p className="text-[10px] text-slate-500 font-bold uppercase mt-1">Arquitectura y Funciones</p>
                            </div>
                            <ArrowRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                        </a>
                    </div>
                </div>

                {referencePoints.length === 0 && premiumBusinesses.length === 0 && otherBusinesses.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center gap-4">
                        <div className="w-20 h-20 bg-slate-800/50 rounded-[2.5rem] flex items-center justify-center border border-white/5 shadow-inner">
                            <MapPin className="w-10 h-10 text-slate-600" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-black text-white uppercase tracking-widest italic">SIN INFORMACIÓN</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">No hay datos disponibles</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};


