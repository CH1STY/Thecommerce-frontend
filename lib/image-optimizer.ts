/**
 * Utility for converting and minimizing uploaded product images to WebP.
 *
 * Runs client-side in the browser:
 * 1. Reads the selected image file.
 * 2. Scales down images exceeding max dimension (default 1000px) while preserving aspect ratio.
 * 3. Encodes to modern, highly compressed WebP format (quality: 0.82).
 * 4. Measures original vs optimized file size so the user gets instant feedback.
 */

export interface OptimizedImageResult {
  file: File;
  previewUrl: string;
  originalSize: number;
  optimizedSize: number;
  width: number;
  height: number;
}

const MAX_DIMENSION = 1000;
const WEBP_QUALITY = 0.82;

export async function optimizeImageToWebP(
  sourceFile: File,
  maxDimension = MAX_DIMENSION,
  quality = WEBP_QUALITY,
): Promise<OptimizedImageResult> {
  const originalSize = sourceFile.size;
  const originalUrl = URL.createObjectURL(sourceFile);

  try {
    const img = await loadImage(originalUrl);
    let { width, height } = img;

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width);
        width = maxDimension;
      } else {
        width = Math.round((width * maxDimension) / height);
        height = maxDimension;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Could not initialize 2D canvas context.");
    }

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => {
          if (b) resolve(b);
          else reject(new Error("WebP conversion failed."));
        },
        "image/webp",
        quality,
      );
    });

    const baseName = sourceFile.name.replace(/\.[^/.]+$/, "");
    const webpFile = new File([blob], `${baseName}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });

    const previewUrl = URL.createObjectURL(blob);

    return {
      file: webpFile,
      previewUrl,
      originalSize,
      optimizedSize: blob.size,
      width,
      height,
    };
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image file."));
    img.src = url;
  });
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
