import { Sector, Vibe, Business, MontanitaEvent, SubscriptionPlan, BusinessCategory, PolicyData, PlanFeatureDefinition, Landmark } from './types';
export type { PlanFeatureDefinition };

export const DEFAULT_MASTER_CATEGORIES = [
  { name: 'Gastronomía & Restaurantes', icon: 'Utensils', color: '#f97316', label: 'Gastronomía & Restaurantes', desc: 'Comida típica, internacional, mariscos, pizzerías y comida al paso' },
  { name: 'Bares & Vida Nocturna', icon: 'PartyPopper', color: '#ec4899', label: 'Bares & Vida Nocturna', desc: 'Bares de playa, coctelerías, discotecas, pubs y música en vivo' },
  { name: 'Hospedaje & Alojamientos', icon: 'Hotel', color: '#eab308', label: 'Hospedaje & Alojamientos', desc: 'Hoteles, hostales, cabañas, glamping y suites' },
  { name: 'Surf & Deportes Acuáticos', icon: 'Waves', color: '#0284c7', label: 'Surf & Deportes Acuáticos', desc: 'Escuelas de surf, alquiler de tablas, buceo y pesca deportiva' },
  { name: 'Cafeterías & Panaderías', icon: 'Coffee', color: '#d97706', label: 'Cafeterías & Panaderías', desc: 'Cafés de especialidad, desayunos, juguerías y repostería artesanal' },
  { name: 'Tours, Aventura & Ecoturismo', icon: 'Compass', color: '#10b981', label: 'Tours, Aventura & Ecoturismo', desc: 'Avistamiento de ballenas, senderismo, cabalgatas, parapente y reservas' },
  { name: 'Bienestar, Yoga & Spa', icon: 'Sparkles', color: '#a855f7', label: 'Bienestar, Yoga & Spa', desc: 'Centros holísticos, masajes, yoga, terapias y cuidado personal' },
  { name: 'Artesanías & Tiendas de Playa', icon: 'ShoppingBag', color: '#8b5cf6', label: 'Artesanías & Tiendas de Playa', desc: 'Ropa playera, surf shops, souvenirs, accesorios y artesanías' },
  { name: 'Minimarkets, Víveres & Licorerías', icon: 'Store', color: '#06b6d4', label: 'Minimarkets, Víveres & Licorerías', desc: 'Minimarkets, abarrotes, bodegas, licores y artículos esenciales' },
  { name: 'Salud, Farmacias & Emergencias', icon: 'Activity', color: '#ef4444', label: 'Salud, Farmacias & Emergencias', desc: 'Farmacias, centros de salud, primeros auxilios y veterinarias' },
  { name: 'Transporte & Movilidad', icon: 'Bus', color: '#3b82f6', label: 'Transporte & Movilidad', desc: 'Taxis, cooperativas de buses, alquiler de motos y bicicletas' },
  { name: 'Servicios Diarios & Técnicos', icon: 'Wrench', color: '#64748b', label: 'Servicios Diarios & Técnicos', desc: 'Cajeros automáticos, lavanderías, cerrajerías y soporte técnico' },
  { name: 'Información, Cultura & Puntos Clave', icon: 'MapPin', color: '#f59e0b', label: 'Información, Cultura & Puntos Clave', desc: 'Miradores, iglesias, letras de Montañita, cultura y auxilio' }
];

