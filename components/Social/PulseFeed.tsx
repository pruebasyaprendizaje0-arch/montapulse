import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useData } from '../../context/DataContext';
import { LikeFeedback } from './LikeFeedback';
import { Sparkles, MessageSquare, Zap, User, Activity, GripVertical, Crown, MapPin, Heart } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { SubscriptionPlan } from '../../types';

interface PulseItem {
    id: string;
    realId: string;
    type: 'post' | 'message' | 'rsvp' | 'system';
    user: string;
    action: string;
    target?: string;
    timestamp: Date;
    avatar?: string;
    isPremium?: boolean;
    isFeatured?: boolean;
    businessName?: string;
    businessLocation?: string;
    businessSector?: string;
    likes?: string[];
}

interface PulseFeedProps {
    isSearchVisible?: boolean;
}

export const PulseFeed: React.FC<PulseFeedProps> = ({ isSearchVisible = false }) => {
    const { posts, messages, events, setShowPulseModal, businesses, handleLikePost, toggleFavorite, user, favorites } = useData();
    const [isVisible, setIsVisible] = useState(true);
    
    // Estado para arrastrar con posición inicial por defecto visible
    const [position, setPosition] = useState({ x: 20, y: 150 });
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const [feedbacks, setFeedbacks] = useState<{ id: number; x: number; y: number }[]>([]);

    const addFeedback = (x: number, y: number) => {
        const id = Date.now();
        setFeedbacks(prev => [...prev, { id, x, y }]);
    };

    const removeFeedback = (id: number) => {
        setFeedbacks(prev => prev.filter(f => f.id !== id));
    };
    
    // Cargar posición guardada
    useEffect(() => {
        const savedPosition = localStorage.getItem('pulsefeed_position');
        if (savedPosition) {
            try {
                const parsed = JSON.parse(savedPosition);
                // Validar que la posición esté dentro de límites razonables
                if (typeof parsed.x === 'number' && typeof parsed.y === 'number') {
                    setPosition(parsed);
                }
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
            const isPremiumBusiness = business?.plan === SubscriptionPlan.EXPERT;
            
            items.push({
                id: `post-${post.id}`,
                realId: post.id,
                type: 'post',
                user: post.authorName,
                action: isPremiumBusiness ? '★ publicó' : 'publicó en el muro',
                timestamp: post.timestamp ? new Date(post.timestamp) : new Date(),
                avatar: post.authorAvatar,
                isPremium: isPremiumBusiness,
                isFeatured: post.isFeatured,
                businessName: business?.name,
                businessLocation: business?.locality,
                businessSector: business?.sector,
                likes: post.likes || []
            });
        });

        // Add messages
        messages.slice(-5).forEach(msg => {
            // Check if it's a valid message (not system)
            // Assuming system messages might have a specific flag or we filter by senderId
            if (msg.senderId !== 'system') {
                items.push({
                    id: `msg-${msg.id}`,
                    realId: msg.id,
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
                realId: event.id,
                type: 'rsvp',
                user: 'Alguien',
                action: `va a ${event.title}`,
                timestamp: new Date(Date.now() - Math.random() * 3600000), // Random within last hour
            });
        });

        return items.sort((a, b) => {
            // Priority 1: Featured (Admin/Special)
            if (a.isFeatured && !b.isFeatured) return -1;
            if (!a.isFeatured && b.isFeatured) return 1;
            
            // Priority 2: Premium
            if (a.isPremium && !b.isPremium) return -1;
            if (!a.isPremium && b.isPremium) return 1;
            
            // Priority 3: Freshness
            return b.timestamp.getTime() - a.timestamp.getTime();
        }).slice(0, 5);
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

                <div className="flex flex-col min-w-0 flex-1">
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

                {(current.type === 'post' || current.type === 'rsvp') && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            addFeedback(e.clientX, e.clientY);
                            if (current.type === 'post') {
                                handleLikePost(current.realId);
                            } else if (current.type === 'rsvp') {
                                toggleFavorite(current.realId);
                            }
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-full transition-all group relative border border-white/5 active:scale-95"
                    >
                        <Heart 
                            className={`w-3.5 h-3.5 ${
                                (current.type === 'post' && current.likes?.includes(user?.uid || user?.id || '')) || 
                                (current.type === 'rsvp' && favorites.includes(current.realId))
                                ? 'fill-rose-500 text-rose-500' 
                                : 'text-slate-400 group-hover:text-rose-400'
                            }`} 
                        />
                        {(current.type === 'post' && current.likes && current.likes.length > 0) && (
                            <div className="absolute -top-1 -right-1 flex items-center justify-center min-w-[12px] h-[12px] bg-rose-500 rounded-full border border-slate-900 shadow-lg">
                                <span className="text-[7px] font-black text-white px-0.5">
                                    {current.likes.length}
                                </span>
                            </div>
                        )}
                    </button>
                )}

                {feedbacks.map(f => (
                    <LikeFeedback 
                        key={f.id} 
                        x={f.x} 
                        y={f.y} 
                        onComplete={() => removeFeedback(f.id)} 
                    />
                ))}

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


