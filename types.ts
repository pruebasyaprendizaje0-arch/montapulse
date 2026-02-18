
export enum Sector {
  PLAYA = 'Playa',
  CENTRO = 'Centro',
  TIGRILLO = 'El Tigrillo',
  LA_PUNTA = 'La Punta',
  MONTANA = 'Montaña',
  OLON = 'Olón',
  MANGLARALTO = 'Manglaralto'
}

export enum Vibe {
  ADRENALINA = 'Adrenalina',
  RELAX = 'Relax',
  TECHNO = 'Techno',
  FAMILIA = 'Familia',
  WELLNESS = 'Wellness',
  FIESTA = 'Fiesta'
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
  imageUrl: string;
  whatsapp?: string;
  phone?: string;
  plan: SubscriptionPlan;
  monthlyEventCount?: number;
  lastResetDate?: string; // To track when the monthly count should reset
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
}

export type ViewType = 'explore' | 'calendar' | 'favorites' | 'host' | 'history' | 'all-favorites' | 'plans';
