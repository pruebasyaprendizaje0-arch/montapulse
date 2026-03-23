import React from 'react';
import { Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight, Plus, MapPin } from 'lucide-react';
import { MontanitaEvent, Vibe, Sector, SubscriptionPlan } from '../types';
import { useData } from '../context/DataContext';

// Vibe badge color map
const VIBE_COLORS: Record<string, string> = {
    [Vibe.ADRENALINA]: 'bg-orange-400 text-black',
    [Vibe.RELAX]: 'bg-yellow-400 text-black',
    [Vibe.TECHNO]: 'bg-purple-500 text-white',
    [Vibe.FAMILIA]: 'bg-yellow-400 text-black',
    [Vibe.WELLNESS]: 'bg-emerald-400 text-black',
    [Vibe.FIESTA]: 'bg-orange-600 text-white',
    [Vibe.SURF]: 'bg-sky-400 text-white',
    [Vibe.GASTRONOMIA]: 'bg-orange-500 text-white',
    [Vibe.FUTBOL]: 'bg-green-500 text-white',
    [Vibe.OTRO]: 'bg-slate-500 text-white',
};

// Generates mock avatar URLs for participant cluster
const MOCK_AVATARS = [
    'https://i.pravatar.cc/40?img=1',
    'https://i.pravatar.cc/40?img=5',
    'https://i.pravatar.cc/40?img=9',
];

interface CalendarEventCardProps {
    event: MontanitaEvent;
    isRsvp: boolean;
    onSelect: (event: MontanitaEvent) => void;
    onRsvp: (id: string) => void;
    businessName?: string;
    locality?: string;
}

