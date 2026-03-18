import React, { useState, useEffect, useMemo } from 'react';
import { Search, MoreVertical, Sparkles, Edit3, MessageCircle, Users, Hash, ChevronRight, X, UserPlus, Heart, Zap, Building2, MapPin, User, ChevronDown, Smile, Camera, Upload, X as XIcon, Star } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { ChatRoom as ChatRoomType, UserProfile, SubscriptionPlan } from '../types';
import { ChatRoom } from '../components/Chat/ChatRoom';
import { subscribeToChatRooms, subscribeToUsers, createChatRoom, sendMessage, sendRoomMessage } from '../services/firestoreService';
import { useData } from '../context/DataContext';
import { compressImage } from '../utils/imageUtils';
import { LOCALITIES } from '../constants';

const mockRooms: ChatRoomType[] = [
    {
        id: '1',
        name: 'Poder Surfista',
        lastMessage: '¿Alguien para surfear en la punta a las 7?',
        lastMessageTime: 'hace 2m',
        status: 'orange',
        type: 'group',
        participants: [],
        avatar: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?w=400&h=400&fit=crop'
    },
    {
        id: '2',
        name: 'Ruta Nocturna',
        lastMessage: "¡Hoy hay fiesta en el pueblito!",
        lastMessageTime: 'hace 15m',
        status: 'orange',
        unreadCount: 3,
        type: 'group',
        participants: [],
        avatar: 'https://images.unsplash.com/photo-1541339907198-e08756ebafe3?w=400&h=400&fit=crop'
    },
    {
        id: '3',
        name: 'Senderistas Olon',
        lastMessage: 'Mañana caminata a las cascadas.',
        lastMessageTime: 'hace 1h',
        status: 'none',
        type: 'group',
        participants: [],
        avatar: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&h=400&fit=crop'
    }
];

