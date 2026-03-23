
import { Sector, Vibe, Business, MontanitaEvent, SubscriptionPlan, BusinessCategory, PolicyData } from './types';


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
    color: 'text-yellow-600', // Changed from text-amber-600
    hex: '#ca8a04', // Changed from #d97706 (amber-600) to yellow-600
    bg: 'bg-yellow-600/20', // Changed from bg-amber-600/20
    symbol: '🌿',
    description: 'Paz, senderos y reconexión ambiental'
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

export const SECTOR_FOCUS_COORDS: Record<string, Record<Sector, [number, number]>> = {
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
export const SECTOR_POLYGONS = LOCALITY_POLYGONS['Montañita'] as Record<Sector, [number, number][]>;

export const MOCK_BUSINESSES: Business[] = [];



const now = new Date();
const todayAt = (h: number) => {
  const d = new Date(now);
  d.setHours(h, 0, 0, 0);
  return d;
};

export const MOCK_EVENTS: MontanitaEvent[] = [];

export const PLAN_LIMITS = {
  [SubscriptionPlan.BASIC]: 3,
  [SubscriptionPlan.PREMIUM]: 7,
  [SubscriptionPlan.VISITOR]: 0
};

export const PLAN_PRICES = {
  [SubscriptionPlan.BASIC]: 3.00,
  [SubscriptionPlan.PREMIUM]: 14.99,
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
  lastUpdated: 'Marzo 2024',
  version: '2.0',
  terms: [
    {
      title: '1. Requisitos de Acceso',
      content: 'Para utilizar Montapulse, debes tener al menos 18 años o la mayoría de edad legal en tu jurisdicción. Al registrarte, garantizas que la información proporcionada es veraz, completa y actualizada en todo momento.'
    },
    {
      title: '2. Responsabilidades del Negocio',
      content: 'Los establecimientos registrados son responsables de la validez de los descuentos, horarios y servicios publicados. Montapulse actúa únicamente como vitrina publicitaria y no garantiza la ejecución de las ofertas por parte de terceros.'
    },
    {
      title: '3. Suscripciones y Pagos',
      content: 'Los planes Basic y Premium otorgan beneficios visuales y funcionales específicos. Las suscripciones son de renovación mensual. En caso de impago, el perfil será degradado automáticamente al plan gratuito transcurrido el periodo de gracia de 5 días.'
    },
    {
      title: '4. Conducta Prohibida',
      content: 'Queda estrictamente prohibido: publicar contenido falso, ofensivo o ilegal; realizar acciones de scraping o ingeniería inversa; y el uso de la plataforma para fines distintos al descubrimiento turístico y comercial autorizado.'
    }
  ],
  privacy: [
    {
      title: '1. Recolección de Información',
      content: 'Recolectamos datos de perfil (nombre, email), datos transaccionales, y datos de uso de la plataforma. La geolocalización se solicita exclusivamente para la funcionalidad del mapa en tiempo real y no se utiliza para rastreo secundario.'
    },
    {
      title: '2. Uso de los Datos',
      content: 'Tus datos se utilizan para: personalizar tu experiencia, mejorar la seguridad de la cuenta, y si lo autorizas, enviarte notificaciones sobre eventos relevantes en tu zona. Nunca venderemos tu información personal a terceros.'
    },
    {
      title: '3. Derechos ARCO',
      content: 'Como usuario, tienes derecho a Acceder, Rectificar, Cancelar u Oponerte al tratamiento de tus datos personales. Puedes solicitar la eliminación definitiva de tu cuenta y datos asociados contactando a nuestro soporte técnico.'
    },
    {
      title: '4. Cookies y Terceros',
      content: 'Utilizamos servicios de terceros como Google Maps (para geolocalización) y Firebase (para autenticación y base de datos). Estos servicios pueden utilizar cookies técnicas para el funcionamiento básico de la app y para mantener tu sesión activa.'
    }
  ],
  disclaimer: '"Montapulse no garantiza que la plataforma esté libre de errores o interrupciones. El uso de la información y la asistencia a eventos publicados es bajo el propio riesgo del usuario. No seremos responsables por pérdidas directas o indirectas derivadas del uso de la aplicación."',
  supportEmail: 'soporte@montapulse.com'
};
