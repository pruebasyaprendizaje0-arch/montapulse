import React, { useRef } from 'react';
import { X, Camera, Upload } from 'lucide-react';
import { useAuthContext } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { LOCALITIES, LOCALITY_SECTORS, MAP_ICONS } from '../../constants';
import { Sector, BusinessCategory } from '../../types';

interface BusinessEditModalProps {
    onClose?: () => void;
    isRegistration?: boolean;
}

export const BusinessEditModal: React.FC<BusinessEditModalProps> = ({ onClose, isRegistration = false }) => {
    const { user } = useAuthContext();
    const {
        businesses, setBusinesses, editingBusinessId, setShowBusinessEdit,
        setEditingBusinessId, handleUpdateBusinessProfile, handleImageUpload,
        bizForm, setBizForm, handleBusinessRegister, setShowBusinessReg,
        handleBusinessImageUpload
    } = useData();

    const bizEditFileInputRef = useRef<HTMLInputElement>(null);
    const bizEditCameraInputRef = useRef<HTMLInputElement>(null);

    const targetBusinessId = editingBusinessId || user?.businessId;
    const business = isRegistration ? null : businesses.find(b => b.id === targetBusinessId);

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

    // Use either the found business for editing or bizForm for registration
    const data = isRegistration ? bizForm : business!;
    const updateField = (field: string, value: any) => {
        if (isRegistration) {
            setBizForm({ ...bizForm, [field]: value });
        } else {
            setBusinesses(prev => prev.map(b =>
                b.id === targetBusinessId ? { ...b, [field]: value } : b
            ));
        }
    };

    return (
        <div className="fixed inset-0 z-[2000] bg-slate-900/80 backdrop-blur-md flex items-end justify-center p-4 overflow-y-auto no-scrollbar pt-20">
            <div className="w-full max-w-lg bg-slate-900 rounded-[3.5rem] p-8 pb-12 max-h-[90vh] overflow-y-auto border border-white/10 shadow-2xl no-scrollbar animate-in slide-in-from-bottom duration-500">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            {isRegistration ? 'Registrar Negocio' : 'Editar Negocio'}
                        </h2>
                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">
                            {isRegistration ? 'Crea tu perfil comercial' : 'Configuración del perfil comercial'}
                        </p>
                    </div>
                    <button onClick={handleClose} className="p-3 bg-slate-800 rounded-full hover:bg-slate-700 transition-colors group">
                        <X className="w-6 h-6 text-slate-400 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="space-y-8">
                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Nombre Comercial</label>
                        <input
                            type="text"
                            value={data.name}
                            onChange={(e) => updateField('name', e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                            placeholder="Nombre de tu negocio"
                        />
                    </div>

                    <div>
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-2 mb-3 block">Categoría</label>
                        <select
                            className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none appearance-none transition-all"
                            value={data.category}
                            onChange={(e) => updateField('category', e.target.value as BusinessCategory)}
                        >
                            {Object.values(BusinessCategory).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Icono del Mapa</label>
                        <div className="flex flex-wrap gap-2.5 p-5 bg-slate-800/30 rounded-[2.5rem] border border-white/5">
                            {MAP_ICONS.map(i => (
                                <button
                                    key={i.id}
                                    onClick={() => updateField('icon', i.id)}
                                    className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl transition-all ${data.icon === i.id ? 'bg-sky-500 scale-110 shadow-xl shadow-sky-500/20' : 'bg-slate-800/50 hover:bg-slate-700 hover:scale-105 hover:border-white/10 border border-transparent'}`}
                                    title={i.label}
                                >
                                    {i.emoji}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Categoría del Planner IA</label>
                        <p className="text-[10px] text-slate-600 mb-3">Asigna este negocio a una sección del AI Planner. Los premiums son destacados.</p>
                        <div className="grid grid-cols-2 gap-2.5">
                            {([
                                { id: 'hospedaje', emoji: '🏨', label: 'Hospedaje' },
                                { id: 'comida', emoji: '🍽️', label: 'Restaurante' },
                                { id: 'baile', emoji: '🎶', label: 'Bar / Baile' },
                                { id: 'surf', emoji: '🏄', label: 'Surf / Escuela' },
                            ] as const).map(opt => (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => updateField('plannerCategory', (data as any).plannerCategory === opt.id ? undefined : opt.id)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${(data as any).plannerCategory === opt.id
                                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                                        : 'bg-slate-800/40 border-white/5 text-slate-400 hover:bg-slate-800'
                                        }`}
                                >
                                    <span className="text-xl">{opt.emoji}</span>
                                    <span className="text-[11px] font-black uppercase tracking-wider">{opt.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Descripción</label>
                        <textarea
                            rows={3}
                            value={data.description}
                            onChange={(e) => updateField('description', e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all resize-none"
                            placeholder="Describe tu negocio..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Pueblo</label>
                            <select
                                value={data.locality || 'Montañita'}
                                onChange={(e) => {
                                    const newLoc = e.target.value;
                                    const locObj = LOCALITIES.find(l => l.name === newLoc);
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
                                className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none appearance-none transition-all"
                            >
                                {LOCALITIES.map(l => (
                                    <option key={l.name} value={l.name}>{l.name}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Sector</label>
                            <select
                                value={data.sector}
                                onChange={(e) => updateField('sector', e.target.value as Sector)}
                                className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none appearance-none transition-all"
                            >
                                {(LOCALITY_SECTORS[data.locality || 'Montañita'] || Object.values(Sector)).map(s => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">WhatsApp</label>
                            <input
                                type="tel"
                                value={data.whatsapp || ''}
                                onChange={(e) => updateField('whatsapp', e.target.value)}
                                placeholder="+593 99..."
                                className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Instagram</label>
                            <input
                                type="text"
                                value={data.instagram || ''}
                                onChange={(e) => updateField('instagram', e.target.value)}
                                placeholder="@usuario"
                                className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-3 block tracking-widest">Teléfono de contacto</label>
                        <input
                            type="tel"
                            value={data.phone || ''}
                            onChange={(e) => updateField('phone', e.target.value)}
                            className="w-full bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white font-medium focus:ring-2 focus:ring-sky-500 outline-none transition-all"
                            placeholder="Número para llamadas"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-black text-slate-500 uppercase mb-4 block tracking-widest">Imagen del Negocio</label>
                        <div className="group relative rounded-[2.5rem] overflow-hidden border-2 border-white/5 mb-4 aspect-video bg-slate-800/50">
                            <img
                                src={data.imageUrl || "https://images.unsplash.com/photo-1566737236500-c8ac43014a67?auto=format&fit=crop&q=80&w=400"}
                                alt="Business"
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4">
                                <button
                                    onClick={() => bizEditCameraInputRef.current?.click()}
                                    className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 hover:bg-white/20 transition-all scale-75 group-hover:scale-100"
                                >
                                    <Camera className="w-6 h-6 text-white" />
                                </button>
                                <button
                                    onClick={() => bizEditFileInputRef.current?.click()}
                                    className="p-4 bg-white/10 backdrop-blur-xl rounded-full border border-white/20 hover:bg-white/20 transition-all scale-75 group-hover:scale-100"
                                >
                                    <Upload className="w-6 h-6 text-white" />
                                </button>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <button
                                type="button"
                                onClick={() => bizEditCameraInputRef.current?.click()}
                                className="flex items-center justify-center gap-3 bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white hover:bg-slate-700 transition-all font-bold"
                            >
                                <Camera className="w-5 h-5 text-slate-400" />
                                <span className="text-sm">Camara</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => bizEditFileInputRef.current?.click()}
                                className="flex items-center justify-center gap-3 bg-slate-800/50 border border-white/5 rounded-3xl px-6 py-4 text-white hover:bg-slate-700 transition-all font-bold"
                            >
                                <Upload className="w-5 h-5 text-slate-400" />
                                <span className="text-sm">Galería</span>
                            </button>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={(e) => {
                            if (isRegistration) {
                                // Create a synthetic form event so handleBusinessRegister works
                                const fakeEvent = { preventDefault: () => { } } as React.FormEvent;
                                handleBusinessRegister(fakeEvent);
                            } else {
                                handleUpdateBusinessProfile();
                            }
                        }}
                        className="w-full bg-gradient-to-r from-sky-500 to-indigo-500 text-white font-black py-5 rounded-3xl hover:shadow-[0_0_30px_rgba(14,165,233,0.3)] hover:scale-[1.02] active:scale-95 transition-all mt-4 tracking-widest uppercase text-sm"
                    >
                        {isRegistration ? 'Finalizar Registro' : 'Guardar Cambios'}
                    </button>
                </div>

                <input
                    type="file"
                    ref={bizEditCameraInputRef}
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => {
                        if (isRegistration) {
                            handleImageUpload(e, 'business');
                        } else {
                            handleBusinessImageUpload(e);
                        }
                    }}
                    className="hidden"
                />
                <input
                    type="file"
                    ref={bizEditFileInputRef}
                    accept="image/*"
                    onChange={(e) => {
                        if (isRegistration) {
                            handleImageUpload(e, 'business');
                        } else {
                            handleBusinessImageUpload(e);
                        }
                    }}
                    className="hidden"
                />
            </div>
        </div>
    );
};

