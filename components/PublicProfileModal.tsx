import React, { useState, useEffect, useMemo } from 'react';
import { X, MapPin, MessageCircle, Star, Zap, UserPlus, UserCheck, Send, Mail, Store, User, Building2, ChevronRight, Clock, Circle, Ticket, Edit3, Trash2, Navigation2, UserCircle, Share2, Compass } from 'lucide-react';
import { Business, UserProfile, MontanitaEvent, ProfileReview, Coupon, Sector, MapEntryType } from '../types';
import { useData } from '../context/DataContext';
import { BASE_URL, SECTOR_INFO } from '../constants';
import { subscribeToProfileReviews, addProfileReview, getUser, incrementBusinessViewCount } from '../services/firestoreService';
import { subscribeToBusinessCoupons, obtainCoupon } from '../services/couponService';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getEcuadorDate, isBusinessOpen } from '../utils/timeUtils';
import { useSEO } from '../hooks/useSEO';


const DAYS_ES: Record<string, string> = {
  monday: 'Lunes',
  tuesday: 'Martes',
  wednesday: 'Miércoles',
  thursday: 'Jueves',
  friday: 'Viernes',
  saturday: 'Sábado',
  sunday: 'Domingo'
};


interface PublicProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId?: string;
    userId?: string;
    dataLoading?: boolean;
    onEditBusiness?: (business: Business) => void;
    onDeleteBusiness?: (id: string) => void;
    canEditAll?: boolean;
    onViewOnMap?: (coords: [number, number]) => void;
}

