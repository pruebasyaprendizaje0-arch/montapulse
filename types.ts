
export enum MapEntryType {
  BUSINESS = 'business',
  LANDMARK = 'landmark',
  SECTOR = 'sector'
}

export enum Sector {
  PLAYA = 'Playa',
  CENTRO = 'Centro',
  MONTANA = 'Montaña',
  NORTE = 'Norte',
  SUR = 'Sur',
  ESTE = 'Este',
  OESTE = 'Oeste'
}

export interface CommunityComment {
  id: string;
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  text: string;
  timestamp: any;
}

export interface CommunityPost {
  id: string;
  authorId: string;
  authorName: string;
  authorRole?: string;
  authorAvatar?: string;
  content: string;
  imageUrl?: string;
  timestamp: any;
  likes: string[]; // IDs de usuarios que dieron like
  likesCount: number;
  comments: CommunityComment[];
  commentsCount: number;
  locality?: string;
  isFeatured?: boolean;
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
  AVENTURA = 'Aventura',
  ROMANCE = 'Romance',
  CULTURA = 'Cultura',
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
  HIDRATACION = 'Punto de Hidratación',
  HOSPITAL = 'Hospital / Salud',
  OTRO = 'Otro'
}

export enum SubscriptionPlan {
  FREE = 'Free',
  PRO = 'Pro',
  ELITE = 'Elite',
  EXPERT = 'Expert'
}

export interface PlanFeatureDefinition {
  text: string;
  description?: string;
  isIncluded?: boolean;
  highlight?: boolean;
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
  points?: number;
  rating?: number;
  reviewCount?: number;
  // Subscription tracking
  subscriptionEndDate?: number;
  paymentStatus?: 'pending' | 'active' | 'expired';
  // Event/Announcement quota tracking
  monthlyEventCount?: number;
  monthlyAnnouncementCount?: number;
  lastEventResetDate?: number;
  lastAnnouncementResetDate?: number;
  isBanned?: boolean;
}

export interface Business {
  id: string;
  slug?: string;
  name: string;
  sector: Sector;
  locality?: string;
  description: string;
  services?: string[];
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
  eventCredits?: number;
  subscriptionEndDate?: string;
  monthlyEventCount?: number;
  lastResetDate?: string;
  isPublished?: boolean;
  followerCount?: number;
  reviewCount?: number;
  rating?: number;
  isReference?: boolean;
  plannerCategory?: 'hospedaje' | 'comida' | 'baile' | 'surf' | null;
  isFeatured?: boolean;
  featuredBannerUrl?: string;
  isDeleted?: boolean;
  deletedAt?: any;
  viewCount?: number;
  clickCount?: number;
  weeklyViews?: number;
  paymentStatus?: 'pending' | 'completed' | 'active' | 'expired';
  hasMilitaryBenefit?: boolean;
  emblematicServices?: string[];
  openingHours?: {
    [key: string]: { open: string; close: string; closed?: boolean } | null;
  };
  moods?: Vibe[];
  mapType?: MapEntryType;
}

export interface ProfileReview {
  id?: string;
  targetId: string; // Puede ser businessId o userId
  targetType: 'business' | 'user';
  userId: string;
  userName: string;
  userAvatar?: string;
  rating: number;
  comment: string;
  timestamp?: any;
}

export interface MontanitaEvent {
  id: string;
  slug?: string;
  businessId: string;
  title: string;
  name?: string; // For compatibility
  locality?: string;
  description: string;
  startAt: any; // Using any to handle Firestore Timestamp vs Date
  endAt: any;
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
  isFeatured?: boolean;
  status?: 'active' | 'readonly' | 'deactivated';
  clickCount?: number;
  weeklyClicks?: number;
  weeklyViews?: number;
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
  scheduledAt?: any;
  likes?: string[];
  likesCount?: number;
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
  unreadCounts?: Record<string, number>;
  status?: 'new_order' | 'completed' | 'pending_payment' | 'orange' | 'green' | 'none';
  isChannel?: boolean;
  locality?: string;
  description?: string;
}

export interface PulseNotification {
  id: string;
  userId: string;
  title: string;
  message?: string;
  body?: string;
  type: 'system' | 'community' | 'offer' | 'alert' | 'evento' | 'coupon';
  priority?: 'normal' | 'urgent';
  read: boolean;
  createdAt: any;
  businessId?: string;
  postId?: string;
  senderName?: string;
  imageUrl?: string;
  businessAvatar?: string;
  scheduledAt?: any;
  metadata?: any;
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
 | 'services'
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

export interface Announcement {
  id: string;
  text: string;
  senderId: string;
  senderName: string;
  senderAvatar?: string;
  imageUrl?: string;
  timestamp: any;
  recipientCount: number;
  type: 'system' | 'offer' | 'alert' | 'info' | 'ventas' | 'novedad' | 'atencion' | 'urgente' | 'evento';
  target?: string;
  locality?: string;
  vibe?: Vibe;
  expiresAt?: any;
  scheduledAt?: any;
  roomMessages?: { roomId: string, messageId: string }[];
}

export interface AppSettings {
  id: string;
  maintenanceMode: boolean;
  welcomeMessage: string;
  featuredEventId: string | null;
  minVersion: string;
  updatedAt: any;
  updatedBy: string;
  allowLocalityCreation?: boolean;
  openrouterModel?: string;
}

// ==================== COUPONS ====================

export type CouponType = 'percentage' | 'fixed_amount';

export interface Coupon {
  id: string;
  businessId: string;
  ownerId: string;             // UID del dueño del negocio
  businessName?: string;
  code: string;                // Slug único uppercase (ej: "SURF20")
  type: CouponType;            // 'percentage' | 'fixed_amount'
  value: number;               // 20 (para 20%) o 5.00 (para $5)
  description?: string;
  expiresAt: any;              // Firestore Timestamp
  maxUses: number;             // Límite total de usos (0 = ilimitado)
  currentUses: number;         // Contador de redenciones
  minPurchase: number;         // Monto mínimo de compra ($)
  isActive: boolean;
  requiresProximity: boolean;  // Geovallado activo
  proximityRadius: number;     // Radio en metros (default 500)
  createdAt: any;
  updatedAt?: any;
}


export interface CouponRedemption {
  id: string;
  couponId: string;
  ownerId: string;             // UID del dueño del negocio (para reglas de seguridad)
  couponCode: string;      // El código base del cupón (ej: "SURF20")
  couponValue: number;     // Valor denormalizado (ej: 20)
  couponType: CouponType;  // Tipo denormalizado (ej: 'percentage')
  userId: string;
  userName?: string;
  businessId: string;
  businessName?: string;
  businessLogo?: string;
  status: 'reserved' | 'redeemed' | 'expired' | 'cancelled';
  reservationCode: string; // El código único generado para el canje (ej: "MT-452")
  reservedAt: any;         // Fecha de obtención/reserva
  expiresAt: any;          // Fecha límite para canjear en el local
  redeemedAt?: any;        // Fecha de "quema" en el local
  validatedBy?: string;    // ID del negocio/encargado que validó
}

// ==================== LEADS & PROSPECTING ====================

export interface Lead {
  id?: string;
  name: string;
  category: BusinessCategory;
  sector: Sector;
  locality: string;
  contact?: string;
  status: 'new' | 'contacted' | 'interested' | 'converted' | 'rejected';
  notes?: string;
  aiPitch?: string;
  createdAt: any;
  updatedAt?: any;
}

