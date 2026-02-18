// ════════════════════════════════════════
// 米字步訓練系統
// ════════════════════════════════════════
const TRAIN = {
  panelOpen: false,
  side: 'home',
  zones: { front: true, mid: true, back: true },
  interval: 2000,
  mode: 'random',   // 'random' | 'seq' | 'manual' | 'tactic'
  seqIndex: 0,
  setCount: 0,
  setTarget: 0,     // 0 = infinite
  tacticShot: null,
  running: false,
  currentLight: -1,
  timer: null,
  pulse: 0,
  pulseDir: 1,
  rafId: null,
};

let trainC = null; // train canvas context

function initTrainCanvas() {
  const tc = document.getElementById('train-overlay');
  tc.width  = CW;
  tc.height = CH;
  tc.style.cssText = `position:absolute;top:0;left:0;width:${CW}px;height:${CH}px;pointer-events:none;`;
  trainC = tc.getContext('2d');
}

function getTrainPositions() {
  const homeLeft = state.homeSide === 'left';
  const trainLeft = (TRAIN.side === 'home') ? homeLeft : !homeLeft;
  const sTop = 0.46;
  const sBot = COURT_H - 0.46;
  const net  = COURT_W / 2;
  const ssl  = 1.98;   // short service line distance from net
  const lsl  = 0.76;   // long service line from back
  const midH = (COURT_H - 0.46 * 2) / 2 + 0.46;

  let fX, mX, bX;
  if (trainLeft) {
    fX = net - ssl;
    mX = (lsl + (net - ssl)) / 2;
    bX = lsl;
  } else {
    fX = net + ssl;
    mX = (COURT_W - lsl + (net + ssl)) / 2;
    bX = COURT_W - lsl;
  }

  return [
    { id: 'FL', x: fX, y: sTop,  zone: 'front', label: '前左' },
    { id: 'FR', x: fX, y: sBot,  zone: 'front', label: '前右' },
    { id: 'ML', x: mX, y: sTop,  zone: 'mid',   label: '中左' },
    { id: 'MR', x: mX, y: sBot,  zone: 'mid',   label: '中右' },
    { id: 'BL', x: bX, y: sTop,  zone: 'back',  label: '後左' },
    { id: 'BR', x: bX, y: sBot,  zone: 'back',  label: '後右' },
  ];
}

function getActiveTrainPositions() {
  return getTrainPositions().filter(p => TRAIN.zones[p.zone]);
}

