import React, { useState, useEffect } from 'react';
import { Compass, Calendar, User, Bell, Home, Heart, History, Star, Users, Layout, Info, Building2, Clock, Sun, Moon, LogOut, Sparkles, Eye } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';
import { useTheme } from '../../hooks/useTheme';
import { subscribeToVisitCount } from '../../services/firestoreService';

export const Sidebar: React.FC = () => {
    const { user, isSuperAdmin, logout } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { isNearbyMinimized, setIsNearbyMinimized, setActiveView } = useData();
    const { theme, setTheme, isAuto, setIsAuto } = useTheme();
    const currentPath = location.pathname;
    const [visitCount, setVisitCount] = useState<number>(0);

    useEffect(() => {
        const unsubscribe = subscribeToVisitCount((count) => {
            setVisitCount(count);
        });
        return () => unsubscribe();
    }, []);

    const navItems = [
        { id: 'history', icon: Home, label: 'NOSOTROS', path: '/' },
        { id: 'explore', icon: Compass, label: 'EXPLORAR', path: '/explore' },
        { id: 'info', icon: Info, label: 'INFO / BUSCAR', path: '/info' },
        { id: 'events', icon: Calendar, label: 'EVENTOS', path: '/calendar' },
        { id: 'notifications', icon: Bell, label: 'AVISOS', path: '/community' },
        { id: 'profile', icon: User, label: 'PASSPORT', path: '/passport' },
        { id: 'plans', icon: Star, label: 'PLANES', path: '/plans' },
    ] as const;

    const isActive = (path: string) => {
        if (path === '/') return currentPath === '/' || currentPath === '/history' || currentPath === '/nosotros';
        if (path === '/explore') return currentPath === '/explore' || currentPath === '/feed' || currentPath.startsWith('/evento/');
        if (path === '/info') return currentPath.startsWith('/info') || currentPath.startsWith('/buscar') || currentPath.startsWith('/directorio');
        if (path === '/calendar') return currentPath.startsWith('/calendar') || currentPath.startsWith('/agenda/');
        if (path === '/community') return currentPath.startsWith('/community') || currentPath.startsWith('/chat') || currentPath.startsWith('/avisos') || currentPath.startsWith('/notificaciones');
        if (path === '/passport') return currentPath.startsWith('/passport') || currentPath.startsWith('/saved-events') || currentPath.startsWith('/perfil') || currentPath.startsWith('/profile');
        if (path === '/plans') return currentPath.startsWith('/plans');
        return currentPath.startsWith(path);
    };

    return (
        <aside className="hidden lg:flex flex-col w-64 bg-slate-900 border-r border-white/5 h-full pt-6 pb-4 px-4 z-40 transition-all overflow-y-auto" aria-label="Barra lateral de navegación">
            <button 
                onClick={() => {
                    setActiveView('history');
                    navigate('/');
                }}
                className="flex flex-col items-center gap-3 mb-8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-2xl p-2 cursor-pointer group"
                aria-label="Ir al inicio"
            >
                <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20 rotate-3 group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
                    <div className="w-3 h-3 bg-white rounded-full animate-ping"></div>
                </div>
                <div className="flex flex-col items-center">
                    <span className="text-xl font-black tracking-tighter text-white leading-none uppercase">ubicame.info</span>
                    <span className="text-xs font-black tracking-[0.3em] text-orange-500 leading-none mt-1">PULSE</span>
                </div>
            </button>

            <nav className="space-y-2" aria-label="Menú principal">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                if (item.id === 'history') setActiveView('history');
                                else if (item.id === 'explore') setActiveView('explore');
                                else if (item.id === 'info') setActiveView('info');
                                else if (item.id === 'events') setActiveView('calendar');
                                else if (item.id === 'notifications') setActiveView('community');
                                else if (item.id === 'profile') setActiveView('favorites');
                                else if (item.id === 'plans') setActiveView('plans');
                                navigate(item.path);
                            }}
                            aria-current={active ? "page" : undefined}
                            aria-label={`Ir a ${item.label}`}
                            className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-2xl transition-all duration-300 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                                active 
                                ? 'bg-orange-500/10 text-orange-500 border border-orange-500/20 shadow-md shadow-orange-500/10' 
                                : 'text-slate-400 hover:bg-white/5 hover:text-white border border-transparent'
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
            </nav>

            <div className="mt-auto pt-6 border-t border-white/5 flex flex-col gap-4">
                <div className="bg-gradient-to-br from-orange-500/10 to-amber-500/10 rounded-2xl p-4 border border-orange-500/20">
                    <div className="flex items-center justify-between mb-1">
                        <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest">Plan Actual</p>
                        <span className="text-[9px] font-black text-white bg-orange-500/20 px-2 py-0.5 rounded-full border border-orange-500/30">
                            {user?.plan || 'Free'}
                        </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight mb-3">
                        {user?.plan === 'Expert' 
                            ? '¡Tienes el plan máximo! Disfruta de todos los beneficios.' 
                            : 'Accede a beneficios exclusivos y funciones avanzadas.'}
                    </p>
                    {user?.plan !== 'Expert' && (
                        <button 
                             onClick={() => navigate('/plans')}
                             className="w-full py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-orange-500/20 flex items-center justify-center gap-2 group"
                        >
                            <Sparkles className="w-3 h-3 group-hover:animate-spin" />
                            Mejorar Plan
                        </button>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-4">
                    {user && (
                        <button 
                            onClick={() => {
                                setActiveView('favorites');
                                navigate('/passport');
                            }}
                            aria-label={`Ver perfil de ${user.name}`}
                            className="flex items-center gap-2 overflow-hidden w-full text-left p-1 rounded-xl hover:bg-white/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 group"
                        >
                            <div className="w-8 h-8 shrink-0 rounded-xl border border-orange-500/50 overflow-hidden ring-2 ring-orange-500/20 shadow-lg group-hover:scale-105 transition-transform">
                                <img src={user.avatarUrl || ''} className="w-full h-full object-cover" alt={`Avatar de ${user.name}`} />
                            </div>
                            <div className="flex flex-col truncate">
                                <span className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{user.name}</span>
                            </div>
                        </button>
                    )}

                    <div className="flex items-center gap-1 shrink-0">
                        {isSuperAdmin && (
                            <div 
                              className="px-2.5 py-1.5 bg-white/5 text-orange-500 rounded-xl border border-white/5 flex items-center gap-1.5 font-mono font-bold text-xs"
                              title="Contador de visitas (Solo Admin)"
                            >
                              <Eye className="w-4 h-4 animate-pulse" />
                              <span>{visitCount.toLocaleString()}</span>
                            </div>
                        )}
                        
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
