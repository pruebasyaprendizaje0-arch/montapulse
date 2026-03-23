
export enum Sector {
  PLAYA = 'Playa',
  CENTRO = 'Centro',
  MONTANA = 'Montaña'
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  content: string;
  imageUrl?: string;
  timestamp: string;
  likes: number;
  comments: number;
}

export enum Vibe {
  ADRENALINA = 'Adrenalina',
  RELAX = 'Relax',
  TECHNO = 'Techno',
  FAMILIA = 'Familia',
  WELLNESS = 'Wellness',
  FIESTA = 'Fiesta',
  SURF = 'Surf',
  GASTRONOMIA = 'Gastronomía',
  FUTBOL = 'Fútbol',
  OTRO = 'Otro'
}

export enum BusinessCategory {
  RESTAURANTE = 'Restaurante',
  BAR_DISCOTECA = 'Bar / Discoteca',
  HOSPAJE = 'Hospedaje',
  CENTRO_SURF = 'Centro de Surf',
  TOUR_OPERATOR = 'Operador Turistico',
  SHOPPING = 'Tienda / Shopping',
  TRANSPORT = 'Transporte / Taxi',
  BAR = 'Bar',
  DISCOTECA = 'Discoteca',
  HOTEL = 'Hotel',
  HOSTAL = 'Hostal',
  ESCUELA_SURF = 'Escuela de Surf',
  REFERENCIA = 'Punto de Referencia',
  PARQUE = 'Parque',
  CANCHA = 'Cancha',
  MALECON = 'Malecón',
  MERCADO = 'Mercado',
  PARADA_TAXI = 'Parada de Taxis',
  PLAYA = 'Playa',
  OTRO = 'Otro'
}

export enum SubscriptionPlan {
  VISITOR = 'Visitor',
  BASIC = 'Básico',
  PREMIUM = 'Premium'
}

export interface UserProfile {
  id: string;
  name: string;
  surname: string;
  email: string;
  preferredVibe: Vibe;
  role: 'visitor' | 'host' | 'admin';
  avatarUrl?: string;
  businessId?: string;
  plan: SubscriptionPlan;
  pulsePassActive?: boolean;
  locality?: string;
  acceptedTerms?: boolean;
}

export interface Business {
  id: string;
  name: string;
  sector: Sector;
  locality?: string;
  description: string;
  icon?: string;
  isVerified: boolean;
  coordinates: [number, number];
  location?: { lat: number; lng: number }; // For compatibility
  imageUrl: string;
  category: BusinessCategory;
  email?: string;
  whatsapp?: string;
  phone?: string;
  instagram?: string;
  ownerId?: string;
  plan: SubscriptionPlan;
  monthlyEventCount?: number;
  lastResetDate?: string;
  isPublished?: boolean;
  followerCount?: number;
  reviewCount?: number;
  rating?: number;
  isReference?: boolean;
  plannerCategory?: 'hospedaje' | 'comida' | 'baile' | 'surf' | null;
}

export interface MontanitaEvent {
  id: string;
  businessId: string;
  title: string;
  locality?: string;
  description: string;
  startAt: Date;
  endAt: Date;
  category: string;
  vibe: Vibe;
  sector: Sector;
  imageUrl: string;
  interestedCount: number;
  coordinates?: [number, number];
  isFlashOffer?: boolean;
  isPremium?: boolean;
  viewCount?: number;
  ownerId?: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  text: string;
  imageUrl?: string;
  timestamp: any;
  roomId: string;
  isBusinessMessage?: boolean;
}

export interface ChatRoom {
  id: string;
  name: string;
  type: 'group' | 'direct';
  participants: string[];
  lastMessage?: string;
  lastMessageTime?: any;
  avatar?: string;
  unreadCount?: number;
  status?: 'orange' | 'green' | 'none';
}

export interface BusinessReview {
  id?: string;
  businessId: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  timestamp?: any;
}

export interface PulseNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'system' | 'community' | 'offer';
  read: boolean;
  createdAt: any;
}

export interface ServiceItem {
  name: string;
  desc: string;
  contact: string;
}

export interface ServiceCategory {
  title: string;
  icon: string;
  color: string;
  bg: string;
  items: ServiceItem[];
}

export interface HelpSupportItem {
  id: string;
  label: string;
  type: 'email' | 'whatsapp' | 'link' | 'toast';
  value: string;
  icon: string;
}

export interface HelpSupportSettings {
  items: HelpSupportItem[];
}

export type AgendaRange = 'day' | 'week' | 'month';

export type ViewType = 'explore' | 'calendar' | 'favorites' | 'host' | 'history' | 'all-favorites' | 'plans' | 'community' | 'chat'    | 'admin-users'
    | 'policies'
 | 'info';

export interface PolicySection {
  title: string;
  content: string;
}

export interface PolicyData {
  lastUpdated: string;
  version: string;
  terms: PolicySection[];
  privacy: PolicySection[];
  disclaimer: string;
  supportEmail: string;
}
