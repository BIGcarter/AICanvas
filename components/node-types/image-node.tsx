'use client';

import React, { useState } from 'react';
import { ImageNode as ImageNodeType } from '@/types/canvas';
import { useCanvasStore } from '@/store/canvas.store';
import { cn } from '@/utils';

interface ImageNodeProps {
  node: ImageNodeType;
  style: React.CSSProperties;
}

export function ImageNode({ node, style }: ImageNodeProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  
  const { selectedIds, selectNode } = useCanvasStore();
  const isSelected = selectedIds.includes(node.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    selectNode(node.id, e.shiftKey);
  };

  const handleImageLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  const handleImageError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  const imageStyles = node.styles || {};

  return (
    <div
      style={style}
      className={cn(
        'node node-image pointer-events-auto',
        isSelected && 'selected',
        'transition-all duration-200 ease-out overflow-hidden'
      )}
      onClick={handleClick}
    >
      <div
        className="w-full h-full relative"
        style={{
          borderColor: imageStyles.borderColor || '#e5e7eb',
          borderWidth: imageStyles.borderWidth || 1,
          borderStyle: 'solid',
          borderRadius: imageStyles.borderRadius || 8,
          boxShadow: imageStyles.shadowBlur 
            ? `0 4px ${imageStyles.shadowBlur}px ${imageStyles.shadowColor || 'rgba(0,0,0,0.1)'}`
            : '0 2px 8px rgba(0, 0, 0, 0.1)',
          opacity: imageStyles.opacity || 1,
        }}
      >
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
            <div className="loading-skeleton w-8 h-8 rounded" />
          </div>
        )}
        
        {hasError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-gray-500">
            <div className="text-center">
              <div className="w-8 h-8 mx-auto mb-2 bg-gray-300 rounded" />
              <div className="text-xs">Failed to load</div>
            </div>
          </div>
        ) : (
          <img
            src={node.src}
            alt={node.alt || ''}
            className="w-full h-full object-cover"
            onLoad={handleImageLoad}
            onError={handleImageError}
            style={{
              display: isLoading ? 'none' : 'block',
            }}
          />
        )}
      </div>
      
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute inset-0 border-2 border-blue-500 rounded-lg pointer-events-none" />
      )}
    </div>
  );
}
