// 基于统一Card架构的类型定义
export type CardType = 'text' | 'text-card' | 'ai-card' | 'figure-card' | 'pdf-card' | 'video-card';

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

// AI 内容卡片：继承普通 text-card，但渲染支持 Markdown/LaTeX/代码高亮
export interface AIContentCard extends BaseCard {
  type: 'ai-card';
  title: string;
  bodyMarkdown: string; // 原始 markdown
  cover?: string;
  tags?: string[];
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
  // lock aspect ratio during resize when an image is set
  lockAspectRatio?: boolean;
  aspectRatio?: number; // width / height
}

// PDF 卡片
export interface PdfCard extends BaseCard {
  type: 'pdf-card';
  src: string; // object URL or remote URL
  page?: number; // reserved for future multi-page
  lockAspectRatio?: boolean;
  aspectRatio?: number; // width / height
}

export interface VideoCard extends BaseCard {
  type: 'video-card';
  src: string; // iframe src url
  provider?: 'bilibili' | 'youtube' | 'vimeo' | 'custom';
  lockAspectRatio?: boolean;
  aspectRatio?: number; // width / height, default 16/9
}

export type AnyCard = TextCard | TextContentCard | AIContentCard | FigureCard | PdfCard | VideoCard;

// 为了兼容性，保留旧的类型别名
export type NodeType = CardType;
export type BaseNode = BaseCard;
export type TextNode = TextCard;
export type CardNode = TextContentCard;
export type ImageNode = FigureCard;
export type AnyNode = AnyCard;

export interface Edge {
  id: string;
  sourceId: string;
  targetId: string;
  sourceAnchor?: 't' | 'r' | 'b' | 'l' | 'auto';
  targetAnchor?: 't' | 'r' | 'b' | 'l' | 'auto';
  points?: number[]; // world coordinates polyline
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
  cards: AnyCard[]; // 新的统一Card系统
  nodes: AnyNode[]; // 保留向后兼容性
  edges: Edge[];
  camera: Camera;
  gridSize: number; // 文档级别的网格大小设置
  snapToGrid: boolean; // 文档级别的网格对齐设置
  createdAt: number;
  updatedAt: number;
  version: number;
}

// 兼容性别名
export interface LegacyDocument {
  id: string;
  title: string;
  nodes: AnyNode[];
  edges: Edge[];
  camera: Camera;
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

export type Tool = 'select' | 'text' | 'text-card' | 'figure-card' | 'pdf-card' | 'video-card' | 'edge' | 'pan';

// 为了兼容性，保留旧的工具类型
export type LegacyTool = 'select' | 'text' | 'card' | 'image' | 'edge' | 'pan';

export interface CanvasState {
  tool: Tool;
  camera: Camera;
  selectedIds: string[];
  hoveredId: string | null;
  isDragging: boolean;
  isDrawingSelection: boolean;
  selectionBox: SelectionBox | null;
  clipboard: AnyCard[]; // 使用新的Card系统
  snapToGrid: boolean; // 网格对齐开关
  gridSize: number; // 网格大小
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
  cards: Partial<CardNode>[];
  arrangement: 'grid' | 'list' | 'random';
  spacing: number;
}

export interface LayoutOptions {
  type: 'grid' | 'list' | 'circle' | 'waterfall';
  spacing: number;
  alignment: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
  columns?: number;
  padding?: number;
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
    nodeBackground: string;
    nodeBorder: string;
    nodeSelected: string;
    referenceLine: string;
  };
  fonts: {
    sans: string;
    mono: string;
  };
  spacing: {
    grid: number;
    nodeGap: number;
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
