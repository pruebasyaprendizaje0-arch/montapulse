
import { Sector, Vibe, Business, MontanitaEvent, SubscriptionPlan } from './types';

export const LOCALITIES = [
  { name: 'Montañita', coords: [-1.8253, -80.7523] as [number, number] },
  { name: 'Olón', coords: [-1.7967, -80.7633] as [number, number] },
  { name: 'Manglaralto', coords: [-1.8536, -80.7497] as [number, number] }
];

export const LOCALITY_SECTORS: Record<string, Sector[]> = {
  'Montañita': [Sector.CENTRO, Sector.PLAYA, Sector.LA_PUNTA, Sector.TIGRILLO, Sector.MONTANA],
  'Olón': [Sector.CENTRO, Sector.PLAYA, Sector.MONTANA],
  'Manglaralto': [Sector.CENTRO, Sector.PLAYA, Sector.MONTANA]
};

export const SECTOR_INFO = {
  [Sector.PLAYA]: {
    color: 'text-blue-400',
    hex: '#60a5fa',
    bg: 'bg-blue-400/20',
    symbol: '🏖️',
    description: 'Sol, brisa y relax frente al mar'
  },
  [Sector.CENTRO]: {
    color: 'text-rose-500',
    hex: '#f43f5e',
    bg: 'bg-rose-500/20',
    symbol: '🍹',
    description: 'El corazón del movimiento y la cultura local'
  },
  [Sector.TIGRILLO]: {
    color: 'text-violet-500',
    hex: '#8b5cf6',
    bg: 'bg-violet-500/20',
    symbol: '⛰️',
    description: 'Naturaleza y vistas panorámicas'
  },
  [Sector.LA_PUNTA]: {
    color: 'text-cyan-500',
    hex: '#06b6d4',
    bg: 'bg-cyan-500/20',
    symbol: '🏄‍♂️',
    description: 'Surf point y atardeceres épicos'
  },
  [Sector.MONTANA]: {
    color: 'text-emerald-500',
    hex: '#10b981',
    bg: 'bg-emerald-500/20',
    symbol: '🌿',
    description: 'Paz, senderos y reconexión ambiental'
  },
  [Sector.OLON]: {
    color: 'text-orange-400',
    hex: '#fb923c',
    bg: 'bg-orange-400/20',
    symbol: '🏘️',
    description: 'Gastronomía y descanso familiar en Olón'
  },
  [Sector.MANGLARALTO]: {
    color: 'text-indigo-400',
    hex: '#818cf8',
    bg: 'bg-indigo-400/20',
    symbol: '🛶',
    description: 'Tradición y naturaleza en Manglaralto'
  }
};

// Simplified polygon coordinates for Montañita sectors
export const LOCALITY_POLYGONS: Record<string, Partial<Record<Sector, [number, number][]>>> = {
  'Montañita': {
    [Sector.PLAYA]: [[-1.8285, -80.7565], [-1.8245, -80.7565], [-1.8225, -80.7585], [-1.8195, -80.7605], [-1.8195, -80.7635], [-1.8285, -80.7605]] as [number, number][],
    [Sector.CENTRO]: [[-1.8285, -80.7555], [-1.8245, -80.7555], [-1.8245, -80.7515], [-1.8285, -80.7515]] as [number, number][],
    [Sector.TIGRILLO]: [[-1.8330, -80.7510], [-1.8290, -80.7510], [-1.8290, -80.7450], [-1.8330, -80.7450]] as [number, number][],
    [Sector.LA_PUNTA]: [[-1.8240, -80.7620], [-1.8180, -80.7620], [-1.8180, -80.7560], [-1.8240, -80.7560]] as [number, number][],
    [Sector.MONTANA]: [[-1.8245, -80.7515], [-1.8185, -80.7515], [-1.8185, -80.7455], [-1.8245, -80.7455]] as [number, number][],
  },
  'Olón': {
    [Sector.CENTRO]: [[-1.7987, -80.7643], [-1.7947, -80.7643], [-1.7947, -80.7623], [-1.7987, -80.7623]] as [number, number][],
    [Sector.PLAYA]: [[-1.8000, -80.7670], [-1.7920, -80.7670], [-1.7920, -80.7640], [-1.8000, -80.7640]] as [number, number][],
    [Sector.MONTANA]: [[-1.7980, -80.7620], [-1.7920, -80.7620], [-1.7920, -80.7580], [-1.7980, -80.7580]] as [number, number][],
  },
  'Manglaralto': {
    [Sector.CENTRO]: [[-1.8545, -80.7525], [-1.8505, -80.7525], [-1.8505, -80.7485], [-1.8545, -80.7485]] as [number, number][],
    [Sector.PLAYA]: [[-1.8580, -80.7560], [-1.8520, -80.7560], [-1.8520, -80.7510], [-1.8580, -80.7510]] as [number, number][],
  }
};

