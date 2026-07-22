/**
 * 家庭計分板 - 整合測試 (Playwright API Testing)
 *
 * 測試家庭: family_e2e-integration-test（與 pin0513@gmail.com 隔離，不影響真實資料）
 * 測試玩家: integration-test-player-001 (每次測試前重建，最後刪除)
 *
 * 測試範圍:
 *   家長視角 — 初始化家庭、新增任務/事件、發放 XP、零用金、審核
 *   玩家視角 — 查看積分、提交任務、查看商城、兌換獎勵、道具箱
 *   封印/處罰 — 新增、查詢、解除
 *   事件日曆 — 建立、查詢、更新、刪除
 *   道具效果 — 新增、玩家查詢、過期
 *   經濟系統 — currency allowance 交易、XP兌換零用金、提領申請+審核
 *   防護機制 — 餘額不足拒絕
 *   家長摘要 — 完整管理查詢（積分/交易/任務/商城/零用金/封印/處罰/效果/備份）
 *   清理       — 測試玩家刪除確認
 *
 * 注意: 使用 test.describe.serial 確保測試依序執行（狀態有前後依賴）
 */

import { test, expect, APIRequestContext } from '@playwright/test';

// ── 設定 ──────────────────────────────────────────────────────────────────────
const BASE_URL   = process.env.E2E_API_URL || 'http://localhost:5199';
const API_KEY    = process.env.E2E_API_KEY  || 'mido-test-api-key-2026';

// 每次測試用獨立的 test{datetime} 家庭，不污染任何真實帳號
// 格式: test20260220-143052（仿 test{datetime}@gmail.com 的 UID）
const RUN_TS     = new Date().toISOString().replace(/[-:T]/g, '').substring(0, 15);
const ADMIN_UID  = `test${RUN_TS}`;
const FAMILY_ID  = `family_${ADMIN_UID}`;
const PLAYER_ID  = 'integration-test-player-001';
const PLAYER_NAME = '整合測試玩家';

// ── 共用 helpers ──────────────────────────────────────────────────────────────
async function adminReq(req: APIRequestContext, method: string, path: string, body?: object) {
  return req.fetch(`${BASE_URL}${path}`, {
    method,
    headers: { 'X-API-Key': API_KEY, 'Content-Type': 'application/json' },
    data: body ? JSON.stringify(body) : undefined,
  });
}

