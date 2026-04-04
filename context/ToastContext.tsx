import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (message: string, type?: ToastType) => void;
    showConfirm: (message: string, title?: string) => Promise<boolean>;
    showPrompt: (message: string, placeholder?: string, title?: string) => Promise<string | null>;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [confirm, setConfirm] = useState<{
        message: string;
        title?: string;
        resolve: (value: boolean) => void
    } | null>(null);
    const [prompt, setPrompt] = useState<{
        message: string;
        placeholder?: string;
        title?: string;
        resolve: (value: string | null) => void;
    } | null>(null);
    const [promptValue, setPromptValue] = useState('');

    const showToast = useCallback((message: string, type: ToastType = 'info') => {
        const id = Math.random().toString(36).substring(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    const showConfirm = useCallback((message: string, title: string = "¿Estás seguro?") => {
        return new Promise<boolean>((resolve) => {
            setConfirm({ message, title, resolve });
        });
    }, []);

    const showPrompt = useCallback((message: string, placeholder: string = "", title: string = "Entrada requerida") => {
        setPromptValue('');
        return new Promise<string | null>((resolve) => {
            setPrompt({ message, placeholder, title, resolve });
        });
    }, []);

    const handleConfirm = () => {
        if (confirm) {
            confirm.resolve(true);
            setConfirm(null);
        }
    };

    const handleCancel = () => {
        if (confirm) {
            confirm.resolve(false);
            setConfirm(null);
        }
    };

    const handlePromptConfirm = () => {
        if (prompt) {
            prompt.resolve(promptValue);
            setPrompt(null);
            setPromptValue('');
        }
    };

    const handlePromptCancel = () => {
        if (prompt) {
            prompt.resolve(null);
            setPrompt(null);
            setPromptValue('');
        }
    };

    return (
        <ToastContext.Provider value={{ showToast, showConfirm, showPrompt }}>
            {children}
            {/* Toasts Container */}
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[3000] flex flex-col gap-2 w-full max-w-xs px-4 pointer-events-none">
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto animate-in slide-in-from-bottom-2 fade-in duration-300 p-4 rounded-2xl shadow-xl border backdrop-blur-xl flex items-center justify-between gap-3 ${toast.type === 'success' ? 'bg-emerald-500/90 text-white border-emerald-400/30' :
                            toast.type === 'error' ? 'bg-rose-500/90 text-white border-rose-400/30' :
                                toast.type === 'warning' ? 'bg-amber-500/90 text-black border-amber-400/30' :
                                    'bg-slate-900/90 text-white border-white/10'
                            }`}
                    >
                        <span className="text-xs font-bold leading-tight">{toast.message}</span>
                        <div className={`w-1 h-1 rounded-full animate-ping ${toast.type === 'success' ? 'bg-white' : 'bg-current'
                            }`} />
                    </div>
                ))}
            </div>

            {/* Confirm Modal */}
            {confirm && (
                <div className="fixed inset-0 z-[4000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={handleCancel}>
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-white mb-4 text-center">{confirm.title}</h3>
                        <p className="text-slate-400 text-sm text-center mb-8 leading-relaxed">
                            {confirm.message}
                        </p>
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handleConfirm}
                                className="w-full py-4 bg-orange-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-orange-500 active:scale-95 transition-all shadow-lg shadow-orange-600/20"
                            >
                                Confirmar
                            </button>
                            <button
                                onClick={handleCancel}
                                className="w-full py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Prompt Modal */}
            {prompt && (
                <div className="fixed inset-0 z-[4000] bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in duration-200" onClick={handlePromptCancel}>
                    <div className="bg-slate-900 border border-white/10 rounded-[2rem] p-8 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                        <h3 className="text-xl font-black text-white mb-4 text-center">{prompt.title}</h3>
                        <p className="text-slate-400 text-sm text-center mb-6 leading-relaxed">
                            {prompt.message}
                        </p>
                        <input
                            autoFocus
                            type="text"
                            value={promptValue}
                            onChange={(e) => setPromptValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePromptConfirm()}
                            placeholder={prompt.placeholder}
                            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-5 py-4 text-white font-bold outline-none focus:border-orange-500 transition-all mb-6 shadow-inner"
                        />
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={handlePromptConfirm}
                                className="w-full py-4 bg-amber-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/20"
                            >
                                Aceptar
                            </button>
                            <button
                                onClick={handlePromptCancel}
                                className="w-full py-4 bg-white/5 text-slate-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-white/10 active:scale-95 transition-all"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
};
