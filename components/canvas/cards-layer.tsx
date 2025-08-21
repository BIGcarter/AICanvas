'use client';

import React from 'react';
import { useCanvasStore } from '@/store/canvas.store';
import { worldToScreen, isBoundsVisible } from '@/utils/transforms';
import { TextCardComponent } from '../cards/text-card';
import { TextContentCardComponent } from '../cards/text-content-card';
import { FigureCardComponent } from '../cards/figure-card';
import { PdfCardComponent } from '../cards/pdf-card';
import { VideoCardComponent } from '../cards/video-card';
import { AICardComponent } from '../cards/ai-card';
import { ResizeHandles } from './resize-handles';
import { AnyCard } from '@/types/canvas';
import { Button } from '@/components/ui/button';
import { useMemo } from 'react';

export function CardsLayer() {
  const { document: doc, camera, selectedIds } = useCanvasStore();

  // Filter visible cards for performance
  const visibleCards = doc.cards.filter((card: AnyCard) => {
    const bounds = {
      x: card.x,
      y: card.y,
      width: card.width,
      height: card.height,
    };
    return isBoundsVisible(bounds, camera);
  });

  // Sort cards by z-index
  const sortedCards = visibleCards.sort((a: AnyCard, b: AnyCard) => a.z - b.z);

  const renderCard = (card: AnyCard) => {
    const screenPosition = worldToScreen({ x: card.x, y: card.y }, camera);
    const screenSize = {
      width: card.width * camera.zoom,
      height: card.height * camera.zoom,
    };

    const baseStyle = {
      position: 'absolute' as const,
      left: screenPosition.x,
      top: screenPosition.y,
      width: screenSize.width,
      height: screenSize.height,
      transform: card.rotation ? `rotate(${card.rotation}deg)` : undefined,
      zIndex: card.z,
    };

    switch (card.type) {
      case 'text':
        return <TextCardComponent key={card.id} card={card} style={baseStyle} />;
      case 'text-card':
        return <TextContentCardComponent key={card.id} card={card} style={baseStyle} />;
      case 'figure-card':
        return <FigureCardComponent key={card.id} card={card} style={baseStyle} />;
      case 'ai-card':
        return <AICardComponent key={card.id} card={card as any} style={baseStyle} />;
      case 'pdf-card':
        return <PdfCardComponent key={card.id} card={card} style={baseStyle} />;
      case 'video-card':
        return <VideoCardComponent key={card.id} card={card} style={baseStyle} />;
      default:
        return null;
    }
  };

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1000 }}>
      {sortedCards.map(renderCard)}
      
      {/* Resize handles for selected cards */}
      {selectedIds.map((cardId: string) => {
        const card = doc.cards.find((c: AnyCard) => c.id === cardId);
        if (!card) return null;
        
        const screenPosition = worldToScreen({ x: card.x, y: card.y }, camera);
        const screenSize = {
          width: card.width * camera.zoom,
          height: card.height * camera.zoom,
        };
        
        // Only show resize handles if there's exactly one selected card
        const shouldShowHandles = selectedIds.length === 1;
        
        return (
          <ResizeHandles
            key={`resize-${cardId}`}
            nodeId={cardId} // Keep the same prop name for compatibility
            isVisible={shouldShowHandles}
            bounds={{
              left: screenPosition.x,
              top: screenPosition.y,
              width: screenSize.width,
              height: screenSize.height,
            }}
          />
        );
      })}

      {/* External edit controls removed per request */}
    </div>
  );
}
