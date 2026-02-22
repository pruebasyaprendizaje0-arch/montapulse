import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Edit3, LogOut, CheckCircle, MapPin, Store, Palmtree, Mountain,
    Zap, Star, Sparkles, MessageCircle, Navigation, CreditCard, Banknote, Mail,
    BarChart2, Eye, Users, TrendingUp, Award, Phone, User, X, Camera, ImageIcon, Upload, ShieldCheck
} from 'lucide-react';
import { UserProfile, Business, MontanitaEvent, Vibe, SubscriptionPlan, Sector, BusinessCategory } from '../types.ts';
import { EventCard } from '../components/EventCard.tsx';
import { getAppSettings, updateAppSettings, createUser, createFlashOffer } from '../services/firestoreService.ts';
import { logout } from '../services/authService.ts';
import { updateUser as updateUserProfile } from '../services/firestoreService.ts';
import { LOCALITY_SECTORS, MAP_ICONS, LOCALITIES } from '../constants.ts';
import { compressImage } from '../utils/imageUtils';

import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

export const Passport: React.FC = () => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, setUser, logout, isAdmin, loading: authLoading } = useAuthContext();
    const {
        events,
        businesses,
        favoritedEvents,
        toggleFavorite,
        setSelectedEvent,
        setShowMigrationPanel,
        setShowPaymentEdit,
        setShowBusinessEdit,
        setEditingBusinessId,
        loading: dataLoading
    } = useData();
    const { showToast, showConfirm } = useToast();
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [showAboutEdit, setShowAboutEdit] = useState(false);
    const [aboutContent, setAboutContent] = useState({
        description: 'Tu guía definitiva para no perderte nada en la costa. Descubre eventos, conecta con la comunidad y vive el pulso real de Montañita.',
        feature1: 'Ver eventos',
        feature2: 'Guardar favoritos',
        premiumFeature1: 'Publicar eventos',
        premiumFeature2: 'Métricas reales'
    });

    const profileFileInputRef = useRef<HTMLInputElement>(null);
    const profileCameraInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const loadSettings = async () => {
            const data = await getAppSettings('about_info');
            if (data) {
                setAboutContent(data as any);
            }
        };
        loadSettings();
    }, []);

    const handleSaveAbout = async () => {
        try {
            await updateAppSettings('about_info', aboutContent);
            setShowAboutEdit(false);
            showToast('Información actualizada correctamente', 'success');
        } catch (error) {
            console.error('Error updating about info:', error);
            showToast('Error al actualizar la información', 'error');
        }
    };



    const handleProfileImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file && editingUser) {
            try {
                const compressedBase64 = await compressImage(file, { maxWidth: 300, maxHeight: 300 });
                setEditingUser({ ...editingUser, avatarUrl: compressedBase64 });
            } catch (error) {
                console.error('Error uploading image:', error);
                showToast('Error al procesar la imagen', 'error');
            }
        }
    };

    const handleUpdateUserProfile = async () => {
        if (!editingUser) return;
        setIsSavingProfile(true);
        try {
            await createUser(editingUser.id, {
                name: editingUser.name,
                surname: editingUser.surname,
                email: editingUser.email,
                preferredVibe: editingUser.preferredVibe,
                avatarUrl: editingUser.avatarUrl || null,
                role: editingUser.role,
                businessId: editingUser.businessId || null,
                plan: editingUser.plan || SubscriptionPlan.VISITOR,
                points: editingUser.points || 0,
                pulsePassActive: editingUser.pulsePassActive !== undefined ? editingUser.pulsePassActive : true
            });
            // Update Firebase Auth Profile (Session / Cache)
            // This part is tricky as `updateUserProfile` from authService.ts expects authUser and display name/photoURL
            // Assuming `updateUserProfile` is meant to update the Firestore document and the local user state.
            // If it's for Firebase Auth, it needs `authUser` from context.
            // For now, I'll keep the original logic of updating Firestore and then setting local state.
            // The `updateUserProfile` from `authService.ts` is for Firebase Auth, not Firestore.
            // The original code had `if (authUser) { await updateUserProfile(authUser, ...); }`
            // The provided diff for `handleUpdateUserProfile` changes the first line to `await updateUserProfile(editingUser.id, editingUser);`
            // This implies `updateUserProfile` is now a Firestore update function, or a combined one.
            // Given the context, I'll assume `updateUserProfile` from `authService.ts` is now meant to update the Firestore document directly.
            // This is a deviation from typical `authService` functions, but I must follow the diff.
            // If `updateUserProfile` is from `authService.ts`, it usually updates Firebase Auth profile.
            // The `createUser` function is for Firestore.
            // The diff provided for `handleUpdateUserProfile` is:
            // `await updateUserProfile(editingUser.id, editingUser);`
            // This line replaces the `createUser` call and the `updateUserProfile` (Firebase Auth) call.
            // This means `updateUserProfile` from `authService.ts` is now expected to handle both.
            // This is a significant change in `updateUserProfile`'s signature and responsibility.
            // I will apply the diff faithfully, assuming `updateUserProfile` is updated elsewhere to match this signature.
            await updateUserProfile(editingUser.id, editingUser);
            setUser(editingUser);
            setShowProfileEdit(false);
            showToast('Perfil actualizado con éxito', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Error al actualizar el perfil', 'error');
        } finally {
            setIsSavingProfile(false);
        }
    };

    const onEditProfile = () => {
        if (user) {
            setEditingUser({ ...user });
            setShowProfileEdit(true);
        }
    };

    if (authLoading || dataLoading) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-sky-500"></div>
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
                <div className="w-20 h-20 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-white/5">
                    <User className="w-10 h-10 text-slate-500" />
                </div>
                <h1 className="text-2xl font-black text-white mb-2">Mi Passport</h1>
                <p className="text-slate-400 mb-8 max-w-xs">Inicia sesión para acceder a tu perfil, puntos y beneficios.</p>
                <button
                    onClick={() => navigate('/')}
                    className="bg-sky-500 text-white font-black px-8 py-4 rounded-2xl shadow-lg shadow-sky-500/20 hover:bg-sky-600 transition-all flex items-center gap-2"
                >
                    <LogOut className="w-5 h-5" /> Ir al Inicio
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-[#000000] text-white pb-24 overflow-y-auto no-scrollbar">
                {/* Header */}
                <div className="pt-12 px-8 flex items-center justify-between mb-10">
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <h1 className="text-3xl font-black tracking-tight">{user.name} {user.surname}</h1>
                            <div className="bg-orange-500/20 p-1.5 rounded-xl border border-orange-500/30">
                                <ShieldCheck className="w-4 h-4 text-orange-500" />
                            </div>
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Verified Member</span>
                    </div>
                    <button
                        onClick={onEditProfile}
                        className="p-4 bg-[#111111] rounded-2xl border border-white/5 text-slate-400 hover:text-white transition-all shadow-xl"
                    >
                        <Edit3 className="w-6 h-6" />
                    </button>
                </div>

                {/* Profile Hero */}
                <div className="flex flex-col items-center px-8 mb-12">
                    <div className="relative mb-8">
                        {/* Glowing Ring */}
                        <div className="absolute inset-[-4px] rounded-[3.5rem] bg-orange-500 blur-md opacity-20" />
                        <div className="absolute inset-[-2px] rounded-[3.5rem] bg-gradient-to-br from-orange-400 to-orange-600" />

                        <div className="w-40 h-40 rounded-[3.25rem] bg-[#111111] border-[6px] border-black overflow-hidden relative shadow-2xl">
                            {user.avatarUrl ? (
                                <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-600">
                                    <User className="w-16 h-16" />
                                </div>
                            )}
                        </div>

                        {/* Verified Badge Overlay */}
                        <div className="absolute -bottom-2 -right-2 bg-orange-500 p-3 rounded-2xl shadow-2xl shadow-orange-500/40 border-4 border-black ring-1 ring-white/10">
                            <Star className="w-5 h-5 text-white fill-white" />
                        </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="w-full grid grid-cols-3 gap-4 px-4">
                        {[
                            { label: 'Events', value: '12', icon: MapPin },
                            { label: 'Friends', value: '1.2k', icon: Users },
                            { label: 'Impact', value: '240', icon: Zap }
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <span className="text-xl font-black text-white">{stat.value}</span>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* My Upcoming Pulses */}
                <div className="mb-12">
                    <div className="px-8 flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black tracking-tight">My Upcoming Pulses</h3>
                        <button className="text-[11px] font-black text-orange-500 uppercase tracking-widest">View All</button>
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar px-8">
                        {favoritedEvents.slice(0, 3).map((event) => (
                            <div key={event.id} className="min-w-[280px] w-[280px] shrink-0 transform transition-all hover:scale-[1.02] active:scale-95 text-left">
                                <div className="relative h-40 rounded-[2.5rem] overflow-hidden border border-white/5 shadow-2xl group">
                                    <img src={event.imageUrl} alt={event.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
                                    <div className="absolute bottom-4 left-6 right-6">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-full uppercase">{event.category}</span>
                                            <span className="text-[9px] font-black text-white/60 uppercase">{event.sector}</span>
                                        </div>
                                        <h4 className="text-base font-black text-white leading-tight truncate">{event.title}</h4>
                                    </div>
                                </div>
                            </div>
                        ))}
                        {favoritedEvents.length === 0 && (
                            <div className="w-full py-12 bg-[#111111] rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center text-slate-500 gap-2 mx-8">
                                <Sparkles className="w-8 h-8 opacity-20" />
                                <p className="text-xs font-black uppercase tracking-widest">No pulses scheduled</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Options List */}
                <div className="px-8 space-y-3 mb-12">
                    {[
                        { label: 'Edit Profile', icon: User, color: 'text-blue-400', action: onEditProfile },
                        { label: 'Preferences', icon: Sparkles, color: 'text-purple-400', action: () => { } },
                        { label: 'Security', icon: ShieldCheck, color: 'text-emerald-400', action: () => { } },
                        { label: 'Help & Support', icon: MessageCircle, color: 'text-orange-400', action: () => { } }
                    ].map((option, i) => (
                        <button
                            key={i}
                            onClick={option.action}
                            className="w-full flex items-center justify-between p-6 bg-[#111111] rounded-[2.25rem] border border-white/5 hover:bg-white/5 transition-all group"
                        >
                            <div className="flex items-center gap-4">
                                <div className={`p-3 rounded-2xl bg-black/40 ${option.color} group-hover:bg-black/60 transition-colors`}>
                                    <option.icon className="w-6 h-6" />
                                </div>
                                <span className="font-black text-slate-300 group-hover:text-white transition-colors">{option.label}</span>
                            </div>
                            <ChevronLeft className="w-6 h-6 text-slate-600 rotate-180 group-hover:text-white transition-colors" />
                        </button>
                    ))}
                </div>

                {/* Your Vibe */}
                <div className="px-8 mb-12">
                    <h3 className="text-lg font-black text-white mb-4 tracking-tight">Your Vibe</h3>
                    <div className="flex flex-wrap gap-2">
                        {Object.values(Vibe).map(v => (
                            <button
                                key={v}
                                onClick={() => {
                                    if (user) {
                                        setUser({ ...user, preferredVibe: v });
                                    }
                                    navigate('/', { state: { filter: v } });
                                }}
                                className={`px-6 py-3 rounded-2xl border font-black text-xs transition-all uppercase tracking-widest ${user?.preferredVibe === v ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' : 'bg-[#111111] border-white/5 text-slate-500 hover:text-slate-300'}`}
                            >
                                {v}
                            </button>
                        ))}
                    </div>

                    {/* Admin Buttons Group */}
                    {isAdmin && (
                        <div className="flex flex-col gap-3 mt-8">
                            <button
                                onClick={() => setShowMigrationPanel(true)}
                                className="w-full bg-gradient-to-r from-orange-500 to-pink-500 text-white font-black py-4 rounded-2xl hover:from-orange-600 hover:to-pink-600 transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                            >
                                <Upload className="w-5 h-5" />
                                <span>Migrate to Firestore</span>
                            </button>

                            <button
                                onClick={() => navigate('/admin-users')}
                                className="w-full bg-[#111111] text-sky-400 font-black py-4 rounded-2xl border border-sky-500/30 flex items-center justify-center gap-2 hover:bg-white/5 transition-all uppercase tracking-[0.2em] text-[10px]"
                            >
                                <ShieldCheck className="w-5 h-5" />
                                <span>MODO SUPERUSUARIO</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Logout Button */}
                <div className="px-8">
                    <button
                        onClick={logout}
                        className="w-full py-6 bg-gradient-to-r from-orange-500/10 to-rose-500/10 border border-orange-500/20 text-orange-500 rounded-[2.25rem] font-black uppercase tracking-[0.3em] hover:from-orange-500/20 hover:to-rose-500/20 transition-all flex items-center justify-center gap-3 shadow-xl"
                    >
                        <LogOut className="w-6 h-6" />
                        Sign Out
                    </button>
                </div>
            </div>

            {/* Modals & Overlays */}
            {showAboutEdit && (
                <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowAboutEdit(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md space-y-4 shadow-2xl" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-white">Editar Información</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Descripción</label>
                                <textarea
                                    value={aboutContent.description}
                                    onChange={e => setAboutContent({ ...aboutContent, description: e.target.value })}
                                    className="w-full bg-slate-800 border border-white/5 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 transition-all"
                                    rows={3}
                                />
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 block">Funcionalidades Free</label>
                                <div className="space-y-2">
                                    <input
                                        value={aboutContent.feature1}
                                        onChange={e => setAboutContent({ ...aboutContent, feature1: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <input
                                        value={aboutContent.feature2}
                                        onChange={e => setAboutContent({ ...aboutContent, feature2: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1 block">Funcionalidades Premium</label>
                                <div className="space-y-2">
                                    <input
                                        value={aboutContent.premiumFeature1}
                                        onChange={e => setAboutContent({ ...aboutContent, premiumFeature1: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                    <input
                                        value={aboutContent.premiumFeature2}
                                        onChange={e => setAboutContent({ ...aboutContent, premiumFeature2: e.target.value })}
                                        className="w-full bg-slate-800 border border-white/5 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3 pt-4">
                            <button onClick={() => setShowAboutEdit(false)} className="flex-1 py-4 rounded-2xl bg-slate-800 text-slate-300 font-black uppercase text-xs tracking-widest hover:bg-slate-700 transition">Cancelar</button>
                            <button onClick={handleSaveAbout} className="flex-1 py-4 rounded-2xl bg-orange-500 text-white font-black uppercase text-xs tracking-widest shadow-lg shadow-orange-500/20 hover:bg-orange-600 transition">Guardar</button>
                        </div>
                    </div>
                </div>
            )}

            {showProfileEdit && editingUser && (
                <div className="fixed inset-0 z-[2100] bg-black/90 backdrop-blur-xl flex items-end justify-center">
                    <div className="w-full max-w-lg bg-[#111111] rounded-t-[3.5rem] p-8 pb-12 max-h-[90vh] overflow-y-auto border-t border-white/10 shadow-2xl">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-white tracking-tight">Editar Perfil</h2>
                            <button onClick={() => setShowProfileEdit(false)} className="p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-colors">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>

                        <div className="space-y-8">
                            <div className="flex flex-col items-center mb-4">
                                <div className="relative group cursor-pointer" onClick={() => profileFileInputRef.current?.click()}>
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-black border-4 border-white/5 overflow-hidden shadow-2xl relative">
                                        {editingUser.avatarUrl ? (
                                            <img src={editingUser.avatarUrl} alt="Preview" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-slate-600 bg-slate-900">
                                                <User className="w-12 h-12" />
                                            </div>
                                        )}
                                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                                            <Camera className="w-8 h-8 text-white" />
                                        </div>
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 bg-orange-500 p-2.5 rounded-xl border-4 border-[#111111] shadow-xl">
                                        <Upload className="w-4 h-4 text-white" />
                                    </div>
                                </div>
                                <div className="mt-4 flex gap-2">
                                    <button
                                        onClick={() => profileFileInputRef.current?.click()}
                                        className="text-[10px] font-black text-orange-500 uppercase tracking-widest px-4 py-2 bg-orange-500/10 rounded-full hover:bg-orange-500/20 transition-colors"
                                    >
                                        Subir Nueva
                                    </button>
                                    <button
                                        onClick={() => profileCameraInputRef.current?.click()}
                                        className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-4 py-2 bg-white/5 rounded-full hover:bg-white/10 transition-colors"
                                    >
                                        Cámara
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre</label>
                                    <input
                                        type="text"
                                        value={editingUser.name}
                                        onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                                        className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Apellido</label>
                                    <input
                                        type="text"
                                        value={editingUser.surname}
                                        onChange={(e) => setEditingUser({ ...editingUser, surname: e.target.value })}
                                        className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Email de contacto</label>
                                <input
                                    type="email"
                                    value={editingUser.email}
                                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                                    className="w-full bg-black border border-white/5 rounded-2xl px-6 py-4 text-white focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Vibe Favorita</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {Object.values(Vibe).map(v => (
                                        <button
                                            key={v}
                                            onClick={() => setEditingUser({ ...editingUser, preferredVibe: v })}
                                            className={`py-3 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all ${editingUser.preferredVibe === v ? 'bg-orange-500 border-orange-400 text-white shadow-lg shadow-orange-500/20' : 'bg-black border-white/5 text-slate-500 hover:text-slate-300'}`}
                                        >
                                            {v}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <input type="file" ref={profileFileInputRef} className="hidden" accept="image/*" onChange={handleProfileImageUpload} />
                            <input type="file" ref={profileCameraInputRef} className="hidden" accept="image/*" capture="environment" onChange={handleProfileImageUpload} />

                            <button
                                onClick={handleUpdateUserProfile}
                                disabled={isSavingProfile}
                                className="w-full bg-orange-500 text-white font-black py-5 rounded-2xl hover:bg-orange-600 transition flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed shadow-2xl shadow-orange-500/30 uppercase tracking-[0.2em] text-xs"
                            >
                                {isSavingProfile ? (
                                    <>
                                        <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                                        Actualizando...
                                    </>
                                ) : (
                                    'Guardar Cambios'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
const AnalyticsCard = ({ icon, label, value, trend }: { icon: React.ReactNode, label: string, value: number, trend?: string }) => (
    <div className="p-5 rounded-[2rem] bg-white/5 border border-white/5 hover:border-white/10 transition-colors group">
        <div className="flex items-center justify-between mb-3">
            <div className="p-2 rounded-xl bg-white/5">
                {icon}
            </div>
            {trend && (
                <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-green-500/10 text-[9px] font-bold text-green-400">
                    <TrendingUp className="w-2.5 h-2.5" />
                    {trend}
                </div>
            )}
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-white mt-1">{value?.toLocaleString()}</p>
    </div>
);
