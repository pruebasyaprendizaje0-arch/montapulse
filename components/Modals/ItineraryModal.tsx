import React, { useState, useEffect } from 'react';
import { X, Sparkles, Clock, MapPin, Zap, RefreshCw, ChevronRight } from 'lucide-react';
import { useData } from '../../context/DataContext';
import { useAuthContext } from '../../context/AuthContext';
import { generateItinerary } from '../../services/itineraryService';
import { Vibe } from '../../types';
import ReactMarkdown from 'react-markdown';

interface ItineraryModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ItineraryModal: React.FC<ItineraryModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuthContext();
    const { events } = useData();
    const [itinerary, setItinerary] = useState<string>('');
    const [loading, setLoading] = useState(false);

    const handleGenerate = async () => {
        if (!user) return;
        setLoading(true);
        const text = await generateItinerary(
            user.preferredVibe || Vibe.RELAX,
            events,
            user.name
        );
        setItinerary(text);
        setLoading(false);
    };

    useEffect(() => {
        if (isOpen && !itinerary) {
            handleGenerate();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 sm:p-10">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-4xl max-h-[85vh] bg-[#0f172a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-indigo-500/10 to-purple-500/5">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                            <Sparkles className="w-8 h-8 text-white" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-black text-white italic leading-tight">AI Vibe Itinerary</h2>
                            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mt-1 opacity-60">Your 24h custom pulse plan</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/10 rounded-2xl transition-all"
                    >
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 no-scrollbar bg-slate-900/40">
                    {loading ? (
                        <div className="py-32 text-center flex flex-col items-center">
                            <RefreshCw className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
                            <p className="text-white font-black italic text-xl">Feeling the pulse...</p>
                            <p className="text-slate-500 text-sm mt-2">Gemini is curating your perfect Montañita day.</p>
                        </div>
                    ) : (
                        <div className="prose prose-invert max-w-none">
                            <div className="bg-slate-800/30 border border-white/5 rounded-[2.5rem] p-8 sm:p-10 shadow-inner">
                                <ReactMarkdown
                                    components={{
                                        h1: ({ node, ...props }) => <h1 className="text-3xl font-black text-white italic mb-8 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent" {...props} />,
                                        h2: ({ node, ...props }) => <h2 className="text-xl font-black text-indigo-400 uppercase tracking-widest mt-10 mb-4 flex items-center gap-3" {...props} />,
                                        p: ({ node, ...props }) => <p className="text-slate-300 leading-relaxed text-base mb-4" {...props} />,
                                        li: ({ node, ...props }) => <li className="text-slate-300 mb-2 list-none flex items-start gap-3 before:content-[''] before:w-1.5 before:h-1.5 before:bg-indigo-500 before:rounded-full before:mt-2 before:shrink-0" {...props} />,
                                    }}
                                >
                                    {itinerary}
                                </ReactMarkdown>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-white/5 flex items-center justify-between bg-white/5">
                    <button
                        onClick={handleGenerate}
                        disabled={loading}
                        className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                        Regenerate
                    </button>

                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
                    >
                        Let's Go!
                    </button>
                </div>
            </div>
        </div>
    );
};
