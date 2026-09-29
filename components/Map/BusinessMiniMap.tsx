import React, { useEffect, useRef, useState, memo } from 'react';
import L from 'leaflet';
import { MapPin, Navigation, Compass, Layers, ExternalLink, Copy, Check, ZoomIn, ZoomOut, LocateFixed } from 'lucide-react';
import { Business, Sector, BusinessCategory } from '../../types';
import { SECTOR_INFO, LOCALITIES, MAP_ICONS } from '../../constants';
import { useToast } from '../../context/ToastContext';

interface BusinessMiniMapProps {
  business: Business;
  className?: string;
  height?: string;
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; glow: string }> = {
  food: { bg: '#ea580c', border: '#fb923c', glow: 'rgba(251, 146, 60, 0.6)' },
  music: { bg: '#db2777', border: '#f472b6', glow: 'rgba(244, 114, 182, 0.6)' },
  hotel: { bg: '#ca8a04', border: '#fbbf24', glow: 'rgba(251, 191, 36, 0.6)' },
  waves: { bg: '#0284c7', border: '#38bdf8', glow: 'rgba(56, 189, 248, 0.6)' },
  palmtree: { bg: '#0891b2', border: '#22d3ee', glow: 'rgba(34, 211, 238, 0.6)' },
  mountain: { bg: '#16a34a', border: '#4ade80', glow: 'rgba(74, 222, 128, 0.6)' },
  shopping: { bg: '#9333ea', border: '#c084fc', glow: 'rgba(192, 132, 252, 0.6)' },
  default: { bg: '#f97316', border: '#fdba74', glow: 'rgba(249, 115, 22, 0.6)' }
};

