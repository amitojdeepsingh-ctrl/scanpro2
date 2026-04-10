import { FilterType, FILTERS } from './types';

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function createCanvas(width: number, height: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  return [canvas, ctx];
}

export function buildCSSFilterString(
  filter: FilterType,
  brightness: number,
  contrast: number,
  sharpness: number
): string {
  const filterInfo = FILTERS.find(f => f.id === filter);
  const baseFilter = filterInfo?.cssFilter === 'none' ? '' : filterInfo?.cssFilter || '';
  
  const parts: string[] = [];
  if (baseFilter) parts.push(baseFilter);
  if (brightness !== 100) parts.push(`brightness(${brightness}%)`);
  if (contrast !== 100) parts.push(`contrast(${contrast}%)`);
  if (sharpness !== 0) parts.push(`contrast(${100 + sharpness}%)`);
  
  return parts.length > 0 ? parts.join(' ') : 'none';
}

const MAX_PROCESS_SIZE = 1200;

export async function applyFilter(
  imageSrc: string,
  filter: FilterType,
  brightness: number,
  contrast: number,
  sharpness: number,
  rotation: number = 0
): Promise<string> {
  // Skip processing if everything is default
  const filterString = buildCSSFilterString(filter, brightness, contrast, sharpness);
  if (filterString === 'none' && rotation === 0) {
    return imageSrc;
  }

  const img = await loadImage(imageSrc);

  const isRotated = rotation === 90 || rotation === 270;
  const fullW = isRotated ? img.height : img.width;
  const fullH = isRotated ? img.width : img.height;

  // Scale down large images for mobile performance
  const scale = Math.min(MAX_PROCESS_SIZE / fullW, MAX_PROCESS_SIZE / fullH, 1);
  const width = Math.round(fullW * scale);
  const height = Math.round(fullH * scale);

  const [canvas, ctx] = createCanvas(width, height);

  // Apply rotation
  ctx.save();
  ctx.translate(width / 2, height / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  ctx.drawImage(img, -img.width * scale / 2, -img.height * scale / 2, img.width * scale, img.height * scale);
  ctx.restore();

  // Apply CSS filters
  if (filterString !== 'none') {
    const [canvas2, ctx2] = createCanvas(width, height);
    ctx2.filter = filterString;
    ctx2.drawImage(canvas, 0, 0);
    return canvas2.toDataURL('image/jpeg', 0.85);
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function autoEnhance(imageSrc: string): Promise<{ brightness: number; contrast: number }> {
  const img = await loadImage(imageSrc);
  const [canvas, ctx] = createCanvas(
    Math.min(img.width, 800),
    Math.min(img.height, 800)
  );
  
  // Scale down for analysis
  const scale = Math.min(
    800 / img.width,
    800 / img.height,
    1
  );
  ctx.drawImage(img, 0, 0, img.width * scale, img.height * scale);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  let totalBrightness = 0;
  const pixelCount = data.length / 4;
  let minBright = 255;
  let maxBright = 0;
  
  for (let i = 0; i < data.length; i += 4) {
    const brightness = (data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    totalBrightness += brightness;
    if (brightness < minBright) minBright = brightness;
    if (brightness > maxBright) maxBright = brightness;
  }
  
  const avgBrightness = totalBrightness / pixelCount;
  const dynamicRange = maxBright - minBright;
  
  // Target brightness ~128, target contrast ~180
  let newBrightness = 100;
  let newContrast = 100;
  
  if (avgBrightness < 100) {
    newBrightness = Math.min(100 + (100 - avgBrightness) * 0.8, 160);
  } else if (avgBrightness > 180) {
    newBrightness = Math.max(100 - (avgBrightness - 180) * 0.5, 70);
  }
  
  if (dynamicRange < 150) {
    newContrast = Math.min(100 + (150 - dynamicRange) * 0.5, 170);
  } else if (dynamicRange > 230) {
    newContrast = Math.max(100 - (dynamicRange - 230) * 0.3, 90);
  }
  
  return {
    brightness: Math.round(newBrightness),
    contrast: Math.round(newContrast),
  };
}

export async function resizeImage(imageSrc: string, maxDimension: number = 1200): Promise<string> {
  const img = await loadImage(imageSrc);
  const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
  if (scale >= 1) return imageSrc;
  const [canvas, ctx] = createCanvas(
    Math.round(img.width * scale),
    Math.round(img.height * scale)
  );
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.85);
}

export async function generateThumbnail(imageSrc: string, maxSize: number = 300): Promise<string> {
  const img = await loadImage(imageSrc);
  const scale = Math.min(maxSize / img.width, maxSize / img.height, 1);
  const [canvas, ctx] = createCanvas(
    Math.round(img.width * scale),
    Math.round(img.height * scale)
  );
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.7);
}

export function estimateBase64Size(base64: string): number {
  const base64Length = base64.split(',')[1]?.length || base64.length;
  return Math.round((base64Length * 3) / 4);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
