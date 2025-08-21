// 重构后的Canvas类型系统 - 基于统一Card架构

export type CardType = 'text' | 'text-card' | 'figure-card';

export interface BaseCard {
  id: string;
  type: CardType;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  z: number;
  locked?: boolean;
  selected?: boolean;
  createdAt: number;
  updatedAt: number;
  
  // 网格对齐属性
  gridSize: number; // 默认20px
  snapToGrid: boolean; // 是否自动对齐网格
  
  // 共享的Card样式
  styles?: {
    backgroundColor?: string;
    borderColor?: string;
    borderWidth?: number;
    borderRadius?: number;
    shadowColor?: string;
    shadowBlur?: number;
    padding?: number;
    opacity?: number;
  };
}

// 纯文字卡片
export interface TextCard extends BaseCard {
  type: 'text';
  content: string;
  textStyles?: {
    fontSize?: number;
    fontFamily?: string;
    fontWeight?: string;
    textAlign?: 'left' | 'center' | 'right';
    color?: string;
    lineHeight?: number;
  };
}

// 文字卡片（带标题、正文、标签）
export interface TextContentCard extends BaseCard {
  type: 'text-card';
  title: string;
  bodyHtml: string;
  cover?: string;
  tags?: string[];
  cardStyles?: {
    titleColor?: string;
    bodyColor?: string;
    tagColor?: string;
    headerHeight?: number;
  };
}

// 图片卡片
export interface FigureCard extends BaseCard {
  type: 'figure-card';
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  alt?: string;
  caption?: string;
  figureStyles?: {
    captionColor?: string;
    captionPosition?: 'top' | 'bottom' | 'overlay';
    objectFit?: 'cover' | 'contain' | 'fill' | 'scale-down';
  };
}

export type AnyCard = TextCard | TextContentCard | FigureCard;

// 网格对齐工具函数类型
export interface GridAlignment {
  gridSize: number;
  snapBounds: (bounds: Bounds) => Bounds;
  snapPoint: (point: Point) => Point;
  isAligned: (bounds: Bounds) => boolean;
  getSnapLines: (bounds: Bounds) => SnapLine[];
}

export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;
  isEdge: boolean; // 是否是边缘线（而非角点线）
}

// 卡片变换属性
export interface CardTransform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
}

// 调整大小约束
export interface ResizeConstraints {
  minWidth: number;
  minHeight: number;
  maxWidth?: number;
  maxHeight?: number;
  maintainAspectRatio?: boolean;
  snapToGrid: boolean;
  gridSize: number;
}

// 更新其他接口以使用新的Card系统
export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceAnchor?: 't' | 'r' | 'b' | 'l' | 'auto';
  targetAnchor?: 't' | 'r' | 'b' | 'l' | 'auto';
  points?: number[];
  style?: {
    color?: string;
    width?: number;
    arrow?: 'none' | 'end' | 'both';
    dashPattern?: number[];
  };
  createdAt: number;
  updatedAt: number;
}

export interface Camera {
  x: number;
  y: number;
  zoom: number;
}

export interface Document {
  id: string;
  title: string;
  cards: AnyCard[]; // 改为cards而非nodes
  edges: Edge[];
  camera: Camera;
  gridSize: number; // 文档级别的网格大小设置
  createdAt: number;
  updatedAt: number;
  version: number;
}

export interface SelectionBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export interface Bounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface TransformHandles {
  nw: Point;
  ne: Point;
  sw: Point;
  se: Point;
  n: Point;
  s: Point;
  w: Point;
  e: Point;
}

export type Tool = 'select' | 'text' | 'text-card' | 'figure-card' | 'edge' | 'pan';

export interface CanvasState {
  tool: Tool;
  camera: Camera;
  selectedIds: string[];
  hoveredId: string | null;
  isDragging: boolean;
  isDrawingSelection: boolean;
  selectionBox: SelectionBox | null;
  clipboard: AnyCard[];
  gridSize: number;
  showGrid: boolean;
  snapToGrid: boolean;
  history: {
    past: Document[];
    present: Document;
    future: Document[];
  };
}

export interface Command {
  type: string;
  execute: () => void;
  undo: () => void;
  description?: string;
}

export interface AIPromptResult {
  cards: Partial<TextContentCard>[];
  arrangement: 'grid' | 'list' | 'random';
  spacing: number;
}

export interface LayoutOptions {
  type: 'grid' | 'list' | 'circle' | 'waterfall';
  spacing: number;
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
  columns?: number;
  padding?: number;
  snapToGrid?: boolean;
}

export interface ExportOptions {
  format: 'png' | 'jpg' | 'json';
  quality: number;
  scale: number;
  background: boolean;
  bounds?: 'viewport' | 'selection' | 'all';
}

export interface Theme {
  name: string;
  colors: {
    background: string;
    foreground: string;
    primary: string;
    secondary: string;
    accent: string;
    muted: string;
    border: string;
    canvasBackground: string;
    canvasGrid: string;
    cardBackground: string;
    cardBorder: string;
    cardSelected: string;
    referenceLine: string;
    snapLine: string;
  };
  fonts: {
    sans: string;
    mono: string;
  };
  spacing: {
    grid: number;
    cardGap: number;
    padding: number;
  };
}

export interface KeyboardShortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
  action: string;
  description: string;
}
