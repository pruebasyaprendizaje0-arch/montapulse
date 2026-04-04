import { Sector, Vibe, Business, MontanitaEvent, SubscriptionPlan, BusinessCategory, PolicyData, PlanFeatureDefinition } from './types';
export type { PlanFeatureDefinition };


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
    color: 'text-amber-500',
    hex: '#f59e0b',
    bg: 'bg-amber-500/20',
    symbol: '🏖️',
    description: 'Sol, brisa y relax frente al mar'
  },
  [Sector.CENTRO]: {
    color: 'text-orange-500',
    hex: '#f97316',
    bg: 'bg-orange-500/20',
    symbol: '🍹',
    description: 'El corazón del movimiento y la cultura local'
  },
  [Sector.MONTANA]: {
    color: 'text-yellow-600',
    hex: '#ca8a04',
    bg: 'bg-yellow-600/20',
    symbol: '🌿',
    description: 'Paz, senderos y reconexión ambiental'
  },
  [Sector.NORTE]: {
    color: 'text-sky-500',
    hex: '#0ea5e9',
    bg: 'bg-sky-500/20',
    symbol: '🧭',
    description: 'Sector Norte de la localidad'
  },
  [Sector.SUR]: {
    color: 'text-emerald-500',
    hex: '#10b981',
    bg: 'bg-emerald-500/20',
    symbol: '🧭',
    description: 'Sector Sur de la localidad'
  },
  [Sector.ESTE]: {
    color: 'text-rose-500',
    hex: '#f43f5e',
    bg: 'bg-rose-500/20',
    symbol: '🧭',
    description: 'Sector Este de la localidad'
  },
  [Sector.OESTE]: {
    color: 'text-indigo-500',
    hex: '#6366f1',
    bg: 'bg-indigo-500/20',
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
    plan: SubscriptionPlan.PREMIUM
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
    plan: SubscriptionPlan.BASIC
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
    plan: SubscriptionPlan.PREMIUM
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
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.BASIC]: 4,
  [SubscriptionPlan.PREMIUM]: 10,
  [SubscriptionPlan.EXPERT]: 9999
};



export const PLAN_FEATURES: Record<SubscriptionPlan, PlanFeatureDefinition[]> = {
  [SubscriptionPlan.FREE]: [
    { text: "Descubrimiento total", description: "Encuentra todos los eventos", isIncluded: true },
    { text: "Unirse a la comunidad", description: "Interactúa en el muro Pulse", isIncluded: true },
    { text: "Notificaciones Pro", description: "Enterate de lo mejor primero", isIncluded: true }
  ],
  [SubscriptionPlan.BASIC]: [
    { text: "4 Pulsos activos/mes", description: "Tus eventos en tiempo real", isIncluded: true, highlight: true },
    { text: "Insignia Pro", isIncluded: true, highlight: true },
    { text: "Presencia destacada", description: "Aparece antes en las listas", isIncluded: true, highlight: true },
    { text: "Acceso a Dashboard Host", isIncluded: true, highlight: true }
  ],
  [SubscriptionPlan.PREMIUM]: [
    { text: "10 Pulsos activos/mes", description: "Ideal para agenda variada", isIncluded: true, highlight: true },
    { text: "Insignia Premium Gold", isIncluded: true, highlight: true },
    { text: "Fijado en el Mapa", description: "Icono destacado en la localidad", isIncluded: true, highlight: true },
    { text: "IA Magic Content", description: "Descripciones optimizadas", isIncluded: true, highlight: true },
    { text: "Comunidad exclusiva", isIncluded: true, highlight: true }
  ],
  [SubscriptionPlan.EXPERT]: [
    { text: "Pulsos ILIMITADOS", isIncluded: true, highlight: true },
    { text: "Soporte VIP 24/7", isIncluded: true, highlight: true },
    { text: "Panel Business Manager", isIncluded: true, highlight: true },
    { text: "Ubicación VIP en Mapa", isIncluded: true, highlight: true }
  ]
};

export const MASS_MESSAGE_CREDITS = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.BASIC]: 4,
  [SubscriptionPlan.PREMIUM]: 10,
  [SubscriptionPlan.EXPERT]: Infinity
};

export const PLAN_PRICES = {
  [SubscriptionPlan.FREE]: 0,
  [SubscriptionPlan.BASIC]: 5.00,
  [SubscriptionPlan.PREMIUM]: 10.00,
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