export const BusinessMiniMap: React.FC<BusinessMiniMapProps> = memo(({
  business,
  className = '',
  height = '280px'
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  const [mapMode, setMapMode] = useState<'street' | 'satellite'>('street');
  const mapModeRef = useRef<'street' | 'satellite'>('street');
  mapModeRef.current = mapMode;

  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();

  // Extract coordinates or fallback to locality
  const rawCoords = business.coordinates || (business.location ? [business.location.lat, business.location.lng] : null);
  const localityDefault = LOCALITIES.find(l => l.name === (business.locality || 'Montañita'))?.coords || [-1.825, -80.753];
  const coordinates: [number, number] = (rawCoords && rawCoords.length === 2 && !isNaN(rawCoords[0]) && !isNaN(rawCoords[1]))
    ? [Number(rawCoords[0]), Number(rawCoords[1])]
    : [localityDefault[0], localityDefault[1]];

  const hasPreciseCoords = !!(rawCoords && rawCoords.length === 2 && !isNaN(rawCoords[0]) && !isNaN(rawCoords[1]));

  const getTileUrl = (mode: 'street' | 'satellite') => {
    switch (mode) {
      case 'satellite':
        return 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      case 'street':
      default:
        return 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    }
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

    // Destroy any prior map instance on this container
    if (mapRef.current) {
      mapRef.current.remove();
      mapRef.current = null;
    }

    const map = L.map(containerRef.current, {
      center: coordinates,
      zoom: 16,
      minZoom: 12,
      maxZoom: 19,
      zoomControl: false,
      attributionControl: false,
      scrollWheelZoom: false,
      tap: true,
      dragging: true,
      touchZoom: true,
      doubleClickZoom: true
    });

    mapRef.current = map;
    updateTiles(map, mapModeRef.current);

    // Auto-switch to street map when satellite reaches max zoom
    map.on('zoomend', () => {
      if (map.getZoom() >= 18 && mapModeRef.current === 'satellite') {
        setMapMode('street');
      }
    });

    // Determine category styling
    const iconKey = business.category === BusinessCategory.RESTAURANTE ? 'food' :
      business.category === BusinessCategory.BAR || business.category === BusinessCategory.DISCOTECA || business.category === BusinessCategory.BAR_DISCOTECA ? 'music' :
        business.category === BusinessCategory.HOTEL || business.category === BusinessCategory.HOSTAL || business.category === BusinessCategory.HOSPAJE ? 'hotel' :
          business.category === BusinessCategory.ESCUELA_SURF || business.category === BusinessCategory.CENTRO_SURF ? 'waves' :
            business.category === BusinessCategory.TOUR_OPERATOR ? 'mountain' :
              business.category === BusinessCategory.SHOPPING ? 'shopping' :
                business.icon || 'default';

    const style = CATEGORY_COLORS[iconKey] || CATEGORY_COLORS.default;

    // Create custom pulsing marker
    const customIcon = L.divIcon({
      html: `
        <div class="relative flex flex-col items-center group">
          <div class="absolute -inset-2 rounded-full blur-md animate-ping opacity-60" style="background-color: ${style.glow};"></div>
          <div class="absolute -inset-1 rounded-full blur-sm opacity-80" style="background-color: ${style.glow};"></div>
          <div class="relative w-9 h-9 rounded-2xl flex items-center justify-center text-white shadow-2xl border-2 transition-transform duration-300 transform hover:scale-110" style="background: ${style.bg}; border-color: ${style.border};">
            <svg class="w-5 h-5 drop-shadow-md" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <div class="mt-1 px-2 py-0.5 bg-slate-950/90 backdrop-blur-md border border-white/10 rounded-md shadow-xl text-center whitespace-nowrap pointer-events-none">
            <span class="text-[9px] font-black text-white uppercase tracking-tight max-w-[120px] truncate block">${business.name}</span>
          </div>
        </div>
      `,
      className: 'business-mini-marker',
      iconSize: [36, 54],
      iconAnchor: [18, 27]
    });

    const marker = L.marker(coordinates, { icon: customIcon }).addTo(map);
    markerRef.current = marker;

    // Invalidation timers for reliable rendering
    const timers = [50, 200, 500, 1000].map(delay =>
      setTimeout(() => {
        if (mapRef.current) {
          mapRef.current.invalidateSize();
        }
      }, delay)
    );

    // ResizeObserver to handle container size changes
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
  }, [coordinates[0], coordinates[1], business.name, business.category]);

  useEffect(() => {
    if (mapRef.current) {
      updateTiles(mapRef.current, mapMode);
    }
  }, [mapMode]);

  const handleRecenter = () => {
    if (mapRef.current) {
      mapRef.current.flyTo(coordinates, 16, { animate: true, duration: 0.8 });
    }
  };

  const handleZoomIn = () => {
    if (mapRef.current) {
      const nextZoom = mapRef.current.getZoom() + 1;
      if (nextZoom >= 18 && mapMode === 'satellite') {
        setMapMode('street');
      }
      mapRef.current.zoomIn();
    }
  };

  const handleZoomOut = () => {
    if (mapRef.current) {
      mapRef.current.zoomOut();
    }
  };

  const handleOpenGoogleMaps = () => {
    const [lat, lng] = coordinates;
    const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    window.open(url, '_blank');
  };

  const handleCopyCoordinates = () => {
    const coordsStr = `${coordinates[0].toFixed(6)}, ${coordinates[1].toFixed(6)}`;
    navigator.clipboard.writeText(coordsStr).then(() => {
      setCopied(true);
      showToast('Coordenadas copiadas al portapapeles', 'success');
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      showToast('No se pudo copiar las coordenadas', 'error');
    });
  };

  return (
    <div className={`relative w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-slate-950 shadow-2xl flex flex-col group ${className}`}>
      {/* Mini-map Leaflet Container */}
      <div
        ref={containerRef}
        style={{ height, width: '100%' }}
        className="w-full relative z-0 bg-slate-950"
      />

      {/* Top Overlay Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-wrap items-center gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 text-white shadow-lg pointer-events-auto">
          <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[140px] sm:max-w-[200px]">
            {business.locality || 'Montañita'}
          </span>
        </div>
        {business.sector && (
          <div className="flex items-center gap-1 px-2 py-1 rounded-xl bg-slate-950/85 backdrop-blur-md border border-white/15 text-slate-300 shadow-lg pointer-events-auto">
            <span className="text-[10px]">{SECTOR_INFO[business.sector as Sector]?.symbol || '🧭'}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{business.sector}</span>
          </div>
        )}
      </div>

      {/* Top Right Map Mode Switcher & Controls */}
      <div className="absolute top-3 right-3 z-10 flex flex-col gap-1.5">
        <div className="flex items-center gap-1 p-1 bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-xl shadow-lg">
          <button
            onClick={() => setMapMode('street')}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${mapMode === 'street' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            title="Modo Calles (OpenStreetMap)"
          >
            Calles
          </button>
          <button
            onClick={() => {
              if (mapRef.current && mapRef.current.getZoom() >= 18) {
                mapRef.current.setZoom(17);
              }
              setMapMode('satellite');
            }}
            className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${mapMode === 'satellite' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            title="Modo Satélite"
          >
            Satélite
          </button>
        </div>

        {/* Zoom & Recenter Controls */}
        <div className="flex flex-col bg-slate-950/85 backdrop-blur-md border border-white/15 rounded-xl overflow-hidden shadow-lg self-end">
          <button
            onClick={handleZoomIn}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Acercar"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 border-t border-white/10 transition-colors"
            title="Alejar"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRecenter}
            className="p-2 text-orange-400 hover:text-orange-300 hover:bg-white/10 border-t border-white/10 transition-colors"
            title="Centrar en el negocio"
          >
            <LocateFixed className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Bottom Map Action Bar */}
      <div className="p-3 bg-slate-950/95 backdrop-blur-xl border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-2.5 z-10">
        <div className="flex items-center gap-2 min-w-0 w-full sm:w-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
          <p className="text-[11px] text-slate-300 truncate font-medium">
            {business.address || `${business.locality || 'Montañita'}, Santa Elena`}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
          <button
            onClick={handleCopyCoordinates}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white rounded-xl border border-white/10 text-xs font-bold transition-all"
            title="Copiar Coordenadas GPS"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
            <span className="text-[10px] uppercase tracking-wider">{copied ? 'Copiado' : 'Coordenadas'}</span>
          </button>

          <button
            onClick={handleOpenGoogleMaps}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-orange-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5 shrink-0 fill-current" />
            <span className="text-[10px] tracking-wider">Cómo Llegar</span>
            <ExternalLink className="w-3 h-3 text-white/80 shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
});

BusinessMiniMap.displayName = 'BusinessMiniMap';
