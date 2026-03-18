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

const CATEGORY_ICONS: Record<string, string> = {
  palmtree: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M13 8c0-2.76-2.46-5-5.5-5S2 5.24 2 8h2l1-1 1 1h4l1-1 1 1h2Z"/><path d="M13 7.14A5.82 5.82 0 0 1 16.5 6c3.04 0 5.5 2.24 5.5 5h-2l-1-1-1 1h-2l-1-1-1 1h-2l.5-1.14Z"/><path d="M5.89 9.71c-2.15 2.15-2.3 5.47-.35 7.43l4.24-4.25.71.71-4.25 4.24c1.96 1.96 5.28 1.8 7.43-.35"/><path d="M11 15.5c.5 2.5-.1 4.5-.7 7"/><path d="M13 15.5c-.5 2.5.1 4.5.7 7"/></svg>',
  music: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>',
  waves: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.6 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/></svg>',
  food: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v4"/><path d="M18 20V2c0-1.1-.9-2-2-2h-1a2 2 0 0 0-2 2v18"/><path d="M14 20h4"/></svg>',
  hotel: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M2 22h20"/><path d="M7 22v-4a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v4"/><path d="M10 8V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3"/><rect width="16" height="12" x="4" y="8" rx="2"/></svg>',
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>',
  mountain: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="m8 3 4 8 5-5 5 15H2L8 3z"/></svg>',
  shopping: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>',
  church: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z"/></svg>',
  bus: '<svg viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5"><path d="M8 6v6"/><path d="M16 6v6"/><path d="M2 12h20"/><path d="M6 18h12a4 4 0 0 0 4-4V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v8a4 4 0 0 0 4 4Z"/><path d="M6 14h.01"/><path d="M10 14h.01"/><path d="M14 14h.01"/><path d="M18 14h.01"/></svg>',
  zap: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-5 h-5 text-amber-500 fill-amber-500/20"><path d="M4 14.5 13 3l-1.5 8h8.5L11 21l1.5-8H4z"/></svg>',
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
  onStartMoveBusiness
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

  const updateTiles = (map: L.Map, mode: 'dark' | 'satellite') => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }
    const url = mode === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    tileLayerRef.current = L.tileLayer(url, { 
      maxZoom: 20,
      attribution: mode === 'dark' ? '&copy; CartoDB' : '&copy; Esri'
    }).addTo(map);
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
      fadeAnimation: true,
      zoomAnimation: true,
      scrollWheelZoom: true,
      tap: true
    }).setView(center, 15);

    mapRef.current = map;
    markersLayerRef.current = L.layerGroup().addTo(map);
    polygonsLayerRef.current = L.layerGroup().addTo(map);
    heatmapLayerRef.current = L.layerGroup().addTo(map);

    updateTiles(map, mapMode);
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
      map.remove();
      mapRef.current = null;
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
      if (mapMode !== 'dark') setMapMode('dark');
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
      const isVisible = activeFilter === 'All' || business.category === activeFilter;
      const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase());

      if (isVisible && matchesSearch) {
        const isPremium = business.plan === SubscriptionPlan.PREMIUM;

        const iconKey = business.category === BusinessCategory.RESTAURANTE ? 'food' :
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
        const borderColor = isPremium ? '#fbbf24' : categoryStyle.border;
        const markerBg = isPremium ? 'linear-gradient(135deg, #b45309, #d97706)' : categoryStyle.bg;
        const markerShadow = isPremium ? 'box-shadow: 0 0 20px rgba(251, 191, 36, 0.4)' : `box-shadow: ${categoryStyle.shadow}`;

        const svg = CATEGORY_ICONS[iconKey] || CATEGORY_ICONS.palmtree;

        // Custom icon with Name Label
        const customIcon = L.divIcon({
          html: `
            <div class="relative group flex flex-col items-center">
              <div class="absolute inset-x-0 bottom-0 h-2 bg-black/30 blur-md rounded-full transform translate-y-2 scale-75"></div>
              <div class="relative w-10 h-10 bg-slate-900 border-2 rounded-2xl flex items-center justify-center text-white shadow-2xl transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1" style="border-color: ${borderColor}; ${markerShadow}">
                ${svg}
              </div>
              
              <div class="mt-1.5 px-2 py-0.5 bg-slate-900/90 backdrop-blur-md border border-white/10 rounded-lg shadow-xl pointer-events-none transition-all duration-300 group-hover:bg-slate-800 group-hover:border-white/20 group-hover:scale-105">
                <span class="text-[9px] font-black text-white uppercase tracking-tighter whitespace-nowrap block max-w-[80px] overflow-hidden text-ellipsis">${business.name}</span>
              </div>

              ${isPremium ? `
                <div class="absolute -top-2 -left-2 w-5 h-5 bg-amber-500 rounded-full border-2 border-slate-900 flex items-center justify-center z-10 shadow-lg animate-bounce duration-[3s]">
                  <svg class="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"></path></svg>
                </div>
              ` : ''}
              ${posts.some(p => p.authorId === business.id || p.content.includes(business.name)) ? `
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
        
        // El arrastre está disponible directamente para admins y premium (sin necesidad de isEditorFocus)
        const marker = L.marker([business.location?.lat || business.coordinates[0], business.location?.lng || business.coordinates[1]], {
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
              onBusinessSelect(business);
            }
          });

        // Arrastre para cambiar ubicación (directamente sin modo editor)
        if (canEdit) {
          marker.on('dragend', (e) => {
            const { lat, lng } = e.target.getLatLng();
            onUpdateBusiness?.(business.id, lat, lng);
          });
        }
      }
    });

    events.forEach(event => {
      if (!event.coordinates) return;
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
        .on('click', () => onBusinessSelect(event as any));
    });

    if (selectedSector) {
      const coords = sectorPolygons[selectedSector];
      if (coords && coords.length > 0) {
        const bounds = L.latLngBounds(coords as L.LatLngExpression[]);
        if (bounds.isValid()) map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
      }
    } else if (mapCenter) {
      map.flyTo(mapCenter, 15, { duration: 1.2 });
    }
  }, [businesses, events, sectorPolygons, selectedSector, searchQuery, activeFilter, isAdmin, isSuperAdmin, editingSector, tempCoords, mapCenter, localityName, showHeatmap, mapMode, posts, isEditorFocus, onBusinessSelect, onUpdateBusiness]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (editingSector) {
        setTempCoords(prev => [...prev, [lat, lng]]);
      } else if (isAddingPoint && onAddBusiness) {
        const isRef = addingPointType === 'reference';
        // SuperAdmin puede añadir referencias y negocios
        // Premium solo puede añadir su propio negocio
        if (isSuperAdmin || (!isRef && isPremiumUser)) {
          onAddBusiness(lat, lng, isRef);
          setIsAddingPoint(false);
          // Redimensionar el mapa después de añadir punto
          setTimeout(() => map.invalidateSize(), 100);
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

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  return (
    <div ref={containerRef} className={`w-full h-full relative bg-[#020617] overflow-hidden ${isAddingPoint || isMovingBusiness ? 'cursor-crosshair' : ''}`}>
      <div className="absolute inset-x-0 top-20 z-[1000] p-4 pointer-events-none">
        <div className="max-w-xl mx-auto space-y-6">
          {!hideUI && (
            <div className="flex justify-center">
              <div className="bg-slate-900/90 backdrop-blur-2xl border border-white/10 rounded-full p-1.5 flex items-center shadow-2xl ring-1 ring-white/5 pointer-events-auto">
                {LOCALITIES.map((loc) => (
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
              { key: 'food', label: 'Gastronomía' },
              { key: 'music', label: 'Diversión' },
              { key: 'hotel', label: 'Hospedaje' },
              { key: 'zap', label: 'Live Events', special: true }
            ].map((item) => (
              <div key={item.key} className="flex items-center gap-3 group">
                <div className={`w-8 h-8 bg-slate-800 rounded-lg flex items-center justify-center text-white border border-white/5 shadow-lg group-hover:scale-110 transition-transform ${item.special ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-900' : ''}`}>
                  <span dangerouslySetInnerHTML={{ __html: CATEGORY_ICONS[item.key] }} />
                </div>
                <span className={`text-[10px] font-bold uppercase tracking-tight transition-colors ${item.special ? 'text-rose-400 group-hover:text-rose-300' : 'text-slate-400 group-hover:text-white'}`}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="absolute right-4 bottom-24 z-[1000] flex flex-col gap-2">
        {/* Botón Principal de Añadir (Solo SuperAdmin) */}
        {isSuperAdmin && (
          <>
            <button
              onClick={() => {
                setIsAddingPoint(!isAddingPoint);
                if (!isAddingPoint) setEditingSector(null);
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

        {/* Premium: Solo puede añadir su propio negocio */}
        {isPremiumUser && !isSuperAdmin && userBusinessId && (
          <button
            onClick={() => {
              setIsAddingPoint(!isAddingPoint);
              setAddingPointType('business');
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
  );
};
