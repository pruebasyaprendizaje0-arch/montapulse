import React, { useState, useRef, useMemo } from 'react';
import { 
  UtensilsCrossed, 
  Coffee, 
  Wine, 
  Compass, 
  MapPin, 
  Sparkles, 
  Waves, 
  HeartPulse, 
  Dumbbell, 
  Hotel, 
  Car, 
  ChevronLeft, 
  ChevronRight, 
  Star, 
  ShieldCheck,
  Palmtree,
  Pill,
  ArrowRight,
  Flame,
  Activity,
  Luggage
} from 'lucide-react';
import { Business, BusinessCategory, Sector } from '../types';
import { LANDMARKS } from '../constants';

interface RecommendationItem {
  id: string;
  name: string;
  categoryName: string;
  categoryType: 'food' | 'activity' | 'wellness' | 'travel';
  subCategoryKey: string;
  subCategoryLabel: string;
  iconEmoji: string;
  imageUrl: string;
  locality: string;
  sector?: Sector | string;
  rating?: number;
  reviewCount?: number;
  description?: string;
  coordinates?: [number, number];
  distanceMeters?: number;
  isVerified?: boolean;
  businessRef?: Business;
  isExternalOrLandmark?: boolean;
}

interface ExperienceRecommendationCarouselsProps {
  currentBusiness?: Business | null;
  allBusinesses: Business[];
  onSelectBusiness?: (business: Business) => void;
  onViewOnMap?: (coords: [number, number]) => void;
}

