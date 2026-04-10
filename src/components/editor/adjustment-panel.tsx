'use client';

import { useCallback } from 'react';
import { Sun, Contrast, Zap, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { useAppStore } from '@/lib/store';
import { autoEnhance, applyFilter } from '@/lib/image-processing';

export function AdjustmentPanel() {
  const {
    brightness,
    contrast,
    sharpness,
    setBrightness,
    setContrast,
    setSharpness,
    currentDocumentId,
    currentPageIndex,
    documents,
    updatePage,
    setProcessing,
    isProcessing,
  } = useAppStore();

  const currentDoc = documents.find(d => d.id === currentDocumentId);
  const currentPage = currentDoc?.pages[currentPageIndex];

  const handleAutoEnhance = useCallback(async () => {
    if (!currentPage || !currentDocumentId || isProcessing) return;
    
    setProcessing(true, 0, 'Analyzing image...');
    
    try {
      const { brightness: newB, contrast: newC } = await autoEnhance(currentPage.originalImage);
      setBrightness(newB);
      setContrast(newC);

      const processedImage = await applyFilter(
        currentPage.originalImage,
        'original',
        newB,
        newC,
        0,
        currentPage.rotation
      );
      updatePage(currentDocumentId, currentPageIndex, {
        processedImage,
        brightness: newB,
        contrast: newC,
        filter: 'original',
      });
      toast.success('Image enhanced automatically');
    } catch {
      toast.error('Failed to enhance image');
    } finally {
      setProcessing(false);
    }
  }, [currentPage, currentDocumentId, currentPageIndex, isProcessing, setBrightness, setContrast, updatePage, setProcessing]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Adjustments</h3>
        <Button
          variant="outline"
          size="sm"
          onClick={handleAutoEnhance}
          disabled={isProcessing}
          className="h-7 rounded-lg text-xs bg-primary/5 border-primary/20 hover:bg-primary/10"
        >
          <Sparkles className="mr-1.5 h-3 w-3" />
          Auto
        </Button>
      </div>

      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Sun className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <Slider
              value={[brightness]}
              onValueChange={([v]) => setBrightness(v)}
              min={50}
              max={150}
              step={1}
              className="w-full"
            />
          </div>
          <span className="w-10 text-right text-xs font-mono text-muted-foreground">{brightness}%</span>
        </div>

        <div className="flex items-center gap-3">
          <Contrast className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <Slider
              value={[contrast]}
              onValueChange={([v]) => setContrast(v)}
              min={50}
              max={200}
              step={1}
              className="w-full"
            />
          </div>
          <span className="w-10 text-right text-xs font-mono text-muted-foreground">{contrast}%</span>
        </div>

        <div className="flex items-center gap-3">
          <Zap className="h-4 w-4 text-muted-foreground shrink-0" />
          <div className="flex-1">
            <Slider
              value={[sharpness]}
              onValueChange={([v]) => setSharpness(v)}
              min={0}
              max={50}
              step={1}
              className="w-full"
            />
          </div>
          <span className="w-10 text-right text-xs font-mono text-muted-foreground">{sharpness}</span>
        </div>
      </div>
    </div>
  );
}
