
import { Sector, Vibe, Business, MontanitaEvent } from './types';

export const SECTOR_INFO = {
  [Sector.PLAYA]: {
    color: 'text-blue-400',
    hex: '#60a5fa',
    bg: 'bg-blue-400/20',
    symbol: '🏖️',
    description: 'Deportes, sol y brisa marina'
  },
  [Sector.CENTRO]: {
    color: 'text-rose-500',
    hex: '#f43f5e',
    bg: 'bg-rose-500/20',
    symbol: '🍹',
    description: 'Vida nocturna y Calle de los Cócteles'
  },
  [Sector.TIGRILLO]: {
    color: 'text-violet-500',
    hex: '#8b5cf6',
    bg: 'bg-violet-500/20',
    symbol: '⛰️',
    description: 'Vistas panorámicas y sendas ecológicas'
  },
  [Sector.LA_PUNTA]: {
    color: 'text-cyan-500',
    hex: '#06b6d4',
    bg: 'bg-cyan-500/20',
    symbol: '🏄‍♂️',
    description: 'Surf, atardeceres y ambiente chill'
  },
  [Sector.MONTANA]: {
    color: 'text-emerald-500',
    hex: '#10b981',
    bg: 'bg-emerald-500/20',
    symbol: '🌿',
    description: 'Yoga, bienestar y zona de silencio'
  }
};

// Simplified polygon coordinates for Montañita sectors
export const SECTOR_POLYGONS = {
  [Sector.PLAYA]: [
    [-1.8285, -80.7565],
    [-1.8245, -80.7565],
    [-1.8225, -80.7585],
    [-1.8195, -80.7605],
    [-1.8195, -80.7635],
    [-1.8285, -80.7605]
  ] as [number, number][],
  [Sector.CENTRO]: [
    [-1.8285, -80.7555],
    [-1.8245, -80.7555],
    [-1.8245, -80.7515],
    [-1.8285, -80.7515]
  ] as [number, number][],
  [Sector.TIGRILLO]: [
    [-1.8330, -80.7510],
    [-1.8290, -80.7510],
    [-1.8290, -80.7450],
    [-1.8330, -80.7450]
  ] as [number, number][],
  [Sector.LA_PUNTA]: [
    [-1.8240, -80.7620],
    [-1.8180, -80.7620],
    [-1.8180, -80.7560],
    [-1.8240, -80.7560]
  ] as [number, number][],
  [Sector.MONTANA]: [
    [-1.8245, -80.7515],
    [-1.8185, -80.7515],
    [-1.8185, -80.7455],
    [-1.8245, -80.7455]
  ] as [number, number][]
};

export const MOCK_BUSINESSES: Business[] = [
  {
    id: 'ref-playa',
    name: 'Zona Playa',
    sector: Sector.PLAYA,
    description: 'Malecón y costa: El pulso del mar y los deportes.',
    icon: 'palmtree',
    isVerified: true,
    coordinates: [-1.8282, -80.7570],
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ref-centro',
    name: 'Zona Centro',
    sector: Sector.CENTRO,
    description: 'El corazón de Montañita: Calle de los Cócteles y vida nocturna.',
    icon: 'music',
    isVerified: true,
    coordinates: [-1.8270, -80.7535],
    imageUrl: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ref-tigrillo',
    name: 'Sector Montaña',
    sector: Sector.TIGRILLO,
    description: 'Vistas Panorámicas: El punto más alto del Pulso.',
    icon: 'mountain',
    isVerified: true,
    coordinates: [-1.8305, -80.7490],
    imageUrl: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ref-punta',
    name: 'La Punta',
    sector: Sector.LA_PUNTA,
    description: 'Surf Point: Olas legendarias y atardeceres épicos.',
    icon: 'waves',
    isVerified: true,
    coordinates: [-1.8210, -80.7585],
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ref-montana',
    name: 'Sector Tigrillo',
    sector: Sector.MONTANA,
    description: 'Eco-zona: Senderos, paz y reconexión con la naturaleza.',
    icon: 'leaf',
    isVerified: true,
    coordinates: [-1.8195, -80.7470],
    imageUrl: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ref-iglesia',
    name: 'Iglesia de Montañita',
    sector: Sector.CENTRO,
    description: 'Punto de encuentro icónico en el centro.',
    icon: 'church',
    isVerified: true,
    coordinates: [-1.8278, -80.7540],
    imageUrl: 'https://images.unsplash.com/photo-1548625361-195fd01a35fe?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ref-clp',
    name: 'Terminal de Bus CLP',
    sector: Sector.CENTRO,
    description: 'Llegada y salida de buses (Terminal Principal).',
    icon: 'bus',
    isVerified: true,
    coordinates: [-1.8290, -80.7530],
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ref-escuela-surf',
    name: 'Escuela de Surf',
    sector: Sector.LA_PUNTA,
    description: 'Aprende a domar las olas de La Punta.',
    icon: 'surf',
    isVerified: true,
    coordinates: [-1.8215, -80.7590],
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=400'
  },
  {
    id: 'ref-parada-comida',
    name: 'Zona de Comida',
    sector: Sector.PLAYA,
    description: 'Delicias locales frente al mar.',
    icon: 'food',
    isVerified: true,
    coordinates: [-1.8285, -80.7560],
    imageUrl: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&q=80&w=400'
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