// For backward compatibility during migration
export const SECTOR_POLYGONS = LOCALITY_POLYGONS['Montañita'] as Record<Sector, [number, number][]>;

export const MOCK_BUSINESSES: Business[] = [
  {
    id: 'ref-playa',
    name: 'Zona Playa',
    sector: Sector.PLAYA,
    description: 'Malecón y costa: El pulso del mar y los deportes.',
    icon: 'palmtree',
    isVerified: true,
    coordinates: [-1.8282, -80.7570],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Montañita'
  },
  {
    id: 'ref-centro',
    name: 'Zona Centro',
    sector: Sector.CENTRO,
    description: 'El corazón de Montañita: Calle de los Cócteles y vida nocturna.',
    icon: 'music',
    isVerified: true,
    coordinates: [-1.8270, -80.7535],
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Montañita'
  },
  {
    id: 'ref-tigrillo',
    name: 'Sector Montaña',
    sector: Sector.TIGRILLO,
    description: 'Vistas Panorámicas: El punto más alto del Pulso.',
    icon: 'mountain',
    isVerified: true,
    coordinates: [-1.8305, -80.7490],
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Montañita'
  },
  {
    id: 'ref-punta',
    name: 'La Punta',
    sector: Sector.LA_PUNTA,
    description: 'Surf Point: Olas legendarias y atardeceres épicos.',
    icon: 'waves',
    isVerified: true,
    coordinates: [-1.8210, -80.7585],
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Montañita'
  },
  {
    id: 'ref-montana',
    name: 'Sector Tigrillo',
    sector: Sector.MONTANA,
    description: 'Eco-zona: Senderos, paz y reconexión con la naturaleza.',
    icon: 'leaf',
    isVerified: true,
    coordinates: [-1.8195, -80.7470],
    imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Montañita'
  },
  {
    id: 'ref-iglesia',
    name: 'Iglesia de Montañita',
    sector: Sector.CENTRO,
    description: 'Punto de encuentro icónico en el centro.',
    icon: 'church',
    isVerified: true,
    coordinates: [-1.8278, -80.7540],
    imageUrl: 'https://images.unsplash.com/photo-1548625361-195fd01a35fe?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Montañita'
  },
  {
    id: 'ref-clp',
    name: 'Terminal de Bus CLP',
    sector: Sector.CENTRO,
    description: 'Llegada y salida de buses (Terminal Principal).',
    icon: 'bus',
    isVerified: true,
    coordinates: [-1.8290, -80.7530],
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Montañita'
  },
  {
    id: 'ref-escuela-surf',
    name: 'Escuela de Surf',
    sector: Sector.LA_PUNTA,
    description: 'Aprende a domar las olas de La Punta.',
    icon: 'surf',
    isVerified: true,
    coordinates: [-1.8215, -80.7590],
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Montañita'
  },
  {
    id: 'ref-parada-comida',
    name: 'Zona de Comida',
    sector: Sector.PLAYA,
    description: 'Delicias locales frente al mar.',
    icon: 'food',
    isVerified: true,
    coordinates: [-1.8285, -80.7560],
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Montañita'
  },
  {
    id: 'ref-olon-centro',
    name: 'Momos Olón',
    sector: Sector.CENTRO,
    description: 'El punto de encuentro en el corazón de Olón.',
    icon: 'music',
    isVerified: true,
    coordinates: [-1.7972, -80.7630],
    imageUrl: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Olón'
  },
  {
    id: 'ref-olon-playa',
    name: 'Olón Beach Club',
    sector: Sector.PLAYA,
    description: 'Relájate frente a las amplias playas de Olón.',
    icon: 'palmtree',
    isVerified: true,
    coordinates: [-1.7985, -80.7645],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Olón'
  },
  {
    id: 'ref-manglar-centro',
    name: 'Centro Manglaralto',
    sector: Sector.CENTRO,
    description: 'Tradición y cultura en el centro de Manglaralto.',
    icon: 'church',
    isVerified: true,
    coordinates: [-1.8545, -80.7505],
    imageUrl: 'https://images.unsplash.com/photo-1518391846015-55a9cc003b25?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Manglaralto'
  },
  {
    id: 'ref-manglar-playa',
    name: 'Beach Bar Manglar',
    sector: Sector.PLAYA,
    description: 'Siente la brisa en la tranquila playa de Manglaralto.',
    icon: 'waves',
    isVerified: true,
    coordinates: [-1.8560, -80.7525],
    imageUrl: 'https://images.unsplash.com/photo-1519046904884-53103b34b206?auto=format&fit=crop&q=80&w=400',
    plan: SubscriptionPlan.BASIC,
    locality: 'Manglaralto'
  }
];

