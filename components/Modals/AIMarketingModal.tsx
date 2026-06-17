import React, { useState } from 'react';
import { X, Sparkles, Zap, MessageCircle, Hash, CalendarDays, Heart, Loader2 } from 'lucide-react';
import { MarketingQueryType, getMarketingRecommendations } from '../../services/geminiService';
import { Business } from '../../types';

interface AIMarketingModalProps {
    isOpen: boolean;
    onClose: () => void;
    business: Business;
    metrics: { monthlyViews: number, totalClicks: number, impactCount: number, followers: number };
}

const MARKETING_OPTIONS: { id: MarketingQueryType, label: string, icon: React.ElementType, description: string }[] = [
    { id: 'social_media', label: 'Texto para Redes', icon: MessageCircle, description: 'Genera un post atractivo para Instagram o Facebook' },
    { id: 'lightning_offer', label: 'Ofertas Relámpago', icon: Zap, description: 'Ideas creativas para promociones rápidas hoy' },
    { id: 'keywords', label: 'Palabras Clave', icon: Hash, description: 'Hashtags y keywords para mejorar tu visibilidad' },
    { id: 'thematic_ideas', label: 'Días Temáticos', icon: CalendarDays, description: 'Sugerencias para eventos recurrentes o semanas especiales' },
    { id: 'customer_preferences', label: 'Análisis de Clientes', icon: Heart, description: 'Descubre qué le gusta más a tus seguidores' },
];

export const AIMarketingModal: React.FC<AIMarketingModalProps> = ({ isOpen, onClose, business, metrics }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [response, setResponse] = useState<string | null>(null);
    const [selectedOption, setSelectedOption] = useState<MarketingQueryType | null>(null);

    if (!isOpen) return null;

    const handleQuery = async (queryType: MarketingQueryType) => {
        setSelectedOption(queryType);
        setIsLoading(true);
        setResponse(null);
        
        try {
            const result = await getMarketingRecommendations(business, metrics, queryType);
            setResponse(result.text);
        } catch (error) {
            console.error("Error fetching marketing recommendations:", error);
            setResponse("Hubo un error de conexión con la IA. Por favor, inténtalo de nuevo.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center p-4 sm:p-6">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-3xl bg-[#0f172a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in duration-300">
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-white/5 flex items-center justify-between bg-gradient-to-r from-orange-600/20 to-amber-500/10 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg shadow-orange-500/20">
                            <Sparkles className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-white italic leading-tight">Asistente de Marketing</h2>
                            <p className="text-orange-400 text-[10px] font-bold uppercase tracking-widest mt-0.5">Potenciado por IA</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all">
                        <X className="w-6 h-6 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 bg-[#111111] custom-scrollbar">
                    {!isLoading && !response ? (
                        <>
                            <div className="mb-6">
                                <h3 className="text-lg font-black text-white tracking-tight mb-2">¿En qué te puedo ayudar hoy?</h3>
                                <p className="text-slate-400 text-xs">Selecciona una opción para generar ideas basadas en las métricas actuales de tu negocio.</p>
                            </div>
                            
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {MARKETING_OPTIONS.map((option) => (
                                    <button
                                        key={option.id}
                                        onClick={() => handleQuery(option.id)}
                                        className="text-left p-4 rounded-2xl border border-white/5 bg-white/5 hover:bg-orange-500/10 hover:border-orange-500/30 transition-all group active:scale-95"
                                    >
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="p-2 rounded-xl bg-black/50 text-slate-400 group-hover:text-orange-400 group-hover:bg-orange-500/20 transition-colors">
                                                <option.icon className="w-5 h-5" />
                                            </div>
                                            <span className="font-black text-sm text-slate-200 group-hover:text-white transition-colors">{option.label}</span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                                            {option.description}
                                        </p>
                                    </button>
                                ))}
                            </div>
                            
                            <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/5">
                                <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-3">Contexto Actual (Usado por la IA)</h4>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    <div className="p-2 bg-black/50 rounded-xl">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Vistas Mensuales</div>
                                        <div className="font-black text-orange-400">{metrics.monthlyViews}</div>
                                    </div>
                                    <div className="p-2 bg-black/50 rounded-xl">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Clicks Eventos</div>
                                        <div className="font-black text-sky-400">{metrics.totalClicks}</div>
                                    </div>
                                    <div className="p-2 bg-black/50 rounded-xl">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Impacto</div>
                                        <div className="font-black text-emerald-400">{metrics.impactCount}</div>
                                    </div>
                                    <div className="p-2 bg-black/50 rounded-xl">
                                        <div className="text-[9px] text-slate-500 uppercase font-bold mb-1">Seguidores</div>
                                        <div className="font-black text-amber-400">{metrics.followers}</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    ) : isLoading ? (
                        <div className="py-20 flex flex-col items-center justify-center text-center">
                            <Loader2 className="w-12 h-12 text-orange-500 animate-spin mb-6" />
                            <h3 className="text-xl font-black text-white italic mb-2">Analizando datos...</h3>
                            <p className="text-slate-400 text-sm">Generando la mejor estrategia para tu negocio.</p>
                        </div>
                    ) : (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="flex items-center gap-3 mb-6">
                                <button 
                                    onClick={() => setResponse(null)}
                                    className="p-2 bg-white/5 hover:bg-white/10 rounded-xl text-slate-400 transition-colors"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <h3 className="text-lg font-black text-white tracking-tight">
                                    {MARKETING_OPTIONS.find(o => o.id === selectedOption)?.label}
                                </h3>
                            </div>
                            
                            <div className="bg-slate-800/50 border border-white/10 rounded-3xl p-6 sm:p-8 relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 blur-3xl rounded-full" />
                                <div className="prose prose-invert prose-sm sm:prose-base max-w-none relative z-10 whitespace-pre-wrap text-slate-300">
                                    {response}
                                </div>
                            </div>
                            
                            <div className="mt-6 flex justify-end gap-3">
                                <button
                                    onClick={() => handleQuery(selectedOption!)}
                                    className="px-6 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    Regenerar
                                </button>
                                <button
                                    onClick={() => {
                                        navigator.clipboard.writeText(response || '');
                                        // A simple alert or you could pass down showToast
                                        alert('Texto copiado al portapapeles');
                                    }}
                                    className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-orange-500/20"
                                >
                                    Copiar
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
