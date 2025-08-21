import { Point, Camera, Bounds } from '@/types/canvas';

/**
 * Convert world coordinates to screen coordinates
 */
export function worldToScreen(worldPoint: Point, camera: Camera): Point {
  return {
    x: worldPoint.x * camera.zoom + camera.x,
    y: worldPoint.y * camera.zoom + camera.y,
  };
}

/**
 * Convert screen coordinates to world coordinates
 */
export function screenToWorld(screenPoint: Point, camera: Camera): Point {
  return {
    x: (screenPoint.x - camera.x) / camera.zoom,
    y: (screenPoint.y - camera.y) / camera.zoom,
  };
}

/**
 * Convert world bounds to screen bounds
 */
export function worldBoundsToScreen(worldBounds: Bounds, camera: Camera): Bounds {
  const topLeft = worldToScreen(
    { x: worldBounds.x, y: worldBounds.y },
    camera
  );
  const bottomRight = worldToScreen(
    {
      x: worldBounds.x + worldBounds.width,
      y: worldBounds.y + worldBounds.height,
    },
    camera
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

/**
 * Convert screen bounds to world bounds
 */
export function screenBoundsToWorld(screenBounds: Bounds, camera: Camera): Bounds {
  const topLeft = screenToWorld(
    { x: screenBounds.x, y: screenBounds.y },
    camera
  );
  const bottomRight = screenToWorld(
    {
      x: screenBounds.x + screenBounds.width,
      y: screenBounds.y + screenBounds.height,
    },
    camera
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

/**
 * Check if a point is inside bounds
 */
export function isPointInBounds(point: Point, bounds: Bounds): boolean {
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

/**
 * Check if two bounds intersect
 */
export function boundsIntersect(bounds1: Bounds, bounds2: Bounds): boolean {
  return !(
    bounds1.x + bounds1.width < bounds2.x ||
    bounds2.x + bounds2.width < bounds1.x ||
    bounds1.y + bounds1.height < bounds2.y ||
    bounds2.y + bounds2.height < bounds1.y
  );
}

/**
 * Get the union of multiple bounds
 */
export function getBoundsUnion(boundsArray: Bounds[]): Bounds | null {
  if (boundsArray.length === 0) return null;

  const minX = Math.min(...boundsArray.map(b => b.x));
  const minY = Math.min(...boundsArray.map(b => b.y));
  const maxX = Math.max(...boundsArray.map(b => b.x + b.width));
  const maxY = Math.max(...boundsArray.map(b => b.y + b.height));

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Clamp a value between min and max
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Snap a value to a grid
 */
export function snapToGrid(value: number, gridSize: number): number {
  return Math.round(value / gridSize) * gridSize;
}

/**
 * Snap a point to a grid
 */
export function snapPointToGrid(point: Point, gridSize: number): Point {
  return {
    x: snapToGrid(point.x, gridSize),
    y: snapToGrid(point.y, gridSize),
  };
}

/**
 * Calculate distance between two points
 */
export function distance(point1: Point, point2: Point): number {
  const dx = point2.x - point1.x;
  const dy = point2.y - point1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle between two points
 */
export function angle(point1: Point, point2: Point): number {
  return Math.atan2(point2.y - point1.y, point2.x - point1.x);
}

/**
 * Rotate a point around another point
 */
export function rotatePoint(
  point: Point,
  center: Point,
  angleRadians: number
): Point {
  const cos = Math.cos(angleRadians);
  const sin = Math.sin(angleRadians);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Get viewport bounds in world coordinates
 */
export function getViewportBounds(camera: Camera): Bounds {
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const topLeft = screenToWorld({ x: 0, y: 0 }, camera);
  const bottomRight = screenToWorld(
    { x: viewportWidth, y: viewportHeight },
    camera
  );

  return {
    x: topLeft.x,
    y: topLeft.y,
    width: bottomRight.x - topLeft.x,
    height: bottomRight.y - topLeft.y,
  };
}

/**
 * Check if bounds are visible in viewport
 */
export function isBoundsVisible(bounds: Bounds, camera: Camera): boolean {
  const viewportBounds = getViewportBounds(camera);
  return boundsIntersect(bounds, viewportBounds);
}

/**
 * Constrain camera to bounds
 */
export function constrainCamera(
  camera: Camera,
  contentBounds: Bounds,
  viewportSize: { width: number; height: number }
): Camera {
  const minZoom = 0.1;
  const maxZoom = 5.0;
  
  const constrainedZoom = clamp(camera.zoom, minZoom, maxZoom);
  
  // Calculate the maximum pan bounds
  const scaledContentWidth = contentBounds.width * constrainedZoom;
  const scaledContentHeight = contentBounds.height * constrainedZoom;
  
  const maxX = Math.max(0, scaledContentWidth - viewportSize.width);
  const maxY = Math.max(0, scaledContentHeight - viewportSize.height);
  
  const constrainedX = clamp(camera.x, -maxX, 0);
  const constrainedY = clamp(camera.y, -maxY, 0);
  
  return {
    x: constrainedX,
    y: constrainedY,
    zoom: constrainedZoom,
  };
}

/**
 * Linear interpolation between two values
 */
export function lerp(start: number, end: number, factor: number): number {
  return start + (end - start) * factor;
}

/**
 * Linear interpolation between two points
 */
export function lerpPoint(start: Point, end: Point, factor: number): Point {
  return {
    x: lerp(start.x, end.x, factor),
    y: lerp(start.y, end.y, factor),
  };
}

/**
 * Ease-in-out cubic function
 */
export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/**
 * Animate between two values
 */
export function animateValue(
  from: number,
  to: number,
  duration: number,
  onUpdate: (value: number) => void,
  onComplete?: () => void
): void {
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);
    
    const currentValue = lerp(from, to, easedProgress);
    onUpdate(currentValue);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  }
  
  animate();
}

/**
 * Animate camera to target position and zoom
 */
export function animateCamera(
  currentCamera: Camera,
  targetCamera: Camera,
  duration: number,
  onUpdate: (camera: Camera) => void,
  onComplete?: () => void
): void {
  const startTime = Date.now();
  
  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easedProgress = easeInOutCubic(progress);
    
    const camera: Camera = {
      x: lerp(currentCamera.x, targetCamera.x, easedProgress),
      y: lerp(currentCamera.y, targetCamera.y, easedProgress),
      zoom: lerp(currentCamera.zoom, targetCamera.zoom, easedProgress),
    };
    
    onUpdate(camera);
    
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      onComplete?.();
    }
  }
  
  animate();
}
