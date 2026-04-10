'use client';

import { useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Copy, RotateCcw, Sparkles, ScanLine, Shield, Zap } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { useAppStore } from '@/lib/store';
import { indexedDB } from '@/lib/indexed-db';

import { AppHeader } from '@/components/layout/app-header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { CameraView } from '@/components/scanner/camera-view';
import { FileUpload } from '@/components/scanner/file-upload';
import { ImageEditor } from '@/components/editor/image-editor';
import { DocumentGrid } from '@/components/documents/document-grid';
import { ProgressOverlay } from '@/components/ui/progress-overlay';
import { toast } from 'sonner';

export default function HomePage() {
  const store = useAppStore();
  const {
    view,
    documents,
    setDocuments,
    isProcessing,
    processingProgress,
    processingMessage,
    currentDocumentId,
    currentPageIndex,
    updatePage,
    setProcessing,
    setView,
    ocrText,
    setOcrText,
  } = store;

  // Load documents from IndexedDB on mount
  useEffect(() => {
    if (indexedDB.isAvailable()) {
      indexedDB.getAll().then((docs) => {
        if (docs.length > 0) {
          setDocuments(docs);
        }
      }).catch(() => {
        // IndexedDB not available, that's ok
      });
    }
  }, [setDocuments]);

  // Save documents to IndexedDB when they change
  useEffect(() => {
    if (documents.length > 0 && indexedDB.isAvailable()) {
      for (const doc of documents) {
        indexedDB.put(doc).catch(() => {});
      }
    }
  }, [documents]);

  // OCR
  const runOCR = useCallback(async () => {
    if (!currentDocumentId) return;
    const doc = documents.find(d => d.id === currentDocumentId);
    if (!doc) return;
    const page = doc.pages[currentPageIndex];
    if (!page) return;

    setProcessing(true, 0, 'Initializing OCR...');

    try {
      const Tesseract = await import('tesseract.js');
      
      const result = await Tesseract.recognize(
        page.processedImage || page.originalImage,
        'eng',
        {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setProcessing(true, Math.round(m.progress * 100), 'Recognizing text...');
            } else if (m.status === 'loading language traineddata') {
              setProcessing(true, Math.round(m.progress * 50), 'Loading language data...');
            } else {
              setProcessing(true, 0, m.status || 'Processing...');
            }
          },
        }
      );

      const extractedText = result.data.text.trim();
      setOcrText(extractedText);
      updatePage(currentDocumentId, currentPageIndex, { ocrText: extractedText });
      setProcessing(false);
      toast.success('Text extracted successfully');
    } catch (err) {
      setProcessing(false);
      toast.error('OCR failed. Please try again.');
    }
  }, [currentDocumentId, currentPageIndex, documents, updatePage, setOcrText, setProcessing]);

  // Auto-run OCR when entering OCR view
  useEffect(() => {
    if (view === 'ocr') {
      const doc = documents.find(d => d.id === currentDocumentId);
      const page = doc?.pages[currentPageIndex];
      if (page && !page.ocrText && !ocrText) {
        runOCR();
      } else if (page?.ocrText) {
        setOcrText(page.ocrText);
      }
    }
  }, [view, runOCR]);

  const handleCopyText = useCallback(() => {
    if (!ocrText) return;
    navigator.clipboard.writeText(ocrText).then(() => {
      toast.success('Text copied to clipboard');
    }).catch(() => {
      toast.error('Failed to copy text');
    });
  }, [ocrText]);

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  return (
    <div className="min-h-screen flex flex-col">
      <AppHeader />

      <main className="flex-1 pb-20 sm:pb-4">
        <div className="mx-auto max-w-5xl px-4 py-4 sm:py-6">
          <AnimatePresence mode="wait">
            {/* HOME VIEW */}
            {view === 'home' && (
              <motion.div
                key="home"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-6"
              >
                {/* Hero */}
                <div className="text-center">
                  <motion.h1
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.1 }}
                    className="text-3xl sm:text-4xl font-bold tracking-tight"
                  >
                    <span className="gradient-text">Scan</span>
                    <span className="text-foreground"> Anything</span>
                  </motion.h1>
                  <motion.p
                    initial={{ y: 10, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mt-2 text-muted-foreground"
                  >
                    Professional document scanning with intelligent enhancement
                  </motion.p>
                </div>

                {/* Main Scan Area */}
                <div className="flex flex-col items-center gap-6">
                  {/* Camera View */}
                  <CameraView />

                  {/* Divider */}
                  <div className="flex w-full max-w-md items-center gap-3">
                    <div className="flex-1 h-px bg-border" />
                    <span className="text-xs font-medium text-muted-foreground">or</span>
                    <div className="flex-1 h-px bg-border" />
                  </div>

                  {/* File Upload */}
                  <div className="w-full max-w-md">
                    <FileUpload />
                  </div>
                </div>

                {/* Recent Documents */}
                {documents.length > 0 && (
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.3 }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <h2 className="text-lg font-semibold text-foreground">Recent Scans</h2>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setView('documents')}
                        className="text-xs rounded-lg"
                      >
                        View All
                      </Button>
                    </div>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {documents.slice(0, 6).map((doc) => (
                        <button
                          key={doc.id}
                          onClick={() => {
                            store.resetEditor();
                            store.setCurrentDocument(doc.id);
                            store.setCurrentPageIndex(0);
                            store.setView('editor');
                          }}
                          className="shrink-0 w-32 sm:w-40 rounded-xl border border-border/50 bg-card overflow-hidden hover:shadow-md transition-all group"
                        >
                          <div className="aspect-[3/4] overflow-hidden">
                            <img
                              src={doc.thumbnail || doc.pages[0]?.processedImage || doc.pages[0]?.originalImage}
                              alt={doc.name}
                              className="w-full h-full object-cover transition-transform group-hover:scale-105"
                            />
                          </div>
                          <div className="p-2">
                            <p className="truncate text-xs font-medium text-foreground">{doc.name}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {doc.pages.length} page{doc.pages.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Feature Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
                  {[
                    {
                      icon: <Sparkles className="h-5 w-5" />,
                      title: 'Smart Enhancement',
                      desc: 'Auto-adjust brightness, contrast, and sharpness',
                    },
                    {
                      icon: <Shield className="h-5 w-5" />,
                      title: 'Text Recognition',
                      desc: 'Extract text from scanned documents with OCR',
                    },
                    {
                      icon: <Zap className="h-5 w-5" />,
                      title: 'PDF Export',
                      desc: 'Convert scans to professional PDF documents',
                    },
                  ].map((feature) => (
                    <Card
                      key={feature.title}
                      className="flex items-start gap-3 p-4 border-border/50 bg-card/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                        {feature.icon}
                      </div>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{feature.title}</h3>
                        <p className="text-xs text-muted-foreground mt-0.5">{feature.desc}</p>
                      </div>
                    </Card>
                  ))}
                </div>
              </motion.div>
            )}

            {/* EDITOR VIEW */}
            {view === 'editor' && (
              <motion.div
                key="editor"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <ImageEditor />
              </motion.div>
            )}

            {/* DOCUMENTS VIEW */}
            {view === 'documents' && (
              <motion.div
                key="documents"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
              >
                <div className="mb-4">
                  <h1 className="text-2xl font-bold tracking-tight text-foreground">My Documents</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    Manage your scanned documents
                  </p>
                </div>
                <DocumentGrid />
              </motion.div>
            )}

            {/* OCR VIEW */}
            {view === 'ocr' && (
              <motion.div
                key="ocr"
                variants={pageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.2 }}
                className="flex flex-col gap-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Text Recognition</h1>
                    <p className="text-sm text-muted-foreground mt-1">
                      Extracted text from your document
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={runOCR}
                      disabled={isProcessing}
                      className="rounded-lg gap-1.5"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      Re-scan
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyText}
                      disabled={!ocrText}
                      className="rounded-lg gap-1.5"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      Copy
                    </Button>
                  </div>
                </div>

                {ocrText ? (
                  <Textarea
                    value={ocrText}
                    onChange={(e) => setOcrText(e.target.value)}
                    className="min-h-[300px] rounded-xl font-mono text-sm resize-y"
                    placeholder="Extracted text will appear here..."
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 rounded-xl border border-dashed border-border bg-muted/20">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
                      <ScanLine className="h-8 w-8 text-muted-foreground/50" />
                    </div>
                    <p className="text-sm text-muted-foreground">No text extracted yet</p>
                    <Button
                      variant="outline"
                      onClick={runOCR}
                      disabled={isProcessing}
                      className="mt-4 rounded-xl"
                    >
                      Run OCR
                    </Button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <MobileNav />

      {/* Processing overlay */}
      <AnimatePresence>
        {isProcessing && (
          <ProgressOverlay
            progress={processingProgress}
            message={processingMessage}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
