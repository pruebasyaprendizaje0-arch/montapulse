import React from 'react';
import { Sparkles } from 'lucide-react';

interface PageLoaderProps {
    message?: string;
}

export const PageLoader: React.FC<PageLoaderProps> = ({ message = "Sincronizando Experiencia..." }) => {
    return (
        <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 gap-8">
            <div className="relative">
                <div className="w-24 h-24 bg-sky-500/10 rounded-[2.5rem] flex items-center justify-center animate-pulse">
                    <Sparkles className="w-12 h-12 text-sky-500 animate-bounce" />
                </div>
                <div className="absolute inset-0 rounded-[2.5rem] ring-4 ring-sky-500/20 animate-ping" />
            </div>
            <div className="flex flex-col items-center gap-3">
                <div className="h-1.5 w-48 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-sky-500 w-1/3 animate-[loading_2s_ease-in-out_infinite]" />
                </div>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em] animate-pulse">
                    {message}
                </p>
            </div>
            <style>{`
                @keyframes loading {
                    0% { transform: translateX(-100%); }
                    50% { transform: translateX(100%); }
                    100% { transform: translateX(-100%); }
                }
            `}</style>
        </div>
    );
};
