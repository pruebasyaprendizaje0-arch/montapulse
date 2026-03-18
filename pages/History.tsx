import React, { useMemo } from 'react';
import { ChevronLeft, Clock, Trash2, Calendar } from 'lucide-react';
import { MontanitaEvent, UserProfile, Business } from '../types';
import { useNavigate } from 'react-router-dom';

import { useAuthContext } from '../context/AuthContext';
import { useData } from '../context/DataContext';

export const History: React.FC = () => {
    const { user } = useAuthContext();
    const {
        events,
        businesses,
        bizForm,
        rsvpStatus,
        pastEvents,
        handleDeleteEvent: onDeleteEvent
    } = useData();
    const navigate = useNavigate();
    const userBusiness = useMemo(() => businesses.find(b => b.ownerId === user?.id), [businesses, user]);

    // Agrupar eventos por mes
    const eventsByMonth = useMemo(() => {
        const grouped: Record<string, MontanitaEvent[]> = {};
        
        pastEvents.forEach(event => {
            const monthKey = event.startAt.toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
            if (!grouped[monthKey]) {
                grouped[monthKey] = [];
            }
            grouped[monthKey].push(event);
        });
        
        return grouped;
    }, [pastEvents]);

    const monthOrder = Object.keys(eventsByMonth).sort((a, b) => {
        const dateA = new Date(eventsByMonth[a][0].startAt);
        const dateB = new Date(eventsByMonth[b][0].startAt);
        return dateB.getTime() - dateA.getTime();
    });

    return (
        <div className="p-6 pt-6 flex flex-col gap-6 h-full overflow-y-auto pb-24 no-scrollbar bg-[#020617]">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/host')} className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-2xl font-black text-white tracking-tight">Historial de Eventos</h1>
            </div>

            {monthOrder.length > 0 ? (
                monthOrder.map(month => (
                    <div key={month} className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-slate-500" />
                            <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest">{month}</h2>
                            <span className="text-xs text-slate-600">({eventsByMonth[month].length} eventos)</span>
                        </div>
                        
                        {eventsByMonth[month].map(event => (
                            <div key={event.id} className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-4 flex items-center gap-4 group opacity-75 hover:opacity-100 transition-opacity">
                                <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 grayscale group-hover:grayscale-0 transition-all flex-shrink-0">
                                    <img src={event.imageUrl} className="w-full h-full object-cover" alt={event.title} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h4 className="font-bold text-slate-300 text-base truncate">{event.title}</h4>
                                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold mt-1">
                                        <Clock className="w-3 h-3" />
                                        <span>{event.startAt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                        <span>•</span>
                                        <span>{event.startAt.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div className="mt-2 flex items-center gap-2">
                                        <span className="text-[10px] font-black text-slate-500 uppercase">
                                            Asistentes: {event.interestedCount || 0}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <button onClick={() => onDeleteEvent(event.id)} className="p-2 bg-slate-800 text-orange-500/80 rounded-full hover:bg-orange-500/10"><Trash2 className="w-4 h-4" /></button>
                                </div>
                            </div>
                        ))}
                    </div>
                ))
            ) : (
                <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-center flex flex-col items-center gap-3">
                    <Clock className="w-10 h-10 text-slate-700" />
                    <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No hay eventos del mes pasado</p>
                    <p className="text-slate-500 text-[10px]">Los eventos finalizados aparecerán aquí automáticamente</p>
                </div>
            )}
        </div>
    );
};
