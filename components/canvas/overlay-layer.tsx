'use client';

import React from 'react';
import { useCanvasStore } from '@/store/canvas.store';
import { worldBoundsToScreen } from '@/utils/transforms';

export function OverlayLayer() {
  const { selectionBox, camera } = useCanvasStore();

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 1001 }}>
      {/* Selection box */}
      {selectionBox && (
        <div
          className="absolute border-2 border-dashed border-blue-500 bg-blue-500/10"
          style={{
            ...worldBoundsToScreen(selectionBox, camera),
          }}
        />
      )}
    </div>
  );
}
