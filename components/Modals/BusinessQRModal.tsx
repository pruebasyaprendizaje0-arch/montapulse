import React, { useRef, useState } from 'react';
import { X, Download, Share2, Copy, Check, QrCode, ExternalLink, Sparkles, MessageCircle } from 'lucide-react';
import { QRCodeCanvas } from 'qrcode.react';
import { Business } from '../../types';
import { BASE_URL } from '../../constants';
import { useToast } from '../../context/ToastContext';

interface BusinessQRModalProps {
    isOpen: boolean;
    onClose: () => void;
    business: Business;
}

export const BusinessQRModal: React.FC<BusinessQRModalProps> = ({ isOpen, onClose, business }) => {
    const { showToast } = useToast();
    const qrCanvasRef = useRef<HTMLDivElement>(null);
    const [copied, setCopied] = useState(false);

    if (!isOpen || !business) return null;

    const businessUrl = `${BASE_URL}/negocio/${business.slug || business.id}`;

    const handleCopyLink = () => {
        navigator.clipboard.writeText(businessUrl);
        setCopied(true);
        showToast('¡Enlace copiado al portapapeles!', 'success');
        setTimeout(() => setCopied(false), 2500);
    };

    const handleDownloadQR = () => {
        try {
            const canvas = qrCanvasRef.current?.querySelector('canvas');
            if (!canvas) {
                showToast('Error al generar la imagen del QR', 'error');
                return;
            }

            // Create high-res canvas with border & branding
            const exportCanvas = document.createElement('canvas');
            const padding = 40;
            const extraHeader = 80;
            const extraFooter = 60;
            exportCanvas.width = canvas.width + padding * 2;
            exportCanvas.height = canvas.height + padding * 2 + extraHeader + extraFooter;

            const ctx = exportCanvas.getContext('2d');
            if (!ctx) return;

            // Background
            ctx.fillStyle = '#0f172a'; // Slate 900
            ctx.roundRect(0, 0, exportCanvas.width, exportCanvas.height, 24);
            ctx.fill();

            // Header text
            ctx.fillStyle = '#f97316'; // Orange 500
            ctx.font = 'bold 20px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(business.name.toUpperCase(), exportCanvas.width / 2, 45);

            ctx.fillStyle = '#94a3b8'; // Slate 400
            ctx.font = '14px Inter, sans-serif';
            ctx.fillText(`Escanea para ver menú, eventos y reservas · ${business.locality || 'Montañita'}`, exportCanvas.width / 2, 70);

            // White container for QR
            ctx.fillStyle = '#ffffff';
            ctx.roundRect(padding - 10, extraHeader + padding - 10, canvas.width + 20, canvas.height + 20, 16);
            ctx.fill();

            // Draw QR code
            ctx.drawImage(canvas, padding, extraHeader + padding);

            // Footer
            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 16px Inter, sans-serif';
            ctx.fillText('www.ubicame.info', exportCanvas.width / 2, exportCanvas.height - 30);

            const dataUrl = exportCanvas.toDataURL('image/png');
            const link = document.createElement('a');
            const cleanName = business.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
            link.download = `qr-ubicame-${cleanName}.png`;
            link.href = dataUrl;
            link.click();

            showToast('¡Código QR descargado con éxito!', 'success');
        } catch (error) {
            console.error('Error downloading QR:', error);
            showToast('Error al descargar el código QR', 'error');
        }
    };

    const handleShareWhatsApp = () => {
        const text = `¡Hola! Conoce ${business.name} en ${business.locality || 'Montañita'}, revisa nuestros horarios, servicios y ubicación aquí: ${businessUrl}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    };

    const handleNativeShare = () => {
        if (navigator.share) {
            navigator.share({
                title: business.name,
                text: `Conoce ${business.name} en Ubícame`,
                url: businessUrl
            }).catch(() => handleCopyLink());
        } else {
            handleCopyLink();
        }
    };

    return (
        <div className="fixed inset-0 z-[6000] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 border border-white/10 rounded-[2.5rem] w-full max-w-md p-6 sm:p-8 text-slate-100 shadow-2xl relative flex flex-col items-center text-center">
                {/* Close Button */}
                <button
                    onClick={onClose}
                    className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-colors"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* Badge & Title */}
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-full text-[10px] font-black uppercase tracking-widest mb-3">
                    <QrCode className="w-3.5 h-3.5" /> Código QR Oficial
                </div>

                <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight leading-tight mb-1">
                    {business.name}
                </h3>
                <p className="text-xs text-slate-400 mb-6 font-medium">
                    Coloca este código en tus mesas, barra o recepción para que tus clientes accedan directamente a tu ficha.
                </p>

                {/* QR Canvas Card */}
                <div 
                    ref={qrCanvasRef}
                    className="p-5 bg-white rounded-3xl shadow-xl border-4 border-orange-500/20 mb-6 flex flex-col items-center justify-center"
                >
                    <QRCodeCanvas
                        value={businessUrl}
                        size={220}
                        level="H"
                        includeMargin={false}
                        imageSettings={(business.logoUrl || business.imageUrl) ? {
                            src: business.logoUrl || business.imageUrl,
                            x: undefined,
                            y: undefined,
                            height: 48,
                            width: 48,
                            excavate: true
                        } : undefined}
                    />
                </div>

                {/* Link Box */}
                <div className="w-full bg-slate-900/90 border border-white/10 rounded-2xl p-3 flex items-center justify-between gap-2 mb-4">
                    <span className="text-xs text-slate-300 font-mono truncate text-left select-all pl-2">
                        {businessUrl}
                    </span>
                    <button
                        onClick={handleCopyLink}
                        className={`px-3 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${copied ? 'bg-emerald-500 text-white' : 'bg-white/10 text-white hover:bg-white/20'}`}
                    >
                        {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? 'Copiado' : 'Copiar'}</span>
                    </button>
                </div>

                {/* Action Buttons */}
                <div className="w-full flex flex-col sm:flex-row gap-2.5">
                    <button
                        onClick={handleDownloadQR}
                        className="flex-1 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        <span>Descargar QR (PNG)</span>
                    </button>

                    <button
                        onClick={handleShareWhatsApp}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 px-4 rounded-2xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 shrink-0"
                        title="Compartir por WhatsApp"
                    >
                        <MessageCircle className="w-4 h-4" />
                        <span>WhatsApp</span>
                    </button>
                </div>
            </div>
        </div>
    );
};
