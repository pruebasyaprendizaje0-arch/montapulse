import React from 'react';
import { ChevronLeft, Heart } from 'lucide-react';
import { MontanitaEvent } from '../types';
import { EventCard } from '../components/EventCard';
import { useNavigate } from 'react-router-dom';

import { useData } from '../context/DataContext';

export const SavedEvents: React.FC = () => {
    const { favoritedEvents, setSelectedEvent } = useData();
    const navigate = useNavigate();

    return (
        <div className="p-6 pt-6 flex flex-col gap-6 h-full overflow-y-auto pb-24 no-scrollbar bg-[#020617]">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate(-1)} className="p-2 -ml-2 rounded-full hover:bg-slate-800 transition-colors">
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <h1 className="text-2xl font-black text-white tracking-tight">Saved Events</h1>
            </div>

            <div className="space-y-4">
                {favoritedEvents.length > 0 ? (
                    favoritedEvents.map(event => (
                        <div key={event.id} className="w-full">
                            <EventCard event={event} onClick={setSelectedEvent} />
                        </div>
                    ))
                ) : (
                    <div className="p-10 border-2 border-dashed border-slate-800 rounded-[2.5rem] text-center flex flex-col items-center gap-3">
                        <Heart className="w-10 h-10 text-slate-700" />
                        <p className="text-slate-600 text-xs font-black uppercase tracking-widest">No events saved yet</p>
                    </div>
                )}
            </div>
        </div>
    );
};
