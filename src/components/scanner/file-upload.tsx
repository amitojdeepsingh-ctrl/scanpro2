'use client';

import { useCallback, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ImageIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { estimateBase64Size } from '@/lib/image-processing';

export function FileUpload() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const { addDocument, setCurrentDocument, setCurrentPageIndex, resetEditor, setView } = useAppStore();

  const processFile = useCallback(
    async (file: File) => {
      if (!file.type.startsWith('image/')) {
        return;
      }

      return new Promise<void>((resolve) => {
        const reader = new FileReader();
        reader.onload = async (e) => {
          const imageData = e.target?.result as string;
          if (!imageData) {
            resolve();
            return;
          }

          const docName = file.name.replace(/\.[^/.]+$/, '') || `Scan_${Date.now()}`;
          const docId = crypto.randomUUID();
          const pageId = crypto.randomUUID();

          addDocument({
            id: docId,
            name: docName,
            pages: [
              {
                id: pageId,
                originalImage: imageData,
                processedImage: imageData,
                filter: 'original',
                brightness: 100,
                contrast: 100,
                sharpness: 0,
                rotation: 0,
              },
            ],
            createdAt: new Date().toISOString(),
            thumbnail: imageData,
            fileSize: estimateBase64Size(imageData),
          });

          resetEditor();
          setCurrentDocument(docId);
          setCurrentPageIndex(0);
          setView('editor');
          resolve();
        };
        reader.readAsDataURL(file);
      });
    },
    [addDocument, setCurrentDocument, setCurrentPageIndex, resetEditor, setView]
  );

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        if (file.type.startsWith('image/')) {
          await processFile(file);
        }
      }
    },
    [processFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      handleFiles(e.dataTransfer.files);
    },
    [handleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <div
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      className={`relative flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-8 transition-all ${
        isDragging
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-border hover:border-primary/50 hover:bg-muted/30'
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => e.target.files && handleFiles(e.target.files)}
      />

      <motion.div
        animate={isDragging ? { scale: 1.1, y: -5 } : { scale: 1, y: 0 }}
        className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10"
      >
        <Upload className={`h-7 w-7 transition-colors ${isDragging ? 'text-primary' : 'text-primary/60'}`} />
      </motion.div>

      <div className="text-center">
        <p className="font-semibold text-foreground">
          {isDragging ? 'Drop your images here' : 'Drag & drop images'}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          or click to browse files
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2">
        {['JPG', 'PNG', 'WebP'].map((fmt) => (
          <span
            key={fmt}
            className="rounded-lg bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          >
            {fmt}
          </span>
        ))}
      </div>

      <Button
        variant="default"
        className="rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
        onClick={() => fileInputRef.current?.click()}
      >
        <ImageIcon className="mr-2 h-4 w-4" />
        Browse Images
      </Button>
    </div>
  );
}