export const DEFAULT_MASTER_VIBES = [
  { name: 'De Fiesta & Farra', label: 'De Fiesta & Farra', icon: 'Flame', color: '#ec4899', desc: 'Discotecas, bares de cócteles, DJs y música en vivo' },
  { name: 'Chill & Relax Playero', label: 'Chill & Relax Playero', icon: 'Palmtree', color: '#14b8a6', desc: 'Hamacas, brisa marina, lectura y desconexión total' },
  { name: 'Foodie & Antojos', label: 'Foodie & Antojos', icon: 'Utensils', color: '#f97316', desc: 'Mariscos frescos, pizzas artesanales, comida típica y postres' },
  { name: 'Aventurero & Activo', label: 'Aventurero & Activo', icon: 'Waves', color: '#0284c7', desc: 'Surf, caminatas a cascadas, parapente y deportes acuáticos' },
  { name: 'Sunset & Golden Hour', label: 'Sunset & Golden Hour', icon: 'Sun', color: '#f59e0b', desc: 'Miradores, música acústica y tragos al caer el sol' },
  { name: 'Romántico & Parejas', label: 'Romántico & Parejas', icon: 'Heart', color: '#e11d48', desc: 'Cenas a la luz de las velas, cabañas íntimas y paseos al atardecer' },
  { name: 'Social & Conectar', label: 'Social & Conectar', icon: 'Users', color: '#8b5cf6', desc: 'Hostales animados, conocer gente nueva, charlas y juegos' },
  { name: 'Zen & Bienestar', label: 'Zen & Bienestar', icon: 'Sparkles', color: '#a855f7', desc: 'Yoga matutino, masajes, meditación y terapias naturales' },
  { name: 'Curioso & Explorador', label: 'Curioso & Explorador', icon: 'Compass', color: '#06b6d4', desc: 'Senderos escondidos, artesanías, letras de Montañita y cultura local' },
  { name: 'Nómada & Cowork', label: 'Nómada & Cowork', icon: 'Laptop', color: '#64748b', desc: 'Cafés con buen Wi-Fi, enchufes y ambiente tranquilo para trabajar' }
];

export const DEFAULT_MASTER_ACTIVITIES = [
  { name: 'Tomar Cócteles & Salir de Fiesta', vibe: 'De Fiesta & Farra', icon: 'PartyPopper', color: '#ec4899' },
  { name: 'Clases de Surf & Alquiler de Tablas', vibe: 'Aventurero & Activo', icon: 'Waves', color: '#0284c7' },
  { name: 'Comer Mariscos, Pizza o Comida Típica', vibe: 'Foodie & Antojos', icon: 'Utensils', color: '#f97316' },
  { name: 'Desayunar & Café de Especialidad', vibe: 'Foodie & Antojos', icon: 'Coffee', color: '#d97706' },
  { name: 'Ver el Atardecer & Sunset Acústico', vibe: 'Sunset & Golden Hour', icon: 'Sun', color: '#f59e0b' },
  { name: 'Yoga, Masajes & Spa Relajante', vibe: 'Zen & Bienestar', icon: 'Sparkles', color: '#a855f7' },
  { name: 'Tours, Cascadas & Avistamiento de Ballenas', vibe: 'Curioso & Explorador', icon: 'Compass', color: '#10b981' },
  { name: 'Comprar Artesanías & Ropa Playera', vibe: 'Curioso & Explorador', icon: 'ShoppingBag', color: '#8b5cf6' },
  { name: 'Trabajar con Buen Wi-Fi & Coworking', vibe: 'Nómada & Cowork', icon: 'Laptop', color: '#64748b' },
  { name: 'Cena Romántica Frente al Mar', vibe: 'Romántico & Parejas', icon: 'Heart', color: '#e11d48' },
  { name: 'Hamacas, Sol & Relax en la Playa', vibe: 'Chill & Relax Playero', icon: 'Palmtree', color: '#14b8a6' },
  { name: 'Conocer Viajeros & Vida Social', vibe: 'Social & Conectar', icon: 'Users', color: '#8b5cf6' }
];

export const BASE_URL = 'https://www.ubicame.info';

