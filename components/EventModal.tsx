import React from 'react';
import { X, Clock, MapPin, Users, MessageCircle, Phone, ChevronLeft, ChevronRight, Edit3, Trash2, Settings, Share2, UserPlus, UserCheck } from 'lucide-react';
import { MontanitaEvent, Business, Sector } from '../types';
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
    hasNext: boolean;
    hasPrevious: boolean;
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
    hasNext,
    hasPrevious,
    isAdmin,
    onEdit,
    onDelete,
    onEditBusiness,
    onRsvp,
    isRsvp,
    dataLoading
}) => {
    const [imgError, setImgError] = React.useState(false);
    const { showToast, showConfirm } = useToast();
    const { setShowPublicProfile, setPublicProfileId, setPublicProfileType, handleToggleFollow, isBusinessFollowed } = useData();

    useSEO({
        title: event?.title || 'Evento',
        description: event?.description || `Descubre el evento en ubicame.info PULSE.`,
        image: event?.imageUrl,
        url: BASE_URL + window.location.pathname
    });

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && hasNext) onNext?.();
            if (e.key === 'ArrowLeft' && hasPrevious) onPrevious?.();
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasNext, hasPrevious, onNext, onPrevious, onClose]);

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

    const handleWhatsApp = () => {
        if (business?.phone || business?.whatsapp) {
            const phone = business.whatsapp || business.phone;
            window.open(`https://wa.me/${phone}?text=Hola! Vi su evento "${event.title}" en ubicame.info Pulse`, '_blank');
        }
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
${business?.whatsapp ? `📱 WhatsApp: ${business.whatsapp}` : ''}
${business?.phone ? `📞 Teléfono: ${business.phone}` : ''}

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
            className="antigravity fixed inset-0 z-[4000] bg-black/80 backdrop-blur-sm flex items-end justify-center"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-slate-900 rounded-t-[3rem] overflow-hidden h-full max-h-[92dvh] flex flex-col"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex-1 overflow-y-auto no-scrollbar">
                {/* Header with Image */}
                <div className="relative h-64 sm:h-96">
                    {/* Fallback gradient - always visible */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-900/60 via-slate-900 to-pink-900/40" />

                    {/* Actual image - overlays the gradient */}
                    {event.imageUrl && !imgError ? (
                        <img
                            src={event.imageUrl}
                            alt={event.title}
                            className="absolute inset-0 w-full h-full object-cover"
                            loading="lazy"
                            onLoad={(e) => {
                                e.currentTarget.style.opacity = '1';
                            }}
                            onError={() => setImgError(true)}
                            style={{ opacity: 0, transition: 'opacity 0.3s ease' }}
                        />
                    ) : null}

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 via-transparent to-transparent" />

                    {/* Action Buttons */}
                    <div className="absolute top-4 right-4 sm:top-6 sm:right-6 flex gap-2 z-[2010]">
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => onEdit?.(event)}
                                    className="w-10 h-10 sm:w-14 sm:h-14 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform border-2 sm:border-4 border-slate-900"
                                  >
                                    <Edit3 className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                                <button
                                    onClick={async () => {
                                        if (await showConfirm('¿Estás seguro de eliminar este pulso?', 'Confirmar eliminación')) {
                                            onDelete?.(event.id);
                                        }
                                    }}
                                    className="w-10 h-10 sm:w-14 sm:h-14 bg-orange-500/20 text-orange-500 border border-orange-500/20 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                                >
                                    <Trash2 className="w-5 h-5 sm:w-6 sm:h-6" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                handleShare();
                            }}
                            className="w-10 h-10 sm:w-14 sm:h-14 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-2 sm:border-4 border-slate-900"
                        >
                            <Share2 className="w-5 h-5 sm:w-6 sm:h-6" />
                        </button>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 sm:w-14 sm:h-14 bg-orange-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-2 sm:border-4 border-slate-900"
                        >
                            <X className="w-5 h-5 sm:w-6 sm:h-6 stroke-[3px]" />
                        </button>
                    </div>

                    {/* Navigation Buttons */}
                    <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 z-[2020] pointer-events-none max-w-2xl mx-auto w-full">
                        {hasPrevious && onPrevious ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPrevious();
                                }}
                                className="pointer-events-auto p-5 bg-white/20 rounded-full border border-white/30 hover:bg-white/30 active:scale-90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] group"
                            >
                                <ChevronLeft className="w-10 h-10 text-white group-hover:-translate-x-1 transition-transform" />
                            </button>
                        ) : <div />}

                        {hasNext && onNext ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onNext();
                                }}
                                className="pointer-events-auto p-5 bg-white/20 rounded-full border border-white/30 hover:bg-white/30 active:scale-90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] group"
                            >
                                <ChevronRight className="w-10 h-10 text-white group-hover:translate-x-1 transition-transform" />
                            </button>
                        ) : <div />}
                    </div>

                    {/* Badges */}
                    <div className="absolute top-6 left-6 flex flex-col gap-2">
                        <div className="px-4 py-2 bg-amber-400 text-black text-xs font-black uppercase rounded-xl shadow-xl">
                            {event.vibe}
                        </div>
                        <div className={`px-4 py-2 ${sectorStyle.bg} ${sectorStyle.color} text-xs font-black uppercase rounded-xl border ${sectorStyle.color.replace('text-', 'border-')}/30`}>
                            {Object.values(Sector).includes(event.sector as any) ? event.sector : (business?.sector || '')}
                        </div>
                    </div>
                </div>

                {/* Content - SIN ANIMACIONES PARA EVITAR PROBLEMAS EN MOVIL */}
                <div className="p-8 pt-6">
                    {/* Event Title, Description, and Author */}
                    <div className="flex flex-col items-center text-center mb-8">
                        <h1 className="text-3xl sm:text-4xl font-black text-white mb-4 leading-tight tracking-tight">
                            {event.title}
                        </h1>

                        {event.description && (
                            <p className="text-slate-300 text-sm sm:text-base font-medium leading-relaxed max-w-[90%] mb-6">
                                {event.description}
                            </p>
                        )}

                        {business ? (
                            <div className="flex items-center gap-3">
                                <div 
                                    className="flex items-center gap-3 cursor-pointer hover:bg-white/5 p-2 px-4 rounded-2xl transition-colors border border-white/5 bg-slate-800/20"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (onClose) onClose();
                                        setPublicProfileType('business');
                                        setPublicProfileId(business.id);
                                        setShowPublicProfile(true);
                                    }}
                                >
                                    <div className="relative group">
                                        <img
                                            src={business.imageUrl}
                                            alt={business.name}
                                            className="w-10 h-10 rounded-full border-2 border-white/20 object-cover shadow-2xl"
                                        />
                                        {isAdmin && (
                                            <button
                                                onClick={() => onEditBusiness?.(business.id)}
                                                className="absolute -top-1 -right-1 bg-orange-500 p-1.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <Settings className="w-3 h-3 text-white" />
                                            </button>
                                        )}
                                    </div>
                                    <div className="flex flex-col items-start">
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Publicado por</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-sm font-black text-white">{business.name}</p>
                                            {isAdmin && (
                                                <button
                                                    onClick={() => onEditBusiness?.(business.id)}
                                                    className="text-orange-400 hover:text-orange-300 transition-colors"
                                                >
                                                    <Edit3 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleFollow(business.id);
                                    }}
                                    className={`flex items-center gap-1.5 px-4 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all ${
                                        isBusinessFollowed(business.id)
                                            ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600'
                                            : 'bg-white/5 text-white border border-white/10 hover:bg-white/10'
                                    }`}
                                >
                                    {isBusinessFollowed(business.id) ? (
                                        <>
                                            <UserCheck className="w-3.5 h-3.5 animate-in zoom-in duration-200" />
                                            <span>Siguiendo</span>
                                        </>
                                    ) : (
                                        <>
                                            <UserPlus className="w-3.5 h-3.5 animate-in zoom-in duration-200" />
                                            <span>Seguir</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        ) : dataLoading ? (
                            <div className="flex items-center gap-3">
                                <Skeleton className="w-10 h-10 rounded-full" />
                                <div className="flex flex-col gap-1">
                                    <Skeleton className="w-16 h-2" />
                                    <Skeleton className="w-24 h-4" />
                                </div>
                            </div>
                        ) : null}
                    </div>
                    <div className="grid grid-cols-2 gap-4 mb-6">
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-orange-500/10 rounded-xl">
                                    <Clock className="w-5 h-5 text-orange-400" />
                                </div>
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Horario</span>
                            </div>
                            <p className="text-white font-black text-lg">{formatDate(eventDate)}, {formatTime(eventDate)}</p>
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
                            <p className="text-white font-black text-lg">{event.locality || business?.locality || 'Montañita'}</p>
                            <p className="text-slate-400 text-xs mt-1">{business?.name}</p>
                        </div>
                    </div>

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

                    {/* Botón RSVP */}
                    <div className="pt-4">
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

                        {business?.whatsapp && (
                            <div className="mt-4 flex flex-col items-center gap-2">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Contacto Directo</p>
                                <a
                                    href={`https://wa.me/${business.whatsapp}`}
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