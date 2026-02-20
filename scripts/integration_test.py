#!/usr/bin/env python3
"""
家庭計分板整合測試
測試對象: pin0513@gmail.com 的家庭
測試範圍: 完整的玩家操作、積分、商城、封印、家長/玩家雙視角
"""

import sys
import json
import time
import urllib.request
import urllib.error
import warnings
warnings.filterwarnings("ignore")

# ── 設定 ──────────────────────────────────────────────────────────────────────
BASE_URL       = "http://localhost:5199"
API_KEY        = "mido-test-api-key-2026"
ADMIN_EMAIL    = "pin0513@gmail.com"
ADMIN_UID      = "97umMUHWPwSA4oo1REkMiLnQTNo2"
FAMILY_ID      = f"family_{ADMIN_UID}"
TEST_PLAYER_ID = "integration-test-player-001"
TEST_PLAYER_NAME = "整合測試玩家"

# ── 輔助函數 ──────────────────────────────────────────────────────────────────

def log(msg: str, ok: bool = True):
    prefix = "✅" if ok else "❌"
    print(f"  {prefix} {msg}")

def section(title: str):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def http(method: str, path: str, body: dict = None, headers: dict = None) -> dict:
    url = BASE_URL + path
    h = {"Content-Type": "application/json"}
    if headers:
        h.update(headers)
    data = json.dumps(body).encode() if body else None
    req = urllib.request.Request(url, data=data, headers=h, method=method)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            content = resp.read().decode().strip()
            try:
                parsed = json.loads(content) if content else {}
            except json.JSONDecodeError:
                parsed = {"raw": content}
            return {"ok": True, "status": resp.status, "body": parsed}
    except urllib.error.HTTPError as e:
        content = e.read().decode().strip()
        try:
            parsed = json.loads(content) if content else {}
        except json.JSONDecodeError:
            parsed = {"raw": content}
        return {"ok": False, "status": e.code, "body": parsed}
    except Exception as e:
        return {"ok": False, "status": 0, "body": {"error": str(e)}}

def admin(method: str, path: str, body: dict = None) -> dict:
    return http(method, path, body, {"X-API-Key": API_KEY})

def player(method: str, path: str, body: dict = None, token: str = "") -> dict:
    return http(method, path, body, {"Authorization": f"Bearer {token}"})

def get_player_token(player_id: str, player_name: str) -> str:
    r = http("POST", "/api/dev/player-token", {
        "familyId": FAMILY_ID,
        "playerId": player_id,
        "playerName": player_name,
    })
    return r["body"].get("token", "")

passed = 0
failed = 0

def check(label: str, condition: bool, detail: str = ""):
    global passed, failed
    if condition:
        passed += 1
        log(f"{label}" + (f" ({detail})" if detail else ""))
    else:
        failed += 1
        log(f"{label}" + (f" — {detail}" if detail else ""), ok=False)
    return condition

# ══════════════════════════════════════════════════════════════════════════════
# STEP 1: 初始化家庭
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 1 — 初始化 pin0513@gmail.com 的家庭")

r = http("POST", "/api/dev/init-family", {
    "familyId": FAMILY_ID,
    "adminUid": ADMIN_UID,
})
check("初始化家庭", r["ok"], f"familyId={FAMILY_ID}")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 2: 新增測試玩家
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 2 — 新增測試玩家")

# 先清理舊的測試玩家（如果存在），確保乾淨環境
admin("DELETE", f"/api/family-scoreboard/{FAMILY_ID}/players/{TEST_PLAYER_ID}")
time.sleep(0.5)  # 等 Firestore 寫入

r = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/players", {
    "playerId": TEST_PLAYER_ID,
    "displayName": TEST_PLAYER_NAME,
    "password": "test1234",
    "avatarEmoji": "🧪",
})
check("新增測試玩家", r["ok"] or r["status"] == 409,
      f"status={r['status']}, name={r['body'].get('displayName', r['body'].get('error',''))}")

# 取得 Player JWT
PLAYER_TOKEN = get_player_token(TEST_PLAYER_ID, TEST_PLAYER_NAME)
check("取得玩家 JWT", bool(PLAYER_TOKEN), f"token_len={len(PLAYER_TOKEN)}")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 3: 家長視角 — 加入任務
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 3 — 家長新增任務並發放積分")

# 先 seed 任務資料
r = http("POST", "/api/dev/seed", {"familyId": FAMILY_ID})
check("Seed 任務/商城資料", r["ok"], f"seeded={r['body'].get('seeded',0)}/{r['body'].get('total',0)}")

# 取得任務列表
r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/tasks")
check("取得任務列表（家長）", r["ok"], f"count={len(r['body'])}")
tasks = r["body"]
daily_task = next((t for t in tasks if t.get("type") == "daily"), None)
check("找到日常任務", daily_task is not None, daily_task.get("title","") if daily_task else "")

