import React from 'react';
import { Compass, Calendar, User, MessageSquare, Home, MapPin, Heart, History, Star, Users, Layout, Info } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';

export const Sidebar: React.FC = () => {
    const { user, isSuperAdmin } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { isNearbyMinimized, setIsNearbyMinimized, setActiveView } = useData();
    const currentPath = location.pathname;

    const navItems = [
        { id: 'explore', icon: MapPin, label: 'EXPLORAR', path: '/explore', action: null },
        { id: 'events', icon: Calendar, label: 'CALENDARIO', path: '/calendar', action: null },
        { id: 'favorites', icon: Heart, label: 'PASSPORT', path: '/passport', action: 'favorites' },
        { id: 'chat', icon: MessageSquare, label: 'COMUNIDAD', path: '/community', action: null },
        { id: 'info', icon: Info, label: 'INFO', path: '/info', action: null },
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
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-white/5 h-full pt-20 pb-8 px-4 z-40 transition-all">
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
                            {active && (
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

            <div className="mt-auto pt-6 border-t border-white/5">
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
            </div>
        </aside>
    );
};
