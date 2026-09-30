import React, { useState } from 'react';
import { MapPin, Edit2, Trash2 } from 'lucide-react';
import { MontanitaEvent, Sector } from '../types';
import { SECTOR_INFO } from '../constants';
import { incrementEventClickCount } from '../services/firestoreService';
import { formatEcuadorEventDate, formatEventPrice } from '../utils/timeUtils';

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

  const dateInfo = formatEcuadorEventDate(event.startAt, event.endAt, event.status);
  const priceInfo = formatEventPrice(event);

  return (
    <article
      aria-label={`Evento: ${event.title}`}
      className={`bg-slate-900 border rounded-[2.5rem] overflow-hidden group relative flex flex-col hover:border-white/20 hover:shadow-2xl hover:shadow-orange-500/10 transition-colors duration-200 h-auto ${
        dateInfo.isOngoing ? 'border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'border-white/5'
      }`}
    >
      {dateInfo.isOngoing && (
        <div className="absolute inset-0 rounded-[2.5rem] ring-2 ring-red-500 animate-pulse pointer-events-none z-10" />
      )}

      {/* Main Clickable Trigger for Card */}
      <button
        type="button"
        onClick={() => {
          incrementEventClickCount(event.id);
          onClick(event);
        }}
        aria-label={`Ver detalles del evento: ${event.title}`}
        className="w-full text-left flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-[2.5rem] cursor-pointer"
      >
        {/* Image container */}
        <div className="relative w-full aspect-[4/3] sm:aspect-video rounded-[2.5rem] overflow-hidden bg-slate-800">
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
              <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin opacity-50" />
            </div>
          )}

          {(!hasError && event.imageUrl) ? (
            <img
              src={event.imageUrl}
              alt={event.title}
              width="400"
              height="300"
              loading="lazy"
              onLoad={() => setIsLoaded(true)}
              onError={() => setHasError(true)}
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 z-10"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 to-slate-900 flex flex-col items-center justify-center relative z-10">
              <div className="w-12 h-12 rounded-full bg-slate-800 border border-white/5 flex items-center justify-center mb-2">
                <span className="text-xl">⚡</span>
              </div>
            </div>
          )}

          {/* Overlay Gradients */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent/40 to-black/20" />

          {/* Top Badges */}
          <div className="absolute top-4 left-4 flex flex-wrap gap-2 z-20">
            <div className={`px-3 py-1 text-white text-[11px] font-black uppercase rounded-full shadow-lg flex items-center gap-1.5 backdrop-blur-md ${
              dateInfo.isOngoing || dateInfo.statusColor === 'emerald' ? 'bg-emerald-600/90' :
              dateInfo.statusColor === 'rose' ? 'bg-red-600/90' :
              dateInfo.statusColor === 'slate' ? 'bg-slate-800/90' :
              'bg-amber-500/90'
            }`}>
              <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
              {dateInfo.statusLabel}
            </div>

            {event.eventType && (
              <div className={`px-2.5 py-1 backdrop-blur-md text-white text-[11px] font-black uppercase rounded-full border flex items-center gap-1 shadow-lg ${
                event.eventType === 'promocion' ? 'bg-purple-600/90 border-purple-400/30' :
                event.eventType === 'actividad' ? 'bg-teal-600/90 border-teal-400/30' :
                'bg-orange-600/90 border-orange-400/30'
              }`}>
                <span>{event.eventType === 'promocion' ? '🏷️ Promoción' : event.eventType === 'actividad' ? '🏄 Actividad' : '🎉 Evento'}</span>
              </div>
            )}

            <div className="px-3 py-1 bg-black/60 backdrop-blur-md text-amber-300 text-[11px] font-black uppercase rounded-full border border-amber-400/30 flex items-center gap-1 shadow-lg">
              <MapPin className="w-3.5 h-3.5 text-amber-400" />
              <span className="truncate max-w-[120px]">{event.locality || locality || 'Montañita'}</span>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="px-6 pt-2 pb-3 flex flex-col gap-1 z-20 -mt-10 relative">
          <div className="flex items-center justify-between text-orange-400">
            <span className={`text-[11px] font-bold tracking-tight ${dateInfo.isOngoing ? 'text-red-400 font-black' : 'text-orange-400'}`}>
              {dateInfo.fullStr}
            </span>
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Interesados</span>
              <span className="text-sm font-black text-white">{Math.max(0, event.interestedCount || 0)}</span>
            </div>
          </div>
          
          <h3 className="text-lg font-black text-white leading-tight truncate">{event.title}</h3>
          {event.description && (
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed min-h-[28px]">{event.description}</p>
          )}
        </div>
      </button>

      {/* Sibling Bottom Actions (Not nested in button) */}
      <div className="px-6 pb-6 pt-0 flex items-center justify-between border-t border-white/5 z-20 relative">
        <div className="flex items-center gap-2">
          {priceInfo.displayLabel ? (
            <span className={`px-2.5 py-0.5 rounded-md border text-[10px] font-black uppercase ${
              priceInfo.isFree
                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
            }`}>
              {priceInfo.displayLabel}
            </span>
          ) : (
            <span className="text-[10px] text-slate-500 font-bold uppercase">
              {event.sector ? `Sector ${event.sector}` : 'Centro'}
            </span>
          )}

          {isAdmin && (
            <div className="flex items-center gap-1.5 ml-2">
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onEdit?.(event.id, e); }}
                className="w-11 h-11 min-w-[44px] min-h-[44px] bg-indigo-500/20 text-indigo-300 hover:bg-indigo-500 hover:text-white rounded-xl shadow-lg transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 cursor-pointer"
                aria-label={`Editar evento ${event.title}`}
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button 
                type="button"
                onClick={(e) => { e.stopPropagation(); onDelete?.(event.id, e); }}
                className="w-11 h-11 min-w-[44px] min-h-[44px] bg-rose-500/20 text-rose-300 hover:bg-rose-500 hover:text-white rounded-xl shadow-lg transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400 cursor-pointer"
                aria-label={`Eliminar evento ${event.title}`}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRsvp?.(event.id, e);
          }}
          aria-label={isRsvp ? `Cancelar asistencia al evento ${event.title}` : `Confirmar asistencia al evento ${event.title}`}
          className={`min-h-[44px] min-w-[44px] px-4 py-2 text-[10px] font-black uppercase rounded-full shadow-lg transition-colors duration-200 active:scale-95 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
            (event as any).isPulsing
              ? 'bg-emerald-500 text-white shadow-emerald-500/20 animate-rsvp-pulse'
              : isRsvp
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'bg-orange-500 text-white shadow-orange-500/20 hover:bg-orange-400'
          }`}
        >
          {(event as any).isPulsing ? '¡Asistiré!' : isRsvp ? '¡Asistiré!' : 'Me interesa'}
        </button>
      </div>
    </article>
  );
});