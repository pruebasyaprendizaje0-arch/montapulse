import React, { useState, useEffect } from 'react';
import { Compass, Calendar, User, Bell, Home, Heart, History, Star, Info, LogOut, Sparkles, Eye, Shield, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { subscribeToVisitCount } from '../../services/firestoreService';

export const TopNavbar: React.FC = () => {
    const { user, isSuperAdmin, logout } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { setActiveView } = useData();
    const currentPath = location.pathname;
    const [visitCount, setVisitCount] = useState<number>(0);

    useEffect(() => {
        const unsubscribe = subscribeToVisitCount((count) => {
            setVisitCount(count);
        });
        return () => unsubscribe();
    }, []);

    const navItems = [
        { id: 'history', icon: Home, label: 'NOSOTROS', path: '/', action: 'history' },
        { id: 'explore', icon: Compass, label: 'EXPLORAR', path: '/explore', action: 'explore' },
        { id: 'info', icon: Search, label: 'INFO / BUSCAR', path: '/info', action: 'info' },
        { id: 'events', icon: Calendar, label: 'EVENTOS', path: '/calendar', action: 'calendar' },
        { id: 'notifications', icon: Bell, label: 'AVISOS', path: '/community', action: 'community' },
        { id: 'profile', icon: User, label: 'PASSPORT', path: '/passport', action: 'favorites' },
        { id: 'plans', icon: Star, label: 'SUSCRIPCIONES', path: '/plans', action: 'plans' },
    ] as const;

    const isActive = (path: string) => {
        if (path === '/') return currentPath === '/' || currentPath === '/history' || currentPath === '/nosotros';
        if (path === '/explore') return currentPath === '/explore' || currentPath === '/feed' || currentPath.startsWith('/evento/');
        if (path === '/info') return currentPath.startsWith('/info') || currentPath.startsWith('/buscar') || currentPath.startsWith('/directorio');
        if (path === '/calendar') return currentPath.startsWith('/calendar') || currentPath.startsWith('/agenda/');
        if (path === '/passport') return currentPath.startsWith('/passport') || currentPath.startsWith('/saved-events') || currentPath.startsWith('/perfil') || currentPath.startsWith('/profile');
        if (path === '/community') return currentPath.startsWith('/community') || currentPath.startsWith('/chat') || currentPath.startsWith('/avisos') || currentPath.startsWith('/notificaciones');
        if (path === '/plans') return currentPath.startsWith('/plans');
        return currentPath.startsWith(path);
    };

    return (
        <header className="sticky top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-white/10 transition-colors duration-300">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
                
                {/* Brand / Logo Semántico */}
                <button 
                    onClick={() => {
                        setActiveView('history');
                        navigate('/');
                    }}
                    aria-label="Ir al inicio de ubicame.info MontaPulse"
                    className="flex items-center gap-3 cursor-pointer group shrink-0 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-2xl p-1"
                >
                    <div className="w-9 h-9 sm:w-11 sm:h-11 bg-gradient-to-br from-orange-500 to-amber-500 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/25 rotate-3 group-hover:rotate-6 group-hover:scale-105 transition-transform duration-300">
                        <div className="w-2.5 sm:w-3.5 h-2.5 sm:h-3.5 bg-white rounded-full animate-ping" />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-base sm:text-lg lg:text-xl font-black tracking-tighter text-white leading-none uppercase">
                            ubicame.info
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-black tracking-[0.3em] text-orange-500 leading-none mt-1">
                            PULSE
                        </span>
                    </div>
                </button>

                {/* Desktop Navigation Links */}
                <nav className="hidden lg:flex items-center gap-1 xl:gap-2" aria-label="Navegación principal superior">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const active = isActive(item.path);
                        return (
                            <button
                                key={item.id}
                                onClick={() => {
                                    if (item.action) setActiveView(item.action as any);
                                    navigate(item.path);
                                }}
                                aria-current={active ? "page" : undefined}
                                aria-label={`Ir a ${item.label}`}
                                className={`relative flex items-center gap-2 px-3.5 py-2 xl:px-4 xl:py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all duration-200 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                                    active
                                        ? 'text-orange-400 bg-orange-500/15 shadow-[inset_0_0_12px_rgba(249,115,22,0.15)] border border-orange-500/30'
                                        : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                                }`}
                            >
                                <Icon className={`w-4 h-4 transition-transform group-hover:scale-110 ${active ? 'stroke-[2.5px] text-orange-500' : 'stroke-2'}`} />
                                <span>{item.label}</span>
                                {active && (
                                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-orange-500 rounded-full shadow-[0_0_8px_#f97316]" />
                                )}
                            </button>
                        );
                    })}
                </nav>

                {/* Right Action Controls */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                    {/* Botón Buscar en Celular -> Abre Directorio */}
                    <button
                        onClick={() => navigate('/info')}
                        className={`flex lg:hidden p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
                            currentPath === '/info'
                                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/30'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                        }`}
                        title="Buscar en Directorio"
                        aria-label="Buscar en Directorio"
                    >
                        <Search className="w-4 h-4" />
                    </button>

                    {/* Contador de Visitas */}
                    {visitCount > 0 && (
                        <div 
                            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs font-bold text-amber-400 shadow-sm"
                            title="Visitas registradas"
                        >
                            <Eye className="w-3.5 h-3.5 text-orange-400" />
                            <span className="tabular-nums font-black text-xs text-white">{visitCount}</span>
                        </div>
                    )}

                    {/* Upgrade Plan Button (Desktop only when not Expert) */}
                    {user && user.plan !== 'Expert' && (
                        <button
                            onClick={() => navigate('/plans')}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-95 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                            title="Mejorar Plan"
                            aria-label="Mejorar Plan de Membresía"
                        >
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            <span className="hidden md:inline">Mejorar Plan</span>
                        </button>
                    )}

                    {/* User Profile Card / Login */}
                    {user ? (
                        <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-white/10">
                            <button 
                                onClick={() => navigate('/passport')}
                                className="flex items-center gap-2 group p-1 rounded-xl hover:bg-white/5 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 text-left"
                                title="Ver Perfil"
                                aria-label={`Ver perfil de ${user.name}`}
                            >
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-orange-500/50 overflow-hidden ring-2 ring-orange-500/20 shadow-md group-hover:scale-105 transition-transform">
                                    <img 
                                        src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                                        className="w-full h-full object-cover" 
                                        alt={`Avatar de ${user.name}`} 
                                    />
                                </div>
                                <div className="hidden xl:flex flex-col text-left">
                                    <span className="text-xs font-black text-white uppercase tracking-tight truncate max-w-[100px]">
                                        {user.name}
                                    </span>
                                    <span className={`text-[8px] font-black uppercase tracking-wider px-1.5 py-0.2 rounded leading-none w-fit ${
                                        user.role === 'admin' ? 'text-amber-400 bg-amber-500/15' :
                                        user.role === 'host' ? 'text-blue-400 bg-blue-500/15' :
                                        'text-green-400 bg-green-500/15'
                                    }`}>
                                        {user.role === 'admin' ? (isSuperAdmin ? 'King' : 'Admin') : user.role === 'host' ? 'Host' : 'Visitor'}
                                    </span>
                                </div>
                            </button>

                            {/* Logout button */}
                            <button
                                onClick={logout}
                                className="p-2 sm:p-2.5 bg-white/5 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 rounded-xl transition-all active:scale-95 border border-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
                                title="Cerrar Sesión"
                                aria-label="Cerrar Sesión"
                            >
                                <LogOut className="w-4 h-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            onClick={() => navigate('/login')}
                            className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/25 active:scale-95 transition-all"
                        >
                            Acceder
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};
