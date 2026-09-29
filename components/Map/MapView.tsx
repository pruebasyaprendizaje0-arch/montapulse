import React, { useEffect, useRef, useState, useMemo, memo, useCallback } from 'react';
import L from 'leaflet';
import { Navigation, Layers, Plus, Minus, X, CheckCircle, MapPin, Zap, Info, Crosshair, Compass, Store, Sparkles, ChevronRight, ExternalLink, Calendar, ShieldCheck } from 'lucide-react';
import { Business, Sector, MontanitaEvent, SubscriptionPlan, BusinessCategory, CommunityPost, AppSettings, MapEntryType } from '../../types';
import { SECTOR_INFO, LOCALITIES, MAP_ICONS } from '../../constants';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from 'react-i18next';
import { escapeHtml } from '../../utils/stringUtils';
import { isBusinessOpen, isEventPublicAndActive } from '../../utils/timeUtils';

interface MapViewProps {
  onBusinessSelect: (business: Business) => void;
  selectedSector: Sector | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  isSuperUser?: boolean;
  isPremiumUser?: boolean;
  isEliteUser?: boolean;
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
  appSettings?: AppSettings | null;
  posts: CommunityPost[];
  isMovingBusiness?: boolean;
  movingBusinessId?: string;
  onMoveBusinessComplete?: () => void;
  onStartMoveBusiness?: () => void;
  customLocalities?: { name: string; coords: [number, number]; zoom: number }[];
  activeTab?: 'events' | 'directory' | 'landmarks' | null;
  onAddLocality?: (name: string, coords: [number, number], hasBeach: boolean) => void;
  focusedBusinessId?: string | null;
  directionsFrom?: [number, number] | null;
  directionsTo?: [number, number] | null;
  focusCoords?: { coords: [number, number]; zoom: number } | null;
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
const SECTOR_STYLE = { bg: 'linear-gradient(135deg, #10b981, #059669)', border: '#34d399', shadow: '0 0 15px rgba(52, 211, 153, 0.5)' };

const CATEGORY_ICONS: Record<string, string> = {
  palmtree: '🏖️',
  music: '🍹',
  waves: '🏄',
  food: '🍱',
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
  compass: '🧭',
};

// Internal representation of map items for clustering
interface MapClusterItem {
  id: string;
  type: 'business' | 'event' | 'reference' | 'sector';
  lat: number;
  lng: number;
  title: string;
  category: string;
  iconKey: string;
  isVerified: boolean;
  isPremium: boolean;
  isEvent: boolean;
  isReference: boolean;
  isSector: boolean;
  rawItem: Business | MontanitaEvent;
}

export const MapView: React.FC<MapViewProps> = memo(({
  onBusinessSelect,
  selectedSector,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  isAdmin,
  isSuperAdmin,
  isSuperUser,
  isPremiumUser,
  isEliteUser,
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
  appSettings,
  events = [],
  posts = [],
  isMovingBusiness = false,
  movingBusinessId,
  onMoveBusinessComplete,
  onStartMoveBusiness,
  customLocalities = [],
  onAddLocality,
  activeTab,
  focusedBusinessId,
  focusCoords,
  directionsFrom,
  directionsTo
}) => {
  const { t } = useTranslation();
  const { showConfirm, showPrompt, showToast } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);
  const heatmapLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const userLocationMarkerRef = useRef<L.Marker | null>(null);
  const focusMarkerRef = useRef<L.Marker | null>(null);

  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('satellite');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [tempCoords, setTempCoords] = useState<[number, number][]>([]);
  
  // Phase 3 Layer Controls:
  // Negocios: active by default
  // Eventos: active by default ONLY if public events exist
  // Referencias: inactive by default
  // Sectores: inactive by default
  const [showBusinesses, setShowBusinesses] = useState<boolean>(true);
  const [showEvents, setShowEvents] = useState<boolean>(events.length > 0);
  const [showLandmarks, setShowLandmarks] = useState<boolean>(false);
  const [showSectors, setShowSectors] = useState<boolean>(false);

  // Selected item modal/card for mobile-first detail view
  const [selectedItem, setSelectedItem] = useState<MapClusterItem | null>(null);
  // Cluster modal if multiple items share coordinates or at max zoom
  const [clusterItemsModal, setClusterItemsModal] = useState<MapClusterItem[] | null>(null);

  const [isAddingPoint, setIsAddingPoint] = useState(false);
  const [addingPointType, setAddingPointType] = useState<'business' | 'reference'>('business');

  const currentTileModeRef = useRef<'street' | 'satellite' | null>(null);
  const currentZoomRef = useRef<number>(15);
  const onBusinessSelectRef = useRef(onBusinessSelect);
  const onUpdateBusinessRef = useRef(onUpdateBusiness);
  const prevMapCenterRef = useRef<[number, number] | null | undefined>(undefined);

  useEffect(() => { onBusinessSelectRef.current = onBusinessSelect; });
  useEffect(() => { onUpdateBusinessRef.current = onUpdateBusiness; });

  // Update default showEvents if events prop changes and user hasn't toggled yet
  useEffect(() => {
    if (events.length > 0 && !showEvents) {
      setShowEvents(true);
    }
  }, [events.length]);

  const getTileUrl = (mode: 'street' | 'satellite') => {
    if (mode === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  const updateTiles = (map: L.Map, mode: 'street' | 'satellite') => {
    const layerExists = tileLayerRef.current && map.hasLayer(tileLayerRef.current);
    
    if (currentTileModeRef.current === mode && layerExists) {
      if (tileLayerRef.current) tileLayerRef.current.setOpacity(1);
      return;
    }

    const url = getTileUrl(mode);

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }

    tileLayerRef.current = L.tileLayer(url, { 
      maxZoom: 19,
      attribution: mode === 'satellite' ? '&copy; Esri World Imagery' : '&copy; OpenStreetMap contributors',
      noWrap: false,
      keepBuffer: 8,
      crossOrigin: 'anonymous'
    }).addTo(map);

    tileLayerRef.current.setOpacity(1);
    tileLayerRef.current.bringToBack();
    currentTileModeRef.current = mode;

    const bgColor = mode === 'street' ? '#f8fafc' : '#020617';
    const styleEl = document.getElementById('map-bg-style');
    if (styleEl) {
      styleEl.innerHTML = `.leaflet-container { background: ${bgColor} !important; outline: none !important; }`;
    }

    [50, 200].forEach(delay => setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize(); }, delay));
  };

