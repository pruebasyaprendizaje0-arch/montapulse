import React from 'react';
import { X, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Sparkles, Plus } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { Sector } from '../../types';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, isToday } from 'date-fns';
import { es } from 'date-fns/locale';

interface CalendarModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const CalendarModal: React.FC = () => {
    const {
        calendarBaseDate,
        setCalendarBaseDate,
        events,
        setIsCalendarFilterActive,
        showCalendarModal,
        setShowCalendarModal,
        handleOpenNewEventWizard,
        user,
        businesses,
        setSelectedEvent
    } = useData();

    if (!showCalendarModal) return null;

    const onClose = () => setShowCalendarModal(false);

    const monthStart = startOfMonth(calendarBaseDate);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const days = eachDayOfInterval({
        start: startDate,
        end: endDate,
    });

    const nextMonth = () => setCalendarBaseDate(addMonths(calendarBaseDate, 1));
    const prevMonth = () => setCalendarBaseDate(subMonths(calendarBaseDate, 1));

    const getEventsForDay = (day: Date) => {
        return events.filter(event => isSameDay(new Date(event.startAt), day));
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6 pb-24 md:pb-6">
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg bg-slate-900/40 backdrop-blur-3xl border border-white/20 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.8)] overflow-hidden animate-in zoom-in-95 duration-500 flex flex-col max-h-[90vh]">
                {/* Decorative Window Border Glow */}
                <div className="absolute inset-0 rounded-[3rem] border border-sky-500/20 pointer-events-none" />
                {/* Header */}
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/[0.02]">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-sky-500/20 rounded-2xl border border-sky-500/30">
                            <CalendarIcon className="w-5 h-5 text-sky-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-white uppercase tracking-tight italic">VENTANA DE CALENDARIO</h2>
                            <p className="text-[10px] font-black text-sky-500 uppercase tracking-[0.2em] leading-none mt-1">Explora el Pulso del Tiempo</p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {(user?.role === 'host' || user?.role === 'admin') && (
                            <div className="group relative">
                                <button
                                    onClick={() => {
                                        handleOpenNewEventWizard(calendarBaseDate);
                                        onClose();
                                    }}
                                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-sky-500/20 active:scale-95 border border-white/10"
                                >
                                    <Plus className="w-4 h-4" />
                                    <span className="hidden sm:inline">Crear Pulso</span>
                                </button>
                                {/* Tooltip */}
                                <div className="absolute -bottom-10 left-1/2 -translate-x-1/2 bg-slate-800 border border-white/10 px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none translate-y-1 group-hover:translate-y-0 shadow-2xl z-50">
                                    <span className="text-[8px] font-black text-white uppercase tracking-widest whitespace-nowrap">Agendar evento para esta fecha</span>
                                </div>
                            </div>
                        )}
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Month Selector */}
                <div className="px-6 py-4 flex items-center justify-between">
                    <button
                        onClick={prevMonth}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-sm font-black text-white uppercase tracking-[0.2em] italic">
                        {format(calendarBaseDate, 'MMMM yyyy', { locale: es })}
                    </h3>
                    <button
                        onClick={nextMonth}
                        className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <ChevronRight className="w-5 h-5" />
                    </button>
                </div>

                {/* Calendar Grid */}
                <div className="px-6 pb-6 overflow-y-auto no-scrollbar">
                    {/* Days Review */}
                    <div className="grid grid-cols-7 mb-2">
                        {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((day, idx) => (
                            <div key={idx} className="text-center text-[10px] font-black text-slate-600 uppercase tracking-widest py-2">
                                {day}
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-7 gap-1.5">
                        {days.map((day, idx) => {
                            const dayEvents = getEventsForDay(day);
                            const hasPremium = dayEvents.some(e => e.isPremium);
                            const isSelected = isSameDay(day, calendarBaseDate);
                            const isCurrentMonth = isSameMonth(day, monthStart);

                            return (
                                <button
                                    key={idx}
                                    onClick={() => {
                                        setCalendarBaseDate(day);
                                        // Specific logic to filter map could be added here
                                    }}
                                    className={`relative aspect-square rounded-2xl border transition-all flex flex-col items-center justify-center gap-1 group
                                        ${!isCurrentMonth ? 'opacity-20 pointer-events-none' : 'opacity-100'}
                                        ${isSelected
                                            ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-500/20 scale-105 z-10'
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:border-white/10'
                                        }
                                        ${isToday(day) && !isSelected ? 'border-rose-500/50' : ''}
                                    `}
                                >
                                    <span className={`text-xs font-black ${isSelected ? 'text-white' : isToday(day) ? 'text-rose-500' : ''}`}>
                                        {format(day, 'd')}
                                    </span>

                                    {dayEvents.length > 0 && isCurrentMonth && (
                                        <div className="flex gap-0.5 mt-0.5">
                                            {dayEvents.slice(0, 3).map((_, i) => (
                                                <div
                                                    key={i}
                                                    className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/60' : hasPremium ? 'bg-amber-500' : 'bg-sky-500'
                                                        }`}
                                                />
                                            ))}
                                            {dayEvents.length > 3 && (
                                                <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white/40' : 'bg-slate-600'}`} />
                                            )}
                                        </div>
                                    )}

                                    {hasPremium && !isSelected && isCurrentMonth && (
                                        <div className="absolute top-1 right-1">
                                            <Sparkles className="w-2 h-2 text-amber-500" />
                                        </div>
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Preview Section */}
                    <div className="mt-8 space-y-4">
                        <div className="flex items-center justify-between">
                            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                                Pulses for {format(calendarBaseDate, "d 'de' MMMM", { locale: es })}
                            </h4>
                            <span className="text-[10px] font-black text-sky-500 uppercase">
                                {getEventsForDay(calendarBaseDate).length} Pulses
                            </span>
                        </div>

                        <div className="space-y-3">
                            {getEventsForDay(calendarBaseDate).length > 0 ? (
                                getEventsForDay(calendarBaseDate).slice(0, 3).map(event => {
                                    const biz = businesses.find(b => b.id === event.businessId);
                                    const displaySector = Object.values(Sector).includes(event.sector as any) ? event.sector : (biz?.sector || '');
                                    const locationLabel = [biz?.name, displaySector].filter(Boolean).join(' · ');

                                    return (
                                        <div
                                            key={event.id}
                                            className="flex gap-3 p-3 rounded-2xl bg-white/5 border border-white/5 items-center group cursor-pointer hover:bg-white/10 transition-colors"
                                            onClick={() => setSelectedEvent(event)}
                                        >
                                            <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-white/10">
                                                <img src={event.imageUrl} className="w-full h-full object-cover" alt="" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h5 className="text-[11px] font-black text-white uppercase truncate">{event.title}</h5>
                                                <p className="text-[9px] text-slate-500 font-bold uppercase truncate">
                                                    {format(new Date(event.startAt), 'HH:mm')} · {locationLabel}
                                                </p>
                                            </div>
                                            {event.isPremium && (
                                                <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="py-8 text-center border-2 border-dashed border-white/5 rounded-[2rem]">
                                    <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No events for this day</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Action */}
                <div className="p-6 bg-white/[0.02] border-t border-white/5">
                    <button
                        onClick={() => {
                            setIsCalendarFilterActive(true);
                            onClose();
                        }}
                        className="w-full py-4 bg-sky-500 hover:bg-sky-600 active:scale-[0.98] transition-all text-white font-black text-xs uppercase tracking-[0.2em] rounded-2xl shadow-lg shadow-sky-500/20"
                    >
                        Explore This Day
                    </button>
                </div>
            </div>
        </div>
    );
};
