import { jsPDF } from 'jspdf';
import { ScannedDocument, ExportQuality, PageSize } from './types';

const PAGE_SIZES = {
  a4: { width: 210, height: 297 },
  letter: { width: 215.9, height: 279.4 },
};

function getQualitySettings(quality: ExportQuality) {
  switch (quality) {
    case 'draft':
      return { compression: 0.4, scale: 0.7 };
    case 'standard':
      return { compression: 0.75, scale: 0.85 };
    case 'high':
      return { compression: 0.95, scale: 1.0 };
  }
}

function dataURLtoUint8Array(dataURL: string): Uint8Array {
  const base64 = dataURL.split(',')[1];
  if (!base64) return new Uint8Array(0);
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function getImageDimensions(dataURL: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.width, height: img.height });
    img.onerror = reject;
    img.src = dataURL;
  });
}

export async function generatePDF(
  document: ScannedDocument,
  quality: ExportQuality = 'standard',
  pageSize: PageSize = 'a4'
): Promise<Blob> {
  const settings = getQualitySettings(quality);
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    compress: true,
  });

  for (let i = 0; i < document.pages.length; i++) {
    const page = document.pages[i];
    const imageData = page.processedImage || page.originalImage;
    const dims = await getImageDimensions(imageData);

    let pageWidthMM: number;
    let pageHeightMM: number;

    if (pageSize === 'original') {
      // Use a standard DPI of 150 to convert pixels to mm
      pageWidthMM = (dims.width / 150) * 25.4;
      pageHeightMM = (dims.height / 150) * 25.4;
      doc.addPage([pageWidthMM, pageHeightMM]);
    } else {
      const ps = PAGE_SIZES[pageSize];
      pageWidthMM = ps.width;
      pageHeightMM = ps.height;
    }

    if (i > 0) {
      doc.addPage([pageWidthMM, pageHeightMM]);
    } else {
      doc.addPage([pageWidthMM, pageHeightMM]);
    }

    // Calculate image dimensions to fit within page with margins
    const margin = 5;
    const maxWidth = pageWidthMM - margin * 2;
    const maxHeight = pageHeightMM - margin * 2;
    
    const imgAspect = dims.width / dims.height;
    let imgWidth: number;
    let imgHeight: number;

    if (imgAspect > maxWidth / maxHeight) {
      imgWidth = maxWidth;
      imgHeight = maxWidth / imgAspect;
    } else {
      imgHeight = maxHeight;
      imgWidth = maxHeight * imgAspect;
    }

    // Center the image
    const x = (pageWidthMM - imgWidth) / 2;
    const y = (pageHeightMM - imgHeight) / 2;

    const imgData = dataURLtoUint8Array(imageData);
    const format = imageData.includes('image/png') ? 'PNG' : 'JPEG';
    
    doc.addImage(imgData, format, x, y, imgWidth, imgHeight, undefined, 'FAST');
  }

  return doc.output('blob');
}

export async function generateSinglePagePDF(
  imageData: string,
  quality: ExportQuality = 'standard',
  pageSize: PageSize = 'a4'
): Promise<Blob> {
  const tempDoc: ScannedDocument = {
    id: 'temp',
    name: 'temp',
    pages: [{ id: 'temp', originalImage: imageData, processedImage: imageData, filter: 'original', brightness: 100, contrast: 100, sharpness: 0, rotation: 0 }],
    createdAt: new Date().toISOString(),
    thumbnail: imageData,
    fileSize: 0,
  };
  return generatePDF(tempDoc, quality, pageSize);
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
