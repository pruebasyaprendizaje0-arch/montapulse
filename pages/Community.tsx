import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, Radar, MoreVertical, Sparkles, Edit3, MessageCircle, MessageSquare, Users, Hash, ChevronRight, X, UserPlus, Heart, Zap, Building2, MapPin, User, ChevronDown, Smile, Camera, Upload, X as XIcon, Star, Lock, Plus, CheckCircle, Trash2, Bell, Clock, Info, Download, Globe, Gift, AlertTriangle, Calendar, History, Layout, Share2, Phone, Instagram, Store } from 'lucide-react';
import { useAuthContext } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../context/ToastContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ChatRoom as ChatRoomType, UserProfile, SubscriptionPlan, Business, Announcement } from '../types';
import { ChatRoom } from '../components/Chat/ChatRoom';
import { MassBroadcastHistory } from '../components/Community/MassBroadcastHistory';
import { subscribeToChatRooms, subscribeToUsers, createChatRoom, sendMessage, sendRoomMessage, deleteGlobalMessage, createAnnouncement, subscribeToAnnouncements, deleteAnnouncement, subscribeToActiveBoosts, purchaseBoost } from '../services/firestoreService';
import { useData } from '../context/DataContext';
import { CommunityBottomNav } from '../components/Community/CommunityBottomNav';
import { compressImage } from '../utils/imageUtils';
import { LOCALITIES, MASS_MESSAGE_CREDITS } from '../constants';

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
    const { user, isAdmin, isSuperAdmin } = useAuthContext();
    const { showToast, showConfirm } = useToast();
    const navigate = useNavigate();
    const { 
        messages, 
        handleSendMessage: sendGlobalMessage, 
        businesses, 
        followedBusinessIds, 
        businessFollowers, 
        customLocalities = [], 
        notifications, 
        sendPushNotification, 
        markAsRead, 
        setShowBusinessReg, 
        setEditingBusinessId, 
        setShowBusinessEdit,
        communityTab,
        setCommunityTab
    } = useData();
    const [activeTab, setActiveTab] = useState<'groups' | 'direct' | 'global' | 'notifications' | 'history'>('global');
    const [selectedRoom, setSelectedRoom] = useState<ChatRoomType | null>(null);
    const [selectedBusinessForProfile, setSelectedBusinessForProfile] = useState<Business | null>(null);
    const [rooms, setRooms] = useState<ChatRoomType[]>([]);
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedLocality, setSelectedLocality] = useState<string | null>(null);
    const [showLocalityDropdown, setShowLocalityDropdown] = useState(false);
    const [isComposeOpen, setIsComposeOpen] = useState(false);
    const [sendAsBusiness, setSendAsBusiness] = useState(false);
    const { t } = useTranslation();
    const [showGlobalEmojiPicker, setShowGlobalEmojiPicker] = useState(false);
    const [showGlobalImageOptions, setShowGlobalImageOptions] = useState(false);
    const [selectedGlobalImage, setSelectedGlobalImage] = useState<string | null>(null);
    const globalImageInputRef = React.useRef<HTMLInputElement>(null);
    const globalCameraInputRef = React.useRef<HTMLInputElement>(null);
    const globalChatInputRef = React.useRef<HTMLInputElement>(null);
    const [showMassMessage, setShowMassMessage] = useState(false);
    const [massMessageText, setMassMessageText] = useState('');
    const [massMessageTarget, setMassMessageTarget] = useState<'followers' | 'all' | 'chat' | 'push'>('followers');
    const [massMessageLocalitySelection, setMassMessageLocalitySelection] = useState<'all' | 'specific'>('all');
    const [massMessageSelectedLocality, setMassMessageSelectedLocality] = useState<string | null>(null);
    const [isSendingMass, setIsSendingMass] = useState(false);
    const [distanceFilter, setDistanceFilter] = useState<'all' | '1km' | '5km'>('all');
    const [showMassEmojiPicker, setShowMassEmojiPicker] = useState(false);
    const [showMassImageOptions, setShowMassImageOptions] = useState(false);
    const [selectedMassImage, setSelectedMassImage] = useState<string | null>(null);
    const [massSendAsBusiness, setMassSendAsBusiness] = useState(false);
    const [massMessageType, setMassMessageType] = useState<'system' | 'offer' | 'alert' | 'info'>('info');
    const [notifFilter, setNotifFilter] = useState<'all' | 'system' | 'offer' | 'alert' | 'community'>('all');
    const [showRecipientsList, setShowRecipientsList] = useState(false);
    const massImageInputRef = React.useRef<HTMLInputElement>(null);
    const massCameraInputRef = React.useRef<HTMLInputElement>(null);
    const [isSchedulingMassMessage, setIsSchedulingMassMessage] = useState(false);
    const [massMessageScheduledDate, setMassMessageScheduledDate] = useState<string>('');
    // Group creation state (Premium businesses only)
    const [showCreateGroup, setShowCreateGroup] = useState(false);
    const [newGroupName, setNewGroupName] = useState('');
    const [isCreatingGroup, setIsCreatingGroup] = useState(false);
    const [deletingGlobalMsgId, setDeletingGlobalMsgId] = useState<string | null>(null);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [activeBoost, setActiveBoost] = useState<any>(null);
    const [showBoostModal, setShowBoostModal] = useState(false);
    const [showBoostSuccess, setShowBoostSuccess] = useState(false);
    const [boostTimeLeft, setBoostTimeLeft] = useState<string>('');
    const [isPurchasingBoost, setIsPurchasingBoost] = useState(false);
    const [showCreditsModal, setShowCreditsModal] = useState(false);
    const [groupFilter, setGroupFilter] = useState<'suggestions' | 'my-city' | 'near-me'>('suggestions');
    const [userSearchQuery, setUserSearchQuery] = useState('');
    
    // New navigation and section states
    // Navigation state handled by communityTab from useData context
    const location = useLocation();

    useEffect(() => {
        const state = location.state as any;
        if (state?.subTab) {
            // Map incoming subTab from location state to communityTab
            const tabMap: Record<string, any> = {
                'noticias': 'updates',
                'grupos': 'groups',
                'directos': 'chats',
                'notis': 'notifications'
            };
            if (tabMap[state.subTab]) {
                setCommunityTab(tabMap[state.subTab]);
            }
        }
    }, [location.state, setCommunityTab]);

    const userBusiness = user?.businessId ? businesses.find(b => b.id === user.businessId) : null;
    const userRole = user?.role || 'visitor';
    const userPlan = user?.plan || SubscriptionPlan.FREE;

    // Permissions - simple check for any paid plan
    const isPremiumUser = (user?.plan === SubscriptionPlan.PREMIUM || user?.plan === SubscriptionPlan.EXPERT || userBusiness?.plan === SubscriptionPlan.PREMIUM || userBusiness?.plan === SubscriptionPlan.EXPERT || isAdmin);
    const isExpert = user?.plan === SubscriptionPlan.EXPERT || userBusiness?.plan === SubscriptionPlan.EXPERT || isAdmin;
    const canSendImages = isExpert || isAdmin;

    // All business owners get premium messaging features
    const canSendMass = isPremiumUser || !!userBusiness;
    const canCreateGroups = isPremiumUser || !!userBusiness;
    const canSendAsBusiness = !!userBusiness;
    const canStartDMs = isPremiumUser || !!userBusiness;
    const canUsePremiumFeatures = isPremiumUser || !!userBusiness;

    // Credits: use business plan if available, else user plan.
    // If business is on FREE plan, default to BASIC credits (2 per month).
    const currentPlan = userBusiness?.plan || user?.plan || SubscriptionPlan.FREE;
    let businessCredits = MASS_MESSAGE_CREDITS[currentPlan] || 0;
    if (userBusiness && currentPlan === SubscriptionPlan.FREE) {
        businessCredits = MASS_MESSAGE_CREDITS[SubscriptionPlan.BASIC] || 2;
    }

    const usedThisMonthCount = useMemo(() => {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return announcements.filter(a => {
            const date = a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp);
            return date >= startOfMonth;
        }).length;
    }, [announcements]);

    const remainingCredits = useMemo(() => {
        if (isExpert || isAdmin) return Infinity;
        return Math.max(0, businessCredits - usedThisMonthCount);
    }, [businessCredits, usedThisMonthCount, isExpert, isAdmin]);

    // Boost Subscription
    useEffect(() => {
        if (!userBusiness?.id) return;
        const unsubscribe = subscribeToActiveBoosts(userBusiness.id, (boosts) => {
            setActiveBoost(boosts[0] || null);
        });
        return () => unsubscribe();
    }, [userBusiness?.id]);

    // Boost Countdown
    useEffect(() => {
        if (!activeBoost) return;
        const timer = setInterval(() => {
            const now = new Date().getTime();
            // Handle both Date objects and Firestore Timestamps
            const expiry = activeBoost.expiresAt instanceof Date ? activeBoost.expiresAt : activeBoost.expiresAt.toDate();
            const distance = expiry.getTime() - now;

            if (distance < 0) {
                setBoostTimeLeft('Expirado');
                clearInterval(timer);
                return;
            }
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            setBoostTimeLeft(`${hours}h ${minutes}m ${seconds}s`);
        }, 1000);
        return () => clearInterval(timer);
    }, [activeBoost]);

    const handlePurchaseBoost = async () => {
        if (!user || !userBusiness) return;
        if ((user.points || 0) < 300) {
            showToast('No tienes suficientes puntos (Necesitas 300)', 'error');
            return;
        }

        setIsPurchasingBoost(true);
        try {
            await purchaseBoost(userBusiness.id, user.id, 300, 24);
            setShowBoostModal(false);
            setShowBoostSuccess(true);
            showToast('¡Boost activado con éxito!', 'success');
        } catch (error) {
            console.error('Error purchasing boost:', error);
            showToast('Error al activar Boost', 'error');
        } finally {
            setIsPurchasingBoost(false);
        }
    };

    const GLOBAL_EMOJIS = ['😀', '😎', '🔥', '❤️', '🎉', '👍', '🙏', '💪', '🌟', '😂', '🥳', '😊', '🤔', '👀', '🚀', '💯', '✨', '🎸', '🎵', '🛠️'];

    const globalSearchResults = useMemo(() => {
        const sq = searchQuery || '';
        if (!sq.trim()) return null;
        const query = sq.toLowerCase();

        const groupsResults = (mockRooms || []).filter(r =>
            r?.type === 'group' && ((r?.name || '').toLowerCase().includes(query) || (r?.lastMessage || '').toLowerCase().includes(query))
        ).map(g => ({ type: 'group' as const, data: g }));

        const usersResults = (allUsers || []).filter(u =>
            u.id !== user?.id && ((u?.name || '') + ' ' + (u?.surname || '')).toLowerCase().includes(query)
        ).map(u => ({ type: 'user' as const, data: u }));

        const businessesResults = (businesses || []).filter(b =>
            b.id !== user?.businessId &&
            (!selectedLocality || b?.locality === selectedLocality) &&
            ((b?.name || '').toLowerCase().includes(query) ||
                (b?.locality || '').toLowerCase().includes(query) ||
                (b?.sector || '').toLowerCase().includes(query))
        ).map(b => ({ type: 'business' as const, data: b }));

        const localities = [...LOCALITIES, ...customLocalities];
        const locationsResults = localities.filter(l =>
            (l.name || '').toLowerCase().includes(query)
        ).map(l => ({ type: 'location' as const, data: l }));

        return {
            groups: groupsResults.slice(0, 5),
            users: usersResults.slice(0, 5),
            businesses: businessesResults.slice(0, 5),
            locations: locationsResults.slice(0, 5)
        };
    }, [searchQuery, businesses, allUsers, selectedLocality]);

    useEffect(() => {
        if (!user) return;
        const senderId = user.businessId || user.id;
        const unsubscribe = subscribeToAnnouncements(senderId, (data) => {
            setAnnouncements(data);
        });
        return () => unsubscribe();
    }, [user]);

    const filteredBusinesses = useMemo(() => {
        const sq = searchQuery || '';
        const query = sq.toLowerCase();
        // Exclude reference points â€” they are not chat recipients
        let results = (businesses || []).filter(b => b.id !== user?.businessId && !b.isReference);

        if (selectedLocality) {
            results = results.filter(b => b?.locality === selectedLocality);
        }

        if (!sq.trim()) {
            return results.slice(0, 8);
        }
        return results.filter(b =>
            (b?.name || '').toLowerCase().includes(query) ||
            (b?.locality || '').toLowerCase().includes(query) ||
            (b?.sector || '').toLowerCase().includes(query) ||
            (b?.description || '').toLowerCase().includes(query)
        );
    }, [businesses, searchQuery, selectedLocality, user]);

    const filteredGroups = useMemo(() => {
        const sq = searchQuery || '';
        const query = sq.toLowerCase();
        let results = (rooms.length > 0 ? rooms : mockRooms).filter(r => r?.type === 'group');

        if (groupFilter === 'my-city' && user?.locality) {
            results = results.filter(r => r.locality === user.locality);
        } else if (groupFilter === 'near-me') {
            // For now, near-me also uses locality as a proxy, or could be expanded with coordinates
            results = results.filter(r => r.locality === user?.locality);
        }

        if (!sq.trim()) {
            return groupFilter === 'suggestions' ? results.slice(0, 3) : results;
        }

        return results.filter(r =>
            (r?.name || '').toLowerCase().includes(query) ||
            (r?.lastMessage || '').toLowerCase().includes(query)
        );
    }, [searchQuery, rooms, groupFilter, user?.locality]);

    const estimatedAudience = useMemo(() => {
        let count = 0;
        if (massMessageTarget === 'followers') {
            count = businessFollowers?.length || 0;
        } else if (massMessageTarget === 'all') {
            count = allUsers?.length || 0;
        } else if (massMessageTarget === 'chat') {
            const userIds = user?.businessId ? [user.id, user.businessId] : [user?.id];
            const chatRecipients = new Set();
            rooms.filter(r => r.type === 'direct').forEach(r => {
                r.participants?.forEach(p => {
                    if (userIds && !userIds.includes(p)) chatRecipients.add(p);
                });
            });
            count = chatRecipients.size;
        }

        if (massMessageLocalitySelection === 'specific' && massMessageSelectedLocality) {
            if (massMessageTarget === 'all') {
                count = allUsers.filter(u => u.locality === massMessageSelectedLocality).length;
            } else if (massMessageTarget === 'followers') {
                count = Math.round(count * 0.4);
            }
        }
        return count;
    }, [massMessageTarget, massMessageLocalitySelection, massMessageSelectedLocality, businessFollowers, allUsers, user]);

    const recipientList = useMemo(() => {
        let recipients: { id: string; name: string; type: 'user' | 'business'; avatar?: string }[] = [];

        if (massMessageTarget === 'followers') {
            const followerIds = businessFollowers || [];
            followerIds.forEach(fid => {
                const biz = businesses.find(b => b.id === fid);
                const usr = allUsers.find(u => u.id === fid);
                if (biz) {
                    recipients.push({ id: biz.id, name: biz.name, type: 'business', avatar: biz.imageUrl });
                } else if (usr) {
                    recipients.push({ id: usr.id, name: `${usr.name} ${usr.surname || ''}`, type: 'user', avatar: usr.avatarUrl });
                }
            });
        } else if (massMessageTarget === 'all') {
            const filtered = allUsers.filter(u => u.id !== user?.id);
            if (massMessageLocalitySelection === 'specific' && massMessageSelectedLocality) {
                const locFiltered = filtered.filter(u => u.locality === massMessageSelectedLocality);
                locFiltered.forEach(u => {
                    recipients.push({ id: u.id, name: `${u.name} ${u.surname || ''}`, type: 'user', avatar: u.avatarUrl });
                });
            } else {
                filtered.forEach(u => {
                    recipients.push({ id: u.id, name: `${u.name} ${u.surname || ''}`, type: 'user', avatar: u.avatarUrl });
                });
            }
        } else if (massMessageTarget === 'chat') {
            const userIds = user?.businessId ? [user.id, user.businessId] : [user?.id];
            const chatRecipientIds = new Set<string>();
            rooms.filter(r => r.type === 'direct').forEach(r => {
                r.participants?.forEach(p => {
                    if (userIds && !userIds.includes(p)) chatRecipientIds.add(p);
                });
            });

            chatRecipientIds.forEach(rid => {
                const biz = businesses.find(b => b.id === rid);
                const usr = allUsers.find(u => u.id === rid);
                if (biz) {
                    recipients.push({ id: biz.id, name: biz.name, type: 'business', avatar: biz.imageUrl });
                } else if (usr) {
                    recipients.push({ id: usr.id, name: `${usr.name} ${usr.surname || ''}`, type: 'user', avatar: usr.avatarUrl });
                }
            });
        }
        return recipients.slice(0, 50);
    }, [massMessageTarget, massMessageLocalitySelection, massMessageSelectedLocality, businessFollowers, allUsers, businesses, user, rooms]);



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

        let unsubscribeBizRooms = () => { };
        if (user.businessId) {
            unsubscribeBizRooms = subscribeToChatRooms(user.businessId, (rooms) => {
                bizRooms = rooms;
                updateMergedRooms();
            });
        }

        const unsubscribeUsers = subscribeToUsers((users) => {
            setAllUsers(users.filter(u => u.id !== user.id));
        });

        let unsubscribeAnnouncements = () => { };
        const senderIdForAnn = user.businessId || user.id;
        unsubscribeAnnouncements = subscribeToAnnouncements(senderIdForAnn, (anns) => {
            setAnnouncements(anns);
        });

        return () => {
            unsubscribeUserRooms();
            unsubscribeBizRooms();
            unsubscribeUsers();
            unsubscribeAnnouncements();
        };
    }, [user]);

    const filteredRooms = useMemo(() => {
        const sq = searchQuery || '';
        const query = sq.toLowerCase();
        let filtered = (rooms || []);

        if (communityTab === 'communities') {
            filtered = filtered.filter(room => room?.type === 'group');
        } else if (communityTab === 'chats') {
            filtered = filtered.filter(room => room?.type === 'direct');
            if (user) {
                const userIds = user.businessId ? [user.id, user.businessId] : [user.id];
                filtered = filtered.filter(room =>
                    room.participants && room.participants.some((p: string) => userIds.includes(p))
                );
            }
        }

        // Filter by location if selected
        if (selectedLocality) {
            filtered = filtered.filter(room => {
                if (room.type === 'direct' && user) {
                    const otherId = room.participants.find(p => p !== user.id && p !== user.businessId);
                    if (otherId) {
                        const biz = businesses.find(b => b.id === otherId);
                        if (biz && biz.locality === selectedLocality) return true;
                        const otherUser = allUsers.find(u => u.id === otherId);
                        if (otherUser && otherUser.locality === selectedLocality) return true;
                        return false;
                    }
                }
                return true; 
            });
        }

        return filtered.filter(room =>
            (room?.name || '').toLowerCase().includes(query) ||
            (room?.lastMessage || '').toLowerCase().includes(query)
        );
    }, [rooms, communityTab, searchQuery, user, selectedLocality, businesses, allUsers]);

    const filteredUsers = useMemo(() => {
        const sq = (userSearchQuery || searchQuery || '').trim();
        const query = sq.toLowerCase();
        let results = (allUsers || []).filter(u => u.id !== user?.id);
        
        if (selectedLocality) {
            results = results.filter(u => u.locality === selectedLocality);
        }

        if (!sq) return results.slice(0, 8);
        
        return results.filter(u => {
            const fullName = `${u.name} ${u.surname || ''}`.toLowerCase();
            return fullName.includes(query) || u.email.toLowerCase().includes(query);
        });
    }, [allUsers, searchQuery, userSearchQuery, user, selectedLocality]);

    const unreadGroupsCount = useMemo(() => 
        rooms.filter(r => r.type === 'group').reduce((acc, r) => acc + (r.unreadCount || 0), 0)
    , [rooms]);

    const unreadDirectsCount = useMemo(() => 
        rooms.filter(r => r.type === 'direct').reduce((acc, r) => acc + (r.unreadCount || 0), 0)
    , [rooms]);

    const unreadNotifsCount = useMemo(() => 
        notifications?.filter(n => !n.read).length || 0
    , [notifications]);


    const handleStartDM = async (targetUser: UserProfile) => {
        if (!user) return;

        const existingRoom = rooms.find(r =>
            r.type === 'direct' &&
            r.participants.includes(targetUser.id) &&
            r.participants.includes(user.id)
        );

        if (existingRoom) {
            // Verify current user is a participant before opening
            const myIds = user.businessId ? [user.id, user.businessId] : [user.id];
            const isParticipant = existingRoom.participants.some(p => myIds.includes(p));
            if (!isParticipant) return;
            setSelectedRoom(existingRoom);
            setIsComposeOpen(false);
            return;
        }

        const newRoom: Omit<ChatRoomType, 'id'> = {
            name: targetUser.name + ' ' + (targetUser.surname || ''),
            type: 'direct',
            participants: [user.id, targetUser.id],
            avatar: targetUser.avatarUrl || 'https://i.pravatar.cc/100',
            lastMessage: 'Iniciaste una conversación',
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
        // Reference points are never a valid DM target
        if (business.isReference) return;

        const existingRoom = rooms.find(r =>
            r.type === 'direct' &&
            r.participants.includes(business.id) &&
            r.participants.includes(user.id)
        );

        if (existingRoom) {
            // Verify current user is a participant before opening
            const myIds = user.businessId ? [user.id, user.businessId] : [user.id];
            const isParticipant = existingRoom.participants.some(p => myIds.includes(p));
            if (!isParticipant) return;
            setSelectedRoom(existingRoom);
            setIsComposeOpen(false);
            return;
        }

        const newRoom: Omit<ChatRoomType, 'id'> = {
            name: business.name,
            type: 'direct',
            participants: [user.id, business.id],
            avatar: business.imageUrl || 'https://i.pravatar.cc/100',
            lastMessage: `Â¡Hola! Estoy interesado en tus servicios`,
            status: (business.plan === SubscriptionPlan.BASIC || business.plan === SubscriptionPlan.EXPERT) ? 'green' : 'none'
        };

        try {
            const roomId = await createChatRoom(newRoom);
            setSelectedRoom({ id: roomId, ...newRoom });
            setIsComposeOpen(false);
        } catch (error) {
            console.error('Error starting business DM:', error);
        }
    };

    const handleDeleteAnnouncement = async (id: string) => {
        const ann = announcements.find(a => a.id === id);
        if (!ann) return;

        const confirmed = await showConfirm(
            'Esto eliminará el registro de este envío. Los mensajes individuales enviados a los usuarios también se eliminarán de sus chats.',
            '¿Eliminar historial?'
        );

        if (confirmed) {
            try {
                await deleteAnnouncement(id, ann.roomMessages);
                showToast('Historial eliminado', 'success');
            } catch (error) {
                console.error('Error deleting announcement:', error);
                showToast('Error al eliminar historial', 'error');
            }
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
            showToast('Escribe un mensaje o selecciona una imagen', 'warning');
            return;
        }

        const effectivePlan = user?.plan || SubscriptionPlan.FREE;
        const isUserExpert = user?.plan === SubscriptionPlan.EXPERT;
        const canSendByPlan = isAdmin || (userPlan !== SubscriptionPlan.FREE);

        if (!canSendByPlan) {
            showToast(`No puedes enviar. Plan: ${effectivePlan}$, Admin: ${isAdmin}`, 'error');
            return;
        }

        if (remainingCredits <= 0 && !isAdmin) {
            showToast('Has agotado tus anuncios de este mes. Mejora tu plan para enviar más.', 'warning');
            return;
        }

        setIsSendingMass(true);

        try {
            let recipientIds: string[] = [];

            if (massMessageTarget === 'followers') {
                if (!businessFollowers || businessFollowers.length === 0) {
                    showToast('Tu negocio no tiene seguidores aún', 'warning');
                    setIsSendingMass(false);
                    return;
                }
                recipientIds = [...businessFollowers];
            } else if (massMessageTarget === 'all') {
                if (!allUsers || allUsers.length === 0) {
                    showToast('No hay usuarios disponibles', 'warning');
                    setIsSendingMass(false);
                    return;
                }
                recipientIds = allUsers.filter(u => u.id !== user?.id).map(u => u.id);
            } else if (massMessageTarget === 'chat') {
                const userIds = user?.businessId ? [user.id, user.businessId] : [user?.id];
                const chatRecipients = new Set<string>();
                rooms.filter(r => r.type === 'direct').forEach(r => {
                    r.participants?.forEach(p => {
                        if (userIds && !userIds.includes(p)) chatRecipients.add(p);
                    });
                });
                recipientIds = Array.from(chatRecipients);

                if (recipientIds.length === 0) {
                    showToast('No tienes chats directos aún', 'warning');
                    setIsSendingMass(false);
                    return;
                }
            }

            if (massMessageLocalitySelection === 'specific' && massMessageSelectedLocality) {
                recipientIds = recipientIds.filter(rid => {
                    const rUser = allUsers.find(u => u.id === rid);
                    if (rUser && rUser.locality === massMessageSelectedLocality) return true;
                    const rBiz = businesses.find(b => b.id === rid);
                    if (rBiz && rBiz.locality === massMessageSelectedLocality) return true;
                    return false;
                });
            }

            if (recipientIds.length === 0) {
                showToast('No hay destinatarios que cumplan con los criterios seleccionados', 'warning');
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
            const roomMessages: { roomId: string, messageId: string }[] = [];

            for (const recipientId of recipientIds) {
                try {
                    const currentSenderIds = user?.businessId ? [user.id, user.businessId] : [user.id];
                    let roomId = '';

                    const existingRoom = rooms.find(r =>
                        r.type === 'direct' &&
                        r.participants &&
                        r.participants.includes(recipientId) &&
                        r.participants.some(p => currentSenderIds.includes(p))
                    );

                    if (existingRoom) {
                        roomId = existingRoom.id;
                    } else {
                        const recipientUser = allUsers.find(u => u.id === recipientId);
                        const recipientBiz = businesses.find(b => b.id === recipientId);
                        const recipientName = recipientBiz ? recipientBiz.name : (recipientUser ? `${recipientUser.name} ${recipientUser.surname || ''}` : 'Usuario');
                        const recipientAvatar = recipientBiz ? recipientBiz.imageUrl : (recipientUser ? recipientUser.avatarUrl : '');

                        roomId = await createChatRoom({
                            name: recipientName,
                            type: 'direct',
                            participants: [senderId, recipientId],
                            avatar: recipientAvatar || 'https://i.pravatar.cc/100',
                            lastMessage: massMessageText.substring(0, 50),
                            status: 'green'
                        });
                    }

                    if (roomId) {
                        const chatMsgData: any = {
                            senderId,
                            senderName,
                            senderAvatar,
                            text: massMessageText,
                            isBusinessMessage: isBusinessMsg
                        };

                        if (selectedMassImage) {
                            chatMsgData.imageUrl = selectedMassImage;
                        }

                        if (isSchedulingMassMessage && massMessageScheduledDate) {
                            chatMsgData.scheduledAt = new Date(massMessageScheduledDate).toISOString();
                        }

                        const messageId = await sendRoomMessage(roomId, chatMsgData);
                        roomMessages.push({ roomId, messageId });
                        successCount++;
                    }
                } catch (err) {
                    console.error(`Error sending message to ${recipientId}:`, err);
                }
            }

            if (successCount > 0) {
                await createAnnouncement({
                    senderId,
                    senderName,
                    senderAvatar,
                    text: massMessageText,
                    imageUrl: selectedMassImage || undefined,
                    type: massMessageType,
                    target: massMessageTarget,
                    locality: massMessageLocalitySelection === 'specific' ? massMessageSelectedLocality || undefined : undefined,
                    recipientCount: successCount,
                    scheduledAt: isSchedulingMassMessage && massMessageScheduledDate ? new Date(massMessageScheduledDate) : undefined,
                    roomMessages
                });

                const isScheduled = isSchedulingMassMessage && massMessageScheduledDate;
                showToast(isScheduled
                    ? `Programado correctamente para ${successCount} destinatarios`
                    : `Enviado correctamente a ${successCount} destinatarios`, 'success');
                setShowMassMessage(false);
                setMassMessageText('');
                setSelectedMassImage(null);
                setMassSendAsBusiness(false);
                setIsSchedulingMassMessage(false);
                setMassMessageScheduledDate('');
            } else {
                showToast('No se pudo enviar el mensaje a ningún destinatario', 'warning');
            }
        } catch (error) {
            console.error('Error sending mass message:', error);
            showToast('Error al enviar mensaje masivo', 'error');
        } finally {
            setIsSendingMass(false);
        }
    };

    return (
        <div className="h-full flex flex-col bg-[#020617] text-white pb-20 lg:pb-0">
            {/* Header Area & Premium Navigation */}
            <div className="pt-6 lg:pt-10 px-6 mb-2">
                {/* Search Bar - Global to the section */}
                <div className="relative group/search mb-4">
                    <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                        <Search className="w-4 h-4 text-slate-500 group-focus-within/search:text-orange-500 transition-colors" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar en la comunidad..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[2rem] py-4 pl-12 pr-4 text-[10px] font-black uppercase tracking-widest text-white placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500/30 transition-all shadow-2xl"
                    />
                    
                    {globalSearchResults && (
                        <div className="absolute top-[calc(100%+0.5rem)] left-0 right-0 z-[100] bg-[#111111] border border-white/10 rounded-2xl max-h-[70vh] overflow-y-auto shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                            {globalSearchResults.groups.length > 0 && (
                                <div className="p-3 border-b border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-purple-400 mb-2 flex items-center gap-2">
                                        <Users className="w-3 h-3" /> Grupos
                                    </p>
                                    <div className="space-y-1">
                                        {globalSearchResults.groups.map(({ data: g }) => (
                                            <button
                                                key={g.id}
                                                onClick={() => {
                                                    setSelectedRoom(g);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5">
                                                    <img src={g.avatar} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-white truncate">{g.name}</p>
                                                    <p className="text-[9px] text-slate-500 truncate">{g.lastMessage}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {globalSearchResults.users.length > 0 && (
                                <div className="p-3 border-b border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-green-400 mb-2 flex items-center gap-2">
                                        <User className="w-3 h-3" /> Personas
                                    </p>
                                    <div className="space-y-1">
                                        {globalSearchResults.users.map(({ data: u }) => (
                                            <button
                                                key={u.id}
                                                onClick={() => {
                                                    handleStartDM(u);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-full overflow-hidden bg-white/5">
                                                    <img src={u.avatarUrl || 'https://i.pravatar.cc/100'} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <p className="flex-1 text-sm font-black text-white truncate">{u.name} {u.surname}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {globalSearchResults.businesses.length > 0 && (
                                <div className="p-3 border-b border-white/5">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-orange-400 mb-2 flex items-center gap-2">
                                        <Building2 className="w-3 h-3" /> Comercios
                                    </p>
                                    <div className="space-y-1">
                                        {globalSearchResults.businesses.map(({ data: b }) => (
                                            <button
                                                key={b.id}
                                                onClick={() => {
                                                    handleStartBusinessDM(b);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg overflow-hidden bg-white/5">
                                                    <img src={b.imageUrl} className="w-full h-full object-cover" alt="" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-black text-white truncate">{b.name}</p>
                                                    <p className="text-[9px] text-slate-500 truncate">{b.locality} · {b.sector}</p>
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {globalSearchResults.locations.length > 0 && (
                                <div className="p-3">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-cyan-400 mb-2 flex items-center gap-2">
                                        <MapPin className="w-3 h-3" /> Localidades
                                    </p>
                                    <div className="space-y-1">
                                        {globalSearchResults.locations.map(({ data: loc }, idx) => (
                                            <button
                                                key={idx}
                                                onClick={() => {
                                                    setSelectedLocality(loc.name);
                                                    setSearchQuery('');
                                                }}
                                                className="w-full flex items-center gap-3 p-2 rounded-xl hover:bg-white/5 transition-colors text-left"
                                            >
                                                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 flex items-center justify-center">
                                                    <MapPin className="w-4 h-4 text-cyan-500" />
                                                </div>
                                                <p className="flex-1 text-sm font-black text-white truncate">{loc.name}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
                {/* Unified Horizontal Navigation Bar */}
                <div className="flex items-center justify-between gap-4 p-1.5 bg-slate-900/40 backdrop-blur-xl border border-white/5 rounded-[2rem] mb-6 shadow-2xl">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar flex-1">
                        {[
                            { id: 'updates', label: 'Noticias', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/20' },
                            { id: 'communities', label: 'Grupos', icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/20' },
                            { id: 'chats', label: 'Directos', icon: MessageCircle, color: 'text-green-400', bg: 'bg-green-500/20' },
                            { id: 'notifications', label: 'Notis', icon: Bell, color: 'text-amber-400', bg: 'bg-amber-500/20' }
                        ].map((item) => {
                            const isActive = communityTab === item.id;
                            const count = item.id === 'groups' ? unreadGroupsCount : (item.id === 'chats' ? unreadDirectsCount : (item.id === 'notifications' ? unreadNotifsCount : 0));

                            return (
                                <button
                                    key={item.id}
                                    onClick={() => setCommunityTab(item.id as any)}
                                    className={`relative flex items-center gap-2 px-4 py-2.5 rounded-full transition-all duration-300 min-w-max ${isActive ? `${item.bg} ${item.color} border border-white/10 shadow-lg` : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                                >
                                    <item.icon className={`w-4 h-4 ${isActive ? item.color : ''}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                    {count > 0 && (
                                        <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                            <span className="relative inline-flex rounded-full h-4 w-4 bg-red-600 text-[8px] font-black items-center justify-center text-white border border-white/20 shadow-lg">
                                                {count > 99 ? '99+' : count}
                                            </span>
                                        </span>
                                    )}
                                </button>
                            );
                        })}

                    </div>

                    <div className="flex items-center gap-2 ml-2 pr-2 shrink-0">
                        {isPremiumUser && (
                            <button
                                onClick={() => setShowMassMessage(true)}
                                className="w-10 h-10 flex items-center justify-center bg-gradient-to-r from-orange-400 to-amber-600 rounded-full text-white shadow-xl shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all border border-orange-400/30"
                                title="Anunciar"
                            >
                                <Sparkles className="w-4 h-4 animate-pulse" />
                            </button>
                        )}
                    </div>
                </div>

                        {globalSearchResults && globalSearchResults.businesses.length === 0 &&
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
                                    🚀 Mejora tu plan para chatear con negocios y personas
                                </p>
                            </div>
                        )}
            </div>

            {/* Mass Message Modal */}
            {showMassMessage && (
                <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
                    <div className="bg-slate-900 border border-white/10 rounded-3xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in-zoom duration-300">
                        <div className="p-6 pb-4 border-b border-white/5 flex items-center justify-between">
                            <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                <Bell className="w-5 h-5 text-amber-500" />
                                Anuncio Masivo
                            </h2>
                            <button
                                onClick={() => setShowMassMessage(false)}
                                className="p-2 text-slate-400 hover:text-white"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">

                            <div className="flex items-center gap-2 mb-6">
                                <div className="flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/30 rounded-full">
                                    <Users className="w-3 h-3 text-cyan-400" />
                                    <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                                        Alcance: {estimatedAudience} personas
                                    </span>
                                </div>
                                {(isPremiumUser || !!userBusiness) && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 rounded-full">
                                        <Zap className="w-3 h-3 text-amber-500" />
                                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">
                                            {remainingCredits === Infinity ? 'Ilimitado' : `${remainingCredits} / ${businessCredits} anuncios/mes`}
                                        </span>
                                    </div>
                                )}
                                {!isPremiumUser && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 bg-red-500/10 border border-red-500/30 rounded-full">
                                        <Zap className="w-3 h-3 text-red-500" />
                                        <span className="text-[10px] font-black text-red-400 uppercase tracking-widest">
                                            Plan Gratis - Sin anuncios
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Premium Controls: Target & Categorization */}
                            <div className="space-y-4 mb-6">
                                {/* Target Selection */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center justify-between">
                                        Enviar a:
                                        {(massMessageTarget === 'all' || massMessageTarget === 'push') && (
                                            <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full">Pro</span>
                                        )}
                                    </p>
                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'followers', label: 'Seguidores', icon: Heart },
                                            { id: 'all', label: 'Todo Monta', icon: Users },
                                            { id: 'chat', label: 'Chats', icon: MessageCircle }
                                        ].map(target => (
                                            <button
                                                key={target.id}
                                                onClick={() => setMassMessageTarget(target.id as any)}
                                                className={`flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all ${massMessageTarget === target.id ? 'bg-orange-500/20 border-orange-500 shadow-lg shadow-orange-500/20' : 'bg-slate-800/40 border-white/5 hover:bg-white/5'}`}
                                            >
                                                <target.icon className={`w-4 h-4 ${massMessageTarget === target.id ? 'text-orange-500' : 'text-slate-400'}`} />
                                                <span className={`text-[8px] font-black uppercase ${massMessageTarget === target.id ? 'text-white' : 'text-slate-500'}`}>{target.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Locality Targeting (Premium) */}
                                {massMessageTarget === 'all' && (
                                    <div className="p-3 bg-slate-800/40 border border-white/5 rounded-2xl animate-in slide-in-from-top-2">
                                        <div className="flex items-center justify-between mb-3">
                                            <p className="text-[10px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                                                <MapPin className="w-3 h-3 text-cyan-400" /> Target Localidad
                                            </p>
                                            <span className="text-[8px] font-black text-amber-500 uppercase bg-amber-500/10 px-2 py-0.5 rounded-full">Premium</span>
                                        </div>
                                        <div className="flex gap-2 mb-2">
                                            <button
                                                onClick={() => setMassMessageLocalitySelection('all')}
                                                className={`flex-1 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-tight transition-all ${massMessageLocalitySelection === 'all' ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-slate-700/30 border-white/5 text-slate-500'}`}
                                            >
                                                Todas las localidades
                                            </button>
                                            <button
                                                onClick={() => setMassMessageLocalitySelection('specific')}
                                                className={`flex-1 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-tight transition-all ${massMessageLocalitySelection === 'specific' ? 'bg-cyan-500/20 border-cyan-500 text-white' : 'bg-slate-700/30 border-white/5 text-slate-500'}`}
                                            >
                                                Filtrar Localidad
                                            </button>
                                        </div>
                                        {massMessageLocalitySelection === 'specific' && (
                                            <select
                                                value={massMessageSelectedLocality || ''}
                                                onChange={(e) => setMassMessageSelectedLocality(e.target.value)}
                                                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold text-white uppercase mt-1 focus:ring-1 focus:ring-cyan-500 outline-none"
                                            >
                                                <option value="">Seleccionar Localidad</option>
                                                {[...LOCALITIES, ...customLocalities].map(loc => (
                                                    <option key={loc.name} value={loc.name}>{loc.name}</option>
                                                ))}
                                            </select>
                                        )}
                                    </div>
                                )}

                                {/* Notification Type Selection */}
                                <div>
                                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                        <Hash className="w-3 h-3" /> Categoría del Anuncio:
                                    </p>
                                    <div className="flex flex-wrap gap-2">
                                        {[
                                            { id: 'info', label: 'Info', color: 'blue', icon: Info },
                                            { id: 'offer', label: 'Oferta', color: 'orange', icon: Gift },
                                            { id: 'alert', label: 'Alerta', color: 'red', icon: AlertTriangle },
                                            { id: 'system', label: 'Sistema', color: 'purple', icon: Zap }
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => setMassMessageType(type.id as any)}
                                                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[8px] font-black uppercase tracking-widest transition-all ${massMessageType === type.id ? `bg-${type.color}-500/20 border-${type.color}-500 text-white shadow-lg shadow-${type.color}-500/10` : 'bg-slate-800/40 border-white/5 text-slate-500 hover:bg-slate-800'}`}
                                            >
                                                <type.icon className="w-3 h-3" />
                                                {type.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            {recipientList.length > 0 && (
                                <div className="mb-4">
                                    <button
                                        onClick={() => setShowRecipientsList(!showRecipientsList)}
                                        className="flex items-center justify-between w-full p-3 bg-slate-800/50 border border-white/10 rounded-xl hover:bg-slate-800 transition-colors"
                                    >
                                        <div className="flex items-center gap-2">
                                            <Users className="w-4 h-4 text-cyan-400" />
                                            <span className="text-xs font-black text-white uppercase">
                                                Ver destinatarios ({recipientList.length})
                                            </span>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showRecipientsList ? 'rotate-90' : ''}`} />
                                    </button>
                                    {showRecipientsList && (
                                        <div className="mt-2 max-h-40 overflow-y-auto bg-slate-900/50 border border-white/5 rounded-xl p-2 space-y-1">
                                            {recipientList.map((r) => (
                                                <button
                                                    key={r.id}
                                                    onClick={() => {
                                                        if (r.type === 'business') {
                                                            window.dispatchEvent(new CustomEvent('openBusinessProfile', { detail: r.id }));
                                                        } else {
                                                            setSearchQuery(r.name.split(' ')[0]);
                                                            setCommunityTab('chats');
                                                        }
                                                        setShowMassMessage(false);
                                                    }}
                                                    className="w-full flex items-center gap-3 p-2 hover:bg-white/5 rounded-lg transition-colors text-left"
                                                >
                                                    <div className="w-8 h-8 rounded-full overflow-hidden bg-slate-700 shrink-0">
                                                        {r.avatar ? (
                                                            <img src={r.avatar} alt={r.name} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <div className="w-full h-full flex items-center justify-center text-slate-400">
                                                                {r.type === 'business' ? <Building2 className="w-4 h-4" /> : <User className="w-4 h-4" />}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-xs font-bold text-white truncate">{r.name}</p>
                                                        <p className="text-[10px] text-slate-500 uppercase">{r.type === 'business' ? 'Negocio' : 'Usuario'}</p>
                                                    </div>
                                                    <ChevronRight className="w-4 h-4 text-slate-600" />
                                                </button>
                                            ))}
                                            {estimatedAudience > 50 && (
                                                <p className="text-[10px] text-slate-500 text-center py-2">
                                                    +{estimatedAudience - 50} más...
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}

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
                                                        <User className="w-3.5 h-3.5 text-white" />
                                                        <span className="text-[10px] font-black text-white uppercase">Personal</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Scheduling Section */}
                                <div className="p-3 bg-slate-800/40 border border-white/10 rounded-2xl">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <div className={`p-1.5 rounded-lg ${isSchedulingMassMessage ? 'bg-cyan-500/20 text-cyan-400' : 'bg-slate-700/50 text-slate-400'}`}>
                                                <Clock className="w-3.5 h-3.5" />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">Programar Envío</p>
                                                <p className="text-[8px] text-slate-500 uppercase tracking-tight mt-0.5">Elige cuándo lanzar el anuncio</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => setIsSchedulingMassMessage(!isSchedulingMassMessage)}
                                            className={`relative w-9 h-5 rounded-full transition-colors duration-200 outline-none ${isSchedulingMassMessage ? 'bg-cyan-500' : 'bg-slate-700'
                                                }`}
                                        >
                                            <div className={`absolute top-1 left-1 w-3 h-3 bg-white rounded-full transition-transform duration-200 ${isSchedulingMassMessage ? 'translate-x-4' : ''
                                                }`} />
                                        </button>
                                    </div>

                                    {isSchedulingMassMessage && (
                                        <div className="relative group animate-in slide-in-from-top-2 duration-200">
                                            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-400">
                                                <Calendar className="w-4 h-4" />
                                            </div>
                                            <input
                                                type="datetime-local"
                                                value={massMessageScheduledDate}
                                                min={new Date().toISOString().slice(0, 16)}
                                                onChange={(e) => setMassMessageScheduledDate(e.target.value)}
                                                className="w-full bg-slate-900/50 border border-cyan-500/30 rounded-xl py-2.5 pl-10 pr-4 text-xs font-bold text-white focus:outline-none focus:border-cyan-500 transition-colors [color-scheme:dark]"
                                            />
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center gap-3">
                                    <div className="flex-1 relative group">
                                        <textarea
                                            value={massMessageText}
                                            onChange={(e) => setMassMessageText(e.target.value)}
                                            placeholder="Escribe el mensaje del anuncio..."
                                            className="w-full h-24 bg-slate-800/80 border border-white/5 rounded-2xl p-4 text-sm font-medium text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500/50 transition-all resize-none"
                                        />
                                        <div className="absolute bottom-3 right-3 flex items-center gap-2 opacity-0 group-focus-within:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setShowMassEmojiPicker(!showMassEmojiPicker)}
                                                className="p-1.5 text-slate-400 hover:text-amber-500 transition-colors"
                                            >
                                                <Smile className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                    {selectedMassImage && (
                                        <div className="relative inline-self">
                                            <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-amber-500/30">
                                                <img src={selectedMassImage} alt="Preview" className="w-full h-full object-cover" />
                                            </div>
                                            <button
                                                onClick={() => setSelectedMassImage(null)}
                                                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900"
                                            >
                                                <XIcon className="w-3 h-3 text-white" />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-center gap-2">
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowMassImageOptions(!showMassImageOptions)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${selectedMassImage ? 'bg-amber-500 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-750'
                                                    }`}
                                            >
                                                <Camera className="w-4 h-4" />
                                                <span className="text-[10px] font-black uppercase">{selectedMassImage ? 'Imagen Lista' : 'Añadir Imagen'}</span>
                                            </button>

                                            {showMassImageOptions && (
                                                <div className="absolute bottom-full left-0 mb-2 p-2 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex gap-2 z-50">
                                                    <button
                                                        onClick={() => { massCameraInputRef.current?.click(); setShowMassImageOptions(false); }}
                                                        className="p-3 bg-orange-500/20 rounded-xl hover:bg-orange-500/30 transition-colors"
                                                        title="Cámara"
                                                    >
                                                        <Camera className="w-5 h-5 text-orange-400" />
                                                    </button>
                                                    <button
                                                        onClick={() => { massImageInputRef.current?.click(); setShowMassImageOptions(false); }}
                                                        className="p-3 bg-amber-500/20 rounded-xl hover:bg-amber-500/30 transition-colors"
                                                    >
                                                        <Upload className="w-5 h-5 text-amber-400" />
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
                                                    const compressed = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
                                                    setSelectedMassImage(compressed);
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
                                                    const compressed = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
                                                    setSelectedMassImage(compressed);
                                                }
                                            }}
                                        />

                                        {selectedMassImage && (
                                            <button
                                                onClick={() => setSelectedMassImage(null)}
                                                className="p-2 transition-colors text-red-400 hover:text-red-300 bg-red-500/10 rounded-xl"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-6 pt-4 border-t border-white/5">
                            <button
                                onClick={handleSendMassMessage}
                                disabled={isSendingMass || !massMessageText.trim()}
                                className="w-full bg-gradient-to-r from-orange-500 to-amber-600 text-white rounded-2xl py-4 text-xs font-black uppercase tracking-widest shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 disabled:hover:scale-100"
                            >
                                {isSendingMass ? 'Enviando...' : '🚀 Enviar Mensaje'}
                            </button>
                        </div>
                    </div>
                </div>
            )}



            <div className="px-6 flex-1 overflow-hidden pb-4 relative z-10">
                {communityTab === 'updates' ? (
                    <div className="h-full flex flex-col bg-[#111111]/80 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-3xl shadow-2xl relative">
                        {/* Global Chat Header Overlay */}
                        <div className="flex bg-white/[0.02] border-b border-white/5 p-4 items-center justify-between gap-3 flex-wrap md:flex-nowrap">
                            <div className="flex items-center gap-2">
                                {isPremiumUser && (
                                    <button
                                        onClick={() => setShowMassMessage(true)}
                                        className="p-2 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition-all border border-amber-500/20 flex items-center gap-2 shrink-0"
                                    >
                                        <Zap className="w-4 h-4 fill-amber-500" />
                                        <span className="text-[8px] font-black uppercase tracking-widest hidden md:inline">Panel Pro</span>
                                    </button>
                                )}
                                <button
                                    onClick={() => setShowCreditsModal(true)}
                                    className="px-3 py-2 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-xl text-[9px] font-black uppercase tracking-widest border border-orange-500/20 transition-all active:scale-95 shrink-0"
                                >
                                    Comodines
                                </button>
                            </div>

                            <div className="flex items-center gap-2 bg-slate-800/50 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-white/5 ml-auto">
                                <span className="text-[9px] font-black text-white uppercase tracking-widest mr-1 shrink-0">Zona:</span>
                                <select
                                    value={selectedLocality || ''}
                                    onChange={(e) => setSelectedLocality(e.target.value || null)}
                                    className="bg-transparent border-none text-[10px] font-black text-orange-500 uppercase focus:outline-none cursor-pointer"
                                >
                                    <option value="" className="bg-slate-900 text-white">TODAS LAS ZONAS</option>
                                    {[...LOCALITIES, ...customLocalities].map(loc => (
                                        <option key={loc.name} value={loc.name} className="bg-slate-900 text-white">{loc.name.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-6 no-scrollbar scrolling-touch">
                            {messages
                                .filter(msg => {
                                    const matchesLocality = !selectedLocality || (msg as any).locality === selectedLocality;
                                    const msgDistance = (msg as any).distance || 0;
                                    const matchesDistance = distanceFilter === 'all' ||
                                        (distanceFilter === '1km' && msgDistance <= 1) ||
                                        (distanceFilter === '5km' && msgDistance <= 5);
                                    return matchesLocality && matchesDistance;
                                })
                                .map((msg, idx) => {
                                    // Support both field naming conventions during transition
                                    const senderId = msg.senderId || (msg as any).authorId;
                                    const text = msg.text || (msg as any).content;
                                    const senderName = msg.senderName || (msg as any).authorName;
                                    const senderAvatar = msg.senderAvatar || (msg as any).authorAvatar;

                                    const isMe = senderId === user?.id || (userBusiness && senderId === userBusiness.id);
                                    return (
                                        <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} gap-1.5 animate-in slide-in-from-bottom-2 duration-300 group/gmsg`}>
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
                                                    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1 ${msg.isBusinessMessage ? 'text-amber-500' : 'text-slate-500'}`}>
                                                        {msg.isBusinessMessage && <Zap className="w-2.5 h-2.5 fill-amber-500" />}
                                                        {senderName}
                                                    </span>
                                                    {(msg as any).scheduledAt && (
                                                        <span className="text-[7.5px] font-black bg-amber-500/10 text-amber-500 px-1.5 py-0.5 rounded border border-amber-500/20 leading-none uppercase tracking-tighter ml-1 flex items-center gap-1">
                                                            <Clock className="w-2 h-2" /> Programado
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                            <div className={`flex items-end gap-2 ${isMe ? 'flex-row-reverse' : 'flex-row'}`}>
                                                {/* Delete button — only for own messages, visible on hover */}
                                                {isMe && (
                                                    <button
                                                        onClick={async () => {
                                                            if (await showConfirm('¿Eliminar este mensaje?')) {
                                                                setDeletingGlobalMsgId(msg.id);
                                                                try {
                                                                    await deleteGlobalMessage(msg.id);
                                                                } catch {
                                                                    showToast('No se pudo eliminar el mensaje.', 'error');
                                                                } finally {
                                                                    setDeletingGlobalMsgId(null);
                                                                }
                                                            }
                                                        }}
                                                        disabled={deletingGlobalMsgId === msg.id}
                                                        className="opacity-0 group-hover/gmsg:opacity-100 transition-opacity p-1.5 rounded-xl bg-red-500/20 hover:bg-red-500/40 text-red-400 shrink-0 mb-1"
                                                        title="Eliminar mensaje"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </button>
                                                )}
                                                <div className={`relative rounded-[2rem] text-sm font-bold leading-relaxed shadow-2xl transition-all ${isMe
                                                    ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-tr-sm shadow-orange-600/20'
                                                    : 'bg-slate-800/80 backdrop-blur-md text-slate-100 rounded-tl-sm border border-white/5 shadow-black/40'
                                                    } ${deletingGlobalMsgId === msg.id ? 'opacity-40' : ''}`}>
                                                    {(msg as any).imageUrl && (
                                                        <div className="relative group/img">
                                                            <img
                                                                src={(msg as any).imageUrl}
                                                                alt="Imagen"
                                                                className={`max-w-[220px] max-h-[200px] ${text ? 'rounded-t-[2rem]' : 'rounded-[2rem]'} object-cover w-full border-b border-white/5 transition-all hover:brightness-110`}
                                                            />
                                                            {/* Simple Download Button for PRO/EXPERT/ADMIN */}
                                                            {isPremiumUser && (
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const link = document.createElement('a');
                                                                        link.href = (msg as any).imageUrl;
                                                                        link.download = `montapulse-image-${msg.id}.jpg`;
                                                                        document.body.appendChild(link);
                                                                        link.click();
                                                                        document.body.removeChild(link);
                                                                    }}
                                                                    className="absolute bottom-2 right-2 p-1.5 bg-black/60 backdrop-blur-md rounded-lg text-white opacity-0 group-hover/img:opacity-100 transition-all active:scale-90 border border-white/20"
                                                                    title="Descargar imagen"
                                                                >
                                                                    <Download className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                    {text && <p className="px-5 py-3.5">{text}</p>}
                                                </div>
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

                            <div className="flex flex-col gap-3">
                                {selectedGlobalImage && (
                                    <div className="relative inline-self mb-2 ml-4">
                                        <div className="relative w-20 h-20 rounded-xl overflow-hidden border border-amber-500/30 shadow-lg">
                                            <img src={selectedGlobalImage} alt="Preview" className="w-full h-full object-cover" />
                                        </div>
                                        <button
                                            onClick={() => setSelectedGlobalImage(null)}
                                            className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center shadow-lg border-2 border-slate-900 transition-transform active:scale-90"
                                        >
                                            <XIcon className="w-3 h-3 text-white" />
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
                                                                if (globalChatInputRef.current) {
                                                                    globalChatInputRef.current.value += emoji;
                                                                    globalChatInputRef.current.focus();
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
                                        ref={globalChatInputRef}
                                        type="text"
                                        placeholder="Di algo al mundo..."
                                        className="flex-1 bg-white/5 border border-white/5 rounded-2xl px-5 py-3 text-sm font-black text-white placeholder:text-slate-700 focus:outline-none focus:border-orange-500/50 transition-all shrink-0"
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                                const text = e.currentTarget.value.trim();
                                                if (text || selectedGlobalImage) {
                                                    sendGlobalMessage(text, sendAsBusiness, selectedGlobalImage ? 'image' : 'text', selectedGlobalImage || undefined);
                                                    e.currentTarget.value = '';
                                                    setSelectedGlobalImage(null);
                                                }
                                            }
                                        }}
                                    />
                                    <div className="relative">
                                        <button
                                            onClick={() => { setShowGlobalImageOptions(!showGlobalImageOptions); setShowGlobalEmojiPicker(false); }}
                                            className="p-3 text-slate-500 hover:text-slate-300 transition-colors"
                                        >
                                            <Camera className="w-5 h-5" />
                                        </button>
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
                                                if (!canSendImages) {
                                                    showToast('El envío de imágenes es una función exclusiva del plan EXPERT 🚀', 'warning');
                                                    return;
                                                }
                                                const compressed = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
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
                                                if (!canSendImages) {
                                                    showToast('Sube a EXPERT para capturar y enviar fotos en la comunidad 🏆', 'warning');
                                                    return;
                                                }
                                                const compressed = await compressImage(file, { maxWidth: 1024, maxHeight: 1024, quality: 0.8 });
                                                setSelectedGlobalImage(compressed);
                                                setShowGlobalImageOptions(false);
                                            }
                                        }}
                                    />
                                    <button
                                        onClick={() => {
                                            const input = globalChatInputRef.current;
                                            if (input && (input.value.trim() || selectedGlobalImage)) {
                                                sendGlobalMessage(input.value.trim(), sendAsBusiness, selectedGlobalImage ? 'image' : 'text', selectedGlobalImage || undefined);
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
                ) : communityTab === 'notifications' ? (
                    <div className="h-full flex flex-col bg-[#1b1b1b]/95 rounded-[2.5rem] border border-white/5 overflow-hidden backdrop-blur-3xl shadow-2xl relative">
                        {/* Redesigned Notification Header & Filters */}
                        <div className="p-6 bg-gradient-to-b from-white/[0.05] to-transparent border-b border-white/5">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-500/20 rounded-xl">
                                        <Bell className="w-5 h-5 text-amber-500" />
                                    </div>
                                    <div>
                                        <h2 className="text-lg font-black text-white uppercase tracking-tight">Notificaciones</h2>
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{notifications.filter(n => !n.read).length} pendientes</p>
                                    </div>
                                </div>
                                {notifications.some(n => !n.read) && (
                                    <button
                                        onClick={() => notifications.forEach(n => !n.read && markAsRead(n.id))}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl text-[9px] font-black text-amber-500 uppercase tracking-widest transition-all active:scale-95"
                                    >
                                        Marcar todo como leído
                                    </button>
                                )}
                            </div>

                            {/* Filter Chips */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
                                {[
                                    { id: 'all', label: 'Todas', icon: Bell },
                                    { id: 'offer', label: 'Ofertas', icon: Sparkles },
                                    { id: 'system', label: 'Sistema', icon: Info },
                                    { id: 'alert', label: 'Alertas', icon: Zap }
                                ].map((filter) => (
                                    <button
                                        key={filter.id}
                                        onClick={() => setNotifFilter(filter.id as any)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-2xl border transition-all shrink-0 ${notifFilter === filter.id
                                            ? 'bg-amber-500 border-amber-400 text-white shadow-lg shadow-amber-500/20'
                                            : 'bg-white/5 border-white/10 text-slate-400 hover:border-white/20'
                                            }`}
                                    >
                                        <filter.icon className="w-3.5 h-3.5" />
                                        <span className="text-[10px] font-black uppercase tracking-widest">{filter.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar custom-scrollbar">
                            {notifications.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center py-20 opacity-40">
                                    <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mb-6">
                                        <Bell className="w-10 h-10 text-slate-400" />
                                    </div>
                                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Sin notificaciones</p>
                                </div>
                            ) : (
                                notifications
                                    .filter(n => notifFilter === 'all' || n.type === notifFilter)
                                    .sort((a, b) => {
                                        const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                                        const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                                        return dateB.getTime() - dateA.getTime();
                                    })
                                    .map(notif => {
                                        const isUrgent = notif.priority === 'urgent' || notif.type === 'alert';
                                        const hasImage = !!notif.imageUrl;
                                        const notifDate = notif.createdAt?.toDate ? notif.createdAt.toDate() : new Date(notif.createdAt);

                                        return (
                                            <div
                                                key={notif.id}
                                                className={`group p-4 rounded-[2rem] border transition-all duration-300 relative overflow-hidden ${notif.read
                                                    ? 'bg-white/[0.02] border-white/5 opacity-60 grayscale-[0.5]'
                                                    : isUrgent
                                                        ? 'bg-red-500/10 border-red-500/30 shadow-lg shadow-red-500/5'
                                                        : 'bg-[#222222] border-white/10 shadow-xl shadow-black/40 hover:border-amber-500/30'
                                                    }`}
                                            >
                                                {/* Status Indicator */}
                                                {!notif.read && (
                                                    <div className={`absolute top-0 left-0 w-1 h-full ${isUrgent ? 'bg-red-500' : 'bg-amber-500'} shadow-[0_0_15px_rgba(245,158,11,0.5)]`} />
                                                )}

                                                <div className="flex gap-4">
                                                    {/* Avatar / Icon Section */}
                                                    <div className="shrink-0">
                                                        {notif.businessAvatar ? (
                                                            <div className="w-12 h-12 rounded-2xl overflow-hidden border border-white/10 p-0.5">
                                                                <img src={notif.businessAvatar} alt="Biz" className="w-full h-full object-cover rounded-[0.9rem]" />
                                                            </div>
                                                        ) : (
                                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isUrgent ? 'bg-red-500/20 border-red-500/30' : 'bg-amber-500/20 border-amber-500/30'
                                                                }`}>
                                                                {isUrgent ? <Zap className="w-6 h-6 text-red-500" /> : <Bell className="w-6 h-6 text-amber-500" />}
                                                            </div>
                                                        )}
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                                            <div>
                                                                <div className="flex items-center gap-2 mb-0.5">
                                                                    <h4 className={`text-[12px] font-black uppercase tracking-tight ${notif.read ? 'text-slate-400' : isUrgent ? 'text-red-400' : 'text-white'
                                                                        }`}>
                                                                        {notif.title}
                                                                    </h4>
                                                                    {isUrgent && !notif.read && (
                                                                        <span className="animate-pulse flex h-2 w-2 rounded-full bg-red-500" />
                                                                    )}
                                                                </div>
                                                                {notif.senderName && (
                                                                    <p className="text-[9px] font-bold text-amber-500 uppercase tracking-widest">{notif.senderName}</p>
                                                                )}
                                                            </div>
                                                            <div className="flex items-center gap-1.5 shrink-0 bg-black/20 px-2 py-1 rounded-full">
                                                                <Clock className="w-2.5 h-2.5 text-slate-500" />
                                                                <span className="text-[8px] font-black text-slate-500 uppercase">
                                                                    {notifDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                </span>
                                                            </div>
                                                        </div>

                                                        <p className="text-[11px] text-slate-300 leading-relaxed font-medium mb-3">
                                                            {notif.body || notif.message}
                                                        </p>

                                                        {/* Notification Image Preview */}
                                                        {hasImage && (
                                                            <div className="mb-3 rounded-2xl overflow-hidden border border-white/5 aspect-[16/9] bg-black/40">
                                                                <img src={notif.imageUrl} alt="Notif" className="w-full h-full object-cover" />
                                                            </div>
                                                        )}

                                                        <div className="flex items-center justify-between mt-auto">
                                                            <div className="flex gap-2">
                                                                {!notif.read && (
                                                                    <button
                                                                        onClick={() => markAsRead(notif.id)}
                                                                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-500 rounded-xl transition-all active:scale-95"
                                                                    >
                                                                        <CheckCircle className="w-3 h-3" />
                                                                        <span className="text-[8px] font-black uppercase tracking-widest">Leído</span>
                                                                    </button>
                                                                )}
                                                                {notif.type === 'offer' && (
                                                                    <button className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-xl transition-all">
                                                                        <Sparkles className="w-3 h-3" />
                                                                        <span className="text-[8px] font-black uppercase tracking-widest">Ver Oferta</span>
                                                                    </button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                            )}
                        </div>
                    </div>
                ) : communityTab === 'communities' ? (
                    <div className="h-full overflow-y-auto no-scrollbar space-y-6 pb-20 pt-4">
                        {/* Interactive Filter Bar */}
                        <div className="flex gap-2 overflow-x-auto no-scrollbar px-2 pb-2">
                            {[
                                { id: 'suggestions', label: 'Sugeridos', icon: Sparkles, color: 'orange' },
                                { id: 'my-city', label: 'Mi Ciudad', icon: MapPin, color: 'blue' },
                                { id: 'near-me', label: 'Cerca de mí', icon: Radar, color: 'green' }
                            ].map((f) => (
                                <button
                                    key={f.id}
                                    onClick={() => setGroupFilter(f.id as any)}
                                    className={`
                                        flex items-center gap-2 px-4 py-2.5 rounded-2xl whitespace-nowrap transition-all duration-300 border
                                        ${groupFilter === f.id 
                                            ? `bg-${f.color}-500/20 border-${f.color}-500/40 text-${f.color}-400 shadow-lg shadow-${f.color}-500/10 scale-105` 
                                            : 'bg-white/[0.03] border-white/5 text-slate-500 hover:bg-white/[0.05] hover:text-slate-300'
                                        }
                                    `}
                                >
                                    <f.icon className={`w-3.5 h-3.5 ${groupFilter === f.id ? `text-${f.color}-500` : ''}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">{f.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 px-2 flex items-center gap-2">
                                <Users className="w-3 h-3 text-orange-500" /> Grupos Sugeridos
                            </p>
                            <div className="space-y-2">
                                {filteredGroups.map((group) => (
                                    <div
                                        key={group.id}
                                        onClick={() => setSelectedRoom(group)}
                                        className="flex items-center gap-4 p-3 rounded-2xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] transition-all cursor-pointer active:scale-[0.98] group"
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
                                {filteredGroups.length === 0 && (
                                    <div className="py-20 flex flex-col items-center gap-4 text-center opacity-40">
                                        <div className="w-20 h-20 bg-white/5 rounded-[2.5rem] flex items-center justify-center border border-dashed border-white/10">
                                            <Users className="w-10 h-10 text-slate-500" />
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm font-black uppercase tracking-widest text-slate-300">No hay grupos</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : communityTab === 'chats' ? (
                    <div className="space-y-6 pb-24 pt-4">
                        {/* Modern User Search */}
                        <div className="px-2">
                            <div className="relative group">
                                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                                    <Search className="w-4 h-4 text-slate-500 group-focus-within:text-orange-500 transition-colors" />
                                </div>
                                <input
                                    type="text"
                                    value={userSearchQuery}
                                    onChange={(e) => setUserSearchQuery(e.target.value)}
                                    placeholder="Buscar personas o negocios..."
                                    className="w-full bg-white/[0.03] border border-white/5 rounded-2xl py-4 pl-12 pr-4 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:border-orange-500/50 focus:bg-white/[0.06] transition-all duration-300"
                                />
                            </div>
                        </div>

                        {/* Chats Activos with unread messages prominently */}
                        {filteredRooms.length > 0 && (
                            <div className="space-y-3">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Chats Activos</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {filteredRooms.map((room) => {
                                        const participantId = room.participants.find(p => p !== user?.id && p !== userBusiness?.id);
                                        const participant = allUsers.find(u => u.id === participantId);
                                        const businessParticipant = businesses.find(b => b.id === participantId);
                                        const isBusinessChat = !!businessParticipant;
                                        const displayName = isBusinessChat ? businessParticipant.name : (participant ? `${participant.name} ${participant.surname}` : 'Usuario');
                                        const displayAvatar = isBusinessChat ? businessParticipant.imageUrl : (participant?.avatarUrl || 'https://i.pravatar.cc/100');

                                        return (
                                            <div
                                                key={room.id}
                                                onClick={() => {
                                                    setSelectedRoom(room);
                                                }}
                                                className="group relative flex items-center gap-4 bg-[#111111]/60 backdrop-blur-md p-4 rounded-[1.5rem] border border-white/5 hover:border-orange-500/30 transition-all cursor-pointer hover:bg-white/5"
                                            >
                                                <div className="relative">
                                                    <img src={displayAvatar} className={`w-12 h-12 object-cover ${isBusinessChat ? 'rounded-xl' : 'rounded-full'} border-2 border-white/10`} />
                                                    {isBusinessChat && (
                                                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-amber-500 rounded-full flex items-center justify-center border-2 border-[#111111]">
                                                            <Zap className="w-2 h-2 text-white fill-white" />
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`text-sm font-black uppercase tracking-tight truncate ${isBusinessChat ? 'text-amber-500' : 'text-white'}`}>
                                                        {displayName}
                                                    </h4>
                                                    <p className="text-[10px] font-medium text-slate-500 truncate mt-0.5">
                                                        {room.lastMessage || 'Empezar conversación'}
                                                    </p>
                                                </div>
                                                {room.unreadCount !== undefined && room.unreadCount > 0 && (
                                                    <div className="h-6 min-w-[1.5rem] bg-red-600 rounded-full flex items-center justify-center text-[10px] font-black px-2 shadow-lg shadow-red-600/30 text-white animate-in zoom-in duration-300">
                                                        {room.unreadCount}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        <div className="space-y-4 pt-4 border-t border-white/5">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Sugeridos</h3>
                                <span className="text-[10px] font-bold text-slate-400">{filteredUsers.length} personas</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {filteredUsers.map((userItem) => (
                                    <div
                                        key={userItem.id}
                                        onClick={() => handleStartDM(userItem)}
                                        className="relative group h-32 rounded-3xl overflow-hidden cursor-pointer active:scale-95 transition-all shadow-xl shadow-black/40 border border-white/5"
                                    >
                                        <img src={userItem.avatarUrl || 'https://i.pravatar.cc/100'} className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500" />
                                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                                        <div className="absolute bottom-3 left-3 right-3 text-center">
                                            <p className="text-[10px] font-black text-white uppercase tracking-tighter truncate">{userItem.name} {userItem.surname}</p>
                                            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">{userItem.locality}</p>
                                        </div>
                                    </div>
                                ))}
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
                                let businessParticipant: Business | undefined;

                                if (participantId) {
                                    businessParticipant = businesses.find(b => b.id === participantId);
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
                                                {item.unreadCount > 0 && (
                                                    <div className="min-w-[1.25rem] h-5 bg-red-600 rounded-lg flex items-center justify-center text-[10px] font-black px-1.5 shadow-lg shadow-red-600/30 text-white">
                                                        {item.unreadCount}
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

            {/* Credits / Comodines Modal */}
            {showCreditsModal && (
                <div 
                    className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6"
                    onClick={() => setShowCreditsModal(false)}
                >
                    <div 
                        className="bg-[#111111] border border-white/10 rounded-[2.5rem] p-8 max-w-sm w-full relative overflow-hidden shadow-2xl"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Decorative background flare */}
                        <div className="absolute -top-24 -right-24 w-48 h-48 bg-orange-500/10 rounded-full blur-[80px]" />
                        
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-10">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-tight">Tus Comodines</h3>
                                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">Créditos de Negocio</p>
                                </div>
                                <button 
                                    onClick={() => setShowCreditsModal(false)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <X className="w-5 h-5 text-slate-400" />
                                </button>
                            </div>

                            <div className="text-center py-6 mb-8 group">
                                <div className="text-7xl font-black text-orange-500 mb-4 transition-transform group-hover:scale-110 duration-500">
                                    {remainingCredits === Infinity ? '∞' : remainingCredits}
                                </div>
                                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">
                                    Mensajes Globales / Mes
                                </p>
                            </div>

                            <div className="bg-white/[0.03] border border-white/5 rounded-3xl p-6 mb-6">
                                <div className="flex justify-between items-end mb-4">
                                    <div className="space-y-1">
                                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Estado Actual</p>
                                        <p className="text-xs font-black text-white uppercase">
                                            {remainingCredits === Infinity ? 'Capacidad Ilimitada' : `${usedThisMonthCount} de ${businessCredits} usados`}
                                        </p>
                                    </div>
                                    {remainingCredits !== Infinity && (
                                        <div className="text-[10px] font-black text-orange-500">
                                            {Math.round((usedThisMonthCount / businessCredits) * 100)}%
                                        </div>
                                    )}
                                </div>
                                
                                <div className="w-full h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
                                    <div 
                                        className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 rounded-full transition-all duration-1000 ease-out"
                                        style={{ width: remainingCredits === Infinity ? '100%' : `${Math.min(100, (usedThisMonthCount / businessCredits) * 100)}%` }}
                                    />
                                </div>
                            </div>

                            <button 
                                onClick={() => setShowCreditsModal(false)}
                                className="w-full py-4 bg-white text-black rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-slate-200 transition-all active:scale-95 shadow-lg shadow-white/5"
                            >
                                Entendido
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Perfil Section */}
            {communityTab === 'profile' && (
                <div className="h-full overflow-y-auto no-scrollbar pb-24 px-6">
                    {/* Lista de Negocios - Like Chat but shows business summary on click */}
                    <div className="space-y-3">
                        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest px-2">Negocios</h3>
                        {businesses.filter(b => b.isPublished !== false && !b.isDeleted).map((business) => (
                            <div
                                key={business.id}
                                onClick={() => setSelectedBusinessForProfile(business)}
                                className="relative h-56 rounded-[2.5rem] overflow-hidden cursor-pointer active:scale-[0.98] transition-all group shadow-2xl shadow-black/40 border border-white/5 hover:border-purple-500/50"
                            >
                                {/* Background Image */}
                                <img 
                                    src={business.imageUrl || 'https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?auto=format&fit=crop&q=80&w=400'} 
                                    alt={business.name} 
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                                />
                                {/* Dark Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0F] via-[#0A0A0F]/60 to-transparent" />
                                
                                {/* Top Right: Rating */}
                                {business.rating && (
                                    <div className="absolute top-4 right-6 flex items-center gap-1.5 px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                                        <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                                        <span className="text-[11px] font-black text-white">{business.rating.toFixed(1)}</span>
                                    </div>
                                )}

                                {/* Bottom Content */}
                                <div className="absolute bottom-6 left-8 right-8">
                                    <div className="flex items-center gap-2 mb-1.5">
                                        <span className="px-2.5 py-0.5 bg-purple-500/20 border border-purple-500/30 rounded-full text-[9px] font-black text-purple-400 uppercase tracking-widest">
                                            {business.category}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight group-hover:text-purple-400 transition-colors leading-none mb-4">
                                        {business.name}
                                    </h3>
                                    
                                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                                        <div className="flex items-center gap-4">
                                            <span className="text-[10px] font-black text-white/50 uppercase tracking-widest flex items-center gap-1.5">
                                                <Heart className="w-4 h-4 text-rose-500 fill-rose-500" /> {business.followerCount || 0}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-1.5 text-[10px] font-black text-purple-400 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                                            Ver Perfil <ChevronRight className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Business Profile Modal */}
            {selectedBusinessForProfile && (
                <div className="fixed inset-0 z-[100] bg-slate-900/90 backdrop-blur-md flex items-center justify-center p-6" onClick={() => setSelectedBusinessForProfile(null)}>
                    <div className="bg-[#111111] border border-white/10 rounded-[2.5rem] p-6 max-w-md w-full max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-4">
                            <h2 className="text-xl font-black text-white uppercase">Perfil de Negocio</h2>
                            <button onClick={() => setSelectedBusinessForProfile(null)} className="p-2 hover:bg-white/5 rounded-full transition-all">
                                <X className="w-6 h-6 text-slate-400" />
                            </button>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-20 h-20 rounded-[1.5rem] overflow-hidden border-2 border-amber-500/30">
                                <img src={selectedBusinessForProfile.imageUrl || 'https://images.unsplash.com/photo-1550966871-3ed3c47e2ce2?auto=format&fit=crop&q=80&w=400'} alt={selectedBusinessForProfile.name} className="w-full h-full object-cover" />
                            </div>
                            <div>
                                <h3 className="text-lg font-black text-white uppercase">{selectedBusinessForProfile.name}</h3>
                                <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">{selectedBusinessForProfile.category}</p>
                            </div>
                        </div>

                        {selectedBusinessForProfile.description && (
                            <div className="bg-white/5 rounded-2xl p-4 mb-4">
                                <p className="text-sm text-slate-300 font-medium">{selectedBusinessForProfile.description}</p>
                            </div>
                        )}

                        {/* Horario de Atención */}
                        {(() => {
                            const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                            const today = dayNames[new Date().getDay()];
                            const todaySchedule = selectedBusinessForProfile.openingHours?.[today];
                            let statusBadge = null;
                            
                            if (todaySchedule && !todaySchedule.closed && todaySchedule.open && todaySchedule.close) {
                                const now = new Date();
                                const currentTime = now.getHours() * 60 + now.getMinutes();
                                const [openH, openM] = todaySchedule.open.split(':').map(Number);
                                const [closeH, closeM] = todaySchedule.close.split(':').map(Number);
                                const openTime = openH * 60 + openM;
                                const closeTime = closeH * 60 + closeM;
                                const isOpen = currentTime >= openTime && currentTime <= closeTime;
                                statusBadge = (
                                    <span className={`px-2 py-1 rounded-full text-[10px] font-black uppercase ${isOpen ? 'bg-green-500/20 text-green-400 border border-green-500/30' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                                        {isOpen ? 'ABIERTO' : 'CERRADO'}
                                    </span>
                                );
                            }
                            
                            return (
                                <div className="space-y-3 mb-4">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                            <Clock className="w-4 h-4" /> Horario de Atención
                                        </h4>
                                        {statusBadge}
                                    </div>
                                    <div className="bg-white/5 rounded-2xl p-4 space-y-2">
                                        {selectedBusinessForProfile.openingHours ? (
                                            Object.entries(selectedBusinessForProfile.openingHours).map(([day, schedule]) => (
                                                <div key={day} className="flex justify-between items-center">
                                                    <span className="text-xs font-bold text-slate-400 uppercase">{day}</span>
                                                    {schedule?.closed ? (
                                                        <span className="text-xs font-bold text-red-400">Cerrado</span>
                                                    ) : schedule?.open && schedule?.close ? (
                                                        <span className="text-xs font-bold text-white">{schedule.open} - {schedule.close}</span>
                                                    ) : (
                                                        <span className="text-xs font-bold text-slate-500">-</span>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-xs text-slate-500 text-center">Sin horario registrado</p>
                                        )}
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                </div>
            )}
            <CommunityBottomNav />
        </div>
    );
};

