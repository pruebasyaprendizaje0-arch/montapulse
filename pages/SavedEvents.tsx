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
        <div className="p-6 pt-6 flex flex-col gap-6 h-full overflow-y-auto pb-28 no-scrollbar bg-[#020617] select-text">
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => navigate(-1)} 
                    className="p-2 -ml-2 rounded-2xl bg-white/5 hover:bg-white/10 text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                    aria-label="Volver atrás"
                >
                    <ChevronLeft className="w-6 h-6 text-white" />
                </button>
                <div>
                    <h1 className="text-2xl font-black text-white tracking-tight">Eventos Guardados</h1>
                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Tus actividades favoritas</p>
                </div>
            </div>

            <div className="space-y-4">
                {favoritedEvents.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {favoritedEvents.map(event => (
                            <div key={event.id} className="w-full">
                                <EventCard event={event} onClick={setSelectedEvent} />
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 border-2 border-dashed border-white/10 rounded-[2.5rem] text-center flex flex-col items-center gap-4 bg-slate-900/40">
                        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-500">
                            <Heart className="w-8 h-8" />
                        </div>
                        <div className="max-w-xs">
                            <h3 className="text-base font-black text-white mb-1">Aún no tienes eventos guardados</h3>
                            <p className="text-xs text-slate-400">Guarda actividades desde la agenda o el inicio para tenerlas siempre a mano.</p>
                        </div>
                        <button
                            onClick={() => navigate('/calendar')}
                            className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all shadow-lg shadow-orange-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                        >
                            Explorar Agenda de Eventos
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};
