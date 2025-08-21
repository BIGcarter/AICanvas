'use client';

import React from 'react';
import { 
  MousePointer2, 
  Type, 
  Square, 
  Image, 
  FileText,
  PlaySquare,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  Save,
  FolderOpen,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  RotateCw,
  Copy,
  Scissors,
  Clipboard,
  Grid3X3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useCanvasStore } from '@/store/canvas.store';
import { Tool } from '@/types/canvas';
import { cn } from '@/utils';
import { FormattingToolbar } from './formatting-toolbar';

const tools: Array<{
  id: Tool;
  icon: React.ComponentType<any>;
  label: string;
  shortcut?: string;
}> = [
  { id: 'select', icon: MousePointer2, label: 'Select', shortcut: 'V' },
  { id: 'text', icon: Type, label: 'Text', shortcut: 'T' },
  { id: 'text-card', icon: FileText, label: 'Text Card', shortcut: 'C' },
  { id: 'figure-card', icon: Image, label: 'Figure Card', shortcut: 'I' },
  { id: 'video-card', icon: PlaySquare, label: 'Video Card', shortcut: 'V' },
];

const alignmentTools = [
  { action: 'left', icon: AlignLeft, label: 'Align Left' },
  { action: 'center', icon: AlignCenter, label: 'Align Center' },
  { action: 'right', icon: AlignRight, label: 'Align Right' },
  { action: 'top', icon: AlignStartVertical, label: 'Align Top' },
  { action: 'middle', icon: AlignCenterVertical, label: 'Align Middle' },
  { action: 'bottom', icon: AlignEndVertical, label: 'Align Bottom' },
];

