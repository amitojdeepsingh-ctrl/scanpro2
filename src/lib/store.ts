import { create } from 'zustand';
import {
  ScannedDocument,
  ScannedPage,
  ViewType,
  FilterType,
  ExportQuality,
  PageSize,
} from './types';

interface AppState {
  // View
  view: ViewType;
  previousView: ViewType | null;

  // Documents
  documents: ScannedDocument[];
  currentDocumentId: string | null;
  currentPageIndex: number;

  // Editor
  activeFilter: FilterType;
  brightness: number;
  contrast: number;
  sharpness: number;
  rotation: number;

  // Scanner
  isScanning: boolean;
  cameraFacing: 'user' | 'environment';

  // Processing
  isProcessing: boolean;
  processingProgress: number;
  processingMessage: string;

  // Document Management
  selectedDocumentIds: string[];
  searchQuery: string;
  sortBy: 'date' | 'name' | 'size';
  sortOrder: 'asc' | 'desc';

  // Export
  exportQuality: ExportQuality;
  exportPageSize: PageSize;

  // OCR
  ocrText: string;

  // Actions
  setView: (view: ViewType) => void;
  goBack: () => void;

  // Document actions
  setDocuments: (docs: ScannedDocument[]) => void;
  addDocument: (doc: ScannedDocument) => void;
  updateDocument: (id: string, updates: Partial<ScannedDocument>) => void;
  removeDocument: (id: string) => void;
  removeDocuments: (ids: string[]) => void;
  duplicateDocument: (id: string) => void;
  setCurrentDocument: (id: string | null) => void;
  setCurrentPageIndex: (index: number) => void;

  // Page actions
  addPage: (docId: string, page: ScannedPage) => void;
  updatePage: (docId: string, pageIndex: number, updates: Partial<ScannedPage>) => void;
  removePage: (docId: string, pageIndex: number) => void;
  reorderPages: (docId: string, fromIndex: number, toIndex: number) => void;

  // Editor actions
  setActiveFilter: (filter: FilterType) => void;
  setBrightness: (value: number) => void;
  setContrast: (value: number) => void;
  setSharpness: (value: number) => void;
  setRotation: (deg: number) => void;
  resetEditor: () => void;

  // Scanner actions
  setScanning: (scanning: boolean) => void;
  setCameraFacing: (facing: 'user' | 'environment') => void;

  // Processing actions
  setProcessing: (processing: boolean, progress?: number, message?: string) => void;

  // Document management
  setSelectedDocuments: (ids: string[]) => void;
  toggleDocumentSelection: (id: string) => void;
  clearSelection: () => void;
  setSearchQuery: (query: string) => void;
  setSortBy: (sort: 'date' | 'name' | 'size') => void;
  setSortOrder: (order: 'asc' | 'desc') => void;

  // Export actions
  setExportQuality: (quality: ExportQuality) => void;
  setExportPageSize: (size: PageSize) => void;

  // OCR
  setOcrText: (text: string) => void;
}

