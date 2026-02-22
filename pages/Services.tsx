import React from 'react';
import { Truck, Bus, Car, Map, Info, Waves, Coffee, ShoppingBag, Wind, Edit2, Plus, Trash2, Save, X, ChevronDown, ChevronUp } from 'lucide-react';
import { updateAppSettings } from '../services/firestoreService';
import { Header } from '../components/Layout/Header.tsx';
import { useData } from '../context/DataContext';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { ServiceCategory, ServiceItem } from '../types';
import { useTranslation } from 'react-i18next';

const ICON_MAP: Record<string, any> = {
    Truck, Bus, Car, Map, Info, Waves, Coffee, ShoppingBag, Wind
};

const DEFAULT_SERVICES: ServiceCategory[] = [
    {
        title: 'Transporte',
        icon: 'Bus',
        color: 'text-sky-400',
        bg: 'bg-sky-500/10',
        items: [
            { name: 'Buses Interprovinciales', desc: 'Terminal Terrestre (Libertad/Santa Elena)', contact: 'Horarios cada 15-30 min' },
            { name: 'Cooperativa Manglaralto', desc: 'Ruta del Spondylus (Pueblo en pueblo)', contact: 'Frecuente' },
            { name: 'Taxis Montañita', desc: 'Disponibles 24/7 en el centro', contact: '+593-XXX-XXXX' }
        ]
    },
    {
        title: 'Servicios Básicos',
        icon: 'Truck',
        color: 'text-emerald-400',
        bg: 'bg-emerald-500/10',
        items: [
            { name: 'Lavanderías', desc: 'Recogida y entrega el mismo día', contact: 'Sector El Tigrillo / Centro' },
            { name: 'Supermercados', desc: 'Abiertos hasta tarde', contact: 'Centro de Montañita' },
            { name: 'Farmacias', desc: 'Atención 24 horas', contact: 'Calle Principal' }
        ]
    },
    {
        title: 'Turismo & Aventura',
        icon: 'Map',
        color: 'text-rose-400',
        bg: 'bg-rose-500/10',
        items: [
            { name: 'Escuelas de Surf', desc: 'Clases para todos los niveles', contact: 'Sector La Punta' },
            { name: 'Avistamiento de Ballenas', desc: 'Temporada: Junio - Septiembre', contact: 'Puerto López / Ayangue' },
            { name: 'Parapente', desc: 'Vuelos sobre el mar', contact: 'Cerro Blanco / San Pedro' }
        ]
    }
];

