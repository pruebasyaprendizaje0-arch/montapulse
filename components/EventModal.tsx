import React from 'react';
import { 
    X, Clock, MapPin, Users, MessageCircle, Phone, ChevronLeft, ChevronRight, 
    Edit3, Trash2, Settings, Share2, UserPlus, UserCheck, QrCode, ExternalLink, 
    CalendarCheck, Instagram, Facebook, Youtube, Navigation, DollarSign, CheckCircle2, AlertCircle 
} from 'lucide-react';
import { MontanitaEvent, Business, Sector, BusinessCategory } from '../types';
import { SECTOR_INFO, BASE_URL } from '../constants';
import { useToast } from '../context/ToastContext';
import { useSEO } from '../hooks/useSEO';
import { useData } from '../context/DataContext';
import { TikTokIcon, getInstagramUrl, getFacebookUrl, getTikTokUrl, getYouTubeUrl, getWhatsAppUrl, normalizePhoneNumber } from '../utils/social';
import { formatEcuadorEventDate, formatEventPrice } from '../utils/timeUtils';
import { escapeHtml } from '../utils/stringUtils';

interface EventModalProps {
    event: MontanitaEvent;
    business?: Business;
    onClose: () => void;
    onNext?: () => void;
    onPrevious?: () => void;
    hasNext?: boolean;
    hasPrevious?: boolean;
    isAdmin?: boolean;
    onEdit?: (event: MontanitaEvent) => void;
    onDelete?: (id: string) => void;
    onEditBusiness?: (id: string) => void;
    onRsvp?: () => void;
    isRsvp?: boolean;
    dataLoading?: boolean;
}

