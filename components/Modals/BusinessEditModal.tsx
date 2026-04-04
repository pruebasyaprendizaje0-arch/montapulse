import React, { useRef, useState } from 'react';
import { X, Camera, Upload, Store, MapPin, Search, Loader2, Plus, XCircle, Users, Clock } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { LOCALITIES, LOCALITY_SECTORS, MAP_ICONS } from '../../constants';
import { Sector, BusinessCategory } from '../../types';
import { IconMap } from '../../utils/icons';
import { OptimizedImageUploader } from '../OptimizedImageUploader';

interface BusinessEditModalProps {
    onClose?: () => void;
    isRegistration?: boolean;
}

export const BusinessEditModal: React.FC<BusinessEditModalProps> = ({ onClose, isRegistration = false }) => {
    const { user, isSuperAdmin } = useAuthContext();
    const {
        businesses, setBusinesses, editingBusinessId, setShowBusinessEdit,
        setEditingBusinessId, handleUpdateBusinessProfile,
        bizForm, setBizForm, handleBusinessRegister, setShowBusinessReg,
        handleDeleteBusiness,
        customLocalities, allUsers
    } = useData();

    const bizEditFileInputRef = useRef<HTMLInputElement>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [newService, setNewService] = useState('');

    const targetBusinessId = editingBusinessId || user?.businessId;
    const business = isRegistration ? null : businesses.find(b => b.id === targetBusinessId);

    const userBusiness = businesses.find(b => b.ownerId === user?.id && !b.isReference);
    const userReference = businesses.find(b => b.ownerId === user?.id && b.isReference);
    const canAddBusiness = isSuperAdmin || !userBusiness;
    const canAddReference = isSuperAdmin || !userReference;

    const handleClose = () => {
        if (onClose) {
            onClose();
        } else {
            setShowBusinessEdit(false);
            setShowBusinessReg(false);
            setEditingBusinessId(null);
        }
    };

    if (!business && !isRegistration) return null;

    // Use bizForm as the canonical state for the modal fields
    const data = bizForm;
    const updateField = (field: string, value: any) => {
        const safeValue = value === undefined ? null : value;
        setBizForm(prev => ({ ...prev, [field]: safeValue }));
    };

    const servicesList = (data as any).services || [];
    const addService = () => {
        if (newService.trim()) {
            updateField('services', [...servicesList, newService.trim()]);
            setNewService('');
        }
    };
    const removeService = (idx: number) => {
        const updated = servicesList.filter((_: string, i: number) => i !== idx);
        updateField('services', updated);
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-slate-900/80 backdrop-blur-md flex items-end justify-center p-4 overflow-y-auto no-scrollbar pt-20">
            <div className="w-full max-w-lg bg-slate-900 rounded-[3.5rem] p-8 pb-12 max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl no-scrollbar animate-in slide-in-from-bottom duration-500">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            {isRegistration 
                                ? (data.isReference ? 'Registrar Referencia' : 'Registrar Negocio') 
                                : (data.isReference ? 'Editar Referencia' : 'Editar Negocio')}
                        </h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {isRegistration 
                                ? (data.isReference ? 'Crea un punto de interés' : 'Crea tu perfil comercial') 
                                : (data.isReference ? 'Configuración del punto de interés' : 'Configuración del perfil comercial')}
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors group">
                        <X className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="space-y-8">
                    {/* Point Type Selector */}
                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-4 block tracking-widest">Tipo de Punto</label>
                        <div className="grid grid-cols-2 gap-3 p-2 bg-slate-800/30 rounded-[2rem] border border-white/5">
                            <button
                                type="button"
                                disabled={!canAddBusiness}
                                onClick={() => {
                                    if (canAddBusiness) updateField('isReference', false);
                                }}
                                className={`flex flex-col items-center justify-center py-4 rounded-[1.5rem] transition-all gap-2 ${!data.isReference ? 'bg-orange-500 text-white shadow-lg' : canAddBusiness ? 'text-slate-500 hover:text-slate-300' : 'text-slate-700 cursor-not-allowed'}`}
                                title={!canAddBusiness ? 'Ya tienes un negocio registrado' : 'Registrar Negocio'}
                            >
                                <Store className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Negocio</span>
                                {!canAddBusiness && <span className="text-[8px] text-slate-600">Ya tienes uno</span>}
                            </button>
                            <button
                                type="button"
                                disabled={!canAddReference}
                                onClick={() => {
                                    if (canAddReference) updateField('isReference', true);
                                }}
                                className={`flex flex-col items-center justify-center py-4 rounded-[1.5rem] transition-all gap-2 ${data.isReference ? 'bg-sky-500 text-white shadow-lg' : canAddReference ? 'text-slate-500 hover:text-slate-300' : 'text-slate-700 cursor-not-allowed'}`}
                                title={!canAddReference ? 'Ya tienes un punto de referencia' : 'Registrar Punto de Referencia'}
                            >
                                <MapPin className="w-6 h-6" />
                                <span className="text-[10px] font-black uppercase tracking-widest">Referencia</span>
                                {!canAddReference && <span className="text-[8px] text-slate-600">Ya tienes uno</span>}
                            </button>
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">
                            {data.isReference ? 'Nombre del Punto' : 'Nombre Comercial'}
                        </label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                            placeholder={data.isReference ? "Ej: Letras de Montañita" : "Nombre de tu negocio"}
                        />
                    </div>

                    {isSuperAdmin && !data.isReference && (
                        <div className="space-y-3">
                             <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest pl-2">Dueño del Negocio</label>
                             <div className="relative">
                                <select
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all appearance-none"
                                    value={data.ownerId || 'admin'}
                                    onChange={(e) => updateField('ownerId', e.target.value)}
                                >
                                    <option value="admin">Administrador Central (Sin dueño)</option>
                                    {[...allUsers].sort((a,b) => (a.name || '').localeCompare(b.name || '')).map((u) => (
                                        <option key={u.id} value={u.id}>
                                            {u.name} {u.surname} ({u.email})
                                        </option>
                                    ))}
                                </select>
                                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500">
                                    <Users className="w-5 h-5" />
                                </div>
                             </div>
                             <p className="text-[10px] text-slate-500 mt-2 px-2 italic">Solo administradores pueden reasignar el dueño de un negocio.</p>
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-3 block">Categoría</label>
                            <select
                                className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none appearance-none transition-all"
                                value={data.category}
                                onChange={(e) => updateField('category', e.target.value as BusinessCategory)}
                            >
                                {Object.values(BusinessCategory)
                                    .filter(cat => data.isReference 
                                        ? [BusinessCategory.PARQUE, BusinessCategory.CANCHA, BusinessCategory.MALECON, BusinessCategory.MERCADO, BusinessCategory.PARADA_TAXI, BusinessCategory.PLAYA, BusinessCategory.OTRO].includes(cat)
                                        : ![BusinessCategory.PARQUE, BusinessCategory.CANCHA, BusinessCategory.MALECON, BusinessCategory.MERCADO, BusinessCategory.PARADA_TAXI, BusinessCategory.PLAYA, BusinessCategory.REFERENCIA].includes(cat)
                                    )
                                    .map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>

                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Icono del Mapa</label>
                            <IconSelector 
                                value={data.icon || 'palmtree'} 
                                onChange={(iconId) => updateField('icon', iconId)} 
                            />
                        </div>
                    </div>

                    {!data.isReference && (
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Categoría del Planner IA</label>
                            <p className="text-[10px] text-slate-600 mb-3">Asigna una sección del AI Planner para que aparezca en recomendaciones.</p>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                                {([
                                    { id: 'hospedaje', emoji: '🏨', label: 'Hosp.' },
                                    { id: 'comida', emoji: '🍽️', label: 'Rest.' },
                                    { id: 'baile', emoji: '🎶', label: 'Bar' },
                                    { id: 'surf', emoji: '🏄', label: 'Surf' },
                                ] as const).map(opt => (
                                    <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => updateField('plannerCategory', (data as any).plannerCategory === opt.id ? null : opt.id)}
                                        className={`flex flex-col items-center justify-center gap-1 p-2 rounded-2xl border transition-all ${(data as any).plannerCategory === opt.id
                                            ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                            : 'bg-slate-800/40 border-white/5 text-slate-400 hover:bg-slate-800'
                                            }`}
                                    >
                                        <span className="text-lg">{opt.emoji}</span>
                                        <span className="text-[9px] font-black uppercase tracking-tighter">{opt.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Descripción</label>
                        <textarea
                            rows={3}
                            value={data.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all resize-none"
                            placeholder="Describe tu negocio..."
                        />
                    </div>

                    {!data.isReference && (
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Servicios y Productos</label>
                            <p className="text-[10px] text-slate-600 mb-3">Agrega los servicios o productos que ofrece tu negocio (ej: "Cerveza artesanal", "Clases de surf", "WiFi gratis")</p>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    value={newService}
                                    onChange={(e) => setNewService(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addService())}
                                    placeholder="Escribe un servicio..."
                                    className="flex-1 bg-slate-800/50 border border-white/5 rounded-2xl px-4 py-3 text-white text-sm font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={addService}
                                    className="px-4 py-2 bg-orange-500/20 border border-orange-500/30 rounded-2xl text-orange-400 hover:bg-orange-500/30 transition-all"
                                >
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                            {(data as any).services && (data as any).services.length > 0 && (
                                <div className="flex flex-wrap gap-2">
                                    {(data as any).services.map((service: string, idx: number) => (
                                        <span key={idx} className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/20 rounded-full text-xs font-bold text-amber-300">
                                            {service}
                                            <button
                                                type="button"
                                                onClick={() => removeService(idx)}
                                                className="hover:text-orange-400 transition-colors"
                                            >
                                                <XCircle className="w-4 h-4" />
                                            </button>
                                        </span>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Pueblo</label>
                            <select
                                value={data.locality || 'Montañita'}
                                onChange={(e) => {
                                    const newLoc = e.target.value;
                                    const allLocalities = [...LOCALITIES, ...(customLocalities || [])];
                                    const locObj = allLocalities.find(l => l.name === newLoc);
                                    if (isRegistration) {
                                        setBizForm({
                                            ...bizForm,
                                            locality: newLoc,
                                            sector: (LOCALITY_SECTORS[newLoc] || [])[0] || Sector.CENTRO
                                        });
                                    } else {
                                        setBusinesses(prev => prev.map(b =>
                                            b.id === targetBusinessId ? {
                                                ...b,
                                                locality: newLoc,
                                                sector: (LOCALITY_SECTORS[newLoc] || [])[0] || Sector.CENTRO,
                                                coordinates: locObj ? locObj.coords : b.coordinates
                                            } : b
                                        ));
                                    }
                                }}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none appearance-none transition-all"
                            >
                                {[...LOCALITIES, ...(customLocalities || [])].map(l => (
                                    <option key={l.name} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Sector</label>
                            <select
                                value={data.sector}
                                onChange={(e) => updateField('sector', e.target.value as Sector)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none appearance-none transition-all"
                            >
                                {(LOCALITY_SECTORS[data.locality || 'Montañita'] || Object.values(Sector)).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {!data.isReference && (
                        <>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">WhatsApp</label>
                                    <input
                                        type="tel"
                                        value={data.whatsapp || ''}
                                        onChange={(e) => updateField('whatsapp', e.target.value)}
                                        placeholder="+593 99..."
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Instagram</label>
                                    <input
                                        type="text"
                                        value={data.instagram || ''}
                                        onChange={(e) => updateField('instagram', e.target.value)}
                                        placeholder="@usuario"
                                        className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Teléfono de contacto</label>
                                <input
                                    type="tel"
                                    value={data.phone || ''}
                                    onChange={(e) => updateField('phone', e.target.value)}
                                    className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    placeholder="Número para llamadas"
                                />
                            </div>
                        </>
                    )}

                    {/* Horario de Atención */}
                    {!data.isReference && (
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-4 block tracking-widest flex items-center gap-2">
                                <Clock className="w-4 h-4" /> Horario de Atención
                            </label>
                            <div className="space-y-3">
                                {['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'].map((day) => {
                                    const dayKey = day.toLowerCase();
                                    const schedule = (data as any).openingHours?.[dayKey] || null;
                                    const isClosed = schedule?.closed;
                                    const openTime = schedule?.open || '08:00';
                                    const closeTime = schedule?.close || '22:00';

                                    return (
                                        <div key={day} className="flex items-center gap-3">
                                            <span className="text-xs font-bold text-slate-400 w-20">{day}</span>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const current = (data as any).openingHours || {};
                                                    const newSchedule = { ...current };
                                                    if (newSchedule[dayKey]?.closed) {
                                                        newSchedule[dayKey] = { open: '08:00', close: '22:00' };
                                                    } else {
                                                        newSchedule[dayKey] = { closed: true, open: '', close: '' };
                                                    }
                                                    updateField('openingHours', newSchedule);
                                                }}
                                                className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all ${isClosed ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-slate-700 text-slate-400'}`}
                                            >
                                                {isClosed ? 'Cerrado' : 'Abierto'}
                                            </button>
                                            {!isClosed && (
                                                <>
                                                    <input
                                                        type="time"
                                                        value={openTime}
                                                        onChange={(e) => {
                                                            const current = (data as any).openingHours || {};
                                                            updateField('openingHours', {
                                                                ...current,
                                                                [dayKey]: { ...current[dayKey], open: e.target.value, close: closeTime }
                                                            });
                                                        }}
                                                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none"
                                                    />
                                                    <span className="text-slate-500 text-xs">-</span>
                                                    <input
                                                        type="time"
                                                        value={closeTime}
                                                        onChange={(e) => {
                                                            const current = (data as any).openingHours || {};
                                                            updateField('openingHours', {
                                                                ...current,
                                                                [dayKey]: { ...current[dayKey], open: openTime, close: e.target.value }
                                                            });
                                                        }}
                                                        className="bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white text-xs font-medium focus:ring-1 focus:ring-orange-500 outline-none"
                                                    />
                                                </>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-4 block tracking-widest">Imagen del Negocio</label>
                        <OptimizedImageUploader
                            currentImageUrl={data.imageUrl || undefined}
                            onImageProcessed={(url) => updateField('imageUrl', url)}
                            path={`uploads/${user?.id || 'admin'}/businesses`}
                            className="bg-slate-800/50"
                        />
                    </div>

                    {/* Admin Only Toggles - Simplified if not referenced above */}
                    <div className="bg-slate-800/50 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h4 className="text-white font-bold text-sm">Visible en el Mapa</h4>
                                <p className="text-[10px] text-slate-500 font-medium tracking-tight">Publicar este punto para todos los usuarios</p>
                            </div>
                            <button
                                type="button"
                                onClick={() => updateField('isPublished', !((data as any).isPublished))}
                                className={`w-12 h-6 rounded-full transition-all relative ${(data as any).isPublished ? 'bg-orange-500' : 'bg-slate-700'}`}
                            >
                                <div className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${(data as any).isPublished ? 'left-[calc(100%-1.35rem)]' : 'left-0.5'}`} />
                            </button>
                        </div>
                        
                    </div>
                    <div className="flex flex-col gap-3 mt-4">
                        <button
                            type="button"
                            disabled={isSaving}
                            onClick={async (e) => {
                                if (isRegistration) {
                                    setIsSaving(true);
                                    try {
                                        const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
                                        await handleBusinessRegister(fakeEvent);
                                    } catch (error) {
                                        console.error('Error registering business:', error);
                                    } finally {
                                        setIsSaving(false);
                                    }
                                } else {
                                    setIsSaving(true);
                                    try {
                                        const success = await handleUpdateBusinessProfile();
                                        if (success) {
                                            handleClose();
                                        }
                                    } catch (error) {
                                        console.error('Error updating business profile:', error);
                                    } finally {
                                        setIsSaving(false);
                                    }
                                }
                            }}
                            className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black py-5 rounded-3xl hover:shadow-[0_0_30px_rgba(249,115,22,0.3)] hover:scale-[1.02] active:scale-95 transition-all tracking-widest uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isSaving ? (
                                <>
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                    Guardando...
                                </>
                            ) : isRegistration ? 'Finalizar Registro' : 'Guardar Cambios'}
                        </button>

                        {!isRegistration && business && (
                            <button
                                type="button"
                                onClick={() => handleDeleteBusiness(business.id)}
                                className="w-full bg-slate-800/50 text-orange-500 font-bold py-4 rounded-3xl border border-orange-500/10 hover:bg-orange-500/10 transition-all text-xs uppercase tracking-widest"
                            >
                                Eliminar Punto permanentemente
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const ICON_CATEGORIES = [
    { name: 'Gastronomía', icons: [
        { id: 'MdRestaurant', lib: 'md' }, { id: 'MdLocalCafe', lib: 'md' }, { id: 'MdLocalBar', lib: 'md' },
        { id: 'GiCocktail', lib: 'gi' }, { id: 'MdBakeryDining', lib: 'md' }, { id: 'MdFastfood', lib: 'md' },
        { id: 'BiFoodMenu', lib: 'bi' }, { id: 'GiPizza', lib: 'gi' }, { id: 'MdBrunchDining', lib: 'md' },
    ]},
    { name: 'Diversión', icons: [
        { id: 'GiPartyPopper', lib: 'gi' }, { id: 'BiSolidMoon', lib: 'bi' }, { id: 'MdNightlife', lib: 'md' },
        { id: 'MdMusicNote', lib: 'md' }, { id: 'GiMicrophone', lib: 'gi' }, { id: 'BsStars', lib: 'bs' },
    ]},
    { name: 'Surf/Playa', icons: [
        { id: 'BiSwim', lib: 'bi' }, { id: 'MdSurfing', lib: 'md' }, { id: 'BiBeach', lib: 'bi' },
        { id: 'BiSolidBeach', lib: 'bi' }, { id: 'GiSailboat', lib: 'gi' }, { id: 'MdKitesurfing', lib: 'md' },
        { id: 'BiSolidWaves', lib: 'bi' }, { id: 'MdBeachAccess', lib: 'md' },
    ]},
    { name: 'Hospedaje', icons: [
        { id: 'MdHotel', lib: 'md' }, { id: 'MdVilla', lib: 'md' }, { id: 'MdCabin', lib: 'md' },
        { id: 'MdHouse', lib: 'md' }, { id: 'MdBeachAccess', lib: 'md' }, { id: 'MdCamping', lib: 'md' },
    ]},
    { name: 'Naturaleza', icons: [
        { id: 'BsTree', lib: 'bs' }, { id: 'PiTree', lib: 'pi' }, { id: 'GiMountaintop', lib: 'gi' },
        { id: 'MdForest', lib: 'md' }, { id: 'GiCampfire', lib: 'gi' }, { id: 'MdPark', lib: 'md' },
    ]},
    { name: 'Servicios', icons: [
        { id: 'MdStore', lib: 'md' }, { id: 'MdShoppingBag', lib: 'md' }, { id: 'MdLocalPharmacy', lib: 'md' },
        { id: 'MdLocalHospital', lib: 'md' }, { id: 'MdAccountBalance', lib: 'md' }, { id: 'MdLocalGasStation', lib: 'md' },
        { id: 'MdLocalParking', lib: 'md' }, { id: 'MdDirectionsBus', lib: 'md' }, { id: 'MdSchool', lib: 'md' },
    ]},
    { name: 'Cultura', icons: [
        { id: 'GiChurch', lib: 'gi' }, { id: 'MdPalette', lib: 'md' }, { id: 'GiGreekTemple', lib: 'gi' },
        { id: 'GiAnchor', lib: 'gi' }, { id: 'MdMuseum', lib: 'md' }, { id: 'GiHeartInside', lib: 'gi' },
    ]},
    { name: 'Deporte', icons: [
        { id: 'MdFitnessCenter', lib: 'md' }, { id: 'MdDirectionsBike', lib: 'md' }, { id: 'GiVolleyballBall', lib: 'gi' },
        { id: 'GiBiceps', lib: 'gi' }, { id: 'MdSportsTennis', lib: 'md' }, { id: 'MdSpa', lib: 'md' },
    ]},
    { name: 'Otros', icons: [
        { id: 'MdLocationOn', lib: 'md' }, { id: 'MdPhotoCamera', lib: 'md' }, { id: 'MdCall', lib: 'md' },
        { id: 'MdInfo', lib: 'md' }, { id: 'MdStar', lib: 'md' }, { id: 'MdDiamond', lib: 'md' },
    ]},
];

const getIcon = (iconId: string) => {
    const IconComp = IconMap[iconId];
    return IconComp ? <IconComp /> : <IconMap.MdLocationOn />;
};

const IconSelector: React.FC<{ value: string; onChange: (id: string) => void }> = ({ value, onChange }) => {
    const [search, setSearch] = useState('');
    const [isOpen, setIsOpen] = useState(false);

    const currentIcon = MAP_ICONS.find(i => i.id === value);
    const iconKey = currentIcon?.icon || 'MdLocationOn';

    const filteredCategories = ICON_CATEGORIES.map(cat => ({
        ...cat,
        icons: cat.icons.filter(icon => 
            icon.id.toLowerCase().includes(search.toLowerCase()) ||
            cat.name.toLowerCase().includes(search.toLowerCase())
        )
    })).filter(cat => cat.icons.length > 0 || search === '');

    return (
        <div className="relative">
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center gap-3 p-3 bg-slate-800/50 border border-white/10 rounded-2xl hover:bg-slate-700/50 transition-all"
            >
                <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center text-white">
                    {getIcon(iconKey)}
                </div>
                <div className="flex-1 text-left">
                    <span className="text-white font-medium text-sm">{currentIcon?.label || 'Seleccionar'}</span>
                </div>
                <span className="text-slate-400 text-xs">{currentIcon?.emoji}</span>
            </button>

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-slate-800 rounded-2xl border border-white/10 shadow-2xl z-50 max-h-80 overflow-hidden flex flex-col">
                    <div className="p-2 border-b border-white/10">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Buscar icono..."
                                className="w-full bg-slate-700/50 border border-white/5 rounded-xl pl-10 pr-4 py-2 text-white text-sm outline-none focus:border-orange-500/50"
                            />
                        </div>
                    </div>
                    <div className="overflow-y-auto flex-1 p-2 space-y-3">
                        {filteredCategories.map(cat => (
                            <div key={cat.name}>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-2 mb-2">{cat.name}</p>
                                <div className="grid grid-cols-6 gap-1">
                                    {cat.icons.map(icon => {
                                        const fullIconKey = icon.id;
                                        const isSelected = `${icon.lib.charAt(0).toUpperCase()}${icon.lib.slice(1)}${icon.id}` === iconKey && value.includes(icon.id.toLowerCase());
                                        return (
                                            <button
                                                key={icon.id}
                                                type="button"
                                                onClick={() => {
                                                    const mapIcon = MAP_ICONS.find(i => i.icon === fullIconKey);
                                                    onChange(mapIcon?.id || icon.id.toLowerCase());
                                                    setIsOpen(false);
                                                    setSearch('');
                                                }}
                                                className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                                                    isSelected 
                                                        ? 'bg-orange-500 text-white scale-110' 
                                                        : 'bg-slate-700/50 text-slate-300 hover:bg-slate-600 hover:text-white'
                                                }`}
                                            >
                                                {getIcon(fullIconKey)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                        {filteredCategories.length === 0 && (
                            <p className="text-center text-slate-500 text-sm py-4">No hay iconos que coincidan</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

