import { useState, useCallback, useRef, type RefObject, type WheelEvent, type MouseEvent, type TouchEvent } from 'react';

export interface ViewAxis {
  offset: number; // 0..1 normalized position of viewport start
  zoom: number;   // 1 = full view, higher = zoomed in
}

export interface Viewport {
  xMin: number; // 0..1
  xMax: number; // 0..1
  yMin: number; // 0..1
  yMax: number; // 0..1
}

export interface CursorData {
  /** Normalized 0..1 position on canvas */
  normX: number;
  normY: number;
  /** Mapped into viewport coords (still 0..1 in data space) */
  dataX: number;
  dataY: number;
}

export interface VizViewportConfig {
  maxZoomX?: number;
  maxZoomY?: number;
  lockY?: boolean;      // e.g. waveform: no Y zoom
  zoomSpeed?: number;   // multiplier for wheel zoom (default 1.2)
}

export interface VizViewportReturn {
  viewport: Viewport;
  cursor: CursorData | null;
  canvasRef: RefObject<HTMLCanvasElement | null>;
  handlers: {
    onWheel: (e: WheelEvent<HTMLCanvasElement>) => void;
    onMouseDown: (e: MouseEvent<HTMLCanvasElement>) => void;
    onMouseMove: (e: MouseEvent<HTMLCanvasElement>) => void;
    onMouseLeave: () => void;
    onDoubleClick: () => void;
    onTouchStart: (e: TouchEvent<HTMLCanvasElement>) => void;
    onTouchMove: (e: TouchEvent<HTMLCanvasElement>) => void;
    onTouchEnd: () => void;
  };
  zoomIn: () => void;
  zoomOut: () => void;
  reset: () => void;
  isZoomed: boolean;
}

function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

function clampOffset(offset: number, zoom: number): number {
  const viewSize = 1 / zoom;
  return clamp(offset, 0, 1 - viewSize);
}

