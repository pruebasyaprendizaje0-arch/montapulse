import React, { useMemo } from 'react';
import { ChevronLeft, Clock, Trash2 } from 'lucide-react';
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
        handleDeleteEvent: onDeleteEvent
    } = useData();
    const navigate = useNavigate();
    const userBusiness = useMemo(() => businesses.find(b => b.ownerId === user?.id), [businesses, user]);

    // Helper logic to filter past events for the current user/business
    const pastEvents = useMemo(() => {
        const now = new Date();
        return events.filter(e => {
            const isMyEvent = userBusiness ? e.businessId === userBusiness.id : e.businessId === (bizForm.name || user?.name || 'Host Local');
            return isMyEvent && e.endAt <= now;
        }).sort((a, b) => b.endAt.getTime() - a.endAt.getTime());
    }, [events, userBusiness, bizForm, user]);

    return (
        <div className="p-6 pt-6 flex flex-col gap-6 h-full overflow-y-auto pb-24 no-scrollbar bg-[#020617]">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/host')} className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-2xl font-black text-white tracking-tight">Event History</h1>
            </div>

            <div className="space-y-4">
                {pastEvents.length > 0 ? (
                    pastEvents.map(event => (
                        <div key={event.id} className="bg-slate-900/60 border border-white/5 rounded-[2rem] p-4 flex items-center gap-4 group opacity-75 hover:opacity-100 transition-opacity">
                            <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-slate-700 grayscale group-hover:grayscale-0 transition-all flex-shrink-0">
                                <img src={event.imageUrl} className="w-full h-full object-cover" />
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-slate-300 text-base truncate">{event.title}</h4>
                                <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-bold mt-1">
                                    <Clock className="w-3 h-3" />
                                    <span>Ended: {event.endAt.toLocaleDateString()}</span>
                                </div>
                                <div className="mt-2 flex items-center gap-2">
                                    <span className="text-[10px] font-black text-slate-500 uppercase">
                                        Final Attendance: {Object.values(rsvpStatus).filter(v => v).length /* This is global, placeholder for event specific */}
                                    </span>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={() => onDeleteEvent(event.id)} className="p-2 bg-slate-800 text-rose-500/80 rounded-full hover:bg-rose-500/10"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-center flex flex-col items-center gap-3">
                        <Clock className="w-10 h-10 text-slate-700" />
                        <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No past events</p>
                    </div>
                )}
            </div>
        </div>
    );
};