export function Toolbar() {
  const { 
    tool, 
    setTool, 
    selectedIds, 
    camera,
    setCamera,
    undo,
    redo,
    canUndo,
    canRedo,
    copy,
    cut,
    paste,
    alignCards, // Use new Card methods
    distributeCards,
    arrangeCards,
    alignNodes, // Keep legacy methods for compatibility
    distributeNodes,
    arrangeNodes,
    snapToGrid,
    setSnapToGrid,
    gridSize,
    setGridSize,
    zoomToFit,
    resetZoom
  } = useCanvasStore();

  const handleZoomIn = () => {
    setCamera({ zoom: Math.min(camera.zoom * 1.2, 5) });
  };

  const handleZoomOut = () => {
    setCamera({ zoom: Math.max(camera.zoom / 1.2, 0.1) });
  };

  const zoomPercentage = Math.round(camera.zoom * 100);

  // Save canvas to JSON file
  const saveCanvasToJson = () => {
    try {
      const state = useCanvasStore.getState();
      const doc = state.document;
      
      console.log('开始保存画布，当前文档:', doc);
      
      // 直接保存，不进行复杂的图片转换，避免崩溃
      const canvasData = {
        metadata: {
          version: "1.0.0",
          createdAt: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          title: "Canvas Project",
          description: "AI Canvas for Brainstorm"
        },
        canvas: {
          camera: doc.camera,
          grid: {
            size: state.gridSize,
            snapToGrid: state.snapToGrid,
            visible: true
          }
        },
        cards: doc.cards || [],
        aiSettings: {
          // Get AI settings from localStorage if available
          baseUrl: localStorage.getItem('aiBaseUrl') || '',
          model: localStorage.getItem('aiModel') || '',
          systemPrompt: localStorage.getItem('aiSystemPrompt') || ''
        }
      };

      console.log('生成的JSON数据:', canvasData);
      const jsonString = JSON.stringify(canvasData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `canvas-project-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      
      console.log('文件已保存');
    } catch (error) {
      console.error('保存失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert('保存失败: ' + errorMessage);
    }
  };

  // Load canvas from JSON file
  const loadCanvasFromJson = () => {
    try {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (!file) return;

        try {
          const text = await file.text();
          const canvasData = JSON.parse(text);
          
          console.log('加载的文件内容:', canvasData);
          
          // 简化的格式检查
          if (canvasData.cards && Array.isArray(canvasData.cards)) {
            const { setDocument, setCamera, setGridSize, setSnapToGrid } = useCanvasStore.getState();
            
            // Restore canvas settings (if available)
            if (canvasData.canvas?.camera) {
              setCamera(canvasData.canvas.camera);
            }
            if (canvasData.canvas?.grid) {
              setGridSize(canvasData.canvas.grid.size || 20);
              setSnapToGrid(canvasData.canvas.grid.snapToGrid !== undefined ? canvasData.canvas.grid.snapToGrid : true);
            }
            
            // Restore cards
            const restoredDocument = {
              ...useCanvasStore.getState().document,
              cards: canvasData.cards,
              updatedAt: Date.now(),
              version: useCanvasStore.getState().document.version + 1
            };
            setDocument(restoredDocument);
            
            // Restore AI settings if available
            if (canvasData.aiSettings) {
              if (canvasData.aiSettings.baseUrl) localStorage.setItem('aiBaseUrl', canvasData.aiSettings.baseUrl);
              if (canvasData.aiSettings.model) localStorage.setItem('aiModel', canvasData.aiSettings.model);
              if (canvasData.aiSettings.systemPrompt) localStorage.setItem('aiSystemPrompt', canvasData.aiSettings.systemPrompt);
            }
            
            alert(`画布已成功加载！共恢复 ${canvasData.cards.length} 个卡片`);
          } else {
            alert('无效的画布文件格式：缺少cards数组');
          }
        } catch (error) {
          console.error('加载文件失败:', error);
          const errorMessage = error instanceof Error ? error.message : '未知错误';
          alert('加载文件失败: ' + errorMessage);
        }
      };
      input.click();
    } catch (error) {
      console.error('创建文件选择器失败:', error);
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      alert('创建文件选择器失败: ' + errorMessage);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-white border-b border-border shadow-sm">
      {/* Left section - Main tools */}
      <div className="flex items-center gap-1">
        {tools.map((toolItem) => {
          const Icon = toolItem.icon;
          return (
            <Button
              key={toolItem.id}
              variant="ghost"
              size="icon"
              onClick={() => setTool(toolItem.id)}
              title={`${toolItem.label} (${toolItem.shortcut})`}
              className={cn(
                'relative',
                tool === toolItem.id && 'ring-1 ring-current'
              )}
            >
              <Icon className={cn('h-4 w-4', tool === toolItem.id && 'text-current')} />
              {/* shortcut badge removed; tooltip shows e.g. "Figure Card (I)" */}
            </Button>
          );
        })}
        
        <div className="w-px h-6 bg-border mx-2" />
        
        {/* History controls */}
        <Button
          variant="ghost"
          size="icon"
          onClick={undo}
          disabled={!canUndo()}
          title="Undo (⌘Z)"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={redo}
          disabled={!canRedo()}
          title="Redo (⌘⇧Z)"
        >
          <RotateCw className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        {/* Clipboard controls */}
        <Button
          variant="ghost"
          size="icon"
          onClick={copy}
          disabled={selectedIds.length === 0}
          title="Copy (⌘C)"
        >
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={cut}
          disabled={selectedIds.length === 0}
          title="Cut (⌘X)"
        >
          <Scissors className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => paste()}
          title="Paste (⌘V)"
        >
          <Clipboard className="h-4 w-4" />
        </Button>
      </div>

      {/* Center section */}
      <div className="flex-1 flex items-center justify-center">
        {selectedIds.length > 1 ? (
          <div className="flex items-center gap-1">
          <span className="text-xs text-muted-foreground mr-2">Align:</span>
          {alignmentTools.map((alignTool) => {
            const Icon = alignTool.icon;
            return (
              <Button
                key={alignTool.action}
                variant="ghost"
                size="icon"
                onClick={() => alignCards(alignTool.action as any)}
                title={alignTool.label}
                className="h-8 w-8"
              >
                <Icon className="h-3.5 w-3.5" />
              </Button>
            );
          })}
          
          <div className="w-px h-4 bg-border mx-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => distributeCards('horizontal')}
            title="Distribute Horizontally"
            className="text-xs"
          >
            H
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => distributeCards('vertical')}
            title="Distribute Vertically"
            className="text-xs"
          >
            V
          </Button>
          
          <div className="w-px h-4 bg-border mx-1" />
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => arrangeCards('grid')}
            title="Arrange as Grid"
            className="text-xs"
          >
            Grid
          </Button>
          </div>
        ) : (
          <FormattingToolbar />
        )}
      </div>

      {/* Right section - View controls and save/load */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomOut}
          title="Zoom Out"
        >
          <ZoomOut className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={resetZoom}
          className="min-w-[60px] text-xs"
        >
          {zoomPercentage}%
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={handleZoomIn}
          title="Zoom In"
        >
          <ZoomIn className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={zoomToFit}
          title="Fit to Screen"
          className="text-xs"
        >
          Fit
        </Button>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        {/* Grid controls */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSnapToGrid(!snapToGrid)}
          title={`Grid Snap ${snapToGrid ? 'On' : 'Off'}`}
          className={cn('gap-2', snapToGrid && 'ring-1 ring-current')}
        >
          <Grid3X3 className="h-4 w-4" />
          {snapToGrid ? 'On' : 'Off'}
        </Button>
        
        <div className="w-px h-6 bg-border mx-2" />
        
        {/* Save/Load buttons */}
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          title="Save Canvas"
          onClick={saveCanvasToJson}
        >
          <Save className="h-4 w-4" />
          Save
        </Button>
        
        <Button
          variant="secondary"
          size="sm"
          className="gap-2"
          title="Load Canvas"
          onClick={loadCanvasFromJson}
        >
          <FolderOpen className="h-4 w-4" />
          Load
        </Button>
      </div>
    </div>
  );
}