export const PublicProfileModal = React.memo(({
    isOpen,
    onClose,
    businessId,
    userId,
    dataLoading,
    onEditBusiness,
    onDeleteBusiness,
    canEditAll,
    onViewOnMap
}: PublicProfileModalProps) => {
    const { businesses, events, allUsers, handleToggleFollow, isBusinessFollowed, setPublicProfileId, setPublicProfileType, setShowPublicProfile, setSelectedEvent } = useData();
    const { user: currentUser } = useAuthContext();
    const { showToast } = useToast();
    const [reviews, setReviews] = useState<ProfileReview[]>([]);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const isMountedRef = React.useRef(false);
    const lastOpenTimeRef = React.useRef(0);
    
    React.useEffect(() => {
        if (isOpen && !isMountedRef.current) {
            isMountedRef.current = true;
            lastOpenTimeRef.current = Date.now();
            
            if (businessId) {
                incrementBusinessViewCount(businessId).catch(console.error);
            }
        } else if (!isOpen) {
            isMountedRef.current = false;
        }
    }, [isOpen, businessId]);

    const [fetchedUser, setFetchedUser] = useState<UserProfile | null>(null);
    const [isLoadingUser, setIsLoadingUser] = useState(false);
    const [coupons, setCoupons] = useState<Coupon[]>([]);

    // Find the target profile
    const business = businessId ? businesses.find(b => b.id === businessId) : null;
    const userProfile = userId ? (allUsers.find(u => u.id === userId) || fetchedUser) : fetchedUser;

    const isFollowing = businessId ? isBusinessFollowed(businessId) : false;

    // If viewing a user: find their business. If viewing a business: find the owner user.
    const linkedBusiness = userProfile
        ? (userProfile.businessId ? businesses.find(b => b.id === userProfile.businessId) : null)
        : null;

    const owner = business
        ? (allUsers.find(u => u.businessId === business.id || u.id === business.ownerId) || fetchedUser)
        : userProfile;

    const businessIdRef = React.useRef(businessId);
    const userIdRef = React.useRef(userId);
    const isOpenRef = React.useRef(isOpen);
    
    React.useEffect(() => {
        businessIdRef.current = businessId;
        userIdRef.current = userId;
        isOpenRef.current = isOpen;
    }, [businessId, userId, isOpen]);
    
    useEffect(() => {
        const targetId = userIdRef.current || business?.ownerId;
        if (!targetId || !isOpenRef.current) return;

        if (allUsers.find(u => u.id === targetId)) {
            setFetchedUser(null);
            return;
        }

        setIsLoadingUser(true);
        getUser(targetId).then(fetched => {
            if (isOpenRef.current) setFetchedUser(fetched);
        }).catch(err => console.error("Error fetching user:", err))
          .finally(() => { if (isOpenRef.current) setIsLoadingUser(false); });
    }, []);

    useEffect(() => {
        if (!(businessIdRef.current || userIdRef.current) || !isOpenRef.current) return;
        
        const effectiveBusinessId = businessIdRef.current || userProfile?.businessId;
        
        if (effectiveBusinessId) {
            const unsubCoupons = subscribeToBusinessCoupons(effectiveBusinessId, (coupons) => {
                if (isOpenRef.current) {
                    const active = coupons.filter(c => {
                        const expDate = c.expiresAt?.toDate ? c.expiresAt.toDate() : new Date(c.expiresAt);
                        expDate.setHours(23, 59, 59, 999);
                        const isExpired = expDate.getTime() < Date.now();
                        const isFull = c.maxUses > 0 && c.currentUses >= c.maxUses;
                        return !isExpired && !isFull && c.isActive;
                    });
                    setCoupons(active);
                }
            });
            
            const targetIdForReviews = userIdRef.current || business?.ownerId || businessIdRef.current;
            const unsubReviews = subscribeToProfileReviews(targetIdForReviews, setReviews);
            
            return () => {
                unsubCoupons();
                unsubReviews();
            };
        }
    }, []);

    const handleSubmitReview = async () => {
        const targetId = businessId || userId;
        if (!currentUser || !targetId) return;
        if (!newReview.comment.trim()) return;

        setIsSubmitting(true);
        try {
            await addProfileReview({
                targetId,
                targetType: businessId ? 'business' : 'user',
                userId: currentUser.id,
                userName: `${currentUser.name} ${currentUser.surname}`,
                userAvatar: currentUser.avatarUrl,
                rating: newReview.rating,
                comment: newReview.comment
            });
            setNewReview({ rating: 5, comment: '' });
        } catch (error) {
            console.error("Error submitting review:", error);
            showToast("No se pudo enviar la reseña.", "error");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleShareWhatsApp = () => {
        if (!business) return;
        const shareUrl = `${window.location.origin}/negocio/${business.slug || business.id}`;
        const shareText = `${shareUrl}\n\nMira el perfil de ${business.name} en MontaPulse: ubicación, servicios y promociones.`;
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`, '_blank');
    };

    const handleObtainCoupon = async (coupon: Coupon) => {
        if (!currentUser) {
            showToast("Debes iniciar sesión para reservar cupones", "error");
            return;
        }

        const confirmRes = window.confirm(`¿Deseas reservar el cupón "${coupon.code}"? Tendrás 24 horas para canjearlo.`);
        if (!confirmRes) return;

        try {
            const result = await obtainCoupon(
                coupon.id, 
                coupon.code, 
                currentUser.id, 
                currentUser.name || 'Usuario',
                businessId
            );
            if (result.success) {
                showToast("¡Cupón reservado con éxito! Revisa tu billetera.", "success");
            } else {
                showToast(result.error || "No se pudo reservar el cupón.", "error");
            }
        } catch (error) {
            console.error("Error obtaining coupon:", error);
            showToast("Error al procesar la reserva.", "error");
        }
    };

    const openLinkedBusiness = (biz: Business) => {
        setPublicProfileId(biz.id);
        setPublicProfileType('business');
        setShowPublicProfile(true);
    };

    const openLinkedUser = (uid: string) => {
        setPublicProfileId(uid);
        setPublicProfileType('user');
        setShowPublicProfile(true);
    };


    // ── ALL HOOKS MUST BE ABOVE ANY EARLY RETURNS ──────────────────────────────
    const displayName = business?.name || `${owner?.name || ''} ${owner?.surname || ''}`.trim() || 'Cargando...';
    const avatar = business?.imageUrl || owner?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(displayName || 'U')}&background=4f46e5&color=fff`;
    const bio = business?.description || 'Miembro activo de la comunidad. ¡Nos vemos en el próximo pulso!';
    const contactEmail = business?.email || owner?.email || null;

    const businessStatus = useMemo(() => isBusinessOpen(business?.openingHours), [business?.openingHours]);

    useSEO({
      title: displayName,
      description: bio,
      image: avatar,
      url: BASE_URL + window.location.pathname
    });
    // ─────────────────────────────────────────────────────────────────────────────

    // Early returns AFTER all hooks
    if (!isOpen) return null;

    const isDataLoading = isLoadingUser || (!business && !owner) || dataLoading;

    if (isDataLoading) {
        return (
            <div className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300">
                <div className="relative w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300">
                    {/* Close button */}
                    <div className="absolute top-6 right-6 z-10">
                        <button onClick={onClose} className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/80 hover:text-white transition-all">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    {/* Skeleton Header */}
                    <div className="relative h-48 bg-slate-800/50 animate-pulse">
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                    </div>
                    <div className="px-8 pb-10 -mt-12 space-y-6">
                        {/* Avatar skeleton */}
                        <div className="flex items-end gap-6">
                            <div className="w-24 h-24 rounded-[1.8rem] bg-slate-700/80 border-4 border-slate-900 animate-pulse shrink-0" />
                            <div className="pb-2 flex-1 space-y-3">
                                <div className="h-6 w-48 bg-slate-700/80 rounded-xl animate-pulse" />
                                <div className="h-4 w-32 bg-slate-800/80 rounded-lg animate-pulse" />
                            </div>
                        </div>
                        {/* Stats skeleton */}
                        <div className="grid grid-cols-3 gap-4">
                            {[1,2,3].map(i => (
                                <div key={i} className="bg-slate-800/50 rounded-2xl p-4 space-y-2 animate-pulse">
                                    <div className="h-6 w-12 bg-slate-700/80 rounded mx-auto" />
                                    <div className="h-3 w-16 bg-slate-700/60 rounded mx-auto" />
                                </div>
                            ))}
                        </div>
                        {/* Content skeleton */}
                        <div className="space-y-3">
                            <div className="h-4 w-full bg-slate-800/60 rounded-lg animate-pulse" />
                            <div className="h-4 w-5/6 bg-slate-800/60 rounded-lg animate-pulse" />
                            <div className="h-4 w-4/6 bg-slate-800/60 rounded-lg animate-pulse" />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Filter public pulses for this business/user
    const now = new Date();
    const allBusinessPulses = events.filter(e =>
        (businessId && e.businessId === businessId) ||
        (userId && e.ownerId === userId)
    );
    
    const activePulses = allBusinessPulses.filter(e => new Date(e.startAt) > now);
    const publicPulses = activePulses.length > 0 
        ? activePulses.slice(0, 4)
        : allBusinessPulses.slice(0, 4);
    
    const isShowingActive = activePulses.length > 0;
    
    const totalEventClicks = allBusinessPulses.reduce((sum, e) => sum + (e.clickCount || 0), 0);

    return (
        <div
            className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300 max-h-[90vh] overflow-y-auto no-scrollbar"
                onClick={e => e.stopPropagation()}
            >
                {/* Profile Header */}
                <div className="relative h-56 shrink-0">
                    {/* Background Image/Gradient */}
                    <div className="absolute inset-0 bg-slate-800">
                        {business?.imageUrl ? (
                            <img 
                                src={business.imageUrl} 
                                className="w-full h-full object-cover opacity-40 blur-[1px]" 
                                alt="" 
                            />
                        ) : (
                            <div className="w-full h-full bg-gradient-to-br from-indigo-600 to-purple-800" />
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/40 to-transparent" />
                    </div>

                    <div className="absolute top-6 right-6 flex items-center gap-2 z-10">
                        {canEditAll && business && (
                            <>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEditBusiness?.(business);
                                    }}
                                    className="p-2.5 bg-sky-500/80 hover:bg-sky-500 rounded-full text-white transition-all shadow-lg shadow-sky-500/20 backdrop-blur-md"
                                    title="Editar Negocio"
                                >
                                    <Edit3 className="w-5 h-5" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (window.confirm('¿Estás seguro de eliminar este negocio?')) {
                                            onDeleteBusiness?.(business.id);
                                            onClose();
                                        }
                                    }}
                                    className="p-2.5 bg-rose-500/80 hover:bg-rose-500 rounded-full text-white transition-all shadow-lg shadow-rose-500/20 backdrop-blur-md"
                                    title="Eliminar Negocio"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-black/40 hover:bg-black/60 rounded-full text-white/90 hover:text-white transition-all backdrop-blur-md"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Main Image - Even more centered and prominent */}
                    <div className="absolute -bottom-16 left-1/2 -translate-x-1/2 p-2.5 bg-[#0f172a] rounded-[3rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] z-20 transition-transform hover:scale-105 duration-500">
                        <div className="w-36 h-36 rounded-[2.6rem] bg-slate-800 border-4 border-slate-900/50 overflow-hidden relative group ring-4 ring-white/5">
                            <img
                                src={avatar}
                                alt={displayName}
                                className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110"
                                loading="lazy"
                                onLoad={e => (e.currentTarget.style.opacity = '1')}
                                style={{ opacity: 0 }}
                            />
                            {!business && !userProfile?.avatarUrl && (
                                <div className="absolute inset-0 flex items-center justify-center bg-slate-800 text-slate-400">
                                    <UserCircle className="w-20 h-20" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Business / User badge top left */}
                    <div className="absolute top-6 left-6 flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm">
                            {business
                                ? (business.mapType === MapEntryType.SECTOR ? (
                                    <>
                                        <Compass className="w-3.5 h-3.5 text-emerald-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Sector</span>
                                    </>
                                  ) : (business.mapType === MapEntryType.LANDMARK || business.isReference || business.id?.startsWith('ref-')) ? (
                                    <>
                                        <MapPin className="w-3.5 h-3.5 text-sky-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Referencia</span>
                                    </>
                                  ) : (
                                    <>
                                        <Store className="w-3.5 h-3.5 text-amber-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Ubicame Socio</span>
                                    </>
                                  ))
                                : (
                                    <>
                                        <User className="w-3.5 h-3.5 text-sky-400" />
                                        <span className="text-[9px] font-black uppercase tracking-widest text-white/80">Miembro</span>
                                    </>
                                )
                            }
                        </div>
                        {business && (
                            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full backdrop-blur-sm ${businessStatus.isOpen ? 'bg-emerald-500/30 border border-emerald-500/40' : 'bg-red-500/30 border border-red-500/40'}`}>
                                <Circle className={`w-2 h-2 ${businessStatus.isOpen ? 'fill-emerald-400 text-emerald-400' : 'fill-red-400 text-red-400'}`} />
                                <span className={`text-[9px] font-black uppercase tracking-widest ${businessStatus.isOpen ? 'text-emerald-300' : 'text-red-300'}`}>
                                    {businessStatus.isOpen ? 'Abierto' : 'Cerrado'}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="pt-24 p-8 space-y-8 flex flex-col items-center text-center">
                    {/* Name & Role */}
                    <div className="space-y-4 w-full flex flex-col items-center">
                        <div className="space-y-2">
                            <h2 className="text-3xl font-black text-white flex items-center justify-center gap-3">
                                {displayName}
                                {business && <Star className="w-6 h-6 text-amber-400 fill-current animate-pulse" />}
                            </h2>
                        </div>
                        
                        <div className="flex items-center justify-center gap-3 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] flex-wrap max-w-md">
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                                <MapPin className="w-3 h-3 text-sky-400" />
                                {business?.locality || "Montañita"}
                            </div>
                            {business?.sector && (
                                <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                                    <span className="text-[11px] leading-none">{SECTOR_INFO[business.sector as Sector]?.symbol || '🧭'}</span>
                                    <span>{business.sector}</span>
                                </div>
                            )}
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                                <Store className="w-3 h-3 text-amber-400" />
                                {business?.category || "Explorador"}
                            </div>
                            <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 hover:bg-white/10 transition-colors">
                                {business
                                    ? (business.mapType === MapEntryType.BUSINESS
                                        ? 'Socio Verificado'
                                        : (business.mapType === MapEntryType.LANDMARK || business.mapType === MapEntryType.SECTOR || business.isReference || business.id?.startsWith('ref-')
                                            ? 'Punto de Referencia Verificado'
                                            : 'Socio Verificado'
                                          )
                                      )
                                    : 'Explorador Pulse'
                                }
                            </div>
                            {coupons.length > 0 && (
                                <div className="flex items-center gap-1.5 bg-pink-500/10 text-pink-400 px-3 py-1.5 rounded-full border border-pink-500/20 hover:bg-pink-500/20 transition-colors animate-pulse">
                                    <Ticket className="w-3 h-3" />
                                    <span>Hay Cupones</span>
                                </div>
                            )}
                        </div>

                        {/* Centered Actions & Info Group */}
                        <div className="flex flex-col items-center gap-4 w-full max-w-sm pt-4">
                            {/* Ver en el mapa button - Primary full-width action */}
                            {business && business.coordinates && (
                                <button
                                    onClick={() => {
                                        if (onViewOnMap) {
                                            onViewOnMap(business.coordinates);
                                        } else {
                                            window.open(`https://www.google.com/maps?q=${business.coordinates[0]},${business.coordinates[1]}`, '_blank');
                                        }
                                    }}
                                    className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-sky-500 to-indigo-600 rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-sky-500/20 group border border-white/10"
                                >
                                    <Navigation2 className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                                    <span className="text-xs font-black text-white uppercase tracking-[0.2em]">Ver en el Mapa</span>
                                </button>
                            )}

                            {/* Compartir por WhatsApp button */}
                            {business && (
                                <div className="w-full">
                                    <button
                                        onClick={handleShareWhatsApp}
                                        className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-emerald-500/20 group border border-white/10"
                                    >
                                        <Share2 className="w-4 h-4 text-white group-hover:scale-110 transition-transform" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-[0.1em]">Compartir Negocio</span>
                                    </button>
                                </div>
                            )}

                            {/* Primary Actions Row */}
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => businessId && handleToggleFollow(businessId)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                        isFollowing 
                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' 
                                        : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                    {isFollowing ? 'Siguiendo' : 'Seguir'}
                                </button>

                                {business?.whatsapp && (
                                    <a
                                        href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500/10 text-emerald-400 rounded-2xl border border-emerald-500/20 font-black text-[10px] uppercase tracking-widest hover:bg-emerald-500/20 transition-all shadow-lg shadow-emerald-500/5"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        WhatsApp
                                    </a>
                                )}
                            </div>

                            {/* Secondary Actions / Info */}
                            <div className="w-full flex flex-col gap-2">
                                {contactEmail && (
                                    <div className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
                                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="text-[10px] font-black text-slate-400 tracking-widest uppercase truncate">{contactEmail}</span>
                                    </div>
                                )}
                                {business?.address && (
                                    <div className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-white/5 border border-white/10 rounded-2xl">
                                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                        <span className="text-[10px] font-black text-slate-300 tracking-wider uppercase truncate">{business.address}</span>
                                    </div>
                                )}
                            </div>
                            
                            {/* Horario de atención */}
                            {business && business.openingHours && (
                                <div className={`w-full flex items-center justify-center gap-2 px-6 py-3 rounded-2xl transition-all ${businessStatus.isOpen ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800/60 border border-white/5'}`}>
                                    <Clock className={`w-3.5 h-3.5 shrink-0 ${businessStatus.isOpen ? 'text-emerald-400' : 'text-slate-400'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-widest ${businessStatus.isOpen ? 'text-emerald-300' : 'text-slate-400'}`}>
                                        {businessStatus.message || 'Horario disponible'}
                                    </span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bio */}
                    <div className="relative w-full max-w-sm">
                        <div className="absolute -top-4 -left-4 text-4xl text-white/5 font-serif">"</div>
                        <p className="text-slate-300 text-sm leading-relaxed italic relative z-10 px-4">
                            {bio}
                        </p>
                        <div className="absolute -bottom-4 -right-4 text-4xl text-white/5 font-serif">"</div>
                    </div>

                    {/* Products and Services Section */}
                    <div className="w-full space-y-8">
                        {/* Emblematic Services */}
                        {business && business.emblematicServices && business.emblematicServices.length > 0 && (
                            <div className="space-y-4 w-full bg-gradient-to-br from-amber-500/5 to-orange-500/5 p-6 rounded-[2.5rem] border border-amber-500/10">
                                <h3 className="text-[10px] font-black text-amber-500/80 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                                    <Star className="w-3.5 h-3.5 fill-amber-500" />
                                    Productos o Servicios Emblemáticos
                                </h3>
                                <div className="flex flex-wrap justify-center gap-3">
                                    {business.emblematicServices.map((service, idx) => (
                                        <div 
                                            key={idx}
                                            className="px-5 py-2.5 bg-slate-900/60 border border-white/5 rounded-2xl flex items-center gap-3 shadow-xl group hover:border-amber-500/30 transition-all"
                                        >
                                            <div className="w-6 h-6 rounded-lg bg-amber-500/10 flex items-center justify-center group-hover:bg-amber-500/20 transition-colors">
                                                <Zap className="w-3 h-3 text-amber-500" />
                                            </div>
                                            <span className="text-[11px] font-black text-slate-200 uppercase tracking-wider">{service}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* General Services */}
                        {business && business.services && business.services.length > 0 && (
                            <div className="space-y-4 w-full bg-white/5 p-6 rounded-[2.5rem] border border-white/5">
                                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center justify-center gap-2">
                                    <Store className="w-3.5 h-3.5" />
                                    Servicios Principales
                                </h3>
                                <div className="flex flex-wrap justify-center gap-2">
                                    {business.services.map((service, idx) => (
                                        <div 
                                            key={idx}
                                            className="px-4 py-2 bg-slate-800/40 border border-white/5 rounded-xl flex items-center gap-2"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-sky-400/50" />
                                            <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">{service}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Stats - Centered Grid */}
                    <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/5 w-full">
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{business?.viewCount || 0}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Visitas</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{business?.followerCount || 0}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Seguidores</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{totalEventClicks}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Clicks Eventos</p>
                        </div>
                    </div>

                    {/* ────────────────────────────────────────────────────
                        LINKED BUSINESS CARD: shown when viewing a MEMBER
                    ──────────────────────────────────────────────────── */}
                    {linkedBusiness && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Building2 className="w-3 h-3 text-amber-400" />
                                Su Negocio
                            </h3>
                            <div className="flex flex-col items-center w-full">
                                <button
                                    onClick={() => openLinkedBusiness(linkedBusiness)}
                                    className="w-full flex items-center gap-4 p-4 bg-slate-800/60 rounded-2xl border border-white/5 hover:border-amber-500/30 transition-all group"
                                >
                                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                    <img
                                        src={linkedBusiness.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(linkedBusiness.name)}&background=f59e0b&color=fff`}
                                        alt={linkedBusiness.name}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-black text-white truncate">{linkedBusiness.name}</p>
                                    <div className="flex items-center gap-1.5 text-[10px] text-amber-400 font-bold uppercase tracking-widest flex-wrap">
                                        <span>{linkedBusiness.category}</span>
                                        {linkedBusiness.sector && (
                                            <>
                                                <span className="text-slate-600">·</span>
                                                <span className="text-slate-400 flex items-center gap-1">
                                                    <span>{SECTOR_INFO[linkedBusiness.sector as Sector]?.symbol || '🧭'}</span>
                                                    <span>{linkedBusiness.sector}</span>
                                                </span>
                                            </>
                                        )}
                                    </div>
                                    {linkedBusiness.email && (
                                        <div className="flex items-center gap-1 mt-1">
                                            <Mail className="w-2.5 h-2.5 text-slate-500" />
                                            <span className="text-[9px] text-slate-500">{linkedBusiness.email}</span>
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* ────────────────────────────────────────────────────
                        OWNER MEMBER CARD: shown when viewing a BUSINESS
                    ──────────────────────────────────────────────────── */}
                    {business && owner && (
                        <div className="space-y-2">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <User className="w-3 h-3 text-sky-400" />
                                Perfil del Propietario
                            </h3>
                            <div className="flex flex-col items-center w-full">
                                <button
                                    onClick={() => openLinkedUser(owner.id)}
                                    className="w-full flex items-center gap-4 p-4 bg-slate-800/60 rounded-2xl border border-white/5 hover:border-sky-500/30 transition-all group"
                                >
                                <div className="w-12 h-12 rounded-full overflow-hidden shrink-0 border-2 border-white/10">
                                    <img
                                        src={owner.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${owner.name} ${owner.surname}`)}&background=0ea5e9&color=fff`}
                                        alt={`${owner.name} ${owner.surname}`}
                                        className="w-full h-full object-cover"
                                    />
                                </div>
                                <div className="flex-1 text-left min-w-0">
                                    <p className="text-sm font-black text-white truncate">{owner.name} {owner.surname}</p>
                                    <p className="text-[10px] text-sky-400 font-bold uppercase tracking-widest">Miembro Verificado</p>
                                    {owner.email && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Mail className="w-2.5 h-2.5 text-slate-500" />
                                            <span className="text-[9px] text-slate-500">{owner.email}</span>
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 transition-colors shrink-0" />
                                </button>
                            </div>
                        </div>
                    )}
                    
                    {/* Business Coupons */}
                    {coupons.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Ticket className="w-3 h-3 text-pink-400" />
                                Cupones Disponibles
                            </h3>
                            <div className="space-y-2 w-full">
                                {coupons.map(coupon => (
                                    <button 
                                        key={coupon.id}
                                        onClick={() => handleObtainCoupon(coupon)}
                                        className="w-full p-3 bg-pink-500/10 border border-pink-500/20 rounded-2xl flex items-center gap-3 relative overflow-hidden group hover:border-pink-500/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-pink-500/20 flex items-center justify-center shrink-0">
                                            <Ticket className="w-5 h-5 text-pink-400" />
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="text-sm font-black text-white">{coupon.value}{coupon.type === 'percentage' ? '%' : '$'} OFF</span>
                                                <span className="text-[10px] font-black bg-pink-500 text-white px-1.5 py-0.5 rounded uppercase tracking-tighter">
                                                    {coupon.code}
                                                </span>
                                            </div>
                                            <p className="text-[10px] text-pink-400 font-bold truncate">
                                                Válido hasta: {coupon.expiresAt ? (coupon.expiresAt.toDate ? coupon.expiresAt.toDate().toLocaleDateString() : new Date(coupon.expiresAt).toLocaleDateString()) : 'Sin límite'}
                                            </p>
                                        </div>
                                        <div className="text-[8px] font-black text-pink-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                                            Reservar →
                                        </div>
                                        <div className="absolute -right-4 -bottom-4 w-16 h-16 bg-pink-500/5 rounded-full blur-2xl group-hover:bg-pink-500/10 transition-all" />
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Public Activities / Pulses */}
                    {publicPulses.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-3 h-3 text-sky-400" />
                                {isShowingActive ? 'Próximos Eventos' : 'Pulsos Recientes'}
                            </h3>
                            <div className="space-y-3 w-full">
                                {publicPulses.map(pulse => (
                                    <div 
                                        key={pulse.id} 
                                        className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-2xl border border-white/5 cursor-pointer hover:bg-slate-800 transition-colors"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setSelectedEvent(pulse);
                                            onClose();
                                        }}
                                    >
                                        <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden shrink-0">
                                            <img
                                                src={pulse.imageUrl}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{pulse.title}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(pulse.startAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    
                </div>
            </div>
        </div>
    );
});
