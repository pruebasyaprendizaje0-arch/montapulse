import React, { useState } from 'react';
import { Clock, Users, Flame, Star, MapPin } from 'lucide-react';
import { MontanitaEvent, Sector, Vibe } from '../types.ts';
import { SECTOR_INFO } from '../constants.ts';
import { Skeleton } from './Skeleton.tsx';
import { incrementEventClickCount } from '../services/firestoreService';

interface EventCardProps {
  event: MontanitaEvent;
  locality?: string;
  onClick: (event: MontanitaEvent) => void;
  onRsvp?: (id: string, e: React.MouseEvent) => void;
  isRsvp?: boolean;
}

export const EventCard: React.FC<EventCardProps> = ({ event, locality, onClick, onRsvp, isRsvp }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const sectorStyle = SECTOR_INFO[event.sector] || SECTOR_INFO[Sector.CENTRO];

  const isEventLive = () => {
    if (!event.startAt) return false;
    const now = new Date();
    const start = new Date(event.startAt);
    const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 4 * 3600000); // 4h default
    return now >= start && now <= end;
  };

  const isLive = isEventLive();

  const formatTimeRange = (startInput: Date | string) => {
    if (!startInput) return 'Time TBA';
    try {
      const start = new Date(startInput);
      if (isNaN(start.getTime())) return 'Time TBA';
      const end = event.endAt ? new Date(event.endAt) : new Date(start.getTime() + 4 * 3600000);
      return `${start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })} - ${end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}`;
    } catch (e) {
      return 'Time TBA';
    }
  };

  return (
    <div
      onClick={() => {
        incrementEventClickCount(event.id);
        onClick(event);
      }}
      className={`bg-slate-900 border rounded-[2.5rem] overflow-hidden group active:scale-[0.98] transition-all cursor-pointer relative ${
        isLive ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5'
      }`}
    >
      {isLive && (
        <div className="absolute inset-0 rounded-[2.5rem] ring-2 ring-red-500 animate-pulse pointer-events-none z-10" />
      )}
      
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
        <div className="absolute top-4 left-4 flex gap-2 z-20">
          {isLive ? (
            <div className="px-3 py-1 bg-red-600 text-white text-[10px] font-black uppercase rounded-lg shadow-lg flex items-center gap-1.5 animate-pulse">
              <div className="w-1.5 h-1.5 bg-white rounded-full" />
              LIVE NOW
            </div>
          ) : (
            <div className="px-3 py-1 bg-amber-400 text-black text-[10px] font-black uppercase rounded-lg shadow-lg">
              {String(event.vibe).toUpperCase() === 'FIESTA' ? 'PARTY' : event.vibe}
            </div>
          )}
          <div className="px-3 py-1 bg-white/20 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded-lg border border-white/10 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-white/70" />
            <span>{event.locality || locality || 'Montañita'} • {event.sector}</span>
          </div>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-6 left-6 right-6 flex flex-col gap-1 z-20">
          <div className="flex items-center justify-between text-orange-400">
            <span className={`text-xs font-black tracking-tight ${isLive ? 'text-red-400' : 'text-orange-400'}`}>
              {formatTimeRange(event.startAt)}
            </span>
            <div className="flex flex-col items-end">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Interest</span>
              <span className="text-xl font-black text-white">{event.interestedCount}</span>
            </div>
          </div>
          <h3 className="text-2xl font-black text-white leading-tight mt-1">{event.title}</h3>
          <p className="text-[11px] text-slate-400 mt-2 line-clamp-2 leading-relaxed h-[34px]">{event.description}</p>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden ring-1 ring-white/10">
                    <img src={`https://i.pravatar.cc/100?u=${i + event.id}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                +{event.interestedCount} GOING
              </span>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                onRsvp?.(event.id, e);
              }}
              className={`px-6 py-2.5 text-xs font-black uppercase rounded-full shadow-lg transition-all active:scale-95 ${isRsvp
                ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                : 'bg-orange-500 text-white shadow-orange-500/20 hover:bg-orange-400'
                }`}
            >
              {isRsvp ? 'Going ✓' : 'Interested'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