export function useVizViewport(config: VizViewportConfig = {}): VizViewportReturn {
  const { maxZoomX = 64, maxZoomY = 16, lockY = false, zoomSpeed = 1.15 } = config;

  const [viewX, setViewX] = useState<ViewAxis>({ offset: 0, zoom: 1 });
  const [viewY, setViewY] = useState<ViewAxis>({ offset: 0, zoom: 1 });
  const [cursor, setCursor] = useState<CursorData | null>(null);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoomX: number; zoomY: number } | null>(null);

  const getViewport = useCallback((): Viewport => {
    const viewSizeX = 1 / viewX.zoom;
    const viewSizeY = 1 / viewY.zoom;
    return {
      xMin: viewX.offset,
      xMax: viewX.offset + viewSizeX,
      yMin: viewY.offset,
      yMax: viewY.offset + viewSizeY,
    };
  }, [viewX, viewY]);

  const getNormPos = useCallback((e: MouseEvent<HTMLCanvasElement> | { clientX: number; clientY: number }): { normX: number; normY: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { normX: 0, normY: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      normX: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      normY: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    };
  }, []);

  const updateCursor = useCallback((normX: number, normY: number) => {
    const vp = getViewport();
    setCursor({
      normX,
      normY,
      dataX: vp.xMin + normX * (vp.xMax - vp.xMin),
      dataY: vp.yMin + normY * (vp.yMax - vp.yMin),
    });
  }, [getViewport]);

  // Zoom toward a normalized position on the canvas
  const zoomAxis = useCallback((
    axis: ViewAxis, setAxis: (v: ViewAxis) => void,
    factor: number, normPos: number, maxZoom: number
  ) => {
    const newZoom = clamp(axis.zoom * factor, 1, maxZoom);
    if (newZoom === axis.zoom) return;
    // The data position under the cursor
    const dataPos = axis.offset + normPos / axis.zoom;
    // New offset so that dataPos stays under normPos
    const newOffset = dataPos - normPos / newZoom;
    setAxis({ zoom: newZoom, offset: clampOffset(newOffset, newZoom) });
  }, []);

  const onWheel = useCallback((e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { normX, normY } = getNormPos(e);
    const factor = e.deltaY < 0 ? zoomSpeed : 1 / zoomSpeed;

    if (e.shiftKey && !lockY) {
      zoomAxis(viewY, setViewY, factor, normY, maxZoomY);
    } else {
      zoomAxis(viewX, setViewX, factor, normX, maxZoomX);
    }
  }, [getNormPos, zoomSpeed, lockY, viewX, viewY, maxZoomX, maxZoomY, zoomAxis]);

  const onMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const { normX, normY } = getNormPos(e);
    dragRef.current = { startX: normX, startY: normY, startOffX: viewX.offset, startOffY: viewY.offset };
    e.preventDefault();
  }, [getNormPos, viewX.offset, viewY.offset]);

  const onMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const { normX, normY } = getNormPos(e);
    updateCursor(normX, normY);

    if (dragRef.current && (viewX.zoom > 1 || viewY.zoom > 1)) {
      const dx = dragRef.current.startX - normX;
      const dy = dragRef.current.startY - normY;
      const newOffX = clampOffset(dragRef.current.startOffX + dx / viewX.zoom * viewX.zoom, viewX.zoom);
      const newOffY = lockY ? 0 : clampOffset(dragRef.current.startOffY + dy / viewY.zoom * viewY.zoom, viewY.zoom);

      // Compute actual offset changes in data space
      const dataDx = dx * (1 / viewX.zoom);
      const dataDy = dy * (1 / viewY.zoom);

      setViewX(prev => ({ ...prev, offset: clampOffset(dragRef.current!.startOffX + dataDx, prev.zoom) }));
      if (!lockY) {
        setViewY(prev => ({ ...prev, offset: clampOffset(dragRef.current!.startOffY + dataDy, prev.zoom) }));
      }
    }
  }, [getNormPos, updateCursor, viewX.zoom, viewY.zoom, lockY]);

  const onMouseLeave = useCallback(() => {
    setCursor(null);
    dragRef.current = null;
  }, []);

  const onDoubleClick = useCallback(() => {
    setViewX({ offset: 0, zoom: 1 });
    setViewY({ offset: 0, zoom: 1 });
  }, []);

  // Touch support
  const onTouchStart = useCallback((e: TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), zoomX: viewX.zoom, zoomY: viewY.zoom };
    } else if (e.touches.length === 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const normX = clamp((e.touches[0].clientX - rect.left) / rect.width, 0, 1);
      const normY = clamp((e.touches[0].clientY - rect.top) / rect.height, 0, 1);
      dragRef.current = { startX: normX, startY: normY, startOffX: viewX.offset, startOffY: viewY.offset };
    }
  }, [viewX, viewY]);

  const onTouchMove = useCallback((e: TouchEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (e.touches.length === 2 && pinchRef.current) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const scale = dist / pinchRef.current.dist;
      const newZoomX = clamp(pinchRef.current.zoomX * scale, 1, maxZoomX);
      setViewX(prev => ({ zoom: newZoomX, offset: clampOffset(prev.offset, newZoomX) }));
      if (!lockY) {
        const newZoomY = clamp(pinchRef.current.zoomY * scale, 1, maxZoomY);
        setViewY(prev => ({ zoom: newZoomY, offset: clampOffset(prev.offset, newZoomY) }));
      }
    } else if (e.touches.length === 1 && dragRef.current && (viewX.zoom > 1 || viewY.zoom > 1)) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const normX = clamp((e.touches[0].clientX - rect.left) / rect.width, 0, 1);
      const normY = clamp((e.touches[0].clientY - rect.top) / rect.height, 0, 1);
      const dataDx = (dragRef.current.startX - normX) * (1 / viewX.zoom);
      const dataDy = (dragRef.current.startY - normY) * (1 / viewY.zoom);
      setViewX(prev => ({ ...prev, offset: clampOffset(dragRef.current!.startOffX + dataDx, prev.zoom) }));
      if (!lockY) {
        setViewY(prev => ({ ...prev, offset: clampOffset(dragRef.current!.startOffY + dataDy, prev.zoom) }));
      }
    }
  }, [viewX.zoom, viewY.zoom, lockY, maxZoomX, maxZoomY]);

  const onTouchEnd = useCallback(() => {
    dragRef.current = null;
    pinchRef.current = null;
  }, []);

  // Toolbar button actions
  const zoomIn = useCallback(() => {
    setViewX(prev => {
      const newZoom = clamp(prev.zoom * 1.5, 1, maxZoomX);
      return { zoom: newZoom, offset: clampOffset(prev.offset + (1 / prev.zoom - 1 / newZoom) / 2, newZoom) };
    });
  }, [maxZoomX]);

  const zoomOut = useCallback(() => {
    setViewX(prev => {
      const newZoom = clamp(prev.zoom / 1.5, 1, maxZoomX);
      return { zoom: newZoom, offset: clampOffset(prev.offset + (1 / prev.zoom - 1 / newZoom) / 2, newZoom) };
    });
  }, [maxZoomX]);

  const reset = useCallback(() => {
    setViewX({ offset: 0, zoom: 1 });
    setViewY({ offset: 0, zoom: 1 });
  }, []);

  // Listen for mouseup globally to end drag
  const mouseUpRef = useRef<(() => void) | null>(null);
  if (!mouseUpRef.current) {
    mouseUpRef.current = () => { dragRef.current = null; };
    if (typeof window !== 'undefined') {
      window.addEventListener('mouseup', mouseUpRef.current);
    }
  }

  const viewport = getViewport();
  const isZoomed = viewX.zoom > 1.01 || viewY.zoom > 1.01;

  return {
    viewport,
    cursor,
    canvasRef: canvasRef as RefObject<HTMLCanvasElement | null>,
    handlers: {
      onWheel,
      onMouseDown,
      onMouseMove,
      onMouseLeave,
      onDoubleClick,
      onTouchStart,
      onTouchMove,
      onTouchEnd,
    },
    zoomIn,
    zoomOut,
    reset,
    isZoomed,
  };
}
