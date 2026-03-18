import React from 'react';
import { Compass, Calendar, User, MessageSquare, Home, MapPin, Heart, Info } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useData } from '../../context/DataContext';

export const BottomNav: React.FC = () => {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const { setActiveView } = useData();
    const currentPath = location.pathname;

    const navItems = [
        { id: 'home', icon: Home, label: 'HOME', path: '/', action: null },
        { id: 'info', icon: Info, label: 'INFO', path: '/info', action: null },
        { id: 'events', icon: Calendar, label: 'PULSOS', path: '/calendar', action: null },
        { id: 'chat', icon: MessageSquare, label: 'COMUNIDAD', path: '/community', action: null },
        { id: 'profile', icon: User, label: 'PASSPORT', path: '/passport', action: null }
    ] as const;

    const isActive = (path: string | null) => {
        if (!path) return false;
        if (path === '/' && (currentPath === '/' || currentPath === '/explore')) return true;
        if (path === '/info' && currentPath === '/info') return true;
        if (path !== '/' && currentPath.startsWith(path)) return true;
        return false;
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-3xl border-t border-white/5 h-20 px-1 pb-2 z-[1001] flex items-center shadow-[0_-10px_40px_rgba(0,0,0,0.8)] lg:hidden">
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
                        className="relative flex flex-col items-center gap-1 group py-2 flex-1 transition-all"
                    >
                        <div className={`transition-all duration-500 ${active ? 'text-orange-500 scale-110 -translate-y-0.5' : 'text-slate-500 group-hover:text-slate-300'}`}>
                            <Icon className={`w-5 h-5 ${active ? 'fill-orange-500/10 stroke-[2.5px]' : 'stroke-2'}`} />
                        </div>
                        <span className={`text-[7px] font-black uppercase tracking-[0.08em] transition-all duration-300 leading-none ${active ? 'text-orange-500' : 'text-slate-600'}`}>
                            {item.label}
                        </span>
                        {active && (
                            <div className="absolute -top-[1px] w-6 h-[2px] bg-gradient-to-r from-orange-400 to-amber-500 rounded-full blur-[1px] opacity-100 shadow-[0_0_15px_#f97316]" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
};
