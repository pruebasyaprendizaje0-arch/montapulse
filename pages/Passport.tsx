import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
    ChevronLeft, Edit3, LogOut, CheckCircle, MapPin, Store, Palmtree, Mountain,
    Zap, Star, Sparkles, MessageCircle, Navigation, CreditCard, Banknote, Mail,
    BarChart2, Eye, Users, TrendingUp, Award, Phone, User, X, Camera, ImageIcon, Upload, ShieldCheck, Plus, Activity
} from 'lucide-react';
import { UserProfile, Business, MontanitaEvent, Vibe, SubscriptionPlan, Sector, BusinessCategory } from '../types.ts';
import { Calendar, Clock } from 'lucide-react';
import { EventCard } from '../components/EventCard.tsx';
import { createUser, updateUser, getAppSettings, updateAppSettings } from '../services/firestoreService.ts';
import { logout, updateUserProfile as updateAuthProfile } from '../services/authService.ts';
import { LOCALITY_SECTORS, MAP_ICONS, LOCALITIES } from '../constants.ts';
import { compressImage } from '../utils/imageUtils';

import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { useToast } from '../context/ToastContext';

interface PassportProps {
    onNavigate?: (view: any) => void;
}

export const Passport: React.FC<PassportProps> = ({ onNavigate }) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { user, setUser, authUser, logout, isAdmin, loading: authLoading } = useAuthContext();
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
        businessFollowers,
        allUsers
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
    const [showPulsePass, setShowPulsePass] = useState(false);
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
        return { eventsCount, friendsCount, impactCount };
    }, [favoritedEvents, followedBusinessIds, businessEvents]);

    const eventLimit = userBusiness?.plan === SubscriptionPlan.PREMIUM ? 7 : userBusiness?.plan === SubscriptionPlan.BASIC ? 3 : 0;
    const eventsUsed = businessEvents.length;
    const eventsRemaining = eventLimit === Infinity ? null : eventLimit - eventsUsed;

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
        if (!editingUser || !user) return;
        setIsSavingProfile(true);
        try {
            // 1. Update Firestore document (Primary)
            await updateUser(editingUser.id, editingUser);

            // 2. Update Firebase Auth profile if possible (Optional but good for consistency)
            if (authUser) {
                await updateAuthProfile(
                    authUser,
                    `${editingUser.name} ${editingUser.surname}`.trim(),
                    editingUser.avatarUrl
                );
            }

            // 3. Update local state
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
                            { label: 'Events', value: userStats.eventsCount.toString(), icon: MapPin },
                            { label: 'Following', value: userStats.friendsCount.toString(), icon: Users },
                            { label: 'Impact', value: userStats.impactCount.toString(), icon: Zap }
                        ].map((stat, i) => (
                            <div key={i} className="flex flex-col items-center gap-1">
                                <span className="text-xl font-black text-white">{stat.value}</span>
                                <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Pulse Window Quick Access */}
                <div className="px-8 mb-8">
                    <button
                        onClick={() => setShowPulseModal(true)}
                        className="w-full relative overflow-hidden rounded-[2.5rem] bg-gradient-to-r from-violet-500/20 to-indigo-500/20 border border-violet-500/30 p-6 flex items-center justify-between group hover:border-violet-500/50 transition-all"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="flex items-center gap-4 relative z-10">
                            <div className="w-14 h-14 rounded-2xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                                <Activity className="w-7 h-7 text-violet-400" />
                            </div>
                            <div className="text-left">
                                <h3 className="text-lg font-black text-white tracking-tight">Ventana de Pulse</h3>
                                <p className="text-xs font-medium text-violet-400">Actividad en tiempo real</p>
                            </div>
                        </div>
                        <div className="w-10 h-10 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center group-hover:bg-violet-500 group-hover:scale-110 transition-all">
                            <Sparkles className="w-5 h-5 text-violet-400 group-hover:text-white transition-colors" />
                        </div>
                    </button>
                </div>

                {/* My Upcoming Pulses */}
                <div className="mb-12">
                    <div className="px-8 flex items-center justify-between mb-6">
                        <h3 className="text-lg font-black tracking-tight">My Upcoming Pulses</h3>
                        {favoritedEvents.length > 3 && (
                            <button 
                                onClick={() => setShowAllPulses(!showAllPulses)}
                                className="text-[11px] font-black text-orange-500 uppercase tracking-widest"
                            >
                                {showAllPulses ? 'Show Less' : 'View All'}
                            </button>
                        )}
                    </div>
                    <div className="flex gap-4 overflow-x-auto no-scrollbar px-8 pb-4">
                        {favoritedEvents.slice(0, showAllPulses ? favoritedEvents.length : 3).map((event) => (
                            <div key={event.id} className="min-w-[280px] w-[280px] shrink-0">
                                <EventCard 
                                    event={event} 
                                    onClick={(e) => setSelectedEvent(e)}
                                />
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

                {/* Following Section */}
                {followedBusinessIds.length > 0 && (
                    <div className="mb-12">
                        <div className="px-8 flex items-center justify-between mb-6">
                            <h3 className="text-lg font-black tracking-tight">Siguiendo</h3>
                        </div>
                        <div className="flex gap-4 overflow-x-auto no-scrollbar px-8 pb-4">
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
                                        className="min-w-[140px] w-[140px] shrink-0 cursor-pointer"
                                    >
                                        <div className="relative">
                                            <div className="w-24 h-24 mx-auto rounded-full overflow-hidden border-4 border-orange-500/30 shadow-lg">
                                                <img src={biz.imageUrl} alt={biz.name} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-orange-500 rounded-full flex items-center justify-center border-2 border-black">
                                                <MapPin className="w-3 h-3 text-white" />
                                            </div>
                                        </div>
                                        <p className="text-center mt-3 text-xs font-black text-white truncate px-2">{biz.name}</p>
                                        <p className="text-center text-[9px] text-slate-500">{biz.category}</p>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Mi Negocio Section */}
                <div className="px-8 mb-12">
                    <h3 className="text-lg font-black tracking-tight mb-6">Mi Negocio</h3>
                    
                    {user?.businessId ? (
                        businesses.find(b => b.id === user.businessId) ? (
                            <div
                                onClick={() => {
                                    setShowBusinessEdit(true);
                                    setEditingBusinessId(user.businessId);
                                }}
                                className="w-full relative overflow-hidden rounded-[2.5rem] bg-[#111111] border border-white/5 cursor-pointer group shadow-2xl"
                            >
                                <div className="absolute inset-0">
                                    <img 
                                        src={businesses.find(b => b.id === user.businessId)?.imageUrl} 
                                        alt="Business" 
                                        className="w-full h-full object-cover opacity-30 group-hover:scale-105 transition-transform duration-700" 
                                    />
                                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/80 to-black/20" />
                                </div>
                                <div className="relative p-6 flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-16 h-16 rounded-2xl bg-black/50 backdrop-blur-md p-1 border border-white/10 shadow-2xl overflow-hidden shrink-0">
                                            {businesses.find(b => b.id === user.businessId)?.icon ? (
                                                <img 
                                                    src={businesses.find(b => b.id === user.businessId)?.icon} 
                                                    alt="Icon" 
                                                    className="w-full h-full object-cover rounded-xl" 
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center bg-orange-500/20 rounded-xl">
                                                    <Store className="w-8 h-8 text-orange-500" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex flex-col text-left">
                                            <span className="text-white font-black text-xl leading-none mb-1">{businesses.find(b => b.id === user.businessId)?.name}</span>
                                            <span className="text-sm font-medium text-slate-400">{businesses.find(b => b.id === user.businessId)?.category} · {businesses.find(b => b.id === user.businessId)?.sector}</span>
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
                        ) : null
                    ) : (
                        <button
                            onClick={() => setShowBusinessReg(true)}
                            className="w-full p-8 bg-[#111111] rounded-[2.5rem] border border-dashed border-white/10 hover:bg-white/5 hover:border-white/20 transition-all flex flex-col items-center justify-center gap-3 active:scale-95"
                        >
                            <div className="p-4 bg-white/5 rounded-2xl">
                                <Plus className="w-8 h-8 text-slate-400" />
                            </div>
                            <span className="font-black text-slate-300">Añadir tu Negocio</span>
                        </button>
                    )}
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
                                                <span className="text-[9px] font-black text-slate-400 text-center truncate w-full group-hover:text-amber-400 transition-colors">
                                                    {followedBiz.name.split(' ')[0]}
                                                </span>
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
                            {eventLimit === Infinity ? (
                                <div className="px-4 py-2 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center gap-2">
                                    <Zap className="w-4 h-4 text-emerald-400" />
                                    <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Ilimitados</span>
                                </div>
                            ) : (
                                <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 ${eventsRemaining <= 2 ? 'bg-red-500/20 border border-red-500/30' : 'bg-orange-500/20 border border-orange-500/30'}`}>
                                    <Calendar className={`w-4 h-4 ${eventsRemaining <= 2 ? 'text-red-400' : 'text-orange-400'}`} />
                                    <span className={`text-xs font-black uppercase tracking-widest ${eventsRemaining <= 2 ? 'text-red-400' : 'text-orange-400'}`}>
                                        {eventsUsed}/{eventLimit} {eventsRemaining === 1 ? 'restante' : 'restantes'}
                                    </span>
                                </div>
                            )}
                        </div>
                        
                        {businessEvents.length > 0 ? (
                            <>
                                <div className="flex justify-end mb-4">
                                    <button
                                        onClick={() => handleOpenNewEventWizard()}
                                        disabled={eventsRemaining !== null && eventsRemaining <= 0}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl font-black text-xs uppercase tracking-widest transition-all ${eventsRemaining !== null && eventsRemaining <= 0 ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-orange-600 shadow-lg shadow-orange-500/20'}`}
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



                {/* Options List */}
                <div className="px-8 space-y-3 mb-12">
                    {[
                        { label: 'Edit Profile', icon: User, color: 'text-blue-400', action: onEditProfile },
                        { label: 'Pulse Pass', icon: Zap, color: 'text-rose-400', action: () => setShowPulsePass(true) },
                        { label: 'Preferences', icon: Sparkles, color: 'text-purple-400', action: () => setShowPreferences(true) },
                        { label: 'Security', icon: ShieldCheck, color: 'text-emerald-400', action: () => setShowSecurity(true) },
                        { label: 'Help & Support', icon: MessageCircle, color: 'text-orange-400', action: () => setShowHelp(true) }
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
                                onClick={() => navigate('/admin-users')}
                                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white font-black py-4 rounded-2xl hover:from-sky-600 hover:to-blue-700 transition-all shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 uppercase tracking-widest text-xs"
                            >
                                <Users className="w-5 h-5" />
                                <span>Administrar Usuarios</span>
                            </button>

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
                                <span>Modo SuperUsuario</span>
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
                            <button onClick={() => setShowHelp(false)} className="p-2 rounded-xl bg-white/5 hover:bg-white/10">
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                        <div className="space-y-3">
                            <a href="mailto:contacto@montapulse.com" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                <span className="text-sm font-bold text-white">Enviar Email</span>
                                <Mail className="w-5 h-5 text-slate-500" />
                            </a>
                            <a href="https://wa.me/593999999999" target="_blank" rel="noopener noreferrer" className="flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                <span className="text-sm font-bold text-white">WhatsApp</span>
                                <MessageCircle className="w-5 h-5 text-slate-500" />
                            </a>
                            <button onClick={() => showToast('FAQ disponible pronto', 'info')} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                <span className="text-sm font-bold text-white">Preguntas Frecuentes</span>
                                <ChevronLeft className="w-5 h-5 text-slate-500 rotate-180" />
                            </button>
                            <button onClick={() => showToast('Términos y condiciones disponible pronto', 'info')} className="w-full flex items-center justify-between p-4 bg-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                <span className="text-sm font-bold text-white">Términos y Condiciones</span>
                                <ChevronLeft className="w-5 h-5 text-slate-500 rotate-180" />
                            </button>
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
