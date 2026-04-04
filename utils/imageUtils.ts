/**
 * Utility for client-side image compression
 */

export interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    quality?: number;
    format?: 'image/jpeg' | 'image/png' | 'image/webp';
    squareCrop?: boolean;
}

/**
 * Compresses an image file to a base64 string
 */
export const compressImage = (
    file: File,
    options: CompressionOptions = {}
): Promise<string> => {
    const {
        maxWidth = 800,
        maxHeight = 800,
        quality = 0.7,
        format = 'image/jpeg',
        squareCrop = false
    } = options;

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

                if (squareCrop) {
                    // Square crop logic
                    const size = maxWidth; // Use maxWidth as standard square side
                    const side = Math.min(width, height);
                    const sx = (width - side) / 2;
                    const sy = (height - side) / 2;
                    
                    canvas.width = size;
                    canvas.height = size;
                    const ctx = canvas.getContext('2d', { alpha: false });
                    if (ctx) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, sx, sy, side, side, 0, 0, size, size);
                    }
                } else {
                    // Calculate new dimensions maintaining aspect ratio
                    if (width > height) {
                        if (width > maxWidth) {
                            height = Math.round(height * (maxWidth / width));
                            width = maxWidth;
                        }
                        // Check if height still exceeds maxHeight (e.g. very tall image)
                        if (height > maxHeight) {
                            width = Math.round(width * (maxHeight / height));
                            height = maxHeight;
                        }
                    } else {
                        if (height > maxHeight) {
                            width = Math.round(width * (maxHeight / height));
                            height = maxHeight;
                        }
                        // Check if width still exceeds maxWidth (e.g. very wide vertical?)
                        if (width > maxWidth) {
                            height = Math.round(height * (maxWidth / width));
                            width = maxWidth;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d', { alpha: false });
                    if (ctx) {
                        ctx.imageSmoothingEnabled = true;
                        ctx.imageSmoothingQuality = 'high';
                        ctx.drawImage(img, 0, 0, width, height);
                    }
                }

                // Convert to requested format and quality
                const dataUrl = canvas.toDataURL(format, quality);
                resolve(dataUrl);
            };
            img.onerror = (error) => reject(new Error('Failed to load image'));
        };
        reader.onerror = (error) => reject(new Error('Failed to read file'));
    });
};

/**
 * Validates if a file is a valid image
 */
export const isValidImage = (file: File): boolean => {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
    return validTypes.includes(file.type);
};