const now = new Date();
const todayAt = (h: number) => {
  const d = new Date(now);
  d.setHours(h, 0, 0, 0);
  return d;
};

export const MOCK_EVENTS: MontanitaEvent[] = [
  {
    id: 'e1',
    businessId: 'Lost Beach Club',
    title: 'Techno Sunrise Session',
    description: 'The legendary after-party on the main deck. Feel the ocean breeze as the sun comes up.',
    startAt: todayAt(2),
    endAt: todayAt(7),
    category: 'Nightlife',
    vibe: Vibe.TECHNO,
    sector: Sector.CENTRO,
    imageUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?auto=format&fit=crop&q=80&w=600',
    interestedCount: 124
  },
  {
    id: 'e2',
    businessId: 'Balsa Surf Camp',
    title: 'Sunset Surf Open',
    description: 'Friendly competition for all levels. BBQ and live music after the final heat.',
    startAt: todayAt(17),
    endAt: todayAt(19),
    category: 'Sports',
    vibe: Vibe.ADRENALINA,
    sector: Sector.LA_PUNTA,
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=600',
    interestedCount: 45
  },
  {
    id: 'e3',
    businessId: 'Casa del Sol',
    title: 'Full Moon Yoga Flow',
    description: 'A special evening practice under the stars in Tigrillo zone.',
    startAt: todayAt(20),
    endAt: todayAt(22),
    category: 'Wellness',
    vibe: Vibe.WELLNESS,
    sector: Sector.TIGRILLO,
    imageUrl: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&q=80&w=600',
    interestedCount: 22
  }
];
export const PLAN_LIMITS = {
  [SubscriptionPlan.BASIC]: 2,
  [SubscriptionPlan.PREMIUM]: 20,
  [SubscriptionPlan.VISITOR]: 0
};

export const PLAN_PRICES = {
  [SubscriptionPlan.BASIC]: 0,
  [SubscriptionPlan.PREMIUM]: 10,
  [SubscriptionPlan.VISITOR]: 0
};

export const DEFAULT_PAYMENT_DETAILS = {
  bankName: "Banco Pichincha",
  accountType: "Cuenta de Ahorros",
  accountNumber: "2201938384",
  accountOwner: "Montapulse S.A.",
  idNumber: "1792938485001",
  whatsappNumber: "593980000000",
  bankRegion: "Pichincha (Ecuador)"
};

export const MAP_ICONS = [
  { id: 'palmtree', emoji: '🏖️', label: 'Playa' },
  { id: 'music', emoji: '🍹', label: 'Fiesta' },
  { id: 'leaf', emoji: '🌿', label: 'Naturaleza' },
  { id: 'waves', emoji: '🏄‍♂️', label: 'Surf' },
  { id: 'mountain', emoji: '⛰️', label: 'Montaña' },
  { id: 'surf', emoji: '🏄', label: 'Deporte' },
  { id: 'hotel', emoji: '🏨', label: 'Hospedaje' },
  { id: 'food', emoji: '🍕', label: 'Comida' },
  { id: 'church', emoji: '⛪', label: 'Cultura' },
  { id: 'bus', emoji: '🚌', label: 'Transporte' },
  { id: 'shopping', emoji: '🛍️', label: 'Compras' },
  { id: 'park', emoji: '🌳', label: 'Parque' },
  { id: 'cocktail', emoji: '🍸', label: 'Bar' },
  { id: 'coffee', emoji: '☕', label: 'Café' },
  { id: 'camera', emoji: '📸', label: 'Mirador' }
];