function drawTrainLights() {
  if (!trainC) return;
  const tc = document.getElementById('train-overlay');
  trainC.clearRect(0, 0, CW, CH);
  if (!TRAIN.panelOpen) { tc.style.display = 'none'; return; }
  tc.style.display = 'block';

  const homeLeft  = state.homeSide === 'left';
  const trainLeft = (TRAIN.side === 'home') ? homeLeft : !homeLeft;
  const sTop = 0.46;
  const sBot = COURT_H - 0.46;
  const net  = COURT_W / 2;   // 6.7 m
  const ssl  = 1.98;           // short service line dist from net
  const lsl  = 0.76;           // long service line from baseline

  // ── 3D 透視梯形設定 ──────────────────────────────
  // 底部 = 底線（近看）寬，頂部 = 網（遠端）窄
  const cxC    = CW * 0.5;
  const nearY  = CH * 0.84;       // 底線位置 (畫面底部)
  const farY   = CH * 0.08;       // 網端位置 (畫面頂部)
  const nearHW = Math.min(CW, CH * 2.1) * 0.41; // 底線半寬
  const farHW  = nearHW * 0.30;                  // 網端半寬 (透視縮減)

  const bl = { x: cxC - nearHW, y: nearY };
  const br = { x: cxC + nearHW, y: nearY };
  const tl = { x: cxC - farHW,  y: farY  };
  const tr = { x: cxC + farHW,  y: farY  };

  // 透視映射：u=0(左側線),1(右側線); v=0(底線),1(網)
  function pm(u, v) {
    const lx = bl.x + (tl.x - bl.x) * v;
    const rx = br.x + (tr.x - br.x) * v;
    const y  = bl.y + (tl.y - bl.y) * v;
    return { x: lx + (rx - lx) * u, y };
  }

  // 比賽座標 → 正規化 UV
  function gameToUV(gx, gy) {
    // v: 0=底線(距網最遠),1=網端
    const v = trainLeft ? (gx / net) : ((COURT_W - gx) / net);
    // u: 0=sTop 側線, 1=sBot 側線
    const u = (gy - sTop) / (sBot - sTop);
    return { u: Math.max(0, Math.min(1, u)), v: Math.max(0, Math.min(1, v)) };
  }

  // ── 暗色背景 ──────────────────────────────────────
  trainC.fillStyle = 'rgba(0,0,12,0.90)';
  trainC.fillRect(0, 0, CW, CH);

  trainC.save();

  // ── 球場面 ────────────────────────────────────────
  trainC.beginPath();
  trainC.moveTo(bl.x, bl.y);
  trainC.lineTo(br.x, br.y);
  trainC.lineTo(tr.x, tr.y);
  trainC.lineTo(tl.x, tl.y);
  trainC.closePath();
  const surfGrad = trainC.createLinearGradient(cxC, nearY, cxC, farY);
  surfGrad.addColorStop(0, 'rgba(22, 90, 42, 0.95)');
  surfGrad.addColorStop(1, 'rgba(8,  40, 20, 0.88)');
  trainC.fillStyle = surfGrad;
  trainC.fill();

  // 球場外框
  trainC.strokeStyle = 'rgba(80, 200, 110, 0.90)';
  trainC.lineWidth = 2;
  trainC.stroke();

  // ── 球場內部線條 helper ───────────────────────────
  function courtLine(u0, v0, u1, v1, col, lw, dash) {
    const A = pm(u0, v0), B = pm(u1, v1);
    trainC.save();
    trainC.beginPath();
    trainC.moveTo(A.x, A.y);
    trainC.lineTo(B.x, B.y);
    if (dash) trainC.setLineDash(dash);
    trainC.strokeStyle = col;
    trainC.lineWidth   = lw;
    trainC.stroke();
    trainC.restore();
  }

  // 後場長發球線 (doubles long service line)
  const vLSL = lsl / net;                 // ≈ 0.113
  courtLine(0, vLSL, 1, vLSL, 'rgba(80,200,110,0.55)', 1.2);

  // 前場短發球線 (short service line)
  const vSSL = (net - ssl) / net;         // ≈ 0.705
  courtLine(0, vSSL, 1, vSSL, 'rgba(80,200,110,0.70)', 1.5);

  // 中線 (center line): SSL → net
  courtLine(0.5, 0.0, 0.5, 1.0, 'rgba(80,200,110,0.55)', 1.2);

  // 側邊線 (增加立體感)
  courtLine(0.0, 0.0, 0.0, 1.0, 'rgba(80,200,110,0.45)', 1.0);
  courtLine(1.0, 0.0, 1.0, 1.0, 'rgba(80,200,110,0.45)', 1.0);

  // 網線 (虛線，帶高亮)
  courtLine(0, 1, 1, 1, 'rgba(255,240,160,0.95)', 2.5, [5, 4]);

  // ── 網標籤 ────────────────────────────────────────
  const netMid = pm(0.5, 1);
  trainC.fillStyle = 'rgba(255,240,140,0.90)';
  trainC.font = `bold ${Math.max(9, Math.round(CH * 0.022))}px Arial`;
  trainC.textAlign = 'center';
  trainC.textBaseline = 'bottom';
  trainC.fillText('網 NET', netMid.x, netMid.y - 3);

  // ── 球員標記 ──────────────────────────────────────
  const playerMid = pm(0.5, 0);
  trainC.fillStyle = 'rgba(255,255,140,0.80)';
  trainC.font = `bold ${Math.max(9, Math.round(CH * 0.022))}px Arial`;
  trainC.textAlign = 'center';
  trainC.textBaseline = 'top';
  trainC.fillText('▲ 球員', playerMid.x, playerMid.y + 4);

  // ── 訓練光點 ─────────────────────────────────────
  const pts = getTrainPositions();
  const baseR = Math.max(10, Math.min(CW, CH) * 0.040);

  pts.forEach((p, i) => {
    const { u, v } = gameToUV(p.x, p.y);
    const pos = pm(u, v);

    // 透視縮放：底線最大，網端最小
    const perspScale = 0.38 + 0.62 * (1 - v);
    const r = baseR * perspScale;

    const isActive = (i === TRAIN.currentLight);
    const inZone   = TRAIN.zones[p.zone];

    if (!inZone) {
      // 非啟用區域：灰暗小點
      trainC.beginPath();
      trainC.arc(pos.x, pos.y, r * 0.50, 0, Math.PI * 2);
      trainC.fillStyle = 'rgba(60,70,80,0.50)';
      trainC.fill();
    } else if (isActive) {
      // 當前目標：脈衝光暈
      const glow = r * (1.6 + TRAIN.pulse * 1.0);
      const grad = trainC.createRadialGradient(pos.x, pos.y, r * 0.15, pos.x, pos.y, glow);
      grad.addColorStop(0,   'rgba(0,255,100,1.0)');
      grad.addColorStop(0.35,'rgba(0,230,80,0.70)');
      grad.addColorStop(0.70,'rgba(0,180,60,0.30)');
      grad.addColorStop(1,   'rgba(0,150,50,0)');
      trainC.beginPath();
      trainC.arc(pos.x, pos.y, glow, 0, Math.PI * 2);
      trainC.fillStyle = grad;
      trainC.fill();

      // 實心圓
      trainC.beginPath();
      trainC.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      trainC.fillStyle = '#00ff66';
      trainC.fill();
      trainC.strokeStyle = '#ffffff';
      trainC.lineWidth = Math.max(1.5, r * 0.18);
      trainC.stroke();

      // 標籤
      trainC.fillStyle = '#ffffff';
      trainC.font = `bold ${Math.max(9, Math.round(r * 0.90))}px Arial`;
      trainC.textAlign = 'center';
      trainC.textBaseline = 'middle';
      trainC.fillText(p.label, pos.x, pos.y);
    } else {
      // 一般等待點
      trainC.beginPath();
      trainC.arc(pos.x, pos.y, r * 0.70, 0, Math.PI * 2);
      trainC.fillStyle = 'rgba(0,160,70,0.28)';
      trainC.fill();
      trainC.strokeStyle = 'rgba(0,220,100,0.65)';
      trainC.lineWidth = Math.max(1, r * 0.14);
      trainC.stroke();

      trainC.fillStyle = 'rgba(180,255,200,0.85)';
      trainC.font = `${Math.max(8, Math.round(r * 0.72))}px Arial`;
      trainC.textAlign = 'center';
      trainC.textBaseline = 'middle';
      trainC.fillText(p.label, pos.x, pos.y);
    }
  });

  trainC.restore();
}