export const LANDMARKS: Landmark[] = [
  {
    id: 'la-punta-montanita',
    slug: 'la-punta-montanita',
    name: 'La Punta de Montañita',
    locality: 'Montañita',
    sector: Sector.PLAYA,
    coordinates: [-1.8215, -80.7585],
    category: 'sports',
    description: 'Punto icónico de surf con ola derecha de clase mundial y ambiente tranquilo frente al mar.',
    wikidataUrl: 'https://www.wikidata.org/wiki/Q1018368'
  },
  {
    id: 'el-tigrillo-montanita',
    slug: 'el-tigrillo-montanita',
    name: 'Barrio El Tigrillo',
    locality: 'Montañita',
    sector: Sector.MONTANA,
    coordinates: [-1.8210, -80.7485],
    category: 'natural',
    description: 'Sector ecológico y residencial rodeado de naturaleza y senderos, apartado del ruido central.'
  },
  {
    id: 'terminal-clp-montanita',
    slug: 'terminal-clp-montanita',
    name: 'Terminal de Buses CLP Montañita',
    locality: 'Montañita',
    sector: Sector.CENTRO,
    coordinates: [-1.8270, -80.7530],
    category: 'transport',
    description: 'Terminal principal de transporte interprovincial con rutas directas hacia Guayaquil y la costa.'
  },
  {
    id: 'calle-cocteles-montanita',
    slug: 'calle-cocteles-montanita',
    name: 'Calle de los Cócteles',
    locality: 'Montañita',
    sector: Sector.CENTRO,
    coordinates: [-1.8258, -80.7540],
    category: 'cultural',
    description: 'Paseo peatonal emblemático con puestos de coctelería tropical, música y vida nocturna.'
  },
  {
    id: 'santuario-olon',
    slug: 'santuario-olon',
    name: 'Santuario Blanca Estrella de la Mar',
    locality: 'Olón',
    sector: Sector.PLAYA,
    coordinates: [-1.8020, -80.7675],
    category: 'religious',
    description: 'Santuario sobre el acantilado con vista panorámica al océano Pacífico y arquitectura en forma de barco.'
  },
  {
    id: 'cascada-alex-olon',
    slug: 'cascada-alex-olon',
    name: 'Cascada de Alex en Olón',
    locality: 'Olón',
    sector: Sector.MONTANA,
    coordinates: [-1.7850, -80.7300],
    category: 'natural',
    description: 'Sendero ecológico en la Cordillera Chongón-Colonche con cascadas y pozas naturales.'
  },
  {
    id: 'estero-manglaralto',
    slug: 'estero-manglaralto',
    name: 'Estero y Malecón de Manglaralto',
    locality: 'Manglaralto',
    sector: Sector.PLAYA,
    coordinates: [-1.8550, -80.7535],
    category: 'natural',
    description: 'Extensa playa tranquila y estero de agua dulce con avistamiento de aves marinas y mariscos frescos.'
  },
  {
    id: 'hospital-manglaralto',
    slug: 'hospital-manglaralto',
    name: 'Hospital de Manglaralto',
    locality: 'Manglaralto',
    sector: Sector.CENTRO,
    coordinates: [-1.8510, -80.7480],
    category: 'health',
    description: 'Centro de salud público de referencia con atención médica y emergencias para la zona norte de Santa Elena.'
  }
];

export const LOCALITIES = [
  { name: 'Montañita', coords: [-1.8253, -80.7523] as [number, number], zoom: 15 },
  { name: 'Olón', coords: [-1.7967, -80.7633] as [number, number], zoom: 15 },
  { name: 'Manglaralto', coords: [-1.8536, -80.7497] as [number, number], zoom: 15 }
];

export const LOCALITY_SECTORS: Record<string, Sector[]> = {
  'Montañita': [Sector.CENTRO, Sector.PLAYA, Sector.MONTANA],
  'Olón': [Sector.CENTRO, Sector.PLAYA, Sector.MONTANA],
  'Manglaralto': [Sector.CENTRO, Sector.PLAYA, Sector.MONTANA]
};


