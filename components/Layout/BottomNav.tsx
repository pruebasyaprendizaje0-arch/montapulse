import React from 'react';
import { Compass, Calendar, User, MessageSquare, Home } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuthContext } from '../../context/AuthContext';
import { useTranslation } from 'react-i18next';

export const BottomNav: React.FC = () => {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const location = useLocation();
    const { t } = useTranslation();
    const currentPath = location.pathname;

    const navItems = [
        { id: 'home', icon: Home, label: 'INICIO', path: '/' },
        { id: 'explore', icon: Compass, label: 'MAPA', path: '/explore' },
        { id: 'chat', icon: MessageSquare, label: 'CHAT', path: '/community' },
        { id: 'profile', icon: User, label: 'PERFIL', path: '/host' }
    ];

    const isActive = (path: string) => {
        if (path === '/' && currentPath === '/') return true;
        if (path !== '/' && currentPath.startsWith(path)) return true;
        return false;
    };

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-black/95 backdrop-blur-3xl border-t border-white/10 h-20 px-2 pb-2 z-[60] flex items-center">
            {navItems.map((item, index) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                return (
                    <button
                        key={item.id}
                        onClick={() => navigate(item.path)}
                        className={`relative flex flex-col items-center gap-1.5 group py-2 flex-1 transition-all ${index < navItems.length - 1 ? 'border-r border-white/5' : ''}`}
                    >
                        <div className={`transition-all duration-500 ${active ? 'text-orange-500 scale-110' : 'text-slate-500 group-hover:text-slate-300'}`}>
                            <Icon className={`w-6 h-6 ${active ? 'fill-orange-500/10 stroke-[2.5px]' : 'stroke-2'}`} />
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-tighter transition-all duration-300 ${active ? 'text-orange-500' : 'text-slate-500 opacity-60'}`}>
                            {item.label}
                        </span>
                        {active && (
                            <div className="absolute -top-2 w-10 h-1 bg-orange-500 rounded-full blur-[3px] opacity-100 shadow-[0_0_10px_#f97316]" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
};
