'use client';

import React from 'react';
import { PdfCard } from '@/types/canvas';
import { BaseCardComponent } from '@/components/cards/base-card';

interface PdfCardProps {
  card: PdfCard;
  style: React.CSSProperties;
}

export function PdfCardComponent({ card, style }: PdfCardProps) {
  // 使用浏览器内置 PDF Viewer，通过 <embed> 或 <iframe>
  const aspect = card.aspectRatio || (card.width && card.height ? card.width / card.height : 4 / 3);

  return (
    <BaseCardComponent card={card} style={style} className="pdf-card" dragFromHandleOnly>
      <div className="w-full h-full overflow-hidden bg-gray-50 relative">
        {/* 左上角拖拽手柄 */}
        <div
          data-drag-handle="true"
          className="absolute top-2 left-2 w-4 h-4 rounded-full bg-white/90 border border-gray-400 shadow-sm cursor-grab"
          title="Drag to move PDF card"
        />
        {card.src ? (
          <embed src={card.src} type="application/pdf" className="w-full h-full" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
            Drag & drop a PDF here...
          </div>
        )}
      </div>
    </BaseCardComponent>
  );
}


