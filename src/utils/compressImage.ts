/**
 * Compress an image file to a target size (default ~150KB).
 * Uses canvas to resize and re-encode as JPEG with quality reduction.
 */
export const compressImage = (
    file: File,
    targetSizeKB: number = 150,
    maxDimension: number = 1200
): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let { width, height } = img;

                // Scale down if larger than max dimension
                if (width > maxDimension || height > maxDimension) {
                    const ratio = Math.min(maxDimension / width, maxDimension / height);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Binary search for the right quality
                const targetBytes = targetSizeKB * 1024;
                let minQuality = 0.1;
                let maxQuality = 0.92;
                let bestBlob: Blob | null = null;

                const tryQuality = (quality: number): Promise<Blob> => {
                    return new Promise((res) => {
                        canvas.toBlob(
                            (blob) => res(blob!),
                            'image/jpeg',
                            quality
                        );
                    });
                };

                const findOptimalQuality = async () => {
                    // Try a few iterations to find the best quality
                    for (let i = 0; i < 6; i++) {
                        const midQuality = (minQuality + maxQuality) / 2;
                        const blob = await tryQuality(midQuality);

                        if (blob.size > targetBytes) {
                            maxQuality = midQuality;
                        } else {
                            minQuality = midQuality;
                            bestBlob = blob;
                        }
                    }

                    // If no good quality found, use minimum
                    if (!bestBlob) {
                        bestBlob = await tryQuality(minQuality);
                    }

                    const compressedFile = new File(
                        [bestBlob],
                        file.name.replace(/\.[^.]+$/, '.jpg'),
                        { type: 'image/jpeg' }
                    );

                    resolve(compressedFile);
                };

                findOptimalQuality().catch(reject);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};