export const SECTOR_INFO = {
  [Sector.PLAYA]: {
    color: 'text-amber-400',
    hex: '#f59e0b',
    bg: 'bg-amber-950/90 backdrop-blur-sm',
    symbol: '🏖️',
    description: 'Sol, brisa y relax frente al mar'
  },
  [Sector.CENTRO]: {
    color: 'text-orange-400',
    hex: '#f97316',
    bg: 'bg-orange-950/90 backdrop-blur-sm',
    symbol: '🍹',
    description: 'El corazón del movimiento y la cultura local'
  },
  [Sector.MONTANA]: {
    color: 'text-yellow-400',
    hex: '#ca8a04',
    bg: 'bg-yellow-950/90 backdrop-blur-sm',
    symbol: '🌿',
    description: 'Paz, senderos y reconexión ambiental'
  },
  [Sector.NORTE]: {
    color: 'text-sky-400',
    hex: '#0ea5e9',
    bg: 'bg-sky-950/90 backdrop-blur-sm',
    symbol: '🧭',
    description: 'Sector Norte de la localidad'
  },
  [Sector.SUR]: {
    color: 'text-emerald-400',
    hex: '#10b981',
    bg: 'bg-emerald-950/90 backdrop-blur-sm',
    symbol: '🧭',
    description: 'Sector Sur de la localidad'
  },
  [Sector.ESTE]: {
    color: 'text-rose-400',
    hex: '#f43f5e',
    bg: 'bg-rose-950/90 backdrop-blur-sm',
    symbol: '🧭',
    description: 'Sector Este de la localidad'
  },
  [Sector.OESTE]: {
    color: 'text-indigo-400',
    hex: '#6366f1',
    bg: 'bg-indigo-950/90 backdrop-blur-sm',
    symbol: '🧭',
    description: 'Sector Oeste de la localidad'
  }
};

// Simplified polygon coordinates for Montañita sectors
export const LOCALITY_POLYGONS: Record<string, Partial<Record<Sector, [number, number][]>>> = {
  'Montañita': {
    [Sector.PLAYA]: [[-1.8285, -80.7565], [-1.8245, -80.7565], [-1.8225, -80.7585], [-1.8195, -80.7605], [-1.8195, -80.7635], [-1.8285, -80.7605]] as [number, number][],
    [Sector.CENTRO]: [[-1.8285, -80.7555], [-1.8245, -80.7555], [-1.8245, -80.7515], [-1.8285, -80.7515]] as [number, number][],
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
    [Sector.MONTANA]: [[-1.8540, -80.7480], [-1.8500, -80.7480], [-1.8500, -80.7440], [-1.8540, -80.7440]] as [number, number][],
  }
};

export const SECTOR_FOCUS_COORDS: Record<string, Partial<Record<Sector, [number, number]>>> = {
  'Montañita': {
    [Sector.PLAYA]: [-1.8235, -80.7585] as [number, number],
    [Sector.CENTRO]: [-1.8260, -80.7535] as [number, number],
    [Sector.MONTANA]: [-1.8210, -80.7485] as [number, number],
  },
  'Olón': {
    [Sector.PLAYA]: [-1.7960, -80.7655] as [number, number],
    [Sector.CENTRO]: [-1.7967, -80.7633] as [number, number],
    [Sector.MONTANA]: [-1.7950, -80.7600] as [number, number],
  },
  'Manglaralto': {
    [Sector.PLAYA]: [-1.8550, -80.7535] as [number, number],
    [Sector.CENTRO]: [-1.8525, -80.7505] as [number, number],
    [Sector.MONTANA]: [-1.8520, -80.7460] as [number, number],
  }
};

// For backward compatibility during migration
export const SECTOR_POLYGONS = LOCALITY_POLYGONS['Montañita'] as Partial<Record<Sector, [number, number][]>>;

export const DEFAULT_NEW_LOCALITY_SECTORS = [Sector.CENTRO, Sector.NORTE, Sector.SUR, Sector.ESTE, Sector.OESTE];

