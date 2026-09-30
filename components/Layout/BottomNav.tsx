import React from 'react';
import { Calendar, User, Bell, Home, Compass, Search } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';

export const BottomNav: React.FC = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const { setActiveView } = useData();
    const currentPath = location.pathname;

    const navItems = [
        { id: 'history', icon: Home, label: 'NOSOTROS', path: '/' },
        { id: 'explore', icon: Compass, label: 'EXPLORAR', path: '/explore' },
        { id: 'info', icon: Search, label: 'INFO / BUSCAR', path: '/info' },
        { id: 'events', icon: Calendar, label: 'EVENTOS', path: '/calendar' },
        { id: 'notifications', icon: Bell, label: 'AVISOS', path: '/community' },
        { id: 'profile', icon: User, label: 'PASSPORT', path: '/passport' }
    ] as const;

    const isActive = (path: string) => {
        if (path === '/') return currentPath === '/' || currentPath === '/history' || currentPath === '/nosotros';
        if (path === '/explore') return currentPath === '/explore' || currentPath === '/feed' || currentPath.startsWith('/evento/');
        if (path === '/info') return currentPath.startsWith('/info') || currentPath.startsWith('/buscar') || currentPath.startsWith('/directorio');
        if (path === '/calendar') return currentPath.startsWith('/calendar') || currentPath.startsWith('/agenda/');
        if (path === '/community') return currentPath.startsWith('/community') || currentPath.startsWith('/chat') || currentPath.startsWith('/avisos') || currentPath.startsWith('/notificaciones');
        if (path === '/passport') return currentPath.startsWith('/passport') || currentPath.startsWith('/saved-events') || currentPath.startsWith('/perfil') || currentPath.startsWith('/profile');
        return currentPath.startsWith(path);
    };

    return (
        <nav 
            className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-3xl border-t border-white/5 h-20 px-1 pb-2 z-[1001] flex items-center shadow-[0_-10px_40px_rgba(0,0,0,0.8)] lg:hidden"
            aria-label="Navegación principal inferior"
        >
            {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.id === 'history') {
                                setActiveView('history');
                            } else if (item.id === 'explore') {
                                setActiveView('explore');
                            } else if (item.id === 'info') {
                                setActiveView('info');
                            } else if (item.id === 'events') {
                                setActiveView('calendar');
                            } else if (item.id === 'notifications') {
                                setActiveView('community');
                            } else if (item.id === 'profile') {
                                setActiveView('favorites');
                            }
                            navigate(item.path);
                        }}
                        aria-current={active ? "page" : undefined}
                        aria-label={`Ir a ${item.label}`}
                        className="relative flex flex-col items-center gap-1 group py-2 flex-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 rounded-xl"
                    >
                        <div className={`relative flex items-center justify-center w-10 h-10 transition-all duration-500 ${active ? 'text-orange-500 scale-110 -translate-y-0.5' : 'text-slate-500 group-hover:text-slate-300'}`}>
                            <Icon className={`w-5 h-5 ${active ? 'fill-orange-500/10 stroke-[2.5px]' : 'stroke-2'}`} />
                        </div>
                        <span className={`text-[7.5px] sm:text-[8px] font-black uppercase tracking-[0.1em] transition-all duration-300 leading-none mt-1 ${active ? 'text-orange-500 scale-105' : 'text-slate-600 group-hover:text-slate-400'}`}>
                            {item.label}
                        </span>
                        {active && (
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-[3px] bg-gradient-to-r from-orange-400 via-amber-500 to-orange-400 rounded-full blur-[1px] opacity-100 shadow-[0_0_20px_#f97316] animate-pulse" />
                        )}
                        <div className={`absolute bottom-1 w-1 h-1 rounded-full bg-orange-500 transition-all duration-500 ${active ? 'opacity-100 scale-100 shadow-[0_0_8px_#f97316]' : 'opacity-0 scale-0'}`} />
                    </button>
                );
            })}
        </nav>
    );
};

