/**
 * Utility to compress and resize a File to a base64 JPEG string.
 */
export const compressImage = (
    file: File,
    maxDim: number,
    quality: number,
    squareCrop = false
): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Error leyendo la imagen.'));
        reader.onload = (ev) => {
            const img = new Image();
            img.onerror = () => reject(new Error('Error al cargar la imagen.'));
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                if (squareCrop) {
                    // Center-crop to square
                    const size = Math.min(width, height);
                    const offsetX = (width - size) / 2;
                    const offsetY = (height - size) / 2;
                    const dim = Math.min(size, maxDim);
                    canvas.width = dim;
                    canvas.height = dim;
                    canvas.getContext('2d')!.drawImage(img, offsetX, offsetY, size, size, 0, 0, dim, dim);
                } else {
                    // Fit within maxDim x maxDim keeping aspect ratio
                    if (width > height) {
                        if (width > maxDim) { height = Math.round(height * maxDim / width); width = maxDim; }
                    } else {
                        if (height > maxDim) { width = Math.round(width * maxDim / height); height = maxDim; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    canvas.getContext('2d')!.drawImage(img, 0, 0, width, height);
                }

                resolve(canvas.toDataURL('image/jpeg', quality));
            };
            img.src = ev.target!.result as string;
        };
        reader.readAsDataURL(file);
    });
};
