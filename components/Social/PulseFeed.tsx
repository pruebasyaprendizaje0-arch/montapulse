import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { Sparkles, MessageSquare, Zap, User, Activity, GripVertical, Crown, MapPin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { SubscriptionPlan } from '../../types';

interface PulseItem {
    id: string;
    type: 'post' | 'message' | 'rsvp' | 'system';
    user: string;
    action: string;
    target?: string;
    timestamp: Date;
    avatar?: string;
    isPremium?: boolean;
    businessName?: string;
    businessLocation?: string;
    businessSector?: string;
}

interface PulseFeedProps {
    isSearchVisible?: boolean;
}

export const PulseFeed: React.FC<PulseFeedProps> = ({ isSearchVisible = false }) => {
    const { posts, messages, events, setShowPulseModal, businesses } = useData();
    const [isVisible, setIsVisible] = useState(true);
    
    // Estado para arrastrar
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    
    // Cargar posición guardada
    useEffect(() => {
        const savedPosition = localStorage.getItem('pulsefeed_position');
        if (savedPosition) {
            try {
                setPosition(JSON.parse(savedPosition));
            } catch (e) {
                console.error('Error loading position:', e);
            }
        }
    }, []);
    
    // Guardar posición cuando cambia
    useEffect(() => {
        if (!isDragging) {
            localStorage.setItem('pulsefeed_position', JSON.stringify(position));
        }
    }, [position, isDragging]);
    
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button')) return;
        setIsDragging(true);
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };
    
    const handleMouseMove = (e: MouseEvent) => {
        if (!isDragging) return;
        setPosition({
            x: e.clientX - dragOffset.current.x,
            y: e.clientY - dragOffset.current.y
        });
    };
    
    const handleMouseUp = () => {
        setIsDragging(false);
    };
    
    useEffect(() => {
        if (isDragging) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging]);

    const pulseItems = useMemo(() => {
        const items: PulseItem[] = [];

        posts.slice(0, 5).forEach(post => {
            const business = businesses.find(b => b.id === post.authorId);
            const isPremiumBusiness = business?.plan === SubscriptionPlan.PREMIUM;
            
            items.push({
                id: `post-${post.id}`,
                type: 'post',
                user: post.authorName,
                action: isPremiumBusiness ? '★ publicó' : 'publicó en el muro',
                timestamp: post.timestamp ? new Date(post.timestamp) : new Date(),
                avatar: post.authorAvatar,
                isPremium: isPremiumBusiness,
                businessName: business?.name,
                businessLocation: business?.locality,
                businessSector: business?.sector
            });
        });

        // Add messages
        messages.slice(-5).forEach(msg => {
            // Check if it's a valid message (not system)
            // Assuming system messages might have a specific flag or we filter by senderId
            if (msg.senderId !== 'system') {
                items.push({
                    id: `msg-${msg.id}`,
                    type: 'message',
                    user: msg.senderName,
                    action: 'envió un mensaje',
                    timestamp: msg.timestamp?.toDate ? msg.timestamp.toDate() : (msg.timestamp ? new Date(msg.timestamp) : new Date()),
                    avatar: msg.senderAvatar
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

    // Ocultar cuando está siendo arrastrado o cuando el buscador está visible
    if (isSearchVisible && !isDragging) return null;

    return (
        <div 
            ref={containerRef}
            className={`fixed z-[550] transition-all duration-200 ${isDragging ? 'cursor-grabbing' : 'cursor-grab'} ${isVisible || isDragging ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
            style={{ 
                left: position.x, 
                top: position.y,
                transform: isDragging ? 'scale(1.05)' : 'scale(1)'
            }}
            onMouseDown={handleMouseDown}
        >
            <div className="glass-panel py-2 px-3 flex items-center gap-3 border border-white/10 shadow-2xl min-w-[200px] max-w-[280px]">
                {/* Indicador de arrastre */}
                <div className="absolute -left-1 -top-1 p-1 text-slate-600 hover:text-slate-400 cursor-grab">
                    <GripVertical className="w-3 h-3" />
                </div>
                <div className="relative">
                    <div className="w-8 h-8 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center">
                        {current.avatar ? (
                            <img src={current.avatar} alt="" className="w-full h-full object-cover" />
                        ) : (
                            <User className="w-4 h-4 text-slate-400" />
                        )}
                    </div>
                    <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-slate-900 flex items-center justify-center ${current.isPremium ? 'bg-amber-500' : 'bg-indigo-500'}`}>
                        {current.type === 'post' && <Sparkles className="w-2 h-2 text-white" />}
                        {current.type === 'message' && <MessageSquare className="w-2 h-2 text-white" />}
                        {current.type === 'rsvp' && <Zap className="w-2 h-2 text-white" />}
                    </div>
                </div>

                <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-1.5 overflow-hidden">
                        {current.isPremium && (
                            <span className="text-[8px] font-black text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.5 rounded">
                                ★
                            </span>
                        )}
                        <span className={`text-[10px] font-black truncate ${current.isPremium ? 'text-amber-400' : 'text-white'}`}>{current.user}</span>
                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{current.action}</span>
                    </div>
                    {current.isPremium && current.businessName && (
                        <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-[7px] text-slate-500 truncate">{current.businessName}</span>
                            {current.businessLocation && (
                                <>
                                    <span className="text-slate-600">•</span>
                                    <span className="text-[7px] text-slate-500">{current.businessLocation}</span>
                                </>
                            )}
                        </div>
                    )}
                    <button
                        onClick={() => setShowPulseModal(true)}
                        className="text-[8px] font-black text-indigo-400 hover:text-indigo-300 uppercase tracking-widest mt-0.5 flex items-center gap-1 transition-colors"
                    >
                        <span>{formatDistanceToNow(current.timestamp, { addSuffix: true, locale: es })}</span>
                        <span className="opacity-50">•</span>
                        <span className="underline">Ver Todo</span>
                    </button>
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
