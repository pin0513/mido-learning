'use client';

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import type {
  HomeSide,
  CourtType,
  DrawMode,
  LineDash,
  EntityType,
  StrokePoint,
} from '../types';
import {
  COURT_W,
  COURT_H,
  SHORT_SERVICE_LINE,
  LONG_SERVICE_LINE,
  SIDE_MARGIN,
  MAX_UNDO,
} from '../constants';

// ════════════════════════════════════════
// Internal types
// ════════════════════════════════════════

interface StrokeRecord {
  pts: StrokePoint[];
  w: number;
  dash: LineDash;
}

interface PlayerEntity {
  id: number;
  name: string;
  label: string;
  color: string;
  visible: boolean;
  pos: StrokePoint | null;
  strokes: StrokeRecord[];
}

interface BallEntity {
  id: number;
  name: string;
  color: string;
  borderColor: string;
  visible: boolean;
  pos: StrokePoint | null;
  strokes: StrokeRecord[];
}

interface AnnotEntity {
  id: number;
  color: string;
  label: string;
  strokes: StrokeRecord[];
}

type UndoAction =
  | { type: 'stroke'; who: EntityType; id: number }
  | { type: 'place'; who: EntityType; id: number; from: StrokePoint | null }
  | { type: 'erase-marker'; who: EntityType; id: number; pos: StrokePoint }
  | { type: 'erase-stroke'; who: EntityType; id: number; idx: number; stroke: StrokeRecord };

interface HitResult {
  who: 'player' | 'ball';
  id: number;
}

type ServeSide = 'none' | 'left' | 'right';

// ════════════════════════════════════════
// Marker radii
// ════════════════════════════════════════
const MR = 15; // player marker radius
const BR = 12; // ball marker radius
const MARGIN = 18;

// ════════════════════════════════════════
// Component
// ════════════════════════════════════════

