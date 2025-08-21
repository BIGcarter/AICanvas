import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { nanoid } from '@/utils/nanoid';
import { 
  AnyCard, 
  AnyNode, // 保留兼容性
  Edge, 
  Camera, 
  Document, 
  CanvasState, 
  Tool, 
  SelectionBox,
  Point,
  CardType,
  TextCard,
  TextContentCard,
  FigureCard 
} from '@/types/canvas';

interface CanvasStore extends CanvasState {
  // Document operations
  document: Document;
  setDocument: (doc: Document) => void;
  
  // Card operations (new unified system)
  addCard: (card: Omit<AnyCard, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateCard: (id: string, updates: Partial<AnyCard>) => void;
  deleteCard: (id: string) => void;
  duplicateCard: (id: string) => void;
  
  // Legacy Node operations (for compatibility)
  addNode: (node: Omit<AnyNode, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateNode: (id: string, updates: Partial<AnyNode>) => void;
  deleteNode: (id: string) => void;
  duplicateNode: (id: string) => void;
  
  // Edge operations
  addEdge: (edge: Omit<Edge, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateEdge: (id: string, updates: Partial<Edge>) => void;
  deleteEdge: (id: string) => void;
  
  // Selection operations (unified for cards/nodes)
  selectCard: (id: string, multiSelect?: boolean) => void;
  selectCards: (ids: string[]) => void;
  selectNode: (id: string, multiSelect?: boolean) => void; // Legacy compatibility
  selectNodes: (ids: string[]) => void; // Legacy compatibility
  clearSelection: () => void;
  selectAll: () => void;
  
  // Camera operations
  setCamera: (camera: Partial<Camera>) => void;
  zoomToFit: () => void;
  zoomToSelection: () => void;
  resetZoom: () => void;
  
  // Tool operations
  setTool: (tool: Tool) => void;
  
  // UI state
  setHoveredId: (id: string | null) => void;
  setDragging: (isDragging: boolean) => void;
  setDrawingSelection: (isDrawing: boolean, box?: SelectionBox | null) => void;
  
  // Clipboard operations
  copy: () => void;
  paste: (position?: Point) => void;
  cut: () => void;
  
  // History operations
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  pushHistory: () => void;
  
  // Layout operations (unified for cards/nodes)
  alignCards: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void;
  distributeCards: (direction: 'horizontal' | 'vertical') => void;
  arrangeCards: (type: 'grid' | 'list' | 'circle') => void;
  alignNodes: (direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom') => void; // Legacy
  distributeNodes: (direction: 'horizontal' | 'vertical') => void; // Legacy
  arrangeNodes: (type: 'grid' | 'list' | 'circle') => void; // Legacy
  
  // Grid alignment operations (new for card system)
  snapToGrid: boolean;
  gridSize: number;
  setSnapToGrid: (snap: boolean) => void;
  setGridSize: (size: number) => void;

  // Rich text editing session
  isTextEditing: boolean;
  activeEditor: any | null;
  setTextEditing: (isEditing: boolean) => void;
  setActiveEditor: (editor: any | null) => void;
  suppressBlurUntil: number;
  setSuppressBlur: (ms: number) => void;

  // External editing controls
  editingCardId: string | null;
  editingArea: 'text' | 'title' | 'content' | null;
  startEdit: (cardId: string, area?: 'text' | 'title' | 'content') => void;
  clearEdit: () => void;
  cancelEditNonce: number; // increments to signal cancel
  requestCancelEdit: () => void;
}

const initialCamera: Camera = { x: 0, y: 0, zoom: 1 };

const initialDocument: Document = {
  id: nanoid(),
  title: 'Untitled Canvas',
  cards: [], // 新的统一Card系统
  nodes: [], // 保持向后兼容性
  edges: [],
  camera: initialCamera,
  gridSize: 20, // 默认网格大小
  snapToGrid: true, // 默认开启网格对齐
  createdAt: Date.now(),
  updatedAt: Date.now(),
  version: 1,
};

export const useCanvasStore = create<CanvasStore>()(
  subscribeWithSelector((set, get) => ({
    // Initial state
    tool: 'select',
    camera: initialCamera,
    selectedIds: [],
    hoveredId: null,
    isDragging: false,
    isDrawingSelection: false,
    selectionBox: null,
    clipboard: [],
    document: initialDocument,
    snapToGrid: true, // 网格对齐开关
    gridSize: 20, // 网格大小
    history: {
      past: [],
      present: initialDocument,
      future: [],
    },

    // Rich text editing session
    isTextEditing: false,
    activeEditor: null,
    setTextEditing: (isEditing) => set({ isTextEditing: isEditing }),
    setActiveEditor: (editor) => set({ activeEditor: editor }),
    suppressBlurUntil: 0,
    setSuppressBlur: (ms) => set({ suppressBlurUntil: Date.now() + ms }),

    editingCardId: null,
    editingArea: null,
    startEdit: (cardId, area = 'content') => set({ editingCardId: cardId, editingArea: area }),
    clearEdit: () => set({ editingCardId: null, editingArea: null }),
    cancelEditNonce: 0,
    requestCancelEdit: () => set((s) => ({ cancelEditNonce: s.cancelEditNonce + 1 })),

    // Document operations
    setDocument: (doc) => {
      set((state) => ({
        document: doc,
        camera: doc.camera,
        history: {
          past: [],
          present: doc,
          future: [],
        },
      }));
    },

    // Card operations (new unified system)
    addCard: (cardData) => {
      const card: AnyCard = {
        ...cardData,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gridSize: cardData.gridSize || get().gridSize,
        snapToGrid: cardData.snapToGrid !== undefined ? cardData.snapToGrid : get().snapToGrid,
      } as AnyCard;

      set((state) => {
        const newDocument = {
          ...state.document,
          cards: [...state.document.cards, card],
          updatedAt: Date.now(),
          version: state.document.version + 1,
        };
        
        return {
          document: newDocument,
          selectedIds: [card.id],
        };
      });
      
      get().pushHistory();
    },

    updateCard: (id, updates) => {
      set((state) => ({
        ...state,
        document: {
          ...state.document,
          cards: state.document.cards.map((card) =>
            card.id === id
              ? { ...card, ...updates, updatedAt: Date.now() }
              : card
          ) as AnyCard[],
          updatedAt: Date.now(),
          version: state.document.version + 1,
        },
      }));
    },

    deleteCard: (id) => {
      set((state) => {
        const newDocument = {
          ...state.document,
          cards: state.document.cards.filter((card) => card.id !== id),
          edges: state.document.edges.filter(
            (edge) => edge.sourceId !== id && edge.targetId !== id
          ),
          updatedAt: Date.now(),
          version: state.document.version + 1,
        };
        
        return {
          document: newDocument,
          selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
        };
      });
      
      get().pushHistory();
    },

    duplicateCard: (id) => {
      const { document } = get();
      const cardToDuplicate = document.cards.find((card) => card.id === id);
      if (!cardToDuplicate) return;

      const duplicatedCard: AnyCard = {
        ...cardToDuplicate,
        id: nanoid(),
        x: cardToDuplicate.x + 20,
        y: cardToDuplicate.y + 20,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set((state) => {
        const newDocument = {
          ...state.document,
          cards: [...state.document.cards, duplicatedCard],
          updatedAt: Date.now(),
          version: state.document.version + 1,
        };
        
        return {
          document: newDocument,
          selectedIds: [duplicatedCard.id],
        };
      });
      
      get().pushHistory();
    },

    // Legacy Node operations (for compatibility)
    addNode: (nodeData) => {
      const node: AnyNode = {
        ...nodeData,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
        gridSize: get().gridSize,
        snapToGrid: get().snapToGrid,
      } as AnyNode;

      set((state) => {
        const newDocument = {
          ...state.document,
          nodes: [...state.document.nodes, node],
          cards: [...state.document.cards, node as AnyCard], // 同时添加到cards以保持一致性
          updatedAt: Date.now(),
          version: state.document.version + 1,
        };
        
        return {
          document: newDocument,
          selectedIds: [node.id],
        };
      });
      
      get().pushHistory();
    },

    updateNode: (id, updates) => {
      set((state) => ({
        ...state,
        document: {
          ...state.document,
          nodes: state.document.nodes.map((node: AnyNode) =>
            node.id === id
              ? { ...node, ...updates, updatedAt: Date.now() }
              : node
          ) as AnyNode[],
          cards: state.document.cards.map((card: AnyCard) =>
            card.id === id
              ? { ...card, ...updates, updatedAt: Date.now() }
              : card
          ) as AnyCard[],
          updatedAt: Date.now(),
          version: state.document.version + 1,
        },
      }));
    },

    deleteNode: (id) => {
      set((state) => {
        const newDocument = {
          ...state.document,
          nodes: state.document.nodes.filter((node: AnyNode) => node.id !== id),
          cards: state.document.cards.filter((card: AnyCard) => card.id !== id),
          edges: state.document.edges.filter(
            (edge) => edge.sourceId !== id && edge.targetId !== id
          ),
          updatedAt: Date.now(),
          version: state.document.version + 1,
        };
        
        return {
          document: newDocument,
          selectedIds: state.selectedIds.filter((selectedId) => selectedId !== id),
        };
      });
      
      get().pushHistory();
    },

    duplicateNode: (id) => {
      const state = get();
      const node = state.document.nodes.find((n: AnyNode) => n.id === id);
      if (!node) return;

      const duplicatedNode: AnyNode = {
        ...node,
        id: nanoid(),
        x: node.x + 20,
        y: node.y + 20,
        selected: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      state.addNode(duplicatedNode);
    },

    // Edge operations
    addEdge: (edgeData) => {
      const edge: Edge = {
        ...edgeData,
        id: nanoid(),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      set((state) => {
        const newDocument = {
          ...state.document,
          edges: [...state.document.edges, edge],
          updatedAt: Date.now(),
          version: state.document.version + 1,
        };
        
        return { document: newDocument };
      });
      
      get().pushHistory();
    },

    updateEdge: (id, updates) => {
      set((state) => {
        const newDocument = {
          ...state.document,
          edges: state.document.edges.map((edge) =>
            edge.id === id
              ? { ...edge, ...updates, updatedAt: Date.now() }
              : edge
          ),
          updatedAt: Date.now(),
          version: state.document.version + 1,
        };
        
        return { document: newDocument };
      });
    },

    deleteEdge: (id) => {
      set((state) => {
        const newDocument = {
          ...state.document,
          edges: state.document.edges.filter((edge) => edge.id !== id),
          updatedAt: Date.now(),
          version: state.document.version + 1,
        };
        
        return { document: newDocument };
      });
      
      get().pushHistory();
    },

    // Selection operations (unified for cards/nodes)
    selectCard: (id, multiSelect = false) => {
      set((state) => ({
        selectedIds: multiSelect
          ? state.selectedIds.includes(id)
            ? state.selectedIds.filter((selectedId) => selectedId !== id)
            : [...state.selectedIds, id]
          : [id],
      }));
    },

    selectCards: (ids) => {
      set({ selectedIds: ids });
    },

    // Legacy selection methods (for compatibility)
    selectNode: (id, multiSelect = false) => {
      set((state) => ({
        selectedIds: multiSelect
          ? state.selectedIds.includes(id)
            ? state.selectedIds.filter((selectedId) => selectedId !== id)
            : [...state.selectedIds, id]
          : [id],
      }));
    },

    selectNodes: (ids) => {
      set({ selectedIds: ids });
    },

    clearSelection: () => {
      set({ selectedIds: [] });
    },

    selectAll: () => {
      const state = get();
      // 选择所有cards（如果存在），否则选择nodes（向后兼容）
      const ids = state.document.cards?.length > 0 
        ? state.document.cards.map((card) => card.id)
        : state.document.nodes?.map((node) => node.id) || [];
      set({ selectedIds: ids });
    },

    // Camera operations
    setCamera: (updates) => {
      set((state) => {
        const newCamera = { ...state.camera, ...updates };
        const newDocument = {
          ...state.document,
          camera: newCamera,
          updatedAt: Date.now(),
        };
        
        return {
          camera: newCamera,
          document: newDocument,
        };
      });
    },

    zoomToFit: () => {
      const state = get();
      const { nodes } = state.document;
      
      if (nodes.length === 0) return;
      
      const bounds = nodes.reduce(
        (acc, node) => ({
          minX: Math.min(acc.minX, node.x),
          minY: Math.min(acc.minY, node.y),
          maxX: Math.max(acc.maxX, node.x + node.width),
          maxY: Math.max(acc.maxY, node.y + node.height),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      );
      
      const padding = 100;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight - 120; // Account for toolbar
      
      const contentWidth = bounds.maxX - bounds.minX + padding * 2;
      const contentHeight = bounds.maxY - bounds.minY + padding * 2;
      
      const scaleX = viewportWidth / contentWidth;
      const scaleY = viewportHeight / contentHeight;
      const zoom = Math.min(scaleX, scaleY, 1);
      
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      state.setCamera({
        x: viewportWidth / 2 - centerX * zoom,
        y: viewportHeight / 2 - centerY * zoom,
        zoom,
      });
    },

    zoomToSelection: () => {
      const state = get();
      const selectedNodes = state.document.nodes.filter((node) =>
        state.selectedIds.includes(node.id)
      );
      
      if (selectedNodes.length === 0) return;
      
      // Similar logic to zoomToFit but for selected nodes only
      const bounds = selectedNodes.reduce(
        (acc, node) => ({
          minX: Math.min(acc.minX, node.x),
          minY: Math.min(acc.minY, node.y),
          maxX: Math.max(acc.maxX, node.x + node.width),
          maxY: Math.max(acc.maxY, node.y + node.height),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      );
      
      const padding = 50;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight - 120;
      
      const contentWidth = bounds.maxX - bounds.minX + padding * 2;
      const contentHeight = bounds.maxY - bounds.minY + padding * 2;
      
      const scaleX = viewportWidth / contentWidth;
      const scaleY = viewportHeight / contentHeight;
      const zoom = Math.min(scaleX, scaleY, 2);
      
      const centerX = (bounds.minX + bounds.maxX) / 2;
      const centerY = (bounds.minY + bounds.maxY) / 2;
      
      state.setCamera({
        x: viewportWidth / 2 - centerX * zoom,
        y: viewportHeight / 2 - centerY * zoom,
        zoom,
      });
    },

    resetZoom: () => {
      get().setCamera({ x: 0, y: 0, zoom: 1 });
    },

    // Tool operations
    setTool: (tool) => {
      set({ tool });
    },

    // UI state
    setHoveredId: (id) => {
      set({ hoveredId: id });
    },

    setDragging: (isDragging) => {
      set({ isDragging });
    },

    setDrawingSelection: (isDrawing, box = null) => {
      set({ isDrawingSelection: isDrawing, selectionBox: box });
    },

    // Clipboard operations
    copy: () => {
      const state = get();
      const selectedNodes = state.document.nodes.filter((node) =>
        state.selectedIds.includes(node.id)
      );
      set({ clipboard: selectedNodes });
    },

    paste: (position) => {
      const state = get();
      if (state.clipboard.length === 0) return;
      
      const offset = position || { x: 20, y: 20 };
      const newIds: string[] = [];
      
      state.clipboard.forEach((node) => {
        const newNode: AnyNode = {
          ...node,
          id: nanoid(),
          x: node.x + offset.x,
          y: node.y + offset.y,
          selected: false,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        
        state.addNode(newNode);
        newIds.push(newNode.id);
      });
      
      state.selectNodes(newIds);
    },

    cut: () => {
      const state = get();
      state.copy();
      state.selectedIds.forEach((id) => state.deleteNode(id));
    },

    // History operations
    pushHistory: () => {
      set((state) => ({
        history: {
          past: [...state.history.past, state.history.present],
          present: state.document,
          future: [],
        },
      }));
    },

    undo: () => {
      set((state) => {
        if (state.history.past.length === 0) return state;
        
        const previous = state.history.past[state.history.past.length - 1];
        const newPast = state.history.past.slice(0, -1);
        
        return {
          document: previous,
          camera: previous.camera,
          selectedIds: [],
          history: {
            past: newPast,
            present: previous,
            future: [state.history.present, ...state.history.future],
          },
        };
      });
    },

    redo: () => {
      set((state) => {
        if (state.history.future.length === 0) return state;
        
        const next = state.history.future[0];
        const newFuture = state.history.future.slice(1);
        
        return {
          document: next,
          camera: next.camera,
          selectedIds: [],
          history: {
            past: [...state.history.past, state.history.present],
            present: next,
            future: newFuture,
          },
        };
      });
    },

    canUndo: () => {
      return get().history.past.length > 0;
    },

    canRedo: () => {
      return get().history.future.length > 0;
    },

    // Layout operations
    alignNodes: (direction) => {
      const state = get();
      const selectedNodes = state.document.nodes.filter((node) =>
        state.selectedIds.includes(node.id)
      );
      
      if (selectedNodes.length < 2) return;
      
      const bounds = selectedNodes.reduce(
        (acc, node) => ({
          minX: Math.min(acc.minX, node.x),
          minY: Math.min(acc.minY, node.y),
          maxX: Math.max(acc.maxX, node.x + node.width),
          maxY: Math.max(acc.maxY, node.y + node.height),
        }),
        { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity }
      );
      
      selectedNodes.forEach((node) => {
        let updates: Partial<AnyNode> = {};
        
        switch (direction) {
          case 'left':
            updates.x = bounds.minX;
            break;
          case 'center':
            updates.x = (bounds.minX + bounds.maxX) / 2 - node.width / 2;
            break;
          case 'right':
            updates.x = bounds.maxX - node.width;
            break;
          case 'top':
            updates.y = bounds.minY;
            break;
          case 'middle':
            updates.y = (bounds.minY + bounds.maxY) / 2 - node.height / 2;
            break;
          case 'bottom':
            updates.y = bounds.maxY - node.height;
            break;
        }
        
        state.updateNode(node.id, updates);
      });
      
      state.pushHistory();
    },

    distributeNodes: (direction) => {
      const state = get();
      const selectedNodes = state.document.nodes.filter((node) =>
        state.selectedIds.includes(node.id)
      );
      
      if (selectedNodes.length < 3) return;
      
      if (direction === 'horizontal') {
        selectedNodes.sort((a, b) => a.x - b.x);
        const totalWidth = selectedNodes[selectedNodes.length - 1].x + selectedNodes[selectedNodes.length - 1].width - selectedNodes[0].x;
        const totalNodeWidth = selectedNodes.reduce((sum, node) => sum + node.width, 0);
        const spacing = (totalWidth - totalNodeWidth) / (selectedNodes.length - 1);
        
        let currentX = selectedNodes[0].x;
        selectedNodes.forEach((node, index) => {
          if (index > 0) {
            currentX += selectedNodes[index - 1].width + spacing;
            state.updateNode(node.id, { x: currentX });
          }
        });
      } else {
        selectedNodes.sort((a, b) => a.y - b.y);
        const totalHeight = selectedNodes[selectedNodes.length - 1].y + selectedNodes[selectedNodes.length - 1].height - selectedNodes[0].y;
        const totalNodeHeight = selectedNodes.reduce((sum, node) => sum + node.height, 0);
        const spacing = (totalHeight - totalNodeHeight) / (selectedNodes.length - 1);
        
        let currentY = selectedNodes[0].y;
        selectedNodes.forEach((node, index) => {
          if (index > 0) {
            currentY += selectedNodes[index - 1].height + spacing;
            state.updateNode(node.id, { y: currentY });
          }
        });
      }
      
      state.pushHistory();
    },

    arrangeNodes: (type) => {
      const state = get();
      const selectedNodes = state.document.nodes.filter((node) =>
        state.selectedIds.includes(node.id)
      );
      
      if (selectedNodes.length < 2) return;
      
      const spacing = 20;
      
      if (type === 'grid') {
        const cols = Math.ceil(Math.sqrt(selectedNodes.length));
        selectedNodes.forEach((node, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          state.updateNode(node.id, {
            x: col * (node.width + spacing),
            y: row * (node.height + spacing),
          });
        });
      } else if (type === 'list') {
        selectedNodes.forEach((node, index) => {
          state.updateNode(node.id, {
            x: 0,
            y: index * (node.height + spacing),
          });
        });
      } else if (type === 'circle') {
        const center = { x: 0, y: 0 };
        const radius = Math.max(100, selectedNodes.length * 30);
        
        selectedNodes.forEach((node, index) => {
          const angle = (index / selectedNodes.length) * 2 * Math.PI;
          state.updateNode(node.id, {
            x: center.x + Math.cos(angle) * radius - node.width / 2,
            y: center.y + Math.sin(angle) * radius - node.height / 2,
          });
        });
      }
      
      state.pushHistory();
    },

    // New Card layout operations (with grid alignment)
    alignCards: (direction) => {
      const state = get();
      const selectedCards = state.document.cards.filter((card) =>
        state.selectedIds.includes(card.id)
      );
      
      if (selectedCards.length < 2) return;
      
      let alignValue: number;
      
      if (direction === 'left') {
        alignValue = Math.min(...selectedCards.map((card) => card.x));
      } else if (direction === 'center') {
        const minX = Math.min(...selectedCards.map((card) => card.x));
        const maxX = Math.max(...selectedCards.map((card) => card.x + card.width));
        alignValue = (minX + maxX) / 2;
      } else if (direction === 'right') {
        alignValue = Math.max(...selectedCards.map((card) => card.x + card.width));
      } else if (direction === 'top') {
        alignValue = Math.min(...selectedCards.map((card) => card.y));
      } else if (direction === 'middle') {
        const minY = Math.min(...selectedCards.map((card) => card.y));
        const maxY = Math.max(...selectedCards.map((card) => card.y + card.height));
        alignValue = (minY + maxY) / 2;
      } else if (direction === 'bottom') {
        alignValue = Math.max(...selectedCards.map((card) => card.y + card.height));
      } else {
        return;
      }
      
      selectedCards.forEach((card) => {
        let updates: Partial<AnyCard> = {};
        
        if (direction === 'left') {
          updates.x = alignValue;
        } else if (direction === 'center') {
          updates.x = alignValue - card.width / 2;
        } else if (direction === 'right') {
          updates.x = alignValue - card.width;
        } else if (direction === 'top') {
          updates.y = alignValue;
        } else if (direction === 'middle') {
          updates.y = alignValue - card.height / 2;
        } else if (direction === 'bottom') {
          updates.y = alignValue - card.height;
        }
        
        // Apply grid snapping if enabled
        if (state.snapToGrid) {
          const gridSize = state.gridSize;
          if (updates.x !== undefined) {
            updates.x = Math.round(updates.x / gridSize) * gridSize;
          }
          if (updates.y !== undefined) {
            updates.y = Math.round(updates.y / gridSize) * gridSize;
          }
        }
        
        state.updateCard(card.id, updates);
      });
      
      state.pushHistory();
    },

    distributeCards: (direction) => {
      const state = get();
      const selectedCards = state.document.cards.filter((card) =>
        state.selectedIds.includes(card.id)
      );
      
      if (selectedCards.length < 3) return;
      
      if (direction === 'horizontal') {
        selectedCards.sort((a, b) => a.x - b.x);
        const totalWidth = selectedCards[selectedCards.length - 1].x + selectedCards[selectedCards.length - 1].width - selectedCards[0].x;
        const totalCardWidth = selectedCards.reduce((sum, card) => sum + card.width, 0);
        const spacing = (totalWidth - totalCardWidth) / (selectedCards.length - 1);
        
        let currentX = selectedCards[0].x;
        selectedCards.forEach((card, index) => {
          if (index > 0) {
            currentX += selectedCards[index - 1].width + spacing;
            let newX = currentX;
            
            // Apply grid snapping
            if (state.snapToGrid) {
              newX = Math.round(newX / state.gridSize) * state.gridSize;
            }
            
            state.updateCard(card.id, { x: newX });
          }
        });
      } else {
        selectedCards.sort((a, b) => a.y - b.y);
        const totalHeight = selectedCards[selectedCards.length - 1].y + selectedCards[selectedCards.length - 1].height - selectedCards[0].y;
        const totalCardHeight = selectedCards.reduce((sum, card) => sum + card.height, 0);
        const spacing = (totalHeight - totalCardHeight) / (selectedCards.length - 1);
        
        let currentY = selectedCards[0].y;
        selectedCards.forEach((card, index) => {
          if (index > 0) {
            currentY += selectedCards[index - 1].height + spacing;
            let newY = currentY;
            
            // Apply grid snapping
            if (state.snapToGrid) {
              newY = Math.round(newY / state.gridSize) * state.gridSize;
            }
            
            state.updateCard(card.id, { y: newY });
          }
        });
      }
      
      state.pushHistory();
    },

    arrangeCards: (type) => {
      const state = get();
      const selectedCards = state.document.cards.filter((card) =>
        state.selectedIds.includes(card.id)
      );
      
      if (selectedCards.length < 2) return;
      
      const spacing = state.gridSize * 2; // Use grid-aligned spacing
      
      if (type === 'grid') {
        const cols = Math.ceil(Math.sqrt(selectedCards.length));
        selectedCards.forEach((card, index) => {
          const row = Math.floor(index / cols);
          const col = index % cols;
          let newX = col * (card.width + spacing);
          let newY = row * (card.height + spacing);
          
          // Apply grid snapping
          if (state.snapToGrid) {
            newX = Math.round(newX / state.gridSize) * state.gridSize;
            newY = Math.round(newY / state.gridSize) * state.gridSize;
          }
          
          state.updateCard(card.id, { x: newX, y: newY });
        });
      } else if (type === 'list') {
        selectedCards.forEach((card, index) => {
          let newX = 0;
          let newY = index * (card.height + spacing);
          
          // Apply grid snapping
          if (state.snapToGrid) {
            newX = Math.round(newX / state.gridSize) * state.gridSize;
            newY = Math.round(newY / state.gridSize) * state.gridSize;
          }
          
          state.updateCard(card.id, { x: newX, y: newY });
        });
      } else if (type === 'circle') {
        const center = { x: 0, y: 0 };
        const radius = Math.max(100, selectedCards.length * 30);
        
        selectedCards.forEach((card, index) => {
          const angle = (index / selectedCards.length) * 2 * Math.PI;
          let newX = center.x + Math.cos(angle) * radius - card.width / 2;
          let newY = center.y + Math.sin(angle) * radius - card.height / 2;
          
          // Apply grid snapping
          if (state.snapToGrid) {
            newX = Math.round(newX / state.gridSize) * state.gridSize;
            newY = Math.round(newY / state.gridSize) * state.gridSize;
          }
          
          state.updateCard(card.id, { x: newX, y: newY });
        });
      }
      
      state.pushHistory();
    },

    // Grid alignment operations
    setSnapToGrid: (snap) => {
      set({ snapToGrid: snap });
    },

    setGridSize: (size) => {
      set({ gridSize: size });
    },
  }))
);