function trainPulseLoop() {
  if (!TRAIN.running) return;
  TRAIN.pulse += TRAIN.pulseDir * 0.05;
  if (TRAIN.pulse >= 1) { TRAIN.pulse = 1; TRAIN.pulseDir = -1; }
  if (TRAIN.pulse <= 0) { TRAIN.pulse = 0; TRAIN.pulseDir =  1; }
  drawTrainLights();
  TRAIN.rafId = requestAnimationFrame(trainPulseLoop);
}

function pickNextLight() {
  const pts = getTrainPositions();
  const activePts = [];
  for (let i = 0; i < pts.length; i++) {
    if (TRAIN.zones[pts[i].zone]) activePts.push(i);
  }
  if (activePts.length === 0) return;

  if (TRAIN.mode === 'seq') {
    TRAIN.seqIndex = TRAIN.seqIndex % activePts.length;
    TRAIN.currentLight = activePts[TRAIN.seqIndex];
    TRAIN.seqIndex = (TRAIN.seqIndex + 1) % activePts.length;
  } else {
    let pool = activePts.filter(i => i !== TRAIN.currentLight);
    if (pool.length === 0) pool = activePts;
    TRAIN.currentLight = pool[Math.floor(Math.random() * pool.length)];
  }
  TRAIN.pulse = 0; TRAIN.pulseDir = 1;
  TRAIN.tacticShot = null;
  if (TRAIN.mode === 'tactic') updateTacticHint();
}

