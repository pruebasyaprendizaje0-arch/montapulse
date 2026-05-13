import React, { useState, useEffect, useMemo } from 'react';
import { X, MapPin, MessageCircle, Star, Zap, UserPlus, UserCheck, Send, Mail, Store, User, Building2, ChevronRight, Clock, Circle, Ticket } from 'lucide-react';
import { Business, UserProfile, MontanitaEvent, ProfileReview, Coupon } from '../types';
import { useData } from '../context/DataContext';
import { BASE_URL } from '../constants';
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
}

export const PublicProfileModal = React.memo<PublicProfileModalProps>(({
    isOpen,
    onClose,
    businessId,
    userId,
    dataLoading
}) => {
    const { businesses, events, allUsers, handleToggleFollow, isBusinessFollowed, setPublicProfileId, setPublicProfileType, setShowPublicProfile } = useData();
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
        }
    }, [isOpen]);

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
    const publicPulses = events.filter(e =>
        (businessId && e.businessId === businessId) ||
        (userId && e.ownerId === userId)
    ).slice(0, 3);

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
                <div className="relative h-48 bg-gradient-to-br from-indigo-600 to-purple-800 shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/80 hover:text-white transition-all z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Floating Avatar */}
                    <div className="absolute -bottom-12 left-8 p-1.5 bg-slate-900 rounded-[2rem]">
                        <div className="w-24 h-24 rounded-[1.8rem] bg-slate-700 animate-pulse border-4 border-slate-900 shadow-xl overflow-hidden">
                            <img
                                src={avatar}
                                alt={displayName}
                                className="w-full h-full object-cover transition-opacity duration-500"
                                loading="lazy"
                                onLoad={e => (e.currentTarget.style.opacity = '1')}
                                style={{ opacity: 0 }}
                            />
                        </div>
                    </div>

                    {/* Business / User badge top right */}
                    <div className="absolute top-6 left-6 flex items-center gap-1.5 flex-wrap">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-sm">
                            {business
                                ? <Store className="w-3.5 h-3.5 text-amber-400" />
                                : <User className="w-3.5 h-3.5 text-sky-400" />
                            }
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/80">
                                {business ? 'Ubicame Socio' : 'Miembro'}
                            </span>
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

                <div className="pt-16 p-8 space-y-6">
                    {/* Name & Role */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-white">{displayName}</h2>
                            {business && <Star className="w-5 h-5 text-amber-400 fill-current" />}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest flex-wrap">
                            <MapPin className="w-3 h-3" />
                            {business?.locality || "Montañita"}
                            <span>•</span>
                            {business?.category || "Explorador"}
                            <span>•</span>
                            {business
                                ? (business.isReference || business.id?.startsWith('ref-') ? 'Punto de Referencia Verificado' : 'Ubicame Socio Verificado')
                                : 'Explorador Pulse'
                            }
                        </div>

                        {/* Email asociado */}
                        {contactEmail && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
                                    <Mail className="w-3 h-3 text-indigo-400" />
                                    <span className="text-[10px] font-black text-indigo-300 tracking-wide">{contactEmail}</span>
                                </div>
                            </div>
                        )}
                        
                        {/* Horario de atención */}
                        {business && business.openingHours && (
                            <div className="flex items-center gap-2 mt-2">
                                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${businessStatus.isOpen ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-slate-800/60 border border-white/5'}`}>
                                    <Clock className={`w-3 h-3 ${businessStatus.isOpen ? 'text-emerald-400' : 'text-slate-400'}`} />
                                    <span className={`text-[10px] font-bold tracking-wide ${businessStatus.isOpen ? 'text-emerald-300' : 'text-slate-400'}`}>
                                        {businessStatus.message || 'Horario disponible'}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Bio */}
                    <p className="text-slate-400 text-sm leading-relaxed italic">
                        "{bio}"
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/5">
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{business?.followerCount || 0}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Followers</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{business?.reviewCount || userProfile?.reviewCount || 0}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Reviews</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{business?.rating || userProfile?.rating || '0.0'}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Rating</p>
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
                                    <p className="text-[10px] text-amber-400 font-bold uppercase tracking-widest">{linkedBusiness.category}</p>
                                    {linkedBusiness.email && (
                                        <div className="flex items-center gap-1 mt-0.5">
                                            <Mail className="w-2.5 h-2.5 text-slate-500" />
                                            <span className="text-[9px] text-slate-500">{linkedBusiness.email}</span>
                                        </div>
                                    )}
                                </div>
                                <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
                            </button>
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
                    )}
                    
                    {/* Business Coupons */}
                    {coupons.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Ticket className="w-3 h-3 text-pink-400" />
                                Cupones Disponibles
                            </h3>
                            <div className="space-y-2">
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
                                Pulsos Recientes
                            </h3>
                            <div className="space-y-3">
                                {publicPulses.map(pulse => (
                                    <div key={pulse.id} className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-2xl border border-white/5">
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

                    {/* Reviews Section */}
                    {(businessId || userId) && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Star className="w-3 h-3 text-amber-400" />
                                Reseñas de la Comunidad
                            </h3>

                            {/* Review List */}
                            <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {reviews.length > 0 ? reviews.map(review => (
                                    <div key={review.id} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white">{review.userName}</span>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-2.5 h-2.5 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-slate-700'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed italic">"{review.comment}"</p>
                                    </div>
                                )) : (
                                    <p className="text-center py-4 text-xs text-slate-600 font-bold">Sé el primero en dejar una reseña</p>
                                )}
                            </div>

                            {/* Add Review Form */}
                            {currentUser && currentUser.id !== userId && (
                                <div className="p-4 bg-slate-800/30 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Tu Calificación</span>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                                                    className="p-0.5 hover:scale-110 transition-transform"
                                                >
                                                    <Star className={`w-5 h-5 ${star <= newReview.rating ? 'text-amber-400 fill-current' : 'text-slate-700'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            value={newReview.comment}
                                            onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                                            placeholder="¿Qué tal fue tu experiencia?"
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                                            rows={2}
                                        />
                                        <button
                                            onClick={handleSubmitReview}
                                            disabled={isSubmitting || !newReview.comment.trim()}
                                            className="absolute bottom-3 right-3 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 disabled:opacity-50 transition-all"
                                        >
                                            <Send className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Social/Contact */}
                    <div className="flex gap-3">
                        {businessId && (
                            <button
                                onClick={() => handleToggleFollow(businessId)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-lg ${isFollowing
                                    ? 'bg-slate-800 text-white border border-white/10'
                                    : 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-indigo-500/20'
                                    }`}
                            >
                                {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                {isFollowing ? 'Siguiendo' : 'Seguir'}
                            </button>
                        )}
                        {business?.whatsapp && (
                            <a
                                href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Contactar
                            </a>
                        )}
                        {contactEmail && (
                            <a
                                href={`mailto:${contactEmail}`}
                                className="p-4 bg-slate-800 rounded-2xl border border-white/10 text-slate-400 hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                                title={`Enviar email a ${contactEmail}`}
                            >
                                <Mail className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});
