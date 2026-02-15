
export enum Sector {
  PLAYA = 'Playa',
  CENTRO = 'Centro',
  TIGRILLO = 'Montaña',
  LA_PUNTA = 'La Punta',
  MONTANA = 'El Tigrillo'
}

export enum Vibe {
  ADRENALINA = 'Adrenalina',
  RELAX = 'Relax',
  TECHNO = 'Techno',
  FAMILIA = 'Familia',
  WELLNESS = 'Wellness',
  FIESTA = 'Fiesta'
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  preferredVibe: Vibe;
  role: 'visitor' | 'host' | 'admin';
  avatarUrl?: string;
  businessId?: string; // Optional: Links a host user to their business
}

export interface Business {
  id: string;
  name: string;
  sector: Sector;
  description: string;
  icon?: string; // Icon name or SVG path
  isVerified: boolean;
  coordinates: [number, number]; // [lat, lng]
  imageUrl: string;
  whatsapp?: string; // WhatsApp number
  phone?: string; // Phone number
}

export interface MontanitaEvent {
  id: string;
  businessId: string;
  title: string;
  description: string;
  startAt: Date;
  endAt: Date;
  category: string;
  vibe: Vibe;
  sector: Sector;
  imageUrl: string;
  interestedCount: number;
}

export type ViewType = 'explore' | 'calendar' | 'favorites' | 'host' | 'history' | 'all-favorites';
