import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  Plus,
  Minus,
  LocateFixed,
  Layers,
  RotateCcw,
  Move,
} from 'lucide-react';

export interface MapMarkerItem {
  id: string;
  lat: number;
  lng: number;
  label: string;
  sublabel?: string;
  color?: 'emerald' | 'amber' | 'rose' | 'blue';
  isUser?: boolean;
}

interface InteractiveTrailMapProps {
  center: { lat: number; lng: number };
  zoom?: number;
  markers?: MapMarkerItem[];
  routePoints?: Array<{ lat: number; lng: number }>;
  onMapTap?: (coords: { lat: number; lng: number }) => void;
  activeTapModeLabel?: string | null;
  heightClass?: string;
  showLayerToggle?: boolean;
  onLocateGps?: (coords: { lat: number; lng: number }) => void;
}

const TILE_SIZE = 256;

// Web Mercator projection helpers
function lngToTileX(lng: number, z: number): number {
  return ((lng + 180) / 360) * Math.pow(2, z);
}

function latToTileY(lat: number, z: number): number {
  const clampedLat = Math.max(-85.0511, Math.min(85.0511, lat));
  const rad = (clampedLat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
    Math.pow(2, z)
  );
}

function tileXToLng(x: number, z: number): number {
  return (x / Math.pow(2, z)) * 360 - 180;
}

