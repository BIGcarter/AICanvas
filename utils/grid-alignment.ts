import { Point, Bounds } from '@/types/canvas';

// 临时定义这些类型，直到我们完全迁移
export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number;
  isEdge: boolean;
}

export interface GridAlignment {
  gridSize: number;
  snapBounds: (bounds: Bounds) => Bounds;
  snapPoint: (point: Point) => Point;
  isAligned: (bounds: Bounds) => boolean;
  getSnapLines: (bounds: Bounds) => SnapLine[];
}

/**
 * 网格对齐工具类
 */
export class GridAlignmentUtil implements GridAlignment {
  constructor(public gridSize: number = 20) {}

  /**
   * 将点对齐到网格
   */
  snapPoint(point: Point): Point {
    return {
      x: Math.round(point.x / this.gridSize) * this.gridSize,
      y: Math.round(point.y / this.gridSize) * this.gridSize,
    };
  }

  /**
   * 将边界框对齐到网格
   * 确保所有四个角都对齐到网格点
   */
  snapBounds(bounds: Bounds): Bounds {
    // 对齐左上角
    const snappedTopLeft = this.snapPoint({ x: bounds.x, y: bounds.y });
    
    // 对齐右下角
    const bottomRight = {
      x: bounds.x + bounds.width,
      y: bounds.y + bounds.height,
    };
    const snappedBottomRight = this.snapPoint(bottomRight);
    
    // 计算新的宽度和高度，确保至少保持最小网格大小
    const newWidth = Math.max(this.gridSize, snappedBottomRight.x - snappedTopLeft.x);
    const newHeight = Math.max(this.gridSize, snappedBottomRight.y - snappedTopLeft.y);
    
    return {
      x: snappedTopLeft.x,
      y: snappedTopLeft.y,
      width: newWidth,
      height: newHeight,
    };
  }

  /**
   * 检查边界框是否已对齐到网格
   */
  isAligned(bounds: Bounds): boolean {
    const tolerance = 1; // 1px容差
    
    // 检查所有四个角是否对齐
    const corners = [
      { x: bounds.x, y: bounds.y }, // 左上
      { x: bounds.x + bounds.width, y: bounds.y }, // 右上
      { x: bounds.x, y: bounds.y + bounds.height }, // 左下
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, // 右下
    ];
    
    return corners.every(corner => {
      const snapped = this.snapPoint(corner);
      return (
        Math.abs(corner.x - snapped.x) <= tolerance &&
        Math.abs(corner.y - snapped.y) <= tolerance
      );
    });
  }

  /**
   * 获取对齐提示线
   */
  getSnapLines(bounds: Bounds): SnapLine[] {
    const lines: SnapLine[] = [];
    
    // 垂直对齐线（左边、中心、右边）
    lines.push(
      {
        type: 'vertical',
        position: bounds.x,
        isEdge: true,
      },
      {
        type: 'vertical',
        position: bounds.x + bounds.width / 2,
        isEdge: false,
      },
      {
        type: 'vertical',
        position: bounds.x + bounds.width,
        isEdge: true,
      }
    );
    
    // 水平对齐线（上边、中心、下边）
    lines.push(
      {
        type: 'horizontal',
        position: bounds.y,
        isEdge: true,
      },
      {
        type: 'horizontal',
        position: bounds.y + bounds.height / 2,
        isEdge: false,
      },
      {
        type: 'horizontal',
        position: bounds.y + bounds.height,
        isEdge: true,
      }
    );
    
    return lines;
  }

  /**
   * 获取最近的网格线
   */
  getNearestGridLines(point: Point, threshold: number = 10): SnapLine[] {
    const lines: SnapLine[] = [];
    
    // 最近的垂直网格线
    const nearestVerticalGrid = Math.round(point.x / this.gridSize) * this.gridSize;
    if (Math.abs(point.x - nearestVerticalGrid) <= threshold) {
      lines.push({
        type: 'vertical',
        position: nearestVerticalGrid,
        isEdge: true,
      });
    }
    
    // 最近的水平网格线
    const nearestHorizontalGrid = Math.round(point.y / this.gridSize) * this.gridSize;
    if (Math.abs(point.y - nearestHorizontalGrid) <= threshold) {
      lines.push({
        type: 'horizontal',
        position: nearestHorizontalGrid,
        isEdge: true,
      });
    }
    
    return lines;
  }

