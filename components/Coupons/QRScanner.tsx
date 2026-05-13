import React, { useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrCode, RefreshCw } from 'lucide-react';

interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: string) => void;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, onScanFailure }) => {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);

    useEffect(() => {
        // Initialize scanner
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { 
                fps: 10, 
                qrbox: { width: 250, height: 250 },
                aspectRatio: 1.0
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                // On success, we want to stop the scanner to avoid multiple hits
                scanner.clear().then(() => {
                    onScanSuccess(decodedText);
                }).catch(err => {
                    console.error("Failed to clear scanner", err);
                    onScanSuccess(decodedText);
                });
            },
            (error) => {
                if (onScanFailure) onScanFailure(error);
            }
        );

        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Scanner cleanup failed", err));
            }
        };
    }, []);

    return (
        <div className="space-y-4">
            <div className="relative rounded-[2rem] overflow-hidden border-2 border-white/10 bg-black/40">
                <div id="qr-reader" className="w-full !border-none" />
                
                {/* Overlay for premium feel */}
                <div className="absolute inset-0 pointer-events-none border-[20px] border-black/40">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-orange-500 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-orange-500 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-orange-500 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-orange-500 rounded-br-xl" />
                </div>
            </div>
            
            <div className="flex items-center justify-center gap-2 py-2">
                <RefreshCw className="w-3 h-3 text-slate-500 animate-spin-slow" />
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Buscando código QR...</p>
            </div>
        </div>
    );
};
