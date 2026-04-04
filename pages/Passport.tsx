import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Edit3, LogOut, CheckCircle, MapPin, Store, Palmtree, Mountain,
    Zap, Star, Sparkles, MessageCircle, Navigation, CreditCard, Banknote, Mail,
    BarChart2, Eye, Users, TrendingUp, Award, Phone, User, X, Camera, ImageIcon, Upload, ShieldCheck, Plus, Activity,
    Info, FileText, ExternalLink, Trash2, Save, HelpCircle, Globe, Shield, Instagram, Facebook, Twitter, Link
} from 'lucide-react';
import { UserProfile, Business, MontanitaEvent, Vibe, SubscriptionPlan, Sector, BusinessCategory } from '../types.ts';
import { Calendar, Clock } from 'lucide-react';
import { EventCard } from '../components/EventCard.tsx';
import { createUser, updateUser, getAppSettings, updateAppSettings } from '../services/firestoreService.ts';
import { migrateAvatarsToStorage } from '../services/storageMigrationService.ts';
import { logout, updateUserProfile as updateAuthProfile } from '../services/authService.ts';
import { LOCALITY_SECTORS, MAP_ICONS, LOCALITIES, PLAN_LIMITS, SECTOR_INFO } from '../constants.ts';
import { compressImage } from '../utils/imageUtils';
import { uploadBase64Image } from '../services/storageService';


import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

const HELP_ICON_MAP: Record<string, any> = {
    Mail, MessageCircle, Info, FileText, ExternalLink, Zap, Star, ShieldCheck, Activity,
    HelpCircle, Globe, Shield, Phone, Instagram, Facebook, Twitter, Link
};

interface PassportProps {
    onNavigate?: (view: any) => void;
}

