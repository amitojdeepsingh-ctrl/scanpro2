'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAppStore } from '@/lib/store';
import { ExportQuality, PageSize } from '@/lib/types';
import { generatePDF, downloadBlob } from '@/lib/pdf-generation';
import { toast } from 'sonner';

interface ExportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ExportDialog({ open, onOpenChange }: ExportDialogProps) {
  const {
    currentDocumentId,
    documents,
    exportQuality,
    exportPageSize,
    setExportQuality,
    setExportPageSize,
    setProcessing,
    isProcessing,
  } = useAppStore();

  const [isExporting, setIsExporting] = useState(false);

  const currentDoc = documents.find((d) => d.id === currentDocumentId);

  const handleExport = useCallback(async () => {
    if (!currentDoc) return;
    setIsExporting(true);
    setProcessing(true, 0, 'Generating PDF...');
    try {
      const blob = await generatePDF(currentDoc, exportQuality, exportPageSize);
      downloadBlob(blob, `${currentDoc.name}.pdf`);
      toast.success('PDF exported successfully');
      onOpenChange(false);
    } catch {
      toast.error('Failed to export PDF');
    } finally {
      setIsExporting(false);
      setProcessing(false);
    }
  }, [currentDoc, exportQuality, exportPageSize, setProcessing, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export PDF</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-2">
          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Quality</label>
            <Select
              value={exportQuality}
              onValueChange={(v) => setExportQuality(v as ExportQuality)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft (Smaller file)</SelectItem>
                <SelectItem value="standard">Standard (Balanced)</SelectItem>
                <SelectItem value="high">High (Best quality)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-sm font-medium text-foreground">Page Size</label>
            <Select
              value={exportPageSize}
              onValueChange={(v) => setExportPageSize(v as PageSize)}
            >
              <SelectTrigger className="rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a4">A4 (210 × 297 mm)</SelectItem>
                <SelectItem value="letter">Letter (8.5 × 11 in)</SelectItem>
                <SelectItem value="original">Original Size</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {currentDoc && (
            <div className="rounded-xl bg-muted/50 p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Pages</span>
                <span className="font-medium">{currentDoc.pages.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-1">
                <span className="text-muted-foreground">Document</span>
                <span className="font-medium truncate ml-4">{currentDoc.name}</span>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-xl"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || !currentDoc}
            className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isExporting ? 'Exporting...' : 'Export PDF'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