export const EventModal: React.FC<EventModalProps> = ({
    event,
    business,
    onClose,
    onNext,
    onPrevious,
    isAdmin,
    onEdit,
    onDelete,
    onEditBusiness,
    onRsvp,
    isRsvp,
    dataLoading
}) => {
    const [imgError, setImgError] = React.useState(false);
    const [isImageLoading, setIsImageLoading] = React.useState(true);
    const modalRef = React.useRef<HTMLDivElement>(null);
    const triggerElementRef = React.useRef<HTMLElement | null>(null);

    // Initial focus and focus restoration
    React.useEffect(() => {
        triggerElementRef.current = document.activeElement as HTMLElement | null;
        if (modalRef.current) {
            modalRef.current.focus();
        }
        return () => {
            if (triggerElementRef.current && typeof triggerElementRef.current.focus === 'function') {
                triggerElementRef.current.focus();
            }
        };
    }, []);

    // Reset error state and loading when event changes
    React.useEffect(() => {
        setImgError(false);
        setIsImageLoading(true);
    }, [event?.id, event?.imageUrl]);

    // Focus trap and Escape key listener
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                onClose();
                return;
            }
            if (e.key === 'Tab' && modalRef.current) {
                const focusable = modalRef.current.querySelectorAll<HTMLElement>(
                    'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                );
                if (focusable.length === 0) return;
                const first = focusable[0];
                const last = focusable[focusable.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const { showToast, showConfirm } = useToast();
    const {
        events,
        navigationEvents,
        setSelectedEvent,
        setShowPublicProfile,
        setPublicProfileId,
        setPublicProfileType,
        handleToggleFollow,
        isBusinessFollowed,
        businesses
    } = useData();

    const targetBusiness = business || (event?.businessId ? businesses.find(b => b.id === event.businessId) : undefined);
    const isRestaurant = targetBusiness?.category === BusinessCategory.RESTAURANTE ||
        (targetBusiness?.category as string)?.toLowerCase().includes('restaurante') ||
        (event as any)?.category?.toLowerCase() === 'gastronomia' ||
        (event as any)?.category?.toLowerCase() === 'restaurante' ||
        !!targetBusiness?.menuUrl;

    useSEO({
        title: event?.title || 'Evento',
        description: event?.description || `Descubre el evento en ubicame.info PULSE.`,
        image: event?.imageUrl,
        url: BASE_URL + window.location.pathname
    });

    const eventList = React.useMemo(() => {
        let base = (navigationEvents && navigationEvents.length > 0) ? navigationEvents : (events || []);
        if (event && !base.some(e => e.id === event.id)) {
            base = [event, ...base];
        }
        return base;
    }, [navigationEvents, events, event]);

    const currentIndex = React.useMemo(() => {
        if (!event || eventList.length === 0) return -1;
        return eventList.findIndex(e => e.id === event.id);
    }, [event, eventList]);

    const handlePrev = React.useCallback(() => {
        if (eventList.length > 1) {
            const prevIndex = currentIndex <= 0 ? eventList.length - 1 : currentIndex - 1;
            const prevEvent = eventList[prevIndex];
            if (prevEvent) setSelectedEvent(prevEvent);
        } else if (onPrevious) {
            onPrevious();
        }
    }, [currentIndex, eventList, setSelectedEvent, onPrevious]);

    const handleNextEvent = React.useCallback(() => {
        if (eventList.length > 1) {
            const nextIndex = (currentIndex >= eventList.length - 1 || currentIndex === -1) ? 0 : currentIndex + 1;
            const nextEvent = eventList[nextIndex];
            if (nextEvent) setSelectedEvent(nextEvent);
        } else if (onNext) {
            onNext();
        }
    }, [currentIndex, eventList, setSelectedEvent, onNext]);

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') handleNextEvent();
            if (e.key === 'ArrowLeft') handlePrev();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextEvent, handlePrev]);

    if (!event) return null;

    const sectorStyle = SECTOR_INFO[event.sector] || SECTOR_INFO[Sector.CENTRO];

    // Accurate Ecuador date formatting
    const dateInfo = formatEcuadorEventDate(event.startAt, event.endAt, event.status);

    const handleShare = () => {
        const shareUrl = `${window.location.origin}/eventos/${event.slug || event.id}`;
        if (navigator.share) {
            navigator.share({
                title: event.title,
                text: `${event.title} - ${dateInfo.fullStr}`,
                url: shareUrl
            }).catch(() => {});
        } else {
            navigator.clipboard.writeText(shareUrl);
            showToast('Enlace copiado al portapapeles', 'success');
        }
    };

    const priceInfo = formatEventPrice(event);

    const whatsappUrl = targetBusiness?.whatsapp ? getWhatsAppUrl(targetBusiness.whatsapp, `¡Hola! Vi el evento "${event.title}" en MontaPulse.`) : '';
    const instagramUrl = targetBusiness?.instagram ? getInstagramUrl(targetBusiness.instagram) : '';
    const facebookUrl = targetBusiness?.facebook ? getFacebookUrl(targetBusiness.facebook) : '';
    const tiktokUrl = targetBusiness?.tiktok ? getTikTokUrl(targetBusiness.tiktok) : '';
    const youtubeUrl = targetBusiness?.youtube ? getYouTubeUrl(targetBusiness.youtube) : '';
    const rawPhone = targetBusiness?.phone ? normalizePhoneNumber(targetBusiness.phone) : '';

    return (
        <div 
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-labelledby="event-modal-title"
            className="fixed inset-0 z-[3000] overflow-y-auto bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 outline-none"
        >
            <div 
                className="relative w-full max-w-2xl bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex flex-col max-h-[90vh] overflow-y-auto">
                    {/* Hero Image / Header */}
                    <div className="relative w-full aspect-[4/3] sm:aspect-video bg-slate-800 shrink-0">
                        {isImageLoading && !imgError && (
                            <div className="absolute inset-0 flex items-center justify-center bg-slate-800 z-10">
                                <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}

                        {imgError || !event.imageUrl ? (
                            <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900 text-slate-500">
                                <span className="text-4xl mb-2">🎉</span>
                                <span className="text-xs uppercase font-bold tracking-widest text-slate-400">PULSE EVENT</span>
                            </div>
                        ) : event.imageUrl ? (
                            <img
                                src={event.imageUrl}
                                alt={event.title}
                                width="640"
                                height="360"
                                className="absolute inset-0 w-full h-full object-cover z-20"
                                loading="eager"
                                onLoad={() => setIsImageLoading(false)}
                                onError={() => {
                                    setImgError(true);
                                    setIsImageLoading(false);
                                }}
                            />
                        ) : null}

                        {/* Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent/40 to-transparent pointer-events-none z-10" />

                        {/* Action Buttons */}
                        <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2 z-[2010]">
                            {isAdmin && (
                                <>
                                    <button
                                        type="button"
                                        onClick={() => onEdit?.(event)}
                                        aria-label="Editar evento"
                                        className="min-h-[44px] min-w-[44px] bg-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform duration-200 border-2 border-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                                    >
                                        <Edit3 className="w-4 h-4 text-white" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={async () => {
                                            if (await showConfirm('¿Estás seguro de eliminar este evento?', 'Confirmar eliminación')) {
                                                onDelete?.(event.id);
                                            }
                                        }}
                                        aria-label="Eliminar evento"
                                        className="min-h-[44px] min-w-[44px] bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </>
                            )}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShare();
                                }}
                                aria-label="Compartir evento"
                                className="min-h-[44px] min-w-[44px] bg-slate-900/80 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-2xl transition-colors duration-200 border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                            >
                                <Share2 className="w-4 h-4 text-white" />
                            </button>
                            <button
                                type="button"
                                onClick={onClose}
                                aria-label="Cerrar modal de evento"
                                className="min-h-[44px] min-w-[44px] bg-slate-900/80 hover:bg-slate-800 text-white rounded-full flex items-center justify-center shadow-2xl transition-colors duration-200 border border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                            >
                                <X className="w-5 h-5 stroke-[2.5px]" />
                            </button>
                        </div>

                        {/* Prev / Next navigation buttons */}
                        {eventList.length > 1 && (
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3 sm:px-6 z-[2020] pointer-events-none">
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrev();
                                    }}
                                    aria-label="Evento anterior"
                                    className="pointer-events-auto min-h-[44px] min-w-[44px] p-2 sm:p-3 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full border border-white/20 active:scale-90 transition-transform duration-200 shadow-2xl flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                                >
                                    <ChevronLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </button>

                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleNextEvent();
                                    }}
                                    aria-label="Siguiente evento"
                                    className="pointer-events-auto min-h-[44px] min-w-[44px] p-2 sm:p-3 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full border border-white/20 active:scale-90 transition-transform duration-200 shadow-2xl flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 cursor-pointer"
                                >
                                    <ChevronRight className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </button>
                            </div>
                        )}

                        {/* Status & Vibe Badges */}
                        <div className="absolute top-4 left-4 sm:top-6 sm:left-6 flex flex-wrap gap-2 z-20">
                            <div className={`px-3 py-1 text-[11px] font-black uppercase rounded-xl border shadow-lg ${
                                dateInfo.statusColor === 'emerald' ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' :
                                dateInfo.statusColor === 'rose' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' :
                                dateInfo.statusColor === 'slate' ? 'bg-slate-800/80 text-slate-300 border-slate-700' :
                                'bg-blue-500/20 text-blue-300 border-blue-500/40'
                            }`}>
                                {dateInfo.statusLabel}
                            </div>

                            {event.vibe && (
                                <div className="px-3 py-1 bg-amber-400 text-slate-950 text-[11px] font-black uppercase rounded-xl shadow-lg">
                                    {event.vibe}
                                </div>
                            )}

                            {priceInfo.displayLabel && (
                                <div className={`px-3 py-1 text-[11px] font-black uppercase rounded-xl shadow-lg border ${
                                    priceInfo.isFree
                                        ? 'bg-green-500/20 text-green-300 border-green-500/40'
                                        : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                }`}>
                                    {priceInfo.displayLabel}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="px-4 sm:px-8 pb-8 pt-4 bg-slate-900 flex-1 relative z-20">
                        {/* Event Title & Description */}
                        <div className="flex flex-col items-center text-center mb-6">
                            <h2 id="event-modal-title" className="text-xl sm:text-3xl font-black text-white mb-3 leading-tight tracking-tight">
                                {event.title}
                            </h2>

                            {event.description && (
                                <p className="text-slate-300 text-xs sm:text-sm font-normal leading-relaxed max-w-xl mb-4">
                                    {event.description}
                                </p>
                            )}

                            {/* Business / Organizer Info (Semantic Button) */}
                            {targetBusiness && (
                                <div className="mt-4 p-3.5 bg-slate-800/80 rounded-2xl border border-white/5 w-full max-w-md mx-auto relative z-30">
                                    <div className="flex items-center justify-between gap-3">
                                        <button 
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onClose();
                                                setPublicProfileType('business');
                                                setPublicProfileId(targetBusiness.id);
                                                setShowPublicProfile(true);
                                            }}
                                            aria-label={`Ver perfil oficial del organizador ${targetBusiness.name}`}
                                            className="flex items-center gap-3 min-w-0 cursor-pointer group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-xl p-1"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-slate-700 border border-white/10 overflow-hidden shrink-0">
                                                {targetBusiness.imageUrl ? (
                                                    <img src={targetBusiness.imageUrl} alt={targetBusiness.name} width="40" height="40" className="w-full h-full object-cover" />
                                                ) : (
                                                    <div className="w-full h-full flex items-center justify-center text-base">🏪</div>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] text-slate-400 font-bold uppercase tracking-widest leading-none">Organiza</span>
                                                <span className="text-sm font-black text-white group-hover:text-orange-400 transition-colors duration-200 truncate">
                                                    {targetBusiness.name}
                                                </span>
                                            </div>
                                        </button>

                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleToggleFollow(targetBusiness.id);
                                            }}
                                            aria-label={isBusinessFollowed(targetBusiness.id) ? `Dejar de seguir a ${targetBusiness.name}` : `Seguir a ${targetBusiness.name}`}
                                            className={`min-h-[44px] min-w-[44px] px-3 py-1.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors duration-200 flex items-center justify-center gap-1.5 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                                                isBusinessFollowed(targetBusiness.id)
                                                    ? 'bg-orange-500 text-white'
                                                    : 'bg-white/5 text-slate-300 hover:text-white border border-white/10'
                                            }`}
                                        >
                                            {isBusinessFollowed(targetBusiness.id) ? <UserCheck className="w-3.5 h-3.5" /> : <UserPlus className="w-3.5 h-3.5" />}
                                            <span className="hidden sm:inline">{isBusinessFollowed(targetBusiness.id) ? 'Siguiendo' : 'Seguir'}</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Date & Location Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
                            <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5 flex items-start gap-3">
                                <div className="p-2.5 bg-orange-500/10 rounded-xl shrink-0">
                                    <Clock className="w-5 h-5 text-orange-400" />
                                </div>
                                <div className="min-w-0">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-0.5">Fecha y Hora (Ecuador)</span>
                                    <p className="text-white font-black text-sm sm:text-base leading-snug">{dateInfo.dateStr}</p>
                                    <p className="text-orange-400 text-xs font-bold mt-0.5">{dateInfo.timeStr} hs</p>
                                </div>
                            </div>

                            <div className="bg-slate-800/60 rounded-2xl p-4 border border-white/5 flex items-start gap-3">
                                <div className="p-2.5 bg-sky-500/10 rounded-xl shrink-0">
                                    <MapPin className="w-5 h-5 text-sky-400" />
                                </div>
                                <div className="min-w-0 flex-1">
                                    <span className="text-[10px] text-slate-400 font-black uppercase tracking-wider block mb-0.5">Ubicación</span>
                                    <p className="text-white font-black text-sm sm:text-base leading-snug truncate">
                                        {event.locality || targetBusiness?.locality || 'Montañita'}
                                    </p>
                                    <p className="text-slate-400 text-xs mt-0.5 truncate">
                                        {targetBusiness?.address || targetBusiness?.name || (event.sector ? `Sector ${event.sector}` : 'Centro')}
                                    </p>
                                </div>
                                {event.coordinates && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            window.open(`https://www.google.com/maps/dir/?api=1&destination=${event.coordinates![0]},${event.coordinates![1]}`, '_blank');
                                        }}
                                        aria-label="Cómo llegar al evento en Google Maps"
                                        className="min-h-[44px] min-w-[44px] p-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 flex items-center justify-center text-sky-400 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400"
                                        title="Cómo llegar"
                                    >
                                        <Navigation className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Personas Interesadas (Honest Counter backed by database) */}
                        <div className="bg-slate-800/40 rounded-2xl p-4 border border-white/5 mb-5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="p-2.5 bg-orange-500/10 text-orange-400 rounded-xl">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-slate-400 font-black uppercase tracking-wider">Confirmaciones</p>
                                    <p className="text-lg font-black text-white">{Math.max(0, event.interestedCount || 0)} personas interesadas</p>
                                </div>
                            </div>

                            {/* RSVP Button */}
                            <button
                                type="button"
                                onClick={onRsvp}
                                aria-label={isRsvp ? "Cancelar confirmación de asistencia" : "Confirmar asistencia al evento"}
                                className={`min-h-[44px] px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider shadow-lg transition-transform duration-200 active:scale-95 flex items-center gap-2 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                                    isRsvp
                                        ? 'bg-emerald-500 text-white shadow-emerald-500/30'
                                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/25 hover:from-orange-600 hover:to-amber-600'
                                }`}
                            >
                                <Users className="w-4 h-4" />
                                <span>{isRsvp ? '¡Asistiré!' : 'Me Interesa / Asistir'}</span>
                            </button>
                        </div>

                        {/* Action Buttons & Contact (Only rendered if real data exists) */}
                        <div className="space-y-3">
                            {targetBusiness && targetBusiness.menuUrl && isRestaurant && (
                                <a
                                    href={targetBusiness.menuUrl.startsWith('http') ? targetBusiness.menuUrl : `https://${targetBusiness.menuUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full min-h-[44px] py-3 px-4 bg-pink-500/20 hover:bg-pink-500/30 border border-pink-500/40 text-pink-300 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-colors duration-200"
                                >
                                    <QrCode className="w-4 h-4" />
                                    <span>Ver Carta / Menú Digital</span>
                                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                                </a>
                            )}

                            {targetBusiness && targetBusiness.bookingUrl && (
                                <a
                                    href={targetBusiness.bookingUrl.startsWith('http') ? targetBusiness.bookingUrl : `https://${targetBusiness.bookingUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="w-full min-h-[44px] py-3 px-4 bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/40 text-orange-300 rounded-2xl flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wider transition-colors duration-200"
                                >
                                    <CalendarCheck className="w-4 h-4" />
                                    <span>Reservar Online</span>
                                    <ExternalLink className="w-3.5 h-3.5 opacity-60" />
                                </a>
                            )}

                            {/* Contact Links */}
                            {(whatsappUrl || instagramUrl || facebookUrl || tiktokUrl || youtubeUrl || rawPhone) && (
                                <div className="pt-2">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mb-2">
                                        Contacto del Organizador
                                    </p>
                                    <div className="flex flex-wrap items-center justify-center gap-2">
                                        {whatsappUrl && (
                                            <a
                                                href={whatsappUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`Contactar por WhatsApp a ${targetBusiness?.name || 'organizador'}`}
                                                className="min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-xl text-xs font-bold transition-transform duration-200 active:scale-95 cursor-pointer"
                                            >
                                                <MessageCircle className="w-4 h-4" />
                                                <span>WhatsApp</span>
                                            </a>
                                        )}
                                        {instagramUrl && (
                                            <a
                                                href={instagramUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`Ver Instagram de ${targetBusiness?.name || 'organizador'}`}
                                                className="min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400 border border-pink-500/30 rounded-xl text-xs font-bold transition-transform duration-200 active:scale-95 cursor-pointer"
                                            >
                                                <Instagram className="w-4 h-4" />
                                                <span>Instagram</span>
                                            </a>
                                        )}
                                        {facebookUrl && (
                                            <a
                                                href={facebookUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`Ver Facebook de ${targetBusiness?.name || 'organizador'}`}
                                                className="min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-xl text-xs font-bold transition-transform duration-200 active:scale-95 cursor-pointer"
                                            >
                                                <Facebook className="w-4 h-4" />
                                                <span>Facebook</span>
                                            </a>
                                        )}
                                        {tiktokUrl && (
                                            <a
                                                href={tiktokUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`Ver TikTok de ${targetBusiness?.name || 'organizador'}`}
                                                className="min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-teal-500/10 hover:bg-teal-500/20 text-teal-400 border border-teal-500/30 rounded-xl text-xs font-bold transition-transform duration-200 active:scale-95 cursor-pointer"
                                            >
                                                <TikTokIcon className="w-4 h-4" />
                                                <span>TikTok</span>
                                            </a>
                                        )}
                                        {youtubeUrl && (
                                            <a
                                                href={youtubeUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={`Ver YouTube de ${targetBusiness?.name || 'organizador'}`}
                                                className="min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-xl text-xs font-bold transition-transform duration-200 active:scale-95 cursor-pointer"
                                            >
                                                <Youtube className="w-4 h-4" />
                                                <span>YouTube</span>
                                            </a>
                                        )}
                                        {rawPhone && (
                                            <a
                                                href={`tel:${rawPhone}`}
                                                aria-label={`Llamar a ${targetBusiness?.name || 'organizador'}`}
                                                className="min-h-[44px] min-w-[44px] flex items-center gap-1.5 px-3.5 py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 rounded-xl text-xs font-bold transition-transform duration-200 active:scale-95 cursor-pointer"
                                            >
                                                <Phone className="w-4 h-4" />
                                                <span>Llamar</span>
                                            </a>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};