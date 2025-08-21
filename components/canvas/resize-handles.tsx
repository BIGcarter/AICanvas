'use client';

import React, { useCallback, useState } from 'react';
import { useCanvasStore } from '@/store/canvas.store';
import { screenToWorld } from '@/utils/transforms';

interface ResizeHandlesProps {
  nodeId: string; // Keep the same name for compatibility (can be card or node ID)
  isVisible: boolean;
  bounds: {
    left: number;
    top: number;
    width: number;
    height: number;
  };
}

type ResizeDirection = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

export function ResizeHandles({ nodeId, isVisible, bounds }: ResizeHandlesProps) {
  const [isResizing, setIsResizing] = useState(false);
  const [resizeDirection, setResizeDirection] = useState<ResizeDirection | null>(null);
  const [startBounds, setStartBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [startMousePos, setStartMousePos] = useState({ x: 0, y: 0 });

  const { updateNode, updateCard, camera, pushHistory, document: doc } = useCanvasStore();

  const handleMouseDown = useCallback((e: React.MouseEvent, direction: ResizeDirection) => {
    e.preventDefault();
    e.stopPropagation();

    // Try to find in cards first, then nodes for compatibility
    const card = doc.cards.find(c => c.id === nodeId);
    const node = card || doc.nodes?.find(n => n.id === nodeId);
    if (!node) return;

    setIsResizing(true);
    setResizeDirection(direction);
    setStartBounds({ x: node.x, y: node.y, width: node.width, height: node.height });
    setStartMousePos({ x: e.clientX, y: e.clientY });

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeDirection) return;

      const deltaX = e.clientX - startMousePos.x;
      const deltaY = e.clientY - startMousePos.y;

      // Convert screen deltas to world deltas
      const worldDeltaX = deltaX / camera.zoom;
      const worldDeltaY = deltaY / camera.zoom;

      let newBounds = { ...startBounds };

      // Calculate new bounds based on resize direction
      switch (direction) {
        case 'nw':
          newBounds.x = startBounds.x + worldDeltaX;
          newBounds.y = startBounds.y + worldDeltaY;
          newBounds.width = startBounds.width - worldDeltaX;
          newBounds.height = startBounds.height - worldDeltaY;
          break;
        case 'ne':
          newBounds.y = startBounds.y + worldDeltaY;
          newBounds.width = startBounds.width + worldDeltaX;
          newBounds.height = startBounds.height - worldDeltaY;
          break;
        case 'sw':
          newBounds.x = startBounds.x + worldDeltaX;
          newBounds.width = startBounds.width - worldDeltaX;
          newBounds.height = startBounds.height + worldDeltaY;
          break;
        case 'se':
          newBounds.width = startBounds.width + worldDeltaX;
          newBounds.height = startBounds.height + worldDeltaY;
          break;
        case 'n':
          newBounds.y = startBounds.y + worldDeltaY;
          newBounds.height = startBounds.height - worldDeltaY;
          break;
        case 's':
          newBounds.height = startBounds.height + worldDeltaY;
          break;
        case 'w':
          newBounds.x = startBounds.x + worldDeltaX;
          newBounds.width = startBounds.width - worldDeltaX;
          break;
        case 'e':
          newBounds.width = startBounds.width + worldDeltaX;
          break;
      }

      // Apply minimum size constraints
      const minWidth = 120;
      const minHeight = 80;

      if (newBounds.width < minWidth) {
        if (direction.includes('w')) {
          newBounds.x = startBounds.x + startBounds.width - minWidth;
        }
        newBounds.width = minWidth;
      }

      if (newBounds.height < minHeight) {
        if (direction.includes('n')) {
          newBounds.y = startBounds.y + startBounds.height - minHeight;
        }
        newBounds.height = minHeight;
      }

      // Update the card or node
      if (card) {
        updateCard(nodeId, {
          x: newBounds.x,
          y: newBounds.y,
          width: newBounds.width,
          height: newBounds.height,
        });
      } else {
        updateNode(nodeId, {
          x: newBounds.x,
          y: newBounds.y,
          width: newBounds.width,
          height: newBounds.height,
        });
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      setResizeDirection(null);
      pushHistory(); // Save to history when resize is complete
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [nodeId, updateNode, camera.zoom, startBounds, startMousePos, resizeDirection]);

  if (!isVisible || isResizing) return null;

  const handleSize = 8;
  const handleOffset = handleSize / 2;

  const handles: Array<{ direction: ResizeDirection; style: React.CSSProperties; cursor: string }> = [
    {
      direction: 'nw',
      style: { top: -handleOffset, left: -handleOffset },
      cursor: 'nw-resize'
    },
    {
      direction: 'ne',
      style: { top: -handleOffset, right: -handleOffset },
      cursor: 'ne-resize'
    },
    {
      direction: 'sw',
      style: { bottom: -handleOffset, left: -handleOffset },
      cursor: 'sw-resize'
    },
    {
      direction: 'se',
      style: { bottom: -handleOffset, right: -handleOffset },
      cursor: 'se-resize'
    },
    {
      direction: 'n',
      style: { top: -handleOffset, left: '50%', marginLeft: -handleOffset },
      cursor: 'n-resize'
    },
    {
      direction: 's',
      style: { bottom: -handleOffset, left: '50%', marginLeft: -handleOffset },
      cursor: 's-resize'
    },
    {
      direction: 'w',
      style: { top: '50%', left: -handleOffset, marginTop: -handleOffset },
      cursor: 'w-resize'
    },
    {
      direction: 'e',
      style: { top: '50%', right: -handleOffset, marginTop: -handleOffset },
      cursor: 'e-resize'
    },
  ];

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: bounds.left,
        top: bounds.top,
        width: bounds.width,
        height: bounds.height,
        zIndex: 10000,
      }}
    >
      {handles.map(({ direction, style, cursor }) => (
        <div
          key={direction}
          className="absolute pointer-events-auto bg-blue-500 border-2 border-white rounded-sm hover:bg-blue-600 transition-colors"
          style={{
            width: handleSize,
            height: handleSize,
            cursor,
            ...style,
          }}
          onMouseDown={(e) => handleMouseDown(e, direction)}
        />
      ))}
    </div>
  );
}