export const Community: React.FC = () => {
    const { user } = useAuthContext();
    const navigate = useNavigate();
    const { messages, handleSendMessage: sendGlobalMessage, businesses, followedBusinessIds } = useData();
    const [activeTab, setActiveTab] = useState<'groups' | 'direct' | 'global'>('global');
    const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);
    const [rooms, setRooms] = useState<ChatRoomType[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLocality, setSelectedLocality] = useState<string | null>(null);
    const [showLocalityDropdown, setShowLocalityDropdown] = useState(false);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [userSearchText, setUserSearchText] = useState('');
    const [sendAsBusiness, setSendAsBusiness] = useState(false);
    const { t } = useTranslation();
    const [showGlobalEmojiPicker, setShowGlobalEmojiPicker] = useState(false);
    const [showGlobalImageOptions, setShowGlobalImageOptions] = useState(false);
    const [selectedGlobalImage, setSelectedGlobalImage] = useState<string | null>(null);
    const globalImageInputRef = React.useRef<HTMLInputElement>(null);
    const globalCameraInputRef = React.useRef<HTMLInputElement>(null);
    const [showMassMessage, setShowMassMessage] = useState(false);
    const [massMessageText, setMassMessageText] = useState('');
    const [massMessageTarget, setMassMessageTarget] = useState<'followers' | 'all' | 'chat'>('followers');
    const [isSendingMass, setIsSendingMass] = useState(false);
    const [showMassEmojiPicker, setShowMassEmojiPicker] = useState(false);
    const [showMassImageOptions, setShowMassImageOptions] = useState(false);
    const [selectedMassImage, setSelectedMassImage] = useState<string | null>(null);
    const [massSendAsBusiness, setMassSendAsBusiness] = useState(false);
    const massImageInputRef = React.useRef<HTMLInputElement>(null);
    const massCameraInputRef = React.useRef<HTMLInputElement>(null);

    const userBusiness = user?.businessId ? businesses.find(b => b.id === user.businessId) : null;
    const userPlan = user?.plan || SubscriptionPlan.VISITOR;
    const canSendAsBusiness = userBusiness && userPlan === SubscriptionPlan.PREMIUM;
    const canUsePremiumFeatures = userPlan === SubscriptionPlan.PREMIUM;
    const isPremiumUser = userPlan === SubscriptionPlan.PREMIUM;

    const GLOBAL_EMOJIS = ['😀', '😎', '🔥', '❤️', '🎉', '👍', '🙏', '💪', '🌟', '😂', '🥳', '😍', '🤔', '👀', '🚀', '💯', '✨', '🎸', '🍹', '🏖️'];

    const globalSearchResults = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const query = searchQuery.toLowerCase();
        
        const businessesResults = (businesses || []).filter(b => 
            b.id !== user?.businessId &&
            (!selectedLocality || b?.locality === selectedLocality) &&
            ((b?.name || '').toLowerCase().includes(query) ||
            (b?.locality || '').toLowerCase().includes(query) ||
            (b?.sector || '').toLowerCase().includes(query))
        ).map(b => ({ type: 'business' as const, data: b }));

        const usersResults = (allUsers || []).filter(u => 
            u.id !== user?.id && ((u?.name || '') + ' ' + (u?.surname || '')).toLowerCase().includes(query)
        ).map(u => ({ type: 'user' as const, data: u }));

        const groupsResults = (mockRooms || []).filter(r => 
            r?.type === 'group' && ((r?.name || '').toLowerCase().includes(query) || (r?.lastMessage || '').toLowerCase().includes(query))
        ).map(g => ({ type: 'group' as const, data: g }));

        const locationsResults = (LOCALITIES || []).filter(l => 
            (l.name || '').toLowerCase().includes(query)
        ).map(l => ({ type: 'location' as const, data: l }));

        return {
            businesses: businessesResults.slice(0, 5),
            users: usersResults.slice(0, 5),
            groups: groupsResults.slice(0, 3),
            locations: locationsResults.slice(0, 3)
        };
    }, [searchQuery, businesses, allUsers, selectedLocality]);

    const filteredBusinesses = useMemo(() => {
        const query = userSearchText.toLowerCase();
        let results = (businesses || []).filter(b => b.id !== user?.businessId);
        
        if (selectedLocality) {
            results = results.filter(b => b?.locality === selectedLocality);
        }
        
        if (!userSearchText.trim()) {
            return results.slice(0, 8);
        }
        return results.filter(b => 
            (b?.name || '').toLowerCase().includes(query) ||
            (b?.locality || '').toLowerCase().includes(query) ||
            (b?.sector || '').toLowerCase().includes(query) ||
            (b?.description || '').toLowerCase().includes(query)
        );
    }, [businesses, userSearchText, selectedLocality, user]);
    
    const filteredGroups = useMemo(() => {
        const query = userSearchText.toLowerCase();
        if (!userSearchText.trim()) return (mockRooms || []).filter(r => r?.type === 'group').slice(0, 3);
        return (mockRooms || []).filter(r => 
            r?.type === 'group' && 
            ((r?.name || '').toLowerCase().includes(query) || (r?.lastMessage || '').toLowerCase().includes(query))
        );
    }, [userSearchText]);



    useEffect(() => {
        if (!user) {
            setRooms(mockRooms);
            return;
        }

        let userRooms: ChatRoomType[] = [];
        let bizRooms: ChatRoomType[] = [];

        const updateMergedRooms = () => {
            const allRoomsMap = new Map<string, ChatRoomType>();
            [...userRooms, ...bizRooms].forEach(r => allRoomsMap.set(r.id, r));
            const merged = Array.from(allRoomsMap.values());
            setRooms(merged.length > 0 ? merged : mockRooms);
        };

        const unsubscribeUserRooms = subscribeToChatRooms(user.id, (rooms) => {
            userRooms = rooms;
            updateMergedRooms();
        });

        let unsubscribeBizRooms = () => {};
        if (user.businessId) {
            unsubscribeBizRooms = subscribeToChatRooms(user.businessId, (rooms) => {
                bizRooms = rooms;
                updateMergedRooms();
            });
        }

        const unsubscribeUsers = subscribeToUsers((users) => {
            setAllUsers(users.filter(u => u.id !== user.id));
        });

        return () => {
            unsubscribeUserRooms();
            unsubscribeBizRooms();
            unsubscribeUsers();
        };
    }, [user]);

    const filteredRooms = useMemo(() => {
        const query = searchQuery.toLowerCase();
        let filtered = (rooms || []);
        
        if (activeTab === 'groups') {
            filtered = filtered.filter(room => room?.type === 'group');
        } else if (activeTab === 'direct') {
            filtered = filtered.filter(room => room?.type === 'direct');
            if (user) {
                const userIds = user.businessId ? [user.id, user.businessId] : [user.id];
                filtered = filtered.filter(room => 
                    room.participants && room.participants.some((p: string) => userIds.includes(p))
                );
            }
        }
        
        return filtered.filter(room => 
            (room?.name || '').toLowerCase().includes(query) ||
            (room?.lastMessage || '').toLowerCase().includes(query)
        );
    }, [rooms, activeTab, searchQuery, user]);

    const filteredUsers = useMemo(() => {
        const query = userSearchText.toLowerCase();
        return (allUsers || []).filter(u =>
            ((u?.name || '') + ' ' + (u?.surname || '')).toLowerCase().includes(query)
        );
    }, [allUsers, userSearchText]);

    const handleStartDM = async (targetUser: UserProfile) => {
        if (!user) return;

        const existingRoom = rooms.find(r =>
            r.type === 'direct' &&
            r.participants.includes(targetUser.id) &&
            r.participants.includes(user.id)
        );

        if (existingRoom) {
            setSelectedRoom(existingRoom);
            setIsComposeOpen(false);
            return;
        }

        const newRoom: Omit<ChatRoomType, 'id'> = {
            name: targetUser.name + ' ' + (targetUser.surname || ''),
            type: 'direct',
            participants: [user.id, targetUser.id],
            avatar: targetUser.avatarUrl || 'https://i.pravatar.cc/100',
            lastMessage: 'Iniaste una conversación',
            status: 'green'
        };

        try {
            const roomId = await createChatRoom(newRoom);
            setSelectedRoom({ id: roomId, ...newRoom });
            setIsComposeOpen(false);
        } catch (error) {
            console.error('Error starting DM:', error);
        }
    };

    const handleStartBusinessDM = async (business: any) => {
        if (!user) return;

        const existingRoom = rooms.find(r =>
            r.type === 'direct' &&
            r.participants.includes(business.id) &&
            r.participants.includes(user.id)
        );

        if (existingRoom) {
            setSelectedRoom(existingRoom);
            setIsComposeOpen(false);
            return;
        }

        const newRoom: Omit<ChatRoomType, 'id'> = {
            name: business.name,
            type: 'direct',
            participants: [user.id, business.id],
            avatar: business.imageUrl || 'https://i.pravatar.cc/100',
            lastMessage: `¡Hola! Estoy interesado en tus servicios`,
            status: business.plan === SubscriptionPlan.PREMIUM ? 'green' : 'none'
        };

        try {
            const roomId = await createChatRoom(newRoom);
            setSelectedRoom({ id: roomId, ...newRoom });
            setIsComposeOpen(false);
        } catch (error) {
            console.error('Error starting business DM:', error);
        }
    };

    if (selectedRoom) {
        const participantId = selectedRoom.participants.find((p: string) => p !== user?.id);
        let chatDisplayName = selectedRoom.name;
        let chatDisplayAvatar = selectedRoom.avatar;
        let isChatBusiness = false;
        
        if (participantId) {
            const biz = businesses.find(b => b.id === participantId);
            if (biz) {
                chatDisplayName = biz.name;
                chatDisplayAvatar = biz.imageUrl;
                isChatBusiness = true;
            } else if (participantId !== user?.businessId) {
                const u = allUsers.find(u => u.id === participantId);
                if (u) {
                    chatDisplayName = `${u.name} ${u.surname}`.trim();
                    chatDisplayAvatar = u.avatarUrl;
                }
            }
        }
        
        const enhancedRoom = {
            ...selectedRoom,
            displayName: chatDisplayName,
            displayAvatar: chatDisplayAvatar,
            isBusinessChat: isChatBusiness
        };
        
        return <ChatRoom room={enhancedRoom} onBack={() => setSelectedRoom(null)} />;
    }

    const handleSendMassMessage = async () => {
        if (!user || (!massMessageText.trim() && !selectedMassImage)) {
            alert('Escribe un mensaje o selecciona una imagen');
            return;
        }
        
        setIsSendingMass(true);
        
        try {
            let recipientIds: string[] = [];
            
            if (massMessageTarget === 'followers') {
                if (!followedBusinessIds || followedBusinessIds.length === 0) {
                    alert('No tienes seguidores aún');
                    setIsSendingMass(false);
                    return;
                }
                recipientIds = [...followedBusinessIds];
            } else if (massMessageTarget === 'all') {
                if (!allUsers || allUsers.length === 0) {
                    alert('No hay usuarios disponibles');
                    setIsSendingMass(false);
                    return;
                }
                recipientIds = allUsers.filter(u => u.id !== user?.id).map(u => u.id);
            } else {
                const currentRoomMessages = messages.slice(-50);
                const uniqueSenders = new Set(currentRoomMessages.filter(m => m.senderId !== user?.id && m.senderId !== user?.businessId).map(m => m.senderId));
                recipientIds = Array.from(uniqueSenders);
            }

            if (recipientIds.length === 0) {
                alert('No hay destinatarios disponibles');
                setIsSendingMass(false);
                return;
            }

            const isSendingAsBusiness = massSendAsBusiness && userBusiness;
            const senderId = isSendingAsBusiness ? userBusiness!.id : user!.id;
            const senderName = isSendingAsBusiness 
                ? (userBusiness!.name || 'Negocio') 
                : (user?.name || user?.email?.split('@')[0] || 'Usuario');
            const senderAvatar = isSendingAsBusiness 
                ? (userBusiness!.imageUrl || userBusiness!.icon || 'https://i.pravatar.cc/100') 
                : (user?.avatarUrl || 'https://i.pravatar.cc/100');
            const isBusinessMsg = !!isSendingAsBusiness;
            
            let successCount = 0;
            
                for (const recipientId of recipientIds) {
                try {
                    const userParticipantIds = user.businessId 
                        ? [user.id, user.businessId] 
                        : [user.id];
                        
                    const existingRoom = rooms.find(r => 
                        r.type === 'direct' && 
                        r.participants.includes(recipientId) &&
                        r.participants.some(p => userParticipantIds.includes(p))
                    );
                    
                    const messageText = massMessageText || (selectedMassImage ? '📷 Foto' : '');
                    
                    if (existingRoom) {
                        await sendRoomMessage(existingRoom.id, {
                            senderId,
                            senderName,
                            senderAvatar,
                            text: messageText,
                            imageUrl: selectedMassImage || undefined,
                            roomId: existingRoom.id,
                            isBusinessMessage: isBusinessMsg
                        });
                        successCount++;
                    } else {
                        const recipientBusiness = businesses.find(b => b.id === recipientId);
                        const recipientUser = allUsers.find(u => u.id === recipientId);
                        const roomName = recipientBusiness ? recipientBusiness.name : (recipientUser ? `${recipientUser.name} ${recipientUser.surname}` : 'Chat');
                        const roomAvatar = recipientBusiness ? (recipientBusiness.imageUrl || recipientBusiness.icon) : (recipientUser?.avatarUrl || 'https://i.pravatar.cc/100');
                        
                        const participants = user.businessId 
                            ? [user.id, user.businessId, recipientId] 
                            : [user.id, recipientId];
                            
                        const newRoom: Omit<ChatRoomType, 'id'> = {
                            name: roomName,
                            type: 'direct',
                            participants,
                            avatar: roomAvatar,
                            lastMessage: messageText,
                            status: 'none'
                        };
                        const roomId = await createChatRoom(newRoom);
                        await sendRoomMessage(roomId, {
                            senderId,
                            senderName,
                            senderAvatar,
                            text: messageText,
                            imageUrl: selectedMassImage || undefined,
                            roomId: roomId,
                            isBusinessMessage: isBusinessMsg
                        });
                        successCount++;
                    }
                } catch (err) {
                    console.error(`Error sending to ${recipientId}:`, err);
                }
            }
            
            if (successCount > 0) {
                alert(`Mensaje enviado a ${successCount} destinatarios`);
                setShowMassMessage(false);
                setMassMessageText('');
                setSelectedMassImage(null);
                setMassSendAsBusiness(false);
            } else {
                alert('No se pudo enviar ningún mensaje');
            }
        } catch (error) {
            console.error('Error sending mass message:', error);
            alert('Error al enviar mensaje masivo: ' + (error as Error).message);
        } finally {
            setIsSendingMass(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] text-white pb-20 lg:pb-0">
            {/* Header Area */}
            <div className="pt-6 lg:pt-14 px-6 mb-4">
                <div className="flex items-center justify-between mb-1">
                    <div className="space-y-1">
                        <h1 className="text-3xl font-black tracking-tighter bg-gradient-to-r from-orange-400 to-amber-600 bg-clip-text text-transparent">
                            Comunidad
                        </h1>
                        <p className="text-slate-500 text-[9px] font-black uppercase tracking-[0.2em]">Conecta con el pulso local</p>
                    </div>
                    <div className="flex items-center gap-3">
                        {isPremiumUser && userBusiness && (
                            <button
                                onClick={() => setShowMassMessage(true)}
                                className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/30 hover:scale-105 transition-transform"
                            >
                                <Zap className="w-4 h-4 inline mr-1" /> Mensaje Masivo
                            </button>
                        )}
                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-orange-500 shadow-orange-500/20" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-6 mb-4">
                <div className="relative group flex gap-2">
                    <div className="relative flex-1 group">
                        <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                            <Search className={`w-5 h-5 transition-colors ${searchQuery ? 'text-orange-500' : 'text-slate-600'}`} />
                        </div>
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar personas, negocios, grupos o lugares..."
                            className="w-full bg-slate-900/40 border border-white/5 rounded-2xl py-3.5 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500/30 transition-all backdrop-blur-md shadow-2xl"
                        />
                        {searchQuery.trim() && (
                            <button 
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                    
                    {/* Locality Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowLocalityDropdown(!showLocalityDropdown)}
                            className={`h-full px-4 rounded-2xl border flex items-center gap-2 transition-all ${selectedLocality 
                                ? 'bg-cyan-500/20 border-cyan-500/40' 
                                : 'bg-slate-900/40 border-white/5 hover:bg-white/5'}`}
                        >
                            <MapPin className={`w-4 h-4 ${selectedLocality ? 'text-cyan-400' : 'text-slate-600'}`} />
                            <span className={`text-[10px] font-black uppercase whitespace-nowrap ${selectedLocality ? 'text-cyan-400' : 'text-slate-500'}`}>
                                {selectedLocality || 'Ubicación'}
                            </span>
                        </button>
                        
                        {showLocalityDropdown && (
                            <div className="absolute right-0 top-full mt-2 w-48 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                                <button
                                    onClick={() => { setSelectedLocality(null); setShowLocalityDropdown(false); }}
                                    className={`w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors ${!selectedLocality ? 'text-orange-500' : 'text-slate-400'}`}
                                >
                                    🌎 Todas
                                </button>
                                {LOCALITIES.map((loc) => (
                                    <button
                                        key={loc.name}
                                        onClick={() => { setSelectedLocality(loc.name); setShowLocalityDropdown(false); }}
                                        className={`w-full p-3 text-left text-[10px] font-black uppercase tracking-widest hover:bg-white/5 transition-colors ${selectedLocality === loc.name ? 'text-cyan-400' : 'text-slate-400'}`}
                                    >
                                        📍 {loc.name}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Search Results Dropdown */}
                {globalSearchResults && (
                    <div className="mt-3 bg-[#111111] border border-white/10 rounded-2xl max-h-96 overflow-y-auto shadow-2xl">
                        {globalSearchResults.locations.length > 0 && (
                            <div className="p-3 border-b border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-cyan-500 mb-2 flex items-center gap-2">
                                    <MapPin className="w-3 h-3" /> Puntos de Referencia
                                </p>
                                <div className="space-y-1">
                                    {globalSearchResults.locations.map((loc, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => { setSearchQuery(''); navigate('/', { state: { filter: (loc.data as any).name } }); }}
                                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left"
                                        >
                                            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                                                <MapPin className="w-4 h-4 text-cyan-400" />
                                            </div>
                                            <span className="text-sm font-bold text-white">{(loc.data as any).name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {globalSearchResults.businesses.length > 0 && (
                            <div className="p-3 border-b border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-500 mb-2 flex items-center gap-2">
                                    <Building2 className="w-3 h-3" /> Negocios
                                </p>
                                <div className="space-y-1">
                                    {globalSearchResults.businesses.map((biz) => {
                                        const isPremium = (biz.data as any).plan === SubscriptionPlan.PREMIUM;
                                        const isOwnBusiness = (biz.data as any).id === user?.businessId;
                                        return (
                                        <button
                                            key={(biz.data as any).id}
                                            onClick={() => {
                                                if (isPremiumUser && !isOwnBusiness) {
                                                    handleStartBusinessDM(biz.data);
                                                    setSearchQuery('');
                                                }
                                            }}
                                            disabled={!isPremiumUser || isOwnBusiness}
                                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left ${isPremiumUser && !isOwnBusiness ? 'hover:bg-white/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                        >
                                            <div className={`w-10 h-10 rounded-xl overflow-hidden ${isPremium ? 'border-2 border-amber-500/30' : 'border border-white/10'}`}>
                                                <img src={(biz.data as any).imageUrl || 'https://i.pravatar.cc/100'} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className={`text-sm font-bold ${isPremium ? 'text-amber-400' : 'text-white'}`}>{(biz.data as any).name}</span>
                                                <span className="text-[10px] text-slate-500 ml-2">{(biz.data as any).locality}</span>
                                                {isOwnBusiness && <span className="text-[8px] text-slate-500 ml-1">(Tu negocio)</span>}
                                            </div>
                                            {isPremium && <Star className="w-4 h-4 text-amber-500" />}
                                            {!isPremiumUser && <MessageCircle className="w-4 h-4 text-slate-600" />}
                                        </button>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {globalSearchResults.users.length > 0 && (
                            <div className="p-3 border-b border-white/5">
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-500 mb-2 flex items-center gap-2">
                                    <User className="w-3 h-3" /> Personas
                                </p>
                                <div className="space-y-1">
                                    {globalSearchResults.users.filter(u => (u.data as any).id !== user?.id).map((u) => (
                                        <button
                                            key={(u.data as any).id}
                                            onClick={() => {
                                                if (isPremiumUser) {
                                                    handleStartDM(u.data);
                                                    setSearchQuery('');
                                                }
                                            }}
                                            className={`w-full flex items-center gap-3 p-2 rounded-xl transition-colors text-left ${isPremiumUser ? 'hover:bg-white/5 cursor-pointer' : 'opacity-50 cursor-not-allowed'}`}
                                        >
                                            <div className="w-10 h-10 rounded-full border-2 border-white/10 overflow-hidden">
                                                <img src={(u.data as any).avatarUrl || 'https://i.pravatar.cc/100'} className="w-full h-full object-cover" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <span className="text-sm font-bold text-white">{(u.data as any).name} {(u.data as any).surname}</span>
                                                <span className="text-[10px] text-slate-500 ml-2">{(u.data as any).preferredVibe}</span>
                                            </div>
                                            {!isPremiumUser && <MessageCircle className="w-4 h-4 text-slate-600" />}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {globalSearchResults.groups.length > 0 && (
                            <div className="p-3">
                                <p className="text-[10px] font-black uppercase tracking-widest text-purple-500 mb-2 flex items-center gap-2">
                                    <Users className="w-3 h-3" /> Grupos
                                </p>
                                <div className="space-y-1">
                                    {globalSearchResults.groups.map((g) => (
                                        <button
                                            key={(g.data as any).id}
                                            onClick={() => {
                                                setSelectedRoom(g.data);
                                                setSearchQuery('');
                                            }}
                                            className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left"
                                        >
                                            <div className="w-10 h-10 rounded-xl border-2 border-purple-500/30 overflow-hidden">
                                                <img src={(g.data as any).avatar} className="w-full h-full object-cover" />
                                            </div>
                                            <span className="text-sm font-bold text-white">{(g.data as any).name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {globalSearchResults.businesses.length === 0 && 
                         globalSearchResults.users.length === 0 && 
                         globalSearchResults.groups.length === 0 &&
                         globalSearchResults.locations.length === 0 && (
                            <div className="p-6 text-center">
                                <p className="text-sm font-black text-slate-500 uppercase">Sin resultados</p>
                            </div>
                        )}

                        {!isPremiumUser && (
                            <div className="p-3 bg-amber-500/10 border-t border-amber-500/20">
                                <p className="text-[10px] text-amber-400 text-center">
                                    🚀 Upgrade a Premium para chatear con negocios y personas
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Mass Message Modal */}
            {showMassMessage && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg p-6 shadow-2xl">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight">
                                📢 Mensaje Masivo
                            </h2>
                            <button 
                                onClick={() => setShowMassMessage(false)}
                                className="p-2 text-slate-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            {userBusiness && (
                                <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Como enviar:</span>
                                        <button
                                            onClick={() => setMassSendAsBusiness(!massSendAsBusiness)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${massSendAsBusiness ? 'bg-amber-500 border border-amber-400' : 'bg-white/10 border border-white/10'}`}
                                        >
                                            {massSendAsBusiness ? (
                                                <>
                                                    <Building2 className="w-3.5 h-3.5 text-white" />
                                                    <span className="text-[10px] font-black text-white uppercase">{userBusiness.name}</span>
                                                </>
                                            ) : (
                                                <>
                                                    <User className="w-3.5 h-3.5 text-slate-400" />
                                                    <span className="text-[10px] font-black text-slate-400 uppercase">{user?.name?.split(' ')[0]}</span>
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div>
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Enviar a:</p>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => setMassMessageTarget('followers')}
                                        className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase transition-all ${massMessageTarget === 'followers' ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                                    >
                                        👥 Seguidores
                                    </button>
                                    <button
                                        onClick={() => setMassMessageTarget('all')}
                                        className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase transition-all ${massMessageTarget === 'all' ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                                    >
                                        🌍 Todos
                                    </button>
                                    <button
                                        onClick={() => setMassMessageTarget('chat')}
                                        className={`flex-1 p-3 rounded-xl text-[10px] font-black uppercase transition-all ${massMessageTarget === 'chat' ? 'bg-amber-500 text-white' : 'bg-white/5 text-slate-400 border border-white/10'}`}
                                    >
                                        💬 Chat Actual
                                    </button>
                                </div>
                            </div>

                            <div>
                                <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Mensaje:</p>
                                {selectedMassImage && (
                                    <div className="relative mb-2 inline-block">
                                        <img src={selectedMassImage} alt="Preview" className="w-20 h-20 rounded-xl object-cover border border-amber-500/30" />
                                        <button 
                                            onClick={() => setSelectedMassImage(null)}
                                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center"
                                        >
                                            <XIcon className="w-3 h-3 text-white" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl p-2">
                                    <div className="relative">
                                        <button 
                                            onClick={() => { setShowMassEmojiPicker(!showMassEmojiPicker); setShowMassImageOptions(false); }}
                                            className="p-2 text-slate-500 hover:text-amber-500 transition-colors"
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        {showMassEmojiPicker && (
                                            <div className="absolute bottom-full left-0 mb-2 p-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl w-56">
                                                <div className="flex flex-wrap gap-1 max-h-28 overflow-y-auto">
                                                    {GLOBAL_EMOJIS.map((emoji, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                setMassMessageText(prev => prev + emoji);
                                                                setShowMassEmojiPicker(false);
                                                            }}
                                                            className="text-xl hover:scale-125 transition-transform p-1"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <div className="relative">
                                        <button 
                                            onClick={() => { setShowMassImageOptions(!showMassImageOptions); setShowMassEmojiPicker(false); }}
                                            className="p-2 text-slate-500 hover:text-amber-500 transition-colors"
                                        >
                                            <Camera className="w-5 h-5" />
                                        </button>
                                        {showMassImageOptions && (
                                            <div className="absolute bottom-full right-0 mb-2 p-2 bg-slate-900 border border-white/10 rounded-xl shadow-2xl flex gap-2">
                                                <button 
                                                    onClick={() => massCameraInputRef.current?.click()}
                                                    className="p-2 bg-amber-500/20 rounded-lg hover:bg-amber-500/30 transition-colors"
                                                >
                                                    <Camera className="w-4 h-4 text-amber-400" />
                                                </button>
                                                <button 
                                                    onClick={() => massImageInputRef.current?.click()}
                                                    className="p-2 bg-amber-500/20 rounded-lg hover:bg-amber-500/30 transition-colors"
                                                >
                                                    <Upload className="w-4 h-4 text-amber-400" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={massImageInputRef} 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800 });
                                                setSelectedMassImage(compressed);
                                                setShowMassImageOptions(false);
                                            }
                                        }}
                                    />
                                    <input 
                                        type="file" 
                                        ref={massCameraInputRef} 
                                        accept="image/*" 
                                        capture="environment"
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800 });
                                                setSelectedMassImage(compressed);
                                                setShowMassImageOptions(false);
                                            }
                                        }}
                                    />
                                    <textarea
                                        value={massMessageText}
                                        onChange={(e) => setMassMessageText(e.target.value)}
                                        placeholder="Escribe tu mensaje..."
                                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-bold text-white placeholder:text-slate-600 py-2 px-1 h-10 resize-none"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleSendMassMessage}
                                disabled={!massMessageText.trim() && !selectedMassImage || isSendingMass}
                                className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all ${(massMessageText.trim() || selectedMassImage) && !isSendingMass ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30' : 'bg-slate-800 text-slate-500'}`}
                            >
                                {isSendingMass ? 'Enviando...' : '🚀 Enviar Mensaje'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="px-6 mb-4">
                <div className="bg-slate-900/50 p-1.5 rounded-[1.8rem] flex border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden">
                    <div
                        className="absolute h-[calc(100%-12px)] top-[6px] bg-gradient-to-tr from-orange-600 to-amber-600 rounded-2xl transition-all duration-500 ease-out z-0 shadow-lg shadow-orange-600/20"
                        style={{
                            left: activeTab === 'global' ? '6px' : (activeTab === 'groups' ? 'calc(33.33% + 2px)' : 'calc(66.66% - 2px)'),
                            width: 'calc(33.33% - 4px)'
                        }}
                    />
                    <button
                        onClick={() => setActiveTab('global')}
                        className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'global' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Sparkles className={`w-4 h-4 ${activeTab === 'global' ? 'text-white' : 'text-slate-600'}`} />
                        En Vivo
                    </button>
                    <button
                        onClick={() => setActiveTab('groups')}
                        className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'groups' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <Users className={`w-4 h-4 ${activeTab === 'groups' ? 'text-white' : 'text-slate-600'}`} />
                        Grupos
                    </button>
                    <button
                        onClick={() => setActiveTab('direct')}
                        className={`relative z-10 flex-1 py-3 flex items-center justify-center gap-2 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${activeTab === 'direct' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        <MessageCircle className={`w-4 h-4 ${activeTab === 'direct' ? 'text-white' : 'text-slate-600'}`} />
                        Mensajes
                    </button>
                </div>
            </div>

            {/* Content Section */}
            <div className="px-6 flex-1 overflow-hidden pb-4">
                {activeTab === 'global' ? (
                    <div className="h-full flex flex-col bg-[#111111]/80 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-3xl shadow-2xl relative">
                        {/* Global Chat Header Overlay */}
                        <div className="p-5 flex items-center justify-between bg-white/[0.02] border-b border-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Puntos de encuentro LIVE</span>
                            </div>
                            <div className="flex -space-x-2">
                                {[1, 2, 3].map(i => (
                                    <div key={i} className="w-6 h-6 rounded-full border-2 border-[#111111] bg-slate-800 overflow-hidden">
                                        <img src={`https://i.pravatar.cc/100?u=${i}`} className="w-full h-full object-cover" />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar scrolling-touch">
                            {messages.map((msg, idx) => {
                                // Support both field naming conventions during transition
                                const senderId = msg.senderId || (msg as any).authorId;
                                const text = msg.text || (msg as any).content;
                                const senderName = msg.senderName || (msg as any).authorName;
                                const senderAvatar = msg.senderAvatar || (msg as any).authorAvatar;

                                const isMe = senderId === user?.id || (userBusiness && senderId === userBusiness.id);
                                return (
                                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1.5 animate-in slide-in-from-bottom-2 duration-300`}>
                                        {!isMe && (
                                            <div className="flex items-center gap-2 mb-0.5 ml-1">
                                                <div className="relative">
                                                    <img src={senderAvatar || 'https://i.pravatar.cc/100'} className={`w-5 h-5 border border-white/10 ${msg.isBusinessMessage ? 'rounded-lg' : 'rounded-full'}`} />
                                                    {msg.isBusinessMessage && (
                                                        <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full flex items-center justify-center border border-[#111111]">
                                                            <span className="text-[6px] text-white">★</span>
                                                        </div>
                                                    )}
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-widest ${msg.isBusinessMessage ? 'text-amber-500' : 'text-slate-500'}`}>
                                                    {senderName}
                                                </span>
                                            </div>
                                        )}
                                        <div className={`relative px-5 py-3.5 rounded-[2rem] text-sm font-bold leading-relaxed shadow-2xl transition-all group-hover/msg:scale-[1.02] ${isMe
                                            ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-tr-sm shadow-orange-600/20'
                                            : 'bg-slate-800/80 backdrop-blur-md text-slate-100 rounded-tl-sm border border-white/5 shadow-black/40'
                                            }`}>
                                            {text}
                                        </div>
                                    </div>
                                );
                            })}

                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center opacity-30 gap-3">
                                    <MessageCircle className="w-10 h-10 text-slate-600" />
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 text-center px-12">No hay mensajes recientes en esta zona</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 bg-white/[0.02] border-t border-white/5 pb-4 lg:pb-6">
                            {/* Business Toggle - Solo Premium con negocio */}
                            {userBusiness && userPlan === SubscriptionPlan.PREMIUM ? (
                                <div className="mb-3 bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/30 rounded-2xl p-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-amber-400 font-black uppercase tracking-widest flex items-center gap-2">
                                            <Zap className="w-3 h-3 fill-amber-400" /> ✨ Modo Premium Activo
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[9px] text-amber-300/70">Enviar como:</span>
                                            <button
                                                onClick={() => setSendAsBusiness(!sendAsBusiness)}
                                                className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${sendAsBusiness ? 'bg-amber-500 border-amber-400 shadow-lg shadow-amber-500/30' : 'bg-white/10 border border-white/20'}`}
                                            >
                                                {sendAsBusiness ? (
                                                    <>
                                                        <Building2 className="w-3.5 h-3.5 text-white" />
                                                        <span className="text-[10px] font-black text-white uppercase">{userBusiness.name}</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <User className="w-3.5 h-3.5 text-slate-300" />
                                                        <span className="text-[10px] font-black text-slate-300 uppercase">{user?.name?.split(' ')[0]}</span>
                                                    </>
                                                )}
                                                <ChevronDown className={`w-3 h-3 transition-transform ${sendAsBusiness ? 'text-white' : 'text-slate-400'} ${sendAsBusiness ? 'rotate-180' : ''}`} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ) : userBusiness ? (
                                <div className="flex items-center gap-2 mb-3 px-3 bg-amber-500/5 border border-amber-500/20 rounded-xl p-2">
                                    <Zap className="w-3 h-3 text-amber-500" />
                                    <span className="text-[9px] text-amber-400 font-medium">Plan Básico: Upgrade a Premium para escribir como {userBusiness.name}</span>
                                </div>
                            ) : null}

                            <div className="flex flex-col gap-3">
                                {selectedGlobalImage && (
                                    <div className="relative inline-self">
                                        <img src={selectedGlobalImage} alt="Preview" className="w-16 h-16 rounded-xl object-cover border border-amber-500/30" />
                                        <button 
                                            onClick={() => setSelectedGlobalImage(null)}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                                        >
                                            <XIcon className="w-2 h-2 text-white" />
                                        </button>
                                    </div>
                                )}
                                <div className="flex gap-2">
                                    <div className="relative">
                                        <button 
                                            onClick={() => { setShowGlobalEmojiPicker(!showGlobalEmojiPicker); setShowGlobalImageOptions(false); }}
                                            className="p-3 text-slate-500 hover:text-orange-500 transition-colors"
                                        >
                                            <Smile className="w-5 h-5" />
                                        </button>
                                        {showGlobalEmojiPicker && (
                                            <div className="absolute bottom-full left-0 mb-2 p-3 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-64">
                                                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                                                    {GLOBAL_EMOJIS.map((emoji, idx) => (
                                                        <button
                                                            key={idx}
                                                            onClick={() => {
                                                                const input = document.querySelector('.global-chat-input') as HTMLInputElement;
                                                                if (input) {
                                                                    input.value += emoji;
                                                                }
                                                                setShowGlobalEmojiPicker(false);
                                                            }}
                                                            className="text-xl hover:scale-125 transition-transform p-1"
                                                        >
                                                            {emoji}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder="Di algo al mundo..."
                                        className="global-chat-input flex-1 bg-white/5 border border-white/5 rounded-2xl px-5 py-3 text-sm font-black text-white placeholder:text-slate-700 focus:outline-none focus:border-orange-500/50 transition-all shrink-0"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const text = e.currentTarget.value.trim();
                                                if (text || selectedGlobalImage) {
                                                    sendGlobalMessage(text || (selectedGlobalImage ? '📷 Foto' : ''), sendAsBusiness);
                                                    e.currentTarget.value = '';
                                                    setSelectedGlobalImage(null);
                                                }
                                            }
                                        }}
                                    />
                                    <div className="relative">
                                        {canUsePremiumFeatures && (
                                            <button 
                                                onClick={() => { setShowGlobalImageOptions(!showGlobalImageOptions); setShowGlobalEmojiPicker(false); }}
                                                className="p-3 text-slate-500 hover:text-slate-300 transition-colors"
                                            >
                                                <Camera className="w-5 h-5" />
                                            </button>
                                        )}
                                        {showGlobalImageOptions && (
                                            <div className="absolute bottom-full right-0 mb-2 p-3 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex gap-2">
                                                <button 
                                                    onClick={() => globalCameraInputRef.current?.click()}
                                                    className="p-3 bg-orange-500/20 rounded-xl hover:bg-orange-500/30 transition-colors"
                                                >
                                                    <Camera className="w-5 h-5 text-orange-400" />
                                                </button>
                                                <button 
                                                    onClick={() => globalImageInputRef.current?.click()}
                                                    className="p-3 bg-amber-500/20 rounded-xl hover:bg-amber-500/30 transition-colors"
                                                >
                                                    <Upload className="w-5 h-5 text-amber-400" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                    <input 
                                        type="file" 
                                        ref={globalImageInputRef} 
                                        accept="image/*" 
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800 });
                                                setSelectedGlobalImage(compressed);
                                                setShowGlobalImageOptions(false);
                                            }
                                        }}
                                    />
                                    <input 
                                        type="file" 
                                        ref={globalCameraInputRef} 
                                        accept="image/*" 
                                        capture="environment"
                                        className="hidden" 
                                        onChange={async (e) => {
                                            const file = e.target.files?.[0];
                                            if (file) {
                                                const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800 });
                                                setSelectedGlobalImage(compressed);
                                                setShowGlobalImageOptions(false);
                                            }
                                        }}
                                    />
                                    <button 
                                        onClick={() => {
                                            const input = document.querySelector('.global-chat-input') as HTMLInputElement;
                                            if (input && (input.value.trim() || selectedGlobalImage)) {
                                                sendGlobalMessage(input.value.trim() || (selectedGlobalImage ? '📷 Foto' : ''), sendAsBusiness);
                                                input.value = '';
                                                setSelectedGlobalImage(null);
                                            }
                                        }}
                                        className="w-11 h-11 flex items-center justify-center bg-orange-600 rounded-2xl text-white active:scale-95 transition-all shadow-lg shadow-orange-600/20 shrink-0"
                                    >
                                        <Edit3 className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full overflow-y-auto no-scrollbar space-y-4 pb-4">
                        {filteredRooms.length > 0 ? (
                            filteredRooms.map((item) => {
                                const participantId = item.participants.find((p: string) => p !== user?.id && p !== user?.businessId);
                                let displayName = item.name;
                                let displayAvatar = item.avatar;
                                let isBusinessChat = false;
                                
                                if (participantId) {
                                    const businessParticipant = businesses.find(b => b.id === participantId);
                                    if (businessParticipant) {
                                        displayName = businessParticipant.name;
                                        displayAvatar = businessParticipant.imageUrl;
                                        isBusinessChat = true;
                                    } else {
                                        const userParticipant = allUsers.find(u => u.id === participantId);
                                        if (userParticipant) {
                                            displayName = `${userParticipant.name} ${userParticipant.surname}`.trim();
                                            displayAvatar = userParticipant.avatarUrl;
                                        }
                                    }
                                }
                                
                                return (
                                <div
                                    key={item.id}
                                    onClick={() => setSelectedRoom(item)}
                                    className="bg-[#111111]/80 border border-white/5 rounded-[2.2rem] p-4 flex items-center gap-4 hover:bg-white/[0.05] active:scale-[0.98] transition-all cursor-pointer group hover:border-orange-500/30"
                                >
                                    <div className="relative shrink-0">
                                        <div className={`w-16 h-16 overflow-hidden border-2 ${isBusinessChat ? 'border-amber-500/30' : 'border-white/10'} p-0.5 ${item.type === 'direct' ? 'rounded-full' : 'rounded-[1.6rem]'}`}>
                                            <img src={displayAvatar} alt={displayName} className={`w-full h-full object-cover ${item.type === 'direct' ? 'rounded-full' : 'rounded-[1.3rem]'}`} />
                                        </div>
                                        {item.status && item.status !== 'none' && (
                                            <div className={`absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full border-4 border-[#020617] ${item.status === 'orange' ? 'bg-orange-500 shadow-[0_0_12px_#f97316]' : isBusinessChat ? 'bg-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]' : 'bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.5)]'}`} />
                                        )}
                                    </div>

                                    <div className="flex-1 min-w-0 py-1">
                                        <div className="flex items-center justify-between mb-1.5">
                                            <h3 className={`font-black text-base truncate tracking-tight group-hover:text-orange-400 transition-colors uppercase ${isBusinessChat ? 'text-amber-400' : 'text-white'}`}>{displayName}</h3>
                                            <span className="text-[10px] font-bold text-slate-500 tracking-tighter bg-white/5 py-1 px-2.5 rounded-lg border border-white/5">{item.lastMessageTime?.toString()}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-3">
                                            <p className="text-xs text-slate-400 truncate font-semibold leading-relaxed group-hover:text-slate-300 transition-colors">{item.lastMessage}</p>
                                            {item.unreadCount && item.unreadCount > 0 ? (
                                                <div className="min-w-[1.25rem] h-5 bg-orange-600 rounded-lg flex items-center justify-center text-[10px] font-black px-1.5 shadow-lg shadow-orange-600/30 text-white">
                                                    {item.unreadCount}
                                                </div>
                                            ) : (
                                                <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all">
                                                    <ChevronRight className="w-4 h-4 text-orange-500" />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                );
                            })
                        ) : (
                            <div className="py-20 flex flex-col items-center gap-4 text-center opacity-40">
                                <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-dashed border-white/10">
                                    <Hash className="w-10 h-10 text-slate-500" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-black uppercase tracking-widest text-slate-300">Sin chats aún</p>
                                    <p className="text-xs font-medium text-slate-500">Inicia una conversación o únete a un grupo</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Compose Button */}
            <button
                onClick={() => setIsComposeOpen(true)}
                className="fixed bottom-24 right-6 w-16 h-16 bg-gradient-to-tr from-orange-600 to-amber-600 rounded-[2rem] shadow-2xl shadow-orange-600/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border border-white/20"
            >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity rounded-[2rem]" />
                <Edit3 className="w-8 h-8 text-white relative z-10" strokeWidth={2.5} />
            </button>

            {/* Compose Modal */}
            {isComposeOpen && (
                <div className="fixed inset-0 z-[100] flex flex-col bg-[#020617] animate-in slide-in-from-bottom duration-500">
                    <div className="pt-14 px-6 pb-6 border-b border-white/5 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button onClick={() => setIsComposeOpen(false)} className="p-2 -ml-2 text-slate-400 hover:text-white transition-all transform active:scale-90">
                                <X className="w-8 h-8" />
                            </button>
                            <h2 className="text-2xl font-black text-white tracking-tight uppercase">Nuevo Chat</h2>
                        </div>
                        <button className="flex items-center gap-2 px-4 py-2 bg-slate-900 rounded-2xl border border-white/5 text-orange-500">
                            <UserPlus className="w-5 h-5" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Grupo</span>
                        </button>
                    </div>

                    <div className="p-6">
                        {canSendAsBusiness && (
                            <div className="flex items-center justify-between mb-4 px-2">
                                <span className="text-[10px] text-slate-500 font-medium">Escribir como:</span>
                                <button
                                    onClick={() => setSendAsBusiness(!sendAsBusiness)}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${sendAsBusiness ? 'bg-amber-500/20 border border-amber-500/40' : 'bg-slate-800 border border-white/10'}`}
                                >
                                    {sendAsBusiness ? (
                                        <>
                                            <Building2 className="w-3.5 h-3.5 text-amber-400" />
                                            <span className="text-[10px] font-black text-amber-400 uppercase">{userBusiness.name}</span>
                                        </>
                                    ) : (
                                        <>
                                            <User className="w-3.5 h-3.5 text-slate-400" />
                                            <span className="text-[10px] font-black text-slate-400 uppercase">{user?.name?.split(' ')[0]}</span>
                                        </>
                                    )}
                                    <ChevronDown className={`w-3 h-3 transition-transform ${sendAsBusiness ? 'text-amber-400' : 'text-slate-400'}`} />
                                </button>
                            </div>
                        )}
                        {!canSendAsBusiness && userBusiness && (
                            <div className="flex items-center gap-2 mb-4 px-2">
                                <Zap className="w-3 h-3 text-slate-600" />
                                <span className="text-[9px] text-slate-600 font-medium">Upgrade a Premium para escribir como {userBusiness.name}</span>
                            </div>
                        )}
                        <div className="relative group mb-6">
                            <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                <Search className="w-5 h-5 text-slate-600" />
                            </div>
                            <input
                                type="text"
                                value={userSearchText}
                                onChange={(e) => setUserSearchText(e.target.value)}
                                placeholder="Buscar personas o negocios..."
                                className="w-full bg-white/5 border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm font-bold text-white placeholder:text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all shadow-xl"
                            />
                        </div>

                        {/* Businesses Section */}
                        {filteredBusinesses.length > 0 && (
                            <div className="space-y-4 mb-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-500 px-2 flex items-center gap-2">
                                    <Building2 className="w-3 h-3" /> Negocios
                                </p>
                                <div className="space-y-2">
                                    {filteredBusinesses.slice(0, 8).map((biz) => {
                                        const isPremium = biz.plan === SubscriptionPlan.PREMIUM;
                                        return (
                                        <div
                                            key={biz.id}
                                            className={`flex items-center gap-4 p-3 rounded-2xl transition-all group ${isPremium ? 'bg-amber-500/5 border border-amber-500/20 hover:bg-amber-500/10' : 'bg-white/[0.02] border border-white/5 hover:bg-white/[0.05]'}`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl border-2 p-0.5 relative ${isPremium ? 'border-amber-500/30' : 'border-white/10'}`}>
                                                <img src={biz.imageUrl || 'https://i.pravatar.cc/100'} className="w-full h-full rounded-xl object-cover" alt="" />
                                                {isPremium && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full border border-[#020617] flex items-center justify-center">
                                                        <span className="text-[8px]">★</span>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className={`font-black uppercase tracking-tight text-sm ${isPremium ? 'text-amber-400 group-hover:text-amber-300' : 'text-white group-hover:text-orange-400'}`}>{biz.name}</h4>
                                                <div className="flex items-center gap-1.5 mt-0.5">
                                                    {biz.locality && (
                                                        <>
                                                            <MapPin className="w-3 h-3 text-slate-500" />
                                                            <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{biz.locality}</span>
                                                        </>
                                                    )}
                                                    {!isPremium && (
                                                        <span className="text-[8px] text-slate-600 ml-1">• Básico</span>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {biz.whatsapp && (
                                                    <a
                                                        href={`https://wa.me/${biz.whatsapp.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-8 h-8 rounded-xl bg-emerald-500/20 flex items-center justify-center hover:bg-emerald-500/30 transition-colors"
                                                    >
                                                        <svg className="w-4 h-4 text-emerald-400" viewBox="0 0 24 24" fill="currentColor">
                                                            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                                                        </svg>
                                                    </a>
                                                )}
                                                <button
                                                    onClick={() => handleStartBusinessDM(biz)}
                                                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-colors ${isPremium ? 'bg-amber-500/20 hover:bg-amber-500/30' : canSendAsBusiness ? 'bg-orange-500/20 hover:bg-orange-500/30' : 'bg-slate-800 opacity-50'}`}
                                                >
                                                    <MessageCircle className={`w-4 h-4 ${isPremium ? 'text-amber-400' : canSendAsBusiness ? 'text-orange-400' : 'text-slate-600'}`} />
                                                </button>
                                            </div>
                                        </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Groups Section */}
                        {filteredGroups.length > 0 && (
                            <div className="space-y-4 mb-8">
                                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500 px-2 flex items-center gap-2">
                                    <Users className="w-3 h-3" /> Grupos de la Comunidad
                                </p>
                                <div className="space-y-2">
                                    {filteredGroups.map((group) => (
                                        <div
                                            key={group.id}
                                            onClick={() => {
                                                setSelectedRoom(group);
                                                setIsComposeOpen(false);
                                            }}
                                            className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer group"
                                        >
                                            <div className="w-12 h-12 rounded-2xl border-2 border-white/10 p-0.5 relative">
                                                <img src={group.avatar} className="w-full h-full rounded-xl object-cover" alt="" />
                                                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-orange-500 rounded-full border border-[#020617] flex items-center justify-center">
                                                    <Users className="w-2 h-2 text-white" />
                                                </div>
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-black text-white group-hover:text-orange-400 transition-colors uppercase tracking-tight text-sm">{group.name}</h4>
                                                <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{group.lastMessage || 'Únete a la conversación'}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-orange-500 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        
                        {/* People Section */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 px-2 flex items-center gap-2">
                                <Users className="w-3 h-3 text-orange-500" /> Personas
                            </p>
                            <div className="space-y-2">
                                {filteredUsers.map((u) => (
                                    <div
                                        key={u.id}
                                        onClick={() => handleStartDM(u)}
                                        className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer active:scale-[0.98] group"
                                    >
                                        <div className="w-12 h-12 rounded-full border-2 border-white/10 p-0.5 relative">
                                            <img src={u.avatarUrl || 'https://i.pravatar.cc/100'} className="w-full h-full rounded-full object-cover" alt="" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h4 className="font-black text-white group-hover:text-orange-400 transition-colors uppercase tracking-tight text-sm">{u.name} {u.surname}</h4>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{u.preferredVibe || 'Explorador'}</span>
                                            </div>
                                        </div>
                                        <div className="w-8 h-8 rounded-xl bg-white/5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            <MessageCircle className="w-4 h-4 text-orange-500" />
                                        </div>
                                    </div>
                                ))}

                                {filteredUsers.length === 0 && (
                                    <div className="py-10 text-center opacity-40">
                                        <p className="text-sm font-black text-slate-500 uppercase">No se encontraron resultados</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
