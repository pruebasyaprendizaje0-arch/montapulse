import React, { useState, useMemo, useEffect } from 'react';
import { subscribeToLatestAnnouncements, deleteAnnouncement } from '../../../services/firestoreService';
import { 
    Megaphone, Send, Target, Users, MapPin, 
    Sparkles, AlertTriangle, Info, Bell, Trash2, 
    Calendar, Clock, Globe, Filter, Search,
    X, CheckCircle2, ChevronRight, MessageSquare,
    User, Bot
} from 'lucide-react';
import { useData } from '../../../context/DataContext';
import { useToast } from '../../../context/ToastContext';
import { useAuthContext } from '../../../context/AuthContext';
import { Announcement } from '../../../types';
import { LOCALITIES } from '../../../constants';

const ANNOUNCEMENT_TYPE_STYLES: Record<string, { color: string; bg: string; icon: any; label: string }> = {
    info: { color: 'text-blue-400', bg: 'bg-blue-400/10 border-blue-400/20', icon: Info, label: 'Informativo' },
    ventas: { color: 'text-orange-400', bg: 'bg-orange-400/10 border-orange-400/20', icon: Sparkles, label: 'Oferta' },
    urgente: { color: 'text-red-400', bg: 'bg-red-400/10 border-red-400/20', icon: AlertTriangle, label: 'Alerta' },
    system: { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/20', icon: Bell, label: 'Sistema' },
    evento: { color: 'text-purple-400', bg: 'bg-purple-400/10 border-purple-400/20', icon: Calendar, label: 'Evento' },
};

export const AnnouncementsPanel: React.FC = () => {
    const { user } = useAuthContext();
    const { 
        allUsers, createAnnouncement, customLocalities, showToast 
    } = useData();
    const { showConfirm } = useToast();

    const [latestAnnouncements, setLatestAnnouncements] = useState<Announcement[]>([]);

    useEffect(() => {
        const unsub = subscribeToLatestAnnouncements(5, setLatestAnnouncements);
        return () => unsub();
    }, []);

    const formatTime = (ts: any) => {
        if (!ts) return '';
        const d = ts instanceof Date ? ts : new Date(ts);
        if (isNaN(d.getTime())) return '';
        const now = new Date();
        const diff = Math.floor((now.getTime() - d.getTime()) / 1000);
        if (diff < 60) return `${diff}s`;
        if (diff < 3600) return `${Math.floor(diff / 60)}m`;
        if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
        return `${Math.floor(diff / 86400)}d`;
    };

    const handleDelete = async (ann: Announcement) => {
        const confirmed = await showConfirm(
            '¿Seguro que deseas eliminar este anuncio? También se eliminarán los mensajes enviados a los chats de los usuarios.',
            'Eliminar Anuncio'
        );
        if (confirmed && ann.id) {
            try {
                await deleteAnnouncement(ann.id, ann.roomMessages);
                showToast('Anuncio eliminado correctamente', 'success');
            } catch (error) {
                showToast('Error al eliminar el anuncio', 'error');
            }
        }
    };

    // State for New Announcement
    const [isCreating, setIsCreating] = useState(false);
    const [form, setForm] = useState({
        text: '',
        type: 'info' as Announcement['type'],
        targetMode: 'all' as 'all' | 'specific',
        selectedLocalities: [] as string[],
        senderType: 'system' as 'system' | 'admin'
    });

    const [isSending, setIsSending] = useState(false);

    const availableLocalities = useMemo(() => {
        const base = LOCALITIES.map(l => l.name);
        const extra = (customLocalities || []).map(l => l.name);
        return Array.from(new Set([...base, ...extra])).sort();
    }, [customLocalities]);

    const estimatedAudience = useMemo(() => {
        if (form.targetMode === 'all') return allUsers.length;
        if (form.selectedLocalities.length === 0) return 0;
        return allUsers.filter(u => form.selectedLocalities.includes(u.locality || '')).length;
    }, [form.targetMode, form.selectedLocalities, allUsers]);

    const handleSend = async () => {
        if (!form.text.trim()) {
            showToast("El mensaje no puede estar vacío", "error");
            return;
        }

        if (form.targetMode === 'specific' && form.selectedLocalities.length === 0) {
            showToast("Selecciona al menos una localidad", "error");
            return;
        }

        try {
            setIsSending(true);
            
            const announcementData: Omit<Announcement, 'id' | 'timestamp'> = {
                text: form.text,
                type: form.type,
                senderId: 'system-admin',
                senderName: form.senderType === 'system' ? 'MontaPulse System' : `${user?.name} (Admin)`,
                senderAvatar: form.senderType === 'system' ? '/icons/icon-192x192.png' : user?.avatarUrl,
                target: form.targetMode === 'all' ? 'all' : 'locality',
                locality: form.targetMode === 'specific' ? form.selectedLocalities[0] : undefined,
                recipientCount: estimatedAudience,
                roomMessages: []
            };

            await createAnnouncement(announcementData);
            
            showToast("Anuncio enviado exitosamente", "success");
            setForm({
                text: '',
                type: 'info',
                targetMode: 'all',
                selectedLocalities: [],
                senderType: 'system'
            });
            setIsCreating(false);
        } catch (error) {
            showToast("Error al enviar el anuncio", "error");
        } finally {
            setIsSending(false);
        }
    };

    const toggleLocality = (name: string) => {
        setForm(prev => ({
            ...prev,
            selectedLocalities: prev.selectedLocalities.includes(name)
                ? prev.selectedLocalities.filter(l => l !== name)
                : [...prev.selectedLocalities, name]
        }));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-black text-white flex items-center gap-3">
                        <Megaphone className="w-7 h-7 text-orange-500" />
                        Gestión de Anuncios
                    </h2>
                    <p className="text-slate-400 text-sm font-medium mt-1">
                        Envía notificaciones masivas y comunicados a los usuarios.
                    </p>
                </div>
                
                {!isCreating && (
                    <button
                        onClick={() => setIsCreating(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-orange-600 hover:bg-orange-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-lg shadow-orange-600/20 active:scale-95"
                    >
                        <Send className="w-4 h-4" />
                        Nuevo Anuncio
                    </button>
                )}
            </div>

            {isCreating ? (
                <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6 md:p-8 backdrop-blur-xl space-y-8">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-3">
                            <Sparkles className="w-5 h-5 text-amber-400" />
                            Redactar Comunicado
                        </h3>
                        <button 
                            onClick={() => setIsCreating(false)}
                            className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5 text-slate-400" />
                        </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Left Column: Content */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                    Contenido del Mensaje
                                </label>
                                <textarea
                                    value={form.text}
                                    onChange={(e) => setForm({...form, text: e.target.value})}
                                    placeholder="¿Qué quieres comunicar al mundo?"
                                    className="w-full h-40 bg-white/5 border border-white/10 rounded-3xl p-5 text-white placeholder:text-slate-700 focus:outline-none focus:border-orange-500/50 transition-all resize-none font-medium"
                                />
                                <div className="mt-2 flex justify-end">
                                    <span className={`text-[10px] font-bold ${form.text.length > 500 ? 'text-red-400' : 'text-slate-600'}`}>
                                        {form.text.length} / 500
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                        Tipo de Anuncio
                                    </label>
                                    <div className="flex flex-wrap gap-2">
                                        {Object.entries(ANNOUNCEMENT_TYPE_STYLES).map(([id, style]) => (
                                            <button
                                                key={id}
                                                onClick={() => setForm({...form, type: id as any})}
                                                className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${
                                                    form.type === id 
                                                    ? `${style.bg} ${style.color} border-white/20 shadow-lg` 
                                                    : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
                                                }`}
                                            >
                                                <style.icon className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{style.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                        Remitente
                                    </label>
                                    <div className="flex gap-2">
                                        {[
                                            { id: 'system', label: 'Sistema', icon: Bot },
                                            { id: 'admin', label: 'Mi Perfil', icon: User }
                                        ].map((s) => (
                                            <button
                                                key={s.id}
                                                onClick={() => setForm({...form, senderType: s.id as any})}
                                                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl border transition-all ${
                                                    form.senderType === s.id 
                                                    ? 'bg-white/10 border-white/20 text-white' 
                                                    : 'bg-white/5 border-white/5 text-slate-500 hover:border-white/10'
                                                }`}
                                            >
                                                <s.icon className="w-3.5 h-3.5" />
                                                <span className="text-[10px] font-black uppercase tracking-widest">{s.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Right Column: Targeting */}
                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] mb-3 ml-1">
                                    Alcance del Anuncio
                                </label>
                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button
                                        onClick={() => setForm({...form, targetMode: 'all', selectedLocalities: []})}
                                        className={`flex flex-col items-center gap-3 p-5 rounded-[2rem] border transition-all ${
                                            form.targetMode === 'all'
                                            ? 'bg-orange-500/10 border-orange-500/50 text-orange-400'
                                            : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/[0.07]'
                                        }`}
                                    >
                                        <Globe className="w-6 h-6" />
                                        <div className="text-center">
                                            <span className="block text-[10px] font-black uppercase tracking-widest">Global</span>
                                            <span className="text-[9px] font-bold opacity-60">Todos los usuarios</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setForm({...form, targetMode: 'specific'})}
                                        className={`flex flex-col items-center gap-3 p-5 rounded-[2rem] border transition-all ${
                                            form.targetMode === 'specific'
                                            ? 'bg-sky-500/10 border-sky-500/50 text-sky-400'
                                            : 'bg-white/5 border-white/5 text-slate-500 hover:bg-white/[0.07]'
                                        }`}
                                    >
                                        <Target className="w-6 h-6" />
                                        <div className="text-center">
                                            <span className="block text-[10px] font-black uppercase tracking-widest">Segmentado</span>
                                            <span className="text-[9px] font-bold opacity-60">Por localidad</span>
                                        </div>
                                    </button>
                                </div>

                                {form.targetMode === 'specific' && (
                                    <div className="space-y-4 animate-in fade-in zoom-in-95 duration-300">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Seleccionar Localidades</span>
                                            <button 
                                                onClick={() => setForm({...form, selectedLocalities: availableLocalities})}
                                                className="text-[9px] font-black text-sky-400 uppercase tracking-widest hover:underline"
                                            >
                                                Seleccionar Todas
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto no-scrollbar pr-1">
                                            {availableLocalities.map(loc => (
                                                <button
                                                    key={loc}
                                                    onClick={() => toggleLocality(loc)}
                                                    className={`px-3 py-2 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all ${
                                                        form.selectedLocalities.includes(loc)
                                                        ? 'bg-sky-500 border-sky-400 text-white shadow-lg shadow-sky-500/20'
                                                        : 'bg-white/5 border-white/10 text-slate-500 hover:border-white/20'
                                                    }`}
                                                >
                                                    {loc}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Audience Summary */}
                            <div className="bg-black/20 rounded-[2rem] border border-white/5 p-6 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center">
                                        <Users className="w-6 h-6 text-slate-400" />
                                    </div>
                                    <div>
                                        <span className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Audiencia Estimada</span>
                                        <span className="text-2xl font-black text-white">{estimatedAudience}</span>
                                        <span className="ml-2 text-[10px] font-bold text-slate-600 uppercase">Usuarios</span>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end">
                                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                        <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">Listo</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3 text-slate-500">
                            <Clock className="w-4 h-4" />
                            <span className="text-[10px] font-bold uppercase tracking-widest">
                                {form.type === 'ventas' ? 'Expira en 7 días' : 'Expira en 24 horas'}
                            </span>
                        </div>
                        <div className="flex items-center gap-3 w-full sm:w-auto">
                            <button
                                onClick={() => setIsCreating(false)}
                                className="flex-1 sm:flex-none px-8 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={isSending || !form.text.trim()}
                                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-10 py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-orange-600/20 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
                            >
                                {isSending ? (
                                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Send className="w-4 h-4" />
                                )}
                                {isSending ? 'Enviando...' : 'Publicar Anuncio'}
                            </button>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="space-y-6">
                    <h3 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-orange-500" />
                        Historial de Anuncios (Últimos 5)
                    </h3>
                    
                    {latestAnnouncements.length === 0 ? (
                        <div className="bg-white/5 border border-white/5 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center space-y-4">
                            <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mb-2">
                                <MessageSquare className="w-10 h-10 text-slate-700" />
                            </div>
                            <h3 className="text-lg font-black text-slate-500 uppercase tracking-tight">Historial de Anuncios</h3>
                            <p className="text-slate-600 text-sm max-w-sm">
                                Aquí aparecerán los anuncios enviados recientemente.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {latestAnnouncements.map((ann) => {
                                const style = ANNOUNCEMENT_TYPE_STYLES[ann.type || 'info'] || ANNOUNCEMENT_TYPE_STYLES.info;
                                const Icon = style.icon;
                                const isExpired = ann.expiresAt && new Date(ann.expiresAt) < new Date();

                                return (
                                    <div 
                                        key={ann.id}
                                        className="bg-white/5 border border-white/10 rounded-3xl p-5 flex items-start gap-4 transition-all hover:bg-white/[0.07]"
                                    >
                                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg} border`}>
                                            <Icon className={`w-5 h-5 ${style.color}`} />
                                        </div>
                                        
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <span className="text-xs font-black text-white">{ann.senderName}</span>
                                                <span className="text-[9px] font-bold text-slate-500">•</span>
                                                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                    {ann.target === 'all' ? 'Global' : `Segmentado (${ann.locality || 'Loc.'})`}
                                                </span>
                                                {ann.recipientCount !== undefined && (
                                                    <>
                                                        <span className="text-[9px] font-bold text-slate-500">•</span>
                                                        <span className="text-[9px] font-bold text-slate-400">
                                                            {ann.recipientCount} rec.
                                                        </span>
                                                    </>
                                                )}
                                                {isExpired && (
                                                    <span className="px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[8px] font-black uppercase tracking-widest">
                                                        Expirado
                                                    </span>
                                                )}
                                            </div>
                                            
                                            <p className="text-sm text-slate-300 leading-relaxed break-words font-medium">
                                                {ann.text}
                                            </p>

                                            {ann.imageUrl && (
                                                <div className="mt-3 relative rounded-2xl overflow-hidden border border-white/10 max-w-md">
                                                    <img 
                                                        src={ann.imageUrl} 
                                                        alt="Anuncio" 
                                                        className="w-full max-h-48 object-cover"
                                                    />
                                                </div>
                                            )}

                                            <div className="flex items-center gap-2 mt-3 text-[10px] text-slate-600 font-bold uppercase tracking-widest">
                                                <span>{formatTime(ann.timestamp)}</span>
                                                <span>·</span>
                                                <span>{style.label}</span>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => handleDelete(ann)}
                                            className="p-2.5 rounded-xl bg-white/5 hover:bg-red-500/10 text-slate-400 hover:text-red-400 border border-white/5 hover:border-red-500/20 transition-all active:scale-95 shrink-0"
                                            title="Eliminar Anuncio"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