const CalendarEventCard: React.FC<CalendarEventCardProps> = ({
    event,
    isRsvp,
    onSelect,
    onRsvp,
    businessName,
    locality,
}) => {
    const startTime = new Date(event.startAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    const endTime = new Date(event.endAt).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false });
    const vibeBg = VIBE_COLORS[event.vibe] || 'bg-amber-400 text-black';
    const displaySector = Object.values(Sector).includes(event.sector as any) ? event.sector : '';
    const locationLabel = [event.locality || locality || businessName, displaySector].filter(Boolean).join(' • ').toUpperCase();

    return (
        <div
            className="relative rounded-3xl overflow-hidden cursor-pointer active:scale-[0.98] transition-transform"
            style={{ height: 220 }}
            onClick={() => onSelect(event)}
        >
            {/* Background Image */}
            <img
                src={event.imageUrl}
                alt={event.title}
                className="absolute inset-0 w-full h-full object-cover"
            />
            {/* Dark Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/20" />

            {/* Top Row: Vibe Badge + Location + Interest */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider ${vibeBg}`}>
                        {event.vibe}
                    </span>
                    {locationLabel && (
                        <span className="flex items-center gap-1 px-3 py-1 bg-black/50 backdrop-blur-sm rounded-full text-[11px] font-bold text-white/90 uppercase tracking-wider">
                            <MapPin className="w-3 h-3 text-cyan-400" />
                            {locationLabel}
                        </span>
                    )}
                </div>
                <div className="text-right">
                    <p className="text-[9px] font-black text-white/60 uppercase tracking-widest">Interest</p>
                    <p className="text-2xl font-black text-white leading-none">{event.interestedCount}</p>
                </div>
            </div>

            {/* Time Range */}
            <div className="absolute top-11 left-4">
                <p className="text-sm font-black text-cyan-400 tracking-wider mt-4">
                    {startTime} - {endTime}
                </p>
            </div>

            {/* Bottom Row: Title + Avatars + Button */}
            <div className="absolute bottom-0 left-0 right-0 p-4 flex items-end justify-between">
                <div>
                    <h3 className="text-xl font-black text-white leading-tight mb-2 drop-shadow-lg">
                        {event.title}
                    </h3>
                    {/* Avatar Cluster */}
                    <div className="flex items-center gap-1">
                        <div className="flex -space-x-2">
                            {MOCK_AVATARS.map((src, i) => (
                                <img
                                    key={i}
                                    src={src}
                                    alt=""
                                    className="w-7 h-7 rounded-full border-2 border-black object-cover"
                                />
                            ))}
                        </div>
                        <span className="text-xs font-black text-white/80 ml-1">+128</span>
                    </div>
                </div>

                {/* RSVP Button */}
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onRsvp(event.id);
                    }}
                    className={`px-5 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all active:scale-90 shadow-lg ${isRsvp
                        ? 'bg-emerald-500 text-white shadow-emerald-500/40'
                        : 'bg-orange-500 text-white shadow-orange-500/40'
                        }`}
                >
                    {isRsvp ? '¡Pulso Sentido!' : 'Interested'}
                </button>
            </div>
        </div>
    );
};

export const Calendar: React.FC = () => {
    const {
        eventsWithLiveCounts,
        businesses,
        agendaRange,
        setAgendaRange,
        calendarBaseDate,
        setCalendarBaseDate,
        setSelectedEvent: onSelectEvent,
        handleOpenNewEventWizard,
        handleRSVP,
        rsvpStatus,
        user,
        events
    } = useData();

    const userBusiness = user?.businessId ? businesses.find(b => b.id === user.businessId) : null;
    const userBusinessEvents = userBusiness ? events.filter(e => e.businessId === userBusiness.id) : [];
    const eventLimit = userBusiness?.plan === SubscriptionPlan.PREMIUM ? 7 : userBusiness?.plan === SubscriptionPlan.BASIC ? 3 : 0;
    const canCreateEvent = userBusiness && userBusinessEvents.length < eventLimit;

    const navigateCalendar = (direction: 'prev' | 'next') => {
        const newDate = new Date(calendarBaseDate);
        if (agendaRange === 'day') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
        } else if (agendaRange === 'week') {
            newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
        } else {
            newDate.setMonth(newDate.getMonth() + (direction === 'next' ? 1 : -1));
        }
        setCalendarBaseDate(newDate);
    };

    const getCalendarTitle = () => {
        if (agendaRange === 'day') {
            const today = new Date();
            if (calendarBaseDate.toDateString() === today.toDateString()) return 'Today';
            return calendarBaseDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'short' });
        }
        if (agendaRange === 'week') {
            const end = new Date(calendarBaseDate);
            end.setDate(end.getDate() + 6);
            const startDay = calendarBaseDate.getDate();
            const endDay = end.getDate();
            const endMonth = end.toLocaleDateString('es-ES', { month: 'short' });
            return `${startDay} - ${endDay} ${endMonth}`;
        }
        return calendarBaseDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    const getSubtitle = () => {
        if (agendaRange === 'day') {
            const today = new Date();
            if (calendarBaseDate.toDateString() === today.toDateString()) return 'EVENTS UNTIL 6:00 AM TOMORROW';
            return 'PULSO DIARIO';
        }
        if (agendaRange === 'week') return 'SEMANA A LA VISTA';
        return 'CARTELERA MENSUAL';
    };

    const RANGE_LABELS = { day: 'Daily', week: 'Weekly', month: 'Monthly' } as const;

    // Filter events for a specific date
    const getEventsForDate = (date: Date) =>
        eventsWithLiveCounts.filter(e => {
            const d = new Date(e.startAt);
            return d.getDate() === date.getDate() &&
                d.getMonth() === date.getMonth() &&
                d.getFullYear() === date.getFullYear();
        }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

    const getBusinessName = (event: MontanitaEvent) =>
        businesses.find(b => b.id === event.businessId)?.name;

    const getLocality = (event: MontanitaEvent) =>
        event.locality || businesses.find(b => b.id === event.businessId)?.locality || '';

    return (
        <div className="flex flex-col h-full bg-slate-950 overflow-y-auto no-scrollbar pb-32">
            {/* ─── Header ─── */}
            <div className="px-5 pt-6 pb-4 space-y-5">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30">
                            <CalendarIcon className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-black text-white tracking-tight">Pulse Calendar</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        {canCreateEvent && (
                            <button
                                onClick={() => handleOpenNewEventWizard(calendarBaseDate)}
                                className="w-10 h-10 bg-orange-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/30 active:scale-90 transition-transform"
                            >
                                <Plus className="w-5 h-5 text-white" />
                            </button>
                        )}
                        <button className="w-10 h-10 bg-white/8 rounded-2xl flex items-center justify-center border border-white/10">
                            <Search className="w-5 h-5 text-slate-400" />
                        </button>
                        <div className="w-10 h-10 rounded-full border-2 border-orange-500/60 p-0.5">
                            <img
                                src={user?.avatarUrl || 'https://i.pravatar.cc/100?u=123'}
                                className="w-full h-full rounded-full object-cover"
                                alt="avatar"
                            />
                        </div>
                    </div>
                </div>

                {/* ─── View Tabs ─── */}
                <div className="relative flex items-center gap-1 bg-[#14141F] p-1 rounded-2xl border border-white/5">
                    <button
                        onClick={() => navigateCalendar('prev')}
                        className="absolute -left-10 p-2 text-slate-500 hover:text-white active:scale-90 transition-all"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>

                    {(['day', 'week', 'month'] as const).map((range) => (
                        <button
                            key={range}
                            onClick={() => { setAgendaRange(range); setCalendarBaseDate(new Date()); }}
                            className={`flex-1 py-2.5 rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${agendaRange === range
                                ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30'
                                : 'text-slate-500 hover:text-slate-300'
                                }`}
                        >
                            {RANGE_LABELS[range]}
                        </button>
                    ))}

                    <button
                        onClick={() => navigateCalendar('next')}
                        className="absolute -right-10 p-2 text-slate-500 hover:text-white active:scale-90 transition-all"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* ─── Date Title ─── */}
                <div className="flex items-end justify-between">
                    <div>
                        <h2 className="text-3xl font-black text-white tracking-tighter capitalize">
                            {getCalendarTitle()}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase mt-1">
                            {getSubtitle()}
                        </p>
                    </div>
                    {calendarBaseDate.toDateString() !== new Date().toDateString() && (
                        <button
                            onClick={() => setCalendarBaseDate(new Date())}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-orange-500 uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Hoy
                        </button>
                    )}
                </div>
            </div>

            {/* ─── Content ─── */}
            <div className="px-5 space-y-6">

                {/* ── DAILY VIEW ── */}
                {agendaRange === 'day' && (() => {
                    const dayEvents = getEventsForDate(calendarBaseDate);
                    if (dayEvents.length === 0) return (
                        <div className="py-20 text-center">
                            <p className="text-slate-600 text-sm italic">Sin eventos para este día.</p>
                        </div>
                    );
                    return (
                        <div className="space-y-4">
                            {dayEvents.map(event => (
                                <CalendarEventCard
                                    key={event.id}
                                    event={event}
                                    isRsvp={!!rsvpStatus[event.id]}
                                    onSelect={onSelectEvent}
                                    onRsvp={handleRSVP}
                                    businessName={getBusinessName(event)}
                                    locality={getLocality(event)}
                                />
                            ))}
                        </div>
                    );
                })()}

                {/* ── WEEKLY VIEW ── */}
                {agendaRange === 'week' && (
                    <div className="space-y-6">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const date = new Date(calendarBaseDate);
                            date.setDate(date.getDate() + i);
                            const dayEvents = getEventsForDate(date);
                            if (dayEvents.length === 0) return null;

                            const isToday = date.toDateString() === new Date().toDateString();
                            return (
                                <div key={i} className="space-y-3">
                                    {/* Day Header */}
                                    <div className="flex items-center gap-3">
                                        <h3 className="text-base font-black capitalize" style={{ color: isToday ? '#F97316' : '#F59E0B' }}>
                                            {date.toLocaleDateString('es-ES', { weekday: 'long' })}
                                        </h3>
                                        <span className="text-slate-500 text-sm font-bold">
                                            {date.getDate()} {date.toLocaleDateString('es-ES', { month: 'short' })}
                                        </span>
                                        {isToday && (
                                            <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-[9px] font-black uppercase rounded-full">Hoy</span>
                                        )}
                                    </div>
                                    {/* Events */}
                                    {dayEvents.map(event => (
                                        <CalendarEventCard
                                            key={event.id}
                                            event={event}
                                            isRsvp={!!rsvpStatus[event.id]}
                                            onSelect={onSelectEvent}
                                            onRsvp={handleRSVP}
                                            businessName={getBusinessName(event)}
                                            locality={getLocality(event)}
                                        />
                                    ))}
                                </div>
                            );
                        })}
                        {/* No events at all */}
                        {Array.from({ length: 7 }).every((_, i) => {
                            const date = new Date(calendarBaseDate);
                            date.setDate(date.getDate() + i);
                            return getEventsForDate(date).length === 0;
                        }) && (
                                <div className="py-20 text-center">
                                    <p className="text-slate-600 text-sm italic">Sin eventos esta semana.</p>
                                </div>
                            )}
                    </div>
                )}

                {/* ── MONTHLY VIEW ── */}
                {agendaRange === 'month' && (() => {
                    const monthEvents = eventsWithLiveCounts.filter(e => {
                        const d = new Date(e.startAt);
                        return d.getMonth() === calendarBaseDate.getMonth() &&
                            d.getFullYear() === calendarBaseDate.getFullYear();
                    }).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());

                    if (monthEvents.length === 0) return (
                        <div className="py-20 text-center">
                            <p className="text-slate-600 text-sm italic">Sin eventos este mes.</p>
                        </div>
                    );

                    // Group by day
                    const grouped: Record<string, MontanitaEvent[]> = {};
                    monthEvents.forEach(event => {
                        const key = new Date(event.startAt).toDateString();
                        if (!grouped[key]) grouped[key] = [];
                        grouped[key].push(event);
                    });

                    return (
                        <div className="space-y-6">
                            {Object.entries(grouped).map(([dateStr, dayEvents]) => {
                                const date = new Date(dateStr);
                                const isToday = date.toDateString() === new Date().toDateString();
                                return (
                                    <div key={dateStr} className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center font-black text-lg ${isToday ? 'bg-orange-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                                                {date.getDate()}
                                            </div>
                                            <div>
                                                <p className="text-sm font-black text-white capitalize">
                                                    {date.toLocaleDateString('es-ES', { weekday: 'long' })}
                                                </p>
                                                <p className="text-[10px] text-slate-500 uppercase tracking-wider">
                                                    {date.toLocaleDateString('es-ES', { month: 'long' })}
                                                </p>
                                            </div>
                                        </div>
                                        {dayEvents.map(event => (
                                            <CalendarEventCard
                                                key={event.id}
                                                event={event}
                                                isRsvp={!!rsvpStatus[event.id]}
                                                onSelect={onSelectEvent}
                                                onRsvp={handleRSVP}
                                                businessName={getBusinessName(event)}
                                                locality={getLocality(event)}
                                            />
                                        ))}
                                    </div>
                                );
                            })}
                        </div>
                    );
                })()}
            </div>
        </div>
    );
};
