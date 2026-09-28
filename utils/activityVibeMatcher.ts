import { BusinessCategory, Vibe } from '../types';

export interface MatchCriteria {
  raw: string;
  associatedVibes: string[];
  associatedCategories: string[];
  keywords: string[];
  plannerCategory?: 'hospedaje' | 'comida' | 'baile' | 'surf' | null;
  displayName: string;
}

export const getCriteriaForMoodOrActivity = (
  moodOrActivity: string,
  masterActivities: any[] = [],
  masterVibes: any[] = []
): MatchCriteria => {
  const norm = (moodOrActivity || '').trim().toLowerCase();
  
  // 1. Check if it's in masterActivities
  const foundActivity = masterActivities.find(
    a => a.name?.toLowerCase() === norm || a.id === moodOrActivity
  );
  
  // Associated vibe if it's an activity
  const activityVibe = foundActivity?.vibe || '';
  
  // Initialize criteria
  const vibes = new Set<string>();
  const categories = new Set<string>();
  const keywords = new Set<string>();
  let plannerCat: 'hospedaje' | 'comida' | 'baile' | 'surf' | null = null;
  
  if (moodOrActivity) {
    vibes.add(moodOrActivity);
  }
  if (activityVibe) {
    vibes.add(activityVibe);
  }

  // Helper to add search keywords
  const addKeywords = (words: string[]) => words.forEach(w => keywords.add(w.toLowerCase()));
  const addCategories = (cats: string[]) => cats.forEach(c => categories.add(c));
  const addVibes = (vList: string[]) => vList.forEach(v => vibes.add(v));

  // Pattern matchers
  if (norm.includes('fiesta') || norm.includes('farra') || norm.includes('coctel') || norm.includes('cóctel') || norm.includes('bailar') || norm.includes('bar')) {
    addVibes(['De Fiesta & Farra', 'Fiesta', 'Techno', 'Social & Conectar']);
    addCategories([
      'Bares & Vida Nocturna',
      BusinessCategory.BAR,
      BusinessCategory.DISCOTECA,
      BusinessCategory.BAR_DISCOTECA,
      'Bar',
      'Discoteca'
    ]);
    addKeywords(['fiesta', 'farra', 'coctel', 'cóctel', 'trago', 'noche', 'dj', 'musica', 'música', 'baile', 'discoteca', 'bar', 'club', 'pub']);
    plannerCat = 'baile';
  }

  if (norm.includes('surf') || norm.includes('olas') || norm.includes('deporte') || norm.includes('acuatico') || norm.includes('acuático') || norm.includes('aventurero')) {
    addVibes(['Aventurero & Activo', 'Surf', 'Adrenalina', 'Aventura']);
    addCategories([
      'Surf & Deportes Acuáticos',
      BusinessCategory.ESCUELA_SURF,
      BusinessCategory.CENTRO_SURF,
      BusinessCategory.CANCHA,
      BusinessCategory.PLAYA,
      'Surf',
      'Escuela de Surf',
      'Centro de Surf'
    ]);
    addKeywords(['surf', 'tabla', 'ola', 'clase', 'buceo', 'pesca', 'deporte', 'paddle', 'bodyboard', 'instructor', 'renta']);
    plannerCat = 'surf';
  }

  if (norm.includes('desayun') || norm.includes('café') || norm.includes('cafe') || norm.includes('panader') || norm.includes('brunch')) {
    addVibes(['Foodie & Antojos', 'Nómada & Cowork', 'Gastronomía', 'Gastronomia', 'Relajado', 'Relax']);
    addCategories([
      'Cafeterías & Panaderías',
      'Gastronomía & Restaurantes',
      BusinessCategory.RESTAURANTE,
      'Cafetería',
      'Cafeteria',
      'Panadería',
      'Panaderia'
    ]);
    addKeywords(['café', 'cafe', 'desayun', 'panader', 'brunch', 'waffle', 'jugo', 'tostada', 'reposter', 'dulce', 'croissant', 'espresso', 'cappuccino']);
    plannerCat = 'comida';
  }

  if (norm.includes('comid') || norm.includes('comer') || norm.includes('marisco') || norm.includes('pizza') || norm.includes('gastro') || norm.includes('antojo') || norm.includes('hambrient')) {
    addVibes(['Foodie & Antojos', 'Gastronomía', 'Gastronomia', 'Hambriento']);
    addCategories([
      'Gastronomía & Restaurantes',
      'Cafeterías & Panaderías',
      BusinessCategory.RESTAURANTE,
      BusinessCategory.MERCADO,
      'Restaurante',
      'Comida'
    ]);
    addKeywords(['comida', 'marisco', 'pizza', 'almuerzo', 'cena', 'restaurante', 'pescado', 'ceviche', 'asado', 'hamburguesa', 'burger', 'pasta', 'típica', 'tipica', 'sabor']);
    plannerCat = 'comida';
  }

  if (norm.includes('sunset') || norm.includes('atardecer') || norm.includes('golden hour') || norm.includes('caida del sol')) {
    addVibes(['Sunset & Golden Hour', 'Chill & Relax Playero', 'Relax', 'Romance']);
    addCategories([
      'Bares & Vida Nocturna',
      'Información, Cultura & Puntos Clave',
      BusinessCategory.BAR,
      BusinessCategory.PLAYA,
      BusinessCategory.MALECON,
      BusinessCategory.REFERENCIA,
      'Mirador'
    ]);
    addKeywords(['sunset', 'atardecer', 'golden hour', 'mirador', 'acústico', 'acustico', 'playa', 'punta', 'vista', 'trago']);
  }

  if (norm.includes('yoga') || norm.includes('masaje') || norm.includes('spa') || norm.includes('zen') || norm.includes('bienestar') || norm.includes('cuidado personal') || norm.includes('medita')) {
    addVibes(['Zen & Bienestar', 'Wellness', 'Relax', 'Relajado']);
    addCategories([
      'Bienestar, Yoga & Spa',
      'Salud, Farmacias & Emergencias',
      BusinessCategory.HOSPITAL,
      'Spa',
      'Yoga',
      'Centro Holístico'
    ]);
    addKeywords(['yoga', 'masaje', 'spa', 'medita', 'holístic', 'holistic', 'terapia', 'reiki', 'bienestar', 'salud', 'relajante', 'facial']);
  }

  if (norm.includes('tour') || norm.includes('cascada') || norm.includes('ballena') || norm.includes('ecoturismo') || norm.includes('aventura') || norm.includes('curioso') || norm.includes('explorador') || norm.includes('turismo')) {
    addVibes(['Curioso & Explorador', 'Aventurero & Activo', 'Aventura', 'Cultura', 'Otro']);
    addCategories([
      'Tours, Aventura & Ecoturismo',
      'Información, Cultura & Puntos Clave',
      BusinessCategory.TOUR_OPERATOR,
      BusinessCategory.REFERENCIA,
      BusinessCategory.PARQUE,
      BusinessCategory.MALECON,
      'Operador Turístico',
      'Puntos de Interés'
    ]);
    addKeywords(['tour', 'ballena', 'cascada', 'excursión', 'excursion', 'guía', 'guia', 'reserva', 'parapente', 'cabalgata', 'isla', 'sendero', 'avistamiento']);
  }

  if (norm.includes('artesan') || norm.includes('tienda') || norm.includes('ropa') || norm.includes('comprar') || norm.includes('souvenir') || norm.includes('shopping')) {
    addVibes(['Curioso & Explorador', 'Cultura']);
    addCategories([
      'Artesanías & Tiendas de Playa',
      'Minimarkets, Víveres & Licorerías',
      BusinessCategory.SHOPPING,
      BusinessCategory.MERCADO,
      'Tienda',
      'Boutique'
    ]);
    addKeywords(['artesan', 'ropa', 'playa', 'tienda', 'souvenir', 'bikini', 'joya', 'pulsera', 'recuerdo', 'vestido', 'artesanía']);
  }

  if (norm.includes('trabaj') || norm.includes('cowork') || norm.includes('wifi') || norm.includes('nómada') || norm.includes('nomada') || norm.includes('remoto')) {
    addVibes(['Nómada & Cowork', 'Curioso', 'Inspirado']);
    addCategories([
      'Cafeterías & Panaderías',
      'Hospedaje & Alojamientos',
      BusinessCategory.HOTEL,
      BusinessCategory.HOSTAL,
      'Coworking'
    ]);
    addKeywords(['cowork', 'wifi', 'wi-fi', 'trabaj', 'nómada', 'nomada', 'enchufe', 'escritorio', 'remoto', 'café']);
    plannerCat = 'hospedaje';
  }

  if (norm.includes('romántic') || norm.includes('romantic') || norm.includes('pareja') || norm.includes('cena romántica') || norm.includes('cita')) {
    addVibes(['Romántico & Parejas', 'Romance', 'Sunset & Golden Hour']);
    addCategories([
      'Gastronomía & Restaurantes',
      'Hospedaje & Alojamientos',
      BusinessCategory.RESTAURANTE,
      BusinessCategory.HOTEL,
      'Cena'
    ]);
    addKeywords(['romántic', 'romantic', 'pareja', 'cena', 'íntim', 'intim', 'vino', 'velas', 'aniversario', 'frente al mar']);
    plannerCat = 'comida';
  }

  if (norm.includes('relax') || norm.includes('hamaca') || norm.includes('descans') || norm.includes('playa') || norm.includes('chill') || norm.includes('cansado')) {
    addVibes(['Chill & Relax Playero', 'Relax', 'Relajado', 'Zen & Bienestar']);
    addCategories([
      'Hospedaje & Alojamientos',
      BusinessCategory.HOTEL,
      BusinessCategory.HOSTAL,
      BusinessCategory.HOSPAJE,
      BusinessCategory.PLAYA,
      BusinessCategory.PARQUE,
      'Hostal',
      'Hotel',
      'Cabaña'
    ]);
    addKeywords(['relax', 'hamaca', 'playa', 'mar', 'tranquil', 'descanso', 'sol', 'cabaña', 'piscina', 'acantilado']);
    plannerCat = 'hospedaje';
  }

  if (norm.includes('social') || norm.includes('conectar') || norm.includes('viajero') || norm.includes('amigo') || norm.includes('conocer')) {
    addVibes(['Social & Conectar', 'De Fiesta & Farra', 'Familia']);
    addCategories([
      'Bares & Vida Nocturna',
      'Hospedaje & Alojamientos',
      BusinessCategory.HOSTAL,
      BusinessCategory.BAR,
      'Hostal'
    ]);
    addKeywords(['social', 'amigo', 'viajero', 'hostal', 'comunidad', 'gente', 'compartir', 'bar', 'evento']);
    plannerCat = 'baile';
  }

  // Fallback defaults
  if (categories.size === 0) {
    addCategories(['Gastronomía & Restaurantes', 'Bares & Vida Nocturna', 'Hospedaje & Alojamientos']);
  }

  return {
    raw: moodOrActivity,
    associatedVibes: Array.from(vibes),
    associatedCategories: Array.from(categories),
    keywords: Array.from(keywords),
    plannerCategory: plannerCat,
    displayName: moodOrActivity
  };
};

