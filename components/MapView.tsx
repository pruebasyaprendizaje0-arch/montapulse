import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { Search, SlidersHorizontal, Navigation, Layers, Plus, Minus, X, Clock, CheckCircle, Edit3, Settings, Trash2, MapPin } from 'lucide-react';
import { Business, Sector, Vibe } from '../types.ts';
import { MOCK_BUSINESSES, SECTOR_INFO, SECTOR_POLYGONS } from '../constants.ts';

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
  onRenameSector,
  businesses,
  sectorPolygons,
  isEditorFocus,
  onToggleEditorFocus,
  isPanelMinimized,
  onTogglePanel,
  hideUI
}) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const polygonsRef = useRef<Record<string, L.Polygon>>({});
  const [mapMode, setMapMode] = useState<'dark' | 'satellite'>('satellite');
  const [editingSector, setEditingSector] = useState<Sector | null>(null);
  const [tempCoords, setTempCoords] = useState<[number, number][]>([]);
  const [mousePos, setMousePos] = useState<[number, number] | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const previewPolylineRef = useRef<L.Polyline | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const center: L.LatLngExpression = [-1.825, -80.753];

    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: false,
        attributionControl: false
      }).setView(center, 15);
    }

    const map = mapRef.current;

    // Remove old tiles
    map.eachLayer(layer => {
      if (layer instanceof L.TileLayer) map.removeLayer(layer);
    });

    if (mapMode === 'dark') {
      L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      }).addTo(map);
    } else {
      L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
        maxZoom: 20
      }).addTo(map);
    }

    markersRef.current.forEach(m => m.remove());
    Object.values(polygonsRef.current).forEach((p: any) => p?.remove());
    markersRef.current = [];
    polygonsRef.current = {};

    Object.entries(sectorPolygons).forEach(([sectorName, coords]) => {
      const sector = sectorName as Sector;
      const info = SECTOR_INFO[sector] || SECTOR_INFO[Sector.CENTRO];

      const coordsArray = coords as [number, number][];
      if (!coordsArray || coordsArray.length === 0) return;

      // Only render polygon if it's being edited
      if (editingSector === sector) {
        const polygon = L.polygon((tempCoords.length > 0 ? tempCoords : coordsArray) as L.LatLngExpression[], {
          color: info.hex,
          fillColor: info.hex,
          fillOpacity: 0.4,
          weight: 4,
          dashArray: '10, 10'
        }).addTo(map);
        polygonsRef.current[sector] = polygon;
      }
    });

    if (isAdmin && onAddBusiness) {
      map.on('click', (e: L.LeafletMouseEvent) => {
        const { lat, lng } = e.latlng;
        if (editingSector) {
          setTempCoords(prev => [...prev, [lat, lng]]);
        } else {
          onAddBusiness(lat, lng);
        }
      });

      map.on('mousemove', (e: L.LeafletMouseEvent) => {
        if (editingSector) {
          setMousePos([e.latlng.lat, e.latlng.lng]);
        }
      });
    }

    businesses.forEach(business => {
      const isRef = business.id.startsWith('ref-');
      const matchesSector = !selectedSector || business.sector === selectedSector;
      const matchesSearch = business.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        business.description.toLowerCase().includes(searchQuery.toLowerCase());

      // Reference markers are permanent landmarks: they stay visible "all the time"
      if (!isRef && (!matchesSector || !matchesSearch)) return;
      if (!business.coordinates || business.coordinates.some(isNaN)) return;

      const info = SECTOR_INFO[business.sector] || SECTOR_INFO[Sector.CENTRO];

      const vibeClass = activeFilter === 'Party' ? 'vibe-party' :
        activeFilter === 'Relax' ? 'vibe-relax' :
          'vibe-default';

      // Expanded Icon Mapping
      const ICON_MAP: Record<string, string> = {
        'palmtree': '🏖️',
        'music': '🍹',
        'leaf': '🌿',
        'waves': '🏄‍♂️',
        'mountain': '⛰️',
        'surf': '🏄',
        'hotel': '🏨',
        'food': '🍕',
        'church': '⛪',
        'bus': '🚌'
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
        draggable: !!isAdmin
      })
        .addTo(map)
        .on('dragend', (e) => {
          const { lat, lng } = e.target.getLatLng();
          onUpdateBusiness?.(business.id, lat, lng);
        })
        .on('click', (e) => {
          if (isAdmin) {
            L.DomEvent.stopPropagation(e);

            // Interaction menu for Super User
            const action = prompt(`SUPER USER - ${business.name}\n1. Editar Detalles\n2. Eliminar Punto\n(Escribe 1 o 2)`);
            if (action === '1') {
              onEditBusiness?.(business.id);
            } else if (action === '2') {
              if (confirm(`¿Eliminar ${business.name}?`)) {
                onDeleteBusiness?.(business.id);
              }
            }
          } else {
            onBusinessSelect(business);
          }
        });

      markersRef.current.push(marker);
    });

    if (selectedSector) {
      const coords = sectorPolygons[selectedSector];
      if (coords && coords.length > 0) {
        const bounds = L.latLngBounds(coords as L.LatLngExpression[]);
        if (bounds.isValid()) {
          map.flyToBounds(bounds, { padding: [50, 50], duration: 1.2 });
        }
      }
    } else {
      map.flyTo(center, 15, { duration: 1.2 });
    }

    // Cleanup mouse listeners if not editing
    return () => {
      map.off('click');
      map.off('mousemove');
    };

  }, [selectedSector, onBusinessSelect, mapMode, editingSector, tempCoords, businesses, sectorPolygons, searchQuery, activeFilter, isAdmin, onAddBusiness, onDeleteBusiness, onUpdateBusiness, onEditBusiness, onUpdateSector]);

  // Preview Line Effect
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

  // Handle Resize
  useEffect(() => {
    if (!containerRef.current || !mapRef.current) return;

    const resizeObserver = new ResizeObserver(() => {
      mapRef.current?.invalidateSize();
    });

    resizeObserver.observe(containerRef.current);

    return () => resizeObserver.disconnect();
  }, []);

  const zoomIn = () => mapRef.current?.zoomIn();
  const zoomOut = () => mapRef.current?.zoomOut();

  const handleGeolocation = () => {
    if (!navigator.geolocation) {
      alert("La geolocalización no está soportada por tu navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        mapRef.current?.flyTo([latitude, longitude], 17, {
          duration: 1.5
        });

        // Add a temporary blue dot for user
        const userIcon = L.divIcon({
          className: 'user-location-marker',
          html: '<div class="w-4 h-4 bg-sky-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>',
          iconSize: [16, 16],
          iconAnchor: [8, 8]
        });
        L.marker([latitude, longitude], { icon: userIcon }).addTo(mapRef.current!);
      },
      (error) => {
        console.error("Error getting location:", error);
        alert("No se pudo obtener tu ubicación. Asegúrate de dar permisos.");
      }
    );
  };

  return (
    <div className="relative w-full h-full min-h-[50vh] bg-[#020617] overflow-hidden">
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Top Search & Filter UI */}
      {!hideUI ? (
        <div className="absolute top-12 left-0 right-0 px-4 z-[1000] flex flex-col gap-4 items-center animate-in fade-in duration-300">
          {isAdmin && (
            <div className="flex flex-col gap-2 items-center">
              <div className="bg-gradient-to-r from-red-600 to-orange-500 text-white text-[10px] font-black px-6 py-1.5 rounded-full uppercase tracking-[0.3em] shadow-[0_0_20px_rgba(239,68,68,0.4)] animate-pulse border border-white/20">
                ⚡ SUPER USUARIO ACTIVO ⚡
              </div>
              <div className="flex gap-2">
                <button
                  onClick={onToggleEditorFocus}
                  className={`text-[8px] font-black px-4 py-1.5 rounded-full border transition-all uppercase tracking-widest flex items-center gap-2 ${isEditorFocus ? 'bg-sky-500 border-sky-400 text-white' : 'bg-slate-900/90 text-sky-400 border-sky-500/30'}`}
                >
                  {isEditorFocus ? 'Expandir UI' : 'Replegar UI'}
                </button>
                <div className="bg-slate-900/90 text-[8px] font-bold px-3 py-1.5 rounded-full text-slate-400 border border-white/10 uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1 h-1 bg-sky-500 rounded-full animate-pulse" />
                  Edición de Mapa Activa
                </div>
                <button
                  onClick={() => {
                    if (confirm('¿Restablecer todo el mapa a los valores de fábrica? Se perderán todos tus cambios registrados.')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="bg-slate-900/90 text-[8px] font-bold px-3 py-1 rounded-full text-rose-500 border border-rose-500/20 uppercase tracking-widest hover:bg-rose-500 hover:text-white transition-all flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Reset
                </button>
              </div>
              {editingSector && (
                <div className="flex gap-2 mt-2">
                  <button
                    onClick={() => {
                      onUpdateSector?.(editingSector, tempCoords);
                      setEditingSector(null);
                    }}
                    className="bg-emerald-500 text-white text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg flex items-center gap-2"
                  >
                    <CheckCircle className="w-3 h-3" /> GUARDAR
                  </button>
                  <button
                    onClick={() => setTempCoords(prev => prev.slice(0, -1))}
                    className="bg-amber-500 text-white text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg flex items-center gap-2"
                  >
                    <Minus className="w-3 h-3" /> DESHACER
                  </button>
                  <button
                    onClick={() => {
                      setEditingSector(null);
                      setTempCoords([]);
                    }}
                    className="bg-slate-700 text-white text-[9px] font-black px-4 py-2 rounded-xl uppercase tracking-widest shadow-lg"
                  >
                    CANCELAR
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Search Bar - Hidden in Focus Mode */}
          {!isEditorFocus && (
            <div className="w-full max-w-md h-12 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full px-4 flex items-center gap-3 shadow-2xl relative">
              <Search className="w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="Find spots, events, vibes..."
                className="flex-1 bg-transparent border-none outline-none text-white text-sm font-medium placeholder:text-slate-500"
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="p-1 hover:bg-white/10 rounded-full transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-1.5 rounded-lg transition-all ${showFilters ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
            </div>
          )}

          {/* Filter Chips - Conditional based on showFilters */}
          {!isEditorFocus && (
            <div className={`flex gap-2 overflow-x-auto no-scrollbar w-full justify-center px-4 transition-all duration-300 ${showFilters ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none absolute'}`}>
              {['All', 'Party', 'Surf', 'Relax', 'Culture'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => onFilterChange(filter)}
                  className={`flex items-center gap-2 px-6 py-2 rounded-xl border transition-all ${activeFilter === filter
                    ? 'bg-sky-500 border-sky-400 text-white shadow-[0_4px_15px_rgba(14,165,233,0.4)]'
                    : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800'
                    }`}
                >
                  <span className="text-xs font-black uppercase tracking-widest">{filter}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {/* Floating Action Buttons */}
      {!hideUI ? (
        <div className="absolute right-4 top-[50%] -translate-y-[50%] z-[1000] flex flex-col gap-3 animate-in fade-in duration-300">
          <button
            onClick={handleGeolocation}
            className="p-3 bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-full text-slate-400 shadow-xl active:bg-slate-800 hover:text-white transition-colors group"
          >
            <Navigation className="w-5 h-5 group-hover:scale-110 transition-transform" />
          </button>
          <button
            onClick={() => setMapMode(prev => prev === 'dark' ? 'satellite' : 'dark')}
            className={`p-3 backdrop-blur-xl border border-white/10 rounded-full shadow-xl transition-all ${mapMode === 'satellite' ? 'bg-sky-500 text-white' : 'bg-slate-900/80 text-slate-400'}`}
          >
            <Layers className="w-5 h-5" />
          </button>
          <div className="flex flex-col bg-slate-900/80 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            <button onClick={zoomIn} className="p-3 text-slate-400 hover:text-white border-b border-white/5 active:bg-slate-800 transition-colors">
              <Plus className="w-5 h-5" />
            </button>
            <button onClick={zoomOut} className="p-3 text-slate-400 hover:text-white active:bg-slate-800 transition-colors">
              <Minus className="w-5 h-5" />
            </button>
          </div>

          {/* Toggle Panel Button provided via props */}
          {onTogglePanel && (
            <button
              onClick={onTogglePanel}
              className={`p-3 backdrop-blur-xl border border-white/10 rounded-full shadow-xl transition-all ${isPanelMinimized ? 'bg-sky-500 text-white animate-pulse' : 'bg-slate-900/80 text-slate-400'}`}
            >
              {isPanelMinimized ? <Navigation className="w-5 h-5 rotate-180" /> : <MapPin className="w-5 h-5" />}
            </button>
          )}
        </div>
      ) : null}
      {isAdmin && !hideUI && (
        <div className="absolute right-4 bottom-24 z-[1000]">
          <button
            onClick={() => {
              const task = prompt("CONFIGURACIÓN MAESTRA:\n1. Añadir nuevo local\n2. Editar polígonos de sectores\n3. Ver estadísticas\n4. Editar nombres de botones\n(Escribe 1, 2, 3 o 4)");
              const taskLogic = (task: string | null) => {
                if (task === '1') alert("Toca el mapa para situar el nuevo local.");
                if (task === '2') {
                  const sectorNames = Object.values(Sector).join(', ');
                  const sectorToEdit = prompt(`¿Qué sector quieres rediseñar?\n(${sectorNames})`);
                  const foundSector = Object.values(Sector).find(s => s.toLowerCase() === sectorToEdit?.toLowerCase());
                  if (foundSector) {
                    setEditingSector(foundSector as Sector);
                    setTempCoords([]);
                    alert(`Iniciando rediseño de ${foundSector}. Haz clic en el mapa para trazar.`);
                  } else {
                    alert("Sector no válido.");
                  }
                }
                if (task === '3') alert("Red Operativa\nLocales: " + businesses.length + "\nSectores: " + Object.keys(Sector).length);
                if (task === '4') {
                  const sectorNames = Object.values(Sector).join(', ');
                  const sectorToRename = prompt(`¿Qué botón/sector quieres renombrar?\n(${sectorNames})`);
                  const foundSector = Object.values(Sector).find(s => s.toLowerCase() === sectorToRename?.toLowerCase());
                  if (foundSector) {
                    const newName = prompt(`Nuevo nombre para ${foundSector}:`);
                    if (newName) {
                      onRenameSector?.(foundSector as Sector, newName);
                      alert("Botón actualizado con éxito.");
                    }
                  } else {
                    alert("Sector no válido.");
                  }
                }
              };
              taskLogic(task);
            }}
            className="p-3 bg-gradient-to-br from-rose-500 to-orange-500 text-white rounded-full shadow-lg shadow-rose-500/40 animate-bounce active:scale-95"
          >
            <Edit3 className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