const initialEditorState = {
  activeFilter: 'original' as FilterType,
  brightness: 100,
  contrast: 100,
  sharpness: 0,
  rotation: 0,
};

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  view: 'home',
  previousView: null,
  documents: [],
  currentDocumentId: null,
  currentPageIndex: 0,
  ...initialEditorState,
  isScanning: false,
  cameraFacing: 'environment',
  isProcessing: false,
  processingProgress: 0,
  processingMessage: '',
  selectedDocumentIds: [],
  searchQuery: '',
  sortBy: 'date',
  sortOrder: 'desc',
  exportQuality: 'standard',
  exportPageSize: 'a4',
  ocrText: '',

  // View actions
  setView: (view) => set({ previousView: get().view, view }),
  goBack: () => {
    const prev = get().previousView;
    if (prev) {
      set({ view: prev, previousView: null });
    } else {
      set({ view: 'home', previousView: null });
    }
  },

  // Document actions
  setDocuments: (docs) => set({ documents: docs }),
  addDocument: (doc) => set((state) => ({ documents: [doc, ...state.documents] })),
  updateDocument: (id, updates) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === id ? { ...d, ...updates } : d
      ),
    })),
  removeDocument: (id) =>
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
      currentDocumentId: state.currentDocumentId === id ? null : state.currentDocumentId,
      selectedDocumentIds: state.selectedDocumentIds.filter((sid) => sid !== id),
    })),
  removeDocuments: (ids) =>
    set((state) => ({
      documents: state.documents.filter((d) => !ids.includes(d.id)),
      currentDocumentId: ids.includes(state.currentDocumentId || '') ? null : state.currentDocumentId,
      selectedDocumentIds: state.selectedDocumentIds.filter((sid) => !ids.includes(sid)),
    })),
  duplicateDocument: (id) => {
    const doc = get().documents.find((d) => d.id === id);
    if (!doc) return;
    const newDoc: ScannedDocument = {
      ...doc,
      id: crypto.randomUUID(),
      name: `${doc.name} (copy)`,
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ documents: [newDoc, ...state.documents] }));
  },
  setCurrentDocument: (id) => set({ currentDocumentId: id }),
  setCurrentPageIndex: (index) => set({ currentPageIndex: index }),

  // Page actions
  addPage: (docId, page) =>
    set((state) => ({
      documents: state.documents.map((d) =>
        d.id === docId ? { ...d, pages: [...d.pages, page] } : d
      ),
    })),
  updatePage: (docId, pageIndex, updates) =>
    set((state) => ({
      documents: state.documents.map((d) => {
        if (d.id !== docId) return d;
        const pages = [...d.pages];
        pages[pageIndex] = { ...pages[pageIndex], ...updates };
        return { ...d, pages };
      }),
    })),
  removePage: (docId, pageIndex) =>
    set((state) => ({
      documents: state.documents.map((d) => {
        if (d.id !== docId) return d;
        const pages = d.pages.filter((_, i) => i !== pageIndex);
        return { ...d, pages, thumbnail: pages[0]?.processedImage || pages[0]?.originalImage || d.thumbnail };
      }),
      currentPageIndex: Math.min(state.currentPageIndex, Math.max(0, (get().documents.find(d => d.id === docId)?.pages.length || 1) - 2)),
    })),
  reorderPages: (docId, fromIndex, toIndex) =>
    set((state) => ({
      documents: state.documents.map((d) => {
        if (d.id !== docId) return d;
        const pages = [...d.pages];
        const [removed] = pages.splice(fromIndex, 1);
        pages.splice(toIndex, 0, removed);
        return { ...d, pages };
      }),
    })),

  // Editor actions
  setActiveFilter: (filter) => set({ activeFilter: filter }),
  setBrightness: (value) => set({ brightness: value }),
  setContrast: (value) => set({ contrast: value }),
  setSharpness: (value) => set({ sharpness: value }),
  setRotation: (deg) => set({ rotation: (get().rotation + deg + 360) % 360 }),
  resetEditor: () => set(initialEditorState),

  // Scanner actions
  setScanning: (scanning) => set({ isScanning: scanning }),
  setCameraFacing: (facing) => set({ cameraFacing: facing }),

  // Processing actions
  setProcessing: (processing, progress = 0, message = '') =>
    set({ isProcessing: processing, processingProgress: progress, processingMessage: message }),

  // Document management
  setSelectedDocuments: (ids) => set({ selectedDocumentIds: ids }),
  toggleDocumentSelection: (id) =>
    set((state) => ({
      selectedDocumentIds: state.selectedDocumentIds.includes(id)
        ? state.selectedDocumentIds.filter((sid) => sid !== id)
        : [...state.selectedDocumentIds, id],
    })),
  clearSelection: () => set({ selectedDocumentIds: [] }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sort) => set({ sortBy: sort }),
  setSortOrder: (order) => set({ sortOrder: order }),

  // Export actions
  setExportQuality: (quality) => set({ exportQuality: quality }),
  setExportPageSize: (size) => set({ exportPageSize: size }),

  // OCR
  setOcrText: (text) => set({ ocrText: text }),
}));
