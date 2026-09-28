import React, { useEffect, useRef, useState, memo } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Compass, Layers, Crosshair, ZoomIn, ZoomOut, LocateFixed, Search, Link2 } from 'lucide-react';
import { LOCALITIES } from '../../constants';
import { useToast } from '../../context/ToastContext';

interface LocationPickerMiniMapProps {
  coordinates: [number, number] | null;
  onChangeCoordinates: (coords: [number, number]) => void;
  localityName?: string;
  className?: string;
  height?: string;
}

export const LocationPickerMiniMap: React.FC<LocationPickerMiniMapProps> = memo(({
  coordinates,
  onChangeCoordinates,
  localityName = 'Montañita',
  className = '',
  height = '260px'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const mapModeRef = useRef<'street' | 'satellite'>('street');
  mapModeRef.current = mapMode;

  const [isLocating, setIsLocating] = useState(false);
  const [pasteInput, setPasteInput] = useState('');
  const [showPasteBox, setShowPasteBox] = useState(false);
  const { showToast } = useToast();

  const localityCoords = LOCALITIES.find(l => l.name === localityName)?.coords || [-1.8253, -80.7523];
  const currentCoords: [number, number] = (coordinates && coordinates.length === 2 && !isNaN(coordinates[0]) && !isNaN(coordinates[1]))
    ? [Number(coordinates[0]), Number(coordinates[1])]
    : [localityCoords[0], localityCoords[1]];

  const getTileUrl = (mode: 'street' | 'satellite') => {
    if (mode === 'satellite') {
      return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
    }
    return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
  };

  const updateTiles = (map: L.Map, mode: 'street' | 'satellite') => {
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    const url = getTileUrl(mode);
    tileLayerRef.current = L.tileLayer(url, {
      maxZoom: 19,
      attribution: mode === 'satellite' ? '&copy; Esri' : '&copy; OpenStreetMap contributors',
      noWrap: false,
      crossOrigin: 'anonymous'
    }).addTo(map);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: currentCoords,
      zoom: 16,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      tap: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: false
    });

    mapRef.current = map;
    updateTiles(map, mapModeRef.current);

    // Custom Draggable Pin
    const customIcon = L.divIcon({
      html: `
        <div class="relative flex flex-col items-center group cursor-grab active:cursor-grabbing">
          <div class="absolute -inset-2 rounded-full blur-md animate-ping opacity-60 bg-orange-500"></div>
          <div class="relative w-10 h-10 rounded-2xl flex items-center justify-center text-white shadow-2xl bg-gradient-to-br from-orange-500 to-amber-500 border-2 border-white transform transition-transform hover:scale-110">
            <svg class="w-5 h-5 drop-shadow" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div class="mt-1 px-2 py-0.5 bg-slate-950/90 backdrop-blur-md border border-white/20 rounded-md shadow-xl text-center whitespace-nowrap pointer-events-none">
            <span class="text-[9px] font-black text-white uppercase tracking-tight">📍 Arrastra para ubicar</span>
          </div>
        </div>
      `,
      className: 'location-picker-marker',
      iconSize: [40, 56],
      iconAnchor: [20, 28]
    });

    const marker = L.marker(currentCoords, {
      icon: customIcon,
      draggable: true,
      autoPan: true
    }).addTo(map);

    markerRef.current = marker;

    // Handle marker drag
    marker.on('dragend', (e) => {
      const pos = e.target.getLatLng();
      onChangeCoordinates([pos.lat, pos.lng]);
    });

    // Handle click on map to move marker
    map.on('click', (e) => {
      marker.setLatLng(e.latlng);
      onChangeCoordinates([e.latlng.lat, e.latlng.lng]);
    });

    // Auto-switch to street on max zoom in satellite
    map.on('zoomend', () => {
      if (map.getZoom() >= 18 && mapModeRef.current === 'satellite') {
        setMapMode('street');
      }
    });

    const timers = [50, 200, 500, 1000].map(delay =>
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, delay)
    );

    const resizeObserver = new ResizeObserver(() => {
      if (mapRef.current) {
        mapRef.current.invalidateSize();
      }
    });
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      timers.forEach(t => clearTimeout(t));
      resizeObserver.disconnect();
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update marker position and map center when coordinates change externally
  useEffect(() => {
    if (markerRef.current && coordinates && coordinates.length === 2) {
      const currentPos = markerRef.current.getLatLng();
      if (Math.abs(currentPos.lat - coordinates[0]) > 0.00001 || Math.abs(currentPos.lng - coordinates[1]) > 0.00001) {
        markerRef.current.setLatLng(coordinates);
        if (mapRef.current) {
          mapRef.current.panTo(coordinates);
        }
      }
    }
  }, [coordinates?.[0], coordinates?.[1]]);

  // Update map center when locality changes if no precise coordinates
  useEffect(() => {
    if (!coordinates && mapRef.current && markerRef.current) {
      markerRef.current.setLatLng(localityCoords);
      mapRef.current.setView(localityCoords, 16);
    }
  }, [localityName]);

  useEffect(() => {
    if (mapRef.current) {
      updateTiles(mapRef.current, mapMode);
    }
  }, [mapMode]);

  const handleGetCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast('Tu navegador no soporta geolocalización GPS', 'error');
      return;
    }

    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const newCoords: [number, number] = [latitude, longitude];
        onChangeCoordinates(newCoords);
        if (markerRef.current) markerRef.current.setLatLng(newCoords);
        if (mapRef.current) mapRef.current.flyTo(newCoords, 17, { animate: true, duration: 0.8 });
        setIsLocating(false);
        showToast('Ubicación GPS detectada con éxito', 'success');
      },
      (error) => {
        console.error('Error getting GPS location:', error);
        setIsLocating(false);
        showToast('No se pudo obtener la ubicación GPS. Verifica los permisos.', 'error');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  const handleParseGoogleLink = () => {
    if (!pasteInput.trim()) return;

    // Try parsing lat, lng directly e.g. "-1.825, -80.753"
    const coordsMatch = pasteInput.match(/(-?\d+\.\d+)[,\s]+(-?\d+\.\d+)/);
    if (coordsMatch) {
      const lat = parseFloat(coordsMatch[1]);
      const lng = parseFloat(coordsMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        const newCoords: [number, number] = [lat, lng];
        onChangeCoordinates(newCoords);
        if (markerRef.current) markerRef.current.setLatLng(newCoords);
        if (mapRef.current) mapRef.current.flyTo(newCoords, 17, { animate: true, duration: 0.8 });
        setPasteInput('');
        setShowPasteBox(false);
        showToast('Coordenadas aplicadas correctamente', 'success');
        return;
      }
    }

    // Try parsing @lat,lng e.g. maps.google.com/.../@-1.825,-80.753,17z
    const atMatch = pasteInput.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (atMatch) {
      const lat = parseFloat(atMatch[1]);
      const lng = parseFloat(atMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        const newCoords: [number, number] = [lat, lng];
        onChangeCoordinates(newCoords);
        if (markerRef.current) markerRef.current.setLatLng(newCoords);
        if (mapRef.current) mapRef.current.flyTo(newCoords, 17, { animate: true, duration: 0.8 });
        setPasteInput('');
        setShowPasteBox(false);
        showToast('Ubicación extraída del enlace', 'success');
        return;
      }
    }

    // Try query param q=lat,lng or ll=lat,lng
    const queryMatch = pasteInput.match(/[?&](?:q|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
    if (queryMatch) {
      const lat = parseFloat(queryMatch[1]);
      const lng = parseFloat(queryMatch[2]);
      if (!isNaN(lat) && !isNaN(lng)) {
        const newCoords: [number, number] = [lat, lng];
        onChangeCoordinates(newCoords);
        if (markerRef.current) markerRef.current.setLatLng(newCoords);
        if (mapRef.current) mapRef.current.flyTo(newCoords, 17, { animate: true, duration: 0.8 });
        setPasteInput('');
        setShowPasteBox(false);
        showToast('Ubicación extraída de Google Maps', 'success');
        return;
      }
    }

    showToast('No se encontraron coordenadas válidas. Pega un formato como: -1.8253, -80.7523 o un link con coordenadas', 'error');
  };

  return (
    <div className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-slate-950 shadow-xl flex flex-col ${className}`}>
      {/* Map Container */}
      <div
        ref={containerRef}
        style={{ height, width: '100%' }}
        className="w-full relative z-0 bg-slate-950 cursor-crosshair"
      />

      {/* Top Left Instructions */}
      <div className="absolute top-3 left-3 z-10 pointer-events-none">
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/90 backdrop-blur-md border border-white/15 text-white shadow-lg pointer-events-auto">
          <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider">
            Toca el mapa o arrastra el pin
          </span>
        </div>
      </div>

      {/* Top Right Controls & Layer Switcher */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <div className="flex items-center gap-1 p-1 bg-slate-950/90 backdrop-blur-md border border-white/15 rounded-xl shadow-lg">
          <button
            type="button"
            onClick={() => setMapMode('street')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              mapMode === 'street' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Calles
          </button>
          <button
            type="button"
            onClick={() => {
              if (mapRef.current && mapRef.current.getZoom() >= 18) {
                mapRef.current.setZoom(17);
              }
              setMapMode('satellite');
            }}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
              mapMode === 'satellite' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
            }`}
          >
            Satélite
          </button>
        </div>

        {/* GPS Current Location & Zoom */}
        <div className="flex flex-col bg-slate-950/90 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden shadow-lg self-end">
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="p-2 text-emerald-400 hover:text-emerald-300 hover:bg-white/10 transition-colors"
            title="Usar mi ubicación GPS actual"
          >
            <Crosshair className={`w-4 h-4 ${isLocating ? 'animate-spin' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomIn()}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 border-t border-white/10 transition-colors"
            title="Acercar"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => mapRef.current?.zoomOut()}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 border-t border-white/10 transition-colors"
            title="Alejar"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (mapRef.current) mapRef.current.flyTo(currentCoords, 16, { animate: true });
            }}
            className="p-2 text-orange-400 hover:text-orange-300 hover:bg-white/10 border-t border-white/10 transition-colors"
            title="Centrar en el punto"
          >
            <LocateFixed className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Paste Coords / Link Modal or Expandable Bar */}
      {showPasteBox && (
        <div className="p-3 bg-slate-900 border-t border-white/10 flex items-center gap-2 z-20 animate-in slide-in-from-bottom-2 duration-200">
          <input
            type="text"
            value={pasteInput}
            onChange={(e) => setPasteInput(e.target.value)}
            placeholder="Pega link de Google Maps o coords (-1.825, -80.752)"
            className="flex-1 bg-slate-950 border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-orange-500"
          />
          <button
            type="button"
            onClick={handleParseGoogleLink}
            className="px-3.5 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-black uppercase tracking-wider"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => setShowPasteBox(false)}
            className="p-2 text-slate-400 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}

      {/* Footer Info & Helpers */}
      <div className="p-3 bg-slate-950/95 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 z-10">
        <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
          <span className="text-orange-400 font-bold">Lat:</span> {currentCoords[0].toFixed(6)}
          <span className="text-orange-400 font-bold ml-1">Lng:</span> {currentCoords[1].toFixed(6)}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={() => setShowPasteBox(!showPasteBox)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 text-[10px] font-bold uppercase tracking-wider transition-all"
          >
            <Link2 className="w-3.5 h-3.5 text-sky-400" />
            <span>Pegar Enlace</span>
          </button>

          <button
            type="button"
            onClick={handleGetCurrentLocation}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 rounded-xl border border-emerald-500/30 text-[10px] font-black uppercase tracking-wider transition-all"
          >
            <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mi GPS</span>
          </button>
        </div>
      </div>
    </div>
  );
});

LocationPickerMiniMap.displayName = 'LocationPickerMiniMap';
