'use client';

import React, { useEffect } from 'react';
import { Toolbar } from '@/components/toolbar/toolbar';
import { CanvasRoot } from '@/components/canvas/canvas-root';
import { AIDock } from '@/components/ai-dock/ai-dock';
import { ModelSelector } from '@/components/ai/model-selector';
import { useCanvasStore } from '@/store/canvas.store';

export default function HomePage() {
  const { undo, redo, canUndo, canRedo, copy, cut, paste, selectAll, clearSelection } = useCanvasStore();

  // Set up keyboard shortcuts and clipboard paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      const activeElement = document.activeElement as HTMLElement | null;
      const isInputElement = !!activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.getAttribute('contenteditable') === 'true'
      );
      
      if (isCtrlOrCmd) {
        // 当焦点在输入/文本区域时，不拦截系统快捷键（允许粘贴/复制/剪切等）
        if (isInputElement) return;
        // 若当前存在文本选择，且选择位于可选择的内容区域，则不要拦截复制
        const sel = window.getSelection && window.getSelection();
        if (sel && !sel.isCollapsed) {
          const anchor = sel.anchorNode as Node | null;
          const el = (anchor && (anchor as any).nodeType === 1 ? (anchor as Element) : (anchor?.parentElement || null)) as HTMLElement | null;
          if (el && el.closest('[data-text-selectable="true"]')) {
            if (e.key.toLowerCase() === 'c') return; // 允许 Cmd/Ctrl+C 原生复制
          }
        }
        switch (e.key.toLowerCase()) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              if (canRedo()) redo();
            } else {
              if (canUndo()) undo();
            }
            break;
          case 'y':
            e.preventDefault();
            if (canRedo()) redo();
            break;
          case 'c':
            e.preventDefault();
            copy();
            break;
          case 'x':
            e.preventDefault();
            cut();
            break;
          case 'v':
            e.preventDefault();
            paste();
            break;
          case 'a':
            e.preventDefault();
            selectAll();
            break;
          case 'd':
            e.preventDefault();
            // Duplicate functionality would go here
            break;
        }
      }
      
      if (e.key === 'Escape') {
        clearSelection();
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        // 检查焦点是否在输入框或文本区域中，如果是则不删除卡片
        const activeElement = document.activeElement;
        const isInputElement = activeElement && (
          activeElement.tagName === 'INPUT' ||
          activeElement.tagName === 'TEXTAREA' ||
          activeElement.getAttribute('contenteditable') === 'true'
        );
        
        if (!isInputElement) {
          const selectedIds = useCanvasStore.getState().selectedIds;
          if (selectedIds.length > 0) {
            selectedIds.forEach(id => {
              useCanvasStore.getState().deleteCard(id);
            });
          }
        }
      }
    };

    // Handle clipboard paste for images - TODO: Implement in next version
    /*
    const handlePaste = async (e: ClipboardEvent) => {
      console.log('Paste event detected');
      const items = e.clipboardData?.items;
      if (!items) {
        console.log('No clipboard items');
        return;
      }
      
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        console.log('Clipboard item:', item.type);
        if (item.type.indexOf('image') !== -1) {
          console.log('Image found in clipboard');
          e.preventDefault();
          const blob = item.getAsFile();
          if (blob) {
            const reader = new FileReader();
            reader.onload = (event) => {
              const dataUrl = event.target?.result as string;
              if (dataUrl) {
                // Create image to get natural dimensions
                const img = new Image();
                img.onload = () => {
                  // Create image card at center of viewport
                  const canvas = document.querySelector('.canvas-root') as HTMLElement;
                  if (canvas) {
                    const rect = canvas.getBoundingClientRect();
                    const centerX = rect.width / 2;
                    const centerY = rect.height / 2;
                    
                    // Calculate card dimensions maintaining aspect ratio
                    const maxWidth = 400;
                    const maxHeight = 300;
                    let cardWidth = img.naturalWidth;
                    let cardHeight = img.naturalHeight;
                    
                    if (cardWidth > maxWidth || cardHeight > maxHeight) {
                      const ratio = Math.min(maxWidth / cardWidth, maxHeight / cardHeight);
                      cardWidth = cardWidth * ratio;
                      cardHeight = cardHeight * ratio;
                    }
                    
                    // Add image card to store
                    const { addCard } = useCanvasStore.getState();
                    addCard({
                      type: 'figure-card',
                      x: centerX - cardWidth / 2,
                      y: centerY - cardHeight / 2,
                      width: cardWidth,
                      height: cardHeight,
                      src: dataUrl,
                      naturalWidth: img.naturalWidth,
                      naturalHeight: img.naturalHeight,
                      z: 1,
                      gridSize: 20,
                      snapToGrid: true
                    } as any);
                  }
                };
                img.src = dataUrl;
              }
            };
            reader.readAsDataURL(blob);
          }
          break;
        }
      }
    };
    */

    window.addEventListener('keydown', handleKeyDown);
    // document.addEventListener('paste', handlePaste); // TODO: Enable in next version
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      // document.removeEventListener('paste', handlePaste); // TODO: Enable in next version
    };
  }, [undo, redo, canUndo, canRedo, copy, cut, paste, selectAll, clearSelection]);

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Toolbar */}
      <Toolbar />
      
      {/* Main Canvas Area */}
      <div className="flex-1 relative overflow-hidden">
        <CanvasRoot />
        <ModelSelector />
      </div>
      
      {/* Bottom AI Dock */}
      <AIDock />
    </div>
  );
}