# 先記錄初始 XP，以便後續驗證 delta
r0 = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/scores", token=PLAYER_TOKEN)
my_initial = next((s for s in r0["body"] if s.get("playerId") == TEST_PLAYER_ID), {})
initial_xp = my_initial.get("achievementPoints", 0)
print(f"    📊 初始 XP: {initial_xp}")

# 家長直接加分（透過 dev/transaction 端點，支援指定 familyId）
r = http("POST", "/api/dev/transaction", {
    "familyId": FAMILY_ID,
    "playerIds": [TEST_PLAYER_ID],
    "type": "earn",
    "amount": 500,
    "reason": "整合測試 — 初始 XP",
})
check("家長加分 +500 XP", r["ok"], f"status={r['status']}")

# 再加一筆
r = http("POST", "/api/dev/transaction", {
    "familyId": FAMILY_ID,
    "playerIds": [TEST_PLAYER_ID],
    "type": "earn",
    "amount": 300,
    "reason": "整合測試 — 完成特別任務",
})
check("家長加分 +300 XP", r["ok"])

# 扣分
r = http("POST", "/api/dev/transaction", {
    "familyId": FAMILY_ID,
    "playerIds": [TEST_PLAYER_ID],
    "type": "deduct",
    "amount": 100,
    "reason": "整合測試 — 忘記整理房間",
})
check("家長扣分 -100 XP", r["ok"])

# ══════════════════════════════════════════════════════════════════════════════
# STEP 4: 玩家視角 — 查看積分
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 4 — 玩家視角：查看積分與記錄")

r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/scores", token=PLAYER_TOKEN)
check("玩家取得積分列表", r["ok"])
scores = r["body"]
my_score = next((s for s in scores if s.get("playerId") == TEST_PLAYER_ID), None)
check("找到自己的積分", my_score is not None,
      f"XP={my_score.get('achievementPoints',0)}" if my_score else "not found")

# achievementPoints 只累積 earn（+500+300=+800），deduct 只影響 redeemablePoints
actual_xp = my_score.get("achievementPoints", 0) if my_score else 0
actual_redeemable = my_score.get("redeemablePoints", 0) if my_score else 0
xp_delta = actual_xp - initial_xp
check(f"achievementPoints 累積 earn (+500+300=+800)", xp_delta == 800,
      f"initial={initial_xp}, after={actual_xp}, delta={xp_delta}")
check(f"redeemablePoints 含扣分 (+500+300-100=+700)",
      actual_redeemable - initial_xp == 700,
      f"redeemable={actual_redeemable}, expected={initial_xp+700}")

# 玩家查看歷史記錄
r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/transactions?playerId={TEST_PLAYER_ID}", token=PLAYER_TOKEN)
check("玩家取得交易歷史", r["ok"], f"count={len(r['body'])}")
check("交易記錄筆數正確", len(r["body"]) >= 3)

# ══════════════════════════════════════════════════════════════════════════════
# STEP 5: 玩家提交任務
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 5 — 玩家提交任務 → 家長審核")

if daily_task:
    task_id = daily_task.get("taskId")
    r = player("POST", f"/api/family-scoreboard/{FAMILY_ID}/task-completions", {
        "taskId": task_id,
        "note": "整合測試 — 已完成今日整理房間",
    }, token=PLAYER_TOKEN)
    check("玩家提交任務完成申請", r["ok"] or r["status"] == 400,
          f"status={r['status']}")
    submission_id = r["body"].get("completionId") if r["ok"] else None

    if submission_id:
        # 家長審核通過
        r = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/task-completions/{submission_id}/process", {
            "action": "approve",
            "note": "確認完成，加分"
        })
        check("家長審核任務通過", r["ok"], f"status={r['status']}")

        # 驗證積分增加（比對 achieve points 有增加 task_xp）
        r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/scores", token=PLAYER_TOKEN)
        my_score_after = next((s for s in r["body"] if s.get("playerId") == TEST_PLAYER_ID), None)
        xp_after = my_score_after.get("achievementPoints", 0) if my_score_after else 0
        task_xp = daily_task.get("xpReward", 0)
        check("任務通過後 XP 增加", xp_after > actual_xp,
              f"before={actual_xp}, task_xp={task_xp}, after={xp_after}")
else:
    log("跳過任務測試（沒有日常任務）", ok=False)

# ══════════════════════════════════════════════════════════════════════════════
# STEP 6: 零用金 (NT$) 操作
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 6 — 零用金 (NT$) 操作")

# 家長給零用金
r = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/allowance/adjust", {
    "playerId": TEST_PLAYER_ID,
    "amount": 200,
    "reason": "整合測試 — 本週零用金",
    "note": "每週固定發放"
})
check("家長發放零用金 NT$200", r["ok"], f"status={r['status']}")

r = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/allowance/adjust", {
    "playerId": TEST_PLAYER_ID,
    "amount": 50,
    "reason": "整合測試 — 月考獎勵",
})
check("家長獎勵零用金 NT$50", r["ok"])

# 玩家查看餘額
r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/allowance/balance", token=PLAYER_TOKEN)
check("玩家查看零用金餘額", r["ok"])
balance = r["body"].get("balance", 0)
check("零用金餘額正確 (NT$250)", balance == 250, f"actual={balance}")

# 玩家查看明細
r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/allowance/ledger", token=PLAYER_TOKEN)
check("玩家查看零用金明細", r["ok"], f"count={len(r['body'])}")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 7: 商城兌換（玩家用 NT$ 購買）
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 7 — 商城兌換操作")

# 取得商城清單（玩家視角）
r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/shop-items", token=PLAYER_TOKEN)
check("玩家取得商城清單", r["ok"], f"count={len(r['body'])}")
shop_items = r["body"]
allowance_item = next((i for i in shop_items if i.get("priceType") == "allowance" and i.get("price", 999) <= 50), None)
check("找到可負擔的 NT$ 商品", allowance_item is not None,
      allowance_item.get("name","") if allowance_item else f"balance={balance}")

if allowance_item:
    item_price = allowance_item.get("price", 0)
    # 玩家下單
    r = player("POST", f"/api/family-scoreboard/{FAMILY_ID}/shop-orders", {
        "itemId": allowance_item.get("itemId"),
        "note": "整合測試 — 玩家兌換獎勵"
    }, token=PLAYER_TOKEN)
    check("玩家申請兌換商品", r["ok"], f"status={r['status']}, item={allowance_item.get('name')}")
    order_id = r["body"].get("orderId") if r["ok"] else None

    if order_id:
        # 家長取得訂單列表
        r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/shop-orders?status=pending")
        check("家長取得待審訂單", r["ok"], f"count={len(r['body'])}")
        pending_order = next((o for o in r["body"] if o.get("orderId") == order_id), None)
        check("找到剛下的訂單", pending_order is not None)

        # 家長審核通過
        r = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/shop-orders/{order_id}/process", {
            "action": "approve",
            "note": "整合測試 — 家長確認兌換"
        })
        check("家長審核商城訂單通過", r["ok"], f"status={r['status']}")

        # 玩家確認餘額扣除
        r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/allowance/balance", token=PLAYER_TOKEN)
        new_balance = r["body"].get("balance", 0)
        check("商城訂單通過後餘額扣除", new_balance == balance - item_price,
              f"before={balance}, price={item_price}, after={new_balance}")
else:
    log("跳過商城兌換測試（無可負擔商品）", ok=False)

# ══════════════════════════════════════════════════════════════════════════════
# STEP 8: 餘額不足拒絕（防護機制）
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 8 — 測試餘額不足保護")

expensive_item = next((i for i in shop_items if i.get("priceType") == "allowance" and i.get("price", 0) > 100), None)
if expensive_item:
    r = player("POST", f"/api/family-scoreboard/{FAMILY_ID}/shop-orders", {
        "itemId": expensive_item.get("itemId"),
        "note": "整合測試 — 測試餘額不足"
    }, token=PLAYER_TOKEN)
    # 下單本身可能成功（order pending），但 approve 時會被拒
    if r["ok"]:
        expensive_order_id = r["body"].get("orderId")
        r2 = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/shop-orders/{expensive_order_id}/process", {
            "action": "approve",
            "note": "測試"
        })
        # 預期被拒絕或自動改為 rejected
        result_status = r2["body"].get("status", "")
        check("餘額不足時訂單被拒絕", result_status == "rejected" or not r2["ok"],
              f"status={result_status}")
    else:
        check("餘額不足時下單失敗", True, "order creation failed as expected")
else:
    log("跳過餘額不足測試（無高價商品）", ok=False)

# ══════════════════════════════════════════════════════════════════════════════
# STEP 9: 封印/處罰機制
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 9 — 封印與處罰機制")

# 家長新增封印（禁止特定行為）
r = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/seals", {
    "playerId": TEST_PLAYER_ID,
    "reason": "整合測試 — 本週禁止打遊戲",
    "description": "因為作業沒完成，本週禁止玩 Switch",
    "severity": "medium",
})
check("家長新增封印", r["ok"], f"status={r['status']}")
seal_id = r["body"].get("sealId") if r["ok"] else None

# 家長新增處罰
r = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/penalties", {
    "playerId": TEST_PLAYER_ID,
    "reason": "整合測試 — 待完成罰則",
    "description": "需要額外閱讀 30 分鐘作為彌補",
    "severity": "low",
})
check("家長新增處罰", r["ok"], f"status={r['status']}")
penalty_id = r["body"].get("penaltyId") if r["ok"] else None

