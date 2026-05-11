import React, { useEffect } from 'react';
// import { Html5QrcodeScanner } from 'html5-qrcode';
const Html5QrcodeScanner: any = null;


interface QRScannerProps {
    onScanSuccess: (decodedText: string) => void;
    onScanFailure?: (error: any) => void;
    fps?: number;
    qrbox?: number;
}

const QRScanner: React.FC<QRScannerProps> = ({ 
    onScanSuccess, 
    onScanFailure = () => {}, 
    fps = 10, 
    qrbox = 250 
}) => {
    useEffect(() => {
        const scanner = new Html5QrcodeScanner(
            "qr-reader",
            { fps, qrbox: { width: qrbox, height: qrbox } },
            /* verbose= */ false
        );

        scanner.render(onScanSuccess, onScanFailure);

        return () => {
            scanner.clear().catch(error => {
                console.warn("Failed to clear html5QrcodeScanner", error);
            });
        };
    }, []);

    return <div id="qr-reader" className="w-full overflow-hidden rounded-2xl border border-white/10 bg-black/40" />;
};

export default QRScanner;
