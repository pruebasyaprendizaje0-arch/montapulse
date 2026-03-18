import React, { useState, useEffect, useRef } from 'react';
import { Send, ChevronLeft, MoreVertical, Image as ImageIcon, Smile, Paperclip, Check, CheckCheck, MessageCircle, Building2, User, ChevronDown, Zap, X, Camera, Upload, Search, Trash2 } from 'lucide-react';
import { ChatRoom as ChatRoomType, ChatMessage } from '../../types';
import { sendRoomMessage, subscribeToRoomMessages } from '../../services/firestoreService';
import { useAuthContext } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { SubscriptionPlan } from '../../types';
import { compressImage } from '../../utils/imageUtils';

interface ChatRoomProps {
    room: ChatRoomType;
    onBack: () => void;
}

const EMOJI_LIST = ['😀', '😎', '🔥', '❤️', '🎉', '👍', '🙏', '💪', '🌟', '😂', '🥳', '😍', '🤔', '👀', '🚀', '💯', '✨', '🎸', '🍹', '🏖️', '🌴', '🍕', '🍔', '🎂', '🎁', '📸', '🏄', '🏊', '🚗', '🎯'];

export const ChatRoom: React.FC<ChatRoomProps> = ({ room, onBack }) => {
    const { user } = useAuthContext();
    const { businesses } = useData();
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [inputText, setInputText] = useState('');
    const [sendAsBusiness, setSendAsBusiness] = useState(false);
    const [showBusinessSelector, setShowBusinessSelector] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [showImageOptions, setShowImageOptions] = useState(false);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);
    const [showOptionsMenu, setShowOptionsMenu] = useState(false);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const userBusiness = user?.businessId ? businesses.find(b => b.id === user.businessId) : null;
    const userPlan = user?.plan || SubscriptionPlan.VISITOR;
    const canSendAsBusiness = userBusiness && userPlan === SubscriptionPlan.PREMIUM;
    const canUsePremiumFeatures = userPlan === SubscriptionPlan.PREMIUM;

    useEffect(() => {
        const unsubscribe = subscribeToRoomMessages(room.id, (newMessages) => {
            setMessages(newMessages);
        });
        return () => unsubscribe();
    }, [room.id]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = async () => {
        if (!inputText.trim() || !user) return;

        const isBusinessMsg = !!(sendAsBusiness && userBusiness);
        
        const messageData = {
            senderId: isBusinessMsg ? userBusiness.id : user.id,
            senderName: isBusinessMsg ? userBusiness.name : user.name,
            senderAvatar: isBusinessMsg ? userBusiness.imageUrl : user.avatarUrl,
            text: inputText,
            roomId: room.id,
            isBusinessMessage: isBusinessMsg
        };

        try {
            await sendRoomMessage(room.id, messageData);
            setInputText('');
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    const toggleSendAs = () => {
        if (canSendAsBusiness) {
            setSendAsBusiness(!sendAsBusiness);
        }
    };

    const handleEmojiSelect = (emoji: string) => {
        setInputText(prev => prev + emoji);
        setShowEmojiPicker(false);
    };

    const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file || !user) return;

        try {
            const compressed = await compressImage(file, { maxWidth: 800, maxHeight: 800 });
            setSelectedImage(compressed);
            setShowImageOptions(false);
        } catch (error) {
            console.error('Error processing image:', error);
        }
    };

    const handleSendWithImage = async () => {
        if (!user || (!inputText.trim() && !selectedImage)) return;

        const isBusinessMsg = !!(sendAsBusiness && userBusiness);
        
        const messageData = {
            senderId: isBusinessMsg ? userBusiness.id : user.id,
            senderName: isBusinessMsg ? userBusiness.name : user.name,
            senderAvatar: isBusinessMsg ? userBusiness.imageUrl : user.avatarUrl,
            text: inputText || (selectedImage ? '📷 Foto' : ''),
            imageUrl: selectedImage || undefined,
            roomId: room.id,
            isBusinessMessage: isBusinessMsg
        };

        try {
            await sendRoomMessage(room.id, messageData);
            setInputText('');
            setSelectedImage(null);
        } catch (error) {
            console.error('Failed to send message:', error);
        }
    };

    return (
        <div className="flex flex-col h-full bg-[#020617] text-white pb-20 lg:pb-0">
            {/* Header */}
            <div className="pt-6 lg:pt-14 pb-4 px-6 flex items-center gap-4 bg-slate-900/40 backdrop-blur-2xl border-b border-white/5 sticky top-0 z-20">
                <button onClick={onBack} className="p-2 -ml-2 text-slate-400 hover:text-white transition-all transform active:scale-90">
                    <ChevronLeft className="w-7 h-7" />
                </button>
                <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="relative">
                        <div className={`p-0.5 border-2 ${(room as any).isBusinessChat ? 'border-amber-500/30' : 'border-white/10'} ${room.type === 'direct' ? 'rounded-full' : 'rounded-2xl'}`}>
                            <img
                                src={(room as any).displayAvatar || room.avatar || 'https://i.pravatar.cc/100'}
                                alt={(room as any).displayName || room.name}
                                className={`w-11 h-11 object-cover ${room.type === 'direct' ? 'rounded-full' : 'rounded-[0.9rem]'}`}
                            />
                        </div>
                        {room.status === 'green' && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-[3px] border-slate-900 shadow-[0_0_10px_#10b981]" />
                        )}
                        {room.status === 'orange' && (
                            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-orange-500 rounded-full border-[3px] border-slate-900 shadow-[0_0_10px_#f97316]" />
                        )}
                    </div>
                    <div className="flex flex-col min-w-0">
                        <h2 className={`font-black text-base truncate tracking-tight ${(room as any).isBusinessChat ? 'text-amber-400' : 'text-white'}`}>
                            {(room as any).displayName || room.name}
                        </h2>
                        <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.15em]">
                                {room.type === 'group' ? 'Pulso Grupal' : 'En línea'}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="relative">
                    <button 
                        onClick={() => setShowOptionsMenu(!showOptionsMenu)}
                        className="p-2 text-slate-400 hover:text-white transition-colors"
                    >
                        <MoreVertical className="w-6 h-6" />
                    </button>
                    {showOptionsMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
                            {userPlan === SubscriptionPlan.PREMIUM && userBusiness && (
                                <div className="p-3 border-b border-white/10 bg-amber-500/10">
                                    <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest mb-2">Como enviar mensajes</p>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setSendAsBusiness(false); setShowOptionsMenu(false); }}
                                            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl transition-all ${!sendAsBusiness ? 'bg-white text-black' : 'bg-white/10 text-slate-400'}`}
                                        >
                                            <User className="w-4 h-4" />
                                            <span className="text-[10px] font-black">Persona</span>
                                        </button>
                                        <button
                                            onClick={() => { setSendAsBusiness(true); setShowOptionsMenu(false); }}
                                            className={`flex-1 flex items-center justify-center gap-2 p-2 rounded-xl transition-all ${sendAsBusiness ? 'bg-amber-500 text-white' : 'bg-white/10 text-slate-400'}`}
                                        >
                                            <Building2 className="w-4 h-4" />
                                            <span className="text-[10px] font-black">Negocio</span>
                                        </button>
                                    </div>
                                </div>
                            )}
                            <button 
                                onClick={() => {
                                    setShowOptionsMenu(false);
                                    alert('Función de perfilcoming soon');
                                }}
                                className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                            >
                                <User className="w-5 h-5 text-slate-400" />
                                <span className="text-sm font-bold text-white">Ver perfil</span>
                            </button>
                            <button 
                                onClick={() => {
                                    setShowOptionsMenu(false);
                                    alert('Función de búsqueda coming soon');
                                }}
                                className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                            >
                                <Search className="w-5 h-5 text-slate-400" />
                                <span className="text-sm font-bold text-white">Buscar en chat</span>
                            </button>
                            <button 
                                onClick={async () => {
                                    if (window.confirm('¿Estás seguro de que quieres eliminar todos los mensajes de este chat?')) {
                                        setShowOptionsMenu(false);
                                        alert('Función de limpiar chat coming soon');
                                    }
                                }}
                                className="w-full p-3 flex items-center gap-3 hover:bg-white/5 transition-colors text-left"
                            >
                                <Trash2 className="w-5 h-5 text-red-400" />
                                <span className="text-sm font-bold text-red-400">Limpiar chat</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto no-scrollbar px-6 py-8 space-y-8 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] bg-fixed opacity-95">
                {messages.length === 0 && (
                    <div className="flex flex-col items-center justify-center h-full space-y-4 opacity-30">
                        <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center border border-dashed border-white/20">
                            <MessageCircle className="w-8 h-8" />
                        </div>
                        <p className="text-xs font-black uppercase tracking-widest">Di hola para empezar</p>
                    </div>
                )}

                {messages.map((msg, idx) => {
                    const isMe = msg.senderId === user?.id || (userBusiness && msg.senderId === userBusiness.id);
                    const showAvatar = !isMe && (idx === 0 || messages[idx - 1].senderId !== msg.senderId);
                    const isFirstInGroup = idx === 0 || messages[idx - 1].senderId !== msg.senderId;
                    const isLastInGroup = idx === messages.length - 1 || messages[idx + 1].senderId !== msg.senderId;

                    return (
                        <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} group/msg animate-in fade-in slide-in-from-bottom-4 duration-500`}>
                            {!isMe && (
                                <div className="w-10 shrink-0 self-end mb-1">
                                    {showAvatar ? (
                                        <img src={msg.senderAvatar || 'https://i.pravatar.cc/100'} className="w-9 h-9 rounded-2xl border-2 border-white/10 shadow-xl" alt="" />
                                    ) : <div className="w-9" />}
                                </div>
                            )}

                            <div className={`flex flex-col gap-1.5 max-w-[80%] ${isMe ? 'items-end' : 'items-start'}`}>
                                {!isMe && showAvatar && (
                                    <div className="flex items-center gap-1 ml-2 mb-0.5">
                                        {msg.isBusinessMessage && (
                                            <span className="text-[8px] font-black text-amber-400 uppercase bg-amber-500/20 px-1.5 py-0.5 rounded">
                                                ★
                                            </span>
                                        )}
                                        <span className={`text-[10px] font-black uppercase tracking-widest ${msg.isBusinessMessage ? 'text-amber-400' : 'text-orange-500'}`}>
                                            {msg.senderName}
                                        </span>
                                        {msg.isBusinessMessage && (
                                            <span className="text-[8px] text-slate-600">• Negocio</span>
                                        )}
                                    </div>
                                )}

                                <div className={`relative px-5 py-3.5 rounded-[2rem] text-sm font-bold leading-relaxed shadow-2xl transition-all group-hover/msg:scale-[1.02] ${isMe
                                    ? 'bg-gradient-to-br from-orange-500 to-amber-600 text-white rounded-tr-sm shadow-orange-600/20'
                                    : 'bg-slate-800/80 backdrop-blur-md text-slate-100 rounded-tl-sm border border-white/5 shadow-black/40'
                                    }`}>
                                    {msg.imageUrl && (
                                        <img src={msg.imageUrl} alt="Imagen" className="max-w-full rounded-xl mb-2 border border-white/10" />
                                    )}
                                    {msg.text && <p>{msg.text}</p>}

                                    <div className={`mt-1.5 flex items-center gap-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                                        <span className={`text-[9px] font-black uppercase tracking-tighter opacity-50 ${isMe ? 'text-white' : 'text-slate-400'}`}>
                                            {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                        {isMe && <CheckCheck className="w-3 h-3 text-white/60" />}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Section */}
            <div className="px-6 py-4 bg-[#020617] border-t border-white/5 pb-4 lg:pb-6">
                {/* Business Toggle - Solo Premium con negocio */}
                {userBusiness && userBusiness.plan === SubscriptionPlan.PREMIUM ? (
                    <div className="mb-3">
                        <div className="flex items-center justify-between">
                            <span className="text-[10px] text-amber-500 font-black uppercase tracking-widest flex items-center gap-2">
                                <Zap className="w-3 h-3" /> Modo Premium
                            </span>
                            <div className="flex items-center gap-2">
                                <span className="text-[9px] text-slate-500">Enviar como:</span>
                                <button
                                    onClick={toggleSendAs}
                                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all ${sendAsBusiness ? 'bg-amber-500/40 border border-amber-500/60' : 'bg-slate-800 border border-white/10'}`}
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
                                    <ChevronDown className={`w-3 h-3 transition-transform ${sendAsBusiness ? 'text-amber-400' : 'text-slate-400'} ${showBusinessSelector ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                ) : userBusiness ? (
                    <div className="flex items-center gap-2 mb-3 px-2 bg-amber-500/5 border border-amber-500/10 rounded-xl p-2">
                        <Zap className="w-3 h-3 text-amber-500" />
                        <span className="text-[9px] text-amber-400 font-medium">Plan Básico: Upgrade a Premium para escribir como {userBusiness.name}</span>
                    </div>
                ) : null}
                <div className="flex items-center gap-3 bg-slate-900/80 backdrop-blur-2xl rounded-[2.5rem] p-2 border border-white/5 shadow-2xl group focus-within:border-orange-500/40 transition-all duration-500">
                    {sendAsBusiness && canSendAsBusiness && (
                        <div className="w-8 h-8 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
                            <Building2 className="w-4 h-4 text-amber-400" />
                        </div>
                    )}
                    <div className="relative">
                        <button 
                            onClick={() => { setShowEmojiPicker(!showEmojiPicker); setShowImageOptions(false); }}
                            className="p-3 text-slate-500 hover:text-orange-500 transition-colors transform active:scale-90"
                        >
                            <Smile className="w-6 h-6" />
                        </button>
                        {showEmojiPicker && (
                            <div className="absolute bottom-full left-0 mb-2 p-3 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl w-72">
                                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto">
                                    {EMOJI_LIST.map((emoji, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => handleEmojiSelect(emoji)}
                                            className="text-2xl hover:scale-125 transition-transform p-1"
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
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && (selectedImage ? handleSendWithImage() : handleSend())}
                        placeholder="Escribe un mensaje..."
                        className="flex-1 bg-transparent border-none focus:ring-0 text-sm font-black text-white placeholder:text-slate-600 py-3 px-1"
                    />
                    <div className="flex items-center gap-1 pr-1">
                        {selectedImage && (
                            <div className="relative">
                                <img src={selectedImage} alt="Preview" className="w-10 h-10 rounded-xl object-cover border border-amber-500/30" />
                                <button 
                                    onClick={() => setSelectedImage(null)}
                                    className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center"
                                >
                                    <X className="w-2 h-2 text-white" />
                                </button>
                            </div>
                        )}
                        <div className="relative">
                            <button 
                                onClick={() => { 
                                    if (canUsePremiumFeatures) {
                                        setShowImageOptions(!showImageOptions);
                                        setShowEmojiPicker(false);
                                    }
                                }}
                                className={`p-3 transition-colors transform active:scale-90 ${canUsePremiumFeatures ? 'text-slate-500 hover:text-slate-300' : 'text-slate-700 cursor-not-allowed'}`}
                            >
                                <Paperclip className="w-5 h-5" />
                            </button>
                            {showImageOptions && (
                                <div className="absolute bottom-full right-0 mb-2 p-3 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl flex gap-2">
                                    <button 
                                        onClick={() => cameraInputRef.current?.click()}
                                        className="p-3 bg-orange-500/20 rounded-xl hover:bg-orange-500/30 transition-colors"
                                    >
                                        <Camera className="w-5 h-5 text-orange-400" />
                                    </button>
                                    <button 
                                        onClick={() => imageInputRef.current?.click()}
                                        className="p-3 bg-amber-500/20 rounded-xl hover:bg-amber-500/30 transition-colors"
                                    >
                                        <Upload className="w-5 h-5 text-amber-400" />
                                    </button>
                                </div>
                            )}
                        </div>
                        <input 
                            type="file" 
                            ref={imageInputRef} 
                            accept="image/*" 
                            className="hidden" 
                            onChange={handleImageSelect}
                        />
                        <input 
                            type="file" 
                            ref={cameraInputRef} 
                            accept="image/*" 
                            capture="environment"
                            className="hidden" 
                            onChange={handleImageSelect}
                        />
                        <button
                            onClick={() => selectedImage ? handleSendWithImage() : handleSend()}
                            disabled={!inputText.trim() && !selectedImage}
                            className={`w-12 h-12 rounded-[1.5rem] flex items-center justify-center transition-all duration-500 ${inputText.trim() || selectedImage
                                ? 'bg-gradient-to-tr from-orange-500 to-amber-600 text-white shadow-xl shadow-orange-500/30 active:scale-90 rotate-0'
                                : 'bg-slate-800 text-slate-600 cursor-not-allowed opacity-50'
                                }`}
                        >
                            <Send className={`w-5 h-5 transition-transform ${inputText.trim() ? '-rotate-12 group-hover:rotate-0' : ''}`} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