function tileYToLat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / Math.pow(2, z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export const InteractiveTrailMap: React.FC<InteractiveTrailMapProps> = ({
  center,
  zoom: initialZoom = 9,
  markers = [],
  routePoints = [],
  onMapTap,
  activeTapModeLabel,
  heightClass = 'h-72',
  showLayerToggle = true,
  onLocateGps,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [viewportSize, setViewportSize] = useState({ width: 380, height: 288 });

  // Continuous zoom & center state for buttery-smooth 1-finger and 2-finger pan/zoom
  const [viewCenter, setViewCenter] = useState<{ lat: number; lng: number }>(center);
  const [zoom, setZoom] = useState<number>(initialZoom);
  const [mapStyle, setMapStyle] = useState<'street' | 'topo'>('street');
  const [isLocating, setIsLocating] = useState(false);

  // Sync camera when parent explicitly changes target coordinates
  const prevCenterRef = useRef<{ lat: number; lng: number }>(center);
  useEffect(() => {
    const dLat = Math.abs(center.lat - prevCenterRef.current.lat);
    const dLng = Math.abs(center.lng - prevCenterRef.current.lng);
    if (dLat > 0.0005 || dLng > 0.0005) {
      prevCenterRef.current = center;
      setViewCenter(center);
    }
  }, [center.lat, center.lng]);

  // Measure map container dimensions
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const updateSize = () => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        setViewportSize({ width: rect.width, height: rect.height });
      }
    };
    updateSize();
    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Pan by pixel delta (dx, dy)
  const panByPixels = useCallback(
    (dx: number, dy: number, targetZoom = zoom) => {
      setViewCenter((prev) => {
        const centerTileX = lngToTileX(prev.lng, targetZoom);
        const centerTileY = latToTileY(prev.lat, targetZoom);
        const nextTileX = centerTileX - dx / TILE_SIZE;
        const nextTileY = centerTileY - dy / TILE_SIZE;
        const maxTiles = Math.pow(2, targetZoom);
        const wrappedX = ((nextTileX % maxTiles) + maxTiles) % maxTiles;
        const clampedY = Math.max(0.05, Math.min(maxTiles - 0.05, nextTileY));
        return {
          lat: Number(tileYToLat(clampedY, targetZoom).toFixed(6)),
          lng: Number(tileXToLng(wrappedX, targetZoom).toFixed(6)),
        };
      });
    },
    [zoom]
  );

  // Convert screen pixel (x, y) relative to container into { lat, lng }
  const pixelToLatLng = useCallback(
    (px: number, py: number) => {
      const centerTileX = lngToTileX(viewCenter.lng, zoom);
      const centerTileY = latToTileY(viewCenter.lat, zoom);
      const offsetX = (px - viewportSize.width / 2) / TILE_SIZE;
      const offsetY = (py - viewportSize.height / 2) / TILE_SIZE;
      return {
        lat: Number(tileYToLat(centerTileY + offsetY, zoom).toFixed(5)),
        lng: Number(tileXToLng(centerTileX + offsetX, zoom).toFixed(5)),
      };
    },
    [viewCenter, zoom, viewportSize]
  );

  // Convert { lat, lng } to screen pixel (x, y) relative to container
  const latLngToPixel = useCallback(
    (lat: number, lng: number) => {
      const centerTileX = lngToTileX(viewCenter.lng, zoom);
      const centerTileY = latToTileY(viewCenter.lat, zoom);
      const targetTileX = lngToTileX(lng, zoom);
      const targetTileY = latToTileY(lat, zoom);
      return {
        x: viewportSize.width / 2 + (targetTileX - centerTileX) * TILE_SIZE,
        y: viewportSize.height / 2 + (targetTileY - centerTileY) * TILE_SIZE,
      };
    },
    [viewCenter, zoom, viewportSize]
  );

  // Gesture state for 1-finger drag, 2-finger pan, and 2-finger pinch-to-zoom
  const gestureRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    lastX: number;
    lastY: number;
    movedDistance: number;
    isTwoFinger: boolean;
    lastPinchDist: number;
    startZoom: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    lastX: 0,
    lastY: 0,
    movedDistance: 0,
    isTwoFinger: false,
    lastPinchDist: 0,
    startZoom: initialZoom,
  });

  // Attach native non-passive touch & wheel listeners so two-finger pan/zoom never scrolls the modal behind it
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        const t = e.touches[0];
        gestureRef.current = {
          ...gestureRef.current,
          isDragging: true,
          isTwoFinger: false,
          startX: t.clientX,
          startY: t.clientY,
          lastX: t.clientX,
          lastY: t.clientY,
          movedDistance: 0,
        };
      } else if (e.touches.length >= 2) {
        e.preventDefault();
        e.stopPropagation();
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
        gestureRef.current = {
          isDragging: true,
          isTwoFinger: true,
          startX: midX,
          startY: midY,
          lastX: midX,
          lastY: midY,
          movedDistance: 20, // prevent tap trigger after 2-finger gesture
          lastPinchDist: Math.max(dist, 10),
          startZoom: zoom,
        };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!gestureRef.current.isDragging) return;
      e.preventDefault();
      e.stopPropagation();

      if (e.touches.length >= 2) {
        const t1 = e.touches[0];
        const t2 = e.touches[1];
        const midX = (t1.clientX + t2.clientX) / 2;
        const midY = (t1.clientY + t2.clientY) / 2;
        const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);

        // 1. Two-finger simultaneous pan
        const dx = midX - gestureRef.current.lastX;
        const dy = midY - gestureRef.current.lastY;
        gestureRef.current.lastX = midX;
        gestureRef.current.lastY = midY;
        gestureRef.current.movedDistance += Math.hypot(dx, dy);

        // 2. Two-finger pinch zoom
        let nextZoom = zoom;
        if (gestureRef.current.lastPinchDist > 15 && dist > 15) {
          const scale = dist / gestureRef.current.lastPinchDist;
          if (Math.abs(scale - 1) > 0.08) {
            const zoomDelta = Math.log2(scale);
            nextZoom = Math.max(3, Math.min(18, Math.round((zoom + zoomDelta) * 2) / 2));
            if (Math.round(nextZoom) !== Math.round(zoom)) {
              setZoom(Math.round(nextZoom));
              gestureRef.current.lastPinchDist = dist;
            }
          }
        }

        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) {
          panByPixels(dx, dy, Math.round(nextZoom));
        }
      } else if (e.touches.length === 1 && !gestureRef.current.isTwoFinger) {
        const t = e.touches[0];
        const dx = t.clientX - gestureRef.current.lastX;
        const dy = t.clientY - gestureRef.current.lastY;
        gestureRef.current.lastX = t.clientX;
        gestureRef.current.lastY = t.clientY;
        gestureRef.current.movedDistance += Math.hypot(dx, dy);
        panByPixels(dx, dy, zoom);
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (
        gestureRef.current.isDragging &&
        !gestureRef.current.isTwoFinger &&
        gestureRef.current.movedDistance < 8 &&
        e.changedTouches.length === 1 &&
        onMapTap
      ) {
        const rect = el.getBoundingClientRect();
        const t = e.changedTouches[0];
        const px = t.clientX - rect.left;
        const py = t.clientY - rect.top;
        onMapTap(pixelToLatLng(px, py));
      }
      if (e.touches.length === 0) {
        gestureRef.current.isDragging = false;
        gestureRef.current.isTwoFinger = false;
      } else if (e.touches.length === 1) {
        // Transition smoothly from 2 fingers down to 1 finger without jumping
        gestureRef.current.lastX = e.touches[0].clientX;
        gestureRef.current.lastY = e.touches[0].clientY;
        gestureRef.current.isTwoFinger = false;
      }
    };

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const delta = e.deltaY < 0 ? 1 : -1;
      setZoom((z) => Math.max(3, Math.min(18, z + delta)));
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: false });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: false });
    el.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('wheel', handleWheel);
    };
  }, [zoom, panByPixels, onMapTap, pixelToLatLng]);

  // Mouse handlers for desktop drag & click
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    gestureRef.current = {
      ...gestureRef.current,
      isDragging: true,
      isTwoFinger: false,
      startX: e.clientX,
      startY: e.clientY,
      lastX: e.clientX,
      lastY: e.clientY,
      movedDistance: 0,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gestureRef.current.isDragging) return;
    const dx = e.clientX - gestureRef.current.lastX;
    const dy = e.clientY - gestureRef.current.lastY;
    gestureRef.current.lastX = e.clientX;
    gestureRef.current.lastY = e.clientY;
    gestureRef.current.movedDistance += Math.hypot(dx, dy);
    panByPixels(dx, dy, zoom);
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!gestureRef.current.isDragging) return;
    const moved = gestureRef.current.movedDistance;
    gestureRef.current.isDragging = false;
    if (moved < 6 && onMapTap && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      onMapTap(pixelToLatLng(px, py));
    }
  };

  // Compute visible slippy tiles
  const intZoom = Math.max(3, Math.min(18, Math.round(zoom)));
  const centerTileX = lngToTileX(viewCenter.lng, intZoom);
  const centerTileY = latToTileY(viewCenter.lat, intZoom);
  const baseTileX = Math.floor(centerTileX);
  const baseTileY = Math.floor(centerTileY);
  const maxTileIndex = Math.pow(2, intZoom);

  const colsHalf = Math.ceil(viewportSize.width / TILE_SIZE / 2) + 1;
  const rowsHalf = Math.ceil(viewportSize.height / TILE_SIZE / 2) + 1;

  const tiles: Array<{ key: string; url: string; left: number; top: number }> = [];
  for (let dx = -colsHalf; dx <= colsHalf; dx++) {
    for (let dy = -rowsHalf; dy <= rowsHalf; dy++) {
      const rawX = baseTileX + dx;
      const rawY = baseTileY + dy;
      if (rawY < 0 || rawY >= maxTileIndex) continue;
      const wrappedX = ((rawX % maxTileIndex) + maxTileIndex) % maxTileIndex;
      const left =
        viewportSize.width / 2 + (rawX - centerTileX) * TILE_SIZE;
      const top =
        viewportSize.height / 2 + (rawY - centerTileY) * TILE_SIZE;

      const url =
        mapStyle === 'topo'
          ? `https://a.tile.opentopomap.org/${intZoom}/${wrappedX}/${rawY}.png`
          : `https://tile.openstreetmap.org/${intZoom}/${wrappedX}/${rawY}.png`;

      tiles.push({
        key: `${mapStyle}-${intZoom}-${wrappedX}-${rawY}`,
        url,
        left,
        top,
      });
    }
  }

  const handleMyGps = () => {
    if (!('geolocation' in navigator)) return;
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        };
        setViewCenter(coords);
        setZoom(13);
        setIsLocating(false);
        onLocateGps?.(coords);
      },
      () => {
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 6000 }
    );
  };

  return (
    <div
      ref={containerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={() => {
        gestureRef.current.isDragging = false;
      }}
      style={{ touchAction: 'none' }}
      className={`relative w-full ${heightClass} rounded-3xl overflow-hidden border border-slate-200 bg-slate-900 select-none cursor-grab active:cursor-grabbing shadow-inner`}
    >
      {/* Slippy Map Tiles Layer */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            draggable={false}
            style={{
              position: 'absolute',
              left: `${Math.round(t.left)}px`,
              top: `${Math.round(t.top)}px`,
              width: `${TILE_SIZE}px`,
              height: `${TILE_SIZE}px`,
            }}
            className="max-w-none select-none pointer-events-none"
          />
        ))}
      </div>

      {/* SVG Route Polyline Layer */}
      {routePoints.length >= 2 && (
        <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
          {(() => {
            const pts = routePoints.map((pt) => latLngToPixel(pt.lat, pt.lng));
            const pathData = pts
              .map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
              .join(' ');
            return (
              <>
                <path
                  d={pathData}
                  stroke="#0f5238"
                  strokeWidth="5"
                  strokeOpacity="0.45"
                  fill="none"
                  strokeLinecap="round"
                />
                <path
                  d={pathData}
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeDasharray="6 4"
                  fill="none"
                  strokeLinecap="round"
                />
              </>
            );
          })()}
        </svg>
      )}

      {/* Map Markers Layer */}
      <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
        {markers.map((m) => {
          const pos = latLngToPixel(m.lat, m.lng);
          if (
            pos.x < -60 ||
            pos.x > viewportSize.width + 60 ||
            pos.y < -60 ||
            pos.y > viewportSize.height + 60
          ) {
            return null;
          }
          const badgeColor =
            m.color === 'amber'
              ? 'bg-amber-500 border-amber-200 text-slate-950'
              : m.color === 'rose'
              ? 'bg-rose-600 border-rose-200 text-white'
              : m.color === 'blue'
              ? 'bg-sky-600 border-sky-200 text-white'
              : 'bg-emerald-600 border-emerald-200 text-white';

          return (
            <div
              key={m.id}
              style={{
                left: `${pos.x}px`,
                top: `${pos.y}px`,
              }}
              className="absolute -translate-x-1/2 -translate-y-full flex flex-col items-center"
            >
              <div
                className={`px-2 py-0.5 rounded-full text-[9px] font-black shadow-md border whitespace-nowrap mb-0.5 ${badgeColor}`}
              >
                {m.label}
              </div>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center shadow-lg border-2 border-white ${
                  m.color === 'amber'
                    ? 'bg-amber-500 text-slate-950'
                    : m.color === 'rose'
                    ? 'bg-rose-600 text-white animate-bounce'
                    : 'bg-emerald-600 text-white'
                }`}
              >
                <MapPin className="w-3.5 h-3.5" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Left Status Pill */}
      <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5 pointer-events-none">
        <div className="px-2.5 py-1 rounded-xl bg-slate-900/85 backdrop-blur-md text-white text-[10px] font-bold flex items-center gap-1.5 border border-white/15 shadow-md">
          <Move className="w-3 h-3 text-emerald-400" />
          <span>
            {activeTapModeLabel
              ? activeTapModeLabel
              : '1 or 2-Finger Drag & Pinch Zoom'}
          </span>
        </div>
      </div>

      {/* Top Right Layer Switcher & GPS */}
      <div
        className="absolute top-2.5 right-2.5 z-30 flex items-center gap-1"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        {showLayerToggle && (
          <button
            type="button"
            onClick={() => setMapStyle((s) => (s === 'street' ? 'topo' : 'street'))}
            className="px-2.5 py-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white text-[10px] font-bold flex items-center gap-1 border border-white/15 shadow-md cursor-pointer"
            title="Switch Street / Topographic Terrain Map"
          >
            <Layers className="w-3 h-3 text-amber-400" />
            <span>{mapStyle === 'street' ? 'Terrain' : 'Street'}</span>
          </button>
        )}
        <button
          type="button"
          onClick={handleMyGps}
          className="p-1.5 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-emerald-400 border border-white/15 shadow-md cursor-pointer"
          title="Center on my live GPS location"
        >
          <LocateFixed className={`w-3.5 h-3.5 ${isLocating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Bottom Right Zoom & Reset Controls */}
      <div
        className="absolute bottom-2.5 right-2.5 z-30 flex flex-col gap-1"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setZoom((z) => Math.min(18, z + 1))}
          className="w-8 h-8 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white flex items-center justify-center border border-white/15 shadow-md cursor-pointer active:scale-95"
          title="Zoom In"
        >
          <Plus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => setZoom((z) => Math.max(3, z - 1))}
          className="w-8 h-8 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-white flex items-center justify-center border border-white/15 shadow-md cursor-pointer active:scale-95"
          title="Zoom Out"
        >
          <Minus className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={() => {
            setViewCenter(center);
            setZoom(initialZoom);
          }}
          className="w-8 h-8 rounded-xl bg-slate-900/85 hover:bg-slate-900 text-amber-300 flex items-center justify-center border border-white/15 shadow-md cursor-pointer active:scale-95"
          title="Reset Map Center"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom Left Live Coordinates Readout */}
      <div className="absolute bottom-2.5 left-2.5 z-30 px-2.5 py-1 rounded-xl bg-slate-900/80 backdrop-blur-md text-white/90 text-[10px] font-mono border border-white/10 pointer-events-none">
        {viewCenter.lat.toFixed(4)}°N, {viewCenter.lng.toFixed(4)}°E · Z{intZoom}
      </div>
    </div>
  );
};