/**
 * Filter and sort businesses that best match the selected mood or activity criteria in the current locality
 */
export const filterBusinessesByCriteria = (
  businesses: any[],
  criteria: MatchCriteria,
  localityName: string,
  userOrLocCoords?: [number, number] | null,
  getDistanceFn?: (coord1: [number, number], coord2: [number, number]) => number
): any[] => {
  if (!criteria || !criteria.raw) return [];
  
  const normLoc = (localityName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  const matched = businesses.filter(b => {
    // 1. Locality matching (normalize accents)
    if (localityName) {
      const bizLoc = (b.locality || 'Montañita').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isLocMatch = bizLoc === normLoc || bizLoc.includes(normLoc) || normLoc.includes(bizLoc) || b.name?.toLowerCase().includes('ubicame.info');
      if (!isLocMatch) return false;
    }

    // Exclude sectors from business recommendations
    if (b.mapType === 'sector' || b.category === BusinessCategory.REFERENCIA && b.isReference) {
      // allow references only if they match keywords (e.g. mirador, parque)
    }

    const bCat = (b.category || '').toLowerCase();
    const bName = (b.name || '').toLowerCase();
    const bDesc = (b.description || '').toLowerCase();
    const bMoods = (b.moods || []).map((m: string) => (m || '').toLowerCase());
    const bPlanner = b.plannerCategory?.toLowerCase();

    // 2. Direct category match
    const categoryMatch = criteria.associatedCategories.some(cat => {
      const c = cat.toLowerCase();
      return bCat === c || bCat.includes(c) || c.includes(bCat);
    });

    // 3. Planner category match
    const plannerMatch = criteria.plannerCategory && bPlanner && bPlanner === criteria.plannerCategory.toLowerCase();

    // 4. Vibe / Mood match
    const vibeMatch = criteria.associatedVibes.some(v => {
      const vNorm = v.toLowerCase();
      return bMoods.some(bm => bm === vNorm || bm.includes(vNorm) || vNorm.includes(bm));
    });

    // 5. Keyword match
    const keywordMatch = criteria.keywords.some(kw => {
      return bName.includes(kw) || bDesc.includes(kw) || bCat.includes(kw);
    });

    return categoryMatch || plannerMatch || vibeMatch || keywordMatch;
  });

  // Rank and sort
  const planWeight = (plan: string) => {
    if (plan === 'EXPERT' || plan === 'expert') return 4;
    if (plan === 'ELITE' || plan === 'elite') return 3;
    if (plan === 'PRO' || plan === 'pro') return 2;
    return 1;
  };

  return matched.sort((a, b) => {
    const weightA = planWeight(a.plan);
    const weightB = planWeight(b.plan);
    if (weightA !== weightB) {
      return weightB - weightA;
    }
    if (userOrLocCoords && getDistanceFn && a.coordinates && b.coordinates) {
      const distA = getDistanceFn(userOrLocCoords, a.coordinates);
      const distB = getDistanceFn(userOrLocCoords, b.coordinates);
      return distA - distB;
    }
    return 0;
  });
};

/**
 * Filter events that match the selected mood or activity criteria
 */
export const filterEventsByCriteria = (
  events: any[],
  businesses: any[],
  criteria: MatchCriteria,
  localityName: string
): any[] => {
  if (!criteria || !criteria.raw) return events;

  const normLoc = (localityName || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  return events.filter(e => {
    // 1. Locality check
    if (localityName) {
      const biz = businesses.find(b => b.id === e.businessId);
      const eventLocality = e.locality || biz?.locality || 'Montañita';
      const eventNormLoc = (eventLocality || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const isLocMatch = eventNormLoc === normLoc || eventNormLoc.includes(normLoc) || normLoc.includes(eventNormLoc);
      if (!isLocMatch) return false;
    }

    const eVibe = (e.vibe || '').toLowerCase();
    const eName = (e.name || e.title || '').toLowerCase();
    const eDesc = (e.description || '').toLowerCase();

    // 2. Direct or associated vibe match
    const vibeMatch = criteria.associatedVibes.some(v => {
      const vNorm = v.toLowerCase();
      return eVibe === vNorm || eVibe.includes(vNorm) || vNorm.includes(eVibe);
    });

    // 3. Keyword match in event title, desc or vibe
    const keywordMatch = criteria.keywords.some(kw => {
      return eName.includes(kw) || eDesc.includes(kw) || eVibe.includes(kw);
    });

    // 4. Host business match
    const hostBiz = businesses.find(b => b.id === e.businessId);
    let bizMatch = false;
    if (hostBiz) {
      const bCat = (hostBiz.category || '').toLowerCase();
      bizMatch = criteria.associatedCategories.some(cat => {
        const c = cat.toLowerCase();
        return bCat === c || bCat.includes(c) || c.includes(bCat);
      }) || (criteria.plannerCategory && hostBiz.plannerCategory === criteria.plannerCategory);
    }

    return vibeMatch || keywordMatch || bizMatch;
  });
};

