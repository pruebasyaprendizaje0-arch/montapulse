import React, { useState } from 'react';
import { MessageSquare, MoreHorizontal, Sparkles } from 'lucide-react';
import { BottomNav } from '../components/Layout/BottomNav.tsx';
import { useAuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';

export const Community: React.FC = () => {
    const { user } = useAuthContext();
    const [activeTab, setActiveTab] = useState<'groups' | 'direct'>('groups');
    const { t } = useTranslation();

    const mockCommunityItems = [
        {
            id: '1',
            name: 'Surf Group',
            lastMessage: 'Meet at the beach in 10? The swell is pe...',
            time: '2m ago',
            status: 'orange',
            avatar: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=100&h=100&fit=crop'
        },
        {
            id: '2',
            name: 'Nightlife Crew',
            lastMessage: "Check out this venue! It's hosting ...",
            time: '15m ago',
            status: 'orange',
            badge: 3,
            avatar: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?w=100&h=100&fit=crop'
        },
        {
            id: '3',
            name: 'Mountain Hikers',
            lastMessage: 'Does anyone have a spare compass for...',
            time: '1h ago',
            status: 'none',
            avatar: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=100&h=100&fit=crop'
        },
        {
            id: '4',
            name: 'Marco V.',
            lastMessage: 'Are you coming to the meet-up later?',
            time: '3h ago',
            status: 'green',
            isUser: true,
            avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop'
        },
        {
            id: '5',
            name: 'Festival Vibes',
            lastMessage: "Who's grabbing the early bird tickets?",
            time: 'Yesterday',
            status: 'none',
            avatar: 'https://images.unsplash.com/photo-1459749411177-042180ce673c?w=100&h=100&fit=crop'
        },
        {
            id: '6',
            name: 'Sarah Jenkins',
            lastMessage: 'That surf spot was incredible, thanks fo...',
            time: 'Yesterday',
            status: 'none',
            isUser: true,
            avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=100&h=100&fit=crop'
        }
    ];

    return (
        <div className="min-h-screen bg-[#000000] text-white pb-24">
            <div className="pt-8 px-6 flex items-center justify-between mb-8">
                <h1 className="text-3xl font-black">Community</h1>
                <div className="flex items-center gap-6 text-slate-400">
                    <button className="hover:text-white transition-colors">
                        <Sparkles className="w-6 h-6" />
                    </button>
                    <button className="hover:text-white transition-colors">
                        <MoreHorizontal className="w-6 h-6 rotate-90" />
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="px-6 mb-8">
                <div className="bg-[#111111] p-1.5 rounded-2xl flex border border-white/5">
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'groups' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        Groups
                    </button>
                    <button
                        onClick={() => setActiveTab('direct')}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all ${activeTab === 'direct' ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/20' : 'text-slate-500 hover:text-white'}`}
                    >
                        Direct Messages
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="px-6 space-y-2">
                {mockCommunityItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-4 py-4 px-2 hover:bg-white/5 rounded-3xl transition-all cursor-pointer group">
                        <div className="relative">
                            <div className={`w-14 h-14 overflow-hidden border border-white/10 ${item.isUser ? 'rounded-full' : 'rounded-2xl'}`}>
                                <img src={item.avatar} alt={item.name} className="w-full h-full object-cover" />
                            </div>
                            {item.status !== 'none' && (
                                <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-black ${item.status === 'orange' ? 'bg-orange-500 shadow-[0_0_10px_#f97316]' : 'bg-emerald-500 shadow-[0_0_10px_#10b981]'}`} />
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="font-black text-base truncate tracking-tight">{item.name}</h3>
                                <span className="text-[11px] font-bold text-orange-500/80">{item.time}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                                <p className="text-sm text-slate-500 truncate font-medium">{item.lastMessage}</p>
                                {item.badge && (
                                    <div className="min-w-[1.25rem] h-5 bg-orange-600 rounded-lg flex items-center justify-center text-[10px] font-black px-1 shadow-lg shadow-orange-600/20">
                                        {item.badge}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Compose Button */}
            <button className="fixed bottom-28 right-6 w-16 h-16 bg-orange-500 rounded-3xl shadow-2xl shadow-orange-500/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50">
                <div className="w-8 h-8 rounded-lg border-2 border-white flex items-center justify-center">
                    <div className="w-4 h-1 bg-white rotate-45 translate-x-1 -translate-y-1"></div>
                    <div className="w-5 h-5 border-2 border-white absolute"></div>
                </div>
                {/* Better Icon Approximation */}
                <div className="relative w-8 h-8 flex items-center justify-center">
                    <div className="absolute w-6 h-6 border-[3px] border-white rounded-lg"></div>
                    <div className="absolute w-3 h-[3px] bg-white rotate-45 translate-x-1.5 -translate-y-1.5"></div>
                </div>
            </button>

            <BottomNav />
        </div>
    );
};