export const MOCK_BUSINESSES: Business[] = [
  {
    id: 'mock-1',
    name: 'Restaurante El Pelícano',
    locality: 'Montañita',
    sector: Sector.CENTRO,
    icon: 'food',
    description: 'Comida típica con descuento para militares.',
    imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7ed9d42339?auto=format&fit=crop&q=80&w=400',
    whatsapp: '593900000001',
    category: BusinessCategory.RESTAURANTE,
    coordinates: [-1.8260, -80.7535],
    email: 'pelicano@mock.com',
    hasMilitaryBenefit: true,
    isPublished: true,
    isVerified: true,
    plan: SubscriptionPlan.ELITE
  },
  {
    id: 'mock-2',
    name: 'Surf House Montañita',
    locality: 'Montañita',
    sector: Sector.PLAYA,
    icon: 'surf',
    description: 'Escuela de surf y hospedaje.',
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=400',
    whatsapp: '593900000002',
    category: BusinessCategory.OTRO,
    coordinates: [-1.8235, -80.7585],
    email: 'surf@mock.com',
    hasMilitaryBenefit: false,
    isPublished: true,
    isVerified: true,
    plan: SubscriptionPlan.PRO
  },
  {
    id: 'mock-3',
    name: 'Hostal Las Nubes',
    locality: 'Montañita',
    sector: Sector.MONTANA,
    icon: 'hotel',
    description: 'Hospedaje tranquilo con vista al mar y beneficio militar.',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=400',
    whatsapp: '593900000003',
    category: BusinessCategory.HOSPAJE,
    coordinates: [-1.8210, -80.7485],
    email: 'nubes@mock.com',
    hasMilitaryBenefit: true,
    isPublished: true,
    isVerified: true,
    plan: SubscriptionPlan.ELITE
  }
];



const now = new Date();
const todayAt = (h: number) => {
  const d = new Date(now);
  d.setHours(h, 0, 0, 0);
  return d;
};

export const MOCK_EVENTS: MontanitaEvent[] = [];

export const PLAN_LIMITS = {
  [SubscriptionPlan.FREE]: 1,
  [SubscriptionPlan.PRO]: 5,
  [SubscriptionPlan.ELITE]: 10,
  [SubscriptionPlan.EXPERT]: Infinity
};

export const EVENT_LIMITS = {
  [SubscriptionPlan.FREE]: 1,
  [SubscriptionPlan.PRO]: 5,
  [SubscriptionPlan.ELITE]: 10,
  [SubscriptionPlan.EXPERT]: Infinity
};

