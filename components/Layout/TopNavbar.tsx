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
        { id: 'history', icon: History, label: 'NOSOTROS', path: '/', action: null },
        { id: 'explore', icon: Compass, label: 'EXPLORAR', path: '/explore', action: null },
        { id: 'events', icon: Calendar, label: 'EVENTOS', path: '/calendar', action: null },
        { id: 'favorites', icon: Heart, label: 'PASSPORT', path: '/passport', action: 'favorites' },
        { id: 'notifications', icon: Bell, label: 'NOTIFICACIONES', path: '/community', action: null },
        { id: 'plans', icon: Star, label: 'SUSCRIPCIONES', path: '/plans', action: null },
        { id: 'info', icon: Info, label: 'AYUDA / INFO', path: '/info', action: null },
    ] as const;

    const isActive = (path: string | null) => {
        if (!path) return false;
        if (path === '/' && (currentPath === '/' || currentPath === '/history')) return true;
        if (path === '/explore' && currentPath.startsWith('/explore')) return true;
        if (path === '/info' && currentPath === '/info') return true;
        if (path !== '/' && currentPath.startsWith(path)) return true;
        return false;
    };

    return (
        <header className="sticky top-0 left-0 right-0 z-50 bg-slate-900/90 backdrop-blur-xl border-b border-white/10 transition-colors duration-300">
            <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">
                
                {/* Brand / Logo */}
                <div 
                    onClick={() => navigate('/')}
                    className="flex items-center gap-3 cursor-pointer select-none group shrink-0"
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
                </div>

                {/* Desktop Navigation Links (Option 1 - Top Navbar) */}
                <nav className="hidden lg:flex items-center gap-1 xl:gap-2">
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
                                className={`relative flex items-center gap-2 px-3.5 py-2 xl:px-4 xl:py-2.5 rounded-xl font-black text-xs tracking-wider uppercase transition-all duration-200 group ${
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
                    {/* Botón Lupa en Celular -> Abre Ayuda / Información */}
                    <button
                        onClick={() => navigate('/info')}
                        className={`flex lg:hidden p-2 sm:p-2.5 rounded-xl border transition-all active:scale-95 items-center justify-center ${
                            currentPath === '/info'
                                ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/30'
                                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border-white/10'
                        }`}
                        title="Buscar en Ayuda e Información"
                        aria-label="Buscar en Ayuda e Información"
                    >
                        <Search className="w-4 h-4" />
                    </button>

                    {/* Visits Counter */}
                    <div 
                        className="px-2.5 sm:px-3 py-1.5 sm:py-2 bg-orange-500/10 text-orange-500 rounded-xl border border-orange-500/20 flex items-center gap-1.5 font-mono font-bold text-xs sm:text-sm shadow-sm"
                        title="Contador de visitas"
                    >
                        <Eye className="w-3.5 h-3.5 sm:w-4 sm:h-4 animate-pulse shrink-0" />
                        <span>{visitCount.toLocaleString()}</span>
                    </div>

                    {/* Upgrade Plan Button (Desktop only when not Expert) */}
                    {user && user.plan !== 'Expert' && (
                        <button
                            onClick={() => navigate('/plans')}
                            className="hidden sm:flex items-center gap-1.5 px-3 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-95 transition-all"
                            title="Mejorar Plan"
                        >
                            <Sparkles className="w-3.5 h-3.5 animate-spin" />
                            <span className="hidden md:inline">Mejorar Plan</span>
                        </button>
                    )}

                    {/* User Profile Card / Login */}
                    {user ? (
                        <div className="flex items-center gap-2 pl-2 sm:border-l sm:border-white/10">
                            <div 
                                onClick={() => navigate('/passport')}
                                className="flex items-center gap-2 cursor-pointer group p-1 rounded-xl hover:bg-white/5 transition-all"
                                title="Ver Perfil / Passport"
                            >
                                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl border border-orange-500/50 overflow-hidden ring-2 ring-orange-500/20 shadow-md group-hover:scale-105 transition-transform">
                                    <img 
                                        src={user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} 
                                        className="w-full h-full object-cover" 
                                        alt="Avatar" 
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
                            </div>

                            {/* Logout button */}
                            <button
                                onClick={logout}
                                className="p-2 sm:p-2.5 bg-white/5 hover:bg-orange-500/20 text-slate-400 hover:text-orange-400 rounded-xl transition-all active:scale-95 border border-white/5"
                                title="Cerrar Sesión"
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
