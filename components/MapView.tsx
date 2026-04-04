import React, { useEffect, useRef, useState } from 'react';
import ReactDOMServer from 'react-dom/server';
import L from 'leaflet';
import { Search, SlidersHorizontal, Navigation, Layers, Plus, Minus, X, Clock, CheckCircle, Edit3, Settings, Trash2, MapPin, Zap, Palmtree, Music, Leaf, Waves, Mountain, Hotel, UtensilsCrossed, Church, Bus, ShoppingBag, TreePine, Coffee, Camera, Wine, Beer, IceCream, Dumbbell, Sparkles, Tent, Anchor, Ship, Sunrise, Sun, Moon, PartyPopper, Flame, Heart, Star, Smile, Banknote, Car, Store } from 'lucide-react';
import { Business, Sector, Vibe, SubscriptionPlan, BusinessCategory } from '../types.ts';
import { SECTOR_INFO, LOCALITIES, MAP_ICONS } from '../constants.ts';
import { useToast } from '../context/ToastContext';

const getIconForBusiness = (business: Business): { icon: React.ReactNode; color: string } => {
  const iconId = business.icon || '';
  
  if (iconId === 'palmtree' || business.category === BusinessCategory.PLAYA) 
    return { icon: <Palmtree className="w-6 h-6" />, color: '#22d3ee' };
  if (iconId === 'music' || business.category === BusinessCategory.BAR || business.category === BusinessCategory.DISCOTECA || business.category === BusinessCategory.BAR_DISCOTECA) 
    return { icon: <Music className="w-6 h-6" />, color: '#f472b6' };
  if (iconId === 'leaf' || business.category === BusinessCategory.PARQUE) 
    return { icon: <Leaf className="w-6 h-6" />, color: '#4ade80' };
  if (iconId === 'waves' || business.category === BusinessCategory.ESCUELA_SURF || business.category === BusinessCategory.CENTRO_SURF) 
    return { icon: <Waves className="w-6 h-6" />, color: '#38bdf8' };
  if (iconId === 'mountain' || business.category === BusinessCategory.TOUR_OPERATOR) 
    return { icon: <Mountain className="w-6 h-6" />, color: '#a78bfa' };
  if (iconId === 'food' || business.category === BusinessCategory.RESTAURANTE || business.category === BusinessCategory.MERCADO) 
    return { icon: <UtensilsCrossed className="w-6 h-6" />, color: '#fb923c' };
  if (iconId === 'hotel' || business.category === BusinessCategory.HOTEL || business.category === BusinessCategory.HOSTAL || business.category === BusinessCategory.HOSPAJE) 
    return { icon: <Hotel className="w-6 h-6" />, color: '#fbbf24' };
  if (iconId === 'church' || business.category === BusinessCategory.MALECON) 
    return { icon: <Church className="w-6 h-6" />, color: '#a8a29e' };
  if (iconId === 'bus' || business.category === BusinessCategory.TRANSPORT || business.category === BusinessCategory.PARADA_TAXI) 
    return { icon: <Bus className="w-6 h-6" />, color: '#94a3b8' };
  if (iconId === 'shopping' || business.category === BusinessCategory.SHOPPING) 
    return { icon: <ShoppingBag className="w-6 h-6" />, color: '#c084fc' };
  if (iconId === 'park') 
    return { icon: <TreePine className="w-6 h-6" />, color: '#22c55e' };
  if (iconId === 'cocktail' || iconId === 'wine') 
    return { icon: <Wine className="w-6 h-6" />, color: '#ec4899' };
  if (iconId === 'coffee') 
    return { icon: <Coffee className="w-6 h-6" />, color: '#d97706' };
  if (iconId === 'camera') 
    return { icon: <Camera className="w-6 h-6" />, color: '#8b5cf6' };
  
  return { icon: <MapPin className="w-6 h-6" />, color: '#eab308' };
};

const FLOATING_LEMAS = {
  [Sector.PLAYA]: "Diversión al Sol • Sports & Vibe",
  [Sector.CENTRO]: "Calle de los Cócteles • 24/7",
  [Sector.MONTANA]: "Vistas Épicas & Aventura"
};

