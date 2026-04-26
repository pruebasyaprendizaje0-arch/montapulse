import React, { useState, useMemo, useEffect } from 'react';
import { Bell, Sparkles, X, Info, Gift, AlertTriangle, Zap, Users, MapPin, Hash, MessageCircle, Heart, ChevronRight, User, CheckCheck, Camera, ImagePlus, Trash2, Share2, Calendar } from 'lucide-react';
import { uploadFile } from '../services/storageService';
import { useAuthContext } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { useData } from '../context/DataContext';
import { SubscriptionPlan, Announcement, Vibe } from '../types';
import {
    subscribeToAnnouncements, createAnnouncement, deleteAnnouncement,
    subscribeToChatRooms, subscribeToUsers, createChatRoom, sendRoomMessage,
    subscribeToActiveBoosts
} from '../services/firestoreService';
import { LOCALITIES, MASS_MESSAGE_CREDITS } from '../constants';

const NOTIF_TYPE_STYLES: Record<string, { color: string; bg: string; icon: React.ElementType; label: string }> = {
    info: { color: 'text-blue-400', bg: 'bg-blue-500/10 border-blue-500/30', icon: Info, label: 'Info' },
    ventas: { color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/30', icon: Gift, label: 'Oferta' },
    urgente: { color: 'text-red-400', bg: 'bg-red-500/10 border-red-500/30', icon: AlertTriangle, label: 'Alerta' },
    novedad: { color: 'text-cyan-400', bg: 'bg-cyan-500/10 border-cyan-500/30', icon: Sparkles, label: 'Novedad' },
    atencion: { color: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/30', icon: Bell, label: 'Atención' },
    evento: { color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/30', icon: Calendar, label: 'Evento' },
    system: { color: 'text-rose-400', bg: 'bg-rose-500/10 border-rose-500/30', icon: Zap, label: 'Sistema' },
};

export const Notifications: React.FC = () => {
    const { user, isAdmin } = useAuthContext();
    const { showToast } = useToast();
    const {
        notifications, markAsRead, businesses, customLocalities = [], businessFollowers: contextFollowers = [],
    } = useData();

    // Announce modal state
    const [showAnnounce, setShowAnnounce] = useState(false);
    const [massText, setMassText] = useState('');
    const [massTarget, setMassTarget] = useState<'followers' | 'all'>('followers');
    const [massType, setMassType] = useState<string>('ventas');
    const [massLocalityMode, setMassLocalityMode] = useState<'all' | 'specific'>('all');
    const [massLocality, setMassLocality] = useState<string | null>(null);
    const [massVibeMode, setMassVibeMode] = useState<'all' | 'specific'>('all');
    const [massVibe, setMassVibe] = useState<Vibe | null>(null);
    const [isVibeOpen, setIsVibeOpen] = useState(false);
    const [isLocalityOpen, setIsLocalityOpen] = useState(false);
    const [isSending, setIsSending] = useState(false);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [allUsers, setAllUsers] = useState<any[]>([]);
    const [rooms, setRooms] = useState<any[]>([]);
    const [massImage, setMassImage] = useState<File | null>(null);
    const [massImagePreview, setMassImagePreview] = useState<string | null>(null);
    const [massSenderType, setMassSenderType] = useState<'person' | 'business'>('person');
    const [showImageModal, setShowImageModal] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [selectedAnnouncement, setSelectedAnnouncement] = useState<any>(null);
    const [isUploadingImage, setIsUploadingImage] = useState(false);

    const availableTypes = useMemo(() => {
        const types = [
            { id: 'ventas', ...NOTIF_TYPE_STYLES.ventas },
            { id: 'urgente', ...NOTIF_TYPE_STYLES.urgente },
        ];
        if (isAdmin) {
            types.push({ id: 'system', ...NOTIF_TYPE_STYLES.system });
        }
        return types;
    }, [isAdmin]);

    const expirationText = useMemo(() => {
        if (massType === 'ventas') return 'Expira en 7 días';
        return 'Expira en 24 horas';
    }, [massType]);
    const imageInputRef = React.useRef<HTMLInputElement>(null);
    const cameraInputRef = React.useRef<HTMLInputElement>(null);

    const [notifFilter, setNotifFilter] = useState<string>('all');

    const userBusiness = user?.businessId ? businesses.find(b => b.id === user.businessId) : null;
    const isPremium = (user?.plan === SubscriptionPlan.PREMIUM || user?.plan === SubscriptionPlan.EXPERT ||
        userBusiness?.plan === SubscriptionPlan.PREMIUM || userBusiness?.plan === SubscriptionPlan.EXPERT || isAdmin);
    const isExpert = user?.plan === SubscriptionPlan.EXPERT || userBusiness?.plan === SubscriptionPlan.EXPERT || isAdmin;
    const canAnnounce = isPremium || !!userBusiness;

    const currentPlan = userBusiness?.plan || user?.plan || SubscriptionPlan.FREE;
    let businessCredits = MASS_MESSAGE_CREDITS[currentPlan] || 0;
    if (userBusiness && currentPlan === SubscriptionPlan.FREE) {
        businessCredits = MASS_MESSAGE_CREDITS[SubscriptionPlan.BASIC] || 2;
    }

    const usedThisMonth = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return announcements.filter(a => {
            const d = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            return d >= startOfMonth;
        }).length;
    }, [announcements]);

    const remainingCredits = useMemo(() => {
        if (isExpert || isAdmin) return Infinity;
        return Math.max(0, businessCredits - usedThisMonth);
    }, [businessCredits, usedThisMonth, isExpert, isAdmin]);

    const estimatedAudience = useMemo(() => {
        let baseList = massTarget === 'followers' 
            ? allUsers.filter(u => contextFollowers.includes(u.id))
            : allUsers;

        if (massLocalityMode === 'specific' && massLocality) {
            baseList = baseList.filter(u => u.locality === massLocality);
        }

        if (massVibeMode === 'specific' && massVibe) {
            baseList = baseList.filter(u => u.preferredVibe === massVibe);
        }

        return baseList.length;
    }, [massTarget, massLocalityMode, massLocality, massVibeMode, massVibe, contextFollowers, allUsers]);

    useEffect(() => {
        if (!user) return;
        const senderIdForAnn = user.businessId || user.id;
        const unsub = subscribeToAnnouncements(senderIdForAnn, setAnnouncements);
        const unsubUsers = subscribeToUsers((users) => setAllUsers(users.filter(u => u.id !== user.id)));
        const unsubRooms = subscribeToChatRooms(user.id, setRooms);
        return () => { unsub(); unsubUsers(); unsubRooms(); };
    }, [user]);

    useEffect(() => {
        if (!userBusiness?.id) return;
        // Simple follower count from data context
    }, [userBusiness?.id]);

    // Filtered notifications
    const filtered = useMemo(() => {
        const all = notifications || [];
        const result = notifFilter === 'all' ? all : all.filter(n => n.type === notifFilter);
        
        // Map announcements to notification format
        const myAnnouncements = announcements.map(a => ({
            id: a.id || `ann_${Date.now()}`,
            title: a.senderName,
            message: a.text,
            type: a.type as any || 'system',
            read: false,
            createdAt: a.timestamp,
            imageUrl: a.imageUrl,
            isMassAnnouncement: true,
        }));
        
        // Filter announcements by type (same filter as notifications)
        const filteredAnnouncements = notifFilter === 'all' 
            ? myAnnouncements 
            : myAnnouncements.filter(n => n.type === notifFilter);
        
        const combined = [...result, ...filteredAnnouncements];
        return [...combined].sort((a, b) => {
            const ta = a.createdAt || (a as any).timestamp;
            const tb = b.createdAt || (b as any).timestamp;
            const da = ta instanceof Date ? ta : new Date(ta || 0);
            const db = tb instanceof Date ? tb : new Date(tb || 0);
            return db.getTime() - da.getTime();
        });
    }, [notifications, notifFilter, announcements]);

    const unread = useMemo(() => (notifications || []).filter(n => !n.read).length, [notifications]);

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

    const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        setMassImage(file);
        const reader = new FileReader();
        reader.onload = (ev) => setMassImagePreview(ev.target?.result as string);
        reader.readAsDataURL(file);
    };

    const handleRemoveImage = () => {
        setMassImage(null);
        setMassImagePreview(null);
        if (imageInputRef.current) imageInputRef.current.value = '';
        if (cameraInputRef.current) cameraInputRef.current.value = '';
    };

    const handleSendAnnounce = async () => {
        if (!user || !massText.trim()) {
            showToast('Escribe un mensaje para el anuncio', 'warning');
            return;
        }
        if (remainingCredits <= 0 && !isAdmin) {
            showToast('Has agotado tus anuncios del mes', 'warning');
            return;
        }
        setIsSending(true);
        let uploadedImageUrl: string | undefined;
        if (massImage) {
            setIsUploadingImage(true);
            try {
                const path = `announcements/${Date.now()}_${massImage.name}`;
                uploadedImageUrl = await uploadFile(path, massImage);
            } catch {
                showToast('Error al subir la imagen', 'error');
                setIsSending(false);
                setIsUploadingImage(false);
                return;
            }
            setIsUploadingImage(false);
        }
        try {
            let recipientIds: string[] = [];
            let finalRecipients = massTarget === 'followers'
                ? allUsers.filter(u => contextFollowers.includes(u.id))
                : allUsers;

            if (massLocalityMode === 'specific' && massLocality) {
                finalRecipients = finalRecipients.filter(u => u.locality === massLocality);
            }

            if (massVibeMode === 'specific' && massVibe) {
                finalRecipients = finalRecipients.filter(u => u.preferredVibe === massVibe);
            }

            recipientIds = finalRecipients.map(u => u.id);

            const isBusiness = massSenderType === 'business' && !!userBusiness;
            const senderId = isBusiness ? userBusiness!.id : user.id;
            const senderName = isBusiness ? (userBusiness!.name || 'Negocio') : (user.name || user.email?.split('@')[0] || 'Usuario');
            const senderAvatar = isBusiness ? (userBusiness!.imageUrl || '') : (user.avatarUrl || '');

            let successCount = 0;
            const roomMessages: { roomId: string; messageId: string }[] = [];

            for (const rid of recipientIds) {
                try {
                    const existingRoom = rooms.find(r =>
                        r.type === 'direct' && r.participants.includes(rid) &&
                        r.participants.some((p: string) => [user.id, user.businessId].includes(p))
                    );
                    let roomId = existingRoom?.id;
                    if (!roomId) {
                        const rUser = allUsers.find(u => u.id === rid);
                        roomId = await createChatRoom({
                            name: rUser ? `${rUser.name} ${rUser.surname || ''}` : 'Usuario',
                            type: 'direct',
                            participants: [senderId, rid],
                            avatar: rUser?.avatarUrl || 'https://i.pravatar.cc/100',
                            lastMessage: massText.substring(0, 50),
                            status: 'green'
                        });
                    }
                    if (roomId) {
                        const msgId = await sendRoomMessage(roomId, { senderId, senderName, senderAvatar, text: massText, isBusinessMessage: isBusiness });
                        roomMessages.push({ roomId, messageId: msgId });
                        successCount++;
                    }
                } catch {}
            }

            // Always save the announcement (even if 0 chat recipients)
            await createAnnouncement({
                senderId,
                senderName,
                senderAvatar,
                text: massText,
                type: massType,
                target: massTarget,
                locality: massLocalityMode === 'specific' ? massLocality || undefined : undefined,
                recipientCount: successCount,
                vibe: massVibeMode === 'specific' ? massVibe || undefined : undefined,
                roomMessages,
                ...(uploadedImageUrl ? { imageUrl: uploadedImageUrl } : {}),
            });

            showToast(
                successCount > 0
                    ? `Anuncio enviado a ${successCount} personas`
                    : 'Anuncio publicado correctamente',
                'success'
            );
            setShowAnnounce(false);
            setMassText('');
            setMassImage(null);
            setMassImagePreview(null);
            setMassSenderType('person');
        } catch (e) {
            showToast('Error al enviar anuncio', 'error');
        } finally {
            setIsSending(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] text-white pb-20 lg:pb-0">
            {/* Header */}
            <div className="pt-6 lg:pt-10 px-6 mb-4">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Notificaciones</h1>
                        {unread > 0 && (
                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mt-0.5">
                                {unread} sin leer
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        {/* Mark all read */}
                        {unread > 0 && (
                            <button
                                onClick={() => markAsRead && markAsRead('')}
                                className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-white/5 border border-white/10 text-slate-400 hover:text-white text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                <CheckCheck className="w-3.5 h-3.5" />
                                Leer todo
                            </button>
                        )}
                        {/* Announce button — premium only */}
                        {canAnnounce && (
                            <button
                                onClick={() => setShowAnnounce(true)}
                                className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-orange-500/30 hover:scale-105 active:scale-95 transition-all border border-orange-400/30"
                            >
                                <Sparkles className="w-4 h-4" />
                                Anunciar
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                    {['all', 'ventas', 'urgente', 'evento', ...(isAdmin ? ['system'] : [])].map(f => {
                        const styles = f === 'all'
                            ? { color: 'text-slate-300', bg: 'bg-white/10 border-white/20' }
                            : (NOTIF_TYPE_STYLES[f] || { color: 'text-slate-500', bg: 'bg-white/5', label: f, icon: Bell });
                        const Icon = f === 'all' ? Bell : (styles as any).icon;
                        return (
                            <button
                                key={f}
                                onClick={() => setNotifFilter(f)}
                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all ${notifFilter === f ? (f === 'all' ? 'bg-white/10 border-white/20 text-white' : `${(styles as any).bg} ${(styles as any).color}`) : 'bg-transparent border-white/10 text-slate-500 hover:text-white'}`}
                            >
                                <Icon className="w-3 h-3" />
                                {f === 'all' ? 'Todas' : (styles as any).label}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Notification list */}
            <div className="flex-1 overflow-y-auto px-4 space-y-2 pb-4">
                {filtered.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-64 gap-4 opacity-40">
                        <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center">
                            <Bell className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-sm font-black text-slate-500 uppercase tracking-widest">Sin notificaciones</p>
                    </div>
                ) : (
                    filtered.map((notif) => {
                        const typeKey = (notif.type || 'info') as keyof typeof NOTIF_TYPE_STYLES;
                        const style = NOTIF_TYPE_STYLES[typeKey] || NOTIF_TYPE_STYLES.info;
                        const Icon = style.icon;
                        
                        const handleItemClick = () => {
                            // For mass announcements, open detail modal
                            if ((notif as any).isMassAnnouncement) {
                                setSelectedAnnouncement(notif);
                                return;
                            }
                            markAsRead && markAsRead(notif.id);
                        };
                        const handleImageClick = (e: React.MouseEvent) => {
                            e.stopPropagation();
                            if (notif.imageUrl) {
                                setSelectedImage(notif.imageUrl);
                                setShowImageModal(true);
                            }
                        };
                        
                        return (
                            <button
                                key={notif.id}
                                onClick={handleItemClick}
                                className={`w-full flex items-start gap-4 p-4 rounded-2xl border transition-all text-left group hover:scale-[1.01] ${notif.read ? 'bg-slate-900/30 border-white/5 opacity-60' : `${style.bg} border shadow-lg`}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${style.bg} border`}>
                                    <Icon className={`w-5 h-5 ${style.color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    {notif.title && (
                                        <p className="text-sm font-black text-white mb-0.5 truncate">{notif.title}</p>
                                    )}
                                    <p className="text-xs text-slate-300 leading-relaxed line-clamp-2">{(notif as any).message || (notif as any).body}</p>
                                    {notif.imageUrl && (
                                        <div className="relative mt-2 group/image">
                                            <img 
                                                src={notif.imageUrl} 
                                                alt="notif" 
                                                className="w-full max-h-40 object-cover rounded-xl border border-white/10 cursor-pointer hover:opacity-80 transition-opacity"
                                                onClick={handleImageClick}
                                            />
                                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover/image:opacity-100 transition-opacity rounded-xl">
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Tocar para ampliar</span>
                                            </div>
                                        </div>
                                    )}
                                    <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-widest font-bold">
                                        {formatTime(notif.createdAt || (notif as any).timestamp)} · {style.label}
                                    </p>
                                </div>
                                {!notif.read && (
                                    <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0 mt-1.5 shadow-[0_0_8px_#f97316]" />
                                )}
                            </button>
                        );
                    })
                )}
            </div>

            {/* === Announce Modal === */}
            {showAnnounce && (
                <div className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in-zoom duration-300">
                        {/* Modal Header */}
                        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <Sparkles className="w-5 h-5 text-orange-500" />
                                    Anuncio Masivo
                                </h2>
                                <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-0.5">
                                    {remainingCredits === Infinity ? 'Envíos ilimitados' : `${remainingCredits} / ${businessCredits} restantes este mes`}
                                </p>
                            </div>
                            <button onClick={() => setShowAnnounce(false)} className="p-2 text-slate-400 hover:text-white transition-colors">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-5">
                            {/* Audience and sender type */}
                            <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
                                    <Users className="w-3 h-3 text-cyan-400" />
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                                        Alcance: {estimatedAudience} personas
                                    </span>
                                </div>
                                {userBusiness && (
                                    <div className="flex items-center gap-1 bg-slate-800/40 border border-white/10 rounded-full p-0.5">
                                        <button
                                            onClick={() => setMassSenderType('person')}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${massSenderType === 'person' ? 'bg-purple-500 text-white' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            <User className="w-3 h-3" />
                                            Persona
                                        </button>
                                        <button
                                            onClick={() => setMassSenderType('business')}
                                            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[8px] font-black uppercase tracking-widest transition-all ${massSenderType === 'business' ? 'bg-orange-500 text-white' : 'text-slate-500 hover:text-white'}`}
                                        >
                                            <MapPin className="w-3 h-3" />
                                            Empresa
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Target */}
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Enviar a:</p>
                                <div className="grid grid-cols-3 gap-2">
                                    {([
                                        { id: 'followers', label: 'Seguidores', icon: Heart },
                                        { id: 'all', label: 'Todo Ubicame.info', icon: Users },
                                    ] as const).map(t => (
                                        <button
                                            key={t.id}
                                            onClick={() => setMassTarget(t.id)}
                                            className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all ${massTarget === t.id ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-slate-800/40 border-white/5 hover:bg-white/5'}`}
                                        >
                                            <t.icon className={`w-4 h-4 ${massTarget === t.id ? 'text-orange-500' : 'text-slate-400'}`} />
                                            <span className={`text-[8px] font-black uppercase ${massTarget === t.id ? 'text-white' : 'text-slate-500'}`}>{t.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Vibe and Locality filters */}
                            <div className="grid grid-cols-2 gap-3">
                                {/* Locality filter */}
                                <div className="p-3 bg-slate-800/40 border border-white/5 rounded-2xl space-y-2">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <MapPin className="w-3 h-3 text-cyan-400" /> Localidad
                                    </p>
                                    <button
                                        onClick={() => setIsLocalityOpen(!isLocalityOpen)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${massLocalityMode === 'specific' ? 'bg-cyan-500/10 border-cyan-500 text-cyan-400' : 'bg-slate-900 border-white/10 text-slate-500'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                            {massLocalityMode === 'all' ? 'Todas' : (massLocality || 'Elegir...')}
                                        </span>
                                        <ChevronRight className={`w-3 h-3 transition-transform ${isLocalityOpen ? 'rotate-90' : ''}`} />
                                    </button>
                                    
                                    {isLocalityOpen && (
                                        <div className="pt-1 space-y-1">
                                            <button
                                                onClick={() => { setMassLocalityMode('all'); setIsLocalityOpen(false); }}
                                                className={`w-full text-left px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${massLocalityMode === 'all' ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                                            >
                                                Todas las localidades
                                            </button>
                                            {[...LOCALITIES, ...customLocalities].map(l => (
                                                <button
                                                    key={l.name}
                                                    onClick={() => { setMassLocalityMode('specific'); setMassLocality(l.name); setIsLocalityOpen(false); }}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${massLocalityMode === 'specific' && massLocality === l.name ? 'bg-cyan-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                                                >
                                                    {l.name}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Vibe filter */}
                                <div className="p-3 bg-slate-800/40 border border-white/5 rounded-2xl space-y-2">
                                    <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                        <Sparkles className="w-3 h-3 text-amber-400" /> Experiencia
                                    </p>
                                    <button
                                        onClick={() => setIsVibeOpen(!isVibeOpen)}
                                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl border transition-all ${massVibeMode === 'specific' ? 'bg-amber-500/10 border-amber-500 text-amber-400' : 'bg-slate-900 border-white/10 text-slate-500'}`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest truncate">
                                            {massVibeMode === 'all' ? 'Todas' : (massVibe || 'Elegir...')}
                                        </span>
                                        <ChevronRight className={`w-3 h-3 transition-transform ${isVibeOpen ? 'rotate-90' : ''}`} />
                                    </button>

                                    {isVibeOpen && (
                                        <div className="pt-1 space-y-1">
                                            <button
                                                onClick={() => { setMassVibeMode('all'); setIsVibeOpen(false); }}
                                                className={`w-full text-left px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${massVibeMode === 'all' ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                                            >
                                                Todos los estilos
                                            </button>
                                            {Object.values(Vibe).map(v => (
                                                <button
                                                    key={v}
                                                    onClick={() => { setMassVibeMode('specific'); setMassVibe(v); setIsVibeOpen(false); }}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase transition-all ${massVibeMode === 'specific' && massVibe === v ? 'bg-amber-500 text-white' : 'text-slate-400 hover:bg-white/5'}`}
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                        <Hash className="w-3 h-3" /> Categoría:
                                    </p>
                                    <span className="text-[9px] font-black text-orange-400/80 uppercase tracking-widest italic">
                                        {expirationText}
                                    </span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {availableTypes.map(t => {
                                        const s = NOTIF_TYPE_STYLES[t.id];
                                        return (
                                            <button
                                                key={t.id}
                                                onClick={() => setMassType(t.id as any)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${massType === t.id ? `${s.bg} ${s.color}` : 'bg-slate-800/40 border-white/5 text-slate-500 hover:bg-slate-800'}`}
                                            >
                                                <s.icon className="w-3 h-3" />
                                                {s.label}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Image attach */}
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                    <ImagePlus className="w-3 h-3" /> Imagen (opcional):
                                </p>
                                {massImagePreview ? (
                                    <div className="relative rounded-2xl overflow-hidden border border-white/10">
                                        <img src={massImagePreview} alt="Preview" className="w-full max-h-48 object-cover" />
                                        <button
                                            onClick={handleRemoveImage}
                                            className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500/80 rounded-full transition-all"
                                        >
                                            <Trash2 className="w-4 h-4 text-white" />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        {/* Galería */}
                                        <button
                                            onClick={() => imageInputRef.current?.click()}
                                            className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border border-dashed border-white/15 bg-slate-800/30 hover:bg-slate-800/60 transition-all text-slate-400 hover:text-white"
                                        >
                                            <ImagePlus className="w-5 h-5" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Galería</span>
                                        </button>
                                        {/* Cámara */}
                                        <button
                                            onClick={() => cameraInputRef.current?.click()}
                                            className="flex-1 flex flex-col items-center gap-1.5 py-3 rounded-xl border border-dashed border-white/15 bg-slate-800/30 hover:bg-slate-800/60 transition-all text-slate-400 hover:text-white"
                                        >
                                            <Camera className="w-5 h-5" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Cámara</span>
                                        </button>
                                    </div>
                                )}
                                {/* Hidden inputs */}
                                <input ref={imageInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />
                                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageSelect} />
                            </div>

                            {/* Message */}
                            <div>
                                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Mensaje:</p>
                                <textarea
                                    value={massText}
                                    onChange={e => setMassText(e.target.value)}
                                    placeholder="Escribe tu anuncio aquí..."
                                    rows={4}
                                    className="w-full bg-slate-800/50 border border-white/10 rounded-2xl px-4 py-3 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/50 resize-none"
                                />
                            </div>
                        </div>

                        {/* Send button */}
                        <div className="p-6 pt-0">
                            <button
                                onClick={handleSendAnnounce}
                                disabled={isSending || !massText.trim()}
                                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-black uppercase tracking-widest text-sm shadow-lg shadow-orange-500/20 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                            >
                                {isSending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        Enviando...
                                    </>
                                ) : (
                                    <>
                                        <Sparkles className="w-4 h-4" />
                                        Enviar Anuncio
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === Announcement Detail Modal === */}
            {selectedAnnouncement && (
                <div 
                    className="fixed inset-0 z-[300] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
                    onClick={() => setSelectedAnnouncement(null)}
                >
                    <div 
                        className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="p-4 border-b border-white/5 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${NOTIF_TYPE_STYLES[selectedAnnouncement.type]?.bg || NOTIF_TYPE_STYLES.system.bg} border`}>
                                    {(NOTIF_TYPE_STYLES[selectedAnnouncement.type] || NOTIF_TYPE_STYLES.system).icon && (
                                        React.createElement(
                                            (NOTIF_TYPE_STYLES[selectedAnnouncement.type] || NOTIF_TYPE_STYLES.system).icon, 
                                            { className: `w-5 h-5 ${NOTIF_TYPE_STYLES[selectedAnnouncement.type]?.color || NOTIF_TYPE_STYLES.system.color}` }
                                        )
                                    )}
                                </div>
                                <div>
                                    <p className="text-xs font-black text-white uppercase tracking-widest">{selectedAnnouncement.title}</p>
                                    <p className="text-[10px] text-slate-500 uppercase tracking-widest">
                                        {formatTime(selectedAnnouncement.createdAt)} · {(NOTIF_TYPE_STYLES[selectedAnnouncement.type] || NOTIF_TYPE_STYLES.system).label}
                                    </p>
                                </div>
                            </div>
                            <button 
                                className="p-2 text-slate-400 hover:text-white transition-colors"
                                onClick={() => setSelectedAnnouncement(null)}
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-4 space-y-4">
                            {selectedAnnouncement.imageUrl && (
                                <img 
                                    src={selectedAnnouncement.imageUrl} 
                                    alt="announcement" 
                                    className="w-full max-h-80 object-cover rounded-xl border border-white/10 cursor-pointer"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedImage(selectedAnnouncement.imageUrl);
                                        setShowImageModal(true);
                                    }}
                                />
                            )}
                            <p className="text-sm text-slate-300 leading-relaxed">{selectedAnnouncement.message || selectedAnnouncement.body}</p>
                        </div>
                        <div className="p-4 pt-0">
                            <button 
                                className="w-full flex items-center justify-center gap-2 py-3 bg-orange-500 hover:bg-orange-600 rounded-xl transition-all"
                                onClick={async () => {
                                    try {
                                        const shareText = selectedAnnouncement.message || selectedAnnouncement.body || '';
                                        const shareUrl = selectedAnnouncement.imageUrl || '';
                                        
                                        if (navigator.share) {
                                            await navigator.share({
                                                title: selectedAnnouncement.title,
                                                text: shareText + (shareUrl ? '\n\n' + shareUrl : ''),
                                            });
                                        } else {
                                            await navigator.clipboard.writeText(shareText + (shareUrl ? '\n\n' + shareUrl : ''));
                                            showToast('Contenido copiado al portapapeles', 'success');
                                        }
                                    } catch {
                                        showToast('Error al compartir', 'error');
                                    }
                                }}
                            >
                                <Share2 className="w-4 h-4" />
                                <span className="text-sm font-black text-white uppercase tracking-widest">Compartir</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* === Image Modal === */}
            {showImageModal && selectedImage && (
                <div 
                    className="fixed inset-0 z-[300] bg-black/95 flex items-center justify-center"
                    onClick={() => setShowImageModal(false)}
                >
                    <button 
                        className="absolute top-4 right-4 p-3 bg-white/10 hover:bg-white/20 rounded-full transition-all z-10"
                        onClick={() => setShowImageModal(false)}
                    >
                        <X className="w-6 h-6 text-white" />
                    </button>
                    <img 
                        src={selectedImage} 
                        alt="Preview" 
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                    <button 
                        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-600 rounded-full transition-all"
                        onClick={async () => {
                            try {
                                if (navigator.share) {
                                    await navigator.share({
                                        title: 'Imagen de notificacion',
                                        url: selectedImage,
                                    });
                                } else {
                                    await navigator.clipboard.writeText(selectedImage);
                                    showToast('Enlace copiado al portapapeles', 'success');
                                }
                            } catch {
                                showToast('Error al compartir', 'error');
                            }
                        }}
                    >
                        <Share2 className="w-5 h-5 text-white" />
                        <span className="text-sm font-black text-white uppercase tracking-widest">Compartir</span>
                    </button>
                </div>
            )}
        </div>
    );
};