  /**
   * 智能对齐：在拖拽过程中提供对齐建议
   */
  getSmartSnapBounds(
    currentBounds: Bounds,
    otherBounds: Bounds[],
    threshold: number = 10
  ): { bounds: Bounds; snapLines: SnapLine[] } {
    let bestBounds = currentBounds;
    const snapLines: SnapLine[] = [];
    
    // 首先尝试网格对齐
    const gridAligned = this.snapBounds(currentBounds);
    const gridDistance = this.getBoundsDistance(currentBounds, gridAligned);
    
    if (gridDistance <= threshold) {
      bestBounds = gridAligned;
      snapLines.push(...this.getSnapLines(gridAligned));
    }
    
    // 然后尝试与其他元素对齐
    for (const otherBound of otherBounds) {
      const alignedBounds = this.getAlignedBounds(currentBounds, otherBound);
      const alignDistance = this.getBoundsDistance(currentBounds, alignedBounds);
      
      if (alignDistance < gridDistance && alignDistance <= threshold) {
        bestBounds = alignedBounds;
        snapLines.length = 0; // 清除网格线
        snapLines.push(...this.getSnapLines(alignedBounds));
      }
    }
    
    return { bounds: bestBounds, snapLines };
  }

  /**
   * 计算两个边界框之间的距离
   */
  private getBoundsDistance(bounds1: Bounds, bounds2: Bounds): number {
    const dx = bounds1.x - bounds2.x;
    const dy = bounds1.y - bounds2.y;
    const dw = bounds1.width - bounds2.width;
    const dh = bounds1.height - bounds2.height;
    
    return Math.sqrt(dx * dx + dy * dy + dw * dw + dh * dh);
  }

  /**
   * 获取与另一个边界框对齐的位置
   */
  private getAlignedBounds(bounds: Bounds, target: Bounds): Bounds {
    let newBounds = { ...bounds };
    
    // 左对齐
    if (Math.abs(bounds.x - target.x) < Math.abs(bounds.x - (target.x + target.width))) {
      newBounds.x = target.x;
    }
    // 右对齐
    else if (Math.abs(bounds.x + bounds.width - (target.x + target.width)) < 10) {
      newBounds.x = target.x + target.width - bounds.width;
    }
    
    // 上对齐
    if (Math.abs(bounds.y - target.y) < Math.abs(bounds.y - (target.y + target.height))) {
      newBounds.y = target.y;
    }
    // 下对齐
    else if (Math.abs(bounds.y + bounds.height - (target.y + target.height)) < 10) {
      newBounds.y = target.y + target.height - bounds.height;
    }
    
    return newBounds;
  }
}

/**
 * 默认网格对齐实例
 */
export const defaultGridAlignment = new GridAlignmentUtil(20);

/**
 * 工具函数：快速对齐点到网格
 */
export function snapToGrid(point: Point, gridSize: number = 20): Point {
  return {
    x: Math.round(point.x / gridSize) * gridSize,
    y: Math.round(point.y / gridSize) * gridSize,
  };
}

/**
 * 工具函数：快速对齐边界框到网格
 */
export function snapBoundsToGrid(bounds: Bounds, gridSize: number = 20): Bounds {
  const alignment = new GridAlignmentUtil(gridSize);
  return alignment.snapBounds(bounds);
}

/**
 * 工具函数：检查是否需要显示网格对齐线
 */
export function shouldShowSnapLines(
  bounds: Bounds,
  gridSize: number = 20,
  threshold: number = 5
): boolean {
  const alignment = new GridAlignmentUtil(gridSize);
  const aligned = alignment.snapBounds(bounds);
  const distance = Math.sqrt(
    Math.pow(bounds.x - aligned.x, 2) + Math.pow(bounds.y - aligned.y, 2)
  );
  
  return distance <= threshold;
}