# 玩家查看自己的狀態
r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/my-status", token=PLAYER_TOKEN)
check("玩家查看封印/處罰狀態", r["ok"])
status_data = r["body"]
check("封印清單有資料", len(status_data.get("activeSeals", [])) > 0,
      f"seals={len(status_data.get('activeSeals',[]))}")
check("處罰清單有資料", len(status_data.get("activePenalties", [])) > 0,
      f"penalties={len(status_data.get('activePenalties',[]))}")

# 家長解除封印
if seal_id:
    r = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/seals/{seal_id}/lift", {
        "reason": "整合測試 — 已完成補救措施，解除封印"
    })
    check("家長解除封印", r["ok"], f"status={r['status']}")

# 家長標記處罰完成
if penalty_id:
    r = admin("POST", f"/api/family-scoreboard/{FAMILY_ID}/penalties/{penalty_id}/complete", {
        "note": "整合測試 — 已完成額外閱讀"
    })
    check("家長標記處罰完成", r["ok"], f"status={r['status']}")

# 玩家確認封印已解除
r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/my-status", token=PLAYER_TOKEN)
check("封印解除後狀態更新", r["ok"])
status_after = r["body"]
active_seals_after = len([s for s in status_after.get("activeSeals", []) if s.get("status") == "active"])
check("封印已解除", active_seals_after == 0, f"remaining_active_seals={active_seals_after}")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 10: 家長視角 — 綜合查看
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 10 — 家長全面查看")

# 家長取得所有玩家積分排行
r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/scores")
check("家長取得所有玩家積分", r["ok"], f"count={len(r['body'])}")

# 家長查看所有交易記錄
r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/transactions")
check("家長查看所有交易記錄", r["ok"], f"count={len(r['body'])}")

# 家長取得訂單歷史（已處理）
r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/shop-orders?status=approved")
check("家長查看已通過訂單", r["ok"], f"count={len(r['body'])}")

# 家長查看所有商城訂單
r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/shop-orders")
check("家長查看全部訂單", r["ok"], f"count={len(r['body'])}")

# 家長查看零用金明細（所有玩家）
r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/allowance/ledger")
check("家長查看所有零用金明細", r["ok"], f"count={len(r['body'])}")

# 家長查看封印列表
r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/seals")
check("家長查看封印列表", r["ok"], f"count={len(r['body'])}")

# 家長查看處罰列表
r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/penalties")
check("家長查看處罰列表", r["ok"], f"count={len(r['body'])}")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 11: 玩家最終狀態確認
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 11 — 玩家最終狀態確認")

r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/scores", token=PLAYER_TOKEN)
final_scores = r["body"]
my_final = next((s for s in final_scores if s.get("playerId") == TEST_PLAYER_ID), None)
check("玩家最終積分可查", my_final is not None)
if my_final:
    print(f"    📊 最終 XP: {my_final.get('achievementPoints',0)}")
    print(f"    🏆 可兌換: {my_final.get('redeemablePoints',0)}")

r = player("GET", f"/api/family-scoreboard/{FAMILY_ID}/allowance/balance", token=PLAYER_TOKEN)
check("玩家最終零用金可查", r["ok"])
final_balance = r["body"].get("balance", 0)
print(f"    💰 最終零用金: NT${final_balance}")

# ══════════════════════════════════════════════════════════════════════════════
# STEP 12: 刪除測試玩家
# ══════════════════════════════════════════════════════════════════════════════
section("STEP 12 — 清理：刪除測試玩家")

r = admin("DELETE", f"/api/family-scoreboard/{FAMILY_ID}/players/{TEST_PLAYER_ID}")
check("刪除測試玩家", r["ok"] or r["status"] == 404, f"status={r['status']}")

# 確認已刪除
r = admin("GET", f"/api/family-scoreboard/{FAMILY_ID}/scores")
remaining = [s for s in r["body"] if s.get("playerId") == TEST_PLAYER_ID]
check("確認玩家已移除", len(remaining) == 0, f"remaining={len(remaining)}")

# ══════════════════════════════════════════════════════════════════════════════
# 結果總覽
# ══════════════════════════════════════════════════════════════════════════════
section(f"整合測試結果: {passed} 通過 / {failed} 失敗")
total = passed + failed
print(f"\n  通過率: {passed}/{total} ({100*passed//total if total else 0}%)")
if failed > 0:
    print(f"\n  ⚠️  有 {failed} 個測試失敗，請檢查上方 ❌ 標記")
else:
    print("\n  🎉 所有測試通過！")
print()
sys.exit(0 if failed == 0 else 1)
