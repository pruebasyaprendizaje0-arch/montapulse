import React from 'react';
import { Sparkles } from 'lucide-react';

interface PageLoaderProps {
    message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message = "Sincronizando Experiencia..." }) => {
    return (
        <div 
            className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 gap-8 text-center"
            role="status"
            aria-live="polite"
        >
            <div className="relative">
                <div className="w-20 h-20 bg-orange-500/10 border border-orange-500/20 rounded-[2.5rem] flex items-center justify-center animate-pulse motion-reduce:animate-none">
                    <Sparkles className="w-10 h-10 text-orange-500 animate-bounce motion-reduce:animate-none" />
                </div>
                <div className="absolute inset-0 rounded-[2.5rem] ring-4 ring-orange-500/20 animate-ping motion-reduce:animate-none" />
            </div>
            <div className="flex flex-col items-center gap-3">
                <div className="h-1.5 w-48 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 w-1/3 animate-[loading_2s_ease-in-out_infinite] motion-reduce:animate-none" />
                </div>
                <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">
                    {message}
                </p>
            </div>
            <style>{`
                @media (prefers-reduced-motion: no-preference) {
                    @keyframes loading {
                        0% { transform: translateX(-100%); }
                        50% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                    }
                }
            `}</style>
        </div>
    );
};
