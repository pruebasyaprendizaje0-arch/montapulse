import React from 'react';
import { UserProfile, MontanitaEvent } from '../../types';

import { useAuthContext } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { WifiOff, Bell, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { NotificationCenter } from './NotificationCenter';

export const Header: React.FC = () => {
    const { user } = useAuthContext();
    const { events, unreadNotificationsCount } = useData();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const isOnline = useNetworkStatus();
    const [isNotifOpen, setIsNotifOpen] = React.useState(false);
    const eventsCount = events.length;
    return (
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-2xl border-b border-white/10 h-16 flex items-center justify-between px-6">
            <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
                    <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                </div>
                <div className="flex flex-col">
                    <span className="text-lg font-black tracking-tight text-white leading-none uppercase">ubicame.info</span>
                    <span className="text-[9px] font-black tracking-[0.4em] text-orange-500 leading-none mt-1">PULSE</span>
                </div>
                {!isOnline && (
                    <div className="ml-2 flex items-center gap-1.5 px-2 py-1 bg-amber-500/10 border border-amber-500/20 rounded-lg animate-pulse">
                        <WifiOff className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Offline</span>
                    </div>
                )}
            </div>

            <div className="flex items-center gap-6">
                {/* Notifications Bell */}
                <div className="relative">
                    <button
                        onClick={() => setIsNotifOpen(!isNotifOpen)}
                        className={`p-2 rounded-xl border transition-all ${isNotifOpen ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'}`}
                    >
                        <Bell className="w-5 h-5" />
                        {unreadNotificationsCount > 0 && (
                            <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[10px] font-black rounded-lg flex items-center justify-center ring-4 ring-black shadow-lg animate-in zoom-in duration-300">
                                {unreadNotificationsCount}
                            </span>
                        )}
                    </button>
                    <NotificationCenter isOpen={isNotifOpen} onClose={() => setIsNotifOpen(false)} />
                </div>

                {user && (
                    <div className="flex items-center gap-3 pr-4 border-r border-white/10">
                        <div className="flex flex-col items-end hidden sm:flex">
                            <span className="text-[10px] font-black text-white uppercase tracking-tight leading-none mb-1">{user.name}</span>
                            <div className="flex items-center gap-2">
                                {user.plan !== 'Expert' && (
                                    <button 
                                        onClick={() => navigate('/plans')}
                                        className="text-[8px] font-black text-orange-500 hover:text-white bg-orange-500/10 hover:bg-orange-500 border border-orange-500/20 px-2 py-0.5 rounded transition-all flex items-center gap-1 group"
                                    >
                                        <Sparkles className="w-2.5 h-2.5 group-hover:animate-pulse" />
                                        MEJORAR
                                    </button>
                                )}
                                <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest leading-none">{user.plan}</span>
                            </div>
                        </div>
                        <div className="w-8 h-8 rounded-xl border border-orange-500 overflow-hidden ring-2 ring-orange-500/20 shadow-lg cursor-pointer" onClick={() => navigate('/passport')}>
                            <img src={user.avatarUrl} className="w-full h-full object-cover" alt="User avatar" />
                        </div>
                    </div>
                )}
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-slate-500 uppercase tracking-[0.2em] leading-none mb-1">PULSOS</span>
                    <span className="text-sm font-black text-white leading-none flex items-center gap-1">
                        <span className="text-orange-500">+</span>{eventsCount}
                    </span>
                </div>
            </div>
        </div>
    );
};