interface MapViewProps {
  onBusinessSelect: (business: Business) => void;
  selectedSector: Sector | null;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  isAdmin?: boolean;
  onAddBusiness?: (lat: number, lng: number, isReference: boolean) => void;
  onDeleteBusiness?: (id: string) => void;
  onUpdateBusiness?: (id: string, lat: number, lng: number) => void;
  onEditBusiness?: (id: string) => void;
  onUpdateSector?: (sector: Sector, coords: [number, number][]) => void;
  onRenameSector?: (sector: Sector, newName: string) => void;
  businesses: Business[];
  sectorPolygons: Record<Sector, [number, number][]>;
  isEditorFocus?: boolean;
  onToggleEditorFocus?: () => void;
  isPanelMinimized?: boolean;
  onTogglePanel?: () => void;
  hideUI?: boolean;
  sectorLabels?: Record<string, string>;
  mapCenter?: [number, number] | null;
  sectorFocusCoords?: [number, number] | null;
  localityName?: string;
  onLocalityChange?: (name: string) => void;
  onResetFilters?: () => void;
  isSuperUser?: boolean;
  isMovingBusiness?: boolean;
  movingBusinessId?: string;
  onMoveBusinessComplete?: () => void;
  customLocalities?: { name: string; coords: [number, number]; zoom: number }[];
  onAddLocality?: (name: string, coords: [number, number]) => void;
  activeTab?: 'events' | 'directory' | 'landmarks' | null;
  events?: any[];
}

