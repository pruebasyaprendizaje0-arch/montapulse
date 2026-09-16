import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  X, MapPin, MessageCircle, Star, Zap, UserPlus, UserCheck, Send, Mail, Store, 
  User, Building2, ChevronLeft, ChevronRight, Clock, Circle, Ticket, Edit3, 
  Trash2, Navigation2, UserCircle, Share2, Compass, QrCode, ExternalLink, 
  CalendarCheck, Wifi, CreditCard, Dog, Car, Sparkles, Instagram, Facebook, 
  Youtube, Phone, CheckCircle2, Award, Heart, MessageSquare, Menu as MenuIcon
} from 'lucide-react';
import { Business, UserProfile, MontanitaEvent, ProfileReview, Coupon, Sector, MapEntryType } from '../types';
import { useData } from '../context/DataContext';
import { BASE_URL, SECTOR_INFO, LANDMARKS } from '../constants';
import { subscribeToProfileReviews, addProfileReview, getUser, incrementBusinessViewCount } from '../services/firestoreService';
import { subscribeToBusinessCoupons, obtainCoupon } from '../services/couponService';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { isBusinessOpen } from '../utils/timeUtils';
import { useSEO } from '../hooks/useSEO';
import { TikTokIcon, getInstagramUrl, getFacebookUrl, getTikTokUrl, getYouTubeUrl, getWhatsAppUrl } from '../utils/social';

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
  const { 
    businesses, 
    events, 
    allUsers, 
    handleToggleFollow, 
    isBusinessFollowed, 
    setPublicProfileId, 
    setPublicProfileType, 
    setShowPublicProfile, 
    setSelectedEvent 
  } = useData();
  
  const { user: currentUser } = useAuthContext();
  const { showToast } = useToast();
  
  const [reviews, setReviews] = useState<ProfileReview[]>([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAvatarLoaded, setIsAvatarLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'services' | 'amenities' | 'pulses' | 'reviews'>('all');
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  
  const avatarRef = useRef<HTMLImageElement>(null);
  const isMountedRef = useRef(false);
  const lastOpenTimeRef = useRef(0);

  // Track page view
  useEffect(() => {
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

  // Linked business or owner
  const linkedBusiness = userProfile
    ? (userProfile.businessId ? businesses.find(b => b.id === userProfile.businessId) : null)
    : null;

  const owner = business
    ? (allUsers.find(u => u.businessId === business.id || u.id === business.ownerId) || fetchedUser)
    : userProfile;

  const businessIdRef = useRef(businessId);
  const userIdRef = useRef(userId);
  const isOpenRef = useRef(isOpen);
  
  useEffect(() => {
    businessIdRef.current = businessId;
    userIdRef.current = userId;
    isOpenRef.current = isOpen;
  }, [businessId, userId, isOpen]);
  
  // Fetch user if not locally loaded
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
  }, [business?.ownerId, allUsers]);

  // Subscribe to coupons & reviews
  useEffect(() => {
    if (!(businessIdRef.current || userIdRef.current) || !isOpenRef.current) return;
    
    const effectiveBusinessId = businessIdRef.current || userProfile?.businessId;
    
    let unsubCoupons = () => {};
    if (effectiveBusinessId) {
      unsubCoupons = subscribeToBusinessCoupons(effectiveBusinessId, (allCoupons) => {
        if (isOpenRef.current) {
          const active = allCoupons.filter(c => {
            const expDate = c.expiresAt?.toDate ? c.expiresAt.toDate() : new Date(c.expiresAt);
            expDate.setHours(23, 59, 59, 999);
            const isExpired = expDate.getTime() < Date.now();
            const isFull = c.maxUses > 0 && c.currentUses >= c.maxUses;
            return !isExpired && !isFull && c.isActive;
          });
          setCoupons(active);
        }
      });
    }
    
    const targetIdForReviews = userIdRef.current || business?.ownerId || businessIdRef.current;
    const unsubReviews = targetIdForReviews ? subscribeToProfileReviews(targetIdForReviews, setReviews) : () => {};
    
    return () => {
      unsubCoupons();
      unsubReviews();
    };
  }, [userProfile?.businessId, business?.ownerId]);

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
      showToast("¡Gracias por tu reseña!", "success");
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
    const shareText = `${shareUrl}\n\nMira el perfil oficial de ${business.name} en MontaPulse: ubicación, servicios y promociones exclusivas.`;
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
  const heroCoverImage = business?.imageUrl || owner?.avatarUrl || `https://images.unsplash.com/photo-1574672280600-4accfa5b6f98?auto=format&fit=crop&q=80&w=800`;
  const logoImage = business?.logoUrl || null;
  const avatar = heroCoverImage;
  const bio = business?.description || 'Miembro activo de la comunidad. ¡Nos vemos en el próximo pulso!';
  const contactEmail = business?.email || owner?.email || null;

  const businessStatus = useMemo(() => isBusinessOpen(business?.openingHours), [business?.openingHours]);

  const googleReviewsUrl = useMemo(() => {
    if (business?.googleBusinessProfileUrl) {
      return business.googleBusinessProfileUrl.startsWith('http') 
        ? business.googleBusinessProfileUrl 
        : `https://${business.googleBusinessProfileUrl}`;
    }
    const query = business?.name 
      ? `${business.name} ${business.locality || 'Montañita'} Ecuador`
      : `${displayName} Montañita Ecuador`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }, [business?.googleBusinessProfileUrl, business?.name, business?.locality, displayName]);

  useSEO({
    title: `${displayName} | MontaPulse`,
    description: bio,
    image: logoImage || heroCoverImage,
    url: BASE_URL + window.location.pathname
  });
  // ─────────────────────────────────────────────────────────────────────────────

  // Early returns AFTER all hooks
  if (!isOpen) return null;

  const isDataLoading = isLoadingUser || (!business && !owner) || dataLoading;

  if (isDataLoading) {
    return (
      <div className="fixed inset-0 z-[4000] bg-[#070a13] overflow-y-auto overflow-x-hidden min-h-screen text-slate-100 flex flex-col animate-in fade-in duration-200">
        <div className="w-full max-w-6xl mx-auto flex-1 flex flex-col min-h-screen p-4 sm:p-8">
          <div className="flex items-center justify-between border-b border-white/10 pb-6">
            <div className="h-8 w-40 bg-slate-800/60 rounded-xl animate-pulse" />
            <div className="h-8 w-24 bg-slate-800/60 rounded-full animate-pulse" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-auto py-12">
            <div className="lg:col-span-6 h-96 bg-slate-900/60 rounded-3xl animate-pulse border border-white/5" />
            <div className="lg:col-span-6 space-y-6 flex flex-col justify-center">
              <div className="h-4 w-32 bg-orange-500/20 rounded-full animate-pulse" />
              <div className="h-12 w-3/4 bg-slate-800 rounded-2xl animate-pulse" />
              <div className="h-20 w-full bg-slate-800/50 rounded-xl animate-pulse" />
              <div className="flex gap-4">
                <div className="h-12 w-36 bg-orange-500/30 rounded-xl animate-pulse" />
                <div className="h-12 w-36 bg-slate-800 rounded-xl animate-pulse" />
              </div>
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
  const publicPulses = activePulses.length > 0 ? activePulses.slice(0, 4) : allBusinessPulses.slice(0, 4);
  const isShowingActive = activePulses.length > 0;
  const totalEventClicks = allBusinessPulses.reduce((sum, e) => sum + (e.clickCount || 0), 0);

  const averageRating = reviews.length > 0 
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) 
    : '5.0';

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="fixed inset-0 z-[4000] bg-[#070a13] overflow-y-auto overflow-x-hidden min-h-screen text-slate-100 flex flex-col animate-in fade-in duration-300 font-sans selection:bg-orange-500 selection:text-white">
      {/* Background Ambience & Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-orange-500/10 via-amber-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-10 w-[450px] h-[450px] bg-gradient-to-tr from-indigo-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(#ffffff08_1px,transparent_1px)] [background-size:24px_24px] opacity-40" />
      </div>

      <div className="relative z-10 w-full flex-1 flex flex-col">
        {/* ─────────────────────────────────────────────────────────────────────────────
            TOP NAVBAR / BRAND HEADER (Inspired by reference landing page header)
        ───────────────────────────────────────────────────────────────────────────── */}
        <header className="sticky top-0 z-50 bg-[#070a13]/85 backdrop-blur-xl border-b border-white/10 transition-all">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
            {/* Logo / Brand Anchor */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-500 flex items-center justify-center p-0.5 shadow-lg shadow-orange-500/20 flex-shrink-0">
                <div className="w-full h-full bg-[#0a0f1d] rounded-[10px] flex items-center justify-center overflow-hidden">
                  {logoImage ? (
                    <img src={logoImage} alt={displayName} className="w-full h-full object-cover" />
                  ) : business?.imageUrl ? (
                    <img src={business.imageUrl} alt={displayName} className="w-full h-full object-cover" />
                  ) : (
                    <span className="font-black text-xs text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">
                      {(displayName || 'MP').substring(0, 2).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-black tracking-[0.25em] text-white uppercase truncate max-w-[180px] sm:max-w-[260px]">
                  {business?.name || 'MONTAPULSE'}
                </span>
                <span className="text-[9px] font-bold tracking-widest text-orange-400 uppercase">
                  {business?.category || 'Perfil Oficial'}
                </span>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-black tracking-widest uppercase text-slate-300">
              <button 
                onClick={() => scrollToSection('landing-hero')} 
                className="hover:text-orange-400 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-orange-500"
              >
                Inicio
              </button>
              <button 
                onClick={() => scrollToSection('landing-about')} 
                className="hover:text-orange-400 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-orange-500"
              >
                Sobre Nosotros
              </button>
              {business?.emblematicServices?.length ? (
                <button 
                  onClick={() => scrollToSection('landing-services')} 
                  className="hover:text-orange-400 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-orange-500"
                >
                  Servicios
                </button>
              ) : null}
              {coupons.length > 0 && (
                <button 
                  onClick={() => scrollToSection('landing-coupons')} 
                  className="hover:text-orange-400 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-orange-500 text-pink-400"
                >
                  Cupones
                </button>
              )}
              {publicPulses.length > 0 && (
                <button 
                  onClick={() => scrollToSection('landing-pulses')} 
                  className="hover:text-orange-400 transition-colors cursor-pointer py-1 border-b-2 border-transparent hover:border-orange-500 text-sky-400"
                >
                  Eventos
                </button>
              )}
            </nav>

            {/* Quick Action Controls */}
            <div className="flex items-center gap-2">
              {/* Back button */}
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-200 hover:text-white transition-all border border-white/10 text-xs font-bold shadow-sm"
              >
                <ChevronLeft className="w-4 h-4 text-orange-400" />
                <span>Volver</span>
              </button>

              {/* Edit Button if permitted */}
              {business && (canEditAll || (currentUser && (business.ownerId === currentUser.id || currentUser.businessId === business.id))) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditBusiness?.(business);
                  }}
                  className="p-2 bg-sky-500/20 hover:bg-sky-500 text-sky-400 hover:text-white rounded-full transition-all border border-sky-500/30"
                  title="Editar Negocio"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
              )}

              {/* Delete Button for admin */}
              {canEditAll && business && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm('¿Estás seguro de eliminar este negocio?')) {
                      onDeleteBusiness?.(business.id);
                      onClose();
                    }
                  }}
                  className="p-2 bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white rounded-full transition-all border border-rose-500/30"
                  title="Eliminar Negocio"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={onClose}
                className="p-2 bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white rounded-full transition-all border border-white/10"
                title="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setIsMobileNavOpen(!isMobileNavOpen)}
                className="md:hidden p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-300 transition-all border border-white/10"
                title="Menú"
              >
                <MenuIcon className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Mobile Navigation Dropdown */}
          {isMobileNavOpen && (
            <div className="md:hidden bg-[#0a0f1d] border-b border-white/10 px-6 py-4 flex flex-col gap-3 text-xs font-black tracking-widest uppercase animate-in slide-in-from-top-2">
              <button onClick={() => { scrollToSection('landing-hero'); setIsMobileNavOpen(false); }} className="text-left py-1 text-slate-300 hover:text-orange-400">Inicio</button>
              <button onClick={() => { scrollToSection('landing-about'); setIsMobileNavOpen(false); }} className="text-left py-1 text-slate-300 hover:text-orange-400">Sobre Nosotros</button>
              {business?.emblematicServices?.length ? <button onClick={() => { scrollToSection('landing-services'); setIsMobileNavOpen(false); }} className="text-left py-1 text-slate-300 hover:text-orange-400">Servicios</button> : null}
              {coupons.length > 0 && <button onClick={() => { scrollToSection('landing-coupons'); setIsMobileNavOpen(false); }} className="text-left py-1 text-pink-400">Cupones</button>}
              {publicPulses.length > 0 && <button onClick={() => { scrollToSection('landing-pulses'); setIsMobileNavOpen(false); }} className="text-left py-1 text-sky-400">Eventos</button>}
            </div>
          )}
        </header>

        {/* ─────────────────────────────────────────────────────────────────────────────
            HERO SECTION (Split-Screen Layout matching the user's reference image)
        ───────────────────────────────────────────────────────────────────────────── */}
        <section id="landing-hero" className="relative min-h-[calc(88vh-80px)] flex items-center justify-center py-8 lg:py-16 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
            
            {/* LEFT COLUMN: Large Hero Image with Geometric Diagonal Neon Accent Lines */}
            <div className="lg:col-span-5 flex justify-center relative">
              <div className="relative w-full max-w-md aspect-[4/5] rounded-[2.5rem] p-3 bg-gradient-to-br from-slate-800/80 via-slate-900/90 to-[#070a13] border border-white/10 shadow-[0_25px_60px_rgba(0,0,0,0.8)] overflow-hidden group">
                
                {/* Diagonal Geometric Graphic Stripes (Inspired by reference design) */}
                <div className="absolute -inset-10 pointer-events-none z-20 overflow-hidden">
                  {/* Diagonal Line 1 (Coral / Orange) */}
                  <div className="absolute top-0 right-16 w-1 h-[140%] bg-gradient-to-b from-orange-400 via-amber-500 to-transparent -rotate-[28deg] shadow-[0_0_15px_rgba(249,115,22,0.8)]" />
                  {/* Diagonal Line 2 (White / Silver Accent) */}
                  <div className="absolute top-0 right-10 w-0.5 h-[140%] bg-white/40 -rotate-[28deg]" />
                  {/* Diagonal Line 3 (Thin Gold Accent) */}
                  <div className="absolute top-0 right-6 w-1 h-[140%] bg-gradient-to-b from-amber-300 via-yellow-400 to-transparent -rotate-[28deg]" />
                  {/* Diagonal Line 4 (Purple/Cyan Neon subtle bottom) */}
                  <div className="absolute -bottom-10 left-10 w-1.5 h-[80%] bg-gradient-to-t from-purple-500 via-indigo-400 to-transparent -rotate-[28deg] opacity-70" />
                  
                  {/* Geometric Angular Accent Box Outline (Reference bottom right) */}
                  <div className="absolute bottom-6 right-6 w-28 h-28 border-r-2 border-b-2 border-orange-500/40 pointer-events-none" />
                </div>

                {/* Hero Photo Container */}
                <div className="relative w-full h-full rounded-[2rem] overflow-hidden bg-slate-900 z-10">
                  <img
                    ref={avatarRef}
                    src={avatar}
                    alt={displayName}
                    className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-105 ${
                      isAvatarLoaded ? 'opacity-100' : 'opacity-0'
                    }`}
                    loading="lazy"
                    onLoad={() => setIsAvatarLoaded(true)}
                  />
                  {!business && !userProfile?.avatarUrl && (
                    <div className="absolute inset-0 flex items-center justify-center bg-slate-900 text-slate-500">
                      <UserCircle className="w-24 h-24" />
                    </div>
                  )}

                  {/* Gradient vignettes */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#070a13] via-transparent to-transparent opacity-80" />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-transparent to-black/20" />

                  {/* Floating Status Badge inside image */}
                  <div className="absolute top-4 left-4 z-30 flex flex-col gap-2">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md border border-white/10 shadow-lg">
                      {business ? (
                        business.mapType === MapEntryType.SECTOR ? (
                          <>
                            <Compass className="w-3.5 h-3.5 text-emerald-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/90">Sector</span>
                          </>
                        ) : (business.mapType === MapEntryType.LANDMARK || business.isReference || business.id?.startsWith('ref-')) ? (
                          <>
                            <MapPin className="w-3.5 h-3.5 text-sky-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/90">Referencia</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-white/90">Socio Verificado</span>
                          </>
                        )
                      ) : (
                        <>
                          <User className="w-3.5 h-3.5 text-sky-400" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-white/90">Miembro Pulse</span>
                        </>
                      )}
                    </div>

                    {business && (
                      <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full backdrop-blur-md border shadow-lg ${
                        businessStatus.isOpen 
                          ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300' 
                          : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                      }`}>
                        <Circle className={`w-2 h-2 ${businessStatus.isOpen ? 'fill-emerald-400 text-emerald-400' : 'fill-rose-400 text-rose-400'}`} />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                          {businessStatus.isOpen ? 'Abierto Ahora' : 'Cerrado'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Floating Logo Emblem overlay if logoUrl exists */}
                  {business?.logoUrl && (
                    <div className="absolute bottom-4 left-4 z-30 flex items-center gap-2 p-1.5 rounded-2xl bg-black/75 backdrop-blur-md border border-white/20 shadow-2xl">
                      <img 
                        src={business.logoUrl} 
                        alt={`Logo de ${displayName}`} 
                        className="w-10 h-10 rounded-xl object-cover" 
                      />
                      <div className="pr-2">
                        <span className="block text-[8px] font-black uppercase text-amber-400 tracking-wider">Logo Oficial</span>
                        <span className="block text-[10px] font-bold text-white max-w-[110px] truncate">{displayName}</span>
                      </div>
                    </div>
                  )}

                  {/* Aesthetic Pagination Dots / Indicator at bottom (Like reference image) */}
                  <div className={`absolute ${business?.logoUrl ? 'bottom-4 right-4' : 'bottom-4 left-1/2 -translate-x-1/2'} z-30 flex items-center gap-1.5 bg-black/40 backdrop-blur-md px-3 py-1 rounded-full border border-white/10`}>
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]" />
                    <span className="w-2 h-2 rounded-full bg-white/40" />
                    <span className="w-2 h-2 rounded-full bg-white/40" />
                    <span className="w-2 h-2 rounded-full bg-white/40" />
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Hero Headline, Color Swatches, Bio, Actions (Reference styling) */}
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6 text-left">
              
              {/* Eyebrow & Swatch Bar */}
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <span className="text-xs sm:text-sm font-black tracking-[0.3em] uppercase text-orange-400 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-400" />
                    LANDING PAGE BUSINESS
                  </span>
                </div>

                {/* Color Swatches Palette (Coral, Gold, Rosé, Purple) matching the image */}
                <div className="flex items-center gap-1.5 pt-1">
                  <div className="w-5 h-2 rounded-sm bg-[#fde047]" title="Gold" />
                  <div className="w-5 h-2 rounded-sm bg-[#f97316]" title="Orange" />
                  <div className="w-5 h-2 rounded-sm bg-[#e11d48]" title="Rose" />
                  <div className="w-5 h-2 rounded-sm bg-[#a855f7]" title="Purple" />
                  <div className="w-12 h-0.5 bg-white/20 ml-2" />
                </div>
              </div>

              {/* Massive Business Title with Brand Logo */}
              <div className="space-y-4">
                <div className="flex items-start sm:items-center gap-4">
                  {business?.logoUrl && (
                    <div className="relative group/logo flex-shrink-0">
                      <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl p-1 bg-gradient-to-br from-orange-500 via-amber-500 to-yellow-400 shadow-xl shadow-orange-500/20">
                        <div className="w-full h-full bg-[#0a0f1d] rounded-xl overflow-hidden flex items-center justify-center">
                          <img 
                            src={business.logoUrl} 
                            alt={`Logo de ${displayName}`} 
                            className="w-full h-full object-cover group-hover/logo:scale-110 transition-transform duration-300" 
                          />
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="flex-1">
                    <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-white tracking-tight leading-[1.1] uppercase">
                      {displayName}
                    </h1>
                  </div>
                </div>
                
                {/* Meta tags (Locality, Sector, Category, Google Reviews) */}
                <div className="flex flex-wrap items-center gap-2.5 pt-1 text-xs font-bold text-slate-300">
                  <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                    <MapPin className="w-3.5 h-3.5 text-sky-400" />
                    <span>{business?.locality || 'Montañita'}</span>
                  </div>
                  {business?.sector && (
                    <div className="flex items-center gap-1.5 bg-white/5 px-3 py-1.5 rounded-xl border border-white/10">
                      <span>{SECTOR_INFO[business.sector as Sector]?.symbol || '🧭'}</span>
                      <span>{business.sector}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-300 px-3 py-1.5 rounded-xl border border-amber-500/20">
                    <Store className="w-3.5 h-3.5" />
                    <span>{business?.category || 'Negocio'}</span>
                  </div>
                  <a 
                    href={googleReviewsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 px-3 py-1.5 rounded-xl border border-yellow-500/20 transition-all hover:scale-105"
                    title="Ver Reseñas en Google Maps"
                  >
                    <Star className="w-3.5 h-3.5 fill-current text-yellow-400" />
                    <span>Google Maps Reseñas</span>
                    <ExternalLink className="w-3 h-3 text-yellow-400/80" />
                  </a>
                </div>
              </div>

              {/* Description / Story paragraph */}
              <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-2xl font-normal">
                {bio}
              </p>

              {/* Primary Call-to-Actions (Buttons matching reference hero) */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {/* Details / Map Button (Orange/Coral like the reference image) */}
                {business && business.coordinates && (
                  <button
                    onClick={() => {
                      if (onViewOnMap) {
                        onViewOnMap(business.coordinates);
                      } else {
                        window.open(`https://www.google.com/maps?q=${business.coordinates[0]},${business.coordinates[1]}`, '_blank');
                      }
                    }}
                    className="flex items-center gap-2.5 px-6 py-3.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-black text-xs uppercase tracking-widest rounded-2xl shadow-xl shadow-orange-500/25 hover:scale-[1.02] active:scale-95 transition-all group"
                  >
                    <Navigation2 className="w-4 h-4 text-white group-hover:rotate-12 transition-transform" />
                    <span>Ver en el Mapa</span>
                  </button>
                )}

                {/* Follow Button */}
                <button
                  onClick={() => businessId && handleToggleFollow(businessId)}
                  className={`flex items-center gap-2 px-5 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest transition-all border ${
                    isFollowing 
                      ? 'bg-orange-500 text-white border-orange-400 shadow-lg shadow-orange-500/20' 
                      : 'bg-slate-900/80 text-white border-white/10 hover:bg-white/10'
                  }`}
                >
                  {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  <span>{isFollowing ? 'Siguiendo' : 'Seguir'}</span>
                </button>

                {/* Share Button (Orange Square Icon style from reference) */}
                {business && (
                  <button
                    onClick={handleShareWhatsApp}
                    className="flex items-center gap-2 px-4 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 hover:text-white rounded-2xl border border-white/10 transition-all shadow-sm"
                    title="Compartir por WhatsApp"
                  >
                    <Share2 className="w-4 h-4 text-orange-400" />
                    <span className="text-xs font-black uppercase tracking-wider hidden sm:inline">Compartir</span>
                  </button>
                )}

                {/* Menú QR if available */}
                {business && business.menuUrl && (
                  <a
                    href={business.menuUrl.startsWith('http') ? business.menuUrl : `https://${business.menuUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3.5 bg-pink-500/10 hover:bg-pink-500/20 text-pink-300 rounded-2xl border border-pink-500/20 transition-all text-xs font-black uppercase tracking-wider"
                  >
                    <QrCode className="w-4 h-4 text-pink-400" />
                    <span>Carta QR</span>
                  </a>
                )}

                {/* Booking online if available */}
                {business && business.bookingUrl && (
                  <a
                    href={business.bookingUrl.startsWith('http') ? business.bookingUrl : `https://${business.bookingUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 rounded-2xl border border-yellow-500/20 transition-all text-xs font-black uppercase tracking-wider"
                  >
                    <CalendarCheck className="w-4 h-4 text-yellow-400" />
                    <span>Reservar</span>
                  </a>
                )}
              </div>

              {/* Social Channels Ribbon */}
              {business && (business.instagram || business.facebook || business.tiktok || business.youtube || business.whatsapp || business.phone) && (
                <div className="pt-2">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-orange-400" /> Canales Oficiales:
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {business.whatsapp && (
                      <a
                        href={getWhatsAppUrl(business.whatsapp)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs font-bold transition-all hover:scale-105"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        <span>WhatsApp</span>
                      </a>
                    )}
                    {business.instagram && (
                      <a
                        href={getInstagramUrl(business.instagram)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-500/20 rounded-xl text-pink-400 text-xs font-bold transition-all hover:scale-105"
                      >
                        <Instagram className="w-3.5 h-3.5" />
                        <span>Instagram</span>
                      </a>
                    )}
                    {business.facebook && (
                      <a
                        href={getFacebookUrl(business.facebook)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/20 rounded-xl text-blue-400 text-xs font-bold transition-all hover:scale-105"
                      >
                        <Facebook className="w-3.5 h-3.5" />
                        <span>Facebook</span>
                      </a>
                    )}
                    {business.tiktok && (
                      <a
                        href={getTikTokUrl(business.tiktok)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/20 rounded-xl text-teal-400 text-xs font-bold transition-all hover:scale-105"
                      >
                        <TikTokIcon className="w-3.5 h-3.5" />
                        <span>TikTok</span>
                      </a>
                    )}
                    {business.youtube && (
                      <a
                        href={getYouTubeUrl(business.youtube)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold transition-all hover:scale-105"
                      >
                        <Youtube className="w-3.5 h-3.5" />
                        <span>YouTube</span>
                      </a>
                    )}
                    {business.phone && (
                      <a
                        href={`tel:${business.phone}`}
                        className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 rounded-xl text-sky-400 text-xs font-bold transition-all hover:scale-105"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span>Llamar</span>
                      </a>
                    )}
                  </div>
                </div>
              )}

            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────────────
            STATS / HIGHLIGHTS BAR
        ───────────────────────────────────────────────────────────────────────────── */}
        <section className="border-y border-white/10 bg-slate-900/40 backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-white">{business?.viewCount || 0}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Visitas al Perfil</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-orange-400">{business?.followerCount || 0}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Seguidores Activos</p>
              </div>
              <div className="space-y-1">
                <p className="text-2xl sm:text-3xl font-black text-amber-400">{totalEventClicks}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Interacciones Pulsos</p>
              </div>
              <a 
                href={googleReviewsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="space-y-1 block hover:scale-105 transition-transform cursor-pointer group"
                title="Ver Ficha y Reseñas en Google Maps"
              >
                <p className="text-2xl sm:text-3xl font-black text-yellow-400 flex items-center justify-center gap-1">
                  <span>Google</span>
                  <Star className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                </p>
                <p className="text-[10px] text-slate-400 group-hover:text-yellow-400 font-bold uppercase tracking-widest flex items-center justify-center gap-1 transition-colors">
                  <span>Ver Reseñas</span>
                  <ExternalLink className="w-3 h-3 text-yellow-400/80" />
                </p>
              </a>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────────────────────
            MAIN LANDING PAGE CONTENT BODY
        ───────────────────────────────────────────────────────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-16">
          
          {/* SECTION 1: ABOUT & VERIFIED AMENITIES */}
          <section id="landing-about" className="space-y-8">
            <div className="flex flex-col items-start gap-2">
              <span className="text-xs font-black text-orange-400 tracking-[0.25em] uppercase">Información Oficial</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
                Detalles & Comodidades Verificadas
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Horario de Atención Card */}
              {business && (
                <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between">
                  <div className="space-y-2">
                    <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                      <Clock className="w-5 h-5" />
                    </div>
                    <h3 className="text-base font-black text-white uppercase">Horario de Atención</h3>
                    <p className="text-xs text-slate-300">
                      {business.openingHours ? businessStatus.message : 'Horario no especificado'}
                    </p>
                  </div>
                  <div className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 ${
                    businessStatus.isOpen ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                  }`}>
                    <Circle className={`w-2 h-2 ${businessStatus.isOpen ? 'fill-emerald-400 text-emerald-400' : 'fill-rose-400 text-rose-400'}`} />
                    <span>{businessStatus.isOpen ? 'Atendiendo Ahora' : 'Cerrado Temporalmente'}</span>
                  </div>
                </div>
              )}

              {/* Ubicación & Referencia Card */}
              <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-black text-white uppercase">Ubicación y Sector</h3>
                  <p className="text-xs text-slate-300">
                    {business?.address || `${business?.locality || 'Montañita'}, Santa Elena, Ecuador`}
                  </p>
                  {business?.containedInLandmarkId && (
                    <p className="text-[11px] text-sky-400 font-bold">
                      Cerca de: {LANDMARKS.find(l => l.id === business.containedInLandmarkId)?.name}
                    </p>
                  )}
                </div>
                {business?.coordinates && (
                  <button
                    onClick={() => {
                      if (onViewOnMap) {
                        onViewOnMap(business.coordinates);
                      } else {
                        window.open(`https://www.google.com/maps?q=${business.coordinates[0]},${business.coordinates[1]}`, '_blank');
                      }
                    }}
                    className="w-full py-2 bg-sky-500/20 hover:bg-sky-500 text-sky-300 hover:text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors"
                  >
                    Cómo Llegar →
                  </button>
                )}
              </div>

              {/* Pagos y Contacto Card */}
              <div className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-black text-white uppercase">Métodos de Pago</h3>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {business?.paymentMethods && business.paymentMethods.length > 0 ? (
                      business.paymentMethods.map((m, i) => (
                        <span key={i} className="text-xs text-slate-200 font-bold bg-white/5 px-2.5 py-1 rounded-lg border border-white/10">
                          {m === 'cash' ? '💵 Efectivo' : m === 'transfer_pichincha' ? '🏦 Pichincha' : m === 'deuna' ? '📱 Deuna' : m === 'credit_card' ? '💳 Tarjetas' : m}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400">Efectivo / Transferencias</span>
                    )}
                  </div>
                </div>
                {contactEmail && (
                  <div className="text-[11px] text-slate-400 truncate flex items-center gap-1.5 pt-2 border-t border-white/5">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{contactEmail}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Verified Amenities Pill Badges */}
            {business && (business.hasWifi || business.hasParking || business.petFriendly || business.isBeachfront) && (
              <div className="p-6 bg-slate-900/40 rounded-3xl border border-white/5 space-y-3">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Award className="w-4 h-4 text-orange-400" />
                  Servicios y Comodidades del Establecimiento
                </h4>
                <div className="flex flex-wrap gap-3">
                  {business.hasWifi && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-sky-500/10 border border-sky-500/25 text-sky-400 rounded-2xl text-xs font-bold">
                      <Wifi className="w-4 h-4" />
                      <span>Wi-Fi de Alta Velocidad {business.wifiSpeedMbps ? `(${business.wifiSpeedMbps} Mbps)` : ''}</span>
                    </div>
                  )}
                  {business.hasParking && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 border border-amber-500/25 text-amber-400 rounded-2xl text-xs font-bold">
                      <Car className="w-4 h-4" />
                      <span>Estacionamiento Privado</span>
                    </div>
                  )}
                  {business.petFriendly && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/25 text-purple-400 rounded-2xl text-xs font-bold">
                      <Dog className="w-4 h-4" />
                      <span>100% Pet Friendly</span>
                    </div>
                  )}
                  {business.isBeachfront && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-orange-500/10 border border-orange-500/25 text-orange-400 rounded-2xl text-xs font-bold">
                      <Store className="w-4 h-4" />
                      <span>Frente al Mar / Vista Panorámica</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* SECTION 2: PRODUCTS & SERVICES */}
          {business && business.emblematicServices && business.emblematicServices.length > 0 && (
            <section id="landing-services" className="space-y-8">
              <div className="flex flex-col items-start gap-2">
                <span className="text-xs font-black text-amber-400 tracking-[0.25em] uppercase">Oferta Destacada</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide">
                  Nuestra Carta & Servicios
                </h2>
              </div>

              {/* Emblematic Products Grid */}
              <div className="space-y-4">
                <h3 className="text-xs font-black text-amber-400 uppercase tracking-widest flex items-center gap-2">
                  <Star className="w-4 h-4 fill-amber-400" />
                  Platos o Servicios Emblemáticos de la Casa
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {business.emblematicServices.map((service, idx) => (
                    <div 
                      key={idx}
                      className="p-5 bg-gradient-to-br from-slate-900/90 to-slate-900/50 rounded-3xl border border-amber-500/20 hover:border-amber-500/50 transition-all flex items-center gap-4 group shadow-lg hover:scale-[1.02]"
                    >
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-400 group-hover:bg-amber-500/20 transition-colors shrink-0">
                        <Zap className="w-6 h-6" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="text-xs text-amber-400 font-black uppercase tracking-wider block">Especialidad #{idx + 1}</span>
                        <span className="text-sm font-black text-white uppercase tracking-wide block truncate">{service}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* SECTION 3: PROMOTIONS & COUPONS */}
          {coupons.length > 0 && (
            <section id="landing-coupons" className="space-y-8">
              <div className="flex flex-col items-start gap-2">
                <span className="text-xs font-black text-pink-400 tracking-[0.25em] uppercase">Beneficios Exclusivos</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide flex items-center gap-3">
                  <Ticket className="w-7 h-7 text-pink-500" />
                  Cupones & Promociones Activas
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {coupons.map(coupon => (
                  <div 
                    key={coupon.id}
                    className="p-6 bg-gradient-to-br from-pink-950/40 via-slate-900/80 to-slate-900/90 border border-pink-500/30 rounded-3xl relative overflow-hidden flex flex-col justify-between gap-4 group hover:border-pink-500 transition-all shadow-xl"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <span className="text-xs font-black text-pink-400 uppercase tracking-widest">Descuento Especial</span>
                        <h3 className="text-2xl font-black text-white">
                          {coupon.value}{coupon.type === 'percentage' ? '%' : '$'} OFF
                        </h3>
                        <p className="text-xs text-slate-300">
                          {coupon.description || 'Válido para consumo o servicios en el local.'}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-pink-500 text-white text-xs font-black rounded-lg tracking-wider">
                        {coupon.code}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-white/10">
                      <span className="text-[10px] font-bold text-pink-400">
                        Válido hasta: {coupon.expiresAt ? (coupon.expiresAt.toDate ? coupon.expiresAt.toDate().toLocaleDateString() : new Date(coupon.expiresAt).toLocaleDateString()) : 'Sin límite'}
                      </span>
                      <button
                        onClick={() => handleObtainCoupon(coupon)}
                        className="px-4 py-2 bg-pink-500 hover:bg-pink-400 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-pink-500/20 active:scale-95"
                      >
                        Reservar Cupón →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 4: EVENTS & PULSES */}
          {publicPulses.length > 0 && (
            <section id="landing-pulses" className="space-y-8">
              <div className="flex flex-col items-start gap-2">
                <span className="text-xs font-black text-sky-400 tracking-[0.25em] uppercase">Agenda Pulse</span>
                <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide flex items-center gap-3">
                  <Zap className="w-7 h-7 text-sky-400" />
                  {isShowingActive ? 'Próximos Eventos Oficiales' : 'Pulsos & Actividades Recientes'}
                </h2>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {publicPulses.map(pulse => (
                  <div 
                    key={pulse.id} 
                    onClick={() => {
                      setSelectedEvent(pulse);
                      onClose();
                    }}
                    className="group bg-slate-900/60 rounded-3xl border border-white/10 overflow-hidden cursor-pointer hover:border-sky-500/40 transition-all hover:scale-[1.02] flex flex-col"
                  >
                    <div className="h-40 relative bg-slate-800 overflow-hidden">
                      <img
                        src={pulse.imageUrl}
                        alt={pulse.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-black/60 backdrop-blur-md rounded-lg text-[10px] font-bold text-white">
                        {new Date(pulse.startAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="p-4 flex-1 flex flex-col justify-between gap-2">
                      <h4 className="text-sm font-black text-white group-hover:text-sky-400 transition-colors line-clamp-1">
                        {pulse.title}
                      </h4>
                      <span className="text-[10px] font-bold text-sky-400 uppercase tracking-widest flex items-center gap-1">
                        Ver Detalles <ChevronRight className="w-3 h-3" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* SECTION 5: OWNER / HOST PROFILE */}
          {((business && owner) || linkedBusiness) && (
            <section className="space-y-6">
              <div className="flex flex-col items-start gap-2">
                <span className="text-xs font-black text-slate-400 tracking-[0.25em] uppercase">Anfitrión de la Comunidad</span>
                <h2 className="text-2xl font-black text-white uppercase tracking-wide">
                  {business ? 'Perfil del Propietario' : 'Negocio Asociado'}
                </h2>
              </div>

              {business && owner && (
                <div 
                  onClick={() => openLinkedUser(owner.id)}
                  className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 flex items-center justify-between gap-6 cursor-pointer hover:border-sky-500/40 transition-all group max-w-2xl"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 shrink-0">
                      <img
                        src={owner.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(`${owner.name} ${owner.surname}`)}&background=0ea5e9&color=fff`}
                        alt={`${owner.name} ${owner.surname}`}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-black text-white truncate">{owner.name} {owner.surname}</h4>
                      <p className="text-xs text-sky-400 font-bold uppercase tracking-widest">Miembro Verificado</p>
                      {owner.email && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{owner.email}</p>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-sky-400 transition-colors shrink-0" />
                </div>
              )}

              {linkedBusiness && (
                <div 
                  onClick={() => openLinkedBusiness(linkedBusiness)}
                  className="p-6 bg-slate-900/60 rounded-3xl border border-white/10 flex items-center justify-between gap-6 cursor-pointer hover:border-amber-500/40 transition-all group max-w-2xl"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-2xl overflow-hidden border-2 border-white/10 shrink-0">
                      <img
                        src={linkedBusiness.imageUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(linkedBusiness.name)}&background=f59e0b&color=fff`}
                        alt={linkedBusiness.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-base font-black text-white truncate">{linkedBusiness.name}</h4>
                      <p className="text-xs text-amber-400 font-bold uppercase tracking-widest">{linkedBusiness.category}</p>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-slate-500 group-hover:text-amber-400 transition-colors shrink-0" />
                </div>
              )}
            </section>
          )}

          {/* SECTION 6: GOOGLE MAPS REVIEWS */}
          <section id="landing-reviews" className="space-y-6 pt-6 border-t border-white/10">
            <div className="flex flex-col items-start gap-2">
              <span className="text-xs font-black text-yellow-400 tracking-[0.25em] uppercase">Opiniones & Calificaciones</span>
              <h2 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-wide flex items-center gap-3">
                <Star className="w-7 h-7 text-yellow-400 fill-yellow-400" />
                Reseñas en Google Maps
              </h2>
            </div>

            {/* Google Maps Review Card */}
            <div className="p-6 sm:p-8 bg-gradient-to-br from-slate-900/90 via-[#0c1222] to-slate-950 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden group hover:border-amber-500/40 transition-all max-w-3xl">
              <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 relative z-10">
                <div className="space-y-3 max-w-xl">
                  {/* Google Brand Mark & Rating Stars */}
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-md shrink-0">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-base font-black text-white flex items-center gap-2">
                        Google Maps Reviews
                      </h3>
                      <div className="flex items-center gap-1 pt-0.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                        ))}
                        <span className="text-xs font-bold text-slate-300 ml-1.5">Opiniones Verificadas</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-300 leading-relaxed font-normal">
                    Consulta las opiniones de visitantes y clientes en la ficha oficial de Google Maps o comparte tu propia experiencia en <strong className="text-white">{displayName}</strong>.
                  </p>
                </div>

                {/* Direct External Link Button */}
                <a
                  href={googleReviewsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-4 bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-xl shadow-amber-500/20 active:scale-95 flex items-center justify-center gap-2 shrink-0 group/btn"
                >
                  <span>Ver y Calificar en Google</span>
                  <ExternalLink className="w-4 h-4 text-slate-950 group-hover/btn:translate-x-0.5 group-hover/btn:-translate-y-0.5 transition-transform" />
                </a>
              </div>
            </div>
          </section>

        </div>

        {/* ─────────────────────────────────────────────────────────────────────────────
            LANDING FOOTER (Official branding & actions)
        ───────────────────────────────────────────────────────────────────────────── */}
        <footer className="border-t border-white/10 bg-[#05070d] py-12 px-4 sm:px-6 lg:px-8 mt-auto">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
            <div className="space-y-1">
              <p className="text-xs font-black uppercase tracking-widest text-white">
                {displayName} · Perfil Oficial
              </p>
              <p className="text-[11px] text-slate-400">
                Impulsado por la plataforma comunitaria MontaPulse.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-full text-xs font-black uppercase tracking-widest transition-colors shadow-lg shadow-orange-500/20"
              >
                Volver a Explorar
              </button>
            </div>
          </div>
        </footer>

        {/* ─────────────────────────────────────────────────────────────────────────────
            FLOATING WHATSAPP CTA
        ───────────────────────────────────────────────────────────────────────────── */}
        {business?.whatsapp && (
          <a
            href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`¡Hola ${business.name}! Los encontré en MontaPulse.`)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 z-[4100] flex items-center gap-2.5 px-5 py-3.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white font-black text-xs uppercase tracking-wider rounded-full shadow-[0_10px_30px_rgba(16,185,129,0.45)] hover:shadow-[0_15px_40px_rgba(16,185,129,0.6)] hover:scale-105 active:scale-95 transition-all duration-300 border border-white/20 group animate-in slide-in-from-bottom-5"
            title="Contactar por WhatsApp"
          >
            <div className="relative flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-white fill-white/20 group-hover:rotate-12 transition-transform" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-300 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-300 rounded-full" />
            </div>
            <span className="font-black tracking-widest text-[11px]">WhatsApp</span>
          </a>
        )}

      </div>
    </div>
  );
});
