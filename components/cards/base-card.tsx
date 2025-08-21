'use client';

import React, { useState, useRef, useCallback } from 'react';
import { BaseCard } from '@/types/canvas';
import { useCanvasStore } from '@/store/canvas.store';
import { GridAlignmentUtil } from '@/utils/grid-alignment';

type ResizeHandle = 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

interface BaseCardProps {
  card: BaseCard;
  style: React.CSSProperties;
  children: React.ReactNode;
  onEdit?: () => void;
  onSaveEdit?: () => void; // 新增：保存编辑的回调
  className?: string;
  // 当为 true 时，只允许通过具有 data-drag-handle="true" 的元素触发拖拽
  dragFromHandleOnly?: boolean;
}

export function BaseCardComponent({
  card,
  style,
  children,
  onEdit,
  onSaveEdit,
  className,
  dragFromHandleOnly = false,
}: BaseCardProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<ResizeHandle | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [startBounds, setStartBounds] = useState({ x: 0, y: 0, width: 0, height: 0 });
  
  const cardRef = useRef<HTMLDivElement>(null);
  
  const { 
    selectedIds, 
    updateCard, 
    selectCard, 
    camera, 
    gridSize, 
    snapToGrid 
  } = useCanvasStore();

  const isSelected = selectedIds.includes(card.id);
  const gridAlignment = new GridAlignmentUtil(card.gridSize || gridSize);

  // 处理拖拽开始
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button !== 0) return; // 只处理左键
    if (isResizing) return; // 如果正在调整大小，忽略拖拽
    
    // 检查是否点击了可编辑元素
    const target = e.target as HTMLElement;
    const dragHandle = target.closest('[data-drag-handle="true"]');
    // 若要求"仅手柄可拖拽"，且当前目标不在手柄内，则不启动拖拽
    if (dragFromHandleOnly && !dragHandle) {
      return;
    }
    const isEditableElement = target.closest('input, textarea, [contenteditable="true"]');
    
    if (isEditableElement) {
      // 如果点击了可编辑元素，不启动拖拽
      return;
    }
    
    // 检查是否点击了按钮或其他交互元素
    const isInteractiveElement = target.closest('button, [role="button"], .cursor-pointer, [data-formatting-toolbar="true"]');
    // 若是交互元素，但它也是手柄，则允许拖拽
    if (isInteractiveElement && !dragHandle) {
      // 如果点击了交互元素，不启动拖拽
      return;
    }
    
    // 如果点击了卡片区域（非编辑元素），且有保存编辑的回调，先保存编辑
    // 但避免在双击过程中触发（第二次按下 detail===2），否则会导致刚进入编辑又立刻被保存退出
    if (onSaveEdit && e.detail < 2 && target.closest(`[data-card-id="${card.id}"]`)) {
      onSaveEdit();
    }
    
    // 只在真正需要拖拽时才阻止事件
    e.preventDefault();
    e.stopPropagation();
    
    // 记录起始鼠标位置和卡片世界坐标
    setDragOffset({
      x: e.clientX,
      y: e.clientY,
    });
    setIsDragging(true);
    
    // 选中当前卡片
    if (!isSelected) {
      selectCard(card.id, e.shiftKey);
    }
    
    cardRef.current?.setPointerCapture(e.pointerId);
  }, [card.id, isSelected, selectCard, isResizing, onSaveEdit]);

  // 处理拖拽移动
  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging || isResizing) return;
    
    // 移除e.preventDefault()，避免阻止子组件事件
    
    // 计算鼠标移动的距离（屏幕坐标）
    const deltaScreenX = e.clientX - dragOffset.x;
    const deltaScreenY = e.clientY - dragOffset.y;
    
    // 转换为世界坐标的移动距离
    const deltaWorldX = deltaScreenX / camera.zoom;
    const deltaWorldY = deltaScreenY / camera.zoom; // Corrected deltaY to deltaScreenY
    
    // 计算新的世界坐标位置
    const newWorldX = card.x + deltaWorldX;
    const newWorldY = card.y + deltaWorldY;
    
    // 更新卡片位置
    updateCard(card.id, {
      x: newWorldX,
      y: newWorldY,
    });
    
    // 更新拖拽偏移量
    setDragOffset({ x: e.clientX, y: e.clientY });
  }, [
    isDragging, 
    isResizing,
    dragOffset, 
    camera, 
    card.x,
    card.y,
    card.id,
    updateCard
  ]);

  // 处理拖拽结束
  const handlePointerUp = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    
    setIsDragging(false);
    
    // 最终对齐到网格
    if (card.snapToGrid && snapToGrid) {
      const currentBounds = {
        x: card.x,
        y: card.y,
        width: card.width,
        height: card.height,
      };
      
      const alignedBounds = gridAlignment.snapBounds(currentBounds);
      
      updateCard(card.id, {
        x: alignedBounds.x,
        y: alignedBounds.y,
        width: alignedBounds.width,
        height: alignedBounds.height,
      });
    }
    
    cardRef.current?.releasePointerCapture(e.pointerId);
  }, [isDragging, card, gridAlignment, snapToGrid, updateCard]);

  // 处理调整大小开始
  const handleResizeStart = useCallback((e: React.PointerEvent, handle: ResizeHandle) => {
    e.preventDefault();
    e.stopPropagation();
    
    const startX = e.clientX;
    const startY = e.clientY;
    const startBounds = { x: card.x, y: card.y, width: card.width, height: card.height };
    
    setIsResizing(true);
    setResizeHandle(handle);
    setDragOffset({ x: startX, y: startY });
    setStartBounds(startBounds);
    
    // 选中当前卡片
    if (!isSelected) {
      selectCard(card.id, e.shiftKey);
    }
    
    // 直接在这里定义事件处理器，避免依赖问题
    const mouseMoveHandler = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // 转换为世界坐标的移动距离
      const worldDeltaX = deltaX / camera.zoom;
      const worldDeltaY = deltaY / camera.zoom;
      
      let newBounds = { ...startBounds };
      const minSize = 20; // 最小尺寸
      
      // 根据拖拽的手柄计算新的边界
      switch (handle) {
        case 'nw': // 左上角
          newBounds.x = startBounds.x + worldDeltaX;
          newBounds.y = startBounds.y + worldDeltaY;
          newBounds.width = startBounds.width - worldDeltaX;
          newBounds.height = startBounds.height - worldDeltaY;
          break;
        case 'ne': // 右上角
          newBounds.y = startBounds.y + worldDeltaY;
          newBounds.width = startBounds.width + worldDeltaX;
          newBounds.height = startBounds.height - worldDeltaY;
          break;
        case 'sw': // 左下角
          newBounds.x = startBounds.x + worldDeltaX;
          newBounds.width = startBounds.width - worldDeltaX;
          newBounds.height = startBounds.height + worldDeltaY;
          break;
        case 'se': // 右下角
          newBounds.width = startBounds.width + worldDeltaX;
          newBounds.height = startBounds.height + worldDeltaY;
          break;
        case 'n': // 上边
          newBounds.y = startBounds.y + worldDeltaY;
          newBounds.height = startBounds.height - worldDeltaY;
          break;
        case 's': // 下边
          newBounds.height = startBounds.height + worldDeltaY;
          break;
        case 'w': // 左边
          newBounds.x = startBounds.x + worldDeltaX;
          newBounds.width = startBounds.width - worldDeltaX;
          break;
        case 'e': // 右边
          newBounds.width = startBounds.width + worldDeltaX;
          break;
      }
      
      // 确保最小尺寸
      if (newBounds.width < minSize) {
        if (handle.includes('w')) {
          newBounds.x = startBounds.x + startBounds.width - minSize;
        }
        newBounds.width = minSize;
      }
      if (newBounds.height < minSize) {
        if (handle.includes('n')) {
          newBounds.y = startBounds.y + startBounds.height - minSize;
        }
        newBounds.height = minSize;
      }
      
      // 若卡片设置锁定长宽比，则根据起始宽高计算比例并强制约束
      if ((card as any).lockAspectRatio && (card as any).aspectRatio && resizeHandle) {
        const aspect = (card as any).aspectRatio as number;
        // 以宽为基准调整高，或以高为基准调整宽，取更接近拖动的那个
        const widthDrivenHeight = newBounds.width / aspect;
        const heightDrivenWidth = newBounds.height * aspect;
        // 选择与用户拖动方向更接近的调整方式
        if (resizeHandle === 'e' || resizeHandle === 'w') {
          // 水平拖动，以宽控制高
          newBounds.height = widthDrivenHeight;
          if (resizeHandle === 'w') {
            newBounds.y = startBounds.y + (startBounds.height - newBounds.height);
          }
        } else if (resizeHandle === 'n' || resizeHandle === 's') {
          // 垂直拖动，以高控制宽
          newBounds.width = heightDrivenWidth;
          if (resizeHandle === 'n') {
            newBounds.x = startBounds.x + (startBounds.width - newBounds.width);
          }
        } else {
          // 角拖动，同时约束，优先以宽控制高
          const heightFromWidth = widthDrivenHeight;
          const widthFromHeight = heightDrivenWidth;
          // 取变更更小的那一个，避免抖动
          const dw = Math.abs(newBounds.width - startBounds.width);
          const dh = Math.abs(newBounds.height - startBounds.height);
          if (dw >= dh) {
            newBounds.height = heightFromWidth;
          } else {
            newBounds.width = widthFromHeight;
          }
          // 调整对齐基点
          if (resizeHandle.includes('n')) {
            newBounds.y = startBounds.y + (startBounds.height - newBounds.height);
          }
          if (resizeHandle.includes('w')) {
            newBounds.x = startBounds.x + (startBounds.width - newBounds.width);
          }
        }
      }

      // 应用网格对齐（恢复为对位置与尺寸都进行网格吸附）
      if (card.snapToGrid && snapToGrid) {
        const alignedBounds = gridAlignment.snapBounds(newBounds);
        newBounds = alignedBounds;
      }
      
      // 更新卡片
      updateCard(card.id, newBounds);
    };
    
    const mouseUpHandler = (e: MouseEvent) => {
      setIsResizing(false);
      setResizeHandle(null);
      
      // 移除事件监听器
      document.removeEventListener('mousemove', mouseMoveHandler);
      document.removeEventListener('mouseup', mouseUpHandler);
    };
    
    document.addEventListener('mousemove', mouseMoveHandler);
    document.addEventListener('mouseup', mouseUpHandler);
  }, [card, isSelected, selectCard, camera, snapToGrid, gridAlignment, updateCard]);

  // 合并样式
  const cardStyles = card.styles || {};
  const isTextCard = card.type === 'text';
  const combinedStyle: React.CSSProperties = {
    ...style,
    // 让纯 text card 透明，选中时显示细虚线边框
    backgroundColor: isTextCard ? 'transparent' : (cardStyles.backgroundColor || 'white'),
    borderColor: isTextCard ? (isSelected ? '#3b82f6' : 'transparent') : (cardStyles.borderColor || '#e5e7eb'),
    borderWidth: isTextCard ? (isSelected ? 1 : 0) : (cardStyles.borderWidth || 1),
    borderStyle: isTextCard ? (isSelected ? 'dashed' : 'none') : 'solid',
    borderRadius: isTextCard ? 0 : (cardStyles.borderRadius || 8),
    boxShadow: isTextCard
      ? 'none'
      : cardStyles.shadowBlur 
        ? `0 4px ${cardStyles.shadowBlur}px ${cardStyles.shadowColor || 'rgba(0,0,0,0.1)'}`
        : '0 2px 8px rgba(0, 0, 0, 0.1)',
    padding: cardStyles.padding || 0,
    opacity: cardStyles.opacity || 1,
    cursor: isDragging ? 'grabbing' : 'grab',
  };

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEdit) {
      onEdit();
    }
  }, [onEdit]);

  return (
    <>
      <div
        ref={cardRef}
        data-card-id={card.id}
        style={combinedStyle}
        className={`card pointer-events-auto transition-all duration-200 ease-out overflow-hidden ${
          isSelected && !isTextCard ? 'ring-2 ring-blue-500 ring-offset-2' : ''
        } ${isDragging ? 'z-50 shadow-2xl' : ''} ${className || ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onDoubleClick={onEdit ? handleDoubleClick : undefined}
      >
        {children}
      </div>
      
      {/* 调整大小手柄 */}
      {isSelected && !isDragging && !isResizing && (
        <>
          {/* 四角手柄 */}
          <div 
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm pointer-events-auto cursor-nw-resize hover:bg-blue-600 transition-colors"
            style={{ 
              top: (style.top as number) - 4, 
              left: (style.left as number) - 4,
              zIndex: 10002,
            }}
            onPointerDown={(e) => handleResizeStart(e, 'nw')}
          />
          <div 
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm pointer-events-auto cursor-ne-resize hover:bg-blue-600 transition-colors"
            style={{ 
              top: (style.top as number) - 4, 
              left: (style.left as number) + (style.width as number) + 2,
              zIndex: 10002,
            }}
            onPointerDown={(e) => handleResizeStart(e, 'ne')}
          />
          <div 
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm pointer-events-auto cursor-sw-resize hover:bg-blue-600 transition-colors"
            style={{ 
              top: (style.top as number) + (style.height as number) + 2,
              left: (style.left as number) - 4,
              zIndex: 10002,
            }}
            onPointerDown={(e) => handleResizeStart(e, 'sw')}
          />
          <div 
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm pointer-events-auto cursor-se-resize hover:bg-blue-600 transition-colors"
            style={{ 
              top: (style.top as number) + (style.height as number) + 2,
              left: (style.left as number) + (style.width as number) + 2,
              zIndex: 10002,
            }}
            onPointerDown={(e) => handleResizeStart(e, 'se')}
          />
          
          {/* 四边手柄 */}
          <div 
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm pointer-events-auto cursor-n-resize hover:bg-blue-600 transition-colors"
            style={{ 
              top: (style.top as number) - 4, 
              left: (style.left as number) + (style.width as number) / 2 - 1,
              zIndex: 10002,
            }}
            onPointerDown={(e) => handleResizeStart(e, 'n')}
          />
          <div 
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm pointer-events-auto cursor-s-resize hover:bg-blue-600 transition-colors"
            style={{ 
              top: (style.top as number) + (style.height as number) + 2,
              left: (style.left as number) + (style.width as number) / 2 - 1,
              zIndex: 10002,
            }}
            onPointerDown={(e) => handleResizeStart(e, 's')}
          />
          <div 
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm pointer-events-auto cursor-w-resize hover:bg-blue-600 transition-colors"
            style={{ 
              top: (style.top as number) + (style.height as number) / 2 - 1,
              left: (style.left as number) - 4,
              zIndex: 10002,
            }}
            onPointerDown={(e) => handleResizeStart(e, 'w')}
          />
          <div 
            className="absolute w-2 h-2 bg-blue-500 border border-white rounded-sm pointer-events-auto cursor-e-resize hover:bg-blue-600 transition-colors"
            style={{ 
              top: (style.top as number) + (style.height as number) / 2 - 1,
              left: (style.left as number) + (style.width as number) + 2,
              zIndex: 10002,
            }}
            onPointerDown={(e) => handleResizeStart(e, 'e')}
          />
        </>
      )}
    </>
  );
}
