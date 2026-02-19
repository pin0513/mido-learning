'use client';

import React, {
  useRef,
  useState,
  useEffect,
  useCallback,
  type CSSProperties,
  type ChangeEvent,
} from 'react';
import type {
  HomeSide,
  TrainMode,
  ZoneKey,
  Zones,
  TrainPosition,
  OppPosition,
  TacticHint,
} from '../types';
import {
  COURT_W,
  COURT_H,
  SHORT_SERVICE_LINE,
  LONG_SERVICE_LINE,
  SIDE_MARGIN,
  TACTICS_MAP,
  SHOT_TYPES,
  OPP_POSITION_LABELS,
} from '../constants';

// ═══════════════════════════════════════════════════
// Round target options
// ═══════════════════════════════════════════════════
const ROUND_OPTIONS = [10, 20, 30, 0] as const; // 0 = infinity

// ═══════════════════════════════════════════════════
// Helper: build train positions for the "my side"
// ═══════════════════════════════════════════════════
function buildTrainPositions(homeSide: HomeSide): TrainPosition[] {
  const trainLeft = homeSide === 'left';
  const sTop = SIDE_MARGIN;
  const sBot = COURT_H - SIDE_MARGIN;
  const net = COURT_W / 2;

  let fX: number, mX: number, bX: number;
  if (trainLeft) {
    fX = net - SHORT_SERVICE_LINE;
    mX = (LONG_SERVICE_LINE + (net - SHORT_SERVICE_LINE)) / 2;
    bX = LONG_SERVICE_LINE;
  } else {
    fX = net + SHORT_SERVICE_LINE;
    mX = (COURT_W - LONG_SERVICE_LINE + (net + SHORT_SERVICE_LINE)) / 2;
    bX = COURT_W - LONG_SERVICE_LINE;
  }

  return [
    { id: 'FL', x: fX, y: sTop, zone: 'front', label: '\u524d\u5de6' },
    { id: 'FR', x: fX, y: sBot, zone: 'front', label: '\u524d\u53f3' },
    { id: 'ML', x: mX, y: sTop, zone: 'mid', label: '\u4e2d\u5de6' },
    { id: 'MR', x: mX, y: sBot, zone: 'mid', label: '\u4e2d\u53f3' },
    { id: 'BL', x: bX, y: sTop, zone: 'back', label: '\u5f8c\u5de6' },
    { id: 'BR', x: bX, y: sBot, zone: 'back', label: '\u5f8c\u53f3' },
  ];
}

// ═══════════════════════════════════════════════════
// Helper: build opponent positions
// ═══════════════════════════════════════════════════
function buildOppPositions(homeSide: HomeSide): OppPosition[] {
  const oppLeft = homeSide !== 'left';
  const sTop = SIDE_MARGIN;
  const sBot = COURT_H - SIDE_MARGIN;
  const net = COURT_W / 2;

  let fX: number, mX: number, bX: number;
  if (oppLeft) {
    fX = net - SHORT_SERVICE_LINE;
    mX = (LONG_SERVICE_LINE + (net - SHORT_SERVICE_LINE)) / 2;
    bX = LONG_SERVICE_LINE;
  } else {
    fX = net + SHORT_SERVICE_LINE;
    mX = (COURT_W - LONG_SERVICE_LINE + (net + SHORT_SERVICE_LINE)) / 2;
    bX = COURT_W - LONG_SERVICE_LINE;
  }

  return [
    { id: 'OFL', x: fX, y: sTop },
    { id: 'OFR', x: fX, y: sBot },
    { id: 'OML', x: mX, y: sTop },
    { id: 'OMR', x: mX, y: sBot },
    { id: 'OBL', x: bX, y: sTop },
    { id: 'OBR', x: bX, y: sBot },
  ];
}

// ═══════════════════════════════════════════════════
// Euclidean distance between two opponent positions
// ═══════════════════════════════════════════════════
function oppDist(a: OppPosition, b: OppPosition): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