export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatureDefinition[]> = {
  [SubscriptionPlan.FREE]: [
    { text: "1 Evento al mes", description: "Publica tu primer evento", isIncluded: true },
    { text: "1 Pulso activo/mes", description: "Visibilidad básica en tiempo real", isIncluded: true },
    { text: "Descubrimiento total", description: "Encuentra todos los eventos", isIncluded: true },
    { text: "Unirse a la comunidad", description: "Interactúa en el muro Pulse", isIncluded: true }
  ],
  [SubscriptionPlan.PRO]: [
    { text: "5 Eventos al mes", description: "Ideal para negocios activos", isIncluded: true, highlight: true },
    { text: "5 Pulsos activos/mes", description: "Tus eventos en tiempo real", isIncluded: true, highlight: true },
    { text: "Insignia Pro", isIncluded: true, highlight: true },
    { text: "Tu negocio en el mapa", description: "Añade, edita y borra tu punto", isIncluded: true, highlight: true },
    { text: "Gestión de perfil de negocio", description: "Edita y guarda cambios", isIncluded: true, highlight: true },
    { text: "Presencia destacada", description: "Aparece antes en las listas", isIncluded: true, highlight: true },
    { text: "Acceso a Dashboard Host", isIncluded: true, highlight: true }
  ],
  [SubscriptionPlan.ELITE]: [
    { text: "10 Eventos al mes", description: "Para los más influyentes", isIncluded: true, highlight: true },
    { text: "10 Pulsos activos/mes", description: "Ideal para agenda variada", isIncluded: true, highlight: true },
    { text: "Insignia Elite Gold", isIncluded: true, highlight: true },
    { text: "Tu negocio en el mapa", description: "Añade, edita y borra tu punto", isIncluded: true, highlight: true },
    { text: "Gestión total de perfil 24/7", description: "Edita y guarda cambios en cualquier momento", isIncluded: true, highlight: true },
    { text: "Fijado + destacado", description: "Top 1 en buscador", isIncluded: true, highlight: true },
    { text: "IA Magic Content", description: "Descripciones optimizadas por IA", isIncluded: true, highlight: true },
    { text: "Comunidad exclusiva", isIncluded: true, highlight: true },
    { text: "Soporte prioritario", isIncluded: true, highlight: true }
  ],
  [SubscriptionPlan.EXPERT]: [
    { text: "Eventos ILIMITADOS", isIncluded: true, highlight: true },
    { text: "Pulsos ILIMITADOS", isIncluded: true, highlight: true },
    { text: "Puntos ilimitados en el mapa", description: "Negocios, POI y sectores — añade, edita y borra", isIncluded: true, highlight: true },
    { text: "Soporte VIP 24/7", isIncluded: true, highlight: true },
    { text: "Panel Administrador completo", isIncluded: true, highlight: true },
    { text: "Ubicación VIP en el Mapa", isIncluded: true, highlight: true }
  ]
};

export const MASS_MESSAGE_CREDITS = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.PRO]: 5,
  [SubscriptionPlan.ELITE]: 10,
  [SubscriptionPlan.EXPERT]: Infinity
};

export const PLAN_PRICES = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.PRO]: 5.00,
  [SubscriptionPlan.ELITE]: 10.00,
  [SubscriptionPlan.EXPERT]: 0
};

export const DEFAULT_PAYMENT_DETAILS = {
  bankName: "Banco Pichincha",
  accountType: "Cuenta de Ahorros",
  accountNumber: "2201938384",
  accountOwner: "ubicame.info PULSE",
  idNumber: "1792938485001",
  whatsappNumber: "593980000000",
  bankRegion: "Pichincha (Ecuador)"
};

