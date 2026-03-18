import React from 'react';
import { X, Sparkles, MapPin, Zap, ExternalLink } from 'lucide-react';
import { PlannerSection } from '../../services/geminiService';

interface AIRecommendationModalProps {
    isOpen: boolean;
    onClose: () => void;
    data: PlannerSection[] | null;
    isLoading: boolean;
}

export const AIRecommendationModal: React.FC<AIRecommendationModalProps> = ({
    isOpen,
    onClose,
    data,
    isLoading
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-10">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-2xl bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-orange-500/10 to-amber-500/5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic leading-tight">AI Assistant</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Personalized pulse recommendation</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-3 hover:bg-white/10 rounded-2xl transition-all">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-slate-900/40">
                    {isLoading ? (
                        <div className="py-20 text-center flex flex-col items-center">
                            <div className="relative">
                                <Zap className="w-12 h-12 text-orange-500 animate-pulse mb-6" />
                                <div className="absolute inset-0 bg-orange-500/20 blur-xl rounded-full" />
                            </div>
                            <p className="text-white font-black italic text-xl">Analyzing the pulse...</p>
                            <p className="text-slate-500 text-sm mt-2 font-medium">Gemini is finding the perfect spot for you.</p>
                        </div>
                    ) : (data && data.length > 0 ? (
                        <div className="space-y-6">
                            {data.map((rec, idx) => (
                                <div key={idx} className="bg-slate-800/40 border border-white/10 rounded-[2.5rem] p-8 relative overflow-hidden group hover:border-orange-500/30 transition-all">
                                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 blur-3xl rounded-full" />

                                    <div className="flex items-start gap-6 relative z-10">
                                        <div className="text-4xl shrink-0 group-hover:scale-110 transition-transform duration-500">{rec.emoji}</div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-2">
                                                <span className="text-[10px] font-black text-orange-400 uppercase tracking-widest bg-orange-500/10 px-3 py-1 rounded-full border border-orange-500/20">{rec.category}</span>
                                                {rec.isPremium && (
                                                    <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest bg-amber-400/10 px-3 py-1 rounded-full border border-amber-400/20">PREMIUM MATCH</span>
                                                )}
                                            </div>
                                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight mb-3 group-hover:text-orange-400 transition-colors">{rec.title}</h3>
                                            {rec.businessName && (
                                                <div className="flex items-center gap-1.5 mb-4 text-slate-400">
                                                    <MapPin className="w-3.5 h-3.5" />
                                                    <span className="text-xs font-bold uppercase tracking-wide">{rec.businessName}</span>
                                                </div>
                                            )}
                                            <div className="bg-black/20 rounded-3xl p-6 border border-white/5">
                                                <p className="text-slate-300 leading-relaxed text-sm font-medium italic">
                                                    "{rec.recommendation}"
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            <div className="pt-4 text-center">
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                    Enjoy the Montañita magic! 🌊✨
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="py-20 text-center">
                            <p className="text-white font-black text-lg italic">Couldn't find an exact match.</p>
                            <p className="text-slate-500 text-sm mt-2">Try being more specific about what you're looking for!</p>
                        </div>
                    ))}
                </div>

                <div className="p-8 border-t border-white/5 bg-white/5 flex justify-center">
                    <button
                        onClick={onClose}
                        className="px-10 py-4 bg-gradient-to-r from-orange-600 to-amber-600 text-white rounded-2xl text-xs font-black uppercase tracking-[0.2em] shadow-lg shadow-orange-500/20 active:scale-95 transition-all w-full sm:w-auto"
                    >
                        Great, Thanks!
                    </button>
                </div>
            </div>
        </div>
    );
};