// ═══════════════════════════════════════════════════
// Main Component
// ═══════════════════════════════════════════════════
function StepsTrainer() {
  // ── refs ──
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseRef = useRef(0);
  const pulseDirRef = useRef(1);

  // ── sequential mode tracking ──
  const seqIndexRef = useRef(0);

  // ── round counting ──
  const roundCounterRef = useRef(0); // picks in current round
  const roundsCompletedRef = useRef(0);

  // ── tactic mode state ──
  const tacticFrontBackRef = useRef<'front' | 'back'>('front');

  // ── state ──
  const [homeSide, setHomeSide] = useState<HomeSide>('left');
  const [hudOpen, setHudOpen] = useState(false);
  const [zones, setZones] = useState<Zones>({ front: true, mid: true, back: true });
  const [speedVal, setSpeedVal] = useState(10); // slider value; interval = val * 200
  const [mode, setMode] = useState<TrainMode>('random');
  const [running, setRunning] = useState(false);
  const [currentLight, setCurrentLight] = useState(-1);
  const [oppLight, setOppLight] = useState(-1);
  const [roundTarget, setRoundTarget] = useState(0); // 0 = infinity
  const [roundsDone, setRoundsDone] = useState(0);
  const [tacticHint, setTacticHint] = useState<TacticHint | null>(null);
  const [showManualHint, setShowManualHint] = useState(false);
  const [handDirection, setHandDirection] = useState<'上手' | '下手'>('上手');
  const [oppHand, setOppHand] = useState<'right' | 'left'>('right');

  // derived
  const interval = speedVal * 200;

  // ── refs that mirror latest state for use inside animation / interval callbacks ──
  const stateRef = useRef({
    homeSide,
    zones,
    running,
    currentLight,
    oppLight,
    mode,
    roundTarget,
    interval,
    handDirection,
    oppHand,
  });
  useEffect(() => {
    stateRef.current = {
      homeSide,
      zones,
      running,
      currentLight,
      oppLight,
      mode,
      roundTarget,
      interval,
      handDirection,
      oppHand,
    };
  }, [homeSide, zones, running, currentLight, oppLight, mode, roundTarget, interval, handDirection, oppHand]);

  // ═══════════════════════════════════════════════════
  // Canvas drawing (faithfully ported from source HTML)
  // ═══════════════════════════════════════════════════
  const drawScene = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const maybeCtx = canvas.getContext('2d');
    if (!maybeCtx) return;
    const ctx: CanvasRenderingContext2D = maybeCtx;

    const CW = canvas.width;
    const CH = canvas.height;

    // Approximate HUD height – use 46px collapsed, 140px expanded
    const hudH = hudOpen ? 140 : 46;
    const drawH = CH - hudH;
    const trainLeft = stateRef.current.homeSide === 'left';

    ctx.clearRect(0, 0, CW, CH);

    // ── Perspective anchor points ──
    const cx0 = CW / 2;
    const nW2 = CW * 0.44;
    const fW2 = CW * 0.20;
    const nearY = drawH * 0.90;
    const farY = drawH * 0.09;

    const NL = { x: cx0 - nW2, y: nearY };
    const NR = { x: cx0 + nW2, y: nearY };
    const FL = { x: cx0 - fW2, y: farY };
    const FR = { x: cx0 + fW2, y: farY };

    // meter coords → pixel
    function mapPt(mx: number, my: number) {
      const u = trainLeft ? mx / COURT_W : (COURT_W - mx) / COURT_W;
      const v = my / COURT_H;
      const lx = NL.x + u * (FL.x - NL.x);
      const ly = NL.y + u * (FL.y - NL.y);
      const rx = NR.x + u * (FR.x - NR.x);
      const ry = NR.y + u * (FR.y - NR.y);
      return { x: lx + v * (rx - lx), y: ly + v * (ry - ly) };
    }

    // perspective-scaled dot radius
    function dotR(mx: number) {
      const u = trainLeft ? mx / COURT_W : (COURT_W - mx) / COURT_W;
      const base = Math.max(9, Math.min(CW, drawH) * 0.019);
      return base * (1.6 - 1.0 * u);
    }

    // draw a 3D perspective line
    function line3D(
      x1: number, y1: number,
      x2: number, y2: number,
      col: string, w: number,
    ) {
      const a = mapPt(x1, y1);
      const b = mapPt(x2, y2);
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = col;
      ctx.lineWidth = w;
      ctx.stroke();
    }

    // ── 1. Background ──
    ctx.fillStyle = 'rgba(0,4,18,0.97)';
    ctx.fillRect(0, 0, CW, CH);

    // ── 2. Court surface (two-tone green) ──
    const netL = mapPt(COURT_W / 2, 0);
    const netR = mapPt(COURT_W / 2, COURT_H);

    // My half (near, brighter)
    ctx.beginPath();
    ctx.moveTo(NL.x, NL.y);
    ctx.lineTo(NR.x, NR.y);
    ctx.lineTo(netR.x, netR.y);
    ctx.lineTo(netL.x, netL.y);
    ctx.closePath();
    ctx.fillStyle = '#1b6b3e';
    ctx.fill();

    // Opponent half (far, darker)
    ctx.beginPath();
    ctx.moveTo(netL.x, netL.y);
    ctx.lineTo(netR.x, netR.y);
    ctx.lineTo(FR.x, FR.y);
    ctx.lineTo(FL.x, FL.y);
    ctx.closePath();
    ctx.fillStyle = '#11472a';
    ctx.fill();

    // ── 3. Court lines ──
    const lc = 'rgba(255,255,255,0.80)';
    const dimL = 'rgba(255,255,255,0.55)';
    const lw = Math.max(1.5, CW * 0.0015);

    // outer frame
    line3D(0, 0, 0, COURT_H, lc, lw);
    line3D(COURT_W, 0, COURT_W, COURT_H, lc, lw);
    line3D(0, 0, COURT_W, 0, lc, lw);
    line3D(0, COURT_H, COURT_W, COURT_H, lc, lw);

    // singles sidelines
    const sl = SIDE_MARGIN;
    line3D(0, sl, COURT_W, sl, dimL, lw);
    line3D(0, COURT_H - sl, COURT_W, COURT_H - sl, dimL, lw);

    // doubles long service lines
    const lsl = LONG_SERVICE_LINE;
    line3D(lsl, 0, lsl, COURT_H, dimL, lw);
    line3D(COURT_W - lsl, 0, COURT_W - lsl, COURT_H, dimL, lw);

    // short service lines & center line
    const sslD = SHORT_SERVICE_LINE;
    line3D(COURT_W / 2 - sslD, 0, COURT_W / 2 - sslD, COURT_H, dimL, lw);
    line3D(COURT_W / 2 + sslD, 0, COURT_W / 2 + sslD, COURT_H, dimL, lw);
    // center lines: long service line → short service line on each half
    line3D(lsl, COURT_H / 2, COURT_W / 2 - sslD, COURT_H / 2, dimL, lw);
    line3D(COURT_W / 2 + sslD, COURT_H / 2, COURT_W - lsl, COURT_H / 2, dimL, lw);

    // ── 4. Net (3D height feel) ──
    const netHpx = (nearY - farY) * 0.075;
    ctx.beginPath();
    ctx.moveTo(netL.x, netL.y - netHpx);
    ctx.lineTo(netR.x, netR.y - netHpx);
    ctx.strokeStyle = '#e8dfa0';
    ctx.lineWidth = Math.max(2, CW * 0.0020);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(netL.x, netL.y);
    ctx.lineTo(netL.x, netL.y - netHpx);
    ctx.moveTo(netR.x, netR.y);
    ctx.lineTo(netR.x, netR.y - netHpx);
    ctx.strokeStyle = '#c8b060';
    ctx.lineWidth = Math.max(2, CW * 0.0018);
    ctx.stroke();

    const s = stateRef.current;
    const pts = buildTrainPositions(s.homeSide);
    const oppPts = buildOppPositions(s.homeSide);

    // ── 5. Opponent positions (orange, far side) ──
    oppPts.forEach((p, i) => {
      const { x: px, y: py } = mapPt(p.x, p.y);
      const r = dotR(p.x);
      const isActive = i === s.oppLight && s.running;

      if (isActive) {
        const glow = r * (1.5 + pulseRef.current * 0.8);
        const grad = ctx.createRadialGradient(px, py, r * 0.2, px, py, glow);
        grad.addColorStop(0, 'rgba(255,160,0,0.9)');
        grad.addColorStop(0.4, 'rgba(220,100,0,0.6)');
        grad.addColorStop(1, 'rgba(180,60,0,0)');
        ctx.beginPath();
        ctx.arc(px, py, glow, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = '#ff9500';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(r * 0.9)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('\u00d7', px, py);
      } else {
        ctx.beginPath();
        ctx.arc(px, py, r * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,120,0,0.15)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,150,0,0.45)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }
    });

    // ── 6. My positions (green, near side) ──
    pts.forEach((p, i) => {
      const { x: px, y: py } = mapPt(p.x, p.y);
      const r = dotR(p.x);
      const isActive = i === s.currentLight;
      const inZone = s.zones[p.zone];

      // arrow rules: FL/FR/ML/MR (i<4) -> up-down; BL/BR (i>=4) -> up only
      const arrow = i < 4 ? '\u2191\u2193' : '\u2191';
      const arrowSz = i < 4 ? Math.round(r * 0.62) : Math.round(r * 0.92);

      if (!inZone) {
        // disabled zone -> dim ghost dot
        ctx.beginPath();
        ctx.arc(px, py, r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(80,80,100,0.35)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(120,120,150,0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      } else if (isActive) {
        // lit dot -> glow + large circle + direction card
        const glow = r * (1.5 + pulseRef.current * 0.8);
        const grad = ctx.createRadialGradient(px, py, r * 0.2, px, py, glow);
        grad.addColorStop(0, 'rgba(0,255,100,0.9)');
        grad.addColorStop(0.4, 'rgba(0,220,80,0.6)');
        grad.addColorStop(1, 'rgba(0,180,60,0)');
        ctx.beginPath();
        ctx.arc(px, py, glow, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(px, py, r, 0, Math.PI * 2);
        ctx.fillStyle = '#00ff66';
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Direction card for front/mid (i<4); back always shows ↑
        const hd = s.handDirection;
        const activeArrow = i < 4 ? (hd === '上手' ? '\u2191' : '\u2193') : '\u2191';
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${Math.round(r * 0.92)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(activeArrow, px, py);

        // Label card above the dot for front/mid positions
        if (i < 4) {
          const labelText = hd === '上手' ? '上手 \u2191' : '下手 \u2193';
          const cardFontSz = Math.max(12, Math.round(r * 0.55));
          ctx.font = `bold ${cardFontSz}px Arial`;
          const tw = ctx.measureText(labelText).width;
          const cardW = tw + cardFontSz * 0.8;
          const cardH = cardFontSz * 1.6;
          const cardX = px - cardW / 2;
          const cardY = py - r - cardH - 4;
          const cardColor = hd === '上手' ? 'rgba(0,120,255,0.85)' : 'rgba(255,80,0,0.85)';
          ctx.fillStyle = cardColor;
          ctx.beginPath();
          const cr = 5;
          ctx.moveTo(cardX + cr, cardY);
          ctx.lineTo(cardX + cardW - cr, cardY);
          ctx.quadraticCurveTo(cardX + cardW, cardY, cardX + cardW, cardY + cr);
          ctx.lineTo(cardX + cardW, cardY + cardH - cr);
          ctx.quadraticCurveTo(cardX + cardW, cardY + cardH, cardX + cardW - cr, cardY + cardH);
          ctx.lineTo(cardX + cr, cardY + cardH);
          ctx.quadraticCurveTo(cardX, cardY + cardH, cardX, cardY + cardH - cr);
          ctx.lineTo(cardX, cardY + cr);
          ctx.quadraticCurveTo(cardX, cardY, cardX + cr, cardY);
          ctx.closePath();
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.font = `bold ${cardFontSz}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText(labelText, px, cardY + cardH / 2);
        }
      } else {
        // inactive but enabled -> small dim circle + faded arrow
        ctx.beginPath();
        ctx.arc(px, py, r * 0.65, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0,180,80,0.22)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,220,100,0.52)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.fillStyle = 'rgba(180,255,200,0.65)';
        ctx.font = `${Math.round(arrowSz * 0.8)}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(arrow, px, py);
      }
    });
  }, [hudOpen]);

  // ═══════════════════════════════════════════════════
  // Canvas resize
  // ═══════════════════════════════════════════════════
  const handleResize = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    drawScene();
  }, [drawScene]);

  useEffect(() => {
    handleResize();
    window.addEventListener('resize', handleResize);
    const orientChange = () => setTimeout(handleResize, 200);
    window.addEventListener('orientationchange', orientChange);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', orientChange);
    };
  }, [handleResize]);

  // Redraw whenever relevant state changes
  useEffect(() => {
    drawScene();
  }, [homeSide, zones, currentLight, oppLight, running, hudOpen, handDirection, drawScene]);

  // ═══════════════════════════════════════════════════
  // Pulse animation loop
  // ═══════════════════════════════════════════════════
  const pulseLoop = useCallback(() => {
    if (!stateRef.current.running) return;
    pulseRef.current += pulseDirRef.current * 0.05;
    if (pulseRef.current >= 1) {
      pulseRef.current = 1;
      pulseDirRef.current = -1;
    }
    if (pulseRef.current <= 0) {
      pulseRef.current = 0;
      pulseDirRef.current = 1;
    }
    drawScene();
    rafRef.current = requestAnimationFrame(pulseLoop);
  }, [drawScene]);

  // ═══════════════════════════════════════════════════
  // Pick next light — per mode
  // ═══════════════════════════════════════════════════
  const getActivePool = useCallback((): number[] => {
    const pts = buildTrainPositions(stateRef.current.homeSide);
    const z = stateRef.current.zones;
    const pool: number[] = [];
    for (let i = 0; i < pts.length; i++) {
      if (z[pts[i].zone]) pool.push(i);
    }
    return pool;
  }, []);

  const checkRoundComplete = useCallback((activeCount: number) => {
    roundCounterRef.current += 1;
    if (roundCounterRef.current >= activeCount) {
      roundCounterRef.current = 0;
      roundsCompletedRef.current += 1;
      setRoundsDone(roundsCompletedRef.current);

      // Check if target reached
      const target = stateRef.current.roundTarget;
      if (target > 0 && roundsCompletedRef.current >= target) {
        // Stop training after this update cycle
        setTimeout(() => {
          stopTraining();
        }, 0);
      }
    }
  }, []);

  // Helper: decide hand direction for a position index
  const decideHand = useCallback((posIndex: number) => {
    if (posIndex < 4) {
      // front/mid: 50% 上手, 50% 下手
      setHandDirection(Math.random() < 0.5 ? '上手' : '下手');
    } else {
      // back: always 上手
      setHandDirection('上手');
    }
  }, []);

  const pickNextSequential = useCallback(() => {
    const pool = getActivePool();
    if (pool.length === 0) return;
    let idx = seqIndexRef.current % pool.length;
    const next = pool[idx];
    seqIndexRef.current = idx + 1;

    setCurrentLight(next);
    decideHand(next);
    // opponent via tactics
    const tactics = TACTICS_MAP[next];
    const opp = Math.random() < 0.8 ? tactics[0] : tactics[1];
    setOppLight(opp);
    pulseRef.current = 0;
    pulseDirRef.current = 1;

    checkRoundComplete(pool.length);
  }, [getActivePool, checkRoundComplete, decideHand]);

  const pickNextRandom = useCallback(() => {
    const pool = getActivePool();
    if (pool.length === 0) return;
    const cur = stateRef.current.currentLight;
    let filteredPool = pool.filter(i => i !== cur);
    if (filteredPool.length === 0) filteredPool = pool;
    const next = filteredPool[Math.floor(Math.random() * filteredPool.length)];

    setCurrentLight(next);
    decideHand(next);
    const tactics = TACTICS_MAP[next];
    const opp = Math.random() < 0.8 ? tactics[0] : tactics[1];
    setOppLight(opp);
    pulseRef.current = 0;
    pulseDirRef.current = 1;

    checkRoundComplete(pool.length);
  }, [getActivePool, checkRoundComplete, decideHand]);

  const pickNextManual = useCallback(() => {
    const pool = getActivePool();
    if (pool.length === 0) return;
    const cur = stateRef.current.currentLight;
    let filteredPool = pool.filter(i => i !== cur);
    if (filteredPool.length === 0) filteredPool = pool;
    const next = filteredPool[Math.floor(Math.random() * filteredPool.length)];

    setCurrentLight(next);
    decideHand(next);
    const tactics = TACTICS_MAP[next];
    const opp = Math.random() < 0.8 ? tactics[0] : tactics[1];
    setOppLight(opp);
    pulseRef.current = 0;
    pulseDirRef.current = 1;

    checkRoundComplete(pool.length);
  }, [getActivePool, checkRoundComplete, decideHand]);

  const pickNextTactic = useCallback(() => {
    const pool = getActivePool();
    if (pool.length === 0) return;
    const oppPts = buildOppPositions(stateRef.current.homeSide);

    // Decide my next position: alternate front/back with 30% chance of mid-court
    const doMidTransition = Math.random() < 0.3;

    let myNext: number;
    if (doMidTransition) {
      // Pick ML(2) or MR(3) from active pool
      const midPool = pool.filter(i => i === 2 || i === 3);
      if (midPool.length > 0) {
        myNext = midPool[Math.floor(Math.random() * midPool.length)];
      } else {
        // No mid available, fall through to normal logic
        myNext = pickTacticFrontBack(pool);
      }
    } else {
      myNext = pickTacticFrontBack(pool);
    }

    setCurrentLight(myNext);
    decideHand(myNext);

    // Opponent: farthest from current position, biased toward backhand side
    // Right-handed opponent's backhand = left side (indices 0,2,4)
    // Left-handed opponent's backhand = right side (indices 1,3,5)
    const curOpp = stateRef.current.oppLight;
    const oh = stateRef.current.oppHand;
    const backhandIndices = oh === 'right' ? [0, 2, 4] : [1, 3, 5];
    let oppNext: number;
    if (curOpp >= 0 && curOpp < oppPts.length) {
      const curOppPos = oppPts[curOpp];
      let maxScore = -1;
      oppNext = 0;
      for (let i = 0; i < oppPts.length; i++) {
        const d = oppDist(curOppPos, oppPts[i]);
        // 20% bonus when targeting backhand side
        const bonus = backhandIndices.includes(i) ? 1.2 : 1.0;
        const score = d * bonus;
        if (score > maxScore) {
          maxScore = score;
          oppNext = i;
        }
      }
    } else {
      // First pick — prefer backhand side
      oppNext = backhandIndices[Math.floor(Math.random() * backhandIndices.length)];
    }

    setOppLight(oppNext);
    pulseRef.current = 0;
    pulseDirRef.current = 1;

    // Build tactic hint
    const shotType = SHOT_TYPES[Math.floor(Math.random() * SHOT_TYPES.length)];
    const oppLabel = OPP_POSITION_LABELS[oppNext] ?? '';
    const pts = buildTrainPositions(stateRef.current.homeSide);
    const myLabel = pts[myNext]?.label ?? '';
    setTacticHint({ shot: shotType, opp: oppLabel, label: myLabel });

    checkRoundComplete(pool.length);
  }, [getActivePool, checkRoundComplete, decideHand]);

  // Helper for tactic: pick front or back, alternating
  function pickTacticFrontBack(pool: number[]): number {
    const current = tacticFrontBackRef.current;
    const next = current === 'front' ? 'back' : 'front';
    tacticFrontBackRef.current = next;

    let targetPool: number[];
    if (next === 'front') {
      // FL(0), FR(1)
      targetPool = pool.filter(i => i === 0 || i === 1);
    } else {
      // BL(4), BR(5)
      targetPool = pool.filter(i => i === 4 || i === 5);
    }

    if (targetPool.length > 0) {
      return targetPool[Math.floor(Math.random() * targetPool.length)];
    }
    // Fallback to any active position
    return pool[Math.floor(Math.random() * pool.length)];
  }

  const pickNext = useCallback(() => {
    const m = stateRef.current.mode;
    if (m === 'seq') pickNextSequential();
    else if (m === 'random') pickNextRandom();
    else if (m === 'manual') pickNextManual();
    else if (m === 'tactic') pickNextTactic();
  }, [pickNextSequential, pickNextRandom, pickNextManual, pickNextTactic]);

  // ═══════════════════════════════════════════════════
  // Start / Stop training
  // ═══════════════════════════════════════════════════
  const startTraining = useCallback(() => {
    const pool = getActivePool();
    if (pool.length === 0) return;

    // Reset round counters
    roundCounterRef.current = 0;
    roundsCompletedRef.current = 0;
    seqIndexRef.current = 0;
    setRoundsDone(0);
    setTacticHint(null);

    setRunning(true);
    stateRef.current.running = true;

    // First pick
    pickNext();

    // Start pulse animation
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(pulseLoop);

    // Start auto-advance timer (not for manual mode)
    if (stateRef.current.mode !== 'manual') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (stateRef.current.running) {
          pickNext();
        }
      }, stateRef.current.interval);
    } else {
      setShowManualHint(true);
    }
  }, [getActivePool, pickNext, pulseLoop]);

  const stopTraining = useCallback(() => {
    setRunning(false);
    stateRef.current.running = false;
    setCurrentLight(-1);
    stateRef.current.currentLight = -1;
    setOppLight(-1);
    stateRef.current.oppLight = -1;
    setShowManualHint(false);
    setTacticHint(null);

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    }
    drawScene();
  }, [drawScene]);

  const toggleTraining = useCallback(() => {
    if (stateRef.current.running) stopTraining();
    else startTraining();
  }, [startTraining, stopTraining]);

  // ═══════════════════════════════════════════════════
  // Home side switch
  // ═══════════════════════════════════════════════════
  const handleSetHomeSide = useCallback((side: HomeSide) => {
    setHomeSide(side);
    stateRef.current.homeSide = side;
    if (stateRef.current.running) stopTraining();
  }, [stopTraining]);

  // ═══════════════════════════════════════════════════
  // Zone toggle
  // ═══════════════════════════════════════════════════
  const toggleZone = useCallback((zone: ZoneKey) => {
    setZones(prev => {
      const next = { ...prev, [zone]: !prev[zone] };
      stateRef.current.zones = next;
      return next;
    });
    if (stateRef.current.running) {
      stopTraining();
      // Restart in next tick so state is updated
      setTimeout(() => startTraining(), 0);
    }
  }, [stopTraining, startTraining]);

  // ═══════════════════════════════════════════════════
  // Speed change
  // ═══════════════════════════════════════════════════
  const handleSpeedChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    const v = parseInt(e.target.value, 10);
    setSpeedVal(v);
    const newInterval = v * 200;
    stateRef.current.interval = newInterval;
    if (stateRef.current.running && stateRef.current.mode !== 'manual') {
      if (timerRef.current) clearInterval(timerRef.current);
      timerRef.current = setInterval(() => {
        if (stateRef.current.running) pickNext();
      }, newInterval);
    }
  }, [pickNext]);

  // ═══════════════════════════════════════════════════
  // Mode switch
  // ═══════════════════════════════════════════════════
  const handleModeChange = useCallback((m: TrainMode) => {
    setMode(m);
    stateRef.current.mode = m;
    if (stateRef.current.running) {
      stopTraining();
    }
  }, [stopTraining]);

  // ═══════════════════════════════════════════════════
  // Round target
  // ═══════════════════════════════════════════════════
  const handleRoundTarget = useCallback((n: number) => {
    setRoundTarget(n);
    stateRef.current.roundTarget = n;
  }, []);

  // ═══════════════════════════════════════════════════
  // Manual mode: tap/click canvas to advance
  // ═══════════════════════════════════════════════════
  const handleCanvasInteraction = useCallback(() => {
    if (!stateRef.current.running) return;
    if (stateRef.current.mode !== 'manual') return;
    pickNext();
  }, [pickNext]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onTouch = (e: TouchEvent) => {
      // Avoid interference with buttons
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea')) return;
      handleCanvasInteraction();
      e.preventDefault();
    };

    const onClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest('button, a, input, select, textarea')) return;
      handleCanvasInteraction();
    };

    canvas.addEventListener('touchend', onTouch, { passive: false });
    canvas.addEventListener('click', onClick);

    return () => {
      canvas.removeEventListener('touchend', onTouch);
      canvas.removeEventListener('click', onClick);
    };
  }, [handleCanvasInteraction]);

  // ═══════════════════════════════════════════════════
  // Keyboard shortcuts
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        toggleTraining();
      } else if (e.key === 'ArrowLeft') {
        handleSetHomeSide('left');
      } else if (e.key === 'ArrowRight') {
        handleSetHomeSide('right');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleTraining, handleSetHomeSide]);

  // ═══════════════════════════════════════════════════
  // Cleanup on unmount
  // ═══════════════════════════════════════════════════
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  // ═══════════════════════════════════════════════════
  // Derived display values
  // ═══════════════════════════════════════════════════
  const speedDisplay = (speedVal * 0.2).toFixed(1) + 's';
  const showSpeedSlider = mode !== 'manual';
  const showRoundTarget = mode === 'seq' || mode === 'random' || mode === 'tactic';
  const showRoundCounter = showRoundTarget && roundTarget > 0 && running;
  const showTacticHint = mode === 'tactic' && running && tacticHint !== null;

  // ═══════════════════════════════════════════════════
  // Styles
  // ═══════════════════════════════════════════════════
  const styles: Record<string, CSSProperties> = {
    root: {
      margin: 0,
      padding: 0,
      width: '100%',
      height: '100%',
      background: '#000',
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
    },
    canvas: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      display: 'block',
    },
    hudPanel: {
      position: 'fixed',
      bottom: 0,
      left: 0,
      right: 0,
      zIndex: 100,
      background: 'rgba(8,15,35,0.93)',
      borderTop: '1.5px solid rgba(30,200,100,0.35)',
      backdropFilter: 'blur(12px)',
      WebkitBackdropFilter: 'blur(12px)',
    },
    topbar: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      padding: '7px 14px',
      minHeight: '46px',
    },
    backLink: {
      color: '#4af',
      fontSize: '13px',
      textDecoration: 'none',
      padding: '5px 11px',
      borderRadius: '7px',
      border: '1px solid rgba(60,160,255,0.3)',
      background: 'rgba(20,50,100,0.5)',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      cursor: 'pointer',
    },
    title: {
      color: '#4f9',
      fontSize: '13px',
      fontWeight: 'bold',
      flex: 1,
      textAlign: 'center',
      letterSpacing: '0.5px',
    },
    sideGrp: {
      display: 'flex',
      gap: '4px',
      flexShrink: 0,
    },
    sideBtn: {
      padding: '5px 11px',
      borderRadius: '7px',
      fontSize: '12px',
      border: '1.5px solid rgba(255,255,255,0.15)',
      background: 'rgba(20,40,80,0.7)',
      color: '#adf',
      cursor: 'pointer',
      transition: 'background .12s',
    },
    sideBtnOn: {
      padding: '5px 11px',
      borderRadius: '7px',
      fontSize: '12px',
      border: '1.5px solid #0d9',
      background: 'rgba(0,175,80,0.75)',
      color: '#fff',
      cursor: 'pointer',
      transition: 'background .12s',
    },
    toggleBtn: {
      padding: '5px 11px',
      borderRadius: '7px',
      fontSize: '12px',
      border: '1px solid rgba(255,255,255,0.15)',
      background: 'rgba(20,30,65,0.7)',
      color: '#ccc',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      flexShrink: 0,
      transition: 'background .12s',
    },
    hudBody: {
      display: hudOpen ? 'flex' : 'none',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '10px',
      padding: '9px 14px 13px',
      borderTop: '1px solid rgba(255,255,255,0.07)',
    },
    tpGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '5px',
    },
    tpLabel: {
      fontSize: '10px',
      color: '#89c',
      minWidth: '26px',
    },
    tpBtn: {
      padding: '4px 11px',
      borderRadius: '6px',
      fontSize: '11px',
      border: '1.5px solid rgba(255,255,255,0.15)',
      background: 'rgba(15,52,96,0.7)',
      color: '#adf',
      cursor: 'pointer',
      transition: 'background .12s',
    },
    tpBtnOn: {
      padding: '4px 11px',
      borderRadius: '6px',
      fontSize: '11px',
      border: '1.5px solid #0d9',
      background: 'rgba(0,175,80,0.75)',
      color: '#fff',
      cursor: 'pointer',
      transition: 'background .12s',
    },
    sep: {
      width: '1px',
      height: '28px',
      background: 'rgba(255,255,255,0.12)',
      margin: '0 2px',
    },
    speedGrp: {
      display: 'flex',
      alignItems: 'center',
      gap: '6px',
    },
    speedInput: {
      width: '90px',
      accentColor: '#1a6',
      cursor: 'pointer',
    },
    speedVal: {
      fontSize: '10px',
      color: '#9bf',
    },
    startBtn: {
      padding: '6px 20px',
      borderRadius: '7px',
      border: 'none',
      background: running ? '#8b1a1a' : '#1a7a30',
      color: '#fff',
      fontSize: '12px',
      fontWeight: 'bold',
      cursor: 'pointer',
      marginLeft: 'auto',
      flexShrink: 0,
      transition: 'filter .12s',
    },
    hint: {
      fontSize: '9px',
      color: '#4a5a6a',
      width: '100%',
      textAlign: 'center',
      marginTop: '1px',
    },
    modeGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    modeBtn: {
      padding: '4px 9px',
      borderRadius: '6px',
      fontSize: '10px',
      border: '1.5px solid rgba(255,255,255,0.15)',
      background: 'rgba(15,52,96,0.7)',
      color: '#adf',
      cursor: 'pointer',
      transition: 'background .12s',
    },
    modeBtnOn: {
      padding: '4px 9px',
      borderRadius: '6px',
      fontSize: '10px',
      border: '1.5px solid #0d9',
      background: 'rgba(0,175,80,0.75)',
      color: '#fff',
      cursor: 'pointer',
      transition: 'background .12s',
    },
    roundGroup: {
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
    },
    roundBtn: {
      padding: '3px 8px',
      borderRadius: '5px',
      fontSize: '10px',
      border: '1.5px solid rgba(255,255,255,0.15)',
      background: 'rgba(15,52,96,0.7)',
      color: '#adf',
      cursor: 'pointer',
      transition: 'background .12s',
    },
    roundBtnOn: {
      padding: '3px 8px',
      borderRadius: '5px',
      fontSize: '10px',
      border: '1.5px solid #f90',
      background: 'rgba(200,120,0,0.65)',
      color: '#fff',
      cursor: 'pointer',
      transition: 'background .12s',
    },
    roundCounter: {
      fontSize: '11px',
      color: '#fa0',
      fontWeight: 'bold',
      padding: '2px 8px',
    },
    tacticDisplay: {
      fontSize: '11px',
      color: '#ff9',
      fontWeight: 'bold',
      padding: '2px 8px',
      background: 'rgba(255,200,0,0.12)',
      borderRadius: '5px',
      border: '1px solid rgba(255,200,0,0.25)',
    },
    manualHintOverlay: {
      position: 'fixed',
      top: '50%',
      left: '50%',
      transform: 'translate(-50%, -50%)',
      zIndex: 50,
      color: 'rgba(255,255,255,0.25)',
      fontSize: '18px',
      fontWeight: 'bold',
      pointerEvents: 'none',
      textAlign: 'center',
      letterSpacing: '1px',
    },
  };

  // ═══════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════
  return (
    <div style={styles.root}>
      <canvas ref={canvasRef} style={styles.canvas} />

      {/* Manual mode tap hint */}
      {running && mode === 'manual' && showManualHint && (
        <div style={styles.manualHintOverlay}>
          TAP ANYWHERE
        </div>
      )}

      {/* HUD Panel */}
      <div style={styles.hudPanel}>
        {/* Top bar (always visible) */}
        <div style={styles.topbar}>
          <a
            href="/badminton-board"
            style={styles.backLink}
            onClick={(e) => {
              // Allow default navigation
            }}
          >
            &larr; Back
          </a>
          <div style={styles.title}>
            米字步訓練器
          </div>
          <div style={styles.sideGrp}>
            <button
              style={homeSide === 'left' ? styles.sideBtnOn : styles.sideBtn}
              onClick={() => handleSetHomeSide('left')}
            >
              左側
            </button>
            <button
              style={homeSide === 'right' ? styles.sideBtnOn : styles.sideBtn}
              onClick={() => handleSetHomeSide('right')}
            >
              右側
            </button>
          </div>
          <button
            style={styles.toggleBtn}
            onClick={() => setHudOpen(!hudOpen)}
          >
            {hudOpen ? '\u25b4 收合' : '\u25be 設定'}
          </button>
        </div>

        {/* Settings body (collapsible) */}
        <div style={styles.hudBody}>
          {/* Mode selector */}
          <div style={styles.tpGroup}>
            <span style={styles.tpLabel}>模式</span>
            <div style={styles.modeGroup}>
              <button
                style={mode === 'seq' ? styles.modeBtnOn : styles.modeBtn}
                onClick={() => handleModeChange('seq')}
              >
                順序
              </button>
              <button
                style={mode === 'random' ? styles.modeBtnOn : styles.modeBtn}
                onClick={() => handleModeChange('random')}
              >
                隨機
              </button>
              <button
                style={mode === 'manual' ? styles.modeBtnOn : styles.modeBtn}
                onClick={() => handleModeChange('manual')}
              >
                手動
              </button>
              <button
                style={mode === 'tactic' ? styles.modeBtnOn : styles.modeBtn}
                onClick={() => handleModeChange('tactic')}
              >
                戰術
              </button>
            </div>
          </div>

          <div style={styles.sep} />

          {/* Zone toggles */}
          <div style={styles.tpGroup}>
            <span style={styles.tpLabel}>區域</span>
            <button
              style={zones.front ? styles.tpBtnOn : styles.tpBtn}
              onClick={() => toggleZone('front')}
            >
              前2
            </button>
            <button
              style={zones.mid ? styles.tpBtnOn : styles.tpBtn}
              onClick={() => toggleZone('mid')}
            >
              中2
            </button>
            <button
              style={zones.back ? styles.tpBtnOn : styles.tpBtn}
              onClick={() => toggleZone('back')}
            >
              後2
            </button>
          </div>

          <div style={styles.sep} />

          {/* Speed slider (hidden in manual mode) */}
          {showSpeedSlider && (
            <div style={styles.speedGrp}>
              <span style={styles.tpLabel}>間隔</span>
              <input
                type="range"
                min={5}
                max={30}
                value={speedVal}
                onChange={handleSpeedChange}
                style={styles.speedInput}
              />
              <span style={styles.speedVal}>{speedDisplay}</span>
            </div>
          )}

          {showSpeedSlider && <div style={styles.sep} />}

          {/* Round target (for seq / random / tactic) */}
          {showRoundTarget && (
            <>
              <div style={styles.tpGroup}>
                <span style={styles.tpLabel}>趟數</span>
                <div style={styles.roundGroup}>
                  {ROUND_OPTIONS.map((n) => (
                    <button
                      key={n}
                      style={roundTarget === n ? styles.roundBtnOn : styles.roundBtn}
                      onClick={() => handleRoundTarget(n)}
                    >
                      {n === 0 ? '\u221e' : n}
                    </button>
                  ))}
                </div>
              </div>

              {/* Round counter display */}
              {showRoundCounter && (
                <span style={styles.roundCounter}>
                  第 {roundsDone} / {roundTarget} 趟
                </span>
              )}

              <div style={styles.sep} />
            </>
          )}

          {/* Opponent hand toggle (tactic mode only) */}
          {mode === 'tactic' && (
            <>
              <div style={styles.tpGroup}>
                <span style={styles.tpLabel}>對手持拍</span>
                <button
                  style={oppHand === 'right' ? styles.modeBtnOn : styles.modeBtn}
                  onClick={() => setOppHand('right')}
                >
                  右手
                </button>
                <button
                  style={oppHand === 'left' ? styles.modeBtnOn : styles.modeBtn}
                  onClick={() => setOppHand('left')}
                >
                  左手
                </button>
              </div>
              <div style={styles.sep} />
            </>
          )}

          {/* Tactic hint display */}
          {showTacticHint && tacticHint && (
            <>
              <span style={styles.tacticDisplay}>
                {tacticHint.label} {tacticHint.shot} → {tacticHint.opp}
              </span>
              <div style={styles.sep} />
            </>
          )}

          {/* Start / Stop button */}
          <button
            style={styles.startBtn}
            onClick={toggleTraining}
          >
            {running ? '\u23f9 停止訓練' : '\u25b6 開始訓練'}
          </button>

          {/* Bottom hint */}
          <div style={styles.hint}>
            {mode === 'manual'
              ? '手動模式：點擊畫面任意處切換下一步'
              : mode === 'tactic'
                ? '🟢 我方站位 ↑↓上下手 / ↑純上手 ｜ 🟠 對方落點（最長距離）'
                : '🟢 我方站位 ↑↓上下手 / ↑純上手 ｜ 🟠 對方落點（重心破壞）'}
          </div>
        </div>
      </div>
    </div>
  );
}

export default StepsTrainer;
