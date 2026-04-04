import React, { useState } from 'react';
import { Bell, X, Info, Sparkles, Zap, Clock, ExternalLink } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useTranslation } from 'react-i18next';
import { PulseNotification } from '../../types';

interface NotificationCenterProps {
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ isOpen, onClose }) => {
    const { notifications, markAllAsRead, markAsRead } = useData();
    const [selectedNotification, setSelectedNotification] = useState<PulseNotification | null>(null);
    const { t } = useTranslation();

    if (!isOpen) return null;

    const getIcon = (type: PulseNotification['type']) => {
        switch (type) {
            case 'system': return <Info className="w-4 h-4 text-orange-400" />;
            case 'community': return <Zap className="w-4 h-4 text-amber-400" />;
            case 'offer': return <Sparkles className="w-4 h-4 text-rose-400" />;
            default: return <Bell className="w-4 h-4 text-slate-400" />;
        }
    };

    const getTimeAgo = (timestamp: any) => {
        const seconds = Math.floor((Date.now() - timestamp) / 1000);
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        return new Date(timestamp).toLocaleDateString();
    };

    const getResizedImageUrl = (url: string | undefined, size: number = 400): string => {
        if (!url) return '';
        if (url.includes('firebasestorage')) {
            const baseUrl = url.split('/o/')[1]?.split('?')[0];
            if (baseUrl) {
                const encodedName = encodeURIComponent(baseUrl);
                const resizedName = baseUrl.replace(/\.([^.]+)$/, `_${size}x${size}.$1`);
                const encodedResized = encodeURIComponent(resizedName);
                return url.replace(encodedName, encodedResized);
            }
        }
        return url;
    };

    const handleNotificationClick = (notif: PulseNotification) => {
        markAsRead(notif.id);
        setSelectedNotification(notif);
    };

    return (
        <>
            <div className="absolute top-20 right-6 w-[320px] max-h-[480px] bg-slate-900/95 backdrop-blur-xl border border-white/10 rounded-[2.5rem] shadow-2xl z-[100] flex flex-col overflow-hidden animate-in fade-in slide-in-from-top-4 duration-300">
                <div className="p-6 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <h3 className="text-sm font-black text-white uppercase tracking-widest">Pulse Notifications</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors">
                        <X className="w-4 h-4 text-slate-400" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar p-2">
                    {notifications.length === 0 ? (
                        <div className="py-20 text-center">
                            <Bell className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">No active pulses</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {notifications.sort((a, b) => b.createdAt - a.createdAt).map(notif => (
                                <div
                                    key={notif.id}
                                    onClick={() => handleNotificationClick(notif)}
                                    className={`p-4 rounded-3xl transition-all cursor-pointer hover:bg-white/10 ${notif.read ? 'opacity-60' : 'bg-white/5 border border-white/5'}`}
                                >
                                    <div className="flex gap-3">
                                        {notif.imageUrl && (
                                            <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 bg-slate-800">
                                                <img src={getResizedImageUrl(notif.imageUrl, 200)} alt="" className="w-full h-full object-cover" />
                                            </div>
                                        )}
                                        {!notif.imageUrl && (
                                            <div className={`p-2 rounded-xl h-fit shrink-0 ${notif.read ? 'bg-slate-800/50' : 'bg-white/10'}`}>
                                                {getIcon(notif.type)}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <h4 className="text-xs font-black text-white mb-0.5">{notif.title}</h4>
                                            <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-2">{notif.body || notif.message}</p>
                                            <div className="flex items-center gap-1 mt-2 text-[9px] font-bold text-slate-600 uppercase">
                                                <Clock className="w-2.5 h-2.5" />
                                                {getTimeAgo(notif.createdAt)}
                                            </div>
                                        </div>
                                        {!notif.read && (
                                            <div className="w-2 h-2 bg-orange-500 rounded-full mt-1 shrink-0 shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {notifications.some(n => !n.read) && (
                    <button
                        onClick={markAllAsRead}
                        className="p-4 text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] border-t border-white/5 hover:bg-orange-500/5 transition-colors"
                    >
                        Mark all as read
                    </button>
                )}
            </div>

            {/* Modal de Detalles de Notificación */}
            {selectedNotification && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setSelectedNotification(null)}>
                    <div className="bg-slate-900 border border-white/10 rounded-3xl max-w-md w-full overflow-hidden" onClick={e => e.stopPropagation()}>
                        {selectedNotification.imageUrl && (
                            <div className="w-full h-64 bg-slate-800">
                                <img src={getResizedImageUrl(selectedNotification.imageUrl, 800)} alt="" className="w-full h-full object-cover" />
                            </div>
                        )}
                        
                        <div className="p-6">
                            <div className="flex items-center gap-3 mb-4">
                                <div className={`p-2 rounded-xl ${selectedNotification.type === 'offer' ? 'bg-rose-500/20' : selectedNotification.type === 'alert' ? 'bg-red-500/20' : 'bg-amber-500/20'}`}>
                                    {getIcon(selectedNotification.type)}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-white">{selectedNotification.title}</h3>
                                    <p className="text-[10px] text-slate-500 uppercase">{getTimeAgo(selectedNotification.createdAt)}</p>
                                </div>
                                <button onClick={() => setSelectedNotification(null)} className="p-2 hover:bg-white/10 rounded-xl">
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>
                            
                            <p className="text-slate-300 text-sm leading-relaxed mb-6">
                                {selectedNotification.body || selectedNotification.message || 'Sin mensaje'}
                            </p>
                            
                            {selectedNotification.businessId ? (
                                <button
                                    onClick={() => {
                                        window.dispatchEvent(new CustomEvent('openBusinessProfile', { detail: selectedNotification.businessId }));
                                        setSelectedNotification(null);
                                        onClose();
                                    }}
                                    className="w-full py-4 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:scale-[1.02] transition-transform"
                                >
                                    <ExternalLink className="w-4 h-4" />
                                    Ver Negocio
                                </button>
                            ) : (
                                <button
                                    onClick={() => setSelectedNotification(null)}
                                    className="w-full py-4 bg-white/10 border border-white/10 rounded-2xl text-white font-black uppercase tracking-widest hover:bg-white/20 transition-colors"
                                >
                                    Cerrar
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};