export const MapView: React.FC<MapViewProps> = ({
  onBusinessSelect,
  selectedSector,
  searchQuery,
  onSearchChange,
  activeFilter,
  onFilterChange,
  isAdmin,
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
  sectorLabels,
  mapCenter,
  sectorFocusCoords,
  onLocalityChange,
  onResetFilters,
  onTogglePanel,
  onToggleEditorFocus,
  localityName = 'Montañita',
  isSuperUser,
  isMovingBusiness = false,
  movingBusinessId,
  onMoveBusinessComplete,
  customLocalities = [],
  onAddLocality,
  activeTab,
  events = []
}: MapViewProps) => {
  const { showToast, showConfirm, showPrompt } = useToast();
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const polygonsLayerRef = useRef<L.LayerGroup | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapMode, setMapMode] = useState<'dark' | 'satellite'>('satellite');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [tempCoords, setTempCoords] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [showFilters, setShowFilters] = useState(false);
    const [isAddingPoint, setIsAddingPoint] = useState(false);
    const [addingPointType, setAddingPointType] = useState<'business' | 'reference'>('business');
    const [adminSelectedBusiness, setAdminSelectedBusiness] = useState<Business | null>(null);
    const [showQuickEdit, setShowQuickEdit] = useState(false);
    const [quickEditBusiness, setQuickEditBusiness] = useState<Business | null>(null);
    const previewPolylineRef = useRef<L.Polyline | null>(null);

  // 1. Initialize Map (One-time)
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center: L.LatLngExpression = [-1.825, -80.753];

    // Initialize map
    const map = L.map(containerRef.current, {
      zoomControl: false,
      attributionControl: false,
      fadeAnimation: true,
      zoomAnimation: true,
      scrollWheelZoom: true,
      tap: true
    }).setView(center, 15);

    mapRef.current = map;

    // Create layer groups for easy cleanup
    markersLayerRef.current = L.layerGroup().addTo(map);
    polygonsLayerRef.current = L.layerGroup().addTo(map);

    // Initial tile layer
    updateTiles(map, mapMode);

    // Staggered invalidateSize — store IDs to cancel on unmount
    let alive = true;
    const timers = [50, 150, 400, 800, 1500].map(delay =>
      setTimeout(() => {
        if (alive && mapRef.current) mapRef.current.invalidateSize({ animate: false });
      }, delay)
    );

    // ResizeObserver: re-invalidate on container resize
    let resizeObserver: ResizeObserver | null = null;
    if (containerRef.current && typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        if (mapRef.current) mapRef.current.invalidateSize({ animate: false });
      });
      resizeObserver.observe(containerRef.current);
    }

    const onResize = () => { if (mapRef.current) mapRef.current.invalidateSize({ animate: false }); };
    window.addEventListener('resize', onResize);

    return () => {
      alive = false;
      timers.forEach(clearTimeout);
      window.removeEventListener('resize', onResize);
      resizeObserver?.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);


  // 2. Update Tiles when mapMode changes
  useEffect(() => {
    if (mapRef.current) {
      updateTiles(mapRef.current, mapMode);
    }
  }, [mapMode]);

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

  // 3. Update Markers and Polygons when data changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !markersLayerRef.current || !polygonsLayerRef.current) return;

    // Clear existing layers
    markersLayerRef.current.clearLayers();
    polygonsLayerRef.current.clearLayers();

    // Render Polygons
    Object.entries(sectorPolygons).forEach(([sectorName, coords]) => {
      const sector = sectorName as Sector;
      const info = SECTOR_INFO[sector] || SECTOR_INFO[Sector.CENTRO];
      const coordsArray = coords as [number, number][];
      if (!coordsArray || coordsArray.length === 0) return;

      if (editingSector === sector) {
        L.polygon((tempCoords.length > 0 ? tempCoords : coordsArray) as L.LatLngExpression[], {
          color: info.hex,
          fillColor: info.hex,
          fillOpacity: 0.4,
          weight: 4,
          dashArray: '10, 10'
        }).addTo(polygonsLayerRef.current!);
      }
    });

    // Render Markers - Only if a tab is active
    if (activeTab) {
      businesses.forEach(business => {
        const isRef = business.isReference || business.id.startsWith('ref-');
        const matchesLocality = business.locality === localityName;
        
        // Tab Filtering
        if (activeTab === 'landmarks' && !isRef) return;
        if (activeTab === 'directory' && isRef) return;
        if (activeTab === 'events') {
          if (isRef) return;
          const hasActiveEvent = events.some(e => e.businessId === business.id);
          if (!hasActiveEvent) return;
        }

        const matchesSector = !selectedSector || business.sector === selectedSector;
        const sq = (searchQuery || '').toLowerCase();
        const matchesSearch = !sq || 
          (business.name ?? '').toLowerCase().includes(sq) ||
          (business.description ?? '').toLowerCase().includes(sq);

        if (!isRef && (!matchesLocality || !matchesSector || !matchesSearch)) return;
        if (isRef && !matchesLocality) return;
        if (!business.coordinates || business.coordinates.some(isNaN)) return;

        const vibeClass = activeFilter === 'Party' ? 'vibe-party' : 
          activeFilter === 'Relax' ? 'vibe-relax' : 'vibe-default';

        const { icon: iconNode, color: iconColor } = getIconForBusiness(business);
        const isPremium = business.plan === SubscriptionPlan.EXPERT;

        let markerBg: string, markerBorder: string, markerGlow: string;
        
        if (isRef) {
          markerBg = 'linear-gradient(135deg, #0369a1, #0284c7)';
          markerBorder = '#38bdf8';
          markerGlow = '0 0 18px rgba(56,189,248,0.6)';
        } else if (isPremium) {
          markerBg = 'linear-gradient(135deg, #b45309, #d97706)';
          markerBorder = '#fbbf24';
          markerGlow = '0 0 20px rgba(251,191,36,0.5)';
        } else {
          markerBg = `linear-gradient(135deg, ${iconColor}, ${iconColor}cc)`;
          markerBorder = iconColor;
          markerGlow = `0 0 16px ${iconColor}66`;
        }

        const iconSvg = ReactDOMServer.renderToString(
          React.cloneElement(iconNode as React.ReactElement<{ className?: string; style?: React.CSSProperties }>, { 
            className: 'w-6 h-6', 
            style: { color: 'white', filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.3))' } 
          })
        );

        const isEventLive = (startTime: string, endTime?: string) => {
          if (!startTime) return false;
          const now = new Date();
          const start = new Date(startTime);
          const end = endTime ? new Date(endTime) : new Date(start.getTime() + 4 * 3600000);
          return now >= start && now <= end;
        };

        const liveEvents = events.filter(e => e.businessId === business.id && isEventLive(e.startAt, e.endAt));
        const isLiveNow = liveEvents.length > 0;

        const customIcon = L.divIcon({
          className: 'custom-marker',
          html: `
            <div class="relative group">
              <div class="absolute -top-10 left-1/2 -translate-x-1/2 px-3 py-1 bg-slate-900/90 backdrop-blur-md border border-white/20 rounded-lg text-[10px] font-black text-white whitespace-nowrap opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 pointer-events-none shadow-xl z-[1001]">
                ${business.name} ${isLiveNow ? '•🔴 LIVE' : ''}
                <div class="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-slate-900 border-r border-b border-white/20 rotate-45"></div>
              </div>

              <div class="w-12 h-12 rounded-full border-2 flex items-center justify-center shadow-lg backdrop-blur-md transform transition-all duration-300 group-hover:scale-125 group-hover:border-white ${vibeClass} ${isEditorFocus ? 'cursor-grab active:cursor-grabbing' : ''}" 
                   style="background: ${markerBg}; border-color: ${isLiveNow ? '#ef4444' : markerBorder}; box-shadow: ${isLiveNow ? '0 0 25px rgba(239,68,68,0.6)' : markerGlow}">
                <div class="drop-shadow-lg">${iconSvg}</div>
                ${isLiveNow ? '<div class="absolute inset-0 rounded-full animate-pulse ring-8 ring-red-500/40"></div>' : 
                  isPremium ? '<div class="absolute inset-0 rounded-full animate-pulse ring-4 ring-amber-400/30"></div>' : ''}
                ${isRef ? '<div class="absolute inset-0 rounded-full animate-pulse ring-4 ring-sky-400/20"></div>' : ''}
                ${isLiveNow ? '<div class="absolute -top-1 -right-1 w-4 h-4 bg-red-600 rounded-full border-2 border-slate-900 animate-bounce"></div>' : ''}
              </div>
            </div>`,
          iconSize: [48, 48],
          iconAnchor: [24, 24]
        });

        const marker = L.marker(business.coordinates as L.LatLngExpression, {
          icon: customIcon,
          draggable: !!(isAdmin || isSuperUser) && !!isEditorFocus
        }).addTo(markersLayerRef.current!);

        marker.on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng();
          onUpdateBusiness?.(business.id, lat, lng);
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e as any);
          if (isAdmin || isSuperUser) {
            if ((e as any).originalEvent?.button === 2 || e.originalEvent?.ctrlKey) {
              setQuickEditBusiness(business);
              setShowQuickEdit(true);
            } else {
              setAdminSelectedBusiness(business);
            }
          } else {
            onBusinessSelect(business);
          }
        });
      });
    }

    // Auto Zoom/Focus when sector is selected
    if (selectedSector) {
      const coords = sectorPolygons[selectedSector];
      if (coords && coords.length > 0) {
        const bounds = L.latLngBounds(coords as L.LatLngExpression[]);
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
        }
      }
      if (sectorFocusCoords) {
        map.flyTo(sectorFocusCoords as L.LatLngExpression, 16, { duration: 1.2 });
      }
    } else if (mapCenter) {
      map.flyTo(mapCenter, 15, { duration: 1.2 });
    }
  }, [businesses, events, activeTab, sectorPolygons, selectedSector, searchQuery, activeFilter, isAdmin, isSuperUser, editingSector, tempCoords, mapCenter, sectorFocusCoords, localityName, isEditorFocus]);

  // 4. Handle Map Events (Click, Mousemove)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (editingSector) {
        setTempCoords(prev => [...prev, [lat, lng]]);
      } else if (isAdmin && isAddingPoint && onAddBusiness) {
        onAddBusiness(lat, lng, addingPointType === 'reference');
        setIsAddingPoint(false);
      } else if (isMovingBusiness && movingBusinessId && onUpdateBusiness) {
        onUpdateBusiness(movingBusinessId, lat, lng);
        onMoveBusinessComplete?.();
        showToast('Ubicación actualizada', 'success');
      } else {
        setAdminSelectedBusiness(null);
      }
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (editingSector) {
        setMousePos([e.latlng.lat, e.latlng.lng]);
      }
    };

    map.on('click', onClick);
    map.on('mousemove', onMouseMove);
    map.on('contextmenu', (e) => e.preventDefault());

    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMouseMove);
      map.off('contextmenu', (e) => e.preventDefault());
    };
  }, [isAdmin, editingSector, isAddingPoint, addingPointType, onAddBusiness]);

  // 5. Handle Resize and Keyboard
  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;
    const map = mapRef.current;

    const refresh = () => {
      if (!mapRef.current) return;
      try {
        map.invalidateSize();
      } catch (_) { }
    };

    const resizeObserver = new ResizeObserver(() => {
      refresh();
      setTimeout(refresh, 100);
    });

    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', refresh);

    const timeouts = [50, 250, 600, 1200, 2500].map(delay => setTimeout(refresh, delay));

    return () => {
      timeouts.forEach(id => clearTimeout(id));
      resizeObserver.disconnect();
      window.removeEventListener('resize', refresh);
    };
  }, []);

  // 6. Preview Line logic
  useEffect(() => {
    if (!mapRef.current || !editingSector || tempCoords.length === 0 || !mousePos) {
      if (previewPolylineRef.current) {
        previewPolylineRef.current.remove();
        previewPolylineRef.current = null;
      }
      return;
    }

    const map = mapRef.current;
    const lastPoint = tempCoords[tempCoords.length - 1];
    const previewPoints = [lastPoint, mousePos];

    if (!previewPolylineRef.current) {
      previewPolylineRef.current = L.polyline(previewPoints as L.LatLngExpression[], {
        color: (SECTOR_INFO[editingSector] || SECTOR_INFO[Sector.CENTRO]).hex,
        weight: 2,
        dashArray: '5, 10',
        opacity: 0.8,
        interactive: false
      }).addTo(map);
    } else {
      previewPolylineRef.current.setLatLngs(previewPoints as L.LatLngExpression[]);
    }
  }, [mousePos, editingSector, tempCoords]);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  return (
    <div
      ref={containerRef}
      className={`bg-[#020617] overflow-hidden ${isAddingPoint ? 'cursor-crosshair' : ''}`}
      style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
    >
      {/* Map UI Overlay */}
      {/* SuperAdmin: Add Locality Button - Always visible for admins */}
      {isSuperUser && onAddLocality && (
        <div className="absolute top-4 right-4 z-[1001] pointer-events-auto">
          <button
            onClick={async () => {
              const name = await showPrompt('Nombre del nuevo pueblo:', 'Nombre del pueblo');
              if (name) {
                const coordsStr = await showPrompt('Coordenadas (lat, lng):', '-1.825, -80.753');
                if (coordsStr) {
                  const coords = coordsStr.split(',').map(s => parseFloat(s.trim())) as [number, number];
                  if (coords.length === 2 && !isNaN(coords[0]) && !isNaN(coords[1])) {
                    onAddLocality(name, coords);
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
      <div className="absolute inset-x-0 top-20 z-[1000] p-4 pointer-events-none">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Locality Selector */}
          {!hideUI && (
            <div className="flex justify-center">
              <div className="bg-black/60 backdrop-blur-2xl border border-white/8 rounded-full p-1 flex items-center shadow-2xl shadow-black/40 ring-1 ring-white/5 pointer-events-auto">
                {[...LOCALITIES, ...customLocalities].map((loc) => (
                  <button
                    key={loc.name}
                    onClick={() => onLocalityChange?.(loc.name)}
                    className={`relative px-5 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.18em] transition-all duration-300 ${localityName === loc.name
                      ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg shadow-amber-500/30'
                      : 'text-slate-500 hover:text-slate-300'
                      }`}
                  >
                    {localityName === loc.name && (
                      <span className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 bg-white rounded-full opacity-70" />
                    )}
                    {loc.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Filter Chips */}
          <div className={`flex gap-2 overflow-x-auto no-scrollbar justify-center transition-all duration-300 ${showFilters && !hideUI ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none absolute'}`}>
            {['All', 'Party', 'Surf', 'Relax', 'Culture'].map((filter) => (
              <button
                key={filter}
                onClick={() => onFilterChange(filter)}
                className={`pointer-events-auto px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeFilter === filter ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'bg-slate-900/80 text-slate-400 hover:bg-slate-800'}`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Admin Controls */}
      {isAdmin && !hideUI && (
        <div className="absolute right-4 top-24 z-[1000] flex flex-col gap-3">
          {/* Add Point Toggle */}
          <button
            onClick={() => {
              setIsAddingPoint(!isAddingPoint);
              if (!isAddingPoint) showToast(
                addingPointType === 'reference'
                  ? 'Clic en el mapa para colocar el punto de referencia.'
                  : 'Clic en el mapa para ubicar el nuevo negocio.',
                'info'
              );
              setEditingSector(null);
            }}
            className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl border transition-all duration-300 scale-110 ${isAddingPoint ? 'bg-orange-500 border-white text-white rotate-45 shadow-orange-500/40' : 'bg-slate-950 border-white/10 text-slate-400 hover:text-white'}`}
            title="Añadir Punto en el Mapa"
          >
            <Plus className="w-7 h-7" />
          </button>

          {/* Type Selector: Negocio vs. Punto de Referencia */}
          <div className="flex flex-col gap-1.5">
            <button
              onClick={() => {
                setAddingPointType('business');
                if (!isAddingPoint) { setIsAddingPoint(true); setEditingSector(null); }
              }}
              title="Añadir Negocio"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-200 text-lg shadow-xl ${addingPointType === 'business' && isAddingPoint
                ? 'bg-amber-500 border-amber-400 text-white shadow-amber-500/40'
                : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-amber-400 hover:border-amber-400/40'
                }`}
            >
              🏪
            </button>
            <button
              onClick={() => {
                setAddingPointType('reference');
                if (!isAddingPoint) { setIsAddingPoint(true); setEditingSector(null); }
              }}
              title="Añadir Punto de Referencia"
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border transition-all duration-200 text-lg shadow-xl ${addingPointType === 'reference' && isAddingPoint
                ? 'bg-sky-500 border-sky-400 text-white shadow-sky-500/40'
                : 'bg-slate-900/80 border-white/10 text-slate-400 hover:text-sky-400 hover:border-sky-400/40'
                }`}
            >
              📍
            </button>
          </div>

          {/* Sector Overlay Toggle */}
          <button
            onClick={() => {
              setEditingSector(editingSector ? null : Sector.CENTRO);
              setIsAddingPoint(false);
            }}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 backdrop-blur-xl transition-all ${editingSector ? 'bg-orange-500 text-white animate-pulse shadow-orange-500/30' : 'bg-slate-900/80 text-slate-400 hover:text-white'}`}
          >
            <Layers className="w-5 h-5" />
          </button>

          {editingSector && (
            <button
              onClick={() => {
                if (tempCoords.length > 2) {
                  onUpdateSector?.(editingSector, tempCoords);
                  setEditingSector(null);
                  setTempCoords([]);
                } else {
                  showToast('Se necesitan al menos 3 puntos para crear un polígono.', 'error');
                }
              }}
              className="w-12 h-12 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-500/30"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          )}

          {/* Editor Focus Toggle */}
          <button
            onClick={onToggleEditorFocus}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 transition-all ${isEditorFocus ? 'bg-sky-500 text-white shadow-sky-500/30' : 'bg-slate-900/80 text-slate-400 hover:text-white'}`}
            title="Modo Edición (Arrastrar Puntos)"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Admin Context Menu / Card for Selected Business */}
      {isAdmin && adminSelectedBusiness && (
        <div className="absolute bottom-32 left-1/2 -translate-x-1/2 z-[1001] w-[90%] max-w-sm animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-slate-950/90 backdrop-blur-2xl border border-white/20 p-6 rounded-[2.5rem] shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center border border-white/10 text-2xl shadow-xl">
                  {MAP_ICONS.find(i => i.id === adminSelectedBusiness.icon)?.emoji || '📍'}
                </div>
                <div>
                  <h4 className="text-lg font-black text-white italic truncate max-w-[180px]">{adminSelectedBusiness.name}</h4>
                  <p className="text-[10px] font-bold text-sky-400 uppercase tracking-widest">{adminSelectedBusiness.id.startsWith('ref-') ? 'Punto de Referencia' : 'Negocio'}</p>
                </div>
              </div>
              <button
                onClick={() => setAdminSelectedBusiness(null)}
                className="p-2.5 bg-white/5 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => {
                  onEditBusiness?.(adminSelectedBusiness.id);
                  setAdminSelectedBusiness(null);
                }}
                className="flex items-center justify-center gap-2 py-3 bg-white/10 hover:bg-sky-500/20 text-white rounded-2xl border border-white/10 hover:border-sky-500/40 transition-all text-xs font-black uppercase tracking-wider"
              >
                <Edit3 className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={async () => {
                  if (await showConfirm(`¿Eliminar ${adminSelectedBusiness.name} permanentemente?`, 'Confirmar eliminación')) {
                    onDeleteBusiness?.(adminSelectedBusiness.id);
                    setAdminSelectedBusiness(null);
                  }
                }}
                className="flex items-center justify-center gap-2 py-3 bg-orange-500/10 hover:bg-orange-500/20 text-orange-500 rounded-2xl border border-orange-500/20 hover:border-orange-500/40 transition-all text-xs font-black uppercase tracking-wider"
              >
                <Trash2 className="w-4 h-4" />
                Eliminar
              </button>
            </div>
            <p className="text-[9px] text-slate-500 text-center font-bold uppercase tracking-widest">
              {isEditorFocus ? 'Puedes arrastrar el punto para cambiar su ubicación.' : 'Activa el modo edición para mover este punto.'}
            </p>
          </div>
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute right-4 bottom-24 z-[1000] flex flex-col gap-2">
        {/* Pulse of Today - Siempre visible en la parte inferior */}
        <button
          onClick={() => onResetFilters?.()}
          className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(234,88,12,0.4)] border border-white/20 hover:scale-110 active:scale-95 transition-all pointer-events-auto"
          title="Pulse of Today"
        >
          <Zap className="w-6 h-6 fill-white" />
        </button>
        {(isPanelMinimized || isEditorFocus) && (
          <button
            onClick={() => {
              if (isEditorFocus && onToggleEditorFocus) onToggleEditorFocus();
              if (isPanelMinimized && onTogglePanel) onTogglePanel();
            }}
            className="w-12 h-12 rounded-2xl bg-orange-600 text-white flex items-center justify-center shadow-[0_4px_20px_rgba(234,88,12,0.4)] border border-white/20 hover:scale-110 active:scale-95 transition-all pointer-events-auto mb-2 relative group"
            title="Restaurar Pulse of Today"
          >
            <Zap className="w-6 h-6 fill-white" />
          </button>
        )}
        <button onClick={zoomIn} className="w-12 h-12 rounded-2xl bg-slate-900/80 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl shadow-2xl hover:bg-slate-800 transition-all pointer-events-auto">
          <Plus className="w-5 h-5" />
        </button>
        <button onClick={zoomOut} className="w-12 h-12 rounded-2xl bg-slate-900/80 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl shadow-2xl hover:bg-slate-800 transition-all pointer-events-auto">
          <Minus className="w-5 h-5" />
        </button>
        <button
          onClick={() => setMapMode(mapMode === 'dark' ? 'satellite' : 'dark')}
          className="w-12 h-12 rounded-2xl bg-slate-900/80 text-white flex items-center justify-center border border-white/10 backdrop-blur-xl shadow-2xl hover:bg-sky-500 transition-all mt-4 pointer-events-auto"
        >
          {mapMode === 'dark' ? <Navigation className="w-5 h-5" /> : <Layers className="w-5 h-5" />}
        </button>
      </div>
    </div>
  );
};


