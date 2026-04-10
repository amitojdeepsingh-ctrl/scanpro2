'use client';

import { useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Search, SortAsc, SortDesc, Trash2, Download, FileText, X, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useAppStore } from '@/lib/store';
import { DocumentCard } from './document-card';
import { generatePDF, downloadBlob } from '@/lib/pdf-generation';
import { indexedDB } from '@/lib/indexed-db';
import { toast } from 'sonner';

export function DocumentGrid() {
  const {
    documents,
    searchQuery,
    setSearchQuery,
    sortBy,
    sortOrder,
    setSortBy,
    setSortOrder,
    selectedDocumentIds,
    clearSelection,
    removeDocuments,
    setProcessing,
    isProcessing,
    exportQuality,
    exportPageSize,
    setView,
  } = useAppStore();

  const filteredDocs = useMemo(() => {
    let docs = [...documents];

    // Filter by search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          new Date(d.createdAt).toLocaleDateString().toLowerCase().includes(q)
      );
    }

    // Sort
    docs.sort((a, b) => {
      let cmp = 0;
      switch (sortBy) {
        case 'date':
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'size':
          cmp = a.fileSize - b.fileSize;
          break;
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    return docs;
  }, [documents, searchQuery, sortBy, sortOrder]);

  const handleBatchDelete = useCallback(async () => {
    if (selectedDocumentIds.length === 0) return;
    try {
      for (const id of selectedDocumentIds) {
        await indexedDB.delete(id);
      }
      removeDocuments(selectedDocumentIds);
      toast.success(`Deleted ${selectedDocumentIds.length} documents`);
    } catch {
      toast.error('Failed to delete documents');
    }
  }, [selectedDocumentIds, removeDocuments]);

  const handleBatchExport = useCallback(async () => {
    if (selectedDocumentIds.length === 0) return;
    setProcessing(true, 0, 'Exporting documents...');
    try {
      for (const id of selectedDocumentIds) {
        const doc = documents.find(d => d.id === id);
        if (!doc) continue;
        const blob = await generatePDF(doc, exportQuality, exportPageSize);
        downloadBlob(blob, `${doc.name}.pdf`);
      }
      toast.success(`Exported ${selectedDocumentIds.length} documents`);
      clearSelection();
    } catch {
      toast.error('Export failed');
    } finally {
      setProcessing(false);
    }
  }, [selectedDocumentIds, documents, exportQuality, exportPageSize, setProcessing, clearSelection]);

  return (
    <div className="flex flex-col gap-4">
      {/* Search and Sort */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 rounded-xl"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
          className="h-9 w-9 rounded-xl shrink-0"
          title={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}`}
        >
          {sortOrder === 'asc' ? (
            <SortAsc className="h-4 w-4" />
          ) : (
            <SortDesc className="h-4 w-4" />
          )}
        </Button>
        <div className="hidden sm:flex items-center gap-1 rounded-xl bg-muted/50 p-1">
          {[
            { key: 'date' as const, label: 'Date' },
            { key: 'name' as const, label: 'Name' },
            { key: 'size' as const, label: 'Size' },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSortBy(item.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                sortBy === item.key
                  ? 'bg-background shadow-sm text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Batch Actions */}
      <AnimatePresence>
        {selectedDocumentIds.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between rounded-xl bg-primary/5 border border-primary/20 p-3">
              <span className="text-sm font-medium text-primary">
                {selectedDocumentIds.length} selected
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchExport}
                  disabled={isProcessing}
                  className="h-8 rounded-lg text-xs"
                >
                  <Download className="mr-1.5 h-3.5 w-3.5" />
                  Export
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearSelection}
                  className="h-8 rounded-lg text-xs"
                >
                  <X className="mr-1.5 h-3.5 w-3.5" />
                  Clear
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleBatchDelete}
                  className="h-8 rounded-lg text-xs text-destructive hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Grid */}
      {filteredDocs.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <AnimatePresence mode="popLayout">
            {filteredDocs.map((doc) => (
              <DocumentCard key={doc.id} doc={doc} />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-muted/50 mb-4">
            <FileText className="h-10 w-10 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">
            {searchQuery ? 'No results found' : 'No documents yet'}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground max-w-xs">
            {searchQuery
              ? 'Try adjusting your search query'
              : 'Scan your first document to get started. Use the camera or upload an image.'}
          </p>
          {!searchQuery && (
            <Button
              onClick={() => setView('home')}
              className="mt-4 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="mr-2 h-4 w-4" />
              Scan Document
            </Button>
          )}
        </div>
      )}

      {/* Stats */}
      {documents.length > 0 && (
        <div className="text-center text-xs text-muted-foreground">
          {filteredDocs.length} document{filteredDocs.length !== 1 ? 's' : ''}
          {searchQuery && ` found (of ${documents.length} total)`}
        </div>
      )}
    </div>
  );
}
