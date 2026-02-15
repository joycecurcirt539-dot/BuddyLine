/**
 * Compress an image file to a target size (default ~150KB).
 * Optimized to skip compression if already small, use WebP where possible,
 * and implement smarter scaling and quality adjustments.
 */
export const compressImage = async (
    file: File,
    targetSizeKB: number = 150,
    maxDimension: number = 1600 // Increased from 1200 for better quality on large screens
): Promise<File> => {
    const targetBytes = targetSizeKB * 1024;

    // 1. If file is already smaller than target, return as is (skip processing)
    if (file.size <= targetBytes) {
        console.log(`[Compression] Skipping: ${file.name} is already ${Math.round(file.size / 1024)}KB`);
        return file;
    }

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = async () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // 2. Smart Scaling: Limit dimensions to save memory/space
                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension / width, maxDimension / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d', { alpha: false }); // Disable alpha for better performance
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Fill white background (useful if source is PNG with transparency)
                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                // 3. Choice of Format: Prefer WebP for better compression efficiency
                const isWebPSupported = canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
                const outputType = isWebPSupported ? 'image/webp' : 'image/jpeg';
                const outputExt = isWebPSupported ? '.webp' : '.jpg';

                const tryQuality = (quality: number): Promise<Blob> => {
                    return new Promise((res) => {
                        canvas.toBlob((blob) => res(blob!), outputType, quality);
                    });
                };

                // 4. Iterative Quality Search
                let minQuality = 0.1;
                let maxQuality = 0.9;
                let bestBlob: Blob | null = null;

                // Try a few iterations to find the best balance
                for (let i = 0; i < 5; i++) {
                    const midQuality = (minQuality + maxQuality) / 2;
                    const blob = await tryQuality(midQuality);

                    if (blob.size > targetBytes) {
                        maxQuality = midQuality;
                    } else {
                        minQuality = midQuality;
                        bestBlob = blob;
                    }
                }

                // If still too large after iterations or no blob found within target
                if (!bestBlob) {
                    bestBlob = await tryQuality(minQuality);
                }

                // Final check: if compressed version is somehow larger than original, use original
                // (Unlikely given targetSizeKB check, but safe)
                if (bestBlob.size > file.size) {
                    resolve(file);
                    return;
                }

                const compressedFile = new File(
                    [bestBlob],
                    file.name.replace(/\.[^.]+$/, outputExt),
                    { type: outputType }
                );

                resolve(compressedFile);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};
