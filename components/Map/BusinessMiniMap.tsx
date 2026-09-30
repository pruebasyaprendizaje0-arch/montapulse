import React, { useEffect, useRef, useState } from 'react';
import { Navigation, Copy, CheckCheck, Compass, Globe } from 'lucide-react';

interface BusinessMiniMapProps {
    coordinates?: [number, number]; // [lat, lng]
    name?: string;
    sector?: string;
    locality?: string;
    address?: string;
}

const TILE_URLS = {
    streets: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    satellite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};

export const BusinessMiniMap: React.FC<BusinessMiniMapProps> = ({
    coordinates,
    name = 'Negocio',
    sector,
    locality = 'Montañita',
    address,
}) => {
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstanceRef = useRef<any>(null);
    const tileRef = useRef<any>(null);
    const [mapMode, setMapMode] = useState<'streets' | 'satellite'>('streets');
    const [copied, setCopied] = useState(false);
    const [leafletReady, setLeafletReady] = useState(!!(window as any).L);

    const lat = coordinates?.[0] ?? -1.8467;
    const lng = coordinates?.[1] ?? -80.7514;
    const hasCoords = !!(coordinates?.[0] && coordinates?.[1]);

    // Inject Leaflet CSS once
    useEffect(() => {
        if (!document.getElementById('leaflet-css-mini')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css-mini';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }
        if ((window as any).L) { setLeafletReady(true); return; }
        if (document.getElementById('leaflet-js-mini')) return;
        const script = document.createElement('script');
        script.id = 'leaflet-js-mini';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = () => setLeafletReady(true);
        document.head.appendChild(script);
    }, []);

    // Init map
    useEffect(() => {
        if (!leafletReady || !mapRef.current || mapInstanceRef.current) return;
        const L = (window as any).L;

        const map = L.map(mapRef.current, {
            center: [lat, lng],
            zoom: 17,
            zoomControl: false,
            attributionControl: true,
        });

        L.control.zoom({ position: 'bottomright' }).addTo(map);

        const orangeIcon = L.divIcon({
            html: `<div style="width:34px;height:34px;background:linear-gradient(135deg,#f97316,#ea580c);border:3px solid #fff;border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 4px 14px rgba(249,115,22,0.65);display:flex;align-items:center;justify-content:center"><div style="width:10px;height:10px;background:#fff;border-radius:50%;transform:rotate(45deg)"></div></div>`,
            iconSize: [34, 34],
            iconAnchor: [17, 34],
            popupAnchor: [0, -40],
            className: '',
        });

        const shortName = name.length > 22 ? name.substring(0, 20) + '…' : name;

        L.marker([lat, lng], { icon: orangeIcon })
            .addTo(map)
            .bindPopup(`<div style="font-weight:800;font-size:11px;color:#fff;text-transform:uppercase;letter-spacing:0.05em;padding:2px 4px">${shortName}</div>`, {
                closeButton: false,
                offset: [0, -8],
            })
            .openPopup();

        tileRef.current = L.tileLayer(TILE_URLS.streets, { maxZoom: 20 }).addTo(map);
        mapInstanceRef.current = map;

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [leafletReady]);

    // Switch tile layer on mode change
    useEffect(() => {
        if (!tileRef.current) return;
        tileRef.current.setUrl(TILE_URLS[mapMode]);
    }, [mapMode]);

    const handleCopyCoords = () => {
        navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
        });
    };

    return (
        <div className="w-full rounded-2xl sm:rounded-3xl overflow-hidden border border-white/10 bg-[#0a0e1a] shadow-2xl">
            {/* Header */}
            <div className="px-4 sm:px-5 pt-4 pb-2 flex items-start justify-between gap-3">
                <div>
                    <div className="flex items-center gap-1.5 mb-0.5">
                        <Compass className="w-3.5 h-3.5 text-amber-400" />
                        <span className="text-[10px] font-black text-amber-400 uppercase tracking-widest">Geolocalización Oficial</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-tight leading-tight">
                        Mapa &amp; Ubicación del Local
                    </h3>
                </div>
                <span className="text-[10px] font-bold text-slate-400 whitespace-nowrap mt-1 shrink-0">
                    {locality}{sector ? ` · ${sector}` : ''}
                </span>
            </div>

            {/* Controls bar */}
            <div className="px-3 sm:px-4 py-2 flex items-center justify-between bg-[#070c18]/60">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="flex items-center gap-1.5 px-2.5 py-1 bg-[#1a1a2e] border border-amber-500/30 rounded-full text-[10px] font-black text-amber-400 uppercase tracking-wider">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block shrink-0" />
                        {locality}
                    </span>
                    {sector && (
                        <span className="flex items-center gap-1 px-2.5 py-1 bg-[#1a1a2e] border border-white/10 rounded-full text-[10px] font-black text-slate-300 uppercase tracking-wider">
                            <Globe className="w-2.5 h-2.5 shrink-0" />
                            {sector}
                        </span>
                    )}
                </div>
                <div className="flex items-center bg-[#1a1a2e] border border-white/10 rounded-full p-0.5 shrink-0">
                    {(['streets', 'satellite'] as const).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setMapMode(mode)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                                mapMode === mode ? 'bg-amber-500 text-black shadow' : 'text-slate-400 hover:text-white'
                            }`}
                        >
                            {mode === 'streets' ? 'Calles' : 'Satélite'}
                        </button>
                    ))}
                </div>
            </div>

            {/* Map container */}
            <div className="relative w-full" style={{ height: '220px' }}>
                {!hasCoords && (
                    <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-[#0a0e1a]/90 gap-2 pointer-events-none">
                        <Compass className="w-8 h-8 text-slate-600" />
                        <p className="text-xs font-bold text-slate-500 text-center px-6">
                            Coordenadas no configuradas para este negocio
                        </p>
                    </div>
                )}
                {!leafletReady && (
                    <div className="absolute inset-0 z-10 flex items-center justify-center bg-[#0a0e1a]">
                        <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
                    </div>
                )}
                <div ref={mapRef} className="w-full h-full" />
            </div>

            {/* Footer */}
            <div className="px-3 sm:px-4 py-2.5 flex items-center justify-between bg-[#070c18]/80 gap-3">
                <div className="flex items-center gap-2 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                    <span className="text-[11px] font-bold text-slate-300 truncate">
                        {address || 'Av. Ruta del Spondylus'}
                    </span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <button
                        onClick={handleCopyCoords}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[10px] font-black text-slate-300 hover:text-white transition-all"
                    >
                        {copied ? <CheckCheck className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        Coordenadas
                    </button>
                    <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 rounded-full text-[10px] font-black text-black transition-all shadow-md shadow-amber-500/25 active:scale-95"
                    >
                        <Navigation className="w-3 h-3" />
                        Cómo llegar
                    </a>
                </div>
            </div>
        </div>
    );
};

export default BusinessMiniMap;