export const MAP_ICONS = [
  { id: 'palmtree', emoji: '🏖️', label: 'Playa', icon: 'BiSwim' },
  { id: 'music', emoji: '🍹', label: 'Fiesta', icon: 'GiPartyPopper' },
  { id: 'leaf', emoji: '🌿', label: 'Naturaleza', icon: 'BsTree' },
  { id: 'waves', emoji: '🏄', label: 'Surf', icon: 'BiSolidWaves' },
  { id: 'mountain', emoji: '⛰️', label: 'Montaña', icon: 'GiMountaintop' },
  { id: 'surf', emoji: '🏄', label: 'Deporte', icon: 'MdSurfing' },
  { id: 'hotel', emoji: '🏨', label: 'Hospedaje', icon: 'MdHotel' },
  { id: 'food', emoji: '🍕', label: 'Comida', icon: 'MdRestaurant' },
  { id: 'church', emoji: '⛪', label: 'Cultura', icon: 'GiChurch' },
  { id: 'bus', emoji: '🚌', label: 'Transporte', icon: 'MdDirectionsBus' },
  { id: 'shopping', emoji: '🛍️', label: 'Compras', icon: 'MdShoppingBag' },
  { id: 'park', emoji: '🌳', label: 'Parque', icon: 'PiTree' },
  { id: 'cocktail', emoji: '🍸', label: 'Bar', icon: 'GiCocktail' },
  { id: 'coffee', emoji: '☕', label: 'Café', icon: 'MdLocalCafe' },
  { id: 'camera', emoji: '📸', label: 'Mirador', icon: 'MdPhotoCamera' },
  { id: 'medical', emoji: '🏥', label: 'Médico', icon: 'MdLocalHospital' },
  { id: 'pharmacy', emoji: '💊', label: 'Farmacia', icon: 'MdMedication' },
  { id: 'bank', emoji: '🏦', label: 'Banco', icon: 'MdAccountBalance' },
  { id: 'gas', emoji: '⛽', label: 'Gasolina', icon: 'MdLocalGasStation' },
  { id: 'parking', emoji: '🅿️', label: 'Estacionamiento', icon: 'MdLocalParking' },
  { id: 'beach', emoji: '🏖️', label: 'Playa', icon: 'BiBeach' },
  { id: 'store', emoji: '🏪', label: 'Tienda', icon: 'MdStore' },
  { id: 'gym', emoji: '🏋️', label: 'Gimnasio', icon: 'MdFitnessCenter' },
  { id: 'spa', emoji: '💆', label: 'Spa', icon: 'MdSpa' },
  { id: 'beachAccess', emoji: '🏖️', label: 'Acceso Playa', icon: 'BiSolidBeach' },
  { id: 'nightlife', emoji: '🌙', label: 'Nocturno', icon: 'BiSolidMoon' },
  { id: 'art', emoji: '🎨', label: 'Arte', icon: 'MdPalette' },
  { id: 'anchor', emoji: '⚓', label: 'Puerto', icon: 'GiAnchor' },
  { id: 'tent', emoji: '⛺', label: 'Camping', icon: 'MdCamping' },
  { id: 'bicycle', emoji: '🚴', label: 'Bicicleta', icon: 'MdDirectionsBike' },
  { id: 'dumbbell', emoji: '🏋️', label: 'Gimnasio', icon: 'MdFitnessCenter' },
  { id: 'volleyball', emoji: '🏐', label: 'Deporte', icon: 'GiVolleyballBall' },
  { id: 'location', emoji: '📍', label: 'Ubicación', icon: 'MdLocationOn' },
  { id: 'school', emoji: '🏫', label: 'Escuela', icon: 'MdSchool' },
  { id: 'bank2', emoji: '🏛️', label: 'Banco', icon: 'GiGreekTemple' },
];