export const Services: React.FC = () => {
    const { services, handleUpdateServices } = useData();
    const { user } = useAuthContext();
    const { t } = useTranslation();
    const { showToast } = useToast();
    const isAdmin = user?.role === 'admin';
    const [isEditing, setIsEditing] = React.useState(false);
    const [editedServices, setEditedServices] = React.useState<ServiceCategory[]>([]);

    const displayServices = services.length > 0 ? services : DEFAULT_SERVICES;

    React.useEffect(() => {
        if (isEditing) {
            setEditedServices(JSON.parse(JSON.stringify(displayServices)));
        }
    }, [isEditing, services, displayServices]);

    const handleSave = async () => {
        try {
            await handleUpdateServices(editedServices);
            showToast('Cambios guardados correctamente', 'success');
            setIsEditing(false);
        } catch (error) {
            console.error('Error saving services:', error);
            showToast('Error al guardar los cambios', 'error');
        }
    };

    const updateCategory = (idx: number, field: string, value: string) => {
        const newServices = [...editedServices];
        (newServices[idx] as any)[field] = value;
        setEditedServices(newServices);
    };

    const updateItem = (catIdx: number, itemIdx: number, field: string, value: string) => {
        const newServices = [...editedServices];
        (newServices[catIdx].items[itemIdx] as any)[field] = value;
        setEditedServices(newServices);
    };

    const addItem = (catIdx: number) => {
        const newServices = [...editedServices];
        newServices[catIdx].items.push({ name: 'Nuevo Servicio', desc: 'Descripción...', contact: 'Contacto...' });
        setEditedServices(newServices);
    };

    const removeItem = (catIdx: number, itemIdx: number) => {
        const newServices = [...editedServices];
        newServices[catIdx].items.splice(itemIdx, 1);
        setEditedServices(newServices);
    };

    const moveCategory = (idx: number, dir: 'up' | 'down') => {
        const newServices = [...editedServices];
        const target = dir === 'up' ? idx - 1 : idx + 1;
        if (target >= 0 && target < newServices.length) {
            [newServices[idx], newServices[target]] = [newServices[target], newServices[idx]];
            setEditedServices(newServices);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 pb-32">
            <Header />
            <div className="relative pt-24 px-6 max-w-2xl mx-auto">
                <div className="flex justify-between items-start mb-8">
                    <div>
                        <h1 className="text-4xl font-black text-white tracking-tighter mb-2">{t('common.services')}</h1>
                        <p className="text-slate-400 font-medium">{t('services.subTitle')}</p>
                    </div>
                    {isAdmin && (
                        <button
                            onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                            className={`px - 4 py - 2 rounded - xl flex items - center gap - 2 font - bold text - sm transition - all ${isEditing
                                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20'
                                : 'bg-white/10 text-white hover:bg-white/20'
                                } `}
                        >
                            {isEditing ? (
                                <><Save className="w-4 h-4" /> {t('common.save')}</>
                            ) : (
                                <><Edit2 className="w-4 h-4" /> {t('services.editMode')}</>
                            )}
                        </button>
                    )}
                </div>

                {isEditing && (
                    <div className="mb-6 flex gap-2">
                        <button
                            onClick={() => setIsEditing(false)}
                            className="px-4 py-2 bg-rose-600/20 text-rose-400 border border-rose-600/30 rounded-xl text-xs font-bold flex items-center gap-2"
                        >
                            <X className="w-3 h-3" /> {t('common.cancel')}
                        </button>
                    </div>
                )}

                <div className="space-y-10">
                    {(isEditing ? editedServices : displayServices).map((cat, idx) => {
                        const IconComponent = ICON_MAP[cat.icon] || Info;
                        return (
                            <div key={idx} className="relative group/cat">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                        <div className={`p - 2 rounded - xl ${cat.bg} `}>
                                            <IconComponent className={`w - 6 h - 6 ${cat.color} `} />
                                        </div>
                                        {isEditing ? (
                                            <input
                                                value={cat.title}
                                                onChange={(e) => updateCategory(idx, 'title', e.target.value)}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xl font-bold text-white focus:ring-1 focus:ring-sky-500"
                                            />
                                        ) : (
                                            <h2 className="text-xl font-bold text-white uppercase tracking-wider">{cat.title}</h2>
                                        )}
                                    </div>
                                    {isEditing && (
                                        <div className="flex gap-1 opacity-0 group-hover/cat:opacity-100 transition-opacity">
                                            <button onClick={() => moveCategory(idx, 'up')} className="p-1 text-slate-500 hover:text-white"><ChevronUp className="w-4 h-4" /></button>
                                            <button onClick={() => moveCategory(idx, 'down')} className="p-1 text-slate-500 hover:text-white"><ChevronDown className="w-4 h-4" /></button>
                                        </div>
                                    )}
                                </div>

                                <div className="grid gap-4">
                                    {cat.items.map((item, i) => (
                                        <div key={i} className={`relative bg - slate - 900 / 40 backdrop - blur - xl border border - white / 5 p - 5 rounded - [2rem] hover: bg - white / 5 transition - all group / item ${isEditing ? 'border-dashed border-sky-500/30' : ''} `}>
                                            {isEditing ? (
                                                <div className="space-y-3">
                                                    <div className="flex justify-between items-start gap-4">
                                                        <input
                                                            value={item.name}
                                                            onChange={(e) => updateItem(idx, i, 'name', e.target.value)}
                                                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm font-bold text-white"
                                                            placeholder={t('services.namePlaceholder')}
                                                        />
                                                        <input
                                                            value={item.contact}
                                                            onChange={(e) => updateItem(idx, i, 'contact', e.target.value)}
                                                            className="w-32 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[10px] font-black uppercase text-slate-400"
                                                            placeholder={t('services.contactPlaceholder')}
                                                        />
                                                    </div>
                                                    <textarea
                                                        value={item.desc}
                                                        onChange={(e) => updateItem(idx, i, 'desc', e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm text-slate-400 h-16 resize-none"
                                                        placeholder={t('services.descPlaceholder')}
                                                    />
                                                    <button
                                                        onClick={() => removeItem(idx, i)}
                                                        className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full opacity-0 group-hover/item:opacity-100 transition-opacity shadow-lg"
                                                    >
                                                        <Trash2 className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <>
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className="font-bold text-white group-hover:text-sky-400 transition-colors">{item.name}</h3>
                                                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{item.contact}</span>
                                                    </div>
                                                    <p className="text-sm text-slate-400">{item.desc}</p>
                                                </>
                                            )}
                                        </div>
                                    ))}
                                    {isEditing && (
                                        <button
                                            onClick={() => addItem(idx)}
                                            className="p-4 border-2 border-dashed border-white/5 rounded-[2rem] text-slate-500 hover:text-sky-400 hover:border-sky-500/30 transition-all flex items-center justify-center gap-2"
                                        >
                                            <Plus className="w-4 h-4" /> <span className="text-xs font-bold uppercase tracking-widest">{t('services.addService')}</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {!isEditing && (
                    <div className="mt-12 p-6 bg-gradient-to-br from-sky-500/20 to-indigo-600/20 border border-sky-500/20 rounded-[2.5rem] flex items-center gap-4 animate-in zoom-in duration-700">
                        <div className="w-12 h-12 bg-sky-500 rounded-full flex items-center justify-center shrink-0 shadow-lg shadow-sky-500/20">
                            <Info className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h4 className="font-bold text-white mb-0.5">{t('services.needMore')}</h4>
                            <p className="text-xs text-sky-400/80 leading-relaxed">{t('services.needMoreDesc')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
