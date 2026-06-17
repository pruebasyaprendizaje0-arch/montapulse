import React, { useState } from 'react';
import { Clock, Users, Flame, Star, MapPin, Edit2, Trash2 } from 'lucide-react';
import { MontanitaEvent, Sector, Vibe } from '../types';
import { SECTOR_INFO } from '../constants';
import { Skeleton } from './Skeleton';
import { incrementEventClickCount } from '../services/firestoreService';
import { getEcuadorDate } from '../utils/timeUtils';

interface EventCardProps {
  event: MontanitaEvent;
  locality?: string;
  onClick: (event: MontanitaEvent) => void;
  onRsvp?: (id: string, e: React.MouseEvent) => void;
  isRsvp?: boolean;
  isAdmin?: boolean;
  onEdit?: (id: string, e: React.MouseEvent) => void;
  onDelete?: (id: string, e: React.MouseEvent) => void;
}

export const EventCard = React.memo(({ event, locality, onClick, onRsvp, isRsvp, isAdmin, onEdit, onDelete }: EventCardProps) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const sectorStyle = SECTOR_INFO[event.sector] || SECTOR_INFO[Sector.CENTRO];

  const isEventLive = () => {
    if (!event.startAt) return false;
    const now = getEcuadorDate();
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
      className={`antigravity bg-slate-900 border rounded-[2.5rem] overflow-hidden group active:scale-[0.98] transition-all duration-300 cursor-pointer relative flex flex-col hover:border-white/20 hover:shadow-2xl hover:shadow-orange-500/10 ${
        isLive ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5'
      }`}
    >
      {isLive && (
        <div className="absolute inset-0 rounded-[2.5rem] ring-2 ring-red-500 animate-pulse pointer-events-none z-10" />
      )}

      {/* Imagen con contenedor de aspecto fijo */}
      <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-[2.5rem] overflow-hidden">
        {/* Skeleton placeholder mientras carga */}
        {!isLoaded && !hasError && (
          <div className="absolute inset-0">
            <Skeleton className="w-full h-full rounded-[2.5rem]" />
          </div>
        )}

        {/* Imagen principal */}
        {!hasError ? (
          <img
            src={event.imageUrl}
            alt={event.title}
            loading="lazy"
            onLoad={() => setIsLoaded(true)}
            onError={() => setHasError(true)}
            className={`w-full h-full object-cover transition-all duration-700 group-hover:scale-110 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ) : (
          <div className="w-full h-full bg-slate-800 flex items-center justify-center">
            <span className="text-sm text-slate-400 px-4 text-center">Imagen no disponible</span>
          </div>
        )}

        {/* Overlay Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent/40 to-black/20" />

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
          <div className="px-3 py-1 bg-white/10 backdrop-blur-md text-white text-[10px] font-bold uppercase rounded-lg border border-white/10 flex items-center gap-1">
            <MapPin className="w-3 h-3 text-white/70" />
            <span className="truncate max-w-[120px]">{event.locality || locality || 'Montañita'}</span>
          </div>
          {isAdmin && (
            <div className="flex gap-2 ml-auto">
              <button 
                onClick={(e) => { e.stopPropagation(); onEdit?.(event.id, e); }}
                className="p-2 bg-indigo-500 text-white rounded-lg shadow-lg hover:bg-indigo-400 transition-colors"
                title="Editar Evento"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); onDelete?.(event.id, e); }}
                className="p-2 bg-rose-500 text-white rounded-lg shadow-lg hover:bg-rose-400 transition-colors"
                title="Eliminar Evento"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Content Area - Changed from absolute to relative for better stability */}
      <div className="px-6 pb-6 pt-2 flex flex-col gap-1 z-20 -mt-10 relative">
        <div className="flex items-center justify-between text-orange-400">
          <span className={`text-[10px] font-black tracking-tight ${isLive ? 'text-red-400' : 'text-orange-400'}`}>
            {formatTimeRange(event.startAt)}
          </span>
          <div className="flex flex-col items-end">
            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Interés</span>
            <span className="text-lg font-black text-white">{Math.max(0, event.interestedCount || 0)}</span>
          </div>
        </div>
        <h3 className="text-xl font-black text-white leading-tight">{event.title}</h3>
        <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 leading-relaxed min-h-[32px]">{event.description}</p>

        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-3">
            <div className="flex -space-x-2">
              {[1, 2, 3].map(i => (
                <div key={i} className="w-7 h-7 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden ring-1 ring-white/5">
                  <img
                    src={`https://i.pravatar.cc/100?u=${i + event.id}`}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 opacity-80"
                    loading="lazy"
                    alt="avatar"
                  />
                </div>
              ))}
            </div>
            <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">
              +{Math.max(0, event.interestedCount || 0)} ASISTIRÁN
            </span>
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              onRsvp?.(event.id, e);
            }}
            className={`px-5 py-2 text-[10px] font-black uppercase rounded-full shadow-lg transition-all active:scale-95 ${(event as any).isPulsing
              ? 'bg-emerald-500 text-white shadow-emerald-500/20 animate-rsvp-pulse'
              : isRsvp
                ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30'
                : 'bg-orange-500 text-white shadow-orange-500/20 hover:bg-orange-400'
              }`}
          >
            {(event as any).isPulsing ? '¡Pulso Sentido!' : 'Sentir el Pulso'}
          </button>
        </div>
      </div>
    </div>
  );
});