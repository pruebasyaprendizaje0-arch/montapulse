import React, { useState, useEffect, useRef, useId } from 'react';
import { uploadBytes, ref, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase.config';
import { Camera, Image as ImageIcon, Loader2, X, CheckCircle2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface OptimizedImageUploaderProps {
    onImageProcessed: (url: string) => void;
    currentImageUrl?: string;
    path: string;
    className?: string;
}

export const OptimizedImageUploader: React.FC<OptimizedImageUploaderProps> = ({ 
    onImageProcessed, 
    currentImageUrl, 
    path,
    className = ""
}) => {
    const { showToast } = useToast();
    const [isUploading, setIsUploading] = useState(false);
    const [previewUrl, setPreviewUrl] = useState<string | null>(currentImageUrl || null);
    const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');

    const galleryInputRef = useRef<HTMLInputElement>(null);
    const cameraInputRef = useRef<HTMLInputElement>(null);

    const triggerGallery = (e: React.MouseEvent) => {
        e.stopPropagation();
        galleryInputRef.current?.click();
    };

    const triggerCamera = (e: React.MouseEvent) => {
        e.stopPropagation();
        cameraInputRef.current?.click();
    };

    useEffect(() => {
        if (currentImageUrl) {
            setPreviewUrl(currentImageUrl);
        }
    }, [currentImageUrl]);

    const compressImage = (file: File): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    
                    // Max dimensions for "high quality" but still manageable size
                    const MAX_SIZE = 2000;
                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    
                    // Compress to 90% quality for premium look
                    canvas.toBlob((blob) => {
                        if (blob) resolve(blob);
                        else reject(new Error('Canvas toBlob failed'));
                    }, 'image/jpeg', 0.90);
                };
            };
            reader.onerror = (err) => reject(err);
        });
    };

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploadStatus('uploading');
            setIsUploading(true);
            
            // Preview local inmediato (original)
            const localPreview = URL.createObjectURL(file);
            setPreviewUrl(localPreview);

            // Compress before upload to ensure "reduction" works even without extension
            const compressedBlob = await compressImage(file);

            const randomId = Math.random().toString(36).substring(2, 15);
            const fileName = `${randomId}.jpg`;
            const storagePath = `${path}/${fileName}`;
            
            const storageRef = ref(storage, storagePath);
            const uploadTask = await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
            const downloadUrl = await getDownloadURL(uploadTask.ref);
            
            onImageProcessed(downloadUrl);
            setUploadStatus('success');
            
            setTimeout(() => {
               setUploadStatus('idle');
            }, 3000);

        } catch (error: any) {
            console.error('Error uploading:', error);
            setUploadStatus('error');
            setPreviewUrl(currentImageUrl || null);
            showToast('Error al subir imagen', 'error');
        } finally {
            setIsUploading(false);
            if (e.target) e.target.value = '';
        }
    };

    const removeImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setPreviewUrl(null);
        onImageProcessed('');
        setUploadStatus('idle');
    };

    return (
        <div className={`relative w-full aspect-video rounded-[2rem] overflow-hidden bg-slate-800/50 border-2 border-dashed border-slate-700/50 flex flex-col items-center justify-center transition-all ${className}`}>
            
            {/* Hidden file inputs with IDs for label access */}
            <input 
                ref={galleryInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileChange} 
                className="hidden" 
            />
            <input 
                ref={cameraInputRef}
                type="file" 
                accept="image/*" 
                capture="environment" 
                onChange={handleFileChange} 
                className="hidden" 
            />

            {previewUrl ? (
                <div className="relative w-full h-full group">
                    <img 
                        src={previewUrl} 
                        alt="Preview" 
                        className={`w-full h-full object-cover ${isUploading ? 'opacity-50 grayscale' : 'opacity-100'} transition-all`}
                    />
                    
                    {/* Botones de acción cuando ya hay una imagen */}
                    <div 
                        className="absolute inset-0 bg-black/40 hover:bg-black/60 flex items-center justify-center gap-8 transition-all z-20"
                    >
                        <button 
                            type="button"
                            onClick={triggerGallery}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-5 rounded-[2rem] flex flex-col items-center gap-2 transform hover:scale-110 active:scale-95 transition-all shadow-2xl"
                        >
                            <ImageIcon className="w-8 h-8" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Galería</span>
                        </button>
                        
                        <button 
                            type="button"
                            onClick={triggerCamera}
                            className="bg-orange-600 hover:bg-orange-500 text-white p-5 rounded-[2rem] flex flex-col items-center gap-2 transform hover:scale-110 active:scale-95 transition-all shadow-2xl"
                        >
                            <Camera className="w-8 h-8" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Cámara</span>
                        </button>
                    </div>

                    <button 
                        onClick={removeImage}
                        type="button"
                        className="absolute top-4 right-4 p-2 bg-red-500 hover:bg-red-400 text-white rounded-full shadow-lg transition-all z-30"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="flex flex-row gap-8 p-10">
                    <button 
                        type="button"
                        onClick={triggerGallery}
                        className="flex flex-col items-center gap-4 cursor-pointer group/item relative p-6 rounded-[2.5rem] bg-slate-800/40 border border-white/5 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all shadow-lg"
                    >
                        <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center group-hover/item:bg-blue-600/20 group-hover/item:text-blue-400 transition-all shadow-inner">
                            <ImageIcon className="w-10 h-10" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover/item:text-blue-400 text-center">Galería</span>
                    </button>

                    <button 
                        type="button"
                        onClick={triggerCamera}
                        className="flex flex-col items-center gap-4 cursor-pointer group/item relative p-6 rounded-[2.5rem] bg-slate-800/40 border border-white/5 hover:border-orange-500/50 hover:bg-orange-500/5 transition-all shadow-lg"
                    >
                        <div className="w-20 h-20 rounded-3xl bg-slate-800 flex items-center justify-center group-hover/item:bg-orange-600/20 group-hover/item:text-orange-400 transition-all shadow-inner">
                            <Camera className="w-10 h-10" />
                        </div>
                        <span className="text-xs font-black uppercase tracking-widest text-slate-500 group-hover/item:text-orange-400 text-center">Cámara</span>
                    </button>
                </div>
            )}

            {/* Overlay de Carga */}
            {isUploading && (
                <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center gap-4 z-50">
                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                    <p className="text-xs font-black uppercase tracking-widest text-white">Subiendo Foto...</p>
                </div>
            )}

            {/* Estado de éxito */}
            {uploadStatus === 'success' && !isUploading && (
                <div className="absolute inset-0 bg-green-500/10 backdrop-blur-[2px] pointer-events-none z-50 flex items-center justify-center">
                    <CheckCircle2 className="w-16 h-16 text-green-500 animate-bounce" />
                </div>
            )}
        </div>
    );
};
