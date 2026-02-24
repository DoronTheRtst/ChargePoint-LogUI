import { useCallback, useEffect, useMemo, useRef } from 'react';
import { T } from '../tokens';
import { fmtShort } from '../utils/format';

export default function TimelineBrush({ timeMin, timeMax, rangeStart, rangeEnd, buckets, onRangeChange }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const dragRef = useRef(null);
  const WIDTH = 800;
  const HEIGHT = 52;
  const HANDLE_W = 8;

  const maxBucket = useMemo(() => Math.max(...buckets.map((b) => b.count), 1), [buckets]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.scale(dpr, dpr);

    const range = timeMax - timeMin || 1;
    const toX = (ts) => ((ts - timeMin) / range) * WIDTH;
    const selL = toX(rangeStart);
    const selR = toX(rangeEnd);

    ctx.fillStyle = T.surface;
    ctx.fillRect(0, 0, WIDTH, HEIGHT);

    const barW = Math.max(WIDTH / buckets.length - 1, 1);
    for (let i = 0; i < buckets.length; i += 1) {
      const b = buckets[i];
      const x = toX(b.ts);
      const h = (b.count / maxBucket) * (HEIGHT - 10);
      const inRange = b.ts >= rangeStart && b.ts <= rangeEnd;
      ctx.fillStyle = inRange ? `${T.amber}88` : `${T.textMuted}44`;
      ctx.fillRect(x, HEIGHT - h - 2, barW, h);
    }

    ctx.fillStyle = 'rgba(8,12,18,0.6)';
    ctx.fillRect(0, 0, selL, HEIGHT);
    ctx.fillRect(selR, 0, WIDTH - selR, HEIGHT);

    ctx.strokeStyle = T.amber;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(selL, 0.5, selR - selL, HEIGHT - 1);

    for (const hx of [selL, selR]) {
      ctx.fillStyle = T.amber;
      const rx = Math.max(0, Math.min(hx - HANDLE_W / 2, WIDTH - HANDLE_W));
      roundRect(ctx, rx, 4, HANDLE_W, HEIGHT - 8, 3);
      ctx.fill();
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 0.8;
      for (let dy = -4; dy <= 4; dy += 4) {
        ctx.beginPath();
        ctx.moveTo(rx + 2, HEIGHT / 2 + dy);
        ctx.lineTo(rx + HANDLE_W - 2, HEIGHT / 2 + dy);
        ctx.stroke();
      }
    }

    ctx.fillStyle = T.textDim;
    ctx.font = "10px 'IBM Plex Mono', monospace";
    ctx.textAlign = 'left';
    ctx.fillText(fmtShort(rangeStart), Math.max(selL + 2, 2), 11);
    ctx.textAlign = 'right';
    ctx.fillText(fmtShort(rangeEnd), Math.min(selR - 2, WIDTH - 2), 11);
  }, [buckets, maxBucket, rangeEnd, rangeStart, timeMax, timeMin]);

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  const getTs = useCallback(
    (clientX) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return timeMin;
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      return timeMin + frac * (timeMax - timeMin);
    },
    [timeMax, timeMin],
  );

  const onPointerDown = useCallback(
    (e) => {
      const ts = getTs(e.clientX);
      const range = timeMax - timeMin || 1;
      const pxPerMs = WIDTH / range;
      const handleZone = 12 / pxPerMs;

      if (Math.abs(ts - rangeStart) < handleZone) dragRef.current = { mode: 'left' };
      else if (Math.abs(ts - rangeEnd) < handleZone) dragRef.current = { mode: 'right' };
      else if (ts > rangeStart && ts < rangeEnd) dragRef.current = { mode: 'pan', offset: ts - rangeStart, width: rangeEnd - rangeStart };
      else {
        const w = rangeEnd - rangeStart;
        const newStart = Math.max(timeMin, Math.min(timeMax - w, ts - w / 2));
        onRangeChange(newStart, newStart + w);
        dragRef.current = { mode: 'pan', offset: w / 2, width: w };
      }
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [getTs, onRangeChange, rangeEnd, rangeStart, timeMax, timeMin],
  );

  const onPointerMove = useCallback(
    (e) => {
      if (!dragRef.current) return;
      const ts = getTs(e.clientX);
      const { mode, offset, width } = dragRef.current;
      const MIN_WINDOW = (timeMax - timeMin) * 0.01;

      if (mode === 'left') {
        const ns = Math.max(timeMin, Math.min(rangeEnd - MIN_WINDOW, ts));
        onRangeChange(ns, rangeEnd);
      } else if (mode === 'right') {
        const ne = Math.min(timeMax, Math.max(rangeStart + MIN_WINDOW, ts));
        onRangeChange(rangeStart, ne);
      } else if (mode === 'pan') {
        let ns = ts - offset;
        ns = Math.max(timeMin, Math.min(timeMax - width, ns));
        onRangeChange(ns, ns + width);
      }
    },
    [getTs, onRangeChange, rangeEnd, rangeStart, timeMax, timeMin],
  );

  return (
    <div
      ref={containerRef}
      style={{ padding: '0', cursor: 'ew-resize', touchAction: 'none', borderRadius: 6, overflow: 'hidden', border: `1px solid ${T.border}` }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={() => {
        dragRef.current = null;
      }}
    >
      <canvas ref={canvasRef} style={{ width: '100%', height: HEIGHT, display: 'block' }} />
    </div>
  );
}
