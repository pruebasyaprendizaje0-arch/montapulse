import React from 'react';
import { X, Clock, MapPin, Users, MessageCircle, Phone, ChevronLeft, ChevronRight, Edit3, Trash2, Settings, Share2, UserPlus, UserCheck, QrCode, ExternalLink, Utensils, CalendarCheck } from 'lucide-react';
import { MontanitaEvent, Business, Sector, BusinessCategory } from '../types';
import { Skeleton } from './Skeleton';
import { SECTOR_INFO, BASE_URL } from '../constants';
import { useToast } from '../context/ToastContext';
import { useSEO } from '../hooks/useSEO';
import { useData } from '../context/DataContext';

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

    // Reset error state and loading when event changes
    React.useEffect(() => {
        setImgError(false);
        setIsImageLoading(true);
    }, [event?.id, event?.imageUrl]);

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
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleNextEvent, handlePrev, onClose]);

    if (!event) return null;

    const sectorStyle = SECTOR_INFO[event.sector] || SECTOR_INFO[Sector.CENTRO];

    // Safe date parsing
    let eventDate: Date;
    try {
        eventDate = event.startAt instanceof Date ? event.startAt : new Date(event.startAt);
    } catch { eventDate = new Date(); }

    let eventEndDate: Date | null = null;
    if (event.endAt) {
        try {
            eventEndDate = event.endAt instanceof Date ? event.endAt : new Date(event.endAt);
        } catch { eventEndDate = null; }
    }

    const formatDate = (date: Date) => {
        const day = date.getDate();
        const month = date.toLocaleDateString('es-ES', { month: 'short' });
        return `${day} ${month}`;
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const handleShare = async () => {
        const shareData = {
            title: event.title,
            text: `¡Mira este evento en ubicame.info Pulse!

📅 ${event.title}
📍 Lugar: ${business?.name || 'Local'}
🌍 Localidad: ${business?.locality || 'Montañita'}
🏘️ Sector: ${event.sector}
📝 Descripción: ${event.description || 'Sin descripción'}

¡Descúbrelo en ubicame.info Pulse!`,
            url: BASE_URL + window.location.pathname
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
                showToast('¡Evento compartido!', 'success');
            } else {
                await navigator.clipboard.writeText(`${shareData.text}\n\n${shareData.url}`);
                showToast('Enlace copiado al portapapeles', 'success');
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    return (
        <div
            className="fixed inset-0 z-[4000] bg-black/80 backdrop-blur-md flex flex-col justify-end sm:items-center sm:justify-center p-0 sm:p-4 isolate"
            style={{ WebkitTransform: 'translateZ(0)' }}
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-slate-900 rounded-t-[2.5rem] sm:rounded-[2.5rem] overflow-hidden relative h-[90dvh] sm:h-auto sm:max-h-[85vh] flex flex-col shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-1 h-full overflow-y-auto no-scrollbar min-h-0">
                    {/* Header with Image */}
                    <div className="relative h-64 sm:h-96 w-full bg-slate-900 shrink-0">
                        {/* Fallback gradient - always visible */}
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 via-slate-900 to-pink-900/40" />

                        {/* Loading pulse overlay */}
                        {isImageLoading && !imgError && event.imageUrl && (
                            <div className="absolute inset-0 bg-slate-800/40 animate-pulse z-10" />
                        )}

                        {/* Actual image */}
                        {event.imageUrl && !imgError ? (
                            <img
                                src={event.imageUrl}
                                alt={event.title}
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
                                        onClick={() => onEdit?.(event)}
                                        className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform border-2 border-slate-900"
                                    >
                                        <Edit3 className="w-5 h-5 text-white" />
                                    </button>
                                    <button
                                        onClick={async () => {
                                            if (await showConfirm('¿Estás seguro de eliminar este pulso?', 'Confirmar eliminación')) {
                                                onDelete?.(event.id);
                                            }
                                        }}
                                        className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500/20 text-orange-500 border border-orange-500/20 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                                    >
                                        <Trash2 className="w-5 h-5" />
                                    </button>
                                </>
                            )}
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleShare();
                                }}
                                className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-2 border-slate-900"
                            >
                                <Share2 className="w-5 h-5 text-white" />
                            </button>
                            <button
                                onClick={onClose}
                                className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-2 border-slate-900"
                            >
                                <X className="w-5 h-5 stroke-[3px]" />
                            </button>
                        </div>

                        {/* Directional Navigation Buttons (visible when more than 1 event exists) */}
                        {eventList.length > 1 && (
                            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-3 sm:px-6 z-[2020] pointer-events-none">
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePrev();
                                    }}
                                    title="Publicación anterior"
                                    className="pointer-events-auto p-3 sm:p-4 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full border border-white/20 active:scale-90 transition-all shadow-2xl flex items-center justify-center"
                                >
                                    <ChevronLeft className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </button>

                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleNextEvent();
                                    }}
                                    title="Siguiente publicación"
                                    className="pointer-events-auto p-3 sm:p-4 bg-slate-900/80 hover:bg-slate-900 text-white rounded-full border border-white/20 active:scale-90 transition-all shadow-2xl flex items-center justify-center"
                                >
                                    <ChevronRight className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
                                </button>
                            </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-6 left-6 flex flex-col gap-2 z-20">
                            <div className="px-4 py-2 bg-amber-400 text-black text-xs font-black uppercase rounded-xl shadow-xl">
                                {event.vibe}
                            </div>
                            <div className={`px-4 py-2 ${sectorStyle.bg} ${sectorStyle.color} text-xs font-black uppercase rounded-xl border ${sectorStyle.color.replace('text-', 'border-')}/30`}>
                                {Object.values(Sector).includes(event.sector as any) ? event.sector : (business?.sector || '')}
                            </div>
                        </div>
                    </div>

                    {/* Content Section */}
                    <div className="px-4 sm:px-8 pb-8 pt-4 bg-slate-900 flex-1 relative z-20">
                        {/* Event Title & Description */}
                        <div className="flex flex-col items-center text-center mb-8">
                            <h1 className="text-2xl sm:text-4xl font-black text-white mb-4 leading-tight tracking-tight">
                                {event.title}
                            </h1>

                            {event.description && (
                                <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed max-w-[90%] mb-6">
                                    {event.description}
                                </p>
                            )}

                            {/* Back Button */}
                            <button
                                onClick={onClose}
                                className="flex items-center gap-1.5 px-5 py-2.5 bg-slate-800/80 backdrop-blur-xl hover:bg-slate-800 text-white rounded-full border border-white/20 active:scale-90 transition-all shadow-xl"
                            >
                                <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                                <span className="text-[10px] sm:text-xs font-black uppercase tracking-widest">Volver</span>
                            </button>

                            {/* Business Info */}
                            {targetBusiness ? (
                                <div className="mt-8 p-4 bg-slate-800/80 rounded-3xl border border-white/5 w-full max-w-md mx-auto relative z-30">
                                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                                        <div className="flex items-center gap-3 flex-1 w-full">
                                            <div
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onClose) onClose();
                                                    setPublicProfileType('business');
                                                    setPublicProfileId(targetBusiness.id);
                                                    setShowPublicProfile(true);
                                                }}
                                                className="relative group cursor-pointer"
                                            >
                                                <img
                                                    src={targetBusiness.imageUrl}
                                                    alt={targetBusiness.name}
                                                    className="w-10 h-10 rounded-full border-2 border-white/20 object-cover shadow-2xl"
                                                />
                                                {isAdmin && (
                                                    <button
                                                        onClick={(e) => { e.stopPropagation(); onEditBusiness?.(targetBusiness.id); }}
                                                        className="absolute -top-1 -right-1 bg-orange-500 p-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                                    >
                                                        <Settings className="w-3 h-3 text-white" />
                                                    </button>
                                                )}
                                            </div>
                                            <div 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    if (onClose) onClose();
                                                    setPublicProfileType('business');
                                                    setPublicProfileId(targetBusiness.id);
                                                    setShowPublicProfile(true);
                                                }}
                                                className="flex flex-col items-start flex-1 min-w-0 cursor-pointer group/pub"
                                            >
                                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none group-hover/pub:text-orange-400 transition-colors">Publicado por</p>
                                                <div className="flex items-center gap-2">
                                                    <p className="text-sm font-black text-white truncate group-hover/pub:text-orange-400 transition-colors">{targetBusiness.name}</p>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 w-full sm:w-auto">
                                            {targetBusiness.menuUrl && isRestaurant && (
                                                <a
                                                    href={targetBusiness.menuUrl.startsWith('http') ? targetBusiness.menuUrl : `https://${targetBusiness.menuUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-pink-500/20 text-pink-300 border border-pink-500/30 hover:bg-pink-500/30 transition-all shadow-lg shadow-pink-500/10"
                                                    title="Ver Menú / Carta Digital"
                                                >
                                                    <QrCode className="w-3.5 h-3.5 text-pink-400" />
                                                    <span>Menú</span>
                                                </a>
                                            )}
                                            {targetBusiness.bookingUrl && (
                                                <a
                                                    href={targetBusiness.bookingUrl.startsWith('http') ? targetBusiness.bookingUrl : `https://${targetBusiness.bookingUrl}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    onClick={(e) => e.stopPropagation()}
                                                    className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest bg-orange-500/20 text-orange-300 border border-orange-500/30 hover:bg-orange-500/30 transition-all shadow-lg shadow-orange-500/10"
                                                    title="Reservar Online"
                                                >
                                                    <CalendarCheck className="w-3.5 h-3.5 text-orange-400" />
                                                    <span>Reservas</span>
                                                </a>
                                            )}
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleFollow(targetBusiness.id);
                                                }}
                                                className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                                    isBusinessFollowed(targetBusiness.id)
                                                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20'
                                                        : 'bg-white/5 text-white border border-white/10'
                                                }`}
                                            >
                                                {isBusinessFollowed(targetBusiness.id) ? (
                                                    <>
                                                        <UserCheck className="w-3.5 h-3.5" />
                                                        <span>Siguiendo</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <UserPlus className="w-3.5 h-3.5" />
                                                        <span>Seguir</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center gap-3 p-2 px-4 rounded-2xl border border-white/5 bg-slate-800/20">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center text-white font-bold text-xs border border-white/10">
                                        📍
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Ubicación</p>
                                        <p className="text-sm font-black text-white">{event.locality || 'Montañita'}</p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Date & Location Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-orange-500/10 rounded-xl">
                                        <Clock className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Horario</span>
                                </div>
                                <p className="text-white font-black text-base sm:text-lg">{formatDate(eventDate)}, {formatTime(eventDate)}</p>
                                {eventEndDate && (
                                    <p className="text-slate-400 text-xs mt-1">
                                        Hasta {formatDate(eventEndDate)}, {formatTime(eventEndDate)}
                                    </p>
                                )}
                            </div>

                            <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-orange-500/10 rounded-xl">
                                        <MapPin className="w-5 h-5 text-orange-400" />
                                    </div>
                                    <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Ubicación</span>
                                </div>
                                <p className="text-white font-black text-base sm:text-lg">{event.locality || business?.locality || 'Montañita'}</p>
                                <p className="text-slate-400 text-xs mt-1 truncate">{business?.name || event.sector}</p>
                            </div>
                        </div>

                        {/* Interest Card */}
                        <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl p-6 border border-orange-500/20 mb-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-orange-500 rounded-2xl">
                                        <Users className="w-6 h-6 text-white" />
                                    </div>
                                    <div>
                                        <p className="text-[10px] text-orange-400 font-black uppercase tracking-widest">Personas Interesadas</p>
                                        <p className="text-3xl font-black text-white mt-1">{Math.max(0, event.interestedCount || 0)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Botones de Acción y RSVP */}
                        <div className="pt-4 space-y-3">
                            {/* Botón Ver Menú / Carta Digital para Restaurantes */}
                            {targetBusiness && targetBusiness.menuUrl && isRestaurant && (
                                <a
                                    href={targetBusiness.menuUrl.startsWith('http') ? targetBusiness.menuUrl : `https://${targetBusiness.menuUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-pink-500/20 group border border-white/10 text-white flex items-center justify-center gap-2.5 font-black uppercase text-xs tracking-wider"
                                >
                                    <QrCode className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
                                    <span>Ver Menú / Carta Digital</span>
                                    <ExternalLink className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </a>
                            )}

                            {/* Botón Reservar Online */}
                            {targetBusiness && targetBusiness.bookingUrl && (
                                <a
                                    href={targetBusiness.bookingUrl.startsWith('http') ? targetBusiness.bookingUrl : `https://${targetBusiness.bookingUrl}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="w-full py-4 px-6 bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-600 rounded-[2rem] hover:scale-[1.02] active:scale-95 transition-all shadow-xl shadow-orange-500/20 group border border-white/10 text-white flex items-center justify-center gap-2.5 font-black uppercase text-xs tracking-wider"
                                >
                                    <CalendarCheck className="w-5 h-5 text-white group-hover:scale-110 transition-transform" />
                                    <span>Reservar Online</span>
                                    <ExternalLink className="w-4 h-4 text-white/80 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                                </a>
                            )}

                            {/* Botón RSVP */}
                            <button
                                onClick={onRsvp}
                                className={`w-full py-5 font-black rounded-[2rem] shadow-2xl flex items-center justify-center gap-3 uppercase tracking-wider relative overflow-hidden transition-all active:scale-95 group ${(event as any).isPulsing
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/40 animate-rsvp-pulse'
                                    : isRsvp
                                        ? 'bg-emerald-500 text-white shadow-emerald-500/40'
                                        : 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-orange-500/30'
                                    }`}
                            >
                                {(event as any).isPulsing || isRsvp ? (
                                    <>
                                        <Users className="w-6 h-6" />
                                        <span>¡Pulso Sentido!</span>
                                    </>
                                ) : (
                                    <>
                                        <MessageCircle className="w-6 h-6" />
                                        <span>Sentir el Pulso</span>
                                    </>
                                )}
                            </button>

                            {targetBusiness?.whatsapp && (
                                <div className="mt-4 flex flex-col items-center gap-2">
                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Contacto Directo</p>
                                    <a
                                        href={`https://wa.me/${targetBusiness.whatsapp}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-400 rounded-full border border-green-500/20"
                                    >
                                        <MessageCircle className="w-4 h-4" />
                                        <span className="font-bold text-sm">WhatsApp</span>
                                    </a>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};