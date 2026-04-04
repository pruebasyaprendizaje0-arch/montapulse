import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Navigation, Layers, Plus, Minus, X, CheckCircle, MapPin, Zap, Flame, Info } from 'lucide-react';
import { Business, Sector, MontanitaEvent, SubscriptionPlan, BusinessCategory, CommunityPost } from '../../types.ts';
import { SECTOR_INFO, LOCALITIES, MAP_ICONS } from '../../constants.ts';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';

interface MapViewProps {
  onBusinessSelect: (business: Business) => void;
  selectedSector: Sector | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isPremiumUser?: boolean;
  userBusinessId?: string;
  userId?: string;
  onAddBusiness?: (lat: number, lng: number, isReference?: boolean) => void;
  onDeleteBusiness?: (id: string) => void;
  onUpdateBusiness?: (id: string, lat: number, lng: number) => void;
  onEditBusiness?: (id: string) => void;
  onUpdateSector?: (sector: Sector, coords: [number, number][]) => void;
  businesses: Business[];
  sectorPolygons: Record<Sector, [number, number][]>;
  isEditorFocus?: boolean;
  onToggleEditorFocus?: () => void;
  isPanelMinimized?: boolean;
  onTogglePanel?: () => void;
  hideUI?: boolean;
  mapCenter?: [number, number] | null;
  localityName?: string;
  onLocalityChange?: (name: string) => void;
  onResetFilters?: () => void;
  events: MontanitaEvent[];
  posts: CommunityPost[];
  isMovingBusiness?: boolean;
  movingBusinessId?: string;
  onMoveBusinessComplete?: () => void;
  onStartMoveBusiness?: () => void;
  customLocalities?: { name: string; coords: [number, number]; zoom: number }[];
  activeTab: 'events' | 'directory' | 'landmarks';
  onAddLocality?: (name: string, coords: [number, number], hasBeach: boolean) => void;
  focusedBusinessId?: string | null;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; shadow: string }> = {
  palmtree: { bg: 'linear-gradient(135deg, #06b6d4, #0891b2)', border: '#22d3ee', shadow: '0 0 15px rgba(34, 211, 238, 0.4)' },
  music: { bg: 'linear-gradient(135deg, #ec4899, #db2777)', border: '#f472b6', shadow: '0 0 15px rgba(244, 114, 182, 0.4)' },
  waves: { bg: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: '#38bdf8', shadow: '0 0 15px rgba(56, 189, 248, 0.4)' },
  food: { bg: 'linear-gradient(135deg, #f97316, #ea580c)', border: '#fb923c', shadow: '0 0 15px rgba(251, 146, 60, 0.4)' },
  hotel: { bg: 'linear-gradient(135deg, #eab308, #ca8a04)', border: '#fbbf24', shadow: '0 0 15px rgba(251, 191, 36, 0.4)' },
  leaf: { bg: 'linear-gradient(135deg, #22c55e, #16a34a)', border: '#4ade80', shadow: '0 0 15px rgba(74, 222, 128, 0.4)' },
  mountain: { bg: 'linear-gradient(135deg, #a855f7, #9333ea)', border: '#c084fc', shadow: '0 0 15px rgba(192, 132, 252, 0.4)' },
  shopping: { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#a78bfa', shadow: '0 0 15px rgba(167, 139, 250, 0.4)' },
  church: { bg: 'linear-gradient(135deg, #78716c, #57534e)', border: '#a8a29e', shadow: '0 0 15px rgba(168, 162, 158, 0.4)' },
  bus: { bg: 'linear-gradient(135deg, #64748b, #475569)', border: '#94a3b8', shadow: '0 0 15px rgba(148, 163, 184, 0.4)' },
  default: { bg: 'linear-gradient(135deg, #3b82f6, #2563eb)', border: '#60a5fa', shadow: '0 0 15px rgba(96, 165, 250, 0.4)' },
};

const REFERENCE_STYLE = { bg: 'linear-gradient(135deg, #0ea5e9, #0284c7)', border: '#38bdf8', shadow: '0 0 15px rgba(56, 189, 248, 0.5)' };
const BUSINESS_STYLE = { bg: 'linear-gradient(135deg, #8b5cf6, #7c3aed)', border: '#a78bfa', shadow: '0 0 15px rgba(167, 139, 250, 0.4)' };

const CATEGORY_ICONS: Record<string, string> = {
  palmtree: '🏖️',
  music: '🍹',
  waves: '🏄',
  food: '🍕',
  hotel: '🏨',
  leaf: '🌿',
  mountain: '⛰️',
  shopping: '🛍️',
  church: '⛪',
  bus: '🚌',
  zap: '⚡',
  cafe: '☕',
  cocktail: '🍸',
  park: '🌳',
  camera: '📸',
  medical: '🏥',
  pharmacy: '💊',
  bank: '🏦',
  gas: '⛽',
  parking: '🅿️',
  beach: '🏖️',
  store: '🏪',
  gym: '🏋️',
  spa: '💆',
  art: '🎨',
  anchor: '⚓',
  tent: '⛺',
  bicycle: '🚴',
  school: '🏫',
  location: '📍',
};

export const MapView: React.FC<MapViewProps> = ({
  onBusinessSelect,
  selectedSector,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  isAdmin,
  isSuperAdmin,
  isPremiumUser,
  userBusinessId,
  userId,
  onAddBusiness,
  onDeleteBusiness,
  onUpdateBusiness,
  onEditBusiness,
  onUpdateSector,
  businesses,
  sectorPolygons,
  isEditorFocus,
  isPanelMinimized,
  hideUI,
  mapCenter,
  onLocalityChange,
  onResetFilters,
  onTogglePanel,
  onToggleEditorFocus,
  localityName = 'Montañita',
  events = [],
  posts = [],
  isMovingBusiness = false,
  movingBusinessId,
  onMoveBusinessComplete,
  onStartMoveBusiness,
  customLocalities = [],
  onAddLocality,
  activeTab,
  focusedBusinessId
}) => {
  const { t } = useTranslation();
  const { showConfirm, showPrompt } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapMode, setMapMode] = useState<'dark' | 'satellite'>('satellite');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [tempCoords, setTempCoords] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [addingPointType, setAddingPointType] = useState<'business' | 'reference'>('business');
  const previewPolylineRef = useRef<L.Polyline | null>(null);

  const currentTileModeRef = useRef<'dark' | 'satellite' | null>(null);
  // Stable refs for callbacks so they never trigger the big effect
  const onBusinessSelectRef = useRef(onBusinessSelect);
  const onUpdateBusinessRef = useRef(onUpdateBusiness);
  const prevMapCenterRef = useRef<[number, number] | null | undefined>(undefined);
  useEffect(() => { onBusinessSelectRef.current = onBusinessSelect; });
  useEffect(() => { onUpdateBusinessRef.current = onUpdateBusiness; });

  const updateTiles = (map: L.Map, mode: 'dark' | 'satellite') => {
    // Check if the current layer is actually on the map
    const layerExists = tileLayerRef.current && map.hasLayer(tileLayerRef.current);
    
    // Skip if already on this mode AND the layer is still there AND it's visible
    if (currentTileModeRef.current === mode && layerExists) {
      if (tileLayerRef.current) tileLayerRef.current.setOpacity(1);
      return;
    }

    const url = mode === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    tileLayerRef.current = L.tileLayer(url, { 
      maxZoom: 20,
      attribution: mode === 'dark' ? '&copy; CartoDB' : '&copy; Esri',
      noWrap: false,
      keepBuffer: 8,
      crossOrigin: 'anonymous'
    }).addTo(map);

    // Force visibility and order
    tileLayerRef.current.setOpacity(1);
    tileLayerRef.current.bringToBack();
    
    currentTileModeRef.current = mode;
    
    // Staggered invalidation to ensure layout is captured
    [50, 200].forEach(delay => setTimeout(() => map.invalidateSize(), delay));
  };

  const handleSuperAdminAction = async (business: Business) => {
    const action = await showPrompt(
      "1. Editar Detalles\n2. Eliminar Punto",
      "Introduce 1 o 2",
      `ADMIN - ${business.name}`
    );
    if (action === '1') onEditBusiness?.(business.id);
    else if (action === '2' && await showConfirm(`¿Eliminar ${business.name}?`, "Confirmar Eliminación")) {
      onDeleteBusiness?.(business.id);
    }
  };

  const handlePremiumAction = async (business: Business) => {
    const isOwnBusiness = business.id === userBusinessId || business.ownerId === userId;
    if (!isOwnBusiness) {
      onBusinessSelect(business);
      return;
    }
    const action = await showPrompt(
      "1. Editar Mi Negocio\n2. Eliminar Mi Negocio",
      "Introduce 1 o 2",
      `MI NEGOCIO - ${business.name}`
    );
    if (action === '1') onEditBusiness?.(business.id);
    else if (action === '2' && await showConfirm(`¿Eliminar ${business.name}?`, "Confirmar Eliminación")) {
      onDeleteBusiness?.(business.id);
    }
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const center: L.LatLngExpression = [-1.825, -80.753];
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      // CRITICAL: Disable fadeAnimation to prevent tiles getting stuck at 0 opacity
      fadeAnimation: false, 
      zoomAnimation: true,
      markerZoomAnimation: true,
      scrollWheelZoom: true,
      tap: true,
      preferCanvas: true
    }).setView(center, 15);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    polygonsLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);

    updateTiles(map, mapMode);
    
    // Inject global fixes for Leaflet rendering glitches
    const style = document.createElement('style');
    style.innerHTML = `
      .leaflet-tile-pane { opacity: 1 !important; }
      .leaflet-layer { opacity: 1 !important; }
      .leaflet-tile { opacity: 1 !important; visibility: visible !important; }
      .leaflet-container { background: #020617 !important; outline: none !important; }
      .leaflet-marker-icon { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
    `;
    document.head.appendChild(style);

    // Multiple invalidations on startup to ensure tiles load correctly
    [100, 300, 800, 1500].forEach(delay => {
      setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize({ animate: false }); }, delay);
    });

    return () => {
      document.head.removeChild(style);
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      currentTileModeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) updateTiles(mapRef.current, mapMode);
  }, [mapMode]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersLayerRef.current || !polygonsLayerRef.current || !heatmapLayerRef.current) return;

    markersLayerRef.current.clearLayers();
    polygonsLayerRef.current.clearLayers();
    heatmapLayerRef.current.clearLayers();

    if (showHeatmap) {
      events.forEach((event) => {
        if (!event.coordinates) return;
        const heat = 0.5 + (Math.random() * 0.5);
        const radius = 30 + (heat * 20);

        L.circle([event.coordinates[0], event.coordinates[1]], {
          radius: radius,
          fillColor: '#f43f5e',
          fillOpacity: 0.15 + (heat * 0.25),
          color: 'transparent',
          className: 'heatmap-pulse'
        }).addTo(heatmapLayerRef.current!);

        L.circle([event.coordinates[0], event.coordinates[1]], {
          radius: 10,
          fillColor: '#f43f5e',
          fillOpacity: 0.8,
          color: '#ffffff',
          weight: 2,
          className: 'heatmap-core'
        }).addTo(heatmapLayerRef.current!);
      });
    }

    Object.entries(sectorPolygons).forEach(([sectorName, coords]) => {
      const sector = sectorName as Sector;
      const info = SECTOR_INFO[sector] || SECTOR_INFO[Sector.CENTRO];
      if (editingSector === sector) {
        L.polygon((tempCoords.length > 0 ? tempCoords : coords) as L.LatLngExpression[], {
          color: info.color,
          fillColor: info.color,
          fillOpacity: 0.4,
          weight: 4,
          dashArray: '10, 10'
        }).addTo(polygonsLayerRef.current!);
      }
    });

    businesses.forEach((business) => {
      const sq = searchQuery || '';
      const isVisible = activeFilter === 'All' || business.category === activeFilter;
      const matchesSearch = !sq || (business.name ?? '').toLowerCase().includes(sq.toLowerCase());
      
      const isReference = business.isReference === true;
      const hasActiveEvents = events.some(e => e.businessId === business.id);
      
      let tabMatch = false;
      if (activeTab === 'events') {
        tabMatch = hasActiveEvents;
      } else if (activeTab === 'directory') {
        tabMatch = !isReference;
      } else if (activeTab === 'landmarks') {
        tabMatch = isReference;
      }

      const isActuallyVisible = isVisible && matchesSearch && tabMatch;

      if (isActuallyVisible) {
        const isPremium = business.plan === SubscriptionPlan.EXPERT;

        let iconKey: string;
        let markerBg: string;
        let borderColor: string;
        let markerShadow: string;

        if (isReference) {
          iconKey = business.icon || 'church';
          markerBg = REFERENCE_STYLE.bg;
          borderColor = REFERENCE_STYLE.border;
          markerShadow = REFERENCE_STYLE.shadow;
        } else {
          iconKey = business.category === BusinessCategory.RESTAURANTE ? 'food' :
            business.category === BusinessCategory.BAR || business.category === BusinessCategory.DISCOTECA || business.category === BusinessCategory.BAR_DISCOTECA ? 'music' :
              business.category === BusinessCategory.HOTEL || business.category === BusinessCategory.HOSTAL || business.category === BusinessCategory.HOSPAJE ? 'hotel' :
                business.category === BusinessCategory.ESCUELA_SURF || business.category === BusinessCategory.CENTRO_SURF ? 'waves' :
                  business.category === BusinessCategory.PARQUE || business.category === BusinessCategory.PLAYA ? 'palmtree' :
                    business.category === BusinessCategory.TOUR_OPERATOR ? 'mountain' :
                      business.category === BusinessCategory.SHOPPING ? 'shopping' :
                        business.category === BusinessCategory.MALECON ? 'church' :
                          business.category === BusinessCategory.TRANSPORT || business.category === BusinessCategory.PARADA_TAXI ? 'bus' :
                            business.icon || 'palmtree';

          const categoryStyle = CATEGORY_COLORS[iconKey] || CATEGORY_COLORS.default;
          markerBg = isPremium ? 'linear-gradient(135deg, #b45309, #d97706)' : categoryStyle.bg;
          borderColor = isPremium ? '#fbbf24' : categoryStyle.border;
          markerShadow = isPremium ? 'box-shadow: 0 0 20px rgba(251, 191, 36, 0.4)' : `box-shadow: ${categoryStyle.shadow}`;
        }

        const svg = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS.palmtree;

        const customIcon = L.divIcon({
          html: `
            <div class="relative group flex flex-col items-center">
              <div class="absolute inset-x-0 bottom-0 h-2 bg-black/30 blur-md rounded-full transform translate-y-2 scale-75"></div>
              <div class="relative w-10 h-10 bg-slate-900 border-2 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1" style="border-color: ${borderColor}; ${markerShadow}">
                ${svg}
              </div>
              
              <div class="mt-1.5 px-2 py-0.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg shadow-xl pointer-events-none transition-all duration-300 group-hover:bg-slate-800 group-hover:border-white/20 group-hover:scale-105">
                <span class="text-[9px] font-black text-white uppercase tracking-tighter whitespace-nowrap block max-w-[80px] overflow-hidden text-ellipsis">${business.name}</span>
                ${isReference ? '<span class="block text-[7px] text-cyan-400 font-bold">REF</span>' : ''}
              </div>

              ${isPremium && !isReference ? `
                <div class="absolute -top-2 -left-2 w-5 h-5 bg-amber-500 rounded-full border-2 border-slate-900 flex items-center justify-center z-10 shadow-lg animate-bounce duration-[3s]">
                  <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                </div>
              ` : ''}
              ${posts.some(p => p.authorId === business.id || p.content.includes(business.name)) && !isReference ? `
                <div class="absolute -top-2 -right-2 w-4 h-4 bg-sky-500 rounded-full border-2 border-slate-900 animate-pulse flex items-center justify-center">
                  <div class="w-1.5 h-1.5 bg-white rounded-full"></div>
                </div>
              ` : ''}
            </div>
          `,
          className: 'custom-marker',
          iconSize: [40, 60],
          iconAnchor: [20, 20],
        });

        const isOwnBusiness = business.id === userBusinessId || business.ownerId === userId;
        const canEdit = isSuperAdmin || (isPremiumUser && isOwnBusiness);
        
        // Get coordinates - use default locality coords if missing
        const businessLocality = business.locality || localityName || 'Montañita';
        const defaultCoords = LOCALITIES.find(l => l.name === businessLocality)?.coords 
          || customLocalities?.find(l => l.name === businessLocality)?.coords 
          || [-1.825, -80.753];
        
        const lat = business.location?.lat ?? business.coordinates?.[0] ?? defaultCoords[0];
        const lng = business.location?.lng ?? business.coordinates?.[1] ?? defaultCoords[1];

        const marker = L.marker([lat, lng], {
          icon: customIcon,
          draggable: canEdit,
          autoPan: true,
        })
          .addTo(markersLayerRef.current!)
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e as any);
            if (isSuperAdmin) {
              handleSuperAdminAction(business);
            } else if (isPremiumUser && isOwnBusiness) {
              handlePremiumAction(business);
            } else {
              onBusinessSelectRef.current(business);
            }
          });

        if (canEdit) {
          marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            onUpdateBusinessRef.current?.(business.id, lat, lng);
          });
        }
      }
    });

    const sq = searchQuery || '';
    const showEvents = activeTab === 'events';

    if (showEvents) {
      events.forEach(event => {
        const matchesEventSearch = !sq || event.title.toLowerCase().includes(sq.toLowerCase());
        if (!event.coordinates || !matchesEventSearch) return;
        const isFlash = event.isFlashOffer;
      const icon = L.divIcon({
        html: `
          <div class="relative group cursor-pointer flex flex-col items-center">
            ${isFlash ? `
              <div class="absolute inset-x-0 bottom-0 h-2 bg-black/30 blur-md rounded-full transform translate-y-2 scale-75"></div>
              <div class="absolute inset-0 bg-rose-500 rounded-full blur-[15px] animate-ping opacity-60 translate-y-[-12px]"></div>
              <div class="absolute inset-0 bg-rose-400 rounded-full blur-[25px] opacity-20 animate-pulse translate-y-[-12px]"></div>
            ` : `
              <div class="absolute inset-x-0 bottom-0 h-2 bg-black/30 blur-md rounded-full transform translate-y-2 scale-75"></div>
              <div class="absolute inset-0 bg-sky-500 rounded-full blur-[12px] animate-ping opacity-40 translate-y-[-12px]"></div>
            `}
            <div class="relative w-12 h-12 ${isFlash ? 'bg-rose-600 shadow-rose-500/50' : 'bg-sky-600 shadow-sky-500/50'} border-2 border-white rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 group-hover:scale-110">
              ${isFlash ? CATEGORY_ICONS.zap : CATEGORY_ICONS.palmtree}
              ${isFlash ? `
                <div class="absolute -top-3 -right-6 bg-rose-500 text-[8px] font-black px-1.5 py-0.5 rounded-full border border-white shadow-xl rotate-12 animate-bounce">
                  ⚡ FLASH
                </div>
              ` : ''}
            </div>

            <div class="mt-2 px-3 py-1 ${isFlash ? 'bg-rose-600/90' : 'bg-sky-600/90'} backdrop-blur-md border border-white/20 rounded-xl shadow-2xl pointer-events-none transition-all duration-300 rotate-[-1deg] group-hover:rotate-0 group-hover:scale-105">
              <span class="text-[10px] font-black text-white uppercase tracking-tighter whitespace-nowrap block max-w-[100px] overflow-hidden text-ellipsis">${event.title}</span>
            </div>
          </div>
        `,
        className: 'event-marker',
        iconSize: [48, 80],
        iconAnchor: [24, 24],
      });

        L.marker([event.coordinates[0], event.coordinates[1]], { icon })
          .addTo(markersLayerRef.current!)
          .on('click', () => onBusinessSelectRef.current(event as any));
      });
    }

    if (selectedSector) {
      const coords = sectorPolygons[selectedSector];
      if (coords && coords.length > 0) {
        const bounds = L.latLngBounds(coords as L.LatLngExpression[]);
        if (bounds.isValid()) map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
      }
    } else if (mapCenter) {
      const prev = prevMapCenterRef.current;
      const centerChanged = !prev || prev[0] !== mapCenter[0] || prev[1] !== mapCenter[1];
      if (centerChanged) {
        prevMapCenterRef.current = mapCenter;
        map.flyTo(mapCenter, 15, { duration: 1.2 });
      }
    }
  }, [businesses, events, sectorPolygons, selectedSector, searchQuery, activeFilter, isAdmin, isSuperAdmin, editingSector, tempCoords, mapCenter, localityName, showHeatmap, posts, isEditorFocus, activeTab]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (editingSector) {
        setTempCoords(prev => [...prev, [lat, lng]]);
      } else if (isAddingPoint && onAddBusiness) {
        const isRef = addingPointType === 'reference';
        if (isSuperAdmin || (!isRef && isPremiumUser)) {
          onAddBusiness(lat, lng, isRef);
          setIsAddingPoint(false);
          [100, 300, 600, 1000, 2000].forEach(delay =>
            setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize({ animate: false }); }, delay)
          );
        }
      } else if (isMovingBusiness && movingBusinessId && onUpdateBusiness) {
        onUpdateBusiness(movingBusinessId, lat, lng);
        onMoveBusinessComplete?.();
      }
    };
    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (editingSector) setMousePos([e.latlng.lat, e.latlng.lng]);
    };
    map.on('click', onClick);
    map.on('mousemove', onMouseMove);
    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMouseMove);
    };
  }, [isSuperAdmin, isPremiumUser, isAddingPoint, addingPointType, editingSector, isMovingBusiness, movingBusinessId, onAddBusiness, onUpdateBusiness, onMoveBusinessComplete]);

  // Invalidate map whenever UI interaction states change
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;
    [10, 200, 500].forEach(delay => {
      setTimeout(() => map.invalidateSize({ animate: false }), delay);
    });
  }, [isAddingPoint, isMovingBusiness, editingSector]);

  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;
    const map = mapRef.current;
    const refresh = () => map.invalidateSize();
    const resizeObserver = new ResizeObserver(refresh);
    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', refresh);
    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', refresh);
    };
  }, []);

  useEffect(() => {
    if (!mapRef.current || !editingSector || tempCoords.length === 0 || !mousePos) {
      if (previewPolylineRef.current) {
        previewPolylineRef.current.remove();
        previewPolylineRef.current = null;
      }
      return;
    }
    const map = mapRef.current;
    const points = [tempCoords[tempCoords.length - 1], mousePos];
    if (!previewPolylineRef.current) {
      previewPolylineRef.current = L.polyline(points as L.LatLngExpression[], {
        color: (SECTOR_INFO[editingSector] || SECTOR_INFO[Sector.CENTRO]).color,
        weight: 2,
        dashArray: '5, 10',
        opacity: 0.8,
        interactive: false
      }).addTo(map);
    } else {
      previewPolylineRef.current.setLatLngs(points as L.LatLngExpression[]);
    }
  }, [mousePos, editingSector, tempCoords]);

  useEffect(() => {
    if (focusedBusinessId && mapRef.current) {
      const business = businesses.find(b => b.id === focusedBusinessId);
      if (business?.coordinates) {
        mapRef.current.flyTo([business.coordinates[0], business.coordinates[1]], 16, { duration: 1 });
        onBusinessSelect(business);
      }
    }
  }, [focusedBusinessId, businesses, onBusinessSelect]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  return (
    <div className={`w-full h-full relative bg-[#020617] overflow-hidden ${isAddingPoint || isMovingBusiness ? 'cursor-crosshair' : ''}`}>
      {/* Map Container - Independent to avoid DOM conflicts */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-0"
      />

      {/* UI Overlay */}
      <div className="absolute inset-0 z-10 pointer-events-none">
        
        {/* Help Overlay */}
        {isAddingPoint && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[2000] px-6 py-3 bg-rose-600 border border-white/20 rounded-2xl shadow-2xl flex items-center gap-3 animate-bounce pointer-events-auto">
            <MapPin className="w-4 h-4 text-white animate-pulse" />
            <span className="text-sm font-black text-white uppercase tracking-widest italic drop-shadow-lg">
              {addingPointType === 'reference' ? 'Haz clic para añadir Punto de Referencia' : 'Haz clic para posicionar Negocio'}
            </span>
          </div>
        )}

        {/* SuperAdmin Tools */}
        {isSuperAdmin && onAddLocality && (
          <div className="absolute top-4 right-4 z-[1001] pointer-events-auto">
            <button
              onClick={async () => {
                const name = await showPrompt('Nombre del nuevo pueblo:', 'Nombre del pueblo');
                if (name) {
                  const coordsStr = await showPrompt('Coordenadas (lat, lng):', '-1.825, -80.753');
                  if (coordsStr) {
                    const coords = coordsStr.split(',').map(s => parseFloat(s.trim())) as [number, number];
                    if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                      const hasBeach = await showConfirm('¿Este pueblo tiene playa?', 'Confirmar Playa');
                      onAddLocality(name, coords, hasBeach);
                    }
                  }
                }
              }}
              className="px-5 py-3 rounded-full text-sm font-black uppercase tracking-widest transition-all duration-300 bg-gradient-to-r from-emerald-500 to-green-500 text-white hover:from-emerald-400 hover:to-green-400 border-2 border-emerald-400 shadow-xl shadow-emerald-500/40 animate-pulse"
            >
              + Agregar Pueblo
            </button>
          </div>
        )}

        <div className="absolute inset-x-0 top-20 z-[1000] p-4">
          <div className="max-w-xl mx-auto space-y-6">
            {!hideUI && (
              <div className="flex justify-center">
                <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 flex items-center shadow-2xl ring-1 ring-white/5 pointer-events-auto">
                  {[...LOCALITIES, ...(customLocalities || [])].map((loc) => (
                    <button
                      key={loc.name}
                      onClick={() => onLocalityChange?.(loc.name)}
                      className={`px-6 py-2 rounded-full text-[11px] font-black uppercase tracking-[0.15em] transition-all duration-300 ${localityName === loc.name ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'}`}
                    >
                      {loc.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {!hideUI && !isPanelMinimized && (
          <div className="absolute left-6 bottom-32 glass-panel p-5 rounded-[2rem] border-white/5 shadow-2xl animate-in slide-in-from-left duration-700 pointer-events-auto max-w-[200px] z-[1000]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-sky-500/20 rounded-xl">
                <Info className="w-4 h-4 text-sky-400" />
              </div>
              <span className="text-xs font-black uppercase tracking-widest text-white">Mapa Guide</span>
            </div>

            <div className="space-y-3">
              {[
                { key: 'food', label: 'Negocios', color: 'bg-purple-500' },
                { key: 'church', label: 'Referencias', color: 'bg-cyan-500' },
                { key: 'zap', label: 'Live Events', special: true }
              ].map((item) => (
                <div key={item.key} className="flex items-center gap-3 group">
                  <div className={`w-8 h-8 ${item.color || 'bg-slate-800'} rounded-lg flex items-center justify-center text-white border border-white/5 shadow-lg group-hover:scale-110 transition-transform ${item.special ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-900' : ''}`}>
                    <span dangerouslySetInnerHTML={{ __html: CATEGORY_ICONS[item.key] }} />
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${item.special ? 'text-rose-400 group-hover:text-rose-300' : 'text-slate-400 group-hover:text-white'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
              <div className="pt-2 border-t border-white/10">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 bg-amber-500 rounded-full flex items-center justify-center border border-white">
                    <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400">Premium</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="absolute right-4 bottom-24 z-[1000] flex flex-col gap-2 pointer-events-auto">
          {isSuperAdmin && (
            <>
              <button
                onClick={() => {
                  const newState = !isAddingPoint;
                  setIsAddingPoint(newState);
                  if (!newState) setEditingSector(null);
                  else setAddingPointType('business');
                  
                  // Defensive invalidations when toggling mode
                  if (mapRef.current) {
                    const m = mapRef.current;
                    [50, 200, 600].forEach(d => setTimeout(() => m.invalidateSize(), d));
                  }
                }}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${isAddingPoint 
                  ? 'bg-rose-500 border-white text-white shadow-[0_0_20px_rgba(244,63,94,0.4)]' 
                  : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-white hover:border-white/30'}`}
                title={isAddingPoint ? 'Cancelar' : 'Añadir Punto'}
              >
                <Plus className={`w-5 h-5 ${isAddingPoint ? 'rotate-45' : ''}`} />
              </button>
              {isAddingPoint && (
                <div className="flex flex-col gap-2 animate-in slide-in-from-right duration-200">
                  <button
                    onClick={() => setAddingPointType('business')}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all text-sm ${addingPointType === 'business' 
                      ? 'bg-amber-500 border-amber-400 text-white' 
                      : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-amber-400'}`}
                    title="Añadir Negocio"
                  >
                    🏪
                  </button>
                  <button
                    onClick={() => setAddingPointType('reference')}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all text-sm ${addingPointType === 'reference' 
                      ? 'bg-sky-500 border-sky-400 text-white' 
                      : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-sky-400'}`}
                    title="Añadir Punto de Referencia"
                  >
                    📍
                  </button>
                </div>
              )}
            </>
          )}

          {isPremiumUser && !isSuperAdmin && userBusinessId && (
            <button
              onClick={() => {
                const newState = !isAddingPoint;
                setIsAddingPoint(newState);
                setAddingPointType('business');
                
                // Defensive invalidations when toggling mode
                if (mapRef.current) {
                  const m = mapRef.current;
                  [50, 200, 600].forEach(d => setTimeout(() => m.invalidateSize(), d));
                }
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-300 ${isAddingPoint 
                ? 'bg-amber-500 border-white text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
                : 'bg-gradient-to-br from-amber-500/80 to-orange-500/80 border-amber-400/50 text-white hover:from-amber-500 hover:to-orange-500'}`}
              title={isAddingPoint ? 'Cancelar' : 'Añadir Mi Negocio'}
            >
              <Plus className={`w-5 h-5 ${isAddingPoint ? 'rotate-45' : ''}`} />
            </button>
          )}

          <button onClick={zoomIn} className="w-12 h-12 rounded-2xl bg-slate-900/80 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl pointer-events-auto">
            <Plus className="w-5 h-5" />
          </button>
          <button onClick={zoomOut} className="w-12 h-12 rounded-2xl bg-slate-900/80 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl pointer-events-auto">
            <Minus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setMapMode(mapMode === 'dark' ? 'satellite' : 'dark')}
            className="w-12 h-12 rounded-2xl bg-slate-900/80 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl mt-4 pointer-events-auto"
          >
            {mapMode === 'dark' ? <Navigation className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
          </button>
          <button
            onClick={() => setShowHeatmap(!showHeatmap)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-xl mt-2 transition-all pointer-events-auto ${showHeatmap ? 'bg-orange-500 text-white shadow-[0_0_20px_rgba(249,115,22,0.4)]' : 'bg-slate-900/80 text-slate-400'}`}
          >
            <Flame className={`w-5 h-5 ${showHeatmap ? 'animate-pulse' : ''}`} />
          </button>
          {isPremiumUser && userBusinessId && (
            <button
              onClick={onStartMoveBusiness}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/10 backdrop-blur-xl mt-2 transition-all pointer-events-auto ${isMovingBusiness 
                ? 'bg-amber-500 text-white shadow-[0_0_20px_rgba(245,158,11,0.4)]' 
                : 'bg-gradient-to-br from-amber-500/80 to-orange-500/80 text-white border-amber-400/50 hover:from-amber-500 hover:to-orange-500'}`}
              title="Mover Mi Negocio"
            >
              <MapPin className={`w-5 h-5 ${isMovingBusiness ? 'animate-bounce' : ''}`} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};


