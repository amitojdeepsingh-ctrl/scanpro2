'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Check, Ratio } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CropToolProps {
  imageSrc: string;
  onCrop: (croppedImage: string) => void;
  onCancel: () => void;
}

interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

const ASPECT_RATIOS = [
  { label: 'Free', ratio: null },
  { label: 'A4', ratio: 1 / 1.414 },
  { label: 'Letter', ratio: 1 / 1.294 },
  { label: 'ID Card', ratio: 1.586 },
  { label: '1:1', ratio: 1 },
  { label: '4:3', ratio: 4 / 3 },
  { label: '16:9', ratio: 16 / 9 },
];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

export function CropTool({ imageSrc, onCrop, onCancel }: CropToolProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<CropRect | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [cropStart, setCropStart] = useState<CropRect | null>(null);
  const [activeRatio, setActiveRatio] = useState<{ label: string; ratio: number | null }>(ASPECT_RATIOS[0]);
  const [imgDisplaySize, setImgDisplaySize] = useState({ width: 0, height: 0 });

  // Track displayed image dimensions
  useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const updateSize = () => {
      setImgDisplaySize({ width: img.clientWidth, height: img.clientHeight });
    };
    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, []);

  const getEventPos = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const applyAspectRatio = useCallback((rect: CropRect, ratio: number | null): CropRect => {
    if (!ratio) return rect;
    let newW = rect.width;
    let newH = rect.width / ratio;
    if (newH > imgDisplaySize.height - rect.y) {
      newH = imgDisplaySize.height - rect.y;
      newW = newH * ratio;
    }
    if (rect.y + newH > imgDisplaySize.height) {
      newH = imgDisplaySize.height - rect.y;
      newW = newH * ratio;
    }
    if (rect.x + newW > imgDisplaySize.width) {
      newW = imgDisplaySize.width - rect.x;
      newH = newW / ratio;
    }
    return { ...rect, width: newW, height: newH };
  }, [imgDisplaySize]);

  // Start new crop selection
  const handlePointerDown = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (isResizing) return;
    const pos = getEventPos(e);
    setIsDragging(true);
    setDragStart(pos);
    setCropStart(null);
    setCrop({ x: pos.x, y: pos.y, width: 1, height: 1 });
  }, [getEventPos, isResizing]);

  const handlePointerMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!isDragging || !crop) return;
    const pos = getEventPos(e);
    
    let newCrop: CropRect = {
      x: Math.min(dragStart.x, pos.x),
      y: Math.min(dragStart.y, pos.y),
      width: Math.abs(pos.x - dragStart.x),
      height: Math.abs(pos.y - dragStart.y),
    };

    // Clamp to image bounds
    newCrop.x = clamp(newCrop.x, 0, imgDisplaySize.width);
    newCrop.y = clamp(newCrop.y, 0, imgDisplaySize.height);
    newCrop.width = clamp(newCrop.width, 0, imgDisplaySize.width - newCrop.x);
    newCrop.height = clamp(newCrop.height, 0, imgDisplaySize.height - newCrop.y);

    // Apply aspect ratio if active
    if (activeRatio.ratio) {
      newCrop = applyAspectRatio(newCrop, activeRatio.ratio);
    }

    setCrop(newCrop);
  }, [isDragging, crop, dragStart, getEventPos, imgDisplaySize, activeRatio, applyAspectRatio]);

  const handlePointerUp = useCallback(() => {
    if (isDragging && crop && cropStart === null) {
      // If crop is too small, remove it
      if (crop.width < 20 || crop.height < 20) {
        setCrop(null);
      } else {
        setCropStart({ ...crop });
      }
    }
    setIsDragging(false);
  }, [isDragging, crop, cropStart]);

  // Move entire crop
  const handleCropDragStart = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!crop) return;
    const pos = getEventPos(e);
    setIsDragging(true);
    setDragStart(pos);
    setCropStart({ ...crop });
  }, [crop, getEventPos]);

  // Resize handle
  const handleResizeStart = useCallback((handle: string) => (e: React.MouseEvent | React.TouchEvent) => {
    e.stopPropagation();
    if (!crop) return;
    const pos = getEventPos(e);
    setIsResizing(true);
    setResizeHandle(handle);
    setDragStart(pos);
    setCropStart({ ...crop });
  }, [crop, getEventPos]);

  useEffect(() => {
    if (!isResizing || !resizeHandle || !cropStart) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pos = { x: clientX - rect.left, y: clientY - rect.top };
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;

      let newCrop = { ...cropStart };

      if (resizeHandle.includes('e')) newCrop.width = clamp(cropStart.width + dx, 30, imgDisplaySize.width - newCrop.x);
      if (resizeHandle.includes('w')) { newCrop.x = clamp(cropStart.x + dx, 0, cropStart.x + cropStart.width - 30); newCrop.width = cropStart.x + cropStart.width - newCrop.x; }
      if (resizeHandle.includes('s')) newCrop.height = clamp(cropStart.height + dy, 30, imgDisplaySize.height - newCrop.y);
      if (resizeHandle.includes('n')) { newCrop.y = clamp(cropStart.y + dy, 0, cropStart.y + cropStart.height - 30); newCrop.height = cropStart.y + cropStart.height - newCrop.y; }

      if (activeRatio.ratio) {
        newCrop = applyAspectRatio(newCrop, activeRatio.ratio);
      }

      setCrop(newCrop);
    };

    const handleUp = () => {
      setIsResizing(false);
      setResizeHandle(null);
    };

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isResizing, resizeHandle, cropStart, dragStart, imgDisplaySize, activeRatio, applyAspectRatio]);

  // Crop move
  useEffect(() => {
    if (!isDragging || !cropStart || isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const pos = { x: clientX - rect.left, y: clientY - rect.top };
      const dx = pos.x - dragStart.x;
      const dy = pos.y - dragStart.y;

      setCrop({
        x: clamp(cropStart.x + dx, 0, imgDisplaySize.width - cropStart.width),
        y: clamp(cropStart.y + dy, 0, imgDisplaySize.height - cropStart.height),
        width: cropStart.width,
        height: cropStart.height,
      });
    };

    const handleUp = () => setIsDragging(false);

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('touchmove', handleMove);
    window.addEventListener('touchend', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging, cropStart, isResizing, dragStart, imgDisplaySize]);

  const applyCrop = useCallback(() => {
    if (!crop || !imgRef.current) return;

    const img = imgRef.current;
    const scaleX = img.naturalWidth / imgDisplaySize.width;
    const scaleY = img.naturalHeight / imgDisplaySize.height;

    const sx = Math.round(crop.x * scaleX);
    const sy = Math.round(crop.y * scaleY);
    const sw = Math.round(crop.width * scaleX);
    const sh = Math.round(crop.height * scaleY);

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

    const croppedDataUrl = canvas.toDataURL('image/jpeg', 0.92);
    onCrop(croppedDataUrl);
    toast.success('Image cropped');
  }, [crop, imgDisplaySize, onCrop]);

  const handleAutoDetect = useCallback(() => {
    // Auto-select a large area in the center (simulating document detection)
    const margin = 0.1; // 10% margin
    const autoCrop: CropRect = {
      x: imgDisplaySize.width * margin,
      y: imgDisplaySize.height * margin,
      width: imgDisplaySize.width * (1 - 2 * margin),
      height: imgDisplaySize.height * (1 - 2 * margin),
    };
    setCrop(autoCrop);
    setCropStart({ ...autoCrop });
  }, [imgDisplaySize]);

  const handles = crop ? [
    { id: 'nw', style: { top: -6, left: -6, cursor: 'nw-resize' } },
    { id: 'n', style: { top: -6, left: '50%', transform: 'translateX(-50%)', cursor: 'n-resize' } },
    { id: 'ne', style: { top: -6, right: -6, cursor: 'ne-resize' } },
    { id: 'e', style: { top: '50%', right: -6, transform: 'translateY(-50%)', cursor: 'e-resize' } },
    { id: 'se', style: { bottom: -6, right: -6, cursor: 'se-resize' } },
    { id: 's', style: { bottom: -6, left: '50%', transform: 'translateX(-50%)', cursor: 's-resize' } },
    { id: 'sw', style: { bottom: -6, left: -6, cursor: 'sw-resize' } },
    { id: 'w', style: { top: '50%', left: -6, transform: 'translateY(-50%)', cursor: 'w-resize' } },
  ] : [];

  return (
    <div className="flex flex-col gap-3">
      {/* Crop toolbar */}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-2">
        <div className="flex items-center gap-1 overflow-x-auto pb-1">
          {ASPECT_RATIOS.map((ar) => (
            <button
              key={ar.label}
              onClick={() => setActiveRatio(ar)}
              className={`shrink-0 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                activeRatio.label === ar.label
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-background text-muted-foreground hover:bg-background/80'
              }`}
            >
              {ar.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleAutoDetect}
            className="h-8 rounded-lg gap-1.5 text-xs"
          >
            <Ratio className="h-3.5 w-3.5" />
            Auto
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onCancel}
            className="h-8 w-8 rounded-lg p-0"
          >
            <X className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={applyCrop}
            disabled={!crop || crop.width < 20 || crop.height < 20}
            className="h-8 w-8 rounded-lg p-0 text-primary"
          >
            <Check className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Crop area */}
      <div
        ref={containerRef}
        className="relative overflow-hidden rounded-2xl bg-muted/30 border border-border/50 select-none touch-none"
        onMouseDown={crop ? undefined : handlePointerDown}
        onTouchStart={crop ? undefined : handlePointerDown}
        onMouseUp={handlePointerUp}
        onTouchEnd={handlePointerUp}
        style={{ cursor: crop ? 'default' : 'crosshair' }}
      >
        <img
          ref={imgRef}
          src={imageSrc}
          alt="Crop"
          className="w-full h-auto max-h-[60vh] object-contain"
          draggable={false}
        />

        {/* Dark overlay */}
        {crop && (
          <>
            {/* Top */}
            <div className="absolute top-0 left-0 right-0 bg-black/40" style={{ height: crop.y }} />
            {/* Bottom */}
            <div className="absolute left-0 right-0 bg-black/40" style={{ top: crop.y + crop.height, bottom: 0 }} />
            {/* Left */}
            <div className="absolute top-0 left-0 bg-black/40" style={{ top: crop.y, width: crop.x, height: crop.height }} />
            {/* Right */}
            <div className="absolute top-0 bg-black/40" style={{ top: crop.y, left: crop.x + crop.width, right: 0, height: crop.height }} />

            {/* Crop box */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute border-2 border-white shadow-lg"
              style={{
                top: crop.y,
                left: crop.x,
                width: crop.width,
                height: crop.height,
              }}
              onMouseDown={handleCropDragStart}
              onTouchStart={handleCropDragStart}
            >
              {/* Grid lines (rule of thirds) */}
              <div className="absolute inset-0">
                <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/30" />
                <div className="absolute top-1/3 left-0 right-0 h-px bg-white/30" />
                <div className="absolute top-2/3 left-0 right-0 h-px bg-white/30" />
              </div>

              {/* Corner handles */}
              {handles.map((h) => (
                <div
                  key={h.id}
                  className="absolute h-3 w-3 bg-white rounded-sm border border-black/20 shadow-sm"
                  style={h.style as React.CSSProperties}
                  onMouseDown={handleResizeStart(h.id)}
                  onTouchStart={handleResizeStart(h.id)}
                />
              ))}

              {/* Size label */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 rounded bg-black/70 px-1.5 py-0.5 text-[10px] text-white whitespace-nowrap font-mono">
                {Math.round(crop.width)} × {Math.round(crop.height)}
              </div>
            </motion.div>
          </>
        )}

        {/* Hint when no crop */}
        {!crop && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="rounded-xl bg-black/50 px-4 py-2 text-sm text-white font-medium">
              Draw a rectangle to crop
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
