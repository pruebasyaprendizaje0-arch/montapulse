import React from 'react';
import { X, Clock, MapPin, Users, MessageCircle, Phone, ChevronLeft, ChevronRight, Edit3, Trash2, Settings } from 'lucide-react';
import { MontanitaEvent, Business } from '../types.ts';
import { SECTOR_INFO } from '../constants.ts';

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
    isRsvp
}) => {
    const sectorStyle = SECTOR_INFO[event.sector];
    const eventDate = new Date(event.startAt);

    const formatDate = () => {
        const day = eventDate.getDate();
        const month = eventDate.toLocaleDateString('es-ES', { month: 'short' });
        return `${day} ${month}`;
    };

    const formatTime = () => {
        return eventDate.toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    const handleWhatsApp = () => {
        if (business?.phone || business?.whatsapp) {
            const phone = business.whatsapp || business.phone;
            window.open(`https://wa.me/${phone}?text=Hola! Vi su evento "${event.title}" en Spondylus Pulse`, '_blank');
        }
    };

    // Keyboard Shortcuts
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' && hasNext) onNext?.();
            if (e.key === 'ArrowLeft' && hasPrevious) onPrevious?.();
            if (e.key === 'Escape') onClose();
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [hasNext, hasPrevious, onNext, onPrevious, onClose]);

    // Import CheckCircle and Zap if not already imported, for now assume MessageCircle/Users are available
    // Actually lines 2 import: X, Clock, MapPin, Users, MessageCircle, Phone, ChevronLeft, ChevronRight, Edit3, Trash2, Settings
    // We can use Users or CheckCircle (add to imports in separate edit if strictly needed, but Zap is good for Pulse)

    return (
        <div
            className="fixed inset-0 z-[2000] bg-black/80 backdrop-blur-sm flex items-end justify-center animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-2xl bg-slate-900 rounded-t-[3rem] overflow-hidden max-h-[95vh] overflow-y-auto animate-in slide-in-from-bottom duration-500"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header with Image */}
                <div className="relative h-96">
                    <img
                        src={event.imageUrl}
                        alt={event.title}
                        className="w-full h-full object-cover"
                    />

                    {/* Gradient Overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent" />

                    {/* Action Buttons */}
                    <div className="absolute top-6 right-6 flex gap-2 z-[2010]">
                        {isAdmin && (
                            <>
                                <button
                                    onClick={() => onEdit?.(event)}
                                    className="w-14 h-14 bg-sky-500 text-white rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform border-4 border-slate-900"
                                >
                                    <Edit3 className="w-6 h-6" />
                                </button>
                                <button
                                    onClick={() => {
                                        if (confirm('¿Estás seguro de eliminar este pulso?')) {
                                            onDelete?.(event.id);
                                        }
                                    }}
                                    className="w-14 h-14 bg-rose-500/20 text-rose-500 border-2 border-rose-500/20 rounded-full flex items-center justify-center shadow-2xl active:scale-90 transition-transform"
                                >
                                    <Trash2 className="w-6 h-6" />
                                </button>
                            </>
                        )}
                        <button
                            onClick={onClose}
                            className="w-14 h-14 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-2xl hover:scale-110 active:scale-95 transition-all border-4 border-slate-900"
                        >
                            <X className="w-6 h-6 stroke-[3px]" />
                        </button>
                    </div>

                    {/* Navigation Buttons - Screen Sides (Shifted to be visible over whole modal) */}
                    <div className="fixed inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-4 z-[2020] pointer-events-none max-w-2xl mx-auto w-full">
                        {hasPrevious && onPrevious ? (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onPrevious();
                                }}
                                className="pointer-events-auto p-5 bg-white/20 backdrop-blur-3xl rounded-full border border-white/30 hover:bg-white/30 active:scale-90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] group"
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
                                className="pointer-events-auto p-5 bg-white/20 backdrop-blur-3xl rounded-full border border-white/30 hover:bg-white/30 active:scale-90 transition-all shadow-[0_0_30px_rgba(255,255,255,0.2)] group"
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
                        <div className={`px-4 py-2 ${sectorStyle.bg} ${sectorStyle.color} text-xs font-black uppercase rounded-xl border ${sectorStyle.color.replace('text-', 'border-')}/30 backdrop-blur-md`}>
                            {event.sector}
                        </div>
                    </div>

                    {/* Event Title at Bottom */}
                    <div className="absolute bottom-0 left-0 right-0 p-8">
                        <h1 className="text-4xl font-black text-white mb-3 leading-tight tracking-tight">
                            {event.title}
                        </h1>
                        {business && (
                            <div className="flex items-center gap-3 mb-2">
                                <div className="relative group/biz">
                                    <img
                                        src={business.imageUrl}
                                        alt={business.name}
                                        className="w-10 h-10 rounded-full border-2 border-white/20 object-cover"
                                    />
                                    {isAdmin && (
                                        <button
                                            onClick={() => onEditBusiness?.(business.id)}
                                            className="absolute -top-1 -right-1 bg-sky-500 p-1.5 rounded-lg shadow-lg opacity-0 group-hover/biz:opacity-100 transition-opacity"
                                        >
                                            <Settings className="w-3 h-3 text-white" />
                                        </button>
                                    )}
                                </div>
                                <div className="flex flex-col">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-none">Publicado por</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-sm font-black text-white">{business.name}</p>
                                        {isAdmin && (
                                            <button
                                                onClick={() => onEditBusiness?.(business.id)}
                                                className="text-sky-400 hover:text-sky-300 transition-colors"
                                            >
                                                <Edit3 className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="p-8 space-y-6">
                    {/* Description */}
                    {event.description && (
                        <div>
                            <p className="text-slate-300 text-sm leading-relaxed">
                                {event.description}
                            </p>
                        </div>
                    )}

                    {/* Event Details Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-rose-500/10 rounded-xl">
                                    <Clock className="w-5 h-5 text-rose-400" />
                                </div>
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Horario</span>
                            </div>
                            <p className="text-white font-black text-lg">{formatDate()}, {formatTime()}</p>
                            <p className="text-slate-400 text-xs mt-1">Hasta {eventDate.getHours() + 3}:00</p>
                        </div>

                        <div className="bg-slate-800/50 rounded-2xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="p-2 bg-sky-500/10 rounded-xl">
                                    <MapPin className="w-5 h-5 text-sky-400" />
                                </div>
                                <span className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Ubicación</span>
                            </div>
                            <p className="text-white font-black text-lg">{business?.locality || 'Montañita'}</p>
                            <p className="text-slate-400 text-xs mt-1">{business?.name}</p>
                        </div>
                    </div>

                    {/* Interest Count */}
                    <div className="bg-gradient-to-br from-sky-500/10 to-indigo-500/10 rounded-2xl p-6 border border-sky-500/20">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-sky-500 rounded-2xl">
                                    <Users className="w-6 h-6 text-white" />
                                </div>
                                <div>
                                    <p className="text-[10px] text-sky-400 font-black uppercase tracking-widest">Personas Interesadas</p>
                                    <p className="text-3xl font-black text-white mt-1">{event.interestedCount}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Contact Buttons */}
                    <div className="pt-4">
                        {/* MAIN ACTION: SENTIR EL PULSO (RSVP) */}
                        <button
                            onClick={onRsvp}
                            className={`w-full py-5 font-black rounded-[2rem] shadow-2xl transition-all flex items-center justify-center gap-3 uppercase tracking-wider relative overflow-hidden group ${isRsvp
                                ? 'bg-emerald-500 text-white shadow-emerald-500/40 hover:bg-emerald-400'
                                : 'bg-gradient-to-r from-rose-500 to-orange-500 text-white shadow-rose-500/30 hover:shadow-rose-500/50'}`}
                        >
                            {/* Animated Pulse Ring if NOT rsvp */}
                            {!isRsvp && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity animate-pulse"></div>}

                            {isRsvp ? (
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
                                    className="flex items-center gap-2 px-6 py-3 bg-green-500/10 text-green-400 rounded-full border border-green-500/20 hover:bg-green-500/20 transition-all"
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
    );
};