  const handleZoomChange = (map: L.Map) => {
    const zoom = map.getZoom();
    currentZoomRef.current = zoom;
    if (zoom >= 18 && currentTileModeRef.current !== 'street') {
      updateTiles(map, 'street');
    } else if (zoom < 18 && mapMode === 'satellite' && currentTileModeRef.current !== 'satellite') {
      updateTiles(map, 'satellite');
    }
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
    onEditBusiness?.(business.id);
  };

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;
    const defaultCoords = LOCALITIES.find(l => l.name === localityName)?.coords || [-1.825, -80.753];
    const center: L.LatLngExpression = mapCenter || defaultCoords;

    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: false, 
      zoomAnimation: true,
      markerZoomAnimation: true,
      scrollWheelZoom: true,
      tap: true,
      preferCanvas: true,
      minZoom: 11,
      maxZoom: 20
    }).setView(center, 15);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    polygonsLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);

    updateTiles(map, mapMode);
    
    map.on('zoomend', () => handleZoomChange(map));

    // Re-render clusters on zoom or move end
    map.on('zoomend moveend', () => {
      renderClusters();
    });
    
    const style = document.createElement('style');
    style.id = 'map-bg-style';
    style.innerHTML = `
      .leaflet-tile-pane { opacity: 1 !important; }
      .leaflet-layer { opacity: 1 !important; }
      .leaflet-tile { opacity: 1 !important; visibility: visible !important; }
      .leaflet-container { background: #020617 !important; outline: none !important; font-family: inherit; }
      .leaflet-marker-icon { transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1); }
      .cluster-marker { transition: transform 0.25s ease-out; }
      .cluster-marker:hover { transform: scale(1.15); }
    `;
    document.head.appendChild(style);

    [100, 300, 800, 1500].forEach(delay => {
      setTimeout(() => { if (mapRef.current) mapRef.current.invalidateSize({ animate: false }); }, delay);
    });

    return () => {
      document.head.removeChild(style);
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
        userLocationMarkerRef.current = null;
      }
      map.remove();
      mapRef.current = null;
      tileLayerRef.current = null;
      currentTileModeRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (mapRef.current) updateTiles(mapRef.current, mapMode);
  }, [mapMode]);

  // 1. Prepare and filter raw map items
  const validMapItems = useMemo<MapClusterItem[]>(() => {
    const items: MapClusterItem[] = [];
    const sq = (searchQuery || '').trim().toLowerCase();

    // Default locality coords
    const defaultCoords = LOCALITIES.find(l => l.name === localityName)?.coords 
      || customLocalities?.find(l => l.name === localityName)?.coords 
      || [-1.825, -80.753];

    // 1. Process businesses and references
    businesses.forEach(business => {
      if (!business || !business.name || business.isPublished === false) return;

      const isReference = business.isReference === true || business.mapType === MapEntryType.LANDMARK;
      const isSector = business.mapType === MapEntryType.SECTOR;
      const isVisibleCategory = activeFilter === 'All' || business.category === activeFilter;
      const matchesSearch = !sq || business.name.toLowerCase().includes(sq) || (business.category || '').toLowerCase().includes(sq);
      const matchesLocality = (business.locality || 'Montañita') === localityName || business.name?.toLowerCase().includes('ubicame.info');

      if (!matchesSearch || !isVisibleCategory || !matchesLocality) return;

      // Layer visibility filter
      if (isReference || isSector) {
        if (!showLandmarks) return;
      } else {
        if (!showBusinesses) return;
      }

      const hasActiveEvents = events.some(e => e.businessId === business.id && isEventPublicAndActive(e));
      const isPremium = business.plan === SubscriptionPlan.EXPERT || business.plan === SubscriptionPlan.ELITE;
      const isVerified = business.isVerified === true || isPremium;

      let iconKey: string;
      if (isSector) {
        iconKey = 'compass';
      } else if (isReference) {
        iconKey = business.icon || 'location';
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
                          business.icon || 'store';
      }

      const lat = business.location?.lat ?? business.coordinates?.[0] ?? defaultCoords[0];
      const lng = business.location?.lng ?? business.coordinates?.[1] ?? defaultCoords[1];

      if (isNaN(lat) || isNaN(lng)) return;

      items.push({
        id: business.id,
        type: isSector ? 'sector' : isReference ? 'reference' : 'business',
        lat,
        lng,
        title: business.name,
        category: business.category || (isSector ? 'Sector' : 'Referencia'),
        iconKey,
        isVerified,
        isPremium,
        isEvent: hasActiveEvents,
        isReference,
        isSector,
        rawItem: business
      });
    });

    // 2. Process events
    if (showEvents) {
      events.forEach(event => {
        if (!isEventPublicAndActive(event) || !event.coordinates) return;
        const matchesEventSearch = !sq || event.title.toLowerCase().includes(sq);
        const matchesEventLocality = (event.locality || 'Montañita') === localityName;
        if (!matchesEventSearch || !matchesEventLocality) return;

        const [lat, lng] = event.coordinates;
        if (isNaN(lat) || isNaN(lng)) return;

        items.push({
          id: event.id,
          type: 'event',
          lat,
          lng,
          title: event.title,
          category: 'Evento Hoy',
          iconKey: event.isFlashOffer ? 'zap' : 'palmtree',
          isVerified: true,
          isPremium: !!event.isPremium,
          isEvent: true,
          isReference: false,
          isSector: false,
          rawItem: event
        });
      });
    }

    return items;
  }, [businesses, events, activeFilter, searchQuery, localityName, customLocalities, showBusinesses, showEvents, showLandmarks]);

  // 2. Clustering & Marker Drawing Function
  const renderClusters = useCallback(() => {
    const map = mapRef.current;
    if (!map || !markersLayerRef.current) return;

    markersLayerRef.current.clearLayers();

    if (validMapItems.length === 0) return;

    const zoom = map.getZoom();
    const clusterRadiusPx = zoom < 14 ? 65 : zoom < 16 ? 50 : 38;

    // Cluster items by pixel distance
    const clusters: { centerLat: number; centerLng: number; items: MapClusterItem[] }[] = [];

    validMapItems.forEach(item => {
      const point = map.latLngToLayerPoint([item.lat, item.lng]);
      let foundCluster = false;

      for (const cluster of clusters) {
        const clusterPoint = map.latLngToLayerPoint([cluster.centerLat, cluster.centerLng]);
        const dist = Math.hypot(point.x - clusterPoint.x, point.y - clusterPoint.y);

        if (dist <= clusterRadiusPx) {
          cluster.items.push(item);
          // Recalculate centroid
          const totalLat = cluster.items.reduce((sum, i) => sum + i.lat, 0);
          const totalLng = cluster.items.reduce((sum, i) => sum + i.lng, 0);
          cluster.centerLat = totalLat / cluster.items.length;
          cluster.centerLng = totalLng / cluster.items.length;
          foundCluster = true;
          break;
        }
      }

      if (!foundCluster) {
        clusters.push({
          centerLat: item.lat,
          centerLng: item.lng,
          items: [item]
        });
      }
    });

    // Draw single markers and cluster markers
    clusters.forEach(cluster => {
      if (cluster.items.length === 1) {
        // --- Single Marker ---
        const item = cluster.items[0];
        const isEvent = item.isEvent;
        const isPremium = item.isPremium;
        const isSector = item.isSector;
        const isReference = item.isReference;

        const categoryStyle = CATEGORY_COLORS[item.iconKey] || CATEGORY_COLORS.default;
        const markerBg = isSector ? SECTOR_STYLE.bg : isReference ? REFERENCE_STYLE.bg : isPremium ? 'linear-gradient(135deg, #b45309, #d97706)' : categoryStyle.bg;
        const borderColor = isSector ? SECTOR_STYLE.border : isReference ? REFERENCE_STYLE.border : isPremium ? '#fbbf24' : isEvent ? '#f97316' : categoryStyle.border;
        const markerShadow = isEvent ? 'box-shadow: 0 0 20px rgba(249, 115, 22, 0.8)' : isPremium ? 'box-shadow: 0 0 15px rgba(251, 191, 36, 0.5)' : `box-shadow: ${categoryStyle.shadow}`;
        const iconSvg = CATEGORY_ICONS[item.iconKey] || '📍';

        const sanitizedTitle = escapeHtml(item.title);

        const customIcon = L.divIcon({
          html: `
            <div class="relative group flex flex-col items-center cursor-pointer" role="button" aria-label="${sanitizedTitle}">
              <div class="absolute inset-x-0 bottom-0 h-2 bg-black/40 blur-sm rounded-full transform translate-y-1 scale-75"></div>
              ${isEvent ? `
                <div class="absolute inset-0 bg-orange-500 rounded-2xl blur-[14px] animate-pulse opacity-90"></div>
                <div class="absolute inset-0 bg-red-500 rounded-2xl blur-[18px] animate-ping opacity-40"></div>
              ` : ''}
              <div class="relative w-10 h-10 bg-slate-900 border-2 rounded-2xl flex items-center justify-center text-white shadow-xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1" style="border-color: ${borderColor}; ${markerShadow}">
                <span class="text-base leading-none select-none">${iconSvg}</span>
              </div>
              ${item.isVerified && !isReference ? `
                <div class="absolute -top-1.5 -right-1.5 w-4 h-4 bg-amber-500 rounded-full border border-slate-900 flex items-center justify-center shadow-md">
                  <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                </div>
              ` : ''}
              ${isEvent ? `
                <div class="absolute -top-2 -left-2 px-1 py-0.2 bg-gradient-to-r from-orange-500 to-red-500 text-[8px] font-black text-white rounded-full border border-white shadow-lg animate-bounce">
                  HOY
                </div>
              ` : ''}
            </div>
          `,
          className: 'single-custom-marker',
          iconSize: [40, 44],
          iconAnchor: [20, 22],
        });

        const isOwn = item.type === 'business' && (item.id === userBusinessId || (item.rawItem as Business).ownerId === userId);
        const canEdit = (isAdmin && isSuperUser) || (!isAdmin && isPremiumUser && isOwn);

        const marker = L.marker([item.lat, item.lng], {
          icon: customIcon,
          draggable: canEdit,
          autoPan: true,
        })
          .addTo(markersLayerRef.current!)
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e as any);
            setSelectedItem(item);
            if (isAdmin && isSuperUser && item.type === 'business') {
              handleSuperAdminAction(item.rawItem as Business);
            }
          });

        if (canEdit && item.type === 'business') {
          marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            onUpdateBusinessRef.current?.(item.id, lat, lng);
          });
        }
      } else {
        // --- Cluster Marker ---
        const count = cluster.items.length;
        const hasEventInCluster = cluster.items.some(i => i.isEvent);
        const hasVerifiedInCluster = cluster.items.some(i => i.isVerified);

        const clusterHtml = `
          <div class="relative flex items-center justify-center cursor-pointer group cluster-marker" role="button" aria-label="Grupo de ${count} lugares">
            <div class="absolute inset-0 ${hasEventInCluster ? 'bg-orange-500/80 animate-ping' : 'bg-indigo-500/50'} rounded-full blur-sm"></div>
            <div class="relative flex items-center justify-center w-11 h-11 ${hasEventInCluster ? 'bg-gradient-to-br from-orange-500 to-amber-600 border-orange-300 shadow-orange-500/60' : 'bg-gradient-to-br from-slate-900 to-indigo-950 border-indigo-400/80 shadow-indigo-500/40'} border-2 rounded-full shadow-2xl text-white font-black text-xs tracking-tight transition-transform duration-300 group-hover:scale-110">
              <span class="drop-shadow">${count}</span>
              ${hasVerifiedInCluster ? `
                <span class="absolute -top-1 -right-1 w-3.5 h-3.5 bg-amber-400 rounded-full border border-slate-900 flex items-center justify-center text-[8px] text-slate-950 font-black">★</span>
              ` : ''}
            </div>
          </div>
        `;

        const clusterIcon = L.divIcon({
          html: clusterHtml,
          className: 'leaflet-cluster-icon',
          iconSize: [44, 44],
          iconAnchor: [22, 22]
        });

        L.marker([cluster.centerLat, cluster.centerLng], { icon: clusterIcon })
          .addTo(markersLayerRef.current!)
          .on('click', (e) => {
            L.DomEvent.stopPropagation(e as any);
            const currentZoom = map.getZoom();

            // If markers are distinct and map can zoom in, expand bounds
            const uniqueCoords = new Set(cluster.items.map(i => `${i.lat.toFixed(5)},${i.lng.toFixed(5)}`));
            if (uniqueCoords.size > 1 && currentZoom < 18) {
              const bounds = L.latLngBounds(cluster.items.map(i => [i.lat, i.lng] as [number, number]));
              map.fitBounds(bounds, { padding: [50, 50], maxZoom: 18 });
            } else {
              // At max zoom or same coordinates: open cluster list sheet
              setClusterItemsModal(cluster.items);
            }
          });
      }
    });
  }, [validMapItems, isAdmin, isSuperUser, isPremiumUser, userBusinessId, userId]);

  // Trigger render when validMapItems changes
  useEffect(() => {
    renderClusters();
  }, [renderClusters]);

  // Sector polygons rendering
  useEffect(() => {
    if (!polygonsLayerRef.current) return;
    polygonsLayerRef.current.clearLayers();

    if (showSectors) {
      Object.entries(sectorPolygons).forEach(([sectorName, coords]) => {
        const sector = sectorName as Sector;
        const info = SECTOR_INFO[sector] || SECTOR_INFO[Sector.CENTRO];
        if (coords && coords.length > 0) {
          L.polygon(coords as L.LatLngExpression[], {
            color: info.color || '#3b82f6',
            fillColor: info.color || '#3b82f6',
            fillOpacity: 0.15,
            weight: 2,
            dashArray: '4, 6'
          }).addTo(polygonsLayerRef.current!);
        }
      });
    }
  }, [showSectors, sectorPolygons]);

  // Center on locality or focusCoords
  useEffect(() => {
    if (mapRef.current && mapCenter) {
      const prev = prevMapCenterRef.current;
      if (!prev || prev[0] !== mapCenter[0] || prev[1] !== mapCenter[1]) {
        prevMapCenterRef.current = mapCenter;
        mapRef.current.flyTo(mapCenter, 15, { duration: 1.2 });
      }
    }
  }, [mapCenter]);

  useEffect(() => {
    if (mapRef.current && focusCoords) {
      mapRef.current.flyTo(focusCoords.coords, focusCoords.zoom, { duration: 1.2 });
    }
  }, [focusCoords]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  const handleLocate = () => {
    const map = mapRef.current;
    if (!map) return;

    showToast("Buscando tu ubicación...", 'info');
    map.locate({ 
      setView: true, 
      maxZoom: 16,
      enableHighAccuracy: true,
      timeout: 10000
    });
    
    const onLocationFound = (e: L.LocationEvent) => {
      if (userLocationMarkerRef.current) {
        userLocationMarkerRef.current.remove();
      }

      const pulseIcon = L.divIcon({
        className: 'user-location-pulse',
        html: `
          <div class="relative flex items-center justify-center">
            <div class="absolute w-8 h-8 bg-blue-500 rounded-full animate-ping opacity-40"></div>
            <div class="relative w-4 h-4 bg-blue-600 rounded-full border-2 border-white shadow-lg"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      userLocationMarkerRef.current = L.marker(e.latlng, { 
        icon: pulseIcon,
        zIndexOffset: 2000,
        interactive: false
      }).addTo(map);

      showToast("Ubicación encontrada", 'success');
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };

    const onLocationError = (e: L.ErrorEvent) => {
      showToast("No se pudo obtener tu ubicación", 'error');
      map.off('locationfound', onLocationFound);
      map.off('locationerror', onLocationError);
    };

    map.on('locationfound', onLocationFound);
    map.on('locationerror', onLocationError);
  };

  return (
    <div className="w-full h-full relative bg-[#020617] overflow-hidden">
      {/* Map Leaflet Container */}
      <div 
        ref={containerRef} 
        className="absolute inset-0 z-0"
        tabIndex={0}
        aria-label="Mapa interactivo de exploración"
      />

      {/* Layer Controls Bar (Accessible, visible, clear labels) */}
      <div className="absolute top-3 left-3 right-3 sm:left-auto sm:right-4 z-[1000] flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Toggle Negocios */}
        <button
          onClick={() => setShowBusinesses(!showBusinesses)}
          aria-pressed={showBusinesses}
          aria-label="Capa de Negocios"
          className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2 border shadow-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
            showBusinesses
              ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-500/30'
              : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Store className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Negocios</span>
        </button>

        {/* Toggle Eventos */}
        <button
          onClick={() => setShowEvents(!showEvents)}
          aria-pressed={showEvents}
          aria-label="Capa de Eventos Confirmados"
          className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2 border shadow-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
            showEvents
              ? 'bg-rose-600 text-white border-rose-400 shadow-rose-500/30'
              : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Zap className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Eventos</span>
        </button>

        {/* Toggle Referencias (Inactivo por defecto) */}
        <button
          onClick={() => setShowLandmarks(!showLandmarks)}
          aria-pressed={showLandmarks}
          aria-label="Capa de Puntos de Referencia"
          className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2 border shadow-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
            showLandmarks
              ? 'bg-sky-600 text-white border-sky-400 shadow-sky-500/30'
              : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Referencias</span>
        </button>

        {/* Toggle Sectores */}
        <button
          onClick={() => setShowSectors(!showSectors)}
          aria-pressed={showSectors}
          aria-label="Capa de Sectores"
          className={`min-h-[44px] px-3.5 sm:px-4 py-2 rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider flex items-center gap-2 border shadow-lg transition-all active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
            showSectors
              ? 'bg-emerald-600 text-white border-emerald-400 shadow-emerald-500/30'
              : 'bg-slate-900/90 text-slate-400 border-white/10 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Compass className="w-4 h-4 shrink-0" />
          <span className="whitespace-nowrap">Sectores</span>
        </button>
      </div>

      {/* Action Buttons (Zoom & Locate) */}
      <div className="absolute right-4 bottom-28 z-[1000] flex flex-col gap-2 pointer-events-auto">
        <button 
          onClick={zoomIn} 
          aria-label="Acercar mapa"
          className="min-w-[44px] min-h-[44px] w-12 h-12 rounded-2xl bg-slate-900/90 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl hover:bg-slate-800 active:scale-95 transition-all shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <Plus className="w-5 h-5" />
        </button>
        <button 
          onClick={zoomOut} 
          aria-label="Alejar mapa"
          className="min-w-[44px] min-h-[44px] w-12 h-12 rounded-2xl bg-slate-900/90 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl hover:bg-slate-800 active:scale-95 transition-all shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={() => setMapMode(mapMode === 'street' ? 'satellite' : 'street')}
          aria-label="Cambiar tipo de mapa (Satélite / Calles)"
          className="min-w-[44px] min-h-[44px] w-12 h-12 rounded-2xl bg-slate-900/90 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl hover:bg-slate-800 active:scale-95 transition-all shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 mt-2"
        >
          {mapMode === 'street' ? <Navigation className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
        </button>
        <button
          onClick={handleLocate}
          aria-label="Centrar en mi ubicación actual"
          className="min-w-[44px] min-h-[44px] w-12 h-12 rounded-2xl bg-slate-900/90 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl shadow-2xl hover:bg-blue-600 active:scale-95 transition-all mt-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
        >
          <Crosshair className="w-5 h-5" />
        </button>
      </div>

      {/* Selected Marker Floating Card (Mobile First, positioned above bottom nav) */}
      {selectedItem && (
        <div 
          role="dialog"
          aria-labelledby="marker-card-title"
          className="fixed sm:absolute bottom-24 left-3 right-3 sm:left-4 sm:right-auto sm:w-96 z-[2000] bg-slate-900/95 backdrop-blur-2xl border border-white/15 rounded-3xl p-4 shadow-[0_15px_50px_rgba(0,0,0,0.8)] animate-in slide-in-from-bottom-5 duration-200"
        >
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="flex items-center gap-2">
              <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                selectedItem.type === 'event' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                selectedItem.type === 'reference' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30' :
                'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
              }`}>
                {selectedItem.category}
              </span>
              {selectedItem.isVerified && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-lg text-[9px] font-black uppercase">
                  <ShieldCheck className="w-3 h-3" /> Verificado
                </span>
              )}
            </div>

            <button
              onClick={() => setSelectedItem(null)}
              aria-label="Cerrar ficha"
              className="min-h-[44px] min-w-[44px] p-2 -mr-2 -mt-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <h3 id="marker-card-title" className="text-base sm:text-lg font-black text-white leading-snug mb-1 truncate">
            {selectedItem.title}
          </h3>

          <p className="text-xs text-slate-400 mb-4 line-clamp-2">
            {selectedItem.type === 'event' 
              ? (selectedItem.rawItem as MontanitaEvent).description || 'Evento confirmado en ' + localityName
              : (selectedItem.rawItem as Business).description || 'Ubicado en ' + localityName}
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                if (selectedItem.type === 'business' || selectedItem.type === 'reference') {
                  onBusinessSelectRef.current(selectedItem.rawItem as Business);
                } else {
                  onBusinessSelectRef.current(selectedItem.rawItem as any);
                }
              }}
              className="min-h-[44px] flex-1 py-2.5 px-4 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-1.5 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
            >
              <span>Ver Detalles</span>
              <ChevronRight className="w-4 h-4" />
            </button>

            <button
              onClick={() => {
                window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedItem.lat},${selectedItem.lng}`, '_blank');
              }}
              aria-label="Abrir cómo llegar en Google Maps"
              className="min-h-[44px] min-w-[44px] px-3.5 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 rounded-2xl font-bold text-xs uppercase transition-all flex items-center justify-center gap-1 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              title="Cómo llegar"
            >
              <Navigation className="w-4 h-4 text-orange-400" />
            </button>
          </div>
        </div>
      )}

      {/* Cluster Items Selection Modal */}
      {clusterItemsModal && (
        <div 
          role="dialog"
          aria-modal="true"
          aria-label="Lugares en este punto"
          className="fixed inset-0 z-[3000] bg-slate-950/80 backdrop-blur-md flex items-end sm:items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
        >
          <div className="bg-slate-900 border border-white/15 rounded-t-[2.5rem] sm:rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  {clusterItemsModal.length} Lugares en esta zona
                </h3>
                <p className="text-xs text-slate-400">Selecciona uno para ver su información</p>
              </div>
              <button
                onClick={() => setClusterItemsModal(null)}
                aria-label="Cerrar lista"
                className="min-h-[44px] min-w-[44px] p-2 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 divide-y divide-white/5">
              {clusterItemsModal.map(item => (
                <div 
                  key={item.id}
                  onClick={() => {
                    setClusterItemsModal(null);
                    setSelectedItem(item);
                  }}
                  className="pt-2 first:pt-0 flex items-center justify-between p-3 hover:bg-white/5 rounded-2xl cursor-pointer transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-slate-800 border border-white/10 flex items-center justify-center text-lg shrink-0">
                      {CATEGORY_ICONS[item.iconKey] || '📍'}
                    </div>
                    <div className="text-left truncate">
                      <h4 className="text-sm font-bold text-white group-hover:text-orange-400 transition-colors truncate">
                        {item.title}
                      </h4>
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {item.category}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-orange-400 group-hover:translate-x-1 transition-all shrink-0" />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

MapView.displayName = 'MapView';