async function playerReq(
  req: APIRequestContext,
  method: string,
  path: string,
  token: string,
  body?: object,
) {
  return req.fetch(`${BASE_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    data: body ? JSON.stringify(body) : undefined,
  });
}

// ══════════════════════════════════════════════════════════════════════════════
// 整合測試套件 (串行執行)
// ══════════════════════════════════════════════════════════════════════════════
test.describe.serial('家庭計分板整合測試', () => {
  // 串行共享狀態
  let playerToken = '';
  let firstDailyTaskId = '';
  let completionId = '';
  let orderId = '';
  let sealId = '';
  let penaltyId = '';
  let shopItemId = '';
  let balanceBeforePurchase = 0;
  let eventId = '';
  let effectId = '';
  let withdrawalId = '';

  // ── STEP 1: 初始化 ────────────────────────────────────────────────────────

  test('STEP 1-1: 初始化 E2E 測試家庭 (family_e2e-integration-test)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/dev/init-family`, {
      data: { familyId: FAMILY_ID, adminUid: ADMIN_UID },
    });
    expect(res.status()).toBe(200);
    console.log(`  ✓ 家庭初始化: ${FAMILY_ID}`);
  });

  test('STEP 1-2: 清理並重建測試玩家', async ({ request }) => {
    // 清理（允許 404）
    await adminReq(request, 'DELETE', `/api/family-scoreboard/${FAMILY_ID}/players/${PLAYER_ID}`);

    // 新建
    const res = await adminReq(request, 'POST', `/api/family-scoreboard/${FAMILY_ID}/players`, {
      playerId: PLAYER_ID,
      name: PLAYER_NAME,
      color: '#3b82f6',
      emoji: '🧪',
    });
    expect([200, 201]).toContain(res.status());
    console.log(`  ✓ 玩家建立: ${PLAYER_ID}`);
  });

  test('STEP 1-3: 取得玩家 JWT', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/dev/player-token`, {
      data: { familyId: FAMILY_ID, playerId: PLAYER_ID, playerName: PLAYER_NAME },
    });
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    playerToken = body.token as string;
    expect(playerToken.length).toBeGreaterThan(100);
    console.log(`  ✓ JWT 取得成功`);
  });

  test('STEP 1-4: Seed 任務與商城資料', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/dev/seed`, {
      data: { familyId: FAMILY_ID },
    });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.seeded).toBeGreaterThan(0);
    console.log(`  ✓ Seeded: ${body.seeded}/${body.total} items`);
  });

  // ── STEP 2: 家長加分/扣分 ─────────────────────────────────────────────────

  test('STEP 2-1: 家長加分 +500 XP', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/dev/transaction`, {
      data: { familyId: FAMILY_ID, playerIds: [PLAYER_ID], type: 'earn', amount: 500, reason: '整合測試 — 初始XP' },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.type).toBe('earn');
    expect(body.amount).toBe(500);
  });

  test('STEP 2-2: 家長加分 +300 XP', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/dev/transaction`, {
      data: { familyId: FAMILY_ID, playerIds: [PLAYER_ID], type: 'earn', amount: 300, reason: '整合測試 — 特別任務' },
    });
    expect(res.status()).toBe(201);
  });

  test('STEP 2-3: 家長扣分 -100 XP (redeemablePoints)', async ({ request }) => {
    const res = await request.post(`${BASE_URL}/api/dev/transaction`, {
      data: { familyId: FAMILY_ID, playerIds: [PLAYER_ID], type: 'deduct', amount: 100, reason: '整合測試 — 忘記整理房間' },
    });
    expect(res.status()).toBe(201);
  });

  // ── STEP 3: 玩家視角 — 積分查詢 ──────────────────────────────────────────

  test('STEP 3-1: 玩家查看積分 (achievementPoints=800, redeemable=700)', async ({ request }) => {
    const res = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/scores`, playerToken);
    expect(res.ok()).toBeTruthy();
    const scores = await res.json();
    const mine = scores.find((s: { playerId: string }) => s.playerId === PLAYER_ID);
    expect(mine).toBeDefined();
    // achievementPoints 只累計 earn（不含扣分）
    expect(mine.achievementPoints).toBe(800);   // 500+300
    // redeemablePoints 含扣分
    expect(mine.redeemablePoints).toBe(700);    // 500+300-100
    console.log(`  ✓ XP: achievement=${mine.achievementPoints}, redeemable=${mine.redeemablePoints}`);
  });

  test('STEP 3-2: 玩家查看交易歷史 (≥3筆)', async ({ request }) => {
    const res = await playerReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/transactions?playerId=${PLAYER_ID}`,
      playerToken,
    );
    expect(res.ok()).toBeTruthy();
    const history = await res.json();
    expect(history.length).toBeGreaterThanOrEqual(3);
    console.log(`  ✓ 交易紀錄: ${history.length} 筆`);
  });

  // ── STEP 4: 任務查詢 ──────────────────────────────────────────────────────

  test('STEP 4-1: 家長取得任務列表', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/tasks`);
    expect(res.ok()).toBeTruthy();
    const tasks = await res.json();
    expect(tasks.length).toBeGreaterThan(0);
    console.log(`  ✓ 任務列表: ${tasks.length} 個`);
  });

  test('STEP 4-2: 玩家查看可用任務', async ({ request }) => {
    const res = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/tasks/available`, playerToken);
    expect(res.ok()).toBeTruthy();
    const tasks = await res.json();
    expect(tasks.length).toBeGreaterThan(0);
    const daily = tasks.find((t: { type: string }) => t.type === 'daily');
    expect(daily).toBeDefined();
    firstDailyTaskId = daily.taskId;
    console.log(`  ✓ 可用任務: ${tasks.length} 個, 日常任務: "${daily.title}"`);
  });

  // ── STEP 5: 玩家提交任務 → 家長審核 ──────────────────────────────────────

  test('STEP 5-1: 玩家提交任務完成申請', async ({ request }) => {
    const res = await playerReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/task-completions`,
      playerToken,
      { taskId: firstDailyTaskId, note: '整合測試 — 今日任務完成' },
    );
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    completionId = body.completionId;
    expect(completionId).toBeTruthy();
    expect(body.status).toBe('pending');
    console.log(`  ✓ 任務提交: ${completionId}`);
  });

  test('STEP 5-2: 家長查看待審任務完成申請', async ({ request }) => {
    const res = await adminReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/task-completions?status=pending`,
    );
    expect(res.ok()).toBeTruthy();
    const completions = await res.json();
    const found = completions.find((c: { completionId: string }) => c.completionId === completionId);
    expect(found).toBeDefined();
    console.log(`  ✓ 待審任務: ${completions.length} 筆`);
  });

  test('STEP 5-3: 家長審核任務通過', async ({ request }) => {
    const res = await adminReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/task-completions/${completionId}/process`,
      { action: 'approve', note: '確認完成，加分' },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('approved');
    console.log(`  ✓ 任務審核通過`);
  });

  test('STEP 5-4: 任務通過後 achievementPoints 增加', async ({ request }) => {
    const res = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/scores`, playerToken);
    const scores = await res.json();
    const mine = scores.find((s: { playerId: string }) => s.playerId === PLAYER_ID);
    // 應 > 800 (加了任務 XP)
    expect(mine.achievementPoints).toBeGreaterThan(800);
    console.log(`  ✓ 任務後積分: achievementPoints=${mine.achievementPoints}`);
  });

  // ── STEP 6: 零用金 (NT$) ──────────────────────────────────────────────────

  test('STEP 6-1: 家長發放零用金 NT$200', async ({ request }) => {
    // 正確路徑: POST /allowance（不是 /allowance/adjust）
    const res = await adminReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/allowance`,
      { playerId: PLAYER_ID, amount: 200, reason: '整合測試 — 本週零用金', note: null },
    );
    expect(res.ok()).toBeTruthy();
    console.log(`  ✓ 零用金發放 NT$200`);
  });

  test('STEP 6-2: 家長獎勵零用金 NT$50 (月考獎勵)', async ({ request }) => {
    const res = await adminReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/allowance`,
      { playerId: PLAYER_ID, amount: 50, reason: '整合測試 — 月考100分獎勵', note: null },
    );
    expect(res.ok()).toBeTruthy();
  });

  test('STEP 6-3: 玩家查看零用金餘額 = NT$250', async ({ request }) => {
    const res = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.balance).toBe(250);
    console.log(`  ✓ 零用金: NT$${body.balance}`);
  });

  test('STEP 6-4: 玩家查看零用金明細 (≥2筆)', async ({ request }) => {
    const res = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/ledger`, playerToken);
    expect(res.ok()).toBeTruthy();
    const ledger = await res.json();
    expect(ledger.length).toBeGreaterThanOrEqual(2);
    console.log(`  ✓ 零用金明細: ${ledger.length} 筆`);
  });

  // ── STEP 7: 商城兌換 (NT$) ───────────────────────────────────────────────

  test('STEP 7-1: 玩家取得商城清單，找可負擔商品', async ({ request }) => {
    const res = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/shop-items`, playerToken);
    expect(res.ok()).toBeTruthy();
    const items = await res.json();
    expect(items.length).toBeGreaterThan(0);
    // 找有零用金標價的商品，價格 ≤ NT$50
    const affordable = items.find(
      (i: { allowancePrice: number }) => i.allowancePrice > 0 && i.allowancePrice <= 50,
    );
    expect(affordable).toBeDefined();
    shopItemId = affordable.itemId;
    console.log(`  ✓ 商城商品: ${items.length} 個, 選: "${affordable.name}" NT$${affordable.allowancePrice}`);
  });

  test('STEP 7-2: 玩家申請兌換商品', async ({ request }) => {
    // 記錄購買前的餘額
    const balRes = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    balanceBeforePurchase = (await balRes.json()).balance as number;

    const res = await playerReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/shop-orders`,
      playerToken,
      { itemId: shopItemId, paymentMethod: 'allowance', note: '整合測試 — 兌換獎勵' },
    );
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    orderId = body.orderId;
    expect(orderId).toBeTruthy();
    expect(body.status).toBe('pending');
    console.log(`  ✓ 訂單建立: ${orderId}`);
  });

  test('STEP 7-3: 家長查看待審訂單（含剛下的訂單）', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/shop-orders?status=pending`);
    expect(res.ok()).toBeTruthy();
    const orders = await res.json();
    const found = orders.find((o: { orderId: string }) => o.orderId === orderId);
    expect(found).toBeDefined();
    console.log(`  ✓ 待審訂單: ${orders.length} 筆`);
  });

  test('STEP 7-4: 家長審核通過商城訂單', async ({ request }) => {
    const res = await adminReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/shop-orders/${orderId}/process`,
      { action: 'approve', note: '整合測試 — 確認兌換' },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('approved');
    console.log(`  ✓ 訂單審核通過`);
  });

  test('STEP 7-5: 商城訂單通過後零用金餘額扣除', async ({ request }) => {
    const res = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    const body = await res.json();
    expect(body.balance).toBeLessThan(balanceBeforePurchase);
    expect(body.balance).toBeGreaterThanOrEqual(0);
    console.log(`  ✓ 餘額: NT$${balanceBeforePurchase} → NT$${body.balance}`);
  });

  // ── STEP 8: 餘額不足保護 ─────────────────────────────────────────────────

  test('STEP 8-1: 餘額不足時訂單自動被拒絕', async ({ request }) => {
    // 取得目前餘額
    const balRes = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    const balance = (await balRes.json()).balance as number;

    // 找比餘額貴的零用金商品
    const itemsRes = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/shop-items`, playerToken);
    const items = await itemsRes.json();
    const expensive = items.find(
      (i: { allowancePrice: number }) => i.allowancePrice > 0 && i.allowancePrice > balance,
    );

    if (!expensive) {
      console.log('  ⚠️ 沒有比目前餘額貴的商品，跳過此測試');
      return;
    }

    // 下單
    const orderRes = await playerReq(
      request, 'POST', `/api/family-scoreboard/${FAMILY_ID}/shop-orders`, playerToken,
      { itemId: expensive.itemId, paymentMethod: 'allowance', note: '測試餘額不足' },
    );
    const order = await orderRes.json();

    // 家長 approve → 應被自動拒絕（餘額不足）
    const processRes = await adminReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/shop-orders/${order.orderId}/process`,
      { action: 'approve', note: '測試' },
    );
    const processed = await processRes.json();
    expect(processed.status).toBe('rejected');
    expect(processed.note).toContain('零用金不足');
    console.log(`  ✓ 餘額不足保護: "${processed.note}"`);
  });

  // ── STEP 9: 封印與處罰機制 ───────────────────────────────────────────────

  test('STEP 9-1: 家長新增封印', async ({ request }) => {
    const res = await adminReq(
      request, 'POST', `/api/family-scoreboard/${FAMILY_ID}/seals`,
      { playerId: PLAYER_ID, reason: '整合測試 — 禁止打遊戲', description: '作業沒完成，禁止玩 Switch', severity: 'medium' },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    sealId = body.sealId;
    expect(sealId).toBeTruthy();
    console.log(`  ✓ 封印建立: ${sealId}`);
  });

  test('STEP 9-2: 家長新增處罰', async ({ request }) => {
    const res = await adminReq(
      request, 'POST', `/api/family-scoreboard/${FAMILY_ID}/penalties`,
      { playerId: PLAYER_ID, reason: '整合測試 — 補做任務', description: '需要額外閱讀 30 分鐘', severity: 'low' },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    penaltyId = body.penaltyId;
    expect(penaltyId).toBeTruthy();
    console.log(`  ✓ 處罰建立: ${penaltyId}`);
  });

  test('STEP 9-3: 玩家查看到封印與處罰 (my-status)', async ({ request }) => {
    const res = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/my-status`, playerToken);
    expect(res.ok()).toBeTruthy();
    const status = await res.json();
    expect(status.activeSeals.length).toBeGreaterThan(0);
    expect(status.activePenalties.length).toBeGreaterThan(0);
    console.log(`  ✓ 封印: ${status.activeSeals.length}個, 處罰: ${status.activePenalties.length}個`);
  });

  test('STEP 9-4: 家長解除封印', async ({ request }) => {
    const res = await adminReq(
      request, 'POST', `/api/family-scoreboard/${FAMILY_ID}/seals/${sealId}/lift`,
    );
    expect(res.ok()).toBeTruthy();
    console.log(`  ✓ 封印解除`);
  });

  test('STEP 9-5: 家長標記處罰完成', async ({ request }) => {
    const res = await adminReq(
      request, 'POST', `/api/family-scoreboard/${FAMILY_ID}/penalties/${penaltyId}/complete`,
      { note: '整合測試 — 閱讀完成' },
    );
    expect(res.ok()).toBeTruthy();
    console.log(`  ✓ 處罰完成`);
  });

  test('STEP 9-6: 確認封印已解除（玩家狀態）', async ({ request }) => {
    const res = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/my-status`, playerToken);
    const status = await res.json();
    const activeSeals = status.activeSeals.filter((s: { status: string }) => s.status === 'active');
    expect(activeSeals.length).toBe(0);
    console.log(`  ✓ 封印已全部解除`);
  });

  // ── STEP 10: 事件日曆 (Events) ────────────────────────────────────────────

  test('STEP 10-1: 家長新增事件', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const res = await adminReq(
      request, 'POST', `/api/family-scoreboard/${FAMILY_ID}/events`,
      {
        title: '整合測試 — 家庭出遊',
        type: 'outing',
        startDate: today,
        endDate: today,
        description: '整合測試用事件',
        emoji: '🏖️',
        color: '#4CAF50',
      },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    eventId = body.eventId;
    expect(eventId).toBeTruthy();
    console.log(`  ✓ 事件建立: ${eventId}`);
  });

  test('STEP 10-2: 玩家查看事件日曆', async ({ request }) => {
    const month = new Date().toISOString().substring(0, 7); // YYYY-MM
    const res = await playerReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/events?month=${month}`,
      playerToken,
    );
    expect(res.ok()).toBeTruthy();
    const events = await res.json();
    const found = events.find((e: { eventId: string }) => e.eventId === eventId);
    expect(found).toBeDefined();
    console.log(`  ✓ 玩家查到事件: "${found.title}"`);
  });

  test('STEP 10-3: 家長更新事件', async ({ request }) => {
    const today = new Date().toISOString().split('T')[0];
    const res = await adminReq(
      request, 'PUT', `/api/family-scoreboard/${FAMILY_ID}/events/${eventId}`,
      {
        title: '整合測試 — 家庭出遊（更新）',
        type: 'outing',
        startDate: today,
        endDate: today,
        description: '已更新的整合測試事件',
        emoji: '🏝️',
        color: '#2196F3',
      },
    );
    expect(res.ok()).toBeTruthy();
    console.log(`  ✓ 事件更新成功`);
  });

  test('STEP 10-4: 家長刪除事件', async ({ request }) => {
    const res = await adminReq(
      request, 'DELETE', `/api/family-scoreboard/${FAMILY_ID}/events/${eventId}`,
    );
    expect(res.ok()).toBeTruthy();
    console.log(`  ✓ 事件刪除成功`);
  });

  // ── STEP 11: 道具效果 (Active Effects) ───────────────────────────────────

  test('STEP 11-1: 家長為玩家新增道具效果 (XP 倍率)', async ({ request }) => {
    const res = await adminReq(
      request, 'POST', `/api/family-scoreboard/${FAMILY_ID}/active-effects`,
      {
        playerId: PLAYER_ID,
        name: '整合測試 — XP 雙倍道具',
        type: 'xp_multiplier',
        multiplier: 2.0,
        durationMinutes: 60,
        description: '測試用 XP 倍率效果',
        source: 'admin',
        sourceId: null,
      },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    effectId = body.effectId;
    expect(effectId).toBeTruthy();
    console.log(`  ✓ 道具效果建立: ${effectId}`);
  });

  test('STEP 11-2: 玩家查看自己的道具箱 (my-effects)', async ({ request }) => {
    const res = await playerReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/my-effects`,
      playerToken,
    );
    expect(res.ok()).toBeTruthy();
    const effects = await res.json();
    const found = effects.find((e: { effectId: string }) => e.effectId === effectId);
    expect(found).toBeDefined();
    console.log(`  ✓ 玩家道具箱: ${effects.length} 個效果`);
  });

  test('STEP 11-3: 家長查看全部活躍效果', async ({ request }) => {
    const res = await adminReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/active-effects?playerId=${PLAYER_ID}`,
    );
    expect(res.ok()).toBeTruthy();
    const effects = await res.json();
    expect(effects.length).toBeGreaterThanOrEqual(1);
    console.log(`  ✓ 活躍效果: ${effects.length} 個`);
  });

  test('STEP 11-4: 家長讓道具效果過期', async ({ request }) => {
    const res = await adminReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/active-effects/${effectId}/expire`,
    );
    expect(res.ok()).toBeTruthy();
    console.log(`  ✓ 效果過期`);
  });

  test('STEP 11-5: 玩家確認道具消失', async ({ request }) => {
    const res = await playerReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/my-effects`,
      playerToken,
    );
    expect(res.ok()).toBeTruthy();
    const effects = await res.json();
    const found = effects.find((e: { effectId: string }) => e.effectId === effectId);
    expect(found).toBeUndefined();
    console.log(`  ✓ 道具已過期，不再顯示`);
  });

  // ── STEP 11B: 零用金交易 (currency: 'allowance') ─────────────────────────

  test('STEP 11B-1: 家長用 currency: allowance 加零用金 +50', async ({ request }) => {
    // 記錄加值前餘額
    const balBefore = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    const before = (await balBefore.json()).balance as number;

    const res = await request.post(`${BASE_URL}/api/dev/transaction`, {
      data: {
        familyId: FAMILY_ID,
        playerIds: [PLAYER_ID],
        type: 'earn',
        amount: 50,
        reason: '整合測試 — currency allowance 加值',
        currency: 'allowance',
      },
    });
    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.currency).toBe('allowance');

    // 驗證零用金餘額增加
    const balAfter = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    const after = (await balAfter.json()).balance as number;
    expect(after).toBe(before + 50);
    console.log(`  ✓ 零用金 currency 交易: NT$${before} → NT$${after}`);
  });

  // 回歸測試：主計分板 /scores 必須回傳 allowanceBalance，否則首頁玩家卡片
  // 無法顯示零用金變動，使用者會誤判「currency: allowance 沒作用」
  test('STEP 11B-2: /scores 回傳的玩家資料必須包含 allowanceBalance', async ({ request }) => {
    const balRes = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    const expected = (await balRes.json()).balance as number;

    const scoresRes = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/scores`, playerToken);
    expect(scoresRes.ok()).toBeTruthy();
    const scores = await scoresRes.json();
    const player = scores.find((s: { playerId: string }) => s.playerId === PLAYER_ID);

    expect(player).toHaveProperty('allowanceBalance');
    expect(player.allowanceBalance).toBe(expected);
    console.log(`  ✓ /scores[${PLAYER_ID}].allowanceBalance = NT$${player.allowanceBalance}`);
  });

  // ── STEP 11C: XP→零用金兌換 ────────────────────────────────────────────────

  test('STEP 11C-1: 家長取得家庭設定 (匯率)', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/settings`);
    expect(res.ok()).toBeTruthy();
    const settings = await res.json();
    expect(settings.xpToAllowanceRate).toBe(10);
    expect(settings.xpToAllowanceEnabled).toBe(true);
    console.log(`  ✓ 家庭設定: 匯率=${settings.xpToAllowanceRate} XP/$1, 啟用=${settings.xpToAllowanceEnabled}`);
  });

  test('STEP 11C-2: XP→零用金兌換 (100 XP → $10)', async ({ request }) => {
    // 記錄兌換前的 XP 和零用金
    const scoresBefore = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/scores`, playerToken);
    const scoreBefore = (await scoresBefore.json()).find((s: { playerId: string }) => s.playerId === PLAYER_ID);
    const xpBefore = scoreBefore.redeemablePoints as number;

    const balBefore = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    const allowanceBefore = (await balBefore.json()).balance as number;

    // 執行兌換 (100 XP, 匯率 10:1 → $10)
    const res = await adminReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/exchange-xp`,
      { playerId: PLAYER_ID, xpAmount: 100 },
    );
    expect(res.ok()).toBeTruthy();
    const result = await res.json();
    expect(result.xpSpent).toBe(100);
    expect(result.allowanceGained).toBe(10);

    // 驗證 XP 減少
    expect(result.newRedeemablePoints).toBe(xpBefore - 100);
    // 驗證零用金增加
    expect(result.newAllowanceBalance).toBe(allowanceBefore + 10);
    console.log(`  ✓ XP 兌換: ${xpBefore} XP → ${result.newRedeemablePoints} XP, 零用金 NT$${allowanceBefore} → NT$${result.newAllowanceBalance}`);
  });

  // ── STEP 11D: 提領申請 + 審核 ──────────────────────────────────────────────

  test('STEP 11D-1: 玩家申請提領零用金 NT$10', async ({ request }) => {
    const res = await playerReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/withdrawals`,
      playerToken,
      { amount: 10, reason: '整合測試 — 提領零用金' },
    );
    expect([200, 201]).toContain(res.status());
    const body = await res.json();
    withdrawalId = body.requestId;
    expect(withdrawalId).toBeTruthy();
    expect(body.status).toBe('pending');
    expect(body.amount).toBe(10);
    console.log(`  ✓ 提領申請: ${withdrawalId}, NT$${body.amount}`);
  });

  test('STEP 11D-2: 玩家查看自己的提領紀錄', async ({ request }) => {
    const res = await playerReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/my-withdrawals`,
      playerToken,
    );
    expect(res.ok()).toBeTruthy();
    const withdrawals = await res.json();
    const found = withdrawals.find((w: { requestId: string }) => w.requestId === withdrawalId);
    expect(found).toBeDefined();
    expect(found.status).toBe('pending');
    console.log(`  ✓ 玩家提領紀錄: ${withdrawals.length} 筆`);
  });

  test('STEP 11D-3: 家長查看待審提領清單', async ({ request }) => {
    const res = await adminReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/withdrawals?status=pending`,
    );
    expect(res.ok()).toBeTruthy();
    const withdrawals = await res.json();
    const found = withdrawals.find((w: { requestId: string }) => w.requestId === withdrawalId);
    expect(found).toBeDefined();
    console.log(`  ✓ 待審提領: ${withdrawals.length} 筆`);
  });

  test('STEP 11D-4: 家長審核通過提領申請', async ({ request }) => {
    // 記錄審核前零用金餘額
    const balBefore = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    const before = (await balBefore.json()).balance as number;

    const res = await adminReq(
      request, 'POST',
      `/api/family-scoreboard/${FAMILY_ID}/withdrawals/${withdrawalId}/process`,
      { action: 'approve', note: '整合測試 — 確認提領' },
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.status).toBe('approved');

    // 驗證零用金餘額扣除
    const balAfter = await playerReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance/balance`, playerToken);
    const after = (await balAfter.json()).balance as number;
    expect(after).toBe(before - 10);
    console.log(`  ✓ 提領審核通過: 零用金 NT$${before} → NT$${after}`);
  });

  // ── STEP 12: 玩家資訊查詢 ────────────────────────────────────────────────

  test('STEP 12-1: 家長查看玩家狀態（seals/penalties/effects 彙整）', async ({ request }) => {
    const res = await adminReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/players/${PLAYER_ID}/status`,
    );
    expect(res.ok()).toBeTruthy();
    const status = await res.json();
    // 有 activeSeals、activePenalties、activeEffects 等欄位
    expect(status).toHaveProperty('activeSeals');
    expect(status).toHaveProperty('activePenalties');
    console.log(`  ✓ 玩家狀態彙整正常`);
  });

  test('STEP 12-2: 玩家查看自己的完整歷史紀錄 (my-history)', async ({ request }) => {
    const res = await playerReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/my-history`,
      playerToken,
    );
    expect(res.ok()).toBeTruthy();
    const history = await res.json();
    expect(history.length).toBeGreaterThan(0);
    console.log(`  ✓ 歷史紀錄: ${history.length} 筆`);
  });

  // ── STEP 13: 家長摘要 — 所有管理查詢 ─────────────────────────────────────

  test('STEP 13-1: 家長取得所有玩家積分排行', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/scores`);
    expect(res.ok()).toBeTruthy();
    const scores = await res.json();
    expect(scores.length).toBeGreaterThan(0);
    console.log(`  ✓ 積分排行榜: ${scores.length} 位玩家`);
  });

  test('STEP 13-2: 家長查看所有交易記錄', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/transactions`);
    expect(res.ok()).toBeTruthy();
    const txs = await res.json();
    expect(txs.length).toBeGreaterThan(0);
    console.log(`  ✓ 交易紀錄: ${txs.length} 筆`);
  });

  test('STEP 13-3: 家長查看所有任務完成申請', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/task-completions`);
    expect(res.ok()).toBeTruthy();
    const completions = await res.json();
    expect(completions.length).toBeGreaterThanOrEqual(1);
    console.log(`  ✓ 任務申請: ${completions.length} 筆`);
  });

  test('STEP 13-4: 家長查看已通過商城訂單', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/shop-orders?status=approved`);
    expect(res.ok()).toBeTruthy();
    const orders = await res.json();
    expect(orders.length).toBeGreaterThanOrEqual(1);
    console.log(`  ✓ 已通過訂單: ${orders.length} 筆`);
  });

  test('STEP 13-5: 家長查看所有商城訂單（全部狀態）', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/shop-orders`);
    expect(res.ok()).toBeTruthy();
    const orders = await res.json();
    expect(orders.length).toBeGreaterThan(0);
    console.log(`  ✓ 全部訂單: ${orders.length} 筆`);
  });

  test('STEP 13-6: 家長查看所有零用金明細', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/allowance`);
    expect(res.ok()).toBeTruthy();
    const ledger = await res.json();
    expect(ledger.length).toBeGreaterThan(0);
    console.log(`  ✓ 零用金明細: ${ledger.length} 筆`);
  });

  test('STEP 13-7: 家長查看封印清單', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/seals`);
    expect(res.ok()).toBeTruthy();
    const seals = await res.json();
    expect(seals.length).toBeGreaterThanOrEqual(1);
    console.log(`  ✓ 封印清單: ${seals.length} 筆`);
  });

  test('STEP 13-8: 家長查看處罰清單', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/penalties`);
    expect(res.ok()).toBeTruthy();
    const penalties = await res.json();
    expect(penalties.length).toBeGreaterThanOrEqual(1);
    console.log(`  ✓ 處罰清單: ${penalties.length} 筆`);
  });

  test('STEP 13-9: 家長查看全部活躍效果', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/active-effects`);
    expect(res.ok()).toBeTruthy();
    const effects = await res.json();
    // 效果已過期，長度 ≥ 0 即可
    expect(Array.isArray(effects)).toBeTruthy();
    console.log(`  ✓ 全部效果: ${effects.length} 筆`);
  });

  test('STEP 13-10: 家長查看任務模板', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/task-templates`);
    expect(res.ok()).toBeTruthy();
    const templates = await res.json();
    expect(Array.isArray(templates)).toBeTruthy();
    console.log(`  ✓ 任務模板: ${templates.length} 筆`);
  });

  test('STEP 13-11: 家長查看玩家零用金餘額', async ({ request }) => {
    const res = await adminReq(
      request, 'GET',
      `/api/family-scoreboard/${FAMILY_ID}/allowance/${PLAYER_ID}/balance`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('balance');
    console.log(`  ✓ 玩家零用金餘額: NT$${body.balance}`);
  });

  test('STEP 13-12: 家長匯出備份', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/backup`);
    expect(res.ok()).toBeTruthy();
    const backup = await res.json();
    expect(backup).toHaveProperty('familyId');
    console.log(`  ✓ 備份匯出成功`);
  });

  // ── STEP 13B: 訪客排行榜 ──────────────────────────────────────────────────

  let displayCode = '';

  test('STEP 13B-1: 產生家庭 display code', async ({ request }) => {
    const res = await adminReq(request, 'POST', `/api/family-scoreboard/generate-code?familyId=${FAMILY_ID}`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    displayCode = body.displayCode as string;
    expect(displayCode.length).toBeGreaterThanOrEqual(4);
    console.log(`  ✓ Display code: ${displayCode}`);
  });

  test('STEP 13B-2: 訪客排行榜 (GET /visitor?code=XXX)', async ({ request }) => {
    const res = await request.fetch(
      `${BASE_URL}/api/family-scoreboard/visitor?code=${displayCode}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.familyCode).toBe(displayCode);
    expect(Array.isArray(body.players)).toBeTruthy();
    expect(body.players.length).toBeGreaterThan(0);

    // 驗證玩家資料結構
    const player = body.players[0];
    expect(player).toHaveProperty('playerId');
    expect(player).toHaveProperty('name');
    expect(player).toHaveProperty('color');
    expect(player).toHaveProperty('achievementPoints');
    expect(player).toHaveProperty('hasPassword');
    // 家庭決定把零用金餘額公開展示給知道代碼的人（owner 2026-07-22 拍板）；反轉先前
    // 「訪客不得見零用金」的隱私設計，屬明知的 Information Disclosure，由資料擁有者明確授權接受。
    expect(player).toHaveProperty('allowanceBalance');
    console.log(`  ✓ 訪客排行榜: ${body.players.length} 位玩家, 第一名 ${player.name} (${player.achievementPoints} pts)`);
  });

  test('STEP 13B-3: 訪客排行榜 — 無效代碼回傳 404', async ({ request }) => {
    const res = await request.fetch(
      `${BASE_URL}/api/family-scoreboard/visitor?code=INVALID9999`,
    );
    expect(res.status()).toBe(404);
    console.log(`  ✓ 無效代碼正確回傳 404`);
  });

  test('STEP 13B-4: 訪客排行榜按成就點數降序排列', async ({ request }) => {
    const res = await request.fetch(
      `${BASE_URL}/api/family-scoreboard/visitor?code=${displayCode}`,
    );
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    const points = body.players.map((p: { achievementPoints: number }) => p.achievementPoints);
    for (let i = 1; i < points.length; i++) {
      expect(points[i - 1]).toBeGreaterThanOrEqual(points[i]);
    }
    console.log(`  ✓ 排行榜排序正確 (降序)`);
  });

  // ── STEP 14: 清理 ─────────────────────────────────────────────────────────

  test('STEP 14-1: 刪除測試玩家', async ({ request }) => {
    const res = await adminReq(request, 'DELETE', `/api/family-scoreboard/${FAMILY_ID}/players/${PLAYER_ID}`);
    expect([200, 204, 404]).toContain(res.status());
    console.log(`  ✓ 測試玩家 ${PLAYER_ID} 已刪除 (status=${res.status()})`);
  });

  test('STEP 14-2: 確認玩家已從積分榜移除', async ({ request }) => {
    const res = await adminReq(request, 'GET', `/api/family-scoreboard/${FAMILY_ID}/scores`);
    expect(res.ok()).toBeTruthy();
    const scores = await res.json();
    const found = scores.find((s: { playerId: string }) => s.playerId === PLAYER_ID);
    expect(found).toBeUndefined();
    console.log(`  ✓ 玩家已從積分榜移除`);
  });
});