function startTraining() {
  if (getActiveTrainPositions().length === 0) return;
  TRAIN.running = true;
  TRAIN.setCount = 0;
  TRAIN.seqIndex = 0;
  TRAIN.tacticShot = null;
  updateSetCounter();
  document.getElementById('train-start').textContent = '⏹ 停止訓練';
  document.getElementById('train-start').classList.add('running');
  pickNextLight();
  if (TRAIN.rafId) cancelAnimationFrame(TRAIN.rafId);
  TRAIN.rafId = requestAnimationFrame(trainPulseLoop);
  if (TRAIN.mode === 'random' || TRAIN.mode === 'seq') {
    TRAIN.timer = setInterval(() => {
      TRAIN.setCount++;
      updateSetCounter();
      if (checkSetTarget()) return;
      pickNextLight();
    }, TRAIN.interval);
  }
}

function stopTraining() {
  TRAIN.running = false;
  TRAIN.currentLight = -1;
  TRAIN.tacticShot = null;
  if (TRAIN.timer) { clearInterval(TRAIN.timer); TRAIN.timer = null; }
  if (TRAIN.rafId)  { cancelAnimationFrame(TRAIN.rafId); TRAIN.rafId = null; }
  document.getElementById('train-start').textContent = '▶ 開始訓練';
  document.getElementById('train-start').classList.remove('running');
  document.getElementById('tp-tactic-hint').style.display = 'none';
  updateSetCounter();
  drawTrainLights();
}

function toggleTraining() {
  if (TRAIN.running) stopTraining();
  else startTraining();
}

function toggleTrainPanel() {
  TRAIN.panelOpen = !TRAIN.panelOpen;
  document.getElementById('train-panel').classList.toggle('open', TRAIN.panelOpen);
  document.getElementById('btn-train').classList.toggle('on', TRAIN.panelOpen);
  if (!TRAIN.panelOpen) stopTraining();
  drawTrainLights();
}

function setTrainSide(side) {
  TRAIN.side = side;
  document.getElementById('tp-home').classList.toggle('on', side === 'home');
  document.getElementById('tp-away').classList.toggle('on', side === 'away');
  if (TRAIN.running) { stopTraining(); startTraining(); }
  else drawTrainLights();
}

function toggleTrainZone(zone) {
  TRAIN.zones[zone] = !TRAIN.zones[zone];
  document.getElementById('tp-' + zone).classList.toggle('on', TRAIN.zones[zone]);
  if (TRAIN.running) { stopTraining(); startTraining(); }
  else drawTrainLights();
}

function setTrainMode(mode) {
  TRAIN.mode = mode;
  ['random','seq','manual','tactic'].forEach(m => {
    document.getElementById('tp-mode-'+m).classList.toggle('on', m === mode);
  });
  const intervalRow = document.getElementById('tp-interval-row');
  const manualRow   = document.getElementById('tp-manual-row');
  const tacticHint  = document.getElementById('tp-tactic-hint');
  const hintText    = document.getElementById('tp-hint-text');
  intervalRow.style.display = (mode === 'manual' || mode === 'tactic') ? 'none' : '';
  manualRow.style.display   = (mode === 'manual') ? '' : 'none';
  tacticHint.style.display  = 'none';
  const hints = {
    random: '隨機點亮其中一點<br>聽燈執行跑位',
    seq:    '按順序點亮各點<br>循環練習',
    manual: '點擊「下一點」切換<br>依學員速度控制節奏',
    tactic: '閃燈時提示對方站位<br>選擇最佳回球方向',
  };
  hintText.innerHTML = hints[mode];
  if (TRAIN.running) { stopTraining(); startTraining(); }
}

