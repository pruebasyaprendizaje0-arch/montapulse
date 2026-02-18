import React, { useState } from 'react';
import { Clock, Users, Flame, Star, MapPin } from 'lucide-react';
import { MontanitaEvent, Sector } from '../types.ts';
import { SECTOR_INFO } from '../constants.ts';
import { Skeleton } from './Skeleton.tsx';

interface EventCardProps {
  event: MontanitaEvent;
  locality?: string;
  onClick: (event: MontanitaEvent) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, locality, onClick }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const sectorStyle = SECTOR_INFO[event.sector] || SECTOR_INFO[Sector.CENTRO];

  const formatTimeRange = (startInput: Date | string) => {
    if (!startInput) return 'Time TBA';
    try {
      const start = new Date(startInput);
      if (isNaN(start.getTime())) return 'Time TBA';
      const end = new Date(start.getTime() + 3 * 3600000); // Mock end 3h later
      return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } catch (e) {
      return 'Time TBA';
    }
  };

  return (
    <div
      onClick={() => onClick(event)}
      className="bg-slate-900 border border-white/5 rounded-[2.5rem] overflow-hidden group active:scale-[0.98] transition-all cursor-pointer relative"
    >
      <div className="relative h-64">
        {!isLoaded && <Skeleton className="w-full h-full" />}
        <img
          src={event.imageUrl}
          alt={event.title}
          onLoad={() => setIsLoaded(true)}
          className={`w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
        />

        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-black/20" />

        {/* Top Badges */}
        <div className="absolute top-4 left-4 flex gap-2">
          <div className="px-3 py-1 bg-amber-400 text-black text-[10px] font-black uppercase rounded-lg shadow-lg">
            {event.vibe === 'FIESTA' ? 'PARTY' : event.vibe}
          </div>
          <div className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded-lg border border-white/10 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-white/70" />
            <span>{locality || 'Montañita'} • {event.sector}</span>
          </div>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-1">
          <div className="flex items-center justify-between text-sky-400">
            <span className="text-xs font-black tracking-tight">{formatTimeRange(event.startAt)}</span>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interest</span>
              <span className="text-xl font-black text-white">{event.interestedCount}</span>
            </div>
          </div>
          <h3 className="text-2xl font-black text-white leading-tight mt-1">{event.title}</h3>

          <div className="flex items-center justify-between mt-4">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-[#020617] bg-slate-800 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=${i + event.id}`} className="w-full h-full object-cover" />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-[#020617] bg-slate-800 flex items-center justify-center text-[10px] font-black text-slate-400">
                +128
              </div>
            </div>

            <button className="px-6 py-2.5 bg-sky-500 text-white text-xs font-black uppercase rounded-full shadow-[0_4px_15px_rgba(14,165,233,0.3)] hover:bg-sky-400 transition-colors">
              Interested
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
