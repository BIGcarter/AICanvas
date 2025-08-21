'use client';

import React, { useRef, useCallback, useEffect, useState } from 'react';
import { useCanvasStore } from '@/store/canvas.store';
import { screenToWorld, worldToScreen, snapPointToGrid, isPointInBounds, screenBoundsToWorld } from '@/utils/transforms';
import { CardsLayer } from './cards-layer';
import { EdgesLayer } from './edges-layer';
import { OverlayLayer } from './overlay-layer';
import { cn } from '@/utils';

export function CanvasRoot() {
  const canvasRef = useRef<HTMLDivElement>(null);
  const [isPanning, setIsPanning] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [lastPointerPosition, setLastPointerPosition] = useState({ x: 0, y: 0 });
  // Track selection start in screen coordinates (relative to canvas)
  const selectionStartScreenRef = useRef<{ x: number; y: number } | null>(null);
  // Track if we're actually dragging (not just clicking)
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const dragThreshold = 5; // 5px threshold for drag detection
  
  const {
    camera,
    setCamera,
    tool,
    setTool,
    selectedIds,
    clearSelection,
    isDragging,
    setDragging,
    isDrawingSelection,
    setDrawingSelection,
    selectionBox,
    addNode, // Keep for compatibility
    addCard, // New Card creation method
    selectNode,
    selectCard, // New Card selection method
    document: doc,
    gridSize,
    snapToGrid,
  } = useCanvasStore();

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore shortcuts when typing in inputs/textarea/contenteditable
      const active = (document.activeElement as HTMLElement | null);
      const target = (e.target as HTMLElement | null) || active;
      const isEditable = !!target && (
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        (active ? (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable) : false)
      );
      if (isEditable) {
        return;
      }
      if (e.code === 'Space' && !isSpacePressed) {
        e.preventDefault();
        setIsSpacePressed(true);
      }
      
      // Tool shortcuts
      if (!e.ctrlKey && !e.metaKey && !e.altKey) {
        switch (e.key.toLowerCase()) {
          case 'v':
            setTool('select');
            break;
          case 't':
            setTool('text');
            break;
          case 'c':
            setTool('text-card');
            break;
          case 'i':
            setTool('figure-card');
            break;
          case 'p':
            setTool('pdf-card');
            break;
          case 'u':
            setTool('video-card');
            break;
          case 'escape':
            clearSelection();
            setTool('select');
            break;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        setIsSpacePressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isSpacePressed, setTool, clearSelection]);

  // Handle wheel events for zooming
  const handleWheel = useCallback((e: WheelEvent) => {
    // If the wheel happened inside a scrollable card content area, let it scroll
    const target = e.target as HTMLElement | null;
    const scrollEl = target?.closest('[data-scroll-container="true"]') as HTMLElement | null;
    if (scrollEl && scrollEl.scrollHeight > scrollEl.clientHeight) {
      // Allow default scrolling inside the content area
      return;
    }

    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Zoom
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      
      const pointerX = e.clientX - rect.left;
      const pointerY = e.clientY - rect.top;
      
      const zoomFactor = e.deltaY > 0 ? 0.9 : 1.1;
      const newZoom = Math.max(0.1, Math.min(5, camera.zoom * zoomFactor));
      
      // Zoom towards cursor position
      const worldPoint = screenToWorld({ x: pointerX, y: pointerY }, camera);
      const newCamera = {
        zoom: newZoom,
        x: pointerX - worldPoint.x * newZoom,
        y: pointerY - worldPoint.y * newZoom,
      };
      
      setCamera(newCamera);
    } else {
      // Pan
      setCamera({
        x: camera.x - e.deltaX,
        y: camera.y - e.deltaY,
      });
    }
  }, [camera, setCamera]);

  // Handle pointer events
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = screenToWorld(screenPoint, camera);
    
    setLastPointerPosition(screenPoint);
    
    // Check if we should pan (space key or middle mouse button)
    const shouldPan = isSpacePressed || e.button === 1;
    
    if (shouldPan) {
      setIsPanning(true);
      setDragging(true);
      return;
    }
    
    // Record drag start position for drag detection
    dragStartRef.current = { x: e.clientX, y: e.clientY };
    
    // Check if clicking on any nodes
    const clickedNode = doc.nodes
      .slice()
      .reverse() // Check from top to bottom (z-order)
      .find(node => {
        return isPointInBounds(worldPoint, {
          x: node.x,
          y: node.y,
          width: node.width,
          height: node.height,
        });
      });
    
    if (clickedNode) {
      // Node clicked
      if (tool === 'select') {
        selectNode(clickedNode.id, e.shiftKey);
        setDragging(true);
      }
    } else {
      // Empty canvas clicked
      if (tool === 'select') {
        // 默认左键拖拽画布；按住 Shift 才进入框选
        if (e.shiftKey) {
          clearSelection();
          setDrawingSelection(true, {
            x: screenPoint.x,
            y: screenPoint.y,
            width: 0,
            height: 0,
          });
          selectionStartScreenRef.current = { x: screenPoint.x, y: screenPoint.y };
        } else {
          // 先取消选择，然后准备拖拽
          clearSelection();
          setIsPanning(true);
          setDragging(true);
        }
      } else if (tool === 'text') {
        // Create text card
        addCard({
          type: 'text',
          x: snapToGrid ? snapPointToGrid(worldPoint, gridSize).x : worldPoint.x,
          y: snapToGrid ? snapPointToGrid(worldPoint, gridSize).y : worldPoint.y,
          width: 200,
          height: 40,
          z: 100,
          content: 'Double-click to edit',
        } as any);
        setTool('select');
      } else if (tool === 'text-card') {
        // Create text content card
        addCard({
          type: 'text-card',
          x: snapToGrid ? snapPointToGrid(worldPoint, gridSize).x : worldPoint.x,
          y: snapToGrid ? snapPointToGrid(worldPoint, gridSize).y : worldPoint.y,
          width: 280,
          height: 200,
          z: 100,
          title: 'New Card',
          bodyHtml: 'Click to edit content...',
        } as any);
        setTool('select');
      } else if (tool === 'figure-card') {
        // Create empty figure card with placeholder; image can be uploaded by clicking
        addCard({
          type: 'figure-card',
          x: snapToGrid ? snapPointToGrid(worldPoint, gridSize).x : worldPoint.x,
          y: snapToGrid ? snapPointToGrid(worldPoint, gridSize).y : worldPoint.y,
          width: 300,
          height: 200,
          z: 100,
          src: '',
          naturalWidth: 300,
          naturalHeight: 200,
          alt: '',
          caption: '',
          lockAspectRatio: false,
          aspectRatio: 300 / 200,
        } as any);
        setTool('select');
      } else if (tool === 'video-card') {
        // 空白视频卡片，等待用户粘贴 iframe 代码或链接
        addCard({
          type: 'video-card',
          x: snapToGrid ? snapPointToGrid(worldPoint, gridSize).x : worldPoint.x,
          y: snapToGrid ? snapPointToGrid(worldPoint, gridSize).y : worldPoint.y,
          width: 480,
          height: 270,
          z: 100,
          src: '',
          lockAspectRatio: true,
          aspectRatio: 16 / 9,
        } as any);
        setTool('select');
      }
    }
    
    canvasRef.current?.setPointerCapture(e.pointerId);
  }, [
    camera, 
    isSpacePressed, 
    tool, 
    doc.cards, 
    setDragging, 
    setIsPanning, 
    selectNode, 
    selectCard,
    clearSelection, 
    setDrawingSelection, 
    addNode, 
    addCard,
    setTool,
    gridSize,
    snapToGrid
  ]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    const worldPoint = screenToWorld(screenPoint, camera);
    
    if (isPanning) {
      // Check if we've moved enough to consider it a drag
      if (dragStartRef.current) {
        const deltaX = Math.abs(e.clientX - dragStartRef.current.x);
        const deltaY = Math.abs(e.clientY - dragStartRef.current.y);
        
        if (deltaX > dragThreshold || deltaY > dragThreshold) {
          // This is a real drag, pan the camera
          const deltaX = screenPoint.x - lastPointerPosition.x;
          const deltaY = screenPoint.y - lastPointerPosition.y;
          
          setCamera({
            x: camera.x + deltaX,
            y: camera.y + deltaY,
          });
        }
      }
    } else if (isDrawingSelection) {
      // Update selection box in screen coordinates using fixed start point
      const startPoint = selectionStartScreenRef.current ?? screenPoint;
      const endPoint = screenPoint;
      
      const newSelectionBox = {
        x: Math.min(startPoint.x, endPoint.x),
        y: Math.min(startPoint.y, endPoint.y),
        width: Math.abs(endPoint.x - startPoint.x),
        height: Math.abs(endPoint.y - startPoint.y),
      };
      
      setDrawingSelection(true, newSelectionBox);
    }
    
    setLastPointerPosition(screenPoint);
  }, [
    camera,
    setCamera,
    isPanning,
    isDrawingSelection,
    selectionBox,
    lastPointerPosition,
    setDrawingSelection
  ]);

  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (isPanning) {
      setIsPanning(false);
    }
    
    if (isDrawingSelection && selectionBox) {
      // Convert selection screen bounds back to world bounds for hit-test
      const worldSel = screenBoundsToWorld(selectionBox, camera);
      // Select nodes within selection box (world space)
      const selectedNodeIds = doc.nodes
        .filter(node => {
          const nodeBounds = {
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
          };
          
          return (
            worldSel.x <= nodeBounds.x &&
            worldSel.y <= nodeBounds.y &&
            worldSel.x + worldSel.width >= nodeBounds.x + nodeBounds.width &&
            worldSel.y + worldSel.height >= nodeBounds.y + nodeBounds.height
          );
        })
        .map(node => node.id);
      
      if (selectedNodeIds.length > 0) {
        useCanvasStore.getState().selectNodes(selectedNodeIds);
      }
      
      setDrawingSelection(false, null);
    }
    selectionStartScreenRef.current = null;
    dragStartRef.current = null;
    
    setDragging(false);
    canvasRef.current?.releasePointerCapture(e.pointerId);
  }, [isPanning, isDrawingSelection, selectionBox, doc.nodes, setDrawingSelection, setDragging]);

  // Set up wheel event listener
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  const gridOpacity = Math.min(0.5, camera.zoom * 0.3);
  
  return (
    <div
      ref={canvasRef}
      className={cn(
        'relative w-full h-full overflow-hidden bg-canvas-bg',
        isPanning && 'cursor-grabbing',
        isSpacePressed && !isPanning && 'cursor-grab',
        tool === 'text' && 'cursor-text',
        tool === 'text-card' && 'cursor-copy',
        tool === 'figure-card' && 'cursor-copy'
      )}
      style={{
        backgroundImage: `
          linear-gradient(rgba(0,0,0,${gridOpacity}) 1px, transparent 1px),
          linear-gradient(90deg, rgba(0,0,0,${gridOpacity}) 1px, transparent 1px)
        `,
        backgroundSize: `${gridSize * camera.zoom}px ${gridSize * camera.zoom}px`,
        backgroundPosition: `${camera.x % (gridSize * camera.zoom)}px ${camera.y % (gridSize * camera.zoom)}px`,
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDragOver={(e) => {
        e.preventDefault();
      }}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files || []);
        const image = files.find((f) => f.type.startsWith('image/'));
        const pdf = files.find((f) => f.type === 'application/pdf' || f.name.toLowerCase().endsWith('.pdf'));
        if (!image && !pdf) return;
        const rect = canvasRef.current?.getBoundingClientRect();
        if (!rect) return;
        const screenPoint = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        const worldPoint = screenToWorld(screenPoint, camera);
        if (image) {
          const url = URL.createObjectURL(image);
          const img = new Image();
          img.onload = () => {
            const naturalWidth = img.naturalWidth || img.width;
            const naturalHeight = img.naturalHeight || img.height;
            const aspect = naturalWidth / naturalHeight;
            addCard({
              type: 'figure-card',
              x: worldPoint.x,
              y: worldPoint.y,
              width: naturalWidth,
              height: naturalHeight,
              z: 100,
              src: url,
              naturalWidth,
              naturalHeight,
              lockAspectRatio: true,
              aspectRatio: aspect,
            } as any);
          };
          img.src = url;
        } else if (pdf) {
          const url = URL.createObjectURL(pdf);
          // 设置一个默认尺寸 (A4比例 ~ 1/1.414)，按屏幕可读尺寸
          const defaultWidth = 600;
          const defaultHeight = Math.round(defaultWidth / (1 / Math.SQRT2));
          addCard({
            type: 'pdf-card',
            x: worldPoint.x,
            y: worldPoint.y,
            width: defaultWidth,
            height: defaultHeight,
            z: 100,
            src: url,
            lockAspectRatio: true,
            aspectRatio: defaultWidth / defaultHeight,
          } as any);
        }
      }}
    >
      {/* Edges layer (Canvas/SVG) */}
      <EdgesLayer />
      
      {/* Nodes layer (DOM) */}
      <CardsLayer />
      
      {/* Overlay layer (selection box, etc.) */}
      <OverlayLayer />
    </div>
  );
}