export const Passport: React.FC<PassportProps> = ({ onNavigate }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, setUser, authUser, logout, isAdmin, isSuperAdmin, isSuperUser, toggleSuperUser, loading: authLoading } = useAuthContext();
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
        setShowBusinessReg,
        followedBusinessIds,
        isBusinessFollowed,
        handleToggleFollow,
        setShowPublicProfile,
        setPublicProfileId,
        setPublicProfileType,
        loading: dataLoading,
        showHostWizard,
        handleOpenNewEventWizard,
        showPulseModal,
        setShowPulseModal,
        helpSupport,
        handleUpdateHelpSupport,
        businessFollowers,
        allUsers,
        showLogin,
        setShowLogin
    } = useData();
    const { showToast, showConfirm } = useToast();
    const [showProfileEdit, setShowProfileEdit] = useState(false);
    const [showAllPulses, setShowAllPulses] = useState(false);
    const [showAllFollowers, setShowAllFollowers] = useState(false);
    const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
    const [isSavingProfile, setIsSavingProfile] = useState(false);
    const [showAboutEdit, setShowAboutEdit] = useState(false);
    const [showPreferences, setShowPreferences] = useState(false);
    const [showSecurity, setShowSecurity] = useState(false);
    const [showHelp, setShowHelp] = useState(false);
    const [isEditingHelp, setIsEditingHelp] = useState(false);
    const [tempHelpItems, setTempHelpItems] = useState<any[]>([]);
    const [showPulsePass, setShowPulsePass] = useState(false);
    const [isMigratingStorage, setIsMigratingStorage] = useState(false);
    const [aboutContent, setAboutContent] = useState({
        description: 'Tu guía definitiva para no perderte nada en la costa. Descubre eventos, conecta con la comunidad y vive el pulso real de Montañita.',
        feature1: 'Ver eventos',
        feature2: 'Guardar favoritos',
        premiumFeature1: 'Publicar eventos',
        premiumFeature2: 'Métricas reales'
    });

    const profileFileInputRef = useRef<HTMLInputElement>(null);
    const profileCameraInputRef = useRef<HTMLInputElement>(null);

    const userBusiness = user?.businessId ? businesses.find(b => b.id === user.businessId) : null;
    
    const businessEvents = useMemo(() => {
        if (!userBusiness) return [];
        return events.filter(e => e.businessId === userBusiness.id);
    }, [events, userBusiness]);

    const userStats = useMemo(() => {
        const eventsCount = favoritedEvents.length;
        const friendsCount = followedBusinessIds.length;
        const impactCount = businessEvents.reduce((sum, e) => sum + (e.interestedCount || 0), 0);
        const totalClicks = businessEvents.reduce((sum, e) => sum + (e.clickCount || 0), 0);
        return { eventsCount, friendsCount, impactCount, totalClicks };
    }, [favoritedEvents, followedBusinessIds, businessEvents]);

    const isSpecialUser = user?.email === 'ubicameinformacion@gmail.com' || user?.role === 'admin';
    const isPremium = userBusiness?.plan === SubscriptionPlan.BASIC || userBusiness?.plan === SubscriptionPlan.PREMIUM || userBusiness?.plan === SubscriptionPlan.EXPERT || isSpecialUser;
    const planCreditsLimit = isPremium ? Infinity : PLAN_LIMITS[userBusiness?.plan || SubscriptionPlan.FREE];
    const availableCredits = userBusiness?.eventCredits ?? 0;
    const creditsRemaining = isPremium ? null : availableCredits;

    useEffect(() => {
        const loadSettings = async () => {
            const data = await getAppSettings('about_info');
            if (data) {
                setAboutContent(data as any);
            }
        };
        loadSettings();
    }, []);

    const getCategoryEmoji = (category: string) => {
        const cat = (category || '').toLowerCase();
        // Check exact match in label or id
        const icon = MAP_ICONS.find(i => i.label.toLowerCase() === cat || i.id === cat);
        if (icon) return icon.emoji;
        
        // Handle synonyms
        if (cat.includes('restaurante') || cat.includes('comida')) return '🍕';
        if (cat.includes('fiesta') || cat.includes('discoteca') || cat.includes('bar')) return '🍹';
        if (cat.includes('hospedaje') || cat.includes('hotel') || cat.includes('hostal')) return '🏨';
        if (cat.includes('surf')) return '🏄';
        
        return '🏷️';
    };

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
        if (!editingUser || !user) return;
        setIsSavingProfile(true);
        try {
            // Pick only necessary fields to update - ensure we're not sending 'id' 
            // inside the update object which can sometimes cause issues with Firestore rules 
            // or if the field is protected.
            const updatePayload: Partial<UserProfile> = {
                name: editingUser.name || '',
                surname: editingUser.surname || '',
                avatarUrl: editingUser.avatarUrl || '',
                preferredVibe: editingUser.preferredVibe || Vibe.ADRENALINA,
                email: editingUser.email || user.email // Update contact email only if provided
            };

            const userIdToUpdate = user.id || authUser?.uid;
            if (!userIdToUpdate) throw new Error('Usuario sin ID válido');

            // 1. If avatarUrl is a base64 string, upload it to Storage
            if (updatePayload.avatarUrl && updatePayload.avatarUrl.startsWith('data:image')) {
                const storagePath = `avatars/${userIdToUpdate}_${Date.now()}.jpg`;
                const storageUrl = await uploadBase64Image(storagePath, updatePayload.avatarUrl);
                updatePayload.avatarUrl = storageUrl;
            }

            // 2. Update Firestore document (Primary) using the UID from our profile
            await updateUser(userIdToUpdate, updatePayload);

            // 2. Update Firebase Auth profile if possible (Optional for consistency)
            if (authUser) {
                const newDisplayName = `${updatePayload.name} ${updatePayload.surname}`.trim();
                await updateAuthProfile(
                    authUser,
                    newDisplayName,
                    updatePayload.avatarUrl
                );
            }

            // 3. Update local state with all fields (merged)
            setUser({
                ...user,
                ...updatePayload
            });
            
            setShowProfileEdit(false);
            showToast('Perfil actualizado con éxito', 'success');
        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Error al actualizar el perfil: ' + (error instanceof Error ? error.message : 'Error desconocido'), 'error');
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
            <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-center p-6 text-center">
                {/* Logo grande */}
                <div className="w-24 h-24 bg-gradient-to-br from-orange-500 to-amber-500 rounded-[3rem] flex items-center justify-center mb-8 shadow-2xl shadow-orange-500/30 animate-pulse">
                    <Sparkles className="w-12 h-12 text-white" />
                </div>
                
                <h1 className="text-4xl font-black text-white mb-3 tracking-tight">Mi Passport</h1>
                <p className="text-slate-400 mb-10 max-w-sm text-sm leading-relaxed">
                    Accede a tu perfil, eventos guardados y beneficios exclusivos
                </p>
                
                <div className="flex flex-col gap-4 w-full max-w-xs">
                    <button
                        onClick={() => setShowLogin(true)}
                        className="w-full bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black px-8 py-5 rounded-3xl shadow-2xl shadow-orange-500/30 hover:shadow-orange-500/50 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3 text-lg tracking-wide"
                    >
                        <User className="w-6 h-6" /> Iniciar Sesión
                    </button>
                    <button
                        onClick={() => navigate('/')}
                        className="w-full bg-white/5 text-slate-300 font-bold px-8 py-4 rounded-3xl border border-white/10 hover:bg-white/10 hover:text-white transition-all"
                    >
                        Explorar sin cuenta
                    </button>
                </div>
                
                {/* Features */}
                <div className="mt-16 grid grid-cols-3 gap-6 px-4">
                    {[
                        { icon: MapPin, label: 'Eventos', color: 'text-orange-400' },
                        { icon: Star, label: 'Favoritos', color: 'text-amber-400' },
                        { icon: Award, label: 'Premios', color: 'text-yellow-400' }
                    ].map((f, i) => (
                        <div key={i} className="flex flex-col items-center gap-2">
                            <div className={`w-12 h-12 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center ${f.color}`}>
                                <f.icon className="w-6 h-6" />
                            </div>
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{f.label}</span>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <>
            <div className="min-h-screen bg-[#000000] text-white pb-24 overflow-y-auto no-scrollbar">
                {/* Header */}
                <div className="pt-12 px-8 flex items-center justify-between mb-10">
                    <div className="flex flex-col">
                        <h1 className="text-3xl font-black tracking-tight text-white">Mi Passport</h1>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mt-1">Centro de Control</span>
                    </div>
                    <button
                        onClick={onEditProfile}
                        className="p-4 bg-white/5 text-white rounded-2xl border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all shadow-xl group flex items-center gap-2"
                        title="Editar Perfil"
                    >
                        <Edit3 className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
                        <span className="text-[10px] font-black uppercase tracking-widest hidden sm:block">Editar</span>
                    </button>
                </div>

                {/* Profile Hero - Passport Card Style */}
                <div className="px-6 mb-10">
                    <div className="relative group perspective-1000">
                        {/* Interactive Card Background */}
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-600/30 via-transparent to-amber-600/30 rounded-[3rem] blur-3xl opacity-30 group-hover:opacity-50 transition-opacity duration-1000" />
                        
                        <div className="relative glass-panel rounded-[3rem] p-8 overflow-hidden border border-white/10 shadow-3xl">
                            {/* Card Decorative Elements */}
                            <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/10 rounded-full blur-3xl -mr-32 -mt-32 animate-pulse" />
                            <div className="absolute bottom-0 left-0 w-48 h-48 bg-amber-500/5 rounded-full blur-3xl -ml-24 -mb-24" />
                            <div className="absolute top-8 right-8 flex flex-col items-end">
                                <div className="text-[10px] font-black text-white/30 uppercase tracking-[0.4em] mb-1">Montañita Pulse</div>
                                <div className="h-[1px] w-12 bg-white/10" />
                            </div>

                            <div className="flex flex-col items-center">
                                {/* Avatar with High Profile Ring */}
                                <div className="relative mb-8 pt-4">
                                    <div className="absolute inset-[-8px] rounded-full border border-white/5 animate-spin-slow" />
                                    <div className="absolute inset-[-12px] rounded-full border border-orange-500/10" />
                                    
                                    <div className="relative z-10 w-32 h-32 rounded-full p-1.5 bg-gradient-to-br from-orange-500 via-amber-500 to-orange-400 shadow-2xl shadow-orange-500/20">
                                        <div className="w-full h-full rounded-full bg-slate-900 border-4 border-slate-900 overflow-hidden relative group/avatar">
                                            {user.avatarUrl ? (
                                                <img 
                                                    src={user.avatarUrl} 
                                                    alt="Avatar" 
                                                    className="w-full h-full object-cover group-hover/avatar:scale-110 transition-transform duration-700" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-700 bg-slate-800">
                                                    <User className="w-12 h-12" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                {/* Identity */}
                                <div className="text-center mb-10">
                                    <h2 className="text-3xl font-black text-white tracking-tight mb-3 flex items-center justify-center gap-2">
                                        {user.name} <span className="text-orange-500">{user.surname}</span>
                                    </h2>
                                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                                        <div className="flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 shadow-lg shadow-orange-500/5">
                                            <ShieldCheck className="w-4 h-4 text-orange-500" />
                                            <span className="text-[10px] font-black text-orange-500 uppercase tracking-widest">Verified Member</span>
                                        </div>
                                        <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/5">
                                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Passport No.</span>
                                            <span className="text-[10px] font-black text-white tracking-widest opacity-80">MP-{user.id?.slice(0, 6).toUpperCase()}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Card Stats Bar */}
                                <div className="w-full grid grid-cols-3 gap-0 border-t border-white/5 pt-8">
                                    {[
                                        { label: 'Pulses', value: userStats.eventsCount.toString(), color: 'text-orange-500' },
                                        { label: 'Following', value: userStats.friendsCount.toString(), color: 'text-white' },
                                        { label: 'Impact', value: userStats.impactCount.toString(), color: 'text-amber-500' }
                                    ].map((stat, i) => (
                                        <div key={i} className={`flex flex-col items-center px-4 ${i !== 2 ? 'border-r border-white/5' : ''}`}>
                                            <span className={`text-xl font-black ${stat.color} mb-0.5`}>{stat.value}</span>
                                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Pulse Window & Discovery */}
                <div className="px-6 mb-12">
                    <div className="grid grid-cols-1 gap-4">
                        <button
                            onClick={() => setShowPulseModal(true)}
                            className="relative w-full group overflow-hidden rounded-[2.5rem] bg-indigo-600 p-1 flex items-center justify-between transition-all hover:scale-[1.02] active:scale-95 shadow-2xl shadow-indigo-600/20"
                        >
                            <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-violet-600 to-indigo-700 animate-shimmer bg-[length:200%_100%]" />
                            <div className="relative flex-1 flex items-center justify-between bg-black/40 backdrop-blur-3xl rounded-[2.25rem] p-6 border border-white/10">
                                <div className="flex items-center gap-5">
                                    <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center group-hover:scale-110 transition-transform duration-500">
                                        <Activity className="w-7 h-7 text-indigo-400" />
                                    </div>
                                    <div className="text-left">
                                        <h3 className="text-xl font-black text-white tracking-tight leading-tight">Ventana Pulse</h3>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="relative flex h-2 w-2">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                                            </span>
                                            <p className="text-[10px] font-black text-indigo-300 uppercase tracking-widest">En Vivo Ahora</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center group-hover:bg-indigo-500 group-hover:border-indigo-400 transition-all duration-500">
                                    <Sparkles className="w-5 h-5 text-indigo-400 group-hover:text-white transition-colors" />
                                </div>
                            </div>
                        </button>
                    </div>
                </div>

                {/* My Upcoming Pulses */}
                <div className="mb-12">
                    <div className="px-6 flex items-center justify-between mb-6">
                        <div className="flex flex-col">
                            <h3 className="text-xl font-black tracking-tighter text-white">Próximos Pulses</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tus eventos guardados</p>
                        </div>
                        {favoritedEvents.length > 3 && (
                            <button 
                                onClick={() => setShowAllPulses(!showAllPulses)}
                                className="px-4 py-2 rounded-full border border-white/5 bg-white/5 text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] hover:bg-white/10 transition-colors"
                            >
                                {showAllPulses ? 'Cerrar' : 'Ver Todos'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-4">
                        {favoritedEvents.length > 0 ? (
                            favoritedEvents.slice(0, showAllPulses ? favoritedEvents.length : 3).map((event) => (
                                <div key={event.id} className="min-w-[280px] w-[280px] shrink-0 transform transition-transform hover:scale-[1.02] duration-500">
                                    <EventCard 
                                        event={event} 
                                        onClick={(e) => setSelectedEvent(e)}
                                    />
                                </div>
                            ))
                        ) : (
                            <div className="w-full h-32 glass-panel rounded-[2.5rem] flex flex-col items-center justify-center text-slate-600 gap-3 mx-2 border-dashed border-white/10">
                                <MapPin className="w-8 h-8 opacity-20" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em]">No tienes eventos planeados</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Following Feed */}
                {followedBusinessIds.length > 0 && (
                    <div className="mb-12">
                        <div className="px-6 flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <h3 className="text-xl font-black tracking-tighter text-white">Puntos de Interés</h3>
                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Lo que estás siguiendo</p>
                            </div>
                        </div>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar px-6 pb-4">
                            {followedBusinessIds.map(bizId => {
                                const biz = businesses.find(b => b.id === bizId);
                                if (!biz) return null;
                                return (
                                    <div 
                                        key={biz.id}
                                        onClick={() => {
                                            setPublicProfileId(biz.id);
                                            setShowPublicProfile(true);
                                        }}
                                        className="relative min-w-[140px] group cursor-pointer"
                                    >
                                        <div className="relative pt-4 px-2">
                                            <div className="absolute inset-0 bg-white/5 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                            <div className="w-24 h-24 mx-auto mb-4 relative z-10">
                                                <div className="absolute inset-[-4px] rounded-full border border-orange-500/20 group-hover:border-orange-500/50 transition-colors duration-500" />
                                                <div className="w-full h-full rounded-full overflow-hidden border-4 border-black relative">
                                                    <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-white rounded-full flex items-center justify-center border-4 border-black shadow-lg">
                                                    <div className="text-[10px]">
                                                        {getCategoryEmoji(biz.category)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-center relative z-10 pb-4">
                                                <p className="text-xs font-black text-white truncate px-2 mb-1">{biz.name}</p>
                                                <div className="flex items-center justify-center gap-1">
                                                    <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">{biz.sector}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Mi Negocio Section */}
                <div className="px-8 mb-12">
                    <h3 className="text-lg font-black tracking-tight mb-6">Mi Negocio</h3>
                    
                    {user?.businessId && businesses.find(b => b.id === user.businessId) ? (() => {
                        const biz = businesses.find(b => b.id === user.businessId)!;
                        return (
                            <div
                                onClick={() => {
                                    setShowBusinessEdit(true);
                                    setEditingBusinessId(user.businessId);
                                }}
                                className="w-full relative overflow-hidden rounded-[2.5rem] bg-[#111111] border border-white/5 cursor-pointer group shadow-2xl"
                            >
                                <div className="absolute inset-0">
                                    <img 
                                        src={biz.imageUrl} 
                                        alt="Business" 
                                        className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-700" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20" />
                                </div>
                                <div className="relative p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-black/50 backdrop-blur-md p-1 border border-white/10 shadow-2xl overflow-hidden shrink-0 flex items-center justify-center">
                                            {biz.icon ? (
                                                (biz.icon.startsWith('http') || biz.icon.startsWith('data:image')) ? (
                                                    <img 
                                                        src={biz.icon} 
                                                        alt="Icon" 
                                                        className="w-full h-full object-cover rounded-xl" 
                                                    />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center bg-orange-500/10 rounded-xl">
                                                        <span className="text-3xl">
                                                            {MAP_ICONS.find(i => i.id === biz.icon || i.emoji === biz.icon)?.emoji || biz.icon}
                                                        </span>
                                                    </div>
                                                )
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-orange-500/20 rounded-xl">
                                                    <Store className="w-8 h-8 text-orange-500" />
                                                </div>
                                            )}
                                        </div>
                                         <div className="flex flex-col text-left">
                                            <div className="flex items-center gap-2 mb-1">
                                                <span className="text-white font-black text-xl leading-none">{biz.name}</span>
                                                {biz.isVerified && <CheckCircle className="w-4 h-4 text-sky-400 fill-sky-400/10" />}
                                            </div>
                                            <div className="flex flex-wrap items-center gap-2">
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
                                                    <span className="text-[10px]">
                                                        {getCategoryEmoji(biz.category)}
                                                    </span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{biz.category}</span>
                                                </div>
                                                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white/5 border border-white/10">
                                                    <span className="text-[10px]">{SECTOR_INFO[biz.sector]?.symbol || '📍'}</span>
                                                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{biz.sector}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Metrics Dashboard */}
                                    <div className="grid grid-cols-2 gap-3 mt-2">
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-2 text-orange-400 mb-1">
                                                <Eye className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Vistas / Semana</span>
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <span className="text-2xl font-black text-white leading-none">{biz.weeklyViews || 0}</span>
                                                <span className="text-[10px] text-slate-500 font-bold mb-0.5 uppercase">Totales: {biz.viewCount || 0}</span>
                                            </div>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col gap-1 hover:bg-white/10 transition-colors">
                                            <div className="flex items-center gap-2 text-sky-400 mb-1">
                                                <TrendingUp className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Clicks Eventos</span>
                                            </div>
                                            <div className="flex items-end gap-2">
                                                <span className="text-2xl font-black text-white leading-none">{userStats.totalClicks}</span>
                                                <span className="text-[10px] text-slate-500 font-bold mb-0.5 uppercase">Interés: {userStats.impactCount}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between mt-2 pt-4 border-t border-white/10">
                                        <span className="text-xs font-black text-orange-500 uppercase tracking-widest">Gestionar Negocio</span>
                                        <div className="p-2 bg-white/10 rounded-xl backdrop-blur-md border border-white/5 group-hover:bg-orange-500 group-hover:border-orange-400 transition-colors">
                                            <Edit3 className="w-4 h-4 text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })() : !user?.businessId ? (
                        <button
                            onClick={() => setShowBusinessReg(true)}
                            className="w-full p-8 bg-[#111111] rounded-[2.5rem] border border-dashed border-white/10 hover:bg-white/5 hover:border-white/20 transition-all flex flex-col items-center justify-center gap-3 active:scale-95"
                        >
                            <div className="p-4 bg-white/5 rounded-2xl">
                                <Plus className="w-8 h-8 text-slate-400" />
                            </div>
                            <span className="font-black text-slate-300">Añadir tu Negocio</span>
                        </button>
                    ) : null}
                </div>

                {/* Me Siguen Section */}
                {userBusiness && (
                    <div className="px-8 mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black tracking-tight">Me Siguen</h3>
                            {businessFollowers.length > 0 && (
                                <div className="flex items-center gap-4">
                                    {businessFollowers.length > 8 && (
                                        <button 
                                            onClick={() => setShowAllFollowers(!showAllFollowers)}
                                            className="text-[11px] font-black text-amber-500 uppercase tracking-widest"
                                        >
                                            {showAllFollowers ? 'Ver Menos' : 'Ver Todos'}
                                        </button>
                                    )}
                                    <div className="px-4 py-2 rounded-2xl bg-amber-500/20 border border-amber-500/30 flex items-center gap-2">
                                        <Users className="w-4 h-4 text-amber-400" />
                                        <span className="text-xs font-black uppercase tracking-widest text-amber-400">
                                            {businessFollowers.length} {businessFollowers.length === 1 ? 'seguidor' : 'seguidores'}
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                        
                        {businessFollowers.length > 0 ? (
                            <div className={`flex ${showAllFollowers ? 'flex-wrap' : 'overflow-x-auto no-scrollbar'} gap-3 pb-2`}>
                                {(showAllFollowers ? businessFollowers : businessFollowers.slice(0, 8)).map((followerId) => {
                                    const follower = allUsers.find(u => u.id === followerId);
                                    if (!follower) {
                                        const followedBiz = businesses.find(b => b.id === followerId);
                                        if (!followedBiz) return null;
                                        return (
                                            <div 
                                                key={followerId}
                                                onClick={() => {
                                                    setPublicProfileId(followerId);
                                                    setPublicProfileType('business');
                                                    setShowPublicProfile(true);
                                                }}
                                                className="min-w-[80px] w-[80px] shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
                                            >
                                                <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 p-0.5 group-hover:border-amber-500/60 transition-colors overflow-hidden">
                                                    <img 
                                                        src={followedBiz.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(followedBiz.name)}&background=random&color=fff`} 
                                                        className="w-full h-full rounded-full object-cover"
                                                        alt={followedBiz.name}
                                                    />
                                                </div>
                                                <div className="flex items-center justify-center gap-1 w-full px-1">
                                                    <div className="flex items-center gap-0.5 px-1 py-0.25 rounded-md bg-white/5 border border-white/10">
                                                        <span className="text-[8px]">
                                                            {getCategoryEmoji(followedBiz.category)}
                                                        </span>
                                                        {followedBiz.sector && (
                                                            <>
                                                                <span className="text-white/10 text-[6px]">|</span>
                                                                <span className="text-[8px]">
                                                                    {SECTOR_INFO[followedBiz.sector as Sector]?.symbol || '📍'}
                                                                </span>
                                                            </>
                                                        )}
                                                    </div>
                                                    <span className="text-[9px] font-black text-slate-400 text-center truncate group-hover:text-amber-400 transition-colors">
                                                        {followedBiz.name.split(' ')[0]}
                                                    </span>
                                                </div>
                                            </div>
                                        );
                                    }
                                    const followerName = follower.name || 'Member';
                                    return (
                                        <div 
                                            key={followerId}
                                            onClick={() => {
                                                setPublicProfileId(followerId);
                                                setPublicProfileType('user');
                                                setShowPublicProfile(true);
                                            }}
                                            className="min-w-[80px] w-[80px] shrink-0 flex flex-col items-center gap-2 cursor-pointer group"
                                        >
                                            <div className="w-16 h-16 rounded-full border-2 border-amber-500/30 p-0.5 group-hover:border-amber-500/60 transition-colors">
                                                <img 
                                                    src={follower.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(followerName)}&background=random&color=fff`} 
                                                    className="w-full h-full rounded-full object-cover"
                                                    alt={followerName}
                                                />
                                            </div>
                                            <span className="text-[9px] font-black text-slate-400 text-center truncate w-full group-hover:text-amber-400 transition-colors">
                                                {followerName.split(' ')[0]}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="py-8 text-center bg-[#111111] rounded-[2.5rem] border border-dashed border-white/10">
                                <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                                <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Aún no te siguen</p>
                                <p className="text-[10px] text-slate-600 mt-1">Comparte tu negocio para atraer seguidores</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Eventos del Negocio */}
                {userBusiness && (
                    <div className="px-8 mb-12">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black tracking-tight">Mis Eventos</h3>
                            {planCreditsLimit === Infinity ? (
                                <div className="px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Créditos Ilimitados</span>
                                </div>
                            ) : (
                                <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 ${availableCredits <= 1 ? 'bg-rose-500/20 border border-rose-500/30' : 'bg-orange-500/20 border border-orange-500/30'}`}>
                                    <Zap className={`w-4 h-4 ${availableCredits <= 1 ? 'text-rose-400' : 'text-orange-400'}`} />
                                    <span className={`text-xs font-black uppercase tracking-widest ${availableCredits <= 1 ? 'text-rose-400' : 'text-orange-400'}`}>
                                        {availableCredits}/{planCreditsLimit} Créditos Restantes
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {businessEvents.length > 0 ? (
                            <>
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => handleOpenNewEventWizard()}
                                        disabled={creditsRemaining !== null && creditsRemaining <= 0}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${creditsRemaining !== null && creditsRemaining <= 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'}`}
                                    >
                                        <Plus className="w-4 h-4" />
                                        Crear Evento
                                    </button>
                                </div>
                                <div className="flex gap-4 overflow-x-auto no-scrollbar pb-4">
                                    {businessEvents.slice(0, 5).map((event) => (
                                        <div key={event.id} className="min-w-[260px] w-[260px] shrink-0">
                                            <EventCard 
                                                event={event} 
                                                onClick={(e) => setSelectedEvent(e)}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="w-full py-8 bg-[#111111] rounded-[2.5rem] border border-dashed border-white/10 flex flex-col items-center justify-center gap-4">
                                <Sparkles className="w-8 h-8 text-slate-600" />
                                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No hay eventos creados</p>
                                <button
                                    onClick={() => handleOpenNewEventWizard()}
                                    className="flex items-center gap-2 px-6 py-3 bg-orange-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20"
                                >
                                    <Plus className="w-4 h-4" />
                                    Crear Primer Evento
                                </button>
                            </div>
                        )}
                    </div>
                )}



                {/* Navigation Grid */}
                <div className="px-6 mb-12">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col">
                            <h3 className="text-xl font-black tracking-tighter text-white">Menú Passport</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Configuración y Seguridad</p>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-3">
                            {[
                                { label: 'Editar Perfil', icon: User, color: 'text-orange-400', action: onEditProfile, desc: 'Nombre, avatar y detalles' },
                                { label: 'Pulse Pass', icon: Zap, color: 'text-amber-400', action: () => setShowPulsePass(true), desc: 'Tu ID para eventos' },
                                { label: 'Preferencias', icon: Sparkles, color: 'text-purple-400', action: () => setShowPreferences(true), desc: 'Filtros y visualización' },
                                { label: 'Seguridad', icon: ShieldCheck, color: 'text-emerald-400', action: () => setShowSecurity(true), desc: 'Cuenta y privacidad' },
                                { label: 'Políticas', icon: Shield, color: 'text-slate-400', action: () => navigate('/policies'), desc: 'Términos y condiciones' },
                                { label: 'Soporte', icon: MessageCircle, color: 'text-slate-400', action: () => setShowHelp(true), desc: 'Centro de ayuda' }
                            ].map((option, i) => (
                                <button
                                    key={i}
                                    onClick={option.action}
                                    className="group flex items-center justify-between p-5 bg-[#111111] rounded-3xl border border-white/5 hover:bg-white/5 hover:border-white/10 transition-all duration-300 active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center ${option.color} group-hover:scale-110 transition-transform duration-500 shadow-inner`}>
                                            <option.icon className="w-5 h-5" />
                                        </div>
                                        <div className="text-left">
                                            <p className="font-black text-sm text-slate-200 group-hover:text-white transition-colors tracking-tight">{option.label}</p>
                                            <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">{option.desc}</p>
                                        </div>
                                    </div>
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-slate-700 group-hover:text-white transition-colors">
                                        <ChevronLeft className="w-5 h-5 rotate-180" />
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Your Vibe Selector */}
                <div className="px-6 mb-12">
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col">
                            <h3 className="text-xl font-black tracking-tighter text-white">Tu Estilo</h3>
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Personaliza tu experiencia</p>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {Object.values(Vibe).map(v => (
                                <button
                                    key={v}
                                    onClick={() => {
                                        if (user) {
                                            setUser({ ...user, preferredVibe: v });
                                        }
                                        navigate('/', { state: { filter: v } });
                                    }}
                                    className={`relative px-4 py-4 rounded-3xl border font-black text-[11px] transition-all uppercase tracking-widest overflow-hidden active:scale-95 duration-300 ${user?.preferredVibe === v ? 'bg-orange-500 border-orange-400 text-white shadow-2xl shadow-orange-500/20' : 'bg-[#111111] border-white/5 text-slate-500 hover:text-slate-300 hover:border-white/10'}`}
                                >
                                    <div className="relative z-10">{v}</div>
                                    {user?.preferredVibe === v && (
                                        <div className="absolute inset-0 bg-gradient-to-tr from-white/10 to-transparent pointer-events-none" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Admin Control Center */}
                {isAdmin && (
                    <div className="px-6 mb-12">
                        <div className="p-8 bg-black border border-white/5 rounded-[3rem] shadow-2xl space-y-6">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center">
                                    <ShieldCheck className="w-6 h-6 text-sky-400" />
                                </div>
                                <div className="text-left">
                                    <h3 className="text-lg font-black text-white tracking-tight leading-tight">Admin Center</h3>
                                    <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest mt-0.5">Control Total</p>
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    onClick={() => navigate('/admin-users')}
                                    className="w-full bg-[#111111] border border-white/5 text-slate-300 font-black py-4 rounded-2xl hover:bg-white/5 hover:border-white/10 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
                                >
                                    <Users className="w-4 h-4 text-sky-400" />
                                    <span>Gestión de Usuarios</span>
                                </button>

                                <button
                                    onClick={() => setShowMigrationPanel(true)}
                                    className="w-full bg-[#111111] border border-white/5 text-slate-300 font-black py-4 rounded-2xl hover:bg-white/5 hover:border-white/10 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px]"
                                >
                                    <Upload className="w-4 h-4 text-orange-400" />
                                    <span>Migrar a Firestore</span>
                                </button>

                                <button
                                    onClick={async () => {
                                        if (await showConfirm('¿Quieres migrar todos los avatars de base64 a Firebase Storage? Esto mejorará el rendimiento.', 'Migrar Storage')) {
                                            setIsMigratingStorage(true);
                                            try {
                                                const result = await migrateAvatarsToStorage();
                                                if (result.success) {
                                                    showToast(result.message, 'success');
                                                } else {
                                                    showToast(result.message, 'error');
                                                }
                                            } catch (error) {
                                                showToast('Error en la migración', 'error');
                                            } finally {
                                                setIsMigratingStorage(false);
                                            }
                                        }
                                    }}
                                    disabled={isMigratingStorage}
                                    className="w-full bg-[#111111] border border-white/5 text-slate-300 font-black py-4 rounded-2xl hover:bg-white/5 hover:border-white/10 transition-all flex items-center justify-center gap-3 uppercase tracking-widest text-[10px] disabled:opacity-50"
                                >
                                    <ImageIcon className="w-4 h-4 text-violet-400" />
                                    <span>{isMigratingStorage ? 'Migrando...' : 'Migrar Avatars a Storage'}</span>
                                </button>

                                <button
                                    onClick={toggleSuperUser}
                                    className={`w-full py-4 rounded-2xl border transition-all uppercase tracking-widest text-[10px] font-black flex items-center justify-center gap-3 ${
                                        isSuperUser 
                                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                                        : 'bg-[#111111] text-slate-500 border-white/5 hover:bg-white/5'
                                    }`}
                                >
                                    <Zap className={`w-4 h-4 ${isSuperUser ? 'animate-pulse text-emerald-400' : 'text-slate-600'}`} />
                                    <span>{isSuperUser ? 'SuperUsuario: ACTIVO' : 'Activar Modo SuperUsuario'}</span>
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Final Sign Out */}
                <div className="px-6 pt-12 pb-24">
                    <button
                        onClick={logout}
                        className="group relative w-full h-[88px] flex items-center justify-center rounded-[2.5rem] bg-gradient-to-br from-rose-600/10 to-orange-600/10 border border-white/5 hover:border-rose-500/30 transition-all duration-500 active:scale-95 shadow-lg active:shadow-inner"
                    >
                        <div className="flex items-center gap-4 group-hover:scale-105 transition-transform duration-500">
                            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 flex items-center justify-center text-rose-500 shadow-inner group-hover:bg-rose-500 group-hover:text-white transition-all duration-500">
                                <LogOut className="w-5 h-5" />
                            </div>
                            <span className="font-black text-rose-500 text-sm uppercase tracking-[0.4em] mb-[-2px]">Cerrar Sesión</span>
                        </div>
                    </button>
                    <p className="text-center mt-8 text-[9px] font-black text-slate-700 uppercase tracking-[0.5em] opacity-50">Pulse v4.0.0 PREMIUM</p>
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

                            {!userBusiness && (
                                <button
                                    onClick={() => { setShowProfileEdit(false); setShowBusinessReg(true); }}
                                    className="w-full mt-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-black py-4 rounded-2xl hover:from-amber-400 hover:to-orange-400 transition flex items-center justify-center gap-3 shadow-lg shadow-amber-500/20 uppercase tracking-[0.2em] text-xs"
                                >
                                    <Store className="w-5 h-5" />
                                    Crear Mi Negocio
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Preferences Modal */}
            {showPreferences && (
                <div className="fixed inset-0 z-[2100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowPreferences(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-white">Preferencias</h3>
                            <button onClick={() => setShowPreferences(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                <span className="text-sm font-bold text-white">Notificaciones</span>
                                <div className="w-12 h-7 bg-orange-500 rounded-full p-1">
                                    <div className="w-5 h-5 bg-white rounded-full ml-5"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                <span className="text-sm font-bold text-white">Sonidos</span>
                                <div className="w-12 h-7 bg-slate-700 rounded-full p-1">
                                    <div className="w-5 h-5 bg-slate-400 rounded-full"></div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl">
                                <span className="text-sm font-bold text-white">Modo Oscuro</span>
                                <div className="w-12 h-7 bg-orange-500 rounded-full p-1">
                                    <div className="w-5 h-5 bg-white rounded-full ml-5"></div>
                                </div>
                            </div>
                        </div>
                        <button onClick={() => setShowPreferences(false)} className="w-full mt-6 py-4 bg-orange-500 text-white font-black rounded-2xl uppercase text-xs tracking-widest hover:bg-orange-600">
                            Guardar
                        </button>
                    </div>
                </div>
            )}

            {/* Security Modal */}
            {showSecurity && (
                <div className="fixed inset-0 z-[2100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowSecurity(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-white">Seguridad</h3>
                            <button onClick={() => setShowSecurity(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                <span className="text-sm font-bold text-white">Cambiar Contraseña</span>
                                <ChevronLeft className="w-5 h-5 text-slate-500 rotate-180" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                <span className="text-sm font-bold text-white">Autenticación 2FA</span>
                                <ChevronLeft className="w-5 h-5 text-slate-500 rotate-180" />
                            </button>
                            <button className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                <span className="text-sm font-bold text-white">Sesiones Activas</span>
                                <ChevronLeft className="w-5 h-5 text-slate-500 rotate-180" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Help & Support Modal */}
            {showHelp && (
                <div className="fixed inset-0 z-[2100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowHelp(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-black text-white">Ayuda y Soporte</h3>
                            <div className="flex gap-2">
                                {isAdmin && (
                                    <button 
                                        onClick={() => {
                                            if (isEditingHelp) {
                                                handleUpdateHelpSupport(tempHelpItems);
                                                setIsEditingHelp(false);
                                                showToast('Soporte actualizado', 'success');
                                            } else {
                                                setTempHelpItems([...helpSupport]);
                                                setIsEditingHelp(true);
                                            }
                                        }}
                                        className={`p-2 rounded-xl ${isEditingHelp ? 'bg-orange-600 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'}`}
                                    >
                                        {isEditingHelp ? <Save className="w-5 h-5" /> : <Edit3 className="w-5 h-5" />}
                                    </button>
                                )}
                                <button onClick={() => { setShowHelp(false); setIsEditingHelp(false); }} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                        </div>

                        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2 custom-scrollbar">
                            {(isEditingHelp ? tempHelpItems : helpSupport).map((item, idx) => {
                                const IconComponent = HELP_ICON_MAP[item.icon] || Info;
                                
                                if (isEditingHelp) {
                                    return (
                                        <div key={item.id} className="p-4 bg-white/5 rounded-2xl border border-white/10 space-y-3 relative group">
                                            <div className="flex gap-3">
                                                <div className="flex-1 space-y-2">
                                                    <input 
                                                        value={item.label}
                                                        onChange={e => {
                                                            const newItems = [...tempHelpItems];
                                                            newItems[idx].label = e.target.value;
                                                            setTempHelpItems(newItems);
                                                        }}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-sm font-bold text-white"
                                                        placeholder="Label"
                                                    />
                                                    <div className="flex gap-2">
                                                        <select 
                                                            value={item.type}
                                                            onChange={e => {
                                                                const newItems = [...tempHelpItems];
                                                                newItems[idx].type = e.target.value as any;
                                                                setTempHelpItems(newItems);
                                                            }}
                                                            className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white"
                                                        >
                                                            <option value="email">Email</option>
                                                            <option value="whatsapp">WhatsApp</option>
                                                            <option value="link">Link</option>
                                                            <option value="toast">Toast</option>
                                                        </select>
                                                        <select 
                                                            value={item.icon}
                                                            onChange={e => {
                                                                const newItems = [...tempHelpItems];
                                                                newItems[idx].icon = e.target.value;
                                                                setTempHelpItems(newItems);
                                                            }}
                                                            className="bg-slate-800 border border-white/10 rounded-lg px-2 py-1 text-[10px] text-white"
                                                        >
                                                            {Object.keys(HELP_ICON_MAP).map(icon => (
                                                                <option key={icon} value={icon}>{icon}</option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    <input 
                                                        value={item.value}
                                                        onChange={e => {
                                                            const newItems = [...tempHelpItems];
                                                            newItems[idx].value = e.target.value;
                                                            setTempHelpItems(newItems);
                                                        }}
                                                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1 text-xs text-slate-400 font-mono"
                                                        placeholder="Value (URL, email, etc)"
                                                    />
                                                </div>
                                                <button 
                                                    onClick={() => setTempHelpItems(tempHelpItems.filter((_, i) => i !== idx))}
                                                    className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl self-start"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </div>
                                    );
                                }

                                const content = (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-bold text-white">{item.label}</span>
                                        <IconComponent className="w-5 h-5 text-slate-500" />
                                    </div>
                                );

                                if (item.type === 'email') {
                                    return (
                                        <a key={item.id} href={`mailto:${item.value}`} className="block p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                            {content}
                                        </a>
                                    );
                                }
                                if (item.type === 'whatsapp') {
                                    const waLink = item.value.startsWith('http') ? item.value : `https://wa.me/${item.value.replace(/\D/g, '')}`;
                                    return (
                                        <a key={item.id} href={waLink} target="_blank" rel="noopener noreferrer" className="block p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                            {content}
                                        </a>
                                    );
                                }
                                if (item.type === 'link') {
                                    return (
                                        <a key={item.id} href={item.value} target="_blank" rel="noopener noreferrer" className="block p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                            {content}
                                        </a>
                                    );
                                }
                                return (
                                    <button 
                                        key={item.id}
                                        onClick={() => showToast(item.value, 'info')} 
                                        className="w-full text-left block p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors"
                                    >
                                        {content}
                                    </button>
                                );
                            })}

                            {isEditingHelp && (
                                <button 
                                    onClick={() => setTempHelpItems([...tempHelpItems, { id: Date.now().toString(), label: 'Nuevo Item', type: 'toast', value: 'Info...', icon: 'Info' }])}
                                    className="w-full p-4 border-2 border-dashed border-white/10 rounded-2xl text-slate-500 hover:text-white hover:border-white/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="text-xs font-bold uppercase tracking-widest">Añadir soporte</span>
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
 
            {/* Pulse Pass Modal */}
            {showPulsePass && (
                <div className="fixed inset-0 z-[2100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6" onClick={() => setShowPulsePass(false)}>
                    <div className="bg-slate-900 border border-white/10 rounded-[2.5rem] p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-rose-500 rounded-xl">
                                    <Zap className="w-5 h-5 text-white" />
                                </div>
                                <h3 className="text-xl font-black text-white">Pulse Pass</h3>
                            </div>
                            <button onClick={() => setShowPulsePass(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-white">Publicar eventos ilimitados</p>
                                    <p className="text-[10px] text-slate-500">Crea tantos eventos como quieras</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-white">Destacar en el mapa</p>
                                    <p className="text-[10px] text-slate-500">Tu negocio aparece primero</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-white">Métricas avanzadas</p>
                                    <p className="text-[10px] text-slate-500">Ver visitas y engagement</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-white">Badge premium</p>
                                    <p className="text-[10px] text-slate-500">Icono exclusivo en tu perfil</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-white/5 rounded-xl">
                                <CheckCircle className="w-4 h-4 text-green-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-white">Soporte prioritario</p>
                                    <p className="text-[10px] text-slate-500">Atención preferente 24/7</p>
                                </div>
                            </div>
                            <div className="flex items-start gap-3 p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                                <CheckCircle className="w-4 h-4 text-rose-400 mt-0.5" />
                                <div>
                                    <p className="text-sm font-bold text-white">10% de descuento en negocios</p>
                                    <p className="text-[10px] text-rose-300">En todos los negocios de la comunidad</p>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={() => {
                                showToast('Próximamente disponible', 'info');
                            }}
                            className="w-full py-3 bg-rose-500 hover:bg-rose-400 text-white font-black text-sm rounded-xl transition-colors mt-6"
                        >
                            Obtener Pulse Pass
                        </button>
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