function setTrainIntervalPreset(ms) {
  TRAIN.interval = ms;
  const map = {1000:'tp-i1', 1500:'tp-i15', 2000:'tp-i2', 3000:'tp-i3', 5000:'tp-i5'};
  Object.values(map).forEach(id => document.getElementById(id).classList.remove('on'));
  if (map[ms]) document.getElementById(map[ms]).classList.add('on');
  if (TRAIN.running && (TRAIN.mode==='random'||TRAIN.mode==='seq')) {
    stopTraining(); startTraining();
  }
}

function setTrainTarget(n) {
  TRAIN.setTarget = n;
  const map = {10:'tp-t10', 20:'tp-t20', 30:'tp-t30', 0:'tp-tinf'};
  Object.values(map).forEach(id => document.getElementById(id).classList.remove('on'));
  if (map[n] !== undefined) document.getElementById(map[n]).classList.add('on');
  updateSetCounter();
}

function updateSetCounter() {
  const el = document.getElementById('tp-set-counter');
  const tx = document.getElementById('tp-set-text');
  if (TRAIN.running || TRAIN.setCount > 0) {
    el.style.display = '';
    const target = TRAIN.setTarget === 0 ? '∞' : TRAIN.setTarget;
    tx.textContent = '趟數：' + TRAIN.setCount + ' / ' + target;
  } else {
    el.style.display = 'none';
  }
}

function checkSetTarget() {
  if (TRAIN.setTarget > 0 && TRAIN.setCount >= TRAIN.setTarget) {
    stopTraining();
    return true;
  }
  return false;
}

function manualNext() {
  if (!TRAIN.running) return;
  TRAIN.setCount++;
  updateSetCounter();
  if (checkSetTarget()) return;
  pickNextLight();
}

const TACTIC_SCENARIOS = {
  FL: { desc:'對方後場右側', shots:['殺球','長球','平抽','過渡','放短'] },
  FR: { desc:'對方後場左側', shots:['殺球','長球','平抽','過渡','放短'] },
  ML: { desc:'對方中場右側', shots:['平抽','放短','殺球','過渡'] },
  MR: { desc:'對方中場左側', shots:['平抽','放短','殺球','過渡'] },
  BL: { desc:'對方前場右側', shots:['放短','平抽','過渡','長球'] },
  BR: { desc:'對方前場左側', shots:['放短','平抽','過渡','長球'] },
};

function updateTacticHint() {
  const pts = getTrainPositions();
  if (TRAIN.currentLight < 0 || TRAIN.currentLight >= pts.length) return;
  const pt = pts[TRAIN.currentLight];
  const keys = Object.keys(TACTIC_SCENARIOS);
  const key = keys[Math.floor(Math.random() * keys.length)];
  const scenario = TACTIC_SCENARIOS[key];
  document.getElementById('tp-tactic-text').textContent = '對手在：' + scenario.desc;
  const btns = document.getElementById('tp-shot-btns');
  btns.innerHTML = '';
  scenario.shots.forEach(s => {
    const b = document.createElement('button');
    b.className = 'tp-shot-btn';
    b.textContent = s;
    b.onclick = () => selectTacticShot(s, b);
    btns.appendChild(b);
  });
  document.getElementById('tp-tactic-hint').style.display = '';
}

function selectTacticShot(shot, btn) {
  TRAIN.tacticShot = shot;
  document.querySelectorAll('.tp-shot-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
}