export default function BoardClient() {
  const router = useRouter();

  // ── UI state ──
  const [mode, setModeState] = useState<DrawMode>('draw');
  const [courtType, setCourtTypeState] = useState<CourtType>('doubles');
  const [homeSide, setHomeSideState] = useState<HomeSide>('left');
  const [serveSide, setServeSideState] = useState<ServeSide>('none');
  const [activeIdx, setActiveIdx] = useState(0);
  const [activeType, setActiveType] = useState<EntityType>('player');
  const [lineWidth, setLineWidth] = useState(3);
  const [lineDash, setLineDash] = useState<LineDash>('solid');
  const [hudOpen, setHudOpen] = useState(true);
  const [toolbarOpen, setToolbarOpen] = useState(true);
  const [pendingPlace, setPendingPlace] = useState(false);

  // ── Refs ──
  const courtCanvasRef = useRef<HTMLCanvasElement>(null);
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // canvas dimensions
  const cwRef = useRef(0);
  const chRef = useRef(0);
  const scRef = useRef(1);
  const oxRef = useRef(0);
  const oyRef = useRef(0);

  // entity data (mutable refs)
  const playersRef = useRef<PlayerEntity[]>([
    { id: 0, name: 'P1', label: '\u7403\u54E11', color: '#E74C3C', visible: true, pos: null, strokes: [] },
    { id: 1, name: 'P2', label: '\u7403\u54E12', color: '#3498DB', visible: true, pos: null, strokes: [] },
    { id: 2, name: 'P3', label: '\u7403\u54E13', color: '#2ECC71', visible: true, pos: null, strokes: [] },
    { id: 3, name: 'P4', label: '\u7403\u54E14', color: '#F39C12', visible: true, pos: null, strokes: [] },
  ]);

  const ballsRef = useRef<BallEntity[]>([
    { id: 0, name: '\u7403', color: '#ffffff', borderColor: '#bbbbbb', visible: true, pos: null, strokes: [] },
  ]);

  const annotsRef = useRef<AnnotEntity[]>([
    { id: 0, color: '#E74C3C', label: '\u7D05', strokes: [] },
    { id: 1, color: '#F39C12', label: '\u6A59', strokes: [] },
    { id: 2, color: '#F1C40F', label: '\u9EC3', strokes: [] },
    { id: 3, color: '#2ECC71', label: '\u7DA0', strokes: [] },
    { id: 4, color: '#5DADE2', label: '\u6DFA\u85CD', strokes: [] },
    { id: 5, color: '#9B59B6', label: '\u7D2B', strokes: [] },
  ]);

  // drawing state
  const drawingRef = useRef(false);
  const curStrokeRef = useRef<StrokePoint[]>([]);
  const dragRef = useRef<HitResult | null>(null);
  const dragOffRef = useRef<StrokePoint>({ x: 0, y: 0 });

  // HUD drag-and-drop
  const hudDragRef = useRef<{ type: 'player' | 'ball'; idx: number } | null>(null);
  const ghostElRef = useRef<HTMLDivElement>(null);

  // undo stack
  const undoStackRef = useRef<UndoAction[]>([]);

  // stale-closure refs
  const modeRef = useRef(mode);
  modeRef.current = mode;
  const courtTypeRef = useRef(courtType);
  courtTypeRef.current = courtType;
  const homeSideRef = useRef(homeSide);
  homeSideRef.current = homeSide;
  const serveSideRef = useRef(serveSide);
  serveSideRef.current = serveSide;
  const activeIdxRef = useRef(activeIdx);
  activeIdxRef.current = activeIdx;
  const activeTypeRef = useRef(activeType);
  activeTypeRef.current = activeType;
  const lineWidthRef = useRef(lineWidth);
  lineWidthRef.current = lineWidth;
  const lineDashRef = useRef(lineDash);
  lineDashRef.current = lineDash;
  const pendingPlaceRef = useRef(pendingPlace);
  pendingPlaceRef.current = pendingPlace;
  // force re-render counter (for HUD updates)
  const [, setRenderTick] = useState(0);
  const tick = useCallback(() => setRenderTick((v) => v + 1), []);

  // ════════════════════════════════════════
  // Coordinate helpers
  // ════════════════════════════════════════
  const cxM = useCallback((m: number) => oxRef.current + m * scRef.current, []);
  const cyM = useCallback((m: number) => oyRef.current + m * scRef.current, []);

  // ════════════════════════════════════════
  // Court drawing
  // ════════════════════════════════════════
  const drawCourt = useCallback(() => {
    const canvas = courtCanvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext('2d');
    if (!c) return;
    const CW = cwRef.current;
    const CH = chRef.current;
    c.clearRect(0, 0, CW, CH);
    c.fillStyle = '#ffffff';
    c.fillRect(0, 0, CW, CH);

    const homeLeft = homeSideRef.current === 'left';
    const homeColor = 'rgba(52,152,219,0.06)';
    const awayColor = 'rgba(231,76,60,0.06)';
    c.fillStyle = homeLeft ? homeColor : awayColor;
    c.fillRect(cxM(0), cyM(0), cxM(COURT_W / 2) - cxM(0), cyM(COURT_H) - cyM(0));
    c.fillStyle = homeLeft ? awayColor : homeColor;
    c.fillRect(cxM(COURT_W / 2), cyM(0), cxM(COURT_W) - cxM(COURT_W / 2), cyM(COURT_H) - cyM(0));

    if (courtTypeRef.current === 'singles') {
      c.fillStyle = 'rgba(0,0,0,0.07)';
      c.fillRect(cxM(0), cyM(0), cxM(COURT_W) - cxM(0), cyM(SIDE_MARGIN) - cyM(0));
      c.fillRect(cxM(0), cyM(COURT_H - SIDE_MARGIN), cxM(COURT_W) - cxM(0), cyM(COURT_H) - cyM(COURT_H - SIDE_MARGIN));
    }

    // watermark
    const wCX = cxM(COURT_W / 2);
    const wCY = cyM(COURT_H / 2);
    c.save();
    c.globalAlpha = 0.06;
    const wFs = Math.round(Math.min(COURT_W, COURT_H) * scRef.current * 0.13);
    c.font = `bold italic ${wFs}px 'Helvetica Neue',Arial,sans-serif`;
    c.fillStyle = '#1a4080';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Mido Learning', wCX, wCY - wFs * 0.6);
    const wFs2 = Math.round(wFs * 0.45);
    c.font = `${wFs2}px Arial,sans-serif`;
    c.fillText('\u7FBD\u7403\u6230\u8853\u7248', wCX, wCY + wFs2 * 0.3);
    c.restore();

    // court lines
    c.strokeStyle = '#1a1a8e';
    c.lineWidth = 2;
    c.setLineDash([]);
    c.lineCap = 'square';
    c.strokeRect(cxM(0), cyM(0), cxM(COURT_W) - cxM(0), cyM(COURT_H) - cyM(0));

    const drawLine = (x1: number, y1: number, x2: number, y2: number) => {
      c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.stroke();
    };
    const drawDot = (x: number, y: number, r: number) => {
      c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill();
    };

    // long service lines (0.76m from back)
    drawLine(cxM(LONG_SERVICE_LINE), cyM(0), cxM(LONG_SERVICE_LINE), cyM(COURT_H));
    drawLine(cxM(COURT_W - LONG_SERVICE_LINE), cyM(0), cxM(COURT_W - LONG_SERVICE_LINE), cyM(COURT_H));

    // short service lines (1.98m from net)
    const ssl = COURT_W / 2 - SHORT_SERVICE_LINE;
    drawLine(cxM(ssl), cyM(0), cxM(ssl), cyM(COURT_H));
    drawLine(cxM(COURT_W - ssl), cyM(0), cxM(COURT_W - ssl), cyM(COURT_H));

    // singles side lines
    drawLine(cxM(0), cyM(SIDE_MARGIN), cxM(COURT_W), cyM(SIDE_MARGIN));
    drawLine(cxM(0), cyM(COURT_H - SIDE_MARGIN), cxM(COURT_W), cyM(COURT_H - SIDE_MARGIN));

    // center lines (from long service line to short service line, each half)
    drawLine(cxM(LONG_SERVICE_LINE), cyM(COURT_H / 2), cxM(ssl), cyM(COURT_H / 2));
    drawLine(cxM(COURT_W - ssl), cyM(COURT_H / 2), cxM(COURT_W - LONG_SERVICE_LINE), cyM(COURT_H / 2));

    // net
    c.strokeStyle = '#555';
    c.lineWidth = 3;
    drawLine(cxM(COURT_W / 2), cyM(0), cxM(COURT_W / 2), cyM(COURT_H));

    // net posts
    c.fillStyle = '#333';
    drawDot(cxM(COURT_W / 2), cyM(0), 5);
    drawDot(cxM(COURT_W / 2), cyM(COURT_H), 5);

    // serve indicator
    if (serveSideRef.current !== 'none') {
      const isLeft = serveSideRef.current === 'left';
      const px = isLeft ? cxM(1.5) : cxM(COURT_W - 1.5);
      const py = cyM(COURT_H / 2);
      c.fillStyle = 'rgba(241,196,15,0.18)';
      c.beginPath();
      c.arc(px, py, 20, 0, Math.PI * 2);
      c.fill();
    }
  }, [cxM, cyM]);

  // ════════════════════════════════════════
  // Stroke drawing
  // ════════════════════════════════════════
  const paintStroke = useCallback((ctx: CanvasRenderingContext2D, pts: StrokePoint[], color: string, w: number, dash: LineDash) => {
    if (pts.length < 2) return;
    const dashPat = dash === 'dashed' ? [w * 3, w * 2] : [];
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = w + 3;
    ctx.setLineDash(dashPat);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.strokeStyle = color;
    ctx.lineWidth = w;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.setLineDash([]);
  }, []);

  const drawStrokes = useCallback((ctx: CanvasRenderingContext2D) => {
    playersRef.current.forEach((p) => {
      if (!p.visible) return;
      p.strokes.forEach((s) => paintStroke(ctx, s.pts, p.color, s.w, s.dash));
    });
    ballsRef.current.forEach((b) => {
      if (!b.visible) return;
      b.strokes.forEach((s) => paintStroke(ctx, s.pts, b.color, s.w, s.dash));
    });
    annotsRef.current.forEach((a) => {
      a.strokes.forEach((s) => paintStroke(ctx, s.pts, a.color, s.w, s.dash));
    });
  }, [paintStroke]);

  // ════════════════════════════════════════
  // Marker drawing
  // ════════════════════════════════════════
  const drawPlayerMarker = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, color: string, name: string, isActive: boolean) => {
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(x, y, MR, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,0.4)';
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${Math.round(MR * 0.95)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(name, x, y);
    if (isActive) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(x, y, MR + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }, []);

  const drawShuttleMarker = useCallback((ctx: CanvasRenderingContext2D, x: number, y: number, isActive: boolean) => {
    const r = BR;
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetX = 2;
    ctx.shadowOffsetY = 2;
    ctx.fillStyle = 'rgba(30,36,55,0.92)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isActive ? '#fff' : 'rgba(255,255,255,0.35)';
    ctx.lineWidth = isActive ? 2.5 : 1.5;
    ctx.stroke();
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;

    const bx = x, by = y;
    const featherR = r * 0.75;
    const corkR = r * 0.32;
    const corkCY = by + r * 0.28;
    const quillBase = by + r * 0.1;
    const numF = 9;
    for (let i = 0; i < numF; i++) {
      const t = i / (numF - 1);
      const ang = (-Math.PI * 0.72) + t * (Math.PI * 1.44);
      const tipX = bx + Math.cos(ang) * featherR;
      const tipY = (by - featherR * 0.55) + Math.sin(ang) * featherR * 0.35;
      ctx.beginPath();
      ctx.moveTo(bx, quillBase);
      ctx.lineTo(tipX, tipY);
      ctx.strokeStyle = 'rgba(255,255,255,0.72)';
      ctx.lineWidth = 0.9;
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.ellipse(bx, by - featherR * 0.3, featherR * 0.82, featherR * 0.28, 0, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.85;
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(bx, corkCY, corkR, 0, Math.PI * 2);
    const grad = ctx.createRadialGradient(bx - corkR * 0.3, corkCY - corkR * 0.3, 0, bx, corkCY, corkR);
    grad.addColorStop(0, '#f5e6b0');
    grad.addColorStop(1, '#c8a85a');
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.8;
    ctx.stroke();
    if (isActive) {
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 3]);
      ctx.beginPath();
      ctx.arc(x, y, r + 5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  }, []);

  const drawMarkers = useCallback((ctx: CanvasRenderingContext2D) => {
    playersRef.current.forEach((p) => {
      if (!p.visible || !p.pos) return;
      const isActive = (p.id === activeIdxRef.current && activeTypeRef.current === 'player');
      drawPlayerMarker(ctx, p.pos.x, p.pos.y, p.color, p.name, isActive);
    });
    ballsRef.current.forEach((b) => {
      if (!b.visible || !b.pos) return;
      const isActive = (b.id === activeIdxRef.current && activeTypeRef.current === 'ball');
      drawShuttleMarker(ctx, b.pos.x, b.pos.y, isActive);
    });
  }, [drawPlayerMarker, drawShuttleMarker]);

  // ════════════════════════════════════════
  // Redraw all
  // ════════════════════════════════════════
  const redraw = useCallback(() => {
    drawCourt();
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const dc = canvas.getContext('2d');
    if (!dc) return;
    const CW = cwRef.current;
    const CH = chRef.current;
    dc.clearRect(0, 0, CW, CH);
    drawStrokes(dc);
    if (drawingRef.current && curStrokeRef.current.length > 1) {
      const ae = getActiveEntityRef();
      paintStroke(dc, curStrokeRef.current, ae.color, lineWidthRef.current, lineDashRef.current);
    }
    drawMarkers(dc);
  }, [drawCourt, drawStrokes, drawMarkers, paintStroke]);

  // ════════════════════════════════════════
  // Entity helpers
  // ════════════════════════════════════════
  const getActiveEntityRef = useCallback((): PlayerEntity | BallEntity | AnnotEntity => {
    if (activeTypeRef.current === 'player') return playersRef.current[activeIdxRef.current];
    if (activeTypeRef.current === 'ball') return ballsRef.current[activeIdxRef.current];
    return annotsRef.current[activeIdxRef.current];
  }, []);

  const entityAt = useCallback((hit: HitResult): PlayerEntity | BallEntity => {
    return hit.who === 'player' ? playersRef.current[hit.id] : ballsRef.current[hit.id];
  }, []);

  // ════════════════════════════════════════
  // Undo
  // ════════════════════════════════════════
  const pushUndo = useCallback((action: UndoAction) => {
    undoStackRef.current.push(action);
    if (undoStackRef.current.length > MAX_UNDO) undoStackRef.current.shift();
  }, []);

  const undo = useCallback(() => {
    if (undoStackRef.current.length === 0) return;
    const a = undoStackRef.current.pop()!;
    let arr: (PlayerEntity | BallEntity | AnnotEntity)[];
    if (a.who === 'player') arr = playersRef.current;
    else if (a.who === 'ball') arr = ballsRef.current;
    else arr = annotsRef.current;
    const entity = arr[a.id];
    switch (a.type) {
      case 'stroke':
        entity.strokes.pop();
        break;
      case 'place':
        if ('pos' in entity) (entity as PlayerEntity | BallEntity).pos = a.from;
        break;
      case 'erase-marker':
        if ('pos' in entity) (entity as PlayerEntity | BallEntity).pos = a.pos;
        break;
      case 'erase-stroke':
        entity.strokes.splice(a.idx, 0, a.stroke);
        break;
    }
    redraw();
  }, [redraw]);

  // ════════════════════════════════════════
  // Hit detection
  // ════════════════════════════════════════
  const hitMarker = useCallback((p: StrokePoint): HitResult | null => {
    for (let i = playersRef.current.length - 1; i >= 0; i--) {
      const pl = playersRef.current[i];
      if (!pl.visible || !pl.pos) continue;
      if (Math.hypot(p.x - pl.pos.x, p.y - pl.pos.y) <= MR + 5) return { who: 'player', id: i };
    }
    for (let i = ballsRef.current.length - 1; i >= 0; i--) {
      const bl = ballsRef.current[i];
      if (!bl.visible || !bl.pos) continue;
      if (Math.hypot(p.x - bl.pos.x, p.y - bl.pos.y) <= BR + 5) return { who: 'ball', id: i };
    }
    return null;
  }, []);

  const eraseNear = useCallback((p: StrokePoint) => {
    const checkArr = (arr: (PlayerEntity | BallEntity | AnnotEntity)[], who: EntityType): boolean => {
      for (const ent of arr) {
        for (let i = ent.strokes.length - 1; i >= 0; i--) {
          for (const pt of ent.strokes[i].pts) {
            if (Math.hypot(pt.x - p.x, pt.y - p.y) < 14) {
              const stroke = ent.strokes.splice(i, 1)[0];
              pushUndo({ type: 'erase-stroke', who, id: ent.id, idx: i, stroke });
              return true;
            }
          }
        }
      }
      return false;
    };
    if (!checkArr(playersRef.current, 'player'))
      if (!checkArr(ballsRef.current, 'ball'))
        checkArr(annotsRef.current, 'annot');
  }, [pushUndo]);

  // ════════════════════════════════════════
  // Select entity
  // ════════════════════════════════════════
  const selectEntity = useCallback((type: EntityType, i: number) => {
    activeIdxRef.current = i;
    activeTypeRef.current = type;
    setActiveIdx(i);
    setActiveType(type);
    if (type !== 'annot') {
      const ent = type === 'player' ? playersRef.current[i] : ballsRef.current[i];
      const isPending = !ent.pos;
      pendingPlaceRef.current = isPending;
      setPendingPlace(isPending);
    } else {
      pendingPlaceRef.current = false;
      setPendingPlace(false);
    }
    tick();
    redraw();
  }, [redraw, tick]);

  // ════════════════════════════════════════
  // HUD drag-and-drop onto court
  // ════════════════════════════════════════
  const onHudPointerDown = useCallback((type: 'player' | 'ball', idx: number, e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startY = e.clientY;
    const THRESHOLD = 8;
    let dragging = false;

    const ent = type === 'player' ? playersRef.current[idx] : ballsRef.current[idx];
    const color = type === 'player' ? (ent as PlayerEntity).color : '#dab86a';
    const label = type === 'player' ? (ent as PlayerEntity).name : '🏸';

    const onMove = (ev: PointerEvent) => {
      const dx = ev.clientX - startX;
      const dy = ev.clientY - startY;
      if (!dragging && Math.sqrt(dx * dx + dy * dy) >= THRESHOLD) {
        dragging = true;
        hudDragRef.current = { type, idx };
        const ghost = ghostElRef.current;
        if (ghost) {
          ghost.style.display = 'flex';
          ghost.style.background = color;
          ghost.textContent = label;
        }
      }
      if (dragging) {
        const ghost = ghostElRef.current;
        if (ghost) {
          ghost.style.left = `${ev.clientX - 20}px`;
          ghost.style.top = `${ev.clientY - 20}px`;
        }
      }
    };

    const onUp = (ev: PointerEvent) => {
      document.removeEventListener('pointermove', onMove);
      document.removeEventListener('pointerup', onUp);

      const ghost = ghostElRef.current;
      if (ghost) ghost.style.display = 'none';

      if (dragging && hudDragRef.current) {
        const canvas = drawCanvasRef.current;
        if (canvas) {
          const r = canvas.getBoundingClientRect();
          if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
            const sx = canvas.width / r.width;
            const sy = canvas.height / r.height;
            const cx = (ev.clientX - r.left) * sx;
            const cy = (ev.clientY - r.top) * sy;
            const target = hudDragRef.current.type === 'player'
              ? playersRef.current[hudDragRef.current.idx]
              : ballsRef.current[hudDragRef.current.idx];
            pushUndo({ type: 'place', who: hudDragRef.current.type, id: hudDragRef.current.idx, from: target.pos ? { ...target.pos } : null });
            target.pos = { x: cx, y: cy };

            activeIdxRef.current = hudDragRef.current.idx;
            activeTypeRef.current = hudDragRef.current.type;
            setActiveIdx(hudDragRef.current.idx);
            setActiveType(hudDragRef.current.type);
            pendingPlaceRef.current = false;
            setPendingPlace(false);
            tick();
            redraw();
          }
        }
        hudDragRef.current = null;
      } else {
        // Click fallback — no drag detected
        selectEntity(type, idx);
      }
    };

    document.addEventListener('pointermove', onMove);
    document.addEventListener('pointerup', onUp);
  }, [selectEntity, pushUndo, tick, redraw]);

  // ════════════════════════════════════════
  // Canvas event coordinate
  // ════════════════════════════════════════
  const getPos = useCallback((e: MouseEvent | TouchEvent): StrokePoint => {
    const canvas = drawCanvasRef.current!;
    const r = canvas.getBoundingClientRect();
    const sx = canvas.width / r.width;
    const sy = canvas.height / r.height;
    let ex: number, ey: number;
    if ('touches' in e && e.touches.length) {
      ex = e.touches[0].clientX;
      ey = e.touches[0].clientY;
    } else if ('changedTouches' in e && e.changedTouches.length) {
      ex = e.changedTouches[0].clientX;
      ey = e.changedTouches[0].clientY;
    } else {
      ex = (e as MouseEvent).clientX;
      ey = (e as MouseEvent).clientY;
    }
    return { x: (ex - r.left) * sx, y: (ey - r.top) * sy };
  }, []);

  // ════════════════════════════════════════
  // Pointer handlers
  // ════════════════════════════════════════
  const onDown = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const p = getPos(e);
    const currentMode = modeRef.current;

    if (currentMode === 'place') {
      const h = hitMarker(p);
      if (h) {
        dragRef.current = h;
        dragOffRef.current = { x: p.x - entityAt(h).pos!.x, y: p.y - entityAt(h).pos!.y };
        selectEntity(h.who, h.id);
      } else {
        if (activeTypeRef.current === 'annot') return;
        const ae = getActiveEntityRef() as PlayerEntity | BallEntity;
        const oldPos = ae.pos ? { ...ae.pos } : null;
        ae.pos = { x: p.x, y: p.y };
        pushUndo({ type: 'place', who: activeTypeRef.current, id: activeIdxRef.current, from: oldPos });
        pendingPlaceRef.current = false;
        setPendingPlace(false);
        tick();
        redraw();
      }
      return;
    }
    if (currentMode === 'erase') {
      const h = hitMarker(p);
      if (h) {
        const ent = entityAt(h);
        pushUndo({ type: 'erase-marker', who: h.who, id: h.id, pos: { ...ent.pos! } });
        ent.pos = null;
      } else {
        eraseNear(p);
      }
      redraw();
      return;
    }
    // draw mode
    const h = hitMarker(p);
    if (h) {
      dragRef.current = h;
      dragOffRef.current = { x: p.x - entityAt(h).pos!.x, y: p.y - entityAt(h).pos!.y };
      selectEntity(h.who, h.id);
      return;
    }
    // pending place click
    if (pendingPlaceRef.current && activeTypeRef.current !== 'annot') {
      const ae = getActiveEntityRef() as PlayerEntity | BallEntity;
      pushUndo({ type: 'place', who: activeTypeRef.current, id: activeIdxRef.current, from: null });
      ae.pos = { x: p.x, y: p.y };
      pendingPlaceRef.current = false;
      setPendingPlace(false);
      tick();
      redraw();
      return;
    }
    drawingRef.current = true;
    curStrokeRef.current = [{ x: p.x, y: p.y }];
  }, [getPos, hitMarker, entityAt, selectEntity, getActiveEntityRef, pushUndo, eraseNear, redraw, tick]);

  const onMove = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    const p = getPos(e);
    if (dragRef.current) {
      entityAt(dragRef.current).pos = { x: p.x - dragOffRef.current.x, y: p.y - dragOffRef.current.y };
      redraw();
      return;
    }
    if (drawingRef.current) {
      curStrokeRef.current.push({ x: p.x, y: p.y });
      redraw();
    }
  }, [getPos, entityAt, redraw]);

  const onUp = useCallback((e: MouseEvent | TouchEvent) => {
    e.preventDefault();
    if (dragRef.current) {
      pushUndo({ type: 'place', who: dragRef.current.who, id: dragRef.current.id, from: null });
      dragRef.current = null;
      redraw();
      return;
    }
    if (drawingRef.current) {
      drawingRef.current = false;
      if (curStrokeRef.current.length >= 2) {
        const ae = getActiveEntityRef();
        const stroke: StrokeRecord = { pts: [...curStrokeRef.current], w: lineWidthRef.current, dash: lineDashRef.current };
        ae.strokes.push(stroke);
        pushUndo({ type: 'stroke', who: activeTypeRef.current, id: activeIdxRef.current });
      }
      curStrokeRef.current = [];
      redraw();
    }
  }, [getActiveEntityRef, pushUndo, redraw]);

  // ════════════════════════════════════════
  // Mode / Court / Serve setters
  // ════════════════════════════════════════
  const setMode = useCallback((m: DrawMode) => {
    modeRef.current = m;
    setModeState(m);
  }, []);

  const setCourtType = useCallback((t: CourtType) => {
    courtTypeRef.current = t;
    setCourtTypeState(t);
    // redraw is triggered by effect
  }, []);

  const setServe = useCallback((s: ServeSide) => {
    serveSideRef.current = s;
    setServeSideState(s);
  }, []);

  const setHome = useCallback((side: HomeSide) => {
    homeSideRef.current = side;
    setHomeSideState(side);
  }, []);

  const setDash = useCallback((d: LineDash) => {
    lineDashRef.current = d;
    setLineDash(d);
  }, []);

  const clearActive = useCallback(() => {
    const ae = getActiveEntityRef();
    ae.strokes = [];
    if (activeTypeRef.current !== 'annot') (ae as PlayerEntity | BallEntity).pos = null;
    tick();
    redraw();
  }, [getActiveEntityRef, redraw, tick]);

  const resetAll = useCallback(() => {
    if (!confirm('\u78BA\u5B9A\u8981\u6E05\u9664\u6240\u6709\u8D70\u7DDA\u8207\u7AD9\u4F4D\uFF1F')) return;
    playersRef.current.forEach((p) => { p.strokes = []; p.pos = null; });
    ballsRef.current.forEach((b) => { b.strokes = []; b.pos = null; });
    annotsRef.current.forEach((a) => { a.strokes = []; });
    undoStackRef.current.length = 0;
    setServe('none');
    tick();
    redraw();
  }, [setServe, redraw, tick]);

  // ════════════════════════════════════════
  // Resize
  // ════════════════════════════════════════
  const resize = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const cr = el.getBoundingClientRect();
    const availW = cr.width - 12;
    const availH = cr.height - 12;
    const aspect = COURT_W / COURT_H;
    let w: number, h: number;
    if (availW / availH > aspect) { h = availH; w = h * aspect; }
    else { w = availW; h = w / aspect; }
    const CW = Math.floor(w);
    const CH = Math.floor(h);
    cwRef.current = CW;
    chRef.current = CH;

    [courtCanvasRef.current, drawCanvasRef.current].forEach((c) => {
      if (!c) return;
      c.width = CW;
      c.height = CH;
    });

    if (wrapperRef.current) {
      wrapperRef.current.style.width = `${CW}px`;
      wrapperRef.current.style.height = `${CH}px`;
    }

    const scW = (CW - MARGIN * 2) / COURT_W;
    const scH = (CH - MARGIN * 2) / COURT_H;
    scRef.current = Math.min(scW, scH);
    oxRef.current = (CW - COURT_W * scRef.current) / 2;
    oyRef.current = (CH - COURT_H * scRef.current) / 2;

    redraw();
  }, [redraw]);

  // ════════════════════════════════════════
  // Effects
  // ════════════════════════════════════════

  // Initial resize + resize observer
  useEffect(() => {
    resize();
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, [resize]);

  // Redraw when court/home/serve changes
  useEffect(() => {
    redraw();
  }, [courtType, homeSide, serveSide, redraw]);

  // Canvas event listeners (native for passive:false)
  useEffect(() => {
    const canvas = drawCanvasRef.current;
    if (!canvas) return;
    const down = (e: MouseEvent) => onDown(e);
    const move = (e: MouseEvent) => onMove(e);
    const up = (e: MouseEvent) => onUp(e);
    const tDown = (e: TouchEvent) => onDown(e);
    const tMove = (e: TouchEvent) => onMove(e);
    const tUp = (e: TouchEvent) => onUp(e);

    canvas.addEventListener('mousedown', down);
    canvas.addEventListener('mousemove', move);
    canvas.addEventListener('mouseup', up);
    canvas.addEventListener('mouseleave', up);
    canvas.addEventListener('touchstart', tDown, { passive: false });
    canvas.addEventListener('touchmove', tMove, { passive: false });
    canvas.addEventListener('touchend', tUp, { passive: false });
    canvas.addEventListener('touchcancel', tUp, { passive: false });

    return () => {
      canvas.removeEventListener('mousedown', down);
      canvas.removeEventListener('mousemove', move);
      canvas.removeEventListener('mouseup', up);
      canvas.removeEventListener('mouseleave', up);
      canvas.removeEventListener('touchstart', tDown);
      canvas.removeEventListener('touchmove', tMove);
      canvas.removeEventListener('touchend', tUp);
      canvas.removeEventListener('touchcancel', tUp);
    };
  }, [onDown, onMove, onUp]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).tagName === 'INPUT') return;
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === 'z') { e.preventDefault(); undo(); return; }
      if (e.key === 'Escape' && pendingPlaceRef.current) {
        pendingPlaceRef.current = false;
        setPendingPlace(false);
        tick();
        return;
      }
      switch (k) {
        case 'q': setMode('draw'); break;
        case 'w': setMode('place'); break;
        case 'e': setMode('erase'); break;
        case 'a': setServe('left'); break;
        case 'd': setServe('right'); break;
        case 'r': if (!e.ctrlKey) resetAll(); break;
        case 's': setCourtType(courtTypeRef.current === 'doubles' ? 'singles' : 'doubles'); break;
        case '1': selectEntity('player', 0); break;
        case '2': selectEntity('player', 1); break;
        case '3': selectEntity('player', 2); break;
        case '4': selectEntity('player', 3); break;
        case '5': selectEntity('ball', 0); break;
        case '6': selectEntity('annot', 0); break;
        case '7': selectEntity('annot', 1); break;
        case '8': selectEntity('annot', 2); break;
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [undo, setMode, setServe, setCourtType, resetAll, selectEntity, tick]);

  // ════════════════════════════════════════
  // Cursor
  // ════════════════════════════════════════
  const cursorStyle = pendingPlace ? 'copy' : mode === 'draw' ? 'crosshair' : mode === 'erase' ? 'cell' : 'move';


  // ════════════════════════════════════════
  // Inline styles
  // ════════════════════════════════════════
  const S = {
    root: { margin: 0, padding: 0, width: '100%', height: '100vh', overflow: 'hidden', background: '#1a1a2e', touchAction: 'none' as const, display: 'flex', flexDirection: 'column' as const } as React.CSSProperties,
    toolbar: {
      display: toolbarOpen ? 'flex' : 'none', alignItems: 'center', gap: '4px', flexWrap: 'nowrap' as const,
      padding: '5px 8px', background: '#16213e', borderBottom: '1px solid #0f3460', flexShrink: 0,
      overflowX: 'auto' as const, scrollbarWidth: 'none' as const,
    } as React.CSSProperties,
    tbtn: (on: boolean, danger = false): React.CSSProperties => ({
      minWidth: 40, minHeight: 40, borderRadius: 8,
      border: `1.5px solid ${on ? '#3498db' : danger ? 'rgba(231,76,60,.4)' : 'rgba(255,255,255,0.1)'}`,
      background: on ? 'rgba(36,113,163,0.9)' : danger ? 'rgba(15,52,96,0.7)' : 'rgba(15,52,96,0.7)',
      color: on ? '#fff' : '#ccc', cursor: 'pointer', fontSize: 10,
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
      padding: '4px 7px', userSelect: 'none', touchAction: 'manipulation',
      flexShrink: 0,
    }),
    tl: { fontSize: 9, lineHeight: 1, whiteSpace: 'nowrap' as const } as React.CSSProperties,
    sepV: { width: 1, minHeight: 30, background: 'rgba(255,255,255,0.12)', flexShrink: 0, alignSelf: 'center' as const, margin: '0 2px' } as React.CSSProperties,
    tlabel: { fontSize: 8, color: '#556', textTransform: 'uppercase' as const, letterSpacing: 0.5, whiteSpace: 'nowrap' as const, alignSelf: 'center' as const, margin: '0 1px' } as React.CSSProperties,
    main: { display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 } as React.CSSProperties,
    courtContainer: { flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 6, overflow: 'hidden', position: 'relative' as const } as React.CSSProperties,
    wrapper: { position: 'relative' as const } as React.CSSProperties,
    drawCanvas: { position: 'absolute' as const, top: 0, left: 0, cursor: cursorStyle, display: 'block' } as React.CSSProperties,
    sideLabels: { position: 'absolute' as const, top: 0, left: 0, width: '100%', height: '100%', display: 'flex', pointerEvents: 'none' as const } as React.CSSProperties,
    sideLbl: (color: string): React.CSSProperties => ({ flex: 1, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: 4, fontSize: 9, fontWeight: 'bold', opacity: 0.8, color }),
    serveFlag: (show: boolean): React.CSSProperties => ({
      position: 'absolute', fontSize: 18, pointerEvents: 'none',
      filter: 'drop-shadow(0 0 3px gold)', display: show ? 'block' : 'none',
      left: serveSide === 'left' ? `${cxM(1.5) - 12}px` : `${cxM(COURT_W - 1.5) - 12}px`,
      top: `${cyM(COURT_H / 2) - 12}px`,
    }),
    hud: { position: 'absolute' as const, bottom: 10, left: 10, zIndex: 20, display: hudOpen ? 'flex' : 'none', flexDirection: 'column' as const, gap: 6, userSelect: 'none' as const } as React.CSSProperties,
    hudRow: { display: 'flex', alignItems: 'center', gap: 5 } as React.CSSProperties,
    hudSep: { fontSize: 8, color: '#557', textTransform: 'uppercase' as const, letterSpacing: 0.5, whiteSpace: 'nowrap' as const, minWidth: 24 } as React.CSSProperties,
    hudPlayer: (color: string, sel: boolean, pending: boolean): React.CSSProperties => ({
      width: 42, height: 42, borderRadius: '50%',
      border: `2.5px solid ${pending ? '#facc15' : sel ? '#fff' : 'rgba(255,255,255,0.2)'}`,
      background: color, cursor: 'pointer',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, color: '#fff',
      boxShadow: pending ? '0 0 0 3px rgba(250,204,21,0.6),0 2px 8px rgba(0,0,0,0.5)' : sel ? '0 0 0 3px rgba(255,255,255,0.5),0 2px 8px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.5)',
      touchAction: 'manipulation', position: 'relative', overflow: 'hidden',
      animation: pending ? 'pulse-place .8s ease-in-out infinite' : undefined,
    }),
    hudBall: (sel: boolean, pending: boolean): React.CSSProperties => ({
      width: 38, height: 38, borderRadius: '50%',
      border: `2.5px solid ${pending ? '#facc15' : sel ? '#fff' : 'rgba(255,255,255,0.2)'}`,
      background: 'rgba(30,35,55,0.9)', cursor: 'pointer',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      boxShadow: pending ? '0 0 0 3px rgba(250,204,21,0.6)' : sel ? '0 0 0 3px rgba(255,255,255,0.5)' : '0 2px 8px rgba(0,0,0,0.5)',
      touchAction: 'manipulation',
      animation: pending ? 'pulse-place .8s ease-in-out infinite' : undefined,
    }),
    hudAnnot: (color: string, sel: boolean): React.CSSProperties => ({
      width: 30, height: 30, borderRadius: '50%',
      border: `2.5px solid ${sel ? '#fff' : 'rgba(255,255,255,0.15)'}`,
      background: color, cursor: 'pointer',
      boxShadow: sel ? '0 0 0 3px rgba(255,255,255,0.5)' : '0 2px 6px rgba(0,0,0,0.4)',
      touchAction: 'manipulation', transform: sel ? 'scale(1.12)' : undefined,
    }),
    hudHideBtn: { alignSelf: 'flex-end', borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(40,45,65,0.6)', color: '#667', cursor: 'pointer', fontSize: 9, padding: '3px 9px', display: 'flex', alignItems: 'center', gap: 3, whiteSpace: 'nowrap' as const, touchAction: 'manipulation' as const } as React.CSSProperties,
    hudReveal: { display: hudOpen ? 'none' : 'block', position: 'absolute' as const, bottom: 10, left: 10, zIndex: 20, background: 'rgba(15,52,96,0.95)', border: '1px solid #3498db', color: '#7bc', borderRadius: 12, padding: '4px 14px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' as const, boxShadow: '0 2px 10px rgba(0,0,0,0.6)', userSelect: 'none' as const } as React.CSSProperties,
    tbReveal: { display: toolbarOpen ? 'none' : 'block', position: 'fixed' as const, top: 4, left: '50%', transform: 'translateX(-50%)', zIndex: 200, background: 'rgba(15,52,96,0.95)', border: '1px solid #3498db', color: '#7bc', borderRadius: 12, padding: '4px 14px', fontSize: 11, cursor: 'pointer', whiteSpace: 'nowrap' as const, boxShadow: '0 2px 10px rgba(0,0,0,0.6)', userSelect: 'none' as const } as React.CSSProperties,
    tbHideBtn: { marginLeft: 'auto', minWidth: 32, minHeight: 32, flexShrink: 0, borderRadius: 6, border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(60,60,80,0.4)', color: '#667', cursor: 'pointer', fontSize: 9, display: 'flex', flexDirection: 'column' as const, alignItems: 'center', justifyContent: 'center', gap: 1 } as React.CSSProperties,
    portraitWarning: {
      display: 'none', position: 'fixed' as const, inset: 0, zIndex: 9999,
      background: '#1a1a2e', flexDirection: 'column' as const,
      alignItems: 'center', justifyContent: 'center', gap: 16, textAlign: 'center' as const, color: '#eee',
    } as React.CSSProperties,
  };

  // ════════════════════════════════════════
  // Render
  // ════════════════════════════════════════
  const players = playersRef.current;
  const balls = ballsRef.current;
  const annots = annotsRef.current;

  const isBallActive = activeType === 'ball' && activeIdx === 0;
  const isBallPending = isBallActive && pendingPlace;


  return (
    <>
      {/* keyframe animation for pulse */}
      <style>{`
        @keyframes pulse-place{
          0%,100%{box-shadow:0 0 0 3px rgba(250,204,21,0.6),0 2px 8px rgba(0,0,0,0.5);}
          50%{box-shadow:0 0 0 6px rgba(250,204,21,0.3),0 2px 8px rgba(0,0,0,0.5);}
        }
        @media(orientation:portrait){#portrait-warning-react{display:flex!important;}}
      `}</style>

      {/* Ghost element for HUD drag-and-drop */}
      <div ref={ghostElRef} style={{
        display: 'none', position: 'fixed', width: 40, height: 40, borderRadius: '50%',
        pointerEvents: 'none', zIndex: 99999, color: '#fff', fontWeight: 800,
        fontSize: 15, alignItems: 'center', justifyContent: 'center',
        boxShadow: '0 4px 16px rgba(0,0,0,0.5)', border: '2px solid rgba(255,255,255,0.6)',
        opacity: 0.9,
      }} />


      {/* Portrait warning */}
      <div id="portrait-warning-react" style={S.portraitWarning}>
        <div style={{ fontSize: '3.5rem' }}>📱</div>
        <h2 style={{ fontSize: '1.2rem' }}>{'\u8ACB\u5C07\u88DD\u7F6E\u65CB\u8F49\u70BA\u6A6B\u5411'}</h2>
        <p style={{ color: '#888', fontSize: 12 }}>Rotate to landscape to use the tactical board</p>
      </div>

      <div style={S.root}>
        {/* ════ Toolbar ════ */}
        <div style={S.toolbar}>
          <span style={S.tlabel}>{'\u6A21\u5F0F'}</span>
          <button style={S.tbtn(mode === 'draw')} onClick={() => setMode('draw')} title="\u8D70\u7DDA [Q]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 2.5l2.5 2.5-7.5 7.5-3 .5.5-3z" /><line x1="11" y1="2.5" x2="13.5" y2="5" />
            </svg>
            <span style={S.tl}>{'\u8D70\u7DDA'}</span>
          </button>
          <button style={S.tbtn(mode === 'place')} onClick={() => setMode('place')} title="\u7AD9\u4F4D [W]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="8" cy="4.5" r="2.2" /><path d="M3.5 14c0-2.5 2-4.5 4.5-4.5s4.5 2 4.5 4.5" />
            </svg>
            <span style={S.tl}>{'\u7AD9\u4F4D'}</span>
          </button>
          <button style={S.tbtn(mode === 'erase')} onClick={() => setMode('erase')} title="\u64E6\u9664 [E]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="1.5" y="7" width="13" height="6" rx="1.5" /><path d="M5 7V5.5a3 3 0 0 1 6 0V7" /><line x1="8" y1="10" x2="8" y2="11" />
            </svg>
            <span style={S.tl}>{'\u64E6\u9664'}</span>
          </button>

          <div style={S.sepV} />

          <span style={S.tlabel}>{'\u5834\u578B'}</span>
          <button style={S.tbtn(courtType === 'doubles')} onClick={() => setCourtType('doubles')} title="\u96D9\u6253 [S]">
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeLinecap="round">
              <rect x="1" y="1" width="18" height="12" rx="0.5" strokeWidth="1.5" />
              <line x1="10" y1="1" x2="10" y2="13" strokeWidth="1.2" />
              <line x1="1" y1="3" x2="19" y2="3" strokeWidth="0.8" />
              <line x1="1" y1="11" x2="19" y2="11" strokeWidth="0.8" />
            </svg>
            <span style={S.tl}>{'\u96D9\u6253'}</span>
          </button>
          <button style={S.tbtn(courtType === 'singles')} onClick={() => setCourtType('singles')} title="\u55AE\u6253 [S]">
            <svg width="20" height="14" viewBox="0 0 20 14" fill="none" stroke="currentColor" strokeLinecap="round">
              <rect x="1" y="1" width="18" height="12" rx="0.5" strokeWidth="1" opacity="0.35" />
              <rect x="3.5" y="1" width="13" height="12" rx="0.5" strokeWidth="1.5" />
              <line x1="10" y1="1" x2="10" y2="13" strokeWidth="1.2" />
              <line x1="3.5" y1="4.5" x2="16.5" y2="4.5" strokeWidth="0.8" />
              <line x1="3.5" y1="9.5" x2="16.5" y2="9.5" strokeWidth="0.8" />
            </svg>
            <span style={S.tl}>{'\u55AE\u6253'}</span>
          </button>

          <div style={S.sepV} />

          <span style={S.tlabel}>{'\u7DDA\u689D'}</span>
          <button style={S.tbtn(lineDash === 'solid')} onClick={() => setDash('solid')} title="\u5BE6\u7DDA">
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="5" x2="20" y2="5" />
            </svg>
            <span style={S.tl}>{'\u5BE6\u7DDA'}</span>
          </button>
          <button style={S.tbtn(lineDash === 'dashed')} onClick={() => setDash('dashed')} title="\u865B\u7DDA">
            <svg width="22" height="10" viewBox="0 0 22 10" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeDasharray="4 3">
              <line x1="2" y1="5" x2="20" y2="5" />
            </svg>
            <span style={S.tl}>{'\u865B\u7DDA'}</span>
          </button>
          <input type="range" min={1} max={8} value={lineWidth}
            style={{ width: 52, accentColor: '#3498db', alignSelf: 'center' }}
            onChange={(e) => { const v = +e.target.value; lineWidthRef.current = v; setLineWidth(v); }}
            title="\u7DDA\u689D\u7C97\u7D30" />

          <div style={S.sepV} />

          <span style={S.tlabel}>{'\u767C\u7403'}</span>
          <button style={S.tbtn(serveSide === 'left')} onClick={() => setServe('left')} title="\u5DE6\u767C\u7403 [A]">
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="10,2 3,7 10,12" /><line x1="13" y1="7" x2="4" y2="7" />
            </svg>
            <span style={S.tl}>{'\u5DE6\u767C'}</span>
          </button>
          <button style={S.tbtn(serveSide === 'right')} onClick={() => setServe('right')} title="\u53F3\u767C\u7403 [D]">
            <svg width="16" height="14" viewBox="0 0 16 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="6,2 13,7 6,12" /><line x1="3" y1="7" x2="12" y2="7" />
            </svg>
            <span style={S.tl}>{'\u53F3\u767C'}</span>
          </button>
          <button style={S.tbtn(serveSide === 'none')} onClick={() => setServe('none')} title="\u6E05\u9664\u767C\u7403">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
            </svg>
            <span style={S.tl}>{'\u6E05\u767C'}</span>
          </button>

          <div style={S.sepV} />

          <span style={S.tlabel}>{'\u6211\u65B9'}</span>
          <button style={S.tbtn(homeSide === 'left')} onClick={() => setHome('left')} title="\u6211\u65B9\u5728\u5DE6">
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeLinecap="round">
              <rect x="1" y="1" width="16" height="12" rx="0.5" strokeWidth="1" opacity="0.35" />
              <rect x="1" y="1" width="8" height="12" rx="0.5" strokeWidth="1.5" fill="rgba(52,152,219,0.25)" />
              <line x1="9" y1="1" x2="9" y2="13" strokeWidth="1.2" />
            </svg>
            <span style={S.tl}>{'\u6211\u5DE6'}</span>
          </button>
          <button style={S.tbtn(homeSide === 'right')} onClick={() => setHome('right')} title="\u6211\u65B9\u5728\u53F3">
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" stroke="currentColor" strokeLinecap="round">
              <rect x="1" y="1" width="16" height="12" rx="0.5" strokeWidth="1" opacity="0.35" />
              <rect x="9" y="1" width="8" height="12" rx="0.5" strokeWidth="1.5" fill="rgba(52,152,219,0.25)" />
              <line x1="9" y1="1" x2="9" y2="13" strokeWidth="1.2" />
            </svg>
            <span style={S.tl}>{'\u6211\u53F3'}</span>
          </button>

          <div style={S.sepV} />

          <button style={S.tbtn(false)} onClick={() => router.push('/badminton-trainer')} title="\u7C73\u5B57\u6B65\u8A13\u7DF4">
            <svg width="20" height="18" viewBox="0 0 20 18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <circle cx="10" cy="9" r="2.5" fill="rgba(0,200,80,0.3)" stroke="#0c6" />
              <circle cx="4" cy="3" r="2" fill="rgba(0,200,80,0.15)" />
              <circle cx="16" cy="3" r="2" fill="rgba(0,200,80,0.15)" />
              <circle cx="4" cy="15" r="2" fill="rgba(0,200,80,0.15)" />
              <circle cx="16" cy="15" r="2" fill="rgba(0,200,80,0.15)" />
              <circle cx="4" cy="9" r="2" fill="rgba(0,200,80,0.15)" />
              <circle cx="16" cy="9" r="2" fill="rgba(0,200,80,0.15)" />
            </svg>
            <span style={S.tl}>{'\u8A13\u7DF4'}</span>
          </button>

          <div style={S.sepV} />

          <button style={S.tbtn(false)} onClick={undo} title="\u5FA9\u539F Ctrl+Z">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M5 8H10a3 3 0 0 1 0 6H6" /><polyline points="8,5.5 5,8 8,10.5" /></svg>
            <span style={S.tl}>{'\u5FA9\u539F'}</span>
          </button>
          <button style={S.tbtn(false)} onClick={clearActive} title="\u6E05\u9664\u9078\u53D6\u7B46\u8DE1">
            <svg width="14" height="15" viewBox="0 0 14 15" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,3.5 13,3.5" /><path d="M4,3.5V2h6v1.5" /><rect x="2" y="3.5" width="10" height="9" rx="1" /><line x1="5" y1="6.5" x2="5" y2="10.5" /><line x1="9" y1="6.5" x2="9" y2="10.5" /></svg>
            <span style={S.tl}>{'\u6E05\u8DE1'}</span>
          </button>
          <button style={S.tbtn(false, true)} onClick={resetAll} title="\u5168\u90E8\u91CD\u7F6E [R]">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M13 8A5 5 0 1 1 10 3.3" /><polyline points="14,1 14,5 10,5" /></svg>
            <span style={S.tl}>{'\u91CD\u7F6E'}</span>
          </button>

          <button style={S.tbHideBtn} onClick={() => { setToolbarOpen(false); setTimeout(resize, 50); }} title="\u6536\u5408\u5DE5\u5177\u5217">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <polyline points="2,8 6,4 10,8" />
            </svg>
            <span style={{ fontSize: 8, color: 'inherit' }}>{'\u6536'}</span>
          </button>
        </div>

        {/* Toolbar reveal */}
        <div style={S.tbReveal} onClick={() => { setToolbarOpen(true); setTimeout(resize, 50); }}>
          {'\u25BC \u5DE5\u5177\u5217'}
        </div>

        {/* Main area */}
        <div style={S.main}>
          <div ref={containerRef} style={S.courtContainer}>
            <div ref={wrapperRef} style={S.wrapper}>
              <canvas ref={courtCanvasRef} style={{ display: 'block' }} />
              <canvas ref={drawCanvasRef} style={S.drawCanvas} />

              {/* Side labels */}
              <div style={S.sideLabels}>
                <div style={S.sideLbl(homeSide === 'left' ? '#3498db' : '#e74c3c')}>
                  {homeSide === 'left' ? '\u{1F535}\u6211\u65B9' : '\u{1F534}\u5C0D\u65B9'}
                </div>
                <div style={S.sideLbl(homeSide === 'left' ? '#e74c3c' : '#3498db')}>
                  {homeSide === 'left' ? '\u{1F534}\u5C0D\u65B9' : '\u{1F535}\u6211\u65B9'}
                </div>
              </div>

              {/* Serve flag */}
              <div style={S.serveFlag(serveSide !== 'none')}>
                {'\u{1F3F8}'}
              </div>

              {/* ════ HUD ════ */}
              <div style={S.hud}>
                <button style={S.hudHideBtn} onClick={() => setHudOpen(false)}>
                  {'\u25BE\u00A0HUD'}
                  <svg width="9" height="7" viewBox="0 0 9 7" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="1,2 4.5,5.5 8,2" /></svg>
                </button>

                {/* Players */}
                <div style={S.hudRow}>
                  <span style={S.hudSep}>{'\u7403\u54E1'}</span>
                  <div style={{ display: 'flex', gap: 5 }}>
                    {players.map((p, i) => {
                      const isActive = (i === activeIdx && activeType === 'player');
                      const isPending = isActive && pendingPlace;
                      return (
                        <button key={p.id} style={S.hudPlayer(p.color, isActive, isPending)}
                          title={`${p.label} [${i + 1}]`}
                          onPointerDown={(e) => onHudPointerDown('player', i, e)}>
                          <span style={{ fontSize: 15, fontWeight: 800, lineHeight: 1 }}>{p.name}</span>
                          <span style={{ fontSize: 7.5, opacity: 0.85, lineHeight: 1 }}>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Ball */}
                <div style={S.hudRow}>
                  <span style={S.hudSep}>{'\u7403'}</span>
                  <div style={{ display: 'flex' }}>
                    <button style={S.hudBall(isBallActive, isBallPending)}
                      title={'\u7FBD\u7403 [5]'}
                      onPointerDown={(e) => onHudPointerDown('ball', 0, e)}>
                      <svg width="24" height="24" viewBox="0 0 24 24">
                        <g transform="translate(12,12)">
                          <line x1="0" y1="2" x2="-7" y2="-8" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
                          <line x1="0" y1="2" x2="-5" y2="-9" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
                          <line x1="0" y1="2" x2="-2" y2="-9.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
                          <line x1="0" y1="2" x2="1" y2="-9.5" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
                          <line x1="0" y1="2" x2="4" y2="-9" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
                          <line x1="0" y1="2" x2="6.5" y2="-8" stroke="rgba(255,255,255,0.7)" strokeWidth="1" />
                          <ellipse cx="0" cy="-8" rx="6" ry="2" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="0.9" />
                          <circle cx="0" cy="5" r="3.2" fill="#dab86a" stroke="rgba(0,0,0,0.3)" strokeWidth="0.8" />
                        </g>
                      </svg>
                    </button>
                  </div>
                </div>

                {/* Annotations */}
                <div style={S.hudRow}>
                  <span style={S.hudSep}>{'\u6A19\u8A18'}</span>
                  <div style={{ display: 'flex', gap: 4 }}>
                    {annots.map((a, i) => {
                      const isActive = (i === activeIdx && activeType === 'annot');
                      return (
                        <button key={a.id} style={S.hudAnnot(a.color, isActive)}
                          title={`${a.label} \u6A19\u8A18`}
                          onClick={() => selectEntity('annot', i)} />
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* HUD reveal */}
              <div style={S.hudReveal} onClick={() => setHudOpen(true)}>
                {'\u25B4 HUD'}
              </div>


            </div>
          </div>
        </div>
      </div>
    </>
  );
}
