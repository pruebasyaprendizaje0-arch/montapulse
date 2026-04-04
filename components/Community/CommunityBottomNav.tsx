import React from 'react';
import { MessageSquare, CircleDashed, Users, Phone } from 'lucide-react';
import { useData } from '../../context/DataContext';

export const CommunityBottomNav: React.FC = () => {
    const { communityTab, setCommunityTab } = useData();

    const tabs = [
        { id: 'chats', icon: MessageSquare, label: 'Chats' },
        { id: 'updates', icon: CircleDashed, label: 'Novedades' },
        { id: 'communities', icon: Users, label: 'Comunidades' },
        { id: 'calls', icon: Phone, label: 'Llamadas' }
    ] as const;

    return (
        <nav className="fixed bottom-0 left-0 right-0 bg-[#0b141a] border-t border-white/5 h-20 px-1 pb-2 z-[1001] flex items-center shadow-[0_-10px_40px_rgba(0,0,0,0.8)] lg:hidden transition-all duration-500 animate-in slide-in-from-bottom">
            {tabs.map((tab) => {
                const Icon = tab.icon;
                const active = communityTab === tab.id;
                return (
                    <button
                        key={tab.id}
                        onClick={() => setCommunityTab(tab.id)}
                        className="relative flex flex-col items-center gap-1.5 group py-2 flex-1 transition-all"
                    >
                        <div className={`
                            relative px-4 py-1 rounded-full transition-all duration-300
                            ${active ? 'bg-[#00a884]/20' : 'bg-transparent group-hover:bg-white/5'}
                        `}>
                            <Icon className={`
                                w-6 h-6 transition-all duration-300
                                ${active ? 'text-[#00a884] scale-110' : 'text-slate-400 group-hover:text-slate-200'}
                                ${active ? 'stroke-[2.5px]' : 'stroke-2'}
                            `} />
                            {tab.id === 'updates' && !active && (
                                <div className="absolute top-1 right-3.5 w-2.5 h-2.5 bg-[#00a884] rounded-full border-2 border-[#0b141a]" />
                            )}
                        </div>
                        <span className={`
                            text-[11px] font-medium tracking-wide transition-all duration-300
                            ${active ? 'text-[#00a884] font-bold' : 'text-slate-400'}
                        `}>
                            {tab.label}
                        </span>
                        {active && (
                            <div className="absolute -top-[1px] w-12 h-[2px] bg-[#00a884] rounded-full shadow-[0_0_10px_#00a884]" />
                        )}
                    </button>
                );
            })}
        </nav>
    );
};
