import { useState, useCallback, useRef, useEffect, type RefObject, type WheelEvent, type MouseEvent, type TouchEvent } from 'react';

export interface ViewAxis {
  offset: number;
  zoom: number;
}

export interface Viewport {
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
}

export interface CursorData {
  normX: number;
  normY: number;
  dataX: number;
  dataY: number;
}

export interface VizViewportConfig {
  maxZoomX?: number;
  maxZoomY?: number;
  lockY?: boolean;
  zoomSpeed?: number;
}

export interface VizViewportReturn {
  viewport: Viewport;
  cursorRef: RefObject<CursorData | null>;
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
  return clamp(offset, 0, 1 - 1 / zoom);
}

export function useVizViewport(config: VizViewportConfig = {}): VizViewportReturn {
  const { maxZoomX = 64, maxZoomY = 16, lockY = false, zoomSpeed = 1.15 } = config;

  const [viewX, setViewX] = useState<ViewAxis>({ offset: 0, zoom: 1 });
  const [viewY, setViewY] = useState<ViewAxis>({ offset: 0, zoom: 1 });

  // Cursor is a ref — no re-renders on mouse move
  const cursorRef = useRef<CursorData | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dragRef = useRef<{ startX: number; startY: number; startOffX: number; startOffY: number } | null>(null);
  const pinchRef = useRef<{ dist: number; zoomX: number; zoomY: number } | null>(null);

  // Keep refs to current axis state for use in event handlers (avoids stale closures)
  const viewXRef = useRef(viewX);
  const viewYRef = useRef(viewY);
  viewXRef.current = viewX;
  viewYRef.current = viewY;

  const getNormPos = useCallback((e: { clientX: number; clientY: number }): { normX: number; normY: number } => {
    const canvas = canvasRef.current;
    if (!canvas) return { normX: 0, normY: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      normX: clamp((e.clientX - rect.left) / rect.width, 0, 1),
      normY: clamp((e.clientY - rect.top) / rect.height, 0, 1),
    };
  }, []);

  const computeViewport = useCallback((vx: ViewAxis, vy: ViewAxis): Viewport => {
    return {
      xMin: vx.offset,
      xMax: vx.offset + 1 / vx.zoom,
      yMin: vy.offset,
      yMax: vy.offset + 1 / vy.zoom,
    };
  }, []);

  const updateCursorRef = useCallback((normX: number, normY: number) => {
    const vx = viewXRef.current;
    const vy = viewYRef.current;
    const vp = computeViewport(vx, vy);
    cursorRef.current = {
      normX,
      normY,
      dataX: vp.xMin + normX * (vp.xMax - vp.xMin),
      dataY: vp.yMin + normY * (vp.yMax - vp.yMin),
    };
  }, [computeViewport]);

  const zoomAxis = useCallback((
    setAxis: React.Dispatch<React.SetStateAction<ViewAxis>>,
    factor: number, normPos: number, maxZoom: number
  ) => {
    setAxis(prev => {
      const newZoom = clamp(prev.zoom * factor, 1, maxZoom);
      if (newZoom === prev.zoom) return prev;
      const dataPos = prev.offset + normPos / prev.zoom;
      const newOffset = dataPos - normPos / newZoom;
      return { zoom: newZoom, offset: clampOffset(newOffset, newZoom) };
    });
  }, []);

  const onWheel = useCallback((e: WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const { normX, normY } = getNormPos(e);
    const factor = e.deltaY < 0 ? zoomSpeed : 1 / zoomSpeed;

    if (e.shiftKey && !lockY) {
      zoomAxis(setViewY, factor, normY, maxZoomY);
    } else {
      zoomAxis(setViewX, factor, normX, maxZoomX);
    }
  }, [getNormPos, zoomSpeed, lockY, maxZoomX, maxZoomY, zoomAxis]);

  const onMouseDown = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const { normX, normY } = getNormPos(e);
    dragRef.current = {
      startX: normX,
      startY: normY,
      startOffX: viewXRef.current.offset,
      startOffY: viewYRef.current.offset,
    };
    e.preventDefault();
  }, [getNormPos]);

  const onMouseMove = useCallback((e: MouseEvent<HTMLCanvasElement>) => {
    const { normX, normY } = getNormPos(e);
    updateCursorRef(normX, normY);

    if (dragRef.current) {
      const vx = viewXRef.current;
      const vy = viewYRef.current;
      if (vx.zoom > 1 || vy.zoom > 1) {
        const dx = dragRef.current.startX - normX;
        const dy = dragRef.current.startY - normY;
        const dataDx = dx * (1 / vx.zoom);
        const dataDy = dy * (1 / vy.zoom);
        setViewX(prev => ({ ...prev, offset: clampOffset(dragRef.current!.startOffX + dataDx, prev.zoom) }));
        if (!lockY) {
          setViewY(prev => ({ ...prev, offset: clampOffset(dragRef.current!.startOffY + dataDy, prev.zoom) }));
        }
      }
    }
  }, [getNormPos, updateCursorRef, lockY]);

  const onMouseLeave = useCallback(() => {
    cursorRef.current = null;
    dragRef.current = null;
  }, []);

  const onDoubleClick = useCallback(() => {
    setViewX({ offset: 0, zoom: 1 });
    setViewY({ offset: 0, zoom: 1 });
  }, []);

  // Global mouseup with proper cleanup
  useEffect(() => {
    const handleMouseUp = () => { dragRef.current = null; };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  // Touch support
  const onTouchStart = useCallback((e: TouchEvent<HTMLCanvasElement>) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      pinchRef.current = { dist: Math.hypot(dx, dy), zoomX: viewXRef.current.zoom, zoomY: viewYRef.current.zoom };
    } else if (e.touches.length === 1) {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const normX = clamp((e.touches[0].clientX - rect.left) / rect.width, 0, 1);
      const normY = clamp((e.touches[0].clientY - rect.top) / rect.height, 0, 1);
      dragRef.current = { startX: normX, startY: normY, startOffX: viewXRef.current.offset, startOffY: viewYRef.current.offset };
    }
  }, []);

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
    } else if (e.touches.length === 1 && dragRef.current) {
      const vx = viewXRef.current;
      const vy = viewYRef.current;
      if (vx.zoom > 1 || vy.zoom > 1) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const normX = clamp((e.touches[0].clientX - rect.left) / rect.width, 0, 1);
        const normY = clamp((e.touches[0].clientY - rect.top) / rect.height, 0, 1);
        const dataDx = (dragRef.current.startX - normX) * (1 / vx.zoom);
        const dataDy = (dragRef.current.startY - normY) * (1 / vy.zoom);
        setViewX(prev => ({ ...prev, offset: clampOffset(dragRef.current!.startOffX + dataDx, prev.zoom) }));
        if (!lockY) {
          setViewY(prev => ({ ...prev, offset: clampOffset(dragRef.current!.startOffY + dataDy, prev.zoom) }));
        }
      }
    }
  }, [lockY, maxZoomX, maxZoomY]);

  const onTouchEnd = useCallback(() => {
    dragRef.current = null;
    pinchRef.current = null;
  }, []);

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

  const viewport = computeViewport(viewX, viewY);
  const isZoomed = viewX.zoom > 1.01 || viewY.zoom > 1.01;

  return {
    viewport,
    cursorRef,
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
