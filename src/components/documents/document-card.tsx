'use client';

import { useCallback, useState } from 'react';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import {
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  Download,
  FileText,
} from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { ScannedDocument } from '@/lib/types';
import { useAppStore } from '@/lib/store';
import { formatFileSize } from '@/lib/image-processing';
import { generatePDF, downloadBlob } from '@/lib/pdf-generation';
import { toast } from 'sonner';

interface DocumentCardProps {
  doc: ScannedDocument;
}

export function DocumentCard({ doc }: DocumentCardProps) {
  const {
    removeDocument,
    duplicateDocument,
    setCurrentDocument,
    setCurrentPageIndex,
    setView,
    resetEditor,
    selectedDocumentIds,
    toggleDocumentSelection,
    exportQuality,
    exportPageSize,
    setProcessing,
    isProcessing,
  } = useAppStore();

  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(doc.name);

  const isSelected = selectedDocumentIds.includes(doc.id);

  const handleOpen = useCallback(() => {
    resetEditor();
    setCurrentDocument(doc.id);
    setCurrentPageIndex(0);
    setView('editor');
  }, [doc.id, resetEditor, setCurrentDocument, setCurrentPageIndex, setView]);

  const handleDelete = useCallback(() => {
    removeDocument(doc.id);
    toast.success('Document deleted');
  }, [doc.id, removeDocument]);

  const handleDuplicate = useCallback(() => {
    duplicateDocument(doc.id);
    toast.success('Document duplicated');
  }, [doc.id, duplicateDocument]);

  const handleRename = useCallback(() => {
    if (newName.trim()) {
      useAppStore.getState().updateDocument(doc.id, { name: newName.trim() });
      setRenameOpen(false);
      toast.success('Document renamed');
    }
  }, [doc.id, newName]);

  const handleExport = useCallback(async () => {
    setProcessing(true, 0, 'Exporting PDF...');
    try {
      const blob = await generatePDF(doc, exportQuality, exportPageSize);
      downloadBlob(blob, `${doc.name}.pdf`);
      toast.success('PDF exported');
    } catch {
      toast.error('Export failed');
    } finally {
      setProcessing(false);
    }
  }, [doc, exportQuality, exportPageSize, setProcessing]);

  const formattedDate = format(new Date(doc.createdAt), 'MMM d, yyyy');
  const pageCount = doc.pages.length;

  return (
    <>
      <motion.div
        whileHover={{ y: -4, scale: 1.01 }}
        transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      >
        <Card className="group overflow-hidden border-border/50 bg-card hover:shadow-lg hover:shadow-primary/5 transition-all cursor-pointer">
          {/* Thumbnail */}
          <div
            className="relative aspect-[3/4] overflow-hidden bg-muted/30"
            onClick={handleOpen}
          >
            <img
              src={doc.thumbnail || doc.pages[0]?.processedImage || doc.pages[0]?.originalImage}
              alt={doc.name}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />

            {/* Page count badge */}
            <div className="absolute top-2 right-2 flex items-center gap-1 rounded-lg bg-black/60 px-2 py-1 backdrop-blur-sm">
              <FileText className="h-3 w-3 text-white" />
              <span className="text-[10px] font-semibold text-white">{pageCount}</span>
            </div>

            {/* Selection checkbox */}
            <div
              className="absolute top-2 left-2"
              onClick={(e) => {
                e.stopPropagation();
                toggleDocumentSelection(doc.id);
              }}
            >
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-md border-2 transition-colors ${
                  isSelected
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-white/60 bg-black/30 text-transparent hover:border-white'
                }`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            {/* Hover overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>

          {/* Info */}
          <div className="p-3">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h3
                  className="truncate text-sm font-semibold text-foreground"
                  onClick={handleOpen}
                >
                  {doc.name}
                </h3>
                <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formattedDate}</span>
                  <span className="text-border">·</span>
                  <span>{formatFileSize(doc.fileSize)}</span>
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreVertical className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44">
                  <DropdownMenuItem onClick={handleOpen}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Rename
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleExport}>
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleDelete}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename Document</DialogTitle>
          </DialogHeader>
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            placeholder="Document name"
            className="rounded-xl"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} className="rounded-xl">
              Cancel
            </Button>
            <Button onClick={handleRename} className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90">
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
