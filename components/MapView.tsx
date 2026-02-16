import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, SlidersHorizontal, Navigation, Layers, Plus, Minus, X, Clock, CheckCircle, Edit3, Settings, Trash2, MapPin } from 'lucide-react';
import { Business, Sector, Vibe } from '../types.ts';
import { SECTOR_INFO } from '../constants.ts';

const FLOATING_LEMAS = {
  [Sector.PLAYA]: "Diversión al Sol • Sports & Vibe",
  [Sector.CENTRO]: "Calle de los Cócteles • 24/7",
  [Sector.TIGRILLO]: "Eco-Chill & Paisajes",
  [Sector.LA_PUNTA]: "Surf & Sunset Vibes",
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
  onAddBusiness?: (lat: number, lng: number) => void;
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
  sectorLabels
}: MapViewProps) => {
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

    // Initial resize trigger
    setTimeout(() => map.invalidateSize(), 150);

    return () => {
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
      : 'https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}';

    tileLayerRef.current = L.tileLayer(url, { maxZoom: 20 }).addTo(map);
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

    // Render Markers
    businesses.forEach(business => {
      const isRef = business.id.startsWith('ref-');
      const matchesSector = !selectedSector || business.sector === selectedSector;
      const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.description.toLowerCase().includes(searchQuery.toLowerCase());

      if (!isRef && (!matchesSector || !matchesSearch)) return;
      if (!business.coordinates || business.coordinates.some(isNaN)) return;

      const info = SECTOR_INFO[business.sector] || SECTOR_INFO[Sector.CENTRO];
      const vibeClass = activeFilter === 'Party' ? 'vibe-party' :
        activeFilter === 'Relax' ? 'vibe-relax' : 'vibe-default';

      const ICON_MAP: Record<string, string> = {
        'palmtree': '🏖️', 'music': '🍹', 'leaf': '🌿', 'waves': '🏄‍♂️',
        'mountain': '⛰️', 'surf': '🏄', 'hotel': '🏨', 'food': '🍕',
        'church': '⛪', 'bus': '🚌'
      };
      const displayIcon = business.icon ? ICON_MAP[business.icon] || '📍' : '📍';

      const customIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div class="relative group">
                 <div class="w-12 h-12 rounded-full border-2 border-white/40 bg-slate-900/80 flex items-center justify-center shadow-[0_0_20px_${info.hex}66] backdrop-blur-md transform transition-all duration-300 group-hover:scale-125 group-hover:border-white ${vibeClass}">
                   <span class="text-xl drop-shadow-lg">${displayIcon}</span>
                   <div class="absolute -bottom-1 w-2 h-2 rounded-full border border-white/20" style="background-color: ${info.hex}"></div>
                 </div>
               </div>`,
        iconSize: [48, 48],
        iconAnchor: [24, 24]
      });

      const marker = L.marker(business.coordinates as L.LatLngExpression, {
        icon: customIcon,
        draggable: !!isAdmin && !isRef
      }).addTo(markersLayerRef.current!);

      marker.on('dragend', (e) => {
        const { lat, lng } = e.target.getLatLng();
        onUpdateBusiness?.(business.id, lat, lng);
      });

      marker.on('click', (e) => {
        if (isAdmin) {
          L.DomEvent.stopPropagation(e as any);
          const action = prompt(`SUPER USER - ${business.name}\n1. Editar Detalles\n2. Eliminar Punto\n(Escribe 1 o 2)`);
          if (action === '1') onEditBusiness?.(business.id);
          else if (action === '2') {
            if (confirm(`¿Eliminar ${business.name}?`)) onDeleteBusiness?.(business.id);
          }
        } else {
          onBusinessSelect(business);
        }
      });
    });

    // Fly to sector or center
    if (selectedSector) {
      const coords = sectorPolygons[selectedSector];
      if (coords && coords.length > 0) {
        const bounds = L.latLngBounds(coords as L.LatLngExpression[]);
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
        }
      }
    }

  }, [businesses, sectorPolygons, selectedSector, searchQuery, activeFilter, isAdmin, editingSector, tempCoords]);

  // 4. Handle Map Events (Click, Mousemove)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const onClick = (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      if (editingSector) {
        setTempCoords(prev => [...prev, [lat, lng]]);
      } else if (isAdmin && onAddBusiness) {
        onAddBusiness(lat, lng);
      }
    };

    const onMouseMove = (e: L.LeafletMouseEvent) => {
      if (editingSector) {
        setMousePos([e.latlng.lat, e.latlng.lng]);
      }
    };

    map.on('click', onClick);
    map.on('mousemove', onMouseMove);

    return () => {
      map.off('click', onClick);
      map.off('mousemove', onMouseMove);
    };
  }, [isAdmin, editingSector, onAddBusiness]);

  // 5. Handle Resize and Keyboard
  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;
    const map = mapRef.current;

    const refresh = () => {
      map.invalidateSize();
    };

    const resizeObserver = new ResizeObserver(() => {
      refresh();
      setTimeout(refresh, 100);
    });

    resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', refresh);

    // Multi-stage refresh for mobile stability
    [50, 250, 600, 1200, 2500].forEach(delay => setTimeout(refresh, delay));

    return () => {
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
    <div ref={containerRef} className="w-full h-full relative bg-[#020617] overflow-hidden">
      {/* Map UI Overlay */}
      <div className="absolute inset-x-0 top-0 z-[1000] p-4 pointer-events-none">
        <div className="max-w-xl mx-auto space-y-3">
          {/* Search Bar */}
          {!hideUI && (
            <div className="flex gap-2 pointer-events-auto">
              <div className="flex-1 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-1.5 flex items-center shadow-2xl ring-1 ring-white/5">
                <div className="w-10 h-10 rounded-xl bg-sky-500/10 flex items-center justify-center">
                  <Search className="w-5 h-5 text-sky-400" />
                </div>
                <input
                  type="text"
                  placeholder="Find spots, events, vibes..."
                  className="flex-1 bg-transparent border-none outline-none text-white text-sm font-medium placeholder:text-slate-500 px-3"
                  value={searchQuery}
                  onFocus={() => {
                    setTimeout(() => mapRef.current?.invalidateSize(), 300);
                    setTimeout(() => mapRef.current?.invalidateSize(), 800);
                  }}
                  onChange={(e) => onSearchChange(e.target.value)}
                />
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${showFilters ? 'bg-sky-500 text-white' : 'bg-slate-900/80 text-slate-400'} border border-white/10 backdrop-blur-xl shadow-2xl`}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
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
        <div className="absolute right-4 top-24 z-[1000] flex flex-col gap-2">
          <button
            onClick={() => setEditingSector(editingSector ? null : Sector.CENTRO)}
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-2xl border border-white/10 backdrop-blur-xl transition-all ${editingSector ? 'bg-rose-500 text-white animate-pulse' : 'bg-slate-900/80 text-slate-400 hover:text-white'}`}
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
                  alert('Need at least 3 points');
                }
              }}
              className="w-12 h-12 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-lg"
            >
              <CheckCircle className="w-5 h-5" />
            </button>
          )}
        </div>
      )}

      {/* Floating Sector Indicators */}
      {!hideUI && !editingSector && (
        <div className="absolute inset-0 pointer-events-none z-[500]">
          {Object.entries(sectorPolygons).map(([sector, coords]) => {
            const info = SECTOR_INFO[sector as Sector];
            const coordsArray = coords as [number, number][];
            if (!info || !coordsArray || coordsArray.length === 0) return null;

            return (
              <div
                key={sector}
                className="absolute transition-all duration-500 opacity-60 flex flex-col items-center"
                style={{
                  left: `${((coordsArray[0][1] + 80.765) / 0.02) * 100}%`,
                  top: `${((coordsArray[0][0] + 1.835) / 0.02) * 100}%`
                }}
              >
                <span className={`text-[8px] font-black uppercase tracking-[0.3em] ${info.color} bg-slate-950/40 px-2 py-0.5 rounded-full backdrop-blur-sm whitespace-nowrap pointer-events-auto`}>
                  {sectorLabels?.[sector] || sector}
                </span>
                <p className="text-[6px] text-white/40 font-bold whitespace-nowrap">{FLOATING_LEMAS[sector as Sector]}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Map Controls */}
      <div className="absolute right-4 bottom-24 z-[1000] flex flex-col gap-2">
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
