import React from 'react';
import { Calendar as CalendarIcon, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { MontanitaEvent, UserProfile, AgendaRange } from '../types';
import { EventCard } from '../components/EventCard';

import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const Calendar: React.FC = () => {
    const { user } = useAuthContext();
    const {
        events,
        agendaRange,
        setAgendaRange,
        calendarBaseDate,
        setCalendarBaseDate,
        setSelectedEvent: onSelectEvent
    } = useData();

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
            return `${calendarBaseDate.getDate()} - ${end.getDate()} ${end.toLocaleDateString('es-ES', { month: 'short' })}`;
        }
        return calendarBaseDate.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });
    };

    return (
        <div className="flex flex-col h-full bg-[#020617] overflow-y-auto no-scrollbar pb-32">
            {/* Header / Tabs */}
            <div className="p-6 pt-6 space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-sky-500 rounded-xl flex items-center justify-center shadow-lg shadow-sky-500/20">
                            <CalendarIcon className="w-6 h-6 text-white" />
                        </div>
                        <h1 className="text-xl font-black text-white tracking-tight">Pulse Calendar</h1>
                    </div>
                    <div className="flex gap-2">
                        <button className="p-2.5 bg-slate-900 rounded-[1rem] border border-white/5 text-slate-400"><Search className="w-5 h-5" /></button>
                        <div className="w-10 h-10 rounded-full border-2 border-orange-500/50 p-0.5"><img src={user?.avatarUrl || "https://i.pravatar.cc/100?u=123"} className="w-full h-full rounded-full object-cover" /></div>
                    </div>
                </div>

                <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 relative items-center">
                    <button
                        onClick={() => navigateCalendar('prev')}
                        className="absolute -left-12 p-3 text-slate-500 hover:text-sky-400 hover:bg-white/5 rounded-full transition-all active:scale-90"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <div className="flex-1 flex gap-1">
                        {(['day', 'week', 'month'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => {
                                    setAgendaRange(range);
                                    setCalendarBaseDate(new Date());
                                }}
                                className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all ${agendaRange === range ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-500 hover:text-slate-400'}`}
                            >
                                {range === 'day' ? 'Daily' : range === 'week' ? 'Weekly' : 'Monthly'}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={() => navigateCalendar('next')}
                        className="absolute -right-12 p-3 text-slate-500 hover:text-sky-400 hover:bg-white/5 rounded-full transition-all active:scale-90"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <h2 className="text-3xl font-black text-white tracking-tighter capitalize">
                            {getCalendarTitle()}
                        </h2>
                        <p className="text-[10px] text-slate-500 font-bold tracking-[0.2em] uppercase">
                            {agendaRange === 'day' ? 'Pulso Diario' : agendaRange === 'week' ? 'Semana a la vista' : 'Cartelera Mensual'}
                        </p>
                    </div>

                    {calendarBaseDate.toDateString() !== new Date().toDateString() && (
                        <button
                            onClick={() => setCalendarBaseDate(new Date())}
                            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-[10px] font-black text-sky-400 uppercase tracking-widest hover:bg-white/10 transition-all"
                        >
                            Hoy
                        </button>
                    )}
                </div>
            </div>

            <div className="px-6 space-y-8">
                {agendaRange === 'day' ? (
                    <>
                        {/* Day Vibes filtering logic updated to use calendarBaseDate */}
                        {(() => {
                            const dayEvents = events.filter(e => {
                                const eventDate = new Date(e.startAt);
                                return eventDate.getDate() === calendarBaseDate.getDate() &&
                                    eventDate.getMonth() === calendarBaseDate.getMonth() &&
                                    eventDate.getFullYear() === calendarBaseDate.getFullYear();
                            }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

                            if (dayEvents.length === 0) {
                                return <div className="py-20 text-center"><p className="text-slate-500 text-sm italic">Nothing happening on this day.</p></div>;
                            }

                            return (
                                <div className="space-y-6">
                                    {dayEvents.map(event => (
                                        <EventCard key={event.id} event={event} onClick={onSelectEvent} />
                                    ))}
                                </div>
                            );
                        })()}
                    </>
                ) : agendaRange === 'week' ? (
                    <div className="space-y-8">
                        {Array.from({ length: 7 }).map((_, i) => {
                            const date = new Date(calendarBaseDate);
                            date.setDate(date.getDate() + i);
                            const dayEvents = events.filter(e => {
                                const eDate = new Date(e.startAt);
                                return eDate.getDate() === date.getDate() &&
                                    eDate.getMonth() === date.getMonth() &&
                                    eDate.getFullYear() === date.getFullYear();
                            }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

                            if (dayEvents.length === 0) return null;

                            return (
                                <div key={i} className="space-y-3">
                                    <div className="sticky top-0 z-10 bg-[#020617]/95 backdrop-blur-md py-2 border-b border-white/5">
                                        <h3 className="text-lg font-black text-rose-500">
                                            {date.toLocaleDateString('es-ES', { weekday: 'long' })}
                                            <span className="text-slate-500 text-sm font-bold ml-2">
                                                {date.toLocaleDateString('es-ES', { month: 'short', day: 'numeric' })}
                                            </span>
                                        </h3>
                                    </div>
                                    {dayEvents.map(event => (
                                        <EventCard key={event.id} event={event} onClick={onSelectEvent} />
                                    ))}
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="grid gap-4">
                        {events.filter(e => {
                            const eDate = new Date(e.startAt);
                            return eDate.getMonth() === calendarBaseDate.getMonth() &&
                                eDate.getFullYear() === calendarBaseDate.getFullYear();
                        }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime()).length > 0 ? (
                            events.filter(e => {
                                const eDate = new Date(e.startAt);
                                return eDate.getMonth() === calendarBaseDate.getMonth() &&
                                    eDate.getFullYear() === calendarBaseDate.getFullYear();
                            }).sort((a, b) => a.startAt.getTime() - b.startAt.getTime()).map(event => (
                                <div key={event.id} className="relative pl-6 border-l-2 border-slate-800 hover:border-sky-500 transition-colors">
                                    <div className="absolute top-0 left-[-5px] w-2.5 h-2.5 rounded-full bg-slate-800 ring-4 ring-[#020617] group-hover:bg-sky-500 transition-colors"></div>
                                    <p className="text-[10px] font-black text-sky-400 uppercase tracking-widest mb-1">
                                        {new Date(event.startAt).toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric' })} • {new Date(event.startAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </p>
                                    <EventCard event={event} onClick={onSelectEvent} />
                                </div>
                            ))
                        ) : (
                            <p className="text-slate-500 text-center py-10 italic">No hay eventos para este mes.</p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
