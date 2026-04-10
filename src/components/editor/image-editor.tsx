'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  RotateCw,
  RotateCcw,
  Crop,
  Download,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Eye,
  FileText,
  Check,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAppStore } from '@/lib/store';
import { applyFilter, autoEnhance, buildCSSFilterString } from '@/lib/image-processing';
import { generatePDF, downloadBlob, generateSinglePagePDF } from '@/lib/pdf-generation';
import { indexedDB } from '@/lib/indexed-db';
import { toast } from 'sonner';
import { FilterPanel } from './filter-panel';
import { AdjustmentPanel } from './adjustment-panel';
import { CropTool } from './crop-tool';

export function ImageEditor() {
  const {
    documents,
    currentDocumentId,
    currentPageIndex,
    setCurrentPageIndex,
    activeFilter,
    brightness,
    contrast,
    sharpness,
    rotation,
    setActiveFilter,
    setBrightness,
    setContrast,
    setSharpness,
    setRotation,
    resetEditor,
    setView,
    setProcessing,
    isProcessing,
    updatePage,
    addPage,
    removePage,
    addDocument,
    reorderPages,
    setCurrentDocument,
  } = useAppStore();

  const [showOriginal, setShowOriginal] = useState(false);
  const [showCrop, setShowCrop] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const compareRef = useRef<HTMLDivElement>(null);

  const currentDoc = documents.find(d => d.id === currentDocumentId);
  const currentPage = currentDoc?.pages[currentPageIndex];

  // Debounced apply filter
  const applyTimerRef = useRef<NodeJS.Timeout>();
  
  const applyCurrentSettings = useCallback(async () => {
    if (!currentPage || !currentDocumentId || isProcessing) return;

    // Skip if nothing changed from last saved state
    if (
      activeFilter === currentPage.filter &&
      brightness === currentPage.brightness &&
      contrast === currentPage.contrast &&
      sharpness === currentPage.sharpness &&
      rotation === currentPage.rotation
    ) {
      return;
    }

    if (applyTimerRef.current) clearTimeout(applyTimerRef.current);

    applyTimerRef.current = setTimeout(async () => {
      setProcessing(true, 0, 'Applying filters...');
      try {
        const processedImage = await applyFilter(
          currentPage.originalImage,
          activeFilter,
          brightness,
          contrast,
          sharpness,
          rotation
        );
        updatePage(currentDocumentId, currentPageIndex, {
          processedImage,
          filter: activeFilter,
          brightness,
          contrast,
          sharpness,
          rotation,
        });
      } catch {
        toast.error('Failed to apply filter');
      } finally {
        setProcessing(false);
      }
    }, 300);
  }, [currentPage, currentDocumentId, currentPageIndex, activeFilter, brightness, contrast, sharpness, rotation, isProcessing, updatePage, setProcessing]);

  useEffect(() => {
    applyCurrentSettings();
  }, [activeFilter, brightness, contrast, sharpness, rotation, applyCurrentSettings]);

  const handleAddPage = useCallback(() => {
    if (!currentDocumentId) return;
    fileInputRef.current?.click();
  }, [currentDocumentId]);

  const handleFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !currentDocumentId) return;

    for (const file of Array.from(files)) {
      if (!file.type.startsWith('image/')) continue;
      const imageData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(file);
      });
      
      addPage(currentDocumentId, {
        id: crypto.randomUUID(),
        originalImage: imageData,
        processedImage: imageData,
        filter: 'original',
        brightness: 100,
        contrast: 100,
        sharpness: 0,
        rotation: 0,
      });
    }

    if (e.target) e.target.value = '';
  }, [currentDocumentId, addPage]);

  const handleRemovePage = useCallback(() => {
    if (!currentDocumentId || !currentDoc || currentDoc.pages.length <= 1) {
      toast.error('Cannot remove the last page');
      return;
    }
    removePage(currentDocumentId, currentPageIndex);
  }, [currentDocumentId, currentDoc, currentPageIndex, removePage]);

  const handleExportPDF = useCallback(async () => {
    if (!currentDoc) return;
    setProcessing(true, 0, 'Generating PDF...');
    try {
      const blob = await generatePDF(currentDoc);
      downloadBlob(blob, `${currentDoc.name}.pdf`);
      toast.success('PDF exported successfully');
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setProcessing(false);
    }
  }, [currentDoc, setProcessing]);

  const handleRunOCR = useCallback(() => {
    setView('ocr');
  }, [setView]);

  const handleSave = useCallback(async () => {
    if (!currentDoc) return;
    try {
      await indexedDB.put(currentDoc);
      toast.success('Document saved');
    } catch {
      toast.error('Failed to save document');
    }
  }, [currentDoc]);

  const handleCrop = useCallback(async (croppedImage: string) => {
    if (!currentPage || !currentDocumentId) return;
    // Update both original and processed with cropped image, reset filters
    updatePage(currentDocumentId, currentPageIndex, {
      originalImage: croppedImage,
      processedImage: croppedImage,
      filter: 'original',
      brightness: 100,
      contrast: 100,
      sharpness: 0,
      rotation: 0,
    });
    setShowCrop(false);
    resetEditor();
  }, [currentPage, currentDocumentId, updatePage, resetEditor]);

  // Compare slider handler
  const handleCompareMove = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (!compareRef.current) return;
    const rect = compareRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const pos = ((clientX - rect.left) / rect.width) * 100;
    setComparePosition(Math.max(0, Math.min(100, pos)));
  }, []);

  const filterCSS = buildCSSFilterString(activeFilter, brightness, contrast, sharpness);

  if (!currentDoc || !currentPage) {
    return (
      <div className="flex items-center justify-center p-12">
        <p className="text-muted-foreground">No document selected</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelected}
      />

      {/* Top toolbar */}
      <div className="flex items-center justify-between rounded-xl bg-muted/50 p-2">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRotation(-90)}
            className="h-8 w-8 rounded-lg"
            title="Rotate Left"
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setRotation(90)}
            className="h-8 w-8 rounded-lg"
            title="Rotate Right"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <Button
            variant={showCrop ? 'default' : 'ghost'}
            size="icon"
            onClick={() => setShowCrop(!showCrop)}
            className={`h-8 w-8 rounded-lg ${showCrop ? 'bg-primary text-primary-foreground' : ''}`}
            title="Crop"
          >
            <Crop className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowOriginal(!showOriginal)}
            className="h-8 rounded-lg gap-1.5"
          >
            <Eye className="h-3.5 w-3.5" />
            {showOriginal ? 'Original' : 'Processed'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRunOCR}
            className="h-8 rounded-lg gap-1.5"
          >
            <FileText className="h-3.5 w-3.5" />
            OCR
          </Button>
        </div>
      </div>

      {/* Main editor area */}
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Image preview */}
        <div className="flex-1 min-w-0">
          <div
            ref={compareRef}
            className="relative overflow-hidden rounded-2xl bg-muted/30 border border-border/50 cursor-col-resize"
            onMouseMove={showOriginal && !showCrop ? handleCompareMove : undefined}
            onTouchMove={showOriginal && !showCrop ? handleCompareMove : undefined}
          >
            {showCrop ? (
              <CropTool
                imageSrc={currentPage.processedImage}
                onCrop={handleCrop}
                onCancel={() => setShowCrop(false)}
              />
            ) : showOriginal ? (
              <>
                {/* Original (full) */}
                <img
                  src={currentPage.originalImage}
                  alt="Original"
                  className="w-full h-auto max-h-[60vh] object-contain"
                />
                {/* Processed (clipped) */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{ width: `${comparePosition}%` }}
                >
                  <img
                    src={currentPage.processedImage}
                    alt="Processed"
                    className="h-full object-contain"
                    style={{
                      width: compareRef.current ? `${compareRef.current.offsetWidth}px` : '100%',
                      maxWidth: 'none',
                    }}
                  />
                </div>
                {/* Slider line */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg"
                  style={{ left: `${comparePosition}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-md">
                    <ChevronLeft className="h-3 w-3 text-gray-600 -mr-0.5" />
                    <ChevronRight className="h-3 w-3 text-gray-600 -ml-0.5" />
                  </div>
                </div>
                {/* Labels */}
                <div className="absolute top-3 left-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white">
                  Processed
                </div>
                <div className="absolute top-3 right-3 rounded-lg bg-black/60 px-2 py-1 text-xs font-medium text-white">
                  Original
                </div>
              </>
            ) : (
              <img
                src={currentPage.processedImage}
                alt="Processed"
                className="w-full h-auto max-h-[60vh] object-contain"
              />
            )}
          </div>

          {/* Page navigation */}
          {currentDoc.pages.length > 1 && (
            <div className="flex items-center justify-center gap-2 mt-3">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPageIndex(Math.max(0, currentPageIndex - 1))}
                disabled={currentPageIndex === 0}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium text-muted-foreground">
                {currentPageIndex + 1} / {currentDoc.pages.length}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={() => setCurrentPageIndex(Math.min(currentDoc.pages.length - 1, currentPageIndex + 1))}
                disabled={currentPageIndex === currentDoc.pages.length - 1}
                className="h-8 w-8 rounded-lg"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Page thumbnails */}
          {currentDoc.pages.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-2">
              {currentDoc.pages.map((page, idx) => (
                <button
                  key={page.id}
                  onClick={() => setCurrentPageIndex(idx)}
                  className={`relative shrink-0 w-16 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                    idx === currentPageIndex
                      ? 'border-primary ring-2 ring-primary/30'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <img
                    src={page.processedImage || page.originalImage}
                    alt={`Page ${idx + 1}`}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-center">
                    <span className="text-[9px] text-white font-medium">{idx + 1}</span>
                  </div>
                </button>
              ))}
              <button
                onClick={handleAddPage}
                className="shrink-0 w-16 h-20 rounded-lg border-2 border-dashed border-border hover:border-primary/50 flex items-center justify-center transition-colors"
              >
                <Plus className="h-5 w-5 text-muted-foreground" />
              </button>
            </div>
          )}
        </div>

        {/* Right panel - Tools */}
        <div className="lg:w-72 flex flex-col gap-4">
          <FilterPanel />
          <AdjustmentPanel />

          {/* Action buttons */}
          <div className="flex flex-col gap-2 mt-2">
            <Button
              onClick={handleExportPDF}
              className="w-full rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isProcessing}
            >
              <Download className="mr-2 h-4 w-4" />
              Export PDF
            </Button>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handleAddPage}
                className="flex-1 rounded-xl"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Add Page
              </Button>
              <Button
                variant="outline"
                onClick={handleRemovePage}
                disabled={currentDoc.pages.length <= 1}
                className="h-9 w-9 rounded-xl p-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
            <Button
              variant="outline"
              onClick={handleSave}
              className="w-full rounded-xl"
            >
              <Check className="mr-2 h-4 w-4" />
              Save Document
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
