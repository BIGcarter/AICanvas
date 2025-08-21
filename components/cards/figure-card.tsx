'use client';

import React, { useState, useRef, useEffect } from 'react';
import { FigureCard } from '@/types/canvas';
import { BaseCardComponent } from '@/components/cards/base-card';
import { useCanvasStore } from '@/store/canvas.store';

interface FigureCardProps {
  card: FigureCard;
  style: React.CSSProperties;
}

export function FigureCardComponent({ card, style }: FigureCardProps) {
  const [isEditingCaption, setIsEditingCaption] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [captionValue, setCaptionValue] = useState(card.caption || '');
  
  const captionInputRef = useRef<HTMLInputElement>(null);
  
  const { updateCard } = useCanvasStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleEdit = () => {
    // Default to editing caption when double-clicking the card
    setIsEditingCaption(true);
    setCaptionValue(card.caption || '');
  };

  const openPicker = () => fileInputRef.current?.click();

  const onFilePicked = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const naturalWidth = img.naturalWidth || img.width;
      const naturalHeight = img.naturalHeight || img.height;
      const aspect = naturalWidth / naturalHeight;
      updateCard(card.id, {
        src: url,
        naturalWidth,
        naturalHeight,
        width: naturalWidth,
        height: naturalHeight,
        // 不再强制锁定长宽比
      } as any);
      setIsLoading(false);
      setHasError(false);
    };
    img.onerror = () => setHasError(true);
    img.src = url;
  };

  const handleCaptionComplete = () => {
    setIsEditingCaption(false);
    if (captionValue !== (card.caption || '')) {
      updateCard(card.id, { caption: captionValue });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation();
    
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleCaptionComplete();
    } else if (e.key === 'Escape') {
      setIsEditingCaption(false);
      setCaptionValue(card.caption || '');
    }
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingCaption && captionInputRef.current) {
      captionInputRef.current.focus();
      captionInputRef.current.select();
    }
  }, [isEditingCaption]);

  // Update local state when card caption changes
  useEffect(() => {
    setCaptionValue(card.caption || '');
    if (!card.src) {
      setIsLoading(false);
      setHasError(false);
    }
  }, [card.caption]);

  const figureStyles = card.figureStyles || {};
  const captionPosition = figureStyles.captionPosition || 'bottom';
  const objectFit = figureStyles.objectFit || 'cover';

  const renderCaption = () => {
    if (!card.caption && !isEditingCaption) return null;

    return (
      <div 
        className={`caption px-3 py-2 ${captionPosition === 'overlay' ? 'absolute bottom-0 left-0 right-0 bg-black bg-opacity-50' : ''}`}
        style={{
          color: figureStyles.captionColor || (captionPosition === 'overlay' ? 'white' : '#64748b'),
        }}
      >
        {isEditingCaption ? (
          <input
            ref={captionInputRef}
            value={captionValue}
            onChange={(e) => setCaptionValue(e.target.value)}
            onBlur={handleCaptionComplete}
            onKeyDown={handleKeyDown}
            className="w-full border-none outline-none bg-transparent text-sm"
            style={{
              color: 'inherit',
            }}
            placeholder="Image caption..."
          />
        ) : (
          <div
            className="text-sm cursor-text select-none"
            onDoubleClick={() => {
              setIsEditingCaption(true);
              setCaptionValue(card.caption || '');
            }}
            title="Double-click to edit caption"
          >
            {card.caption}
          </div>
        )}
      </div>
    );
  };

  return (
    <BaseCardComponent
      card={card}
      style={style}
      onEdit={handleEdit}
      className="figure-card"
    >
      <div className="w-full h-full flex flex-col relative">
        {/* Caption on top */}
        {captionPosition === 'top' && renderCaption()}
        
        {/* Image container */}
        <div className="flex-1 relative overflow-hidden bg-gray-100">
          {/* Show placeholder when there is no src */}
          {!card.src && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                className="px-3 py-1 rounded-md bg-white/70 border border-gray-300 text-sm text-gray-600 hover:bg-white hover:text-gray-800 shadow-sm cursor-pointer"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); (e as any).nativeEvent?.stopImmediatePropagation?.(); openPicker(); }}
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); (e as any).nativeEvent?.stopImmediatePropagation?.(); }}
                title="click to upload image..."
              >
                click to upload image...
              </button>
            </div>
          )}

          {/* Spinner while loading an existing src */}
          {card.src && isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
            </div>
          )}

          {/* Error UI if src present but failed */}
          {card.src && hasError && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <div className="w-12 h-12 mx-auto mb-2 bg-gray-300 rounded flex items-center justify-center">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="text-xs">Failed to load image</div>
              </div>
            </div>
          )}

          {/* Render image only when src is present */}
          {card.src && !hasError && (
            <img
              src={card.src}
              alt={card.alt || card.caption || ''}
              className="w-full h-full select-none"
              style={{
                objectFit,
                display: isLoading ? 'none' : 'block',
              }}
              draggable={false}
              onLoad={handleImageLoad}
              onError={handleImageError}
            />
          )}

          {/* Placeholder when no image */}
          {!card.src && (
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                className="px-3 py-1 rounded-md bg-white/70 border border-gray-300 text-sm text-gray-600 hover:bg-white hover:text-gray-800 shadow-sm cursor-pointer"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); (e as any).nativeEvent?.stopImmediatePropagation?.(); openPicker(); }}
                onPointerDown={(e) => { e.preventDefault(); e.stopPropagation(); (e as any).nativeEvent?.stopImmediatePropagation?.(); }}
                title="click to upload image..."
              >
                click to upload image...
              </button>
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFilePicked}
          />
          
          {/* Overlay caption */}
          {captionPosition === 'overlay' && renderCaption()}
        </div>
        
        {/* Caption on bottom */}
        {captionPosition === 'bottom' && renderCaption()}
      </div>
      
      {/* Editing indicator */}
      {isEditingCaption && (
        <div className="absolute -top-8 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded pointer-events-none">
          Editing caption...
        </div>
      )}
    </BaseCardComponent>
  );
}
