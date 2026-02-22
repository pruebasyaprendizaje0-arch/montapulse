import React, { useState, useEffect, useMemo } from 'react';
import { useData } from '../../context/DataContext';
import { Sparkles, MessageSquare, Zap, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';

interface PulseItem {
    id: string;
    type: 'post' | 'message' | 'rsvp' | 'system';
    user: string;
    action: string;
    target?: string;
    timestamp: Date;
    avatar?: string;
}

export const PulseFeed: React.FC = () => {
    const { posts, messages, events } = useData();
    const [isVisible, setIsVisible] = useState(true);

    const pulseItems = useMemo(() => {
        const items: PulseItem[] = [];

        // Add posts
        posts.slice(0, 5).forEach(post => {
            items.push({
                id: `post-${post.id}`,
                type: 'post',
                user: post.authorName,
                action: 'publicó en el muro',
                timestamp: post.createdAt instanceof Date ? post.createdAt : new Date(),
                avatar: post.authorAvatar
            });
        });

        // Add messages
        messages.slice(-5).forEach(msg => {
            if (msg.type !== 'system') {
                items.push({
                    id: `msg-${msg.id}`,
                    type: 'message',
                    user: msg.authorName,
                    action: 'envió un mensaje',
                    timestamp: msg.createdAt instanceof Date ? msg.createdAt : new Date(),
                    avatar: msg.authorAvatar
                });
            }
        });

        // Add RSVPs (simulated from event interestedCount for now, 
        // in a real app we'd subscribe to the rsvps collection)
        events.filter(e => e.interestedCount > 0).slice(0, 3).forEach(event => {
            items.push({
                id: `rsvp-${event.id}`,
                type: 'rsvp',
                user: 'Alguien',
                action: `va a ${event.title}`,
                timestamp: new Date(Date.now() - Math.random() * 3600000), // Random within last hour
            });
        });

        return items.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 5);
    }, [posts, messages, events]);

    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (pulseItems.length === 0) return;
        const timer = setInterval(() => {
            setCurrentIndex(prev => (prev + 1) % pulseItems.length);
        }, 6000);
        return () => clearInterval(timer);
    }, [pulseItems.length]);

    if (pulseItems.length === 0) return null;

    const current = pulseItems[currentIndex];

    return (
        <div className={`fixed top-24 left-4 z-[60] transition-all duration-700 ${isVisible ? 'translate-x-0 opacity-100' : '-translate-x-full opacity-0'}`}>
            <div className="glass-panel py-2 px-3 flex items-center gap-3 border border-white/10 shadow-2xl min-w-[200px] max-w-[280px] animate-in slide-in-from-left duration-500">
                <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                        {current.avatar ? (
                            <img src={current.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-4 h-4 text-slate-400" />
                        )}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-indigo-500 border-2 border-slate-900 flex items-center justify-center">
                        {current.type === 'post' && <Sparkles className="w-2 h-2 text-white" />}
                        {current.type === 'message' && <MessageSquare className="w-2 h-2 text-white" />}
                        {current.type === 'rsvp' && <Zap className="w-2 h-2 text-white" />}
                    </div>
                </div>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        <span className="text-[10px] font-black text-white truncate">{current.user}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{current.action}</span>
                    </div>
                    <span className="text-[8px] font-bold text-indigo-400 uppercase tracking-widest">
                        {formatDistanceToNow(current.timestamp, { addSuffix: true, locale: es })}
                    </span>
                </div>

                <button
                    onClick={() => setIsVisible(false)}
                    className="ml-auto p-1 text-slate-600 hover:text-slate-400 transition-colors"
                >
                    <div className="w-1 h-4 bg-slate-800 rounded-full" />
                </button>
            </div>
        </div>
    );
};