export const DEFAULT_POLICIES: PolicyData = {
  lastUpdated: 'Abril 2024',
  version: '2.1',
  terms: [
    {
      title: '1. Requisitos de Acceso',
      content: 'Para utilizar ubicame.info PULSE, debes tener al menos 18 años o la mayoría de edad legal en tu jurisdicción. Al registrarte, garantizas que la información proporcionada es veraz, completa y actualizada en todo momento.'
    },
    {
      title: '2. Responsabilidades del Negocio',
      content: 'Los establecimientos registrados son responsables de la validez de los descuentos, horarios y servicios publicados. ubicame.info PULSE actúa únicamente como vitrina publicitaria y no garantiza la ejecución de las ofertas por parte de terceros.'
    },
    {
      title: '3. Suscripciones, Pagos y Cancelaciones',
      content: 'Los planes PRO y EXPERT otorgan beneficios visuales y funcionales específicos. Las suscripciones son de renovación mensual. Puedes cancelar en cualquier momento desde tu perfil; el servicio permanecerá activo hasta el final del periodo pagado. No se realizan reembolsos por periodos parciales no utilizados.'
    },
    {
      title: '4. Periodo de Gracia y Suspensión',
      content: 'En caso de fallo en el pago o falta de renovación, se otorga un periodo de gracia de 5 días naturales para regularizar la situación. Transcurrido este tiempo, el perfil será degradado automáticamente al plan gratuito y los eventos activos serán ocultados del mapa.'
    },
    {
      title: '5. Conducta Prohibida',
      content: 'Queda estrictamente prohibido: publicar contenido falso, ofensivo o ilegal; realizar acciones de scraping o ingeniería inversa; y el uso de la plataforma para fines distintos al descubrimiento turístico y comercial autorizado.'
    }
  ],
  privacy: [
    {
      title: '1. Recolección de Información',
      content: 'Recolectamos datos de perfil (nombre, email), datos transaccionales, y datos de uso de la plataforma. La geolocalización se solicita exclusivamente para la funcionalidad del mapa en tiempo real y no se utiliza para rastreo secundario.'
    },
    {
      title: '2. Uso de Datos Comerciales (Analytics)',
      content: 'Para los negocios registrados, recolectamos métricas agregadas de visualizaciones y clics. Estos datos se utilizan para mostrar el rendimiento publicitario al dueño del negocio ("Dashboard de Estadísticas") y para mejorar las recomendaciones de la IA. Los datos individuales de los visitantes nunca son compartidos con los negocios de forma identificable.'
    },
    {
      title: '3. Seguridad y Confidencialidad',
      content: 'Tus datos se utilizan para: personalizar tu experiencia, mejorar la seguridad de la cuenta, y si lo autorizas, enviarte notificaciones sobre eventos relevantes. Nunca venderemos tu información personal a terceros.'
    },
    {
      title: '4. Derechos ARCO',
      content: 'Como usuario, tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales. Puedes solicitar la eliminación definitiva de tu cuenta y datos asociados desde la aplicación o contactando a nuestro soporte.'
    },
    {
      title: '5. Cookies y Servicios de Terceros',
      content: 'Utilizamos Google Maps (para geolocalización) y Firebase (para infraestructura). Estos servicios pueden utilizar cookies técnicas necesarias para el funcionamiento de la app. No se utilizan cookies publicitarias de seguimiento cruzado.'
    }
  ],
  disclaimer: '"ubicame.info PULSE no garantiza que la plataforma esté libre de errores o interrupciones. El uso de la información y la asistencia a eventos publicados es bajo el propio riesgo del usuario. No seremos responsables por pérdidas directas o indirectas derivadas del uso de la aplicación."',
  supportEmail: 'fhernandezcalle@gmail.com'
};

export const CANONICAL_ROUTES = {
  ROOT: '/',
  EXPLORE: '/explore',
  HISTORY: '/history',
  CALENDAR: '/calendar',
  PASSPORT: '/passport',
  INFO: '/info',
  PLANS: '/plans',
  SAVED_EVENTS: '/saved-events',
  COMMUNITY: '/community',
  CHAT: '/chat',
  SERVICES: '/services',
  POLICIES: '/policies',
  GUIDE: '/ruta-del-spondylus'
} as const;

export function resolveCanonicalRoute(pathname: string): 'explore' | 'feed' | 'calendar' | 'favorites' | 'saved' | 'host' | 'history' | 'guide' | 'all-favorites' | 'plans' | 'community' | 'chat' | 'admin-users' | 'info' | 'services' | 'policies' {
  if (pathname === '/' || pathname === '/history' || pathname === '/nosotros') return 'history';
  if (pathname === '/explore' || pathname === '/feed' || pathname.startsWith('/evento/')) return 'explore';
  if (pathname === '/calendar' || pathname.startsWith('/agenda/')) return 'calendar';
  if (pathname === '/passport' || pathname === '/perfil' || pathname === '/profile' || pathname === '/host') return 'favorites';
  if (pathname === '/plans') return 'plans';
  if (pathname === '/saved-events') return 'all-favorites';
  if (pathname === '/community' || pathname === '/avisos' || pathname === '/notificaciones') return 'community';
  if (pathname === '/chat') return 'chat';
  if (pathname === '/info' || pathname === '/buscar' || pathname === '/directorio') return 'info';
  if (pathname === '/policies') return 'policies';
  if (pathname === '/services' || pathname.startsWith('/negocio/')) return 'services';
  if (pathname === '/ruta-del-spondylus' || pathname.startsWith('/guia/')) return 'guide';
  return 'history';
}


