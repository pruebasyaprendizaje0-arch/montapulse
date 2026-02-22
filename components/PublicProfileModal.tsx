import React, { useState, useEffect } from 'react';
import { X, MapPin, MessageCircle, Phone, Instagram, Globe, Calendar, Star, Zap, UserPlus, UserCheck, Send } from 'lucide-react';
import { Business, UserProfile, MontanitaEvent, BusinessReview } from '../types';
import { useData } from '../context/DataContext';
import { subscribeToBusinessReviews, addBusinessReview } from '../services/firestoreService';
import { useAuthContext } from '../context/AuthContext';

interface PublicProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    businessId?: string;
    userId?: string;
}

export const PublicProfileModal: React.FC<PublicProfileModalProps> = ({
    isOpen,
    onClose,
    businessId,
    userId
}) => {
    const { businesses, events, allUsers, handleToggleFollow, isBusinessFollowed } = useData();
    const { user: currentUser } = useAuthContext();
    const [reviews, setReviews] = useState<BusinessReview[]>([]);
    const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Find the target profile
    const business = businessId ? businesses.find(b => b.id === businessId) : null;
    const userProfile = userId ? allUsers.find(u => u.id === userId) : null;

    const isFollowing = businessId ? isBusinessFollowed(businessId) : false;

    useEffect(() => {
        if (businessId && isOpen) {
            return subscribeToBusinessReviews(businessId, setReviews);
        }
    }, [businessId, isOpen]);

    const handleSubmitReview = async () => {
        if (!currentUser || !businessId) return;
        if (!newReview.comment.trim()) return;

        setIsSubmitting(true);
        try {
            await addBusinessReview({
                businessId,
                userId: currentUser.id,
                userName: `${currentUser.name} ${currentUser.surname}`,
                userAvatar: currentUser.avatarUrl,
                rating: newReview.rating,
                comment: newReview.comment
            });
            setNewReview({ rating: 5, comment: '' });
        } catch (error) {
            console.error("Error submitting review:", error);
            alert("No se pudo enviar la reseña.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // If we only have businessId, try to find the owner for extra info
    const owner = business ? allUsers.find(u => u.businessId === business.id) : userProfile;

    if (!isOpen || (!business && !owner)) return null;

    // Filter public pulses for this business/user
    const publicPulses = events.filter(e =>
        (businessId && e.businessId === businessId) ||
        (userId && e.ownerId === userId)
    ).slice(0, 3);

    const displayName = business?.name || `${owner?.name} ${owner?.surname}`;
    const avatar = business?.imageUrl || owner?.avatarUrl || "https://images.unsplash.com/photo-1599566150163-29194dcaad36?auto=format&fit=crop&w=300&q=80";
    const bio = business?.description || "Ciudadano activo de la ruta Spondylus. ¡Nos vemos en el próximo pulso!";

    return (
        <div
            className="fixed inset-0 z-[2500] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="w-full max-w-lg bg-slate-900 border border-white/10 rounded-[3rem] overflow-hidden shadow-2xl animate-in zoom-in duration-300"
                onClick={e => e.stopPropagation()}
            >
                {/* Profile Header */}
                <div className="relative h-48 bg-gradient-to-br from-indigo-600 to-purple-800">
                    <button
                        onClick={onClose}
                        className="absolute top-6 right-6 p-2 bg-black/20 hover:bg-black/40 rounded-full text-white/80 hover:text-white transition-all z-10"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Floating Avatar */}
                    <div className="absolute -bottom-12 left-8 p-1.5 bg-slate-900 rounded-[2rem]">
                        <img
                            src={avatar}
                            alt={displayName}
                            className="w-24 h-24 rounded-[1.8rem] object-cover border-4 border-slate-900 shadow-xl"
                            loading="lazy"
                        />
                    </div>
                </div>

                <div className="pt-16 p-8 space-y-6">
                    {/* Name & Role */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-black text-white">{displayName}</h2>
                            {business && <Star className="w-5 h-5 text-amber-400 fill-current" />}
                        </div>
                        <div className="flex items-center gap-2 text-slate-500 text-xs font-black uppercase tracking-widest">
                            <MapPin className="w-3 h-3" />
                            {business?.locality || "Montañita"}
                            <span>•</span>
                            {business ? 'Negocio Verificado' : 'Explorador Pulse'}
                        </div>
                    </div>

                    {/* Bio */}
                    <p className="text-slate-400 text-sm leading-relaxed italic">
                        "{bio}"
                    </p>

                    {/* Stats */}
                    <div className="grid grid-cols-3 gap-4 py-4 border-y border-white/5">
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{business?.followerCount || 0}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Followers</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{business?.reviewCount || 0}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Reviews</p>
                        </div>
                        <div className="text-center">
                            <p className="text-xl font-black text-white">{business?.rating || '0.0'}</p>
                            <p className="text-[10px] text-slate-500 font-bold uppercase">Rating</p>
                        </div>
                    </div>

                    {/* Public Activities / Pulses */}
                    {publicPulses.length > 0 && (
                        <div className="space-y-4">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-3 h-3 text-sky-400" />
                                Pulsos Recientes
                            </h3>
                            <div className="space-y-3">
                                {publicPulses.map(pulse => (
                                    <div key={pulse.id} className="flex items-center gap-4 p-3 bg-slate-800/50 rounded-2xl border border-white/5">
                                        <div className="w-12 h-12 rounded-xl border border-white/10 overflow-hidden shrink-0">
                                            <img
                                                src={pulse.imageUrl}
                                                className="w-full h-full object-cover"
                                                loading="lazy"
                                            />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-bold text-white truncate">{pulse.title}</p>
                                            <p className="text-[10px] text-slate-400">{new Date(pulse.startAt).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Reviews Section */}
                    {businessId && (
                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <Star className="w-3 h-3 text-amber-400" />
                                Reseñas de la Comunidad
                            </h3>

                            {/* Review List */}
                            <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {reviews.length > 0 ? reviews.map(review => (
                                    <div key={review.id} className="space-y-1">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-bold text-white">{review.userName}</span>
                                            <div className="flex gap-0.5">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star key={i} className={`w-2.5 h-2.5 ${i < review.rating ? 'text-amber-400 fill-current' : 'text-slate-700'}`} />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-xs text-slate-400 leading-relaxed italic">"{review.comment}"</p>
                                    </div>
                                )) : (
                                    <p className="text-center py-4 text-xs text-slate-600 font-bold">Sé el primero en dejar una reseña</p>
                                )}
                            </div>

                            {/* Add Review Form */}
                            {currentUser && (
                                <div className="p-4 bg-slate-800/30 rounded-2xl border border-white/5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-slate-500 uppercase">Tu Calificación</span>
                                        <div className="flex gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <button
                                                    key={star}
                                                    onClick={() => setNewReview(prev => ({ ...prev, rating: star }))}
                                                    className="p-0.5 hover:scale-110 transition-transform"
                                                >
                                                    <Star className={`w-5 h-5 ${star <= newReview.rating ? 'text-amber-400 fill-current' : 'text-slate-700'}`} />
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="relative">
                                        <textarea
                                            value={newReview.comment}
                                            onChange={e => setNewReview(prev => ({ ...prev, comment: e.target.value }))}
                                            placeholder="¿Qué tal fue tu experiencia?"
                                            className="w-full bg-slate-900/50 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-indigo-500 transition-all resize-none"
                                            rows={2}
                                        />
                                        <button
                                            onClick={handleSubmitReview}
                                            disabled={isSubmitting || !newReview.comment.trim()}
                                            className="absolute bottom-3 right-3 p-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-400 disabled:opacity-50 transition-all"
                                        >
                                            <Send className="w-3 h-3" />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Social/Contact */}
                    <div className="flex gap-3">
                        {businessId && (
                            <button
                                onClick={() => handleToggleFollow(businessId)}
                                className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl font-black text-xs uppercase transition-all shadow-lg ${isFollowing
                                    ? 'bg-slate-800 text-white border border-white/10'
                                    : 'bg-indigo-500 text-white hover:bg-indigo-400 shadow-indigo-500/20'
                                    }`}
                            >
                                {isFollowing ? <UserCheck className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                                {isFollowing ? 'Siguiendo' : 'Seguir'}
                            </button>
                        )}
                        {business?.whatsapp && (
                            <a
                                href={`https://wa.me/${business.whatsapp.replace(/\D/g, '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 flex items-center justify-center gap-2 py-4 bg-emerald-500 text-white rounded-2xl font-black text-xs uppercase hover:bg-emerald-400 transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <MessageCircle className="w-4 h-4" />
                                Contactar
                            </a>
                        )}
                        {business?.instagram && (
                            <a
                                href={`https://instagram.com/${business.instagram.replace('@', '')}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-4 bg-slate-800 rounded-2xl border border-white/10 text-slate-400 hover:text-white transition-all"
                            >
                                <Instagram className="w-5 h-5" />
                            </a>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