// Haversine distance calculator in meters
const calculateDistanceInMeters = (coord1?: [number, number] | any, coord2?: [number, number] | any): number | undefined => {
  if (!coord1 || !coord2 || !Array.isArray(coord1) || !Array.isArray(coord2) || coord1.length < 2 || coord2.length < 2) return undefined;
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  if (typeof lat1 !== 'number' || typeof lon1 !== 'number' || typeof lat2 !== 'number' || typeof lon2 !== 'number') return undefined;
  const R = 6371e3; // Earth radius in meters
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

const formatDistance = (meters?: number, locality?: string): string => {
  if (meters === undefined) return locality || 'Montañita';
  if (meters < 1000) return `A ${meters} m`;
  return `A ${(meters / 1000).toFixed(1)} km`;
};

// Curated rich fallback items in case certain categories have few registered DB entries
const CURATED_FALLBACKS: RecommendationItem[] = [
  // 1. DÓNDE COMER
  {
    id: 'curated-food-1',
    name: 'El Tambo Tropical & Mariscos',
    categoryName: 'Restaurante Típico',
    categoryType: 'food',
    subCategoryKey: 'restaurantes',
    subCategoryLabel: 'Restaurante Local',
    iconEmoji: '🍲',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.CENTRO,
    rating: 4.9,
    reviewCount: 42,
    description: 'Ceviches frescos, encocados y parrilladas de mariscos a pasos de la playa.',
    coordinates: [-1.8262, -80.7538],
    isVerified: true
  },
  {
    id: 'curated-food-2',
    name: 'Café de la Ola & Bakery',
    categoryName: 'Cafetería & Brunch',
    categoryType: 'food',
    subCategoryKey: 'cafes',
    subCategoryLabel: 'Cafeterías y Postres',
    iconEmoji: '☕',
    imageUrl: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.PLAYA,
    rating: 4.8,
    reviewCount: 38,
    description: 'Café de especialidad ecuatoriano, croissants artesanales y bowls saludables.',
    coordinates: [-1.8248, -80.7550],
    isVerified: true
  },
  {
    id: 'curated-food-3',
    name: 'Sunset & Cocktail Lounge',
    categoryName: 'Bar & Lounge',
    categoryType: 'food',
    subCategoryKey: 'bares',
    subCategoryLabel: 'Bar o Lounge',
    iconEmoji: '🍸',
    imageUrl: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.PLAYA,
    rating: 4.9,
    reviewCount: 56,
    description: 'Coctelería de autor, música chill-out y la mejor vista al atardecer.',
    coordinates: [-1.8238, -80.7570],
    isVerified: true
  },
  {
    id: 'curated-food-4',
    name: 'Pizzería Artesanal Il Faro',
    categoryName: 'Pizzería & Pasta',
    categoryType: 'food',
    subCategoryKey: 'restaurantes',
    subCategoryLabel: 'Restaurante Local',
    iconEmoji: '🍕',
    imageUrl: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.CENTRO,
    rating: 4.7,
    reviewCount: 29,
    description: 'Masa madre al horno de leña, pastas frescas e ingredientes gourmet.',
    coordinates: [-1.8268, -80.7532],
    isVerified: true
  },

  // 2. QUÉ HACER
  {
    id: 'curated-act-1',
    name: 'Montañita Point Surf Experience',
    categoryName: 'Escuela de Surf & Guía',
    categoryType: 'activity',
    subCategoryKey: 'talleres',
    subCategoryLabel: 'Talleres o Eventos',
    iconEmoji: '🏄',
    imageUrl: 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.PLAYA,
    rating: 5.0,
    reviewCount: 64,
    description: 'Clases personalizadas para principiantes y coaching avanzado en La Punta.',
    coordinates: [-1.8215, -80.7585],
    isVerified: true
  },
  {
    id: 'curated-act-2',
    name: 'Tour Cascadas & Selva Chongón',
    categoryName: 'Tours & Aventura',
    categoryType: 'activity',
    subCategoryKey: 'tours',
    subCategoryLabel: 'Rutas y Tours',
    iconEmoji: '🌿',
    imageUrl: 'https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&q=80&w=600',
    locality: 'Olón',
    sector: Sector.MONTANA,
    rating: 4.9,
    reviewCount: 31,
    description: 'Senderismo guiado por la selva tropical húmeda, pozas naturales y avistamiento de aves.',
    coordinates: [-1.7850, -80.7300],
    isVerified: true
  },
  {
    id: 'curated-act-3',
    name: 'Mirador & Santuario de Olón',
    categoryName: 'Punto de Interés',
    categoryType: 'activity',
    subCategoryKey: 'interes',
    subCategoryLabel: 'Punto de Interés',
    iconEmoji: '⛪',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600',
    locality: 'Olón',
    sector: Sector.PLAYA,
    rating: 4.8,
    reviewCount: 47,
    description: 'Mirador panorámico en lo alto del acantilado con vista infinita al Pacífico.',
    coordinates: [-1.8020, -80.7675],
    isVerified: true
  },
  {
    id: 'curated-act-4',
    name: 'Taller de Cerámica y Artesanía Costera',
    categoryName: 'Taller Interactivo',
    categoryType: 'activity',
    subCategoryKey: 'talleres',
    subCategoryLabel: 'Talleres o Eventos',
    iconEmoji: '🎨',
    imageUrl: 'https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&q=80&w=600',
    locality: 'Manglaralto',
    sector: Sector.CENTRO,
    rating: 4.9,
    reviewCount: 22,
    description: 'Aprende técnicas ancestrales de modelado en barro y elaboración de souvenirs únicos.',
    coordinates: [-1.8530, -80.7510],
    isVerified: true
  },

  // 3. CÓMO TE VAS A CUIDAR
  {
    id: 'curated-well-1',
    name: 'Samadhi Ocean Spa & Yoga Shala',
    categoryName: 'Spa & Wellness',
    categoryType: 'wellness',
    subCategoryKey: 'spa',
    subCategoryLabel: 'Spas y Bienestar',
    iconEmoji: '🧘',
    imageUrl: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.MONTANA,
    rating: 5.0,
    reviewCount: 39,
    description: 'Masajes descontracturantes, sesiones de yoga al amanecer y terapias con cuencos.',
    coordinates: [-1.8210, -80.7485],
    isVerified: true
  },
  {
    id: 'curated-well-2',
    name: 'Punta Fitness Beach Gym',
    categoryName: 'Gimnasio & Entrenamiento',
    categoryType: 'wellness',
    subCategoryKey: 'gym',
    subCategoryLabel: 'Gimnasios o Deportes',
    iconEmoji: '🏋️',
    imageUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.CENTRO,
    rating: 4.7,
    reviewCount: 25,
    description: 'Área de pesas, calistenia frente al mar y entrenamiento funcional para surfistas.',
    coordinates: [-1.8250, -80.7545],
    isVerified: true
  },
  {
    id: 'curated-well-3',
    name: 'Farmacia & Asistencia Médica Montaña',
    categoryName: 'Farmacia & Salud 24/7',
    categoryType: 'wellness',
    subCategoryKey: 'salud',
    subCategoryLabel: 'Farmacias y Salud',
    iconEmoji: '💊',
    imageUrl: 'https://images.unsplash.com/photo-1586015555751-63bb77f4322a?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.CENTRO,
    rating: 4.8,
    reviewCount: 18,
    description: 'Medicamentos, primeros auxilios, hidratación y atención médica de guardia.',
    coordinates: [-1.8265, -80.7530],
    isVerified: true
  },
  {
    id: 'curated-well-4',
    name: 'Centro de Salud y Emergencias Manglaralto',
    categoryName: 'Hospital de Referencia',
    categoryType: 'wellness',
    subCategoryKey: 'salud',
    subCategoryLabel: 'Farmacias y Salud',
    iconEmoji: '🏥',
    imageUrl: 'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d?auto=format&fit=crop&q=80&w=600',
    locality: 'Manglaralto',
    sector: Sector.CENTRO,
    rating: 4.6,
    reviewCount: 30,
    description: 'Atención médica general y urgencias para toda la costa norte de Santa Elena.',
    coordinates: [-1.8510, -80.7480],
    isVerified: true
  },

  // 4. DÓNDE SIGUE TU VIAJE
  {
    id: 'curated-trav-1',
    name: 'Boutique Hotel & Suites La Punta',
    categoryName: 'Hotel Recomendado',
    categoryType: 'travel',
    subCategoryKey: 'alojamiento',
    subCategoryLabel: 'Alojamientos',
    iconEmoji: '🏨',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.PLAYA,
    rating: 4.9,
    reviewCount: 52,
    description: 'Suites con vista panorámica, piscina infinity, coworking y alta velocidad Wi-Fi.',
    coordinates: [-1.8220, -80.7580],
    isVerified: true
  },
  {
    id: 'curated-trav-2',
    name: 'Cooperativa de Taxis & Transfers Montañita',
    categoryName: 'Transporte & Taxis',
    categoryType: 'travel',
    subCategoryKey: 'transporte',
    subCategoryLabel: 'Transporte y Taxis',
    iconEmoji: '🚕',
    imageUrl: 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.CENTRO,
    rating: 4.8,
    reviewCount: 44,
    description: 'Traslados seguros a Guayaquil, Manta, Olón, Ayampe y aeropuertos 24/7.',
    coordinates: [-1.8268, -80.7525],
    isVerified: true
  },
  {
    id: 'curated-trav-3',
    name: 'Terminal de Buses CLP & Rutas del Sol',
    categoryName: 'Terminal de Buses',
    categoryType: 'travel',
    subCategoryKey: 'transporte',
    subCategoryLabel: 'Transporte y Taxis',
    iconEmoji: '🚌',
    imageUrl: 'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&q=80&w=600',
    locality: 'Montañita',
    sector: Sector.CENTRO,
    rating: 4.7,
    reviewCount: 35,
    description: 'Conexión directa interprovincial hacia Guayaquil, Puerto López y Quito.',
    coordinates: [-1.8270, -80.7530],
    isVerified: true
  },
  {
    id: 'curated-trav-4',
    name: 'Destino Olón & Ayampe (Costa Viva)',
    categoryName: 'Pueblo Vecino / Destino',
    categoryType: 'travel',
    subCategoryKey: 'destinos',
    subCategoryLabel: 'Próximos Destinos',
    iconEmoji: '📍',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=600',
    locality: 'Olón',
    sector: Sector.PLAYA,
    rating: 4.9,
    reviewCount: 68,
    description: 'Playas extensas, gastronomía cosmopolita y atmósfera pacífica a solo 5 minutos.',
    coordinates: [-1.7967, -80.7633],
    isVerified: true
  }
];

export const ExperienceRecommendationCarousels: React.FC<ExperienceRecommendationCarouselsProps> = ({
  currentBusiness,
  allBusinesses,
  onSelectBusiness,
  onViewOnMap
}) => {
  // Carousel filter state per category
  const [foodFilter, setFoodFilter] = useState<'all' | 'restaurantes' | 'cafes' | 'bares'>('all');
  const [actFilter, setActFilter] = useState<'all' | 'tours' | 'interes' | 'talleres'>('all');
  const [wellFilter, setWellFilter] = useState<'all' | 'spa' | 'gym' | 'salud'>('all');
  const [travFilter, setTravFilter] = useState<'all' | 'alojamiento' | 'transporte' | 'destinos'>('all');

  // Carousel refs for smooth scrolling buttons
  const foodScrollRef = useRef<HTMLDivElement>(null);
  const actScrollRef = useRef<HTMLDivElement>(null);
  const wellScrollRef = useRef<HTMLDivElement>(null);
  const travScrollRef = useRef<HTMLDivElement>(null);

  const scrollContainer = (ref: React.RefObject<HTMLDivElement | null>, direction: 'left' | 'right') => {
    if (ref.current) {
      const scrollAmount = direction === 'left' ? -320 : 320;
      ref.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  const currentCoords = currentBusiness?.coordinates;

  // Process live businesses + landmarks + curations
  const categorizedData = useMemo(() => {
    const foodList: RecommendationItem[] = [];
    const actList: RecommendationItem[] = [];
    const wellList: RecommendationItem[] = [];
    const travList: RecommendationItem[] = [];

    // Filter candidate businesses (exclude the current business)
    const otherBusinesses = (allBusinesses || []).filter(b => b && b.id !== currentBusiness?.id && !b.isDeleted);

    otherBusinesses.forEach(b => {
      const cat = b.category;
      const text = `${b.name} ${b.description || ''} ${b.category || ''} ${(b.services || []).join(' ')}`.toLowerCase();
      const dist = calculateDistanceInMeters(currentCoords, b.coordinates);

      // 1. FOOD
      if (
        cat === BusinessCategory.RESTAURANTE ||
        cat === BusinessCategory.MERCADO ||
        cat === BusinessCategory.BAR ||
        cat === BusinessCategory.DISCOTECA ||
        cat === BusinessCategory.BAR_DISCOTECA ||
        b.plannerCategory === 'comida' ||
        b.plannerCategory === 'baile' ||
        text.includes('comida') ||
        text.includes('café') ||
        text.includes('coffee') ||
        text.includes('tragos') ||
        text.includes('pizza') ||
        text.includes('ceviche')
      ) {
        let subKey = 'restaurantes';
        let subLabel = 'Restaurante Local';
        let emoji = '🍲';

        if (
          text.includes('café') ||
          text.includes('coffee') ||
          text.includes('postre') ||
          text.includes('bakery') ||
          text.includes('panadería') ||
          text.includes('helad') ||
          text.includes('desayuno') ||
          text.includes('brunch')
        ) {
          subKey = 'cafes';
          subLabel = 'Cafeterías y Postres';
          emoji = '☕';
        } else if (
          cat === BusinessCategory.BAR ||
          cat === BusinessCategory.DISCOTECA ||
          cat === BusinessCategory.BAR_DISCOTECA ||
          b.plannerCategory === 'baile' ||
          text.includes('cóctel') ||
          text.includes('cocktail') ||
          text.includes('lounge') ||
          text.includes('tragos')
        ) {
          subKey = 'bares';
          subLabel = 'Bares o Lounges';
          emoji = '🍸';
        }

        foodList.push({
          id: b.id,
          name: b.name,
          categoryName: b.category || subLabel,
          categoryType: 'food',
          subCategoryKey: subKey,
          subCategoryLabel: subLabel,
          iconEmoji: emoji,
          imageUrl: b.imageUrl || 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&q=80&w=600',
          locality: b.locality || 'Montañita',
          sector: b.sector,
          rating: b.rating || 4.8,
          reviewCount: b.reviewCount || 15,
          description: b.description,
          coordinates: b.coordinates,
          distanceMeters: dist,
          isVerified: b.isVerified,
          businessRef: b
        });
      }

      // 2. ACTIVITY & ENTERTAINMENT
      if (
        cat === BusinessCategory.TOUR_OPERATOR ||
        cat === BusinessCategory.CENTRO_SURF ||
        cat === BusinessCategory.ESCUELA_SURF ||
        cat === BusinessCategory.PLAYA ||
        cat === BusinessCategory.PARQUE ||
        cat === BusinessCategory.MALECON ||
        cat === BusinessCategory.REFERENCIA ||
        b.plannerCategory === 'surf' ||
        text.includes('tour') ||
        text.includes('surf') ||
        text.includes('aventura') ||
        text.includes('buceo') ||
        text.includes('artesan') ||
        text.includes('taller') ||
        text.includes('mirador')
      ) {
        let subKey = 'interes';
        let subLabel = 'Puntos de Interés';
        let emoji = '🏖️';

        if (
          cat === BusinessCategory.TOUR_OPERATOR ||
          text.includes('tour') ||
          text.includes('guía') ||
          text.includes('ruta') ||
          text.includes('excursión')
        ) {
          subKey = 'tours';
          subLabel = 'Rutas y Tours';
          emoji = '🗺️';
        } else if (
          cat === BusinessCategory.CENTRO_SURF ||
          cat === BusinessCategory.ESCUELA_SURF ||
          b.plannerCategory === 'surf' ||
          text.includes('surf') ||
          text.includes('clase') ||
          text.includes('taller') ||
          text.includes('cocina') ||
          text.includes('artesan')
        ) {
          subKey = 'talleres';
          subLabel = 'Talleres o Eventos';
          emoji = '🏄';
        }

        actList.push({
          id: b.id,
          name: b.name,
          categoryName: b.category || subLabel,
          categoryType: 'activity',
          subCategoryKey: subKey,
          subCategoryLabel: subLabel,
          iconEmoji: emoji,
          imageUrl: b.imageUrl || 'https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&q=80&w=600',
          locality: b.locality || 'Montañita',
          sector: b.sector,
          rating: b.rating || 4.9,
          reviewCount: b.reviewCount || 20,
          description: b.description,
          coordinates: b.coordinates,
          distanceMeters: dist,
          isVerified: b.isVerified,
          businessRef: b
        });
      }

      // 3. WELLNESS & HEALTH
      if (
        cat === BusinessCategory.HOSPITAL ||
        cat === BusinessCategory.HIDRATACION ||
        cat === BusinessCategory.CANCHA ||
        text.includes('spa') ||
        text.includes('yoga') ||
        text.includes('masaje') ||
        text.includes('relax') ||
        text.includes('bienestar') ||
        text.includes('gym') ||
        text.includes('gimnasio') ||
        text.includes('fitness') ||
        text.includes('cancha') ||
        text.includes('salud') ||
        text.includes('farmacia') ||
        text.includes('médic')
      ) {
        let subKey = 'spa';
        let subLabel = 'Spas y Bienestar';
        let emoji = '🧘';

        if (
          cat === BusinessCategory.CANCHA ||
          text.includes('gym') ||
          text.includes('gimnasio') ||
          text.includes('fitness') ||
          text.includes('deporte') ||
          text.includes('cancha')
        ) {
          subKey = 'gym';
          subLabel = 'Gimnasios o Deportes';
          emoji = '🏋️';
        } else if (
          cat === BusinessCategory.HOSPITAL ||
          cat === BusinessCategory.HIDRATACION ||
          text.includes('farmacia') ||
          text.includes('salud') ||
          text.includes('médic') ||
          text.includes('doctor') ||
          text.includes('clínica') ||
          text.includes('hospital')
        ) {
          subKey = 'salud';
          subLabel = 'Farmacias y Salud';
          emoji = '💊';
        }

        wellList.push({
          id: b.id,
          name: b.name,
          categoryName: b.category || subLabel,
          categoryType: 'wellness',
          subCategoryKey: subKey,
          subCategoryLabel: subLabel,
          iconEmoji: emoji,
          imageUrl: b.imageUrl || 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&q=80&w=600',
          locality: b.locality || 'Montañita',
          sector: b.sector,
          rating: b.rating || 4.8,
          reviewCount: b.reviewCount || 12,
          description: b.description,
          coordinates: b.coordinates,
          distanceMeters: dist,
          isVerified: b.isVerified,
          businessRef: b
        });
      }

      // 4. TRAVEL, STAY & LOGISTICS
      if (
        cat === BusinessCategory.HOSPAJE ||
        cat === BusinessCategory.HOTEL ||
        cat === BusinessCategory.HOSTAL ||
        cat === BusinessCategory.TRANSPORT ||
        cat === BusinessCategory.PARADA_TAXI ||
        b.plannerCategory === 'hospedaje' ||
        text.includes('hotel') ||
        text.includes('hostal') ||
        text.includes('alojamiento') ||
        text.includes('suite') ||
        text.includes('cabaña') ||
        text.includes('taxi') ||
        text.includes('transporte') ||
        text.includes('transfer') ||
        text.includes('bus')
      ) {
        let subKey = 'alojamiento';
        let subLabel = 'Alojamientos';
        let emoji = '🏨';

        if (
          cat === BusinessCategory.TRANSPORT ||
          cat === BusinessCategory.PARADA_TAXI ||
          text.includes('taxi') ||
          text.includes('transporte') ||
          text.includes('transfer') ||
          text.includes('alquiler auto') ||
          text.includes('terminal') ||
          text.includes('bus')
        ) {
          subKey = 'transporte';
          subLabel = 'Transporte y Taxis';
          emoji = '🚕';
        }

        travList.push({
          id: b.id,
          name: b.name,
          categoryName: b.category || subLabel,
          categoryType: 'travel',
          subCategoryKey: subKey,
          subCategoryLabel: subLabel,
          iconEmoji: emoji,
          imageUrl: b.imageUrl || 'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&q=80&w=600',
          locality: b.locality || 'Montañita',
          sector: b.sector,
          rating: b.rating || 4.8,
          reviewCount: b.reviewCount || 24,
          description: b.description,
          coordinates: b.coordinates,
          distanceMeters: dist,
          isVerified: b.isVerified,
          businessRef: b
        });
      }
    });

    // Helper to merge live items with curated items to ensure high quality and zero empty lists
    const mergeWithCurated = (liveList: RecommendationItem[], type: 'food' | 'activity' | 'wellness' | 'travel') => {
      const curatedForType = CURATED_FALLBACKS.filter(c => c.categoryType === type);
      const existingNames = new Set(liveList.map(item => item.name.toLowerCase()));
      
      const enrichedCurated = curatedForType
        .filter(c => !existingNames.has(c.name.toLowerCase()))
        .map(c => ({
          ...c,
          distanceMeters: calculateDistanceInMeters(currentCoords, c.coordinates)
        }));

      const merged = [...liveList, ...enrichedCurated];

      // Sort prioritizing distance if known, else by rating
      return merged.sort((a, b) => {
        if (a.distanceMeters !== undefined && b.distanceMeters !== undefined) {
          return a.distanceMeters - b.distanceMeters;
        }
        if (a.distanceMeters !== undefined) return -1;
        if (b.distanceMeters !== undefined) return 1;
        return (b.rating || 0) - (a.rating || 0);
      });
    };

    return {
      food: mergeWithCurated(foodList, 'food'),
      activity: mergeWithCurated(actList, 'activity'),
      wellness: mergeWithCurated(wellList, 'wellness'),
      travel: mergeWithCurated(travList, 'travel')
    };
  }, [allBusinesses, currentBusiness?.id, currentCoords]);

  // Filtered lists based on active subcategory filter
  const filteredFood = useMemo(() => {
    if (foodFilter === 'all') return categorizedData.food;
    return categorizedData.food.filter(item => item.subCategoryKey === foodFilter);
  }, [categorizedData.food, foodFilter]);

  const filteredActivity = useMemo(() => {
    if (actFilter === 'all') return categorizedData.activity;
    return categorizedData.activity.filter(item => item.subCategoryKey === actFilter);
  }, [categorizedData.activity, actFilter]);

  const filteredWellness = useMemo(() => {
    if (wellFilter === 'all') return categorizedData.wellness;
    return categorizedData.wellness.filter(item => item.subCategoryKey === wellFilter);
  }, [categorizedData.wellness, wellFilter]);

  const filteredTravel = useMemo(() => {
    if (travFilter === 'all') return categorizedData.travel;
    return categorizedData.travel.filter(item => item.subCategoryKey === travFilter);
  }, [categorizedData.travel, travFilter]);

  const handleCardClick = (item: RecommendationItem) => {
    if (item.businessRef && onSelectBusiness) {
      onSelectBusiness(item.businessRef);
    } else if (item.coordinates && onViewOnMap) {
      onViewOnMap(item.coordinates);
    }
  };

  // Render a single miniature card
  const renderMiniatureCard = (item: RecommendationItem, accentTheme: 'amber' | 'sky' | 'emerald' | 'indigo') => {
    const themeStyles = {
      amber: {
        border: 'group-hover:border-amber-500/50',
        badgeBg: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
        glow: 'from-amber-500/10',
        btnBg: 'bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 hover:from-amber-400 hover:to-orange-400'
      },
      sky: {
        border: 'group-hover:border-sky-500/50',
        badgeBg: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
        glow: 'from-sky-500/10',
        btnBg: 'bg-gradient-to-r from-sky-500 to-cyan-500 text-slate-950 hover:from-sky-400 hover:to-cyan-400'
      },
      emerald: {
        border: 'group-hover:border-emerald-500/50',
        badgeBg: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
        glow: 'from-emerald-500/10',
        btnBg: 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 hover:from-emerald-400 hover:to-teal-400'
      },
      indigo: {
        border: 'group-hover:border-indigo-500/50',
        badgeBg: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
        glow: 'from-indigo-500/10',
        btnBg: 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white hover:from-indigo-400 hover:to-purple-400'
      }
    }[accentTheme];

    return (
      <div
        key={item.id}
        onClick={() => handleCardClick(item)}
        className={`group shrink-0 w-[230px] sm:w-[270px] bg-slate-900/80 hover:bg-slate-900 rounded-2xl border border-white/10 ${themeStyles.border} overflow-hidden shadow-xl transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl flex flex-col cursor-pointer snap-start relative`}
      >
        {/* Cover Photo */}
        <div className="h-36 relative overflow-hidden bg-slate-800">
          <img
            src={item.imageUrl}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
            loading="lazy"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />

          {/* Proximity / Distance Badge (Top-Right) */}
          <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 bg-black/80 backdrop-blur-md rounded-md border border-white/15 text-[10px] font-bold text-white flex items-center gap-1 shadow-md">
            <MapPin className="w-3 h-3 text-orange-400" />
            <span>{formatDistance(item.distanceMeters, item.locality)}</span>
          </div>

          {/* Subcategory Pill (Bottom-Left) */}
          <div className="absolute bottom-2.5 left-2.5 z-10 max-w-[calc(100%-20px)]">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider backdrop-blur-md border shadow-md ${themeStyles.badgeBg} truncate`}>
              <span>{item.iconEmoji}</span>
              <span className="truncate">{item.subCategoryLabel}</span>
            </span>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between gap-3 bg-gradient-to-b from-slate-900/60 to-slate-950/90">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 truncate">
                {item.categoryName}
              </span>
              {item.isVerified && (
                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-sky-400 shrink-0">
                  <ShieldCheck className="w-3 h-3 text-sky-400" /> Verificado
                </span>
              )}
            </div>

            <h4 className="text-sm font-black text-white group-hover:text-amber-300 transition-colors line-clamp-1">
              {item.name}
            </h4>

            {item.description && (
              <p className="text-[11px] text-slate-400 line-clamp-2 mt-1 leading-snug font-normal">
                {item.description}
              </p>
            )}
          </div>

          {/* Bottom Card Footer */}
          <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span>{item.rating?.toFixed(1) || '4.9'}</span>
              {item.reviewCount ? (
                <span className="text-[10px] text-slate-500">({item.reviewCount})</span>
              ) : null}
            </div>

            <button
              className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all flex items-center gap-1 ${themeStyles.btnBg} active:scale-95 shadow-md`}
            >
              <span>{item.businessRef ? 'Ver Perfil' : 'Explorar'}</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section id="landing-experience" className="space-y-8 sm:space-y-12 pt-8 border-t border-white/10 w-full max-w-full min-w-0">
      
      {/* ─────────────────────────────────────────────────────────────────────────────
          SECTION MASTER HEADER
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-orange-500/20 via-amber-500/20 to-yellow-500/20 border border-orange-500/30">
            <Sparkles className="w-4 h-4 text-orange-400 animate-pulse" />
            <span className="text-[11px] font-black tracking-[0.25em] text-orange-300 uppercase">
              Completa tu experiencia
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white uppercase tracking-wide break-words">
            Descubre qué hacer antes o después de tu visita
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-2xl font-normal">
            Saca el máximo provecho a tu día en <strong className="text-white">{currentBusiness?.locality || 'Montañita'}</strong> con las mejores recomendaciones de gastronomía, actividades, bienestar y logística seleccionadas cerca de <strong className="text-white">{currentBusiness?.name || 'este negocio'}</strong>.
          </p>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CAROUSEL 1: 🍽️ ¿DÓNDE VAS A COMER?
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-amber-950/20 via-slate-900/60 to-slate-950 border border-amber-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🍽️</span>
              <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-wide">
                1. ¿Dónde vas a comer?
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Oferta gastronómica para saciar tu apetito: comida típica e internacional, cafeterías, postres y coctelería.
            </p>
          </div>

          {/* Subcategory Filter Pills + Carousel Controls */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="w-full md:w-auto overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 text-xs w-max">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'restaurantes', label: '🍲 Restaurantes' },
                  { key: 'cafes', label: '☕ Cafés & Postres' },
                  { key: 'bares', label: '🍸 Bares & Lounges' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setFoodFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      foodFilter === tab.key
                        ? 'bg-amber-500 text-slate-950 font-black shadow-md shadow-amber-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scroll Arrows */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <button
                onClick={() => scrollContainer(foodScrollRef, 'left')}
                className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 transition-all border border-white/10 cursor-pointer"
                title="Desplazar a la izquierda"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollContainer(foodScrollRef, 'right')}
                className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 hover:text-amber-400 text-slate-400 transition-all border border-white/10 cursor-pointer"
                title="Desplazar a la derecha"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Horizontal Scroll Track */}
        <div
          ref={foodScrollRef}
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0"
        >
          {filteredFood.map(item => renderMiniatureCard(item, 'amber'))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CAROUSEL 2: 🎭 ¿QUÉ VAS A HACER?
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-sky-950/20 via-slate-900/60 to-slate-950 border border-sky-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🎭</span>
              <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-wide">
                2. ¿Qué vas a hacer?
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Entretenimiento, cultura, surf, miradores panorámicos, caminatas y experiencias recreativas.
            </p>
          </div>

          {/* Subcategory Filter Pills + Carousel Controls */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="w-full md:w-auto overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 text-xs w-max">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'tours', label: '🌿 Rutas & Tours' },
                  { key: 'interes', label: '🏖️ Puntos de Interés' },
                  { key: 'talleres', label: '🏄 Talleres & Surf' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setActFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      actFilter === tab.key
                        ? 'bg-sky-500 text-slate-950 font-black shadow-md shadow-sky-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scroll Arrows */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <button
                onClick={() => scrollContainer(actScrollRef, 'left')}
                className="p-2 rounded-xl bg-white/5 hover:bg-sky-500/20 hover:text-sky-400 text-slate-400 transition-all border border-white/10 cursor-pointer"
                title="Desplazar a la izquierda"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollContainer(actScrollRef, 'right')}
                className="p-2 rounded-xl bg-white/5 hover:bg-sky-500/20 hover:text-sky-400 text-slate-400 transition-all border border-white/10 cursor-pointer"
                title="Desplazar a la derecha"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Horizontal Scroll Track */}
        <div
          ref={actScrollRef}
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0"
        >
          {filteredActivity.map(item => renderMiniatureCard(item, 'sky'))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CAROUSEL 3: 🧘 ¿CÓMO TE VAS A CUIDAR?
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-950/20 via-slate-900/60 to-slate-950 border border-emerald-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🧘</span>
              <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-wide">
                3. ¿Cómo te vas a cuidar?
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Bienestar físico y mental: spas, masajes, yoga, gimnasios, centros deportivos, farmacias y salud.
            </p>
          </div>

          {/* Subcategory Filter Pills + Carousel Controls */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="w-full md:w-auto overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 text-xs w-max">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'spa', label: '🧘 Spas & Yoga' },
                  { key: 'gym', label: '🏋️ Gimnasios & Gym' },
                  { key: 'salud', label: '💊 Farmacias & Salud' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setWellFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      wellFilter === tab.key
                        ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scroll Arrows */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <button
                onClick={() => scrollContainer(wellScrollRef, 'left')}
                className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 transition-all border border-white/10 cursor-pointer"
                title="Desplazar a la izquierda"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollContainer(wellScrollRef, 'right')}
                className="p-2 rounded-xl bg-white/5 hover:bg-emerald-500/20 hover:text-emerald-400 text-slate-400 transition-all border border-white/10 cursor-pointer"
                title="Desplazar a la derecha"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Horizontal Scroll Track */}
        <div
          ref={wellScrollRef}
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0"
        >
          {filteredWellness.map(item => renderMiniatureCard(item, 'emerald'))}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          CAROUSEL 4: 🚗 ¿DÓNDE SIGUE TU VIAJE?
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="space-y-4 p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-indigo-950/20 via-slate-900/60 to-slate-950 border border-indigo-500/20 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-2 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xl">🚗</span>
              <h3 className="text-base sm:text-xl font-black text-white uppercase tracking-wide">
                4. ¿Dónde sigue tu viaje?
              </h3>
            </div>
            <p className="text-xs text-slate-400">
              Logística y continuidad: alojamientos recomendados, terminales, agencias de transporte y pueblos vecinos.
            </p>
          </div>

          {/* Subcategory Filter Pills + Carousel Controls */}
          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="w-full md:w-auto overflow-x-auto no-scrollbar py-0.5 touch-pan-x">
              <div className="flex items-center gap-1.5 p-1 bg-black/40 rounded-xl border border-white/10 text-xs w-max">
                {[
                  { key: 'all', label: 'Todos' },
                  { key: 'alojamiento', label: '🏨 Alojamientos' },
                  { key: 'transporte', label: '🚕 Transporte & Taxis' },
                  { key: 'destinos', label: '📍 Próximos Destinos' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setTravFilter(tab.key as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                      travFilter === tab.key
                        ? 'bg-indigo-500 text-white font-black shadow-md shadow-indigo-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Scroll Arrows */}
            <div className="hidden md:flex items-center gap-1 shrink-0">
              <button
                onClick={() => scrollContainer(travScrollRef, 'left')}
                className="p-2 rounded-xl bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 text-slate-400 transition-all border border-white/10 cursor-pointer"
                title="Desplazar a la izquierda"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => scrollContainer(travScrollRef, 'right')}
                className="p-2 rounded-xl bg-white/5 hover:bg-indigo-500/20 hover:text-indigo-400 text-slate-400 transition-all border border-white/10 cursor-pointer"
                title="Desplazar a la derecha"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Carousel Horizontal Scroll Track */}
        <div
          ref={travScrollRef}
          className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 scroll-smooth snap-x snap-mandatory no-scrollbar touch-pan-x -mx-1 px-1 sm:mx-0 sm:px-0"
        >
          {filteredTravel.map(item => renderMiniatureCard(item, 'indigo'))}
        </div>
      </div>

    </section>
  );
};
