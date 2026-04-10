export type ViewType = 'home' | 'editor' | 'documents' | 'ocr';

export type FilterType = 'original' | 'grayscale' | 'bw' | 'sepia' | 'vivid' | 'warm' | 'cool' | 'sharpen';

export type ExportQuality = 'draft' | 'standard' | 'high';

export type PageSize = 'a4' | 'letter' | 'original';

export interface ScannedPage {
  id: string;
  originalImage: string; // base64
  processedImage: string; // base64
  filter: FilterType;
  brightness: number;
  contrast: number;
  sharpness: number;
  rotation: number;
  ocrText?: string;
}

export interface ScannedDocument {
  id: string;
  name: string;
  pages: ScannedPage[];
  createdAt: string; // ISO string
  thumbnail: string; // base64 - first page processed image
  fileSize: number; // estimated size in bytes
}

export interface FilterInfo {
  id: FilterType;
  label: string;
  cssFilter: string;
}

export const FILTERS: FilterInfo[] = [
  { id: 'original', label: 'Original', cssFilter: 'none' },
  { id: 'grayscale', label: 'Grayscale', cssFilter: 'grayscale(100%)' },
  { id: 'bw', label: 'B&W', cssFilter: 'grayscale(100%) contrast(1.5)' },
  { id: 'sepia', label: 'Sepia', cssFilter: 'sepia(80%) saturate(120%)' },
  { id: 'vivid', label: 'Vivid', cssFilter: 'saturate(180%) contrast(110%)' },
  { id: 'warm', label: 'Warm', cssFilter: 'sepia(30%) saturate(130%) brightness(105%)' },
  { id: 'cool', label: 'Cool', cssFilter: 'saturate(90%) hue-rotate(15deg) brightness(105%)' },
  { id: 'sharpen', label: 'Sharpen', cssFilter: 'contrast(110%)' },
];
