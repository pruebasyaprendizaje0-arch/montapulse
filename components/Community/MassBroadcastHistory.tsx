import React, { useState } from 'react';
import { Announcement } from '../../types';
import { Clock, Users, MapPin, Target, Trash2, ChevronDown, ChevronUp, Image as ImageIcon, Send, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface MassBroadcastHistoryProps {
    announcements: Announcement[];
    onDelete: (id: string) => void;
}

export const MassBroadcastHistory: React.FC<MassBroadcastHistoryProps> = ({ announcements, onDelete }) => {
    const [expandedId, setExpandedId] = useState<string | null>(null);

    if (announcements.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/40 rounded-3xl border border-slate-800/50 backdrop-blur-xl">
                <div className="w-16 h-16 bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                    <Clock className="w-8 h-8 text-slate-500" />
                </div>
                <h3 className="text-xl font-bold text-slate-300 mb-2">Sin Historial</h3>
                <p className="text-slate-500 max-w-xs text-sm">No has enviado mensajes masivos aún. Los que envíes aparecerán aquí.</p>
            </div>
        );
    }

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold flex items-center gap-2">
                    <Clock className="w-5 h-5 text-orange-400" />
                    Historial de Envíos
                </h3>
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    {announcements.length} {announcements.length === 1 ? 'ENVÍO' : 'ENVÍOS'}
                </span>
            </div>

            {announcements.sort((a, b) => {
                const timeA = a.timestamp?.seconds ? a.timestamp.seconds * 1000 : new Date(a.timestamp).getTime();
                const timeB = b.timestamp?.seconds ? b.timestamp.seconds * 1000 : new Date(b.timestamp).getTime();
                return timeB - timeA;
            }).map((ann) => {
                const date = ann.timestamp?.seconds ? new Date(ann.timestamp.seconds * 1000) : new Date(ann.timestamp);
                const isExpanded = expandedId === ann.id;
                const isScheduled = !!ann.scheduledAt;

                return (
                    <div 
                        key={ann.id} 
                        className={`group bg-slate-900/50 border ${isExpanded ? 'border-orange-500/30' : 'border-slate-800/50'} rounded-3xl overflow-hidden backdrop-blur-xl transition-all duration-300 hover:border-slate-700`}
                    >
                        <div 
                            className="p-5 cursor-pointer" 
                            onClick={() => toggleExpand(ann.id)}
                        >
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-800/80 rounded-full border border-slate-700/50">
                                            <div className={`w-1.5 h-1.5 rounded-full ${isScheduled ? 'bg-amber-400' : 'bg-green-400'}`} />
                                            <span className="text-[10px] font-bold text-slate-300 uppercase letter-wider">
                                                {isScheduled ? 'Programado' : 'Enviado'}
                                            </span>
                                        </div>
                                        <span className="text-[11px] font-medium text-slate-400">
                                            {format(date, "d 'de' MMMM, HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-200 line-clamp-2 leading-relaxed">
                                        {ann.text}
                                    </p>
                                </div>
                                
                                {ann.imageUrl && (
                                    <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-800 shrink-0">
                                        <img src={ann.imageUrl} alt="Contenido" className="w-full h-full object-cover" />
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1.5">
                                        <Users className="w-3.5 h-3.5 text-slate-500" />
                                        <span className="text-[11px] font-bold text-slate-400">{ann.recipientCount}</span>
                                    </div>
                                    {ann.target && (
                                        <div className="flex items-center gap-1.5">
                                            <Target className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter">
                                                {ann.target === 'followers' ? 'Seguidores' : ann.target === 'all' ? 'Todos' : ann.target === 'chat' ? 'Chat Directo' : 'Push'}
                                            </span>
                                        </div>
                                    )}
                                    {ann.locality && (
                                        <div className="flex items-center gap-1.5">
                                            <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                            <span className="text-[11px] font-bold text-slate-400 text-truncate max-w-[80px]">
                                                {ann.locality}
                                            </span>
                                        </div>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(ann.id);
                                        }}
                                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                    <div className="p-2 text-slate-500">
                                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {isExpanded && (
                            <div className="px-5 pb-5 pt-1 border-t border-slate-800/50 bg-slate-900/30">
                                <div className="space-y-4 pt-4">
                                    {ann.imageUrl && (
                                        <div className="rounded-2xl overflow-hidden border border-slate-800/50 max-h-60">
                                            <img src={ann.imageUrl} alt="Imagen del anuncio" className="w-full h-full object-contain bg-slate-950" />
                                        </div>
                                    )}
                                    
                                    <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/30">
                                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-2">Mensaje Completo</h4>
                                        <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">
                                            {ann.text}
                                        </p>
                                    </div>

                                    {isScheduled && ann.scheduledAt && (
                                        <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                                            <Calendar className="w-4 h-4 text-amber-400" />
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/70">Fecha Programada</p>
                                                <p className="text-xs font-bold text-amber-200">
                                                    {format(new Date(ann.scheduledAt.seconds ? ann.scheduledAt.seconds * 1000 : ann.scheduledAt), "EEEE d 'de' MMMM, HH:mm", { locale: es })}
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-slate-500 italic">
                                            ID: {ann.id}
                                        </span>
                                        <button 
                                            className="text-[10px] font-bold flex items-center gap-1 text-orange-400 hover:text-orange-300 uppercase tracking-wider"
                                            onClick={() => {
                                                // Functionality to reuse this message
                                            }}
                                        >
                                            <Send className="w-3 h-3" />
                                            Reenviar este mensaje
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
