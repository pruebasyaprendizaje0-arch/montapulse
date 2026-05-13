import React from 'react';
import { Trash2, ShieldAlert, Clock, User } from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';

export const ModerationPanel: React.FC = () => {
    const { posts, handleDeletePost } = useData();
    const { showToast, showConfirm } = useToast();

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-orange-500/10 border border-orange-500/20 p-6 rounded-[2rem] flex items-center gap-4">
                <ShieldAlert className="w-6 h-6 text-orange-500" />
                <div>
                    <h4 className="text-sm font-black text-white uppercase tracking-widest">Panel de Moderación</h4>
                    <p className="text-[10px] text-slate-400">Gestiona el contenido reportado o inapropiado de la comunidad.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
                {posts.map(post => (
                    <div key={post.id} className="bg-neutral-900/50 border border-white/5 rounded-[2rem] p-6 hover:bg-neutral-900/80 transition-all group shadow-lg">
                        <div className="flex items-center justify-between gap-6">
                            <div className="flex items-center gap-4 flex-1">
                                <div className="w-12 h-12 rounded-xl bg-black border border-white/10 flex-shrink-0 overflow-hidden">
                                    {post.imageUrl ? (
                                        <img src={post.imageUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/5">
                                            <ShieldAlert className="w-5 h-5 text-slate-700" />
                                        </div>
                                    )}
                                </div>
                                <div className="min-w-0">
                                    <p className="text-xs text-white line-clamp-1 mb-2 font-medium">{post.content}</p>
                                    <div className="flex items-center gap-3">
                                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-black uppercase tracking-widest">
                                            <User className="w-3 h-3" />
                                            <span className="truncate">{post.authorName || 'Usuario'}</span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-black uppercase tracking-widest">
                                            <Clock className="w-3 h-3" />
                                            <span>{post.timestamp ? new Date(post.timestamp).toLocaleDateString() : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button 
                                onClick={async () => {
                                    if (await showConfirm("¿Eliminar este post definitivamente?", "Moderación")) {
                                        await handleDeletePost(post.id);
                                    }
                                }}
                                className="p-4 bg-rose-500/10 hover:bg-rose-500/20 text-rose-500 rounded-2xl border border-rose-500/20 transition-all shadow-lg shadow-rose-500/5"
                            >
                                <Trash2 className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};
