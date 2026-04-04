import React from 'react';
import { Compass, Calendar, User, MessageSquare, Home, Heart, History, Star, Users, Layout, Info, Building2, Clock, Sun, Moon, LogOut } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../hooks/useTheme';

export const Sidebar: React.FC = () => {
    const { user, isSuperAdmin, logout } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { isNearbyMinimized, setIsNearbyMinimized, setActiveView, unreadChatCount, markAllRoomsAsRead } = useData();
    const { theme, setTheme, isAuto, setIsAuto } = useTheme();
    const currentPath = location.pathname;

    const navItems = [
        { id: 'explore', icon: Compass, label: 'MAPA PULSE', path: '/explore', action: null },
        { id: 'events', icon: Calendar, label: 'EVENTOS', path: '/calendar', action: null },
        { id: 'favorites', icon: Heart, label: 'PASSPORT', path: '/passport', action: 'favorites' },
        { id: 'chat', icon: MessageSquare, label: 'COMUNIDAD', path: '/community', action: null },
        { id: 'history', icon: History, label: 'HISTORIAL', path: '/history', action: null },
        { id: 'plans', icon: Star, label: 'PLANES', path: '/plans', action: null },
    ] as const;

    const isActive = (path: string | null) => {
        if (!path) return false;
        if (path === '/' && (currentPath === '/' || currentPath === '/explore')) return true;
        if (path === '/explore' && (currentPath === '/' || currentPath === '/explore')) return true;
        if (path === '/info' && currentPath === '/info') return true;
        if (path !== '/' && currentPath.startsWith(path)) return true;
        return false;
    };

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-white/5 h-full pt-6 pb-4 px-4 z-40 transition-all overflow-y-auto">
            <div className="flex flex-col items-center gap-3 mb-8">
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3">
                    <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-xl font-black tracking-tighter text-white leading-none uppercase">ubicame.info</span>
                    <span className="text-xs font-black tracking-[0.3em] text-orange-500 leading-none mt-1">PULSE</span>
                </div>
            </div>

            <div className="space-y-2">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.action === 'favorites') {
                                    setActiveView('favorites');
                                    navigate('/passport');
                                    return;
                                }
                                if (item.id === 'chat' && unreadChatCount > 0) {
                                    navigate('/community', { state: { subTab: 'directos' } });
                                    markAllRoomsAsRead();
                                    return;
                                }
                                if (item.path) navigate(item.path);
                            }}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                                active 
                                ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Icon className={`w-5 h-5 ${active ? 'stroke-[2.5px]' : 'stroke-2'}`} />
                            <span className={`text-xs font-black uppercase tracking-widest ${active ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                                {item.label}
                            </span>
                            {item.id === 'chat' && unreadChatCount > 0 && (
                                <div className="ml-2 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                                    {unreadChatCount}
                                </div>
                            )}
                            {active && item.id !== 'chat' && (
                                <div className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_10px_#f97316]" />
                            )}
                            {active && item.id === 'chat' && unreadChatCount === 0 && (
                                <div className="ml-auto w-1.5 h-1.5 bg-orange-500 rounded-full shadow-[0_0_10px_#f97316]" />
                            )}
                        </button>
                    );
                })}

                {isSuperAdmin && (
                    <div className="pt-6 mt-6 border-t border-white/5 space-y-2">
                        <p className="px-4 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-4">Master Admin</p>
                        <button
                            onClick={() => navigate('/admin-users')}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group ${
                                currentPath.includes('/admin-users') 
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-white'
                            }`}
                        >
                            <Users className="w-5 h-5" />
                            <span className="text-xs font-black uppercase tracking-widest">Gestión Usuarios</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
                <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl p-4 border border-orange-500/20">
                    <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Pulse Pass</p>
                    <p className="text-[10px] text-slate-400 leading-tight mb-3">Accede a beneficios exclusivos en toda la ruta.</p>
                    <button 
                         onClick={() => navigate('/plans')}
                         className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20"
                    >
                        Activar Ahora
                    </button>
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-4">
                    {user && (
                        <div className="flex items-center gap-2 overflow-hidden w-full text-left cursor-pointer" onClick={() => navigate('/passport')}>
                            <div className="w-8 h-8 shrink-0 rounded-xl border border-orange-500/50 overflow-hidden ring-2 ring-orange-500/20 shadow-lg">
                                <img src={user.avatarUrl || ''} className="w-full h-full object-cover" alt="User avatar" />
                            </div>
                            <div className="flex flex-col truncate">
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{user.name}</span>
                            </div>
                        </div>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => {
                            if (isAuto) { setIsAuto(false); setTheme('light'); }
                            else if (theme === 'light') { setTheme('dark'); }
                            else if (theme === 'dark') { setTheme('night'); }
                            else { setIsAuto(true); }
                          }}
                          className="p-2 bg-white/5 hover:bg-orange-500/10 text-orange-500 rounded-xl transition-all border border-white/5"
                          title="Cambiar Tema"
                        >
                          {isAuto ? <Clock className="w-4 h-4 animate-pulse" /> : theme === 'light' ? <Sun className="w-4 h-4 text-amber-500" /> : theme === 'dark' ? <Moon className="w-4 h-4" /> : <Moon className="w-4 h-4 fill-slate-900 text-slate-400" />}
                        </button>
                        
                        {isSuperAdmin && (
                            <button
                                onClick={logout}
                                className="p-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl transition-all border border-orange-500/20"
                                title="Cerrar Sesión"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </aside>
    );
};
