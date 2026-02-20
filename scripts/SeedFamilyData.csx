#!/usr/bin/env dotnet-script
// SeedFamilyData - 為 pin0513@gmail.com 的家庭完整初始化資料
// 包含：玩家、商城、每日/週任務、事件、快速加扣分說明
//
// 執行方式：
//   dotnet script scripts/SeedFamilyData.csx

#r "nuget: Google.Cloud.Firestore, 3.7.0"
#r "nuget: FirebaseAdmin, 2.4.0"
#r "nuget: Google.Apis.Auth, 1.67.0"

using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using Google.Cloud.Firestore;
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;

// ── 設定 ─────────────────────────────────────────────────────────────────────
Environment.SetEnvironmentVariable(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "/Users/paul_huang/DEV/projects/mido-learning/credentials/firebase-admin-key.json"
);

Console.WriteLine("🔥 Initializing Firebase...");
FirebaseApp.Create(new AppOptions {
    Credential = GoogleCredential.GetApplicationDefault()
});

var db = FirestoreDb.Create("mido-learning");
var auth = FirebaseAuth.DefaultInstance;

// ── 取得家庭 ID ───────────────────────────────────────────────────────────────
Console.WriteLine("🔍 Looking up pin0513@gmail.com...");
var user = await auth.GetUserByEmailAsync("pin0513@gmail.com");
var uid = user.Uid;
var familyId = $"family_{uid}";
Console.WriteLine($"✓ UID: {uid}");
Console.WriteLine($"✓ FamilyId: {familyId}");
Console.WriteLine();

var familyRef = db.Collection("families").Document(familyId);
var now = Timestamp.GetCurrentTimestamp();

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 玩家（Upsert Ian & Justin）
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("👤 [1/5] Setting up players...");

async Task UpsertPlayer(string playerId, string name, string color, string emoji,
    string role, string birthday, int xp, int rp) {
    var ref_ = familyRef.Collection("scores").Document(playerId);
    var snap = await ref_.GetSnapshotAsync();
    if (snap.Exists) {
        // 只更新 meta，不動積分
        await ref_.UpdateAsync(new Dictionary<string, object> {
            ["name"]     = name,
            ["color"]    = color,
            ["emoji"]    = emoji,
            ["role"]     = role,
            ["birthday"] = birthday,
            ["updatedAt"] = now,
        });
        Console.WriteLine($"  ↻ Updated player: {name}");
    } else {
        await ref_.SetAsync(new Dictionary<string, object> {
            ["playerId"]           = playerId,
            ["name"]               = name,
            ["color"]              = color,
            ["emoji"]              = emoji,
            ["role"]               = role,
            ["birthday"]           = birthday,
            ["achievementPoints"]  = xp,
            ["redeemablePoints"]   = rp,
            ["totalEarned"]        = xp,
            ["totalDeducted"]      = 0,
            ["totalRedeemed"]      = 0,
            ["createdAt"]          = now,
            ["updatedAt"]          = now,
        });
        Console.WriteLine($"  + Created player: {name} (XP={xp}, RP={rp})");
    }
}

// Ian（米豆）生日: 2013-05-13  Justin（毛豆）生日: 2016-03-05
await UpsertPlayer("ian",    "Ian（米豆）",    "#f59e0b", "🌾", "大哥", "2013-05-13", 0, 0);
await UpsertPlayer("justin", "Justin（毛豆）", "#10b981", "🌿", "弟弟", "2016-03-05", 0, 0);

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 商城道具（skip if already has items）
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("\n🛒 [2/5] Seeding shop items...");

var shopRef = familyRef.Collection("shop-items");
var existingItems = await shopRef.GetSnapshotAsync();
if (existingItems.Count > 0) {
    Console.WriteLine($"  ⚠ Already has {existingItems.Count} shop items, skipping.");
} else {
    var shopItems = new[] {
        // ── 特權免除 ──────────────────────────────────
        new { name="豁免一次家事",       desc="本周可以跳過一次指定家事",             price=60,  type="privilege", emoji="👑", priceType="redeemable" },
        new { name="免洗碗一次",          desc="今天可以不用洗碗",                     price=40,  type="privilege", emoji="🍽️", priceType="redeemable" },
        new { name="延後睡覺30分鐘",      desc="今晚可以多玩30分鐘再睡覺",           price=80,  type="privilege", emoji="🌙", priceType="redeemable" },
        // ── 活動體驗 ──────────────────────────────────
        new { name="看一小時 YouTube",    desc="可以看一小時 YouTube 或影片",          price=50,  type="activity",  emoji="📺", priceType="redeemable" },
        new { name="打一小時電動/Switch", desc="可以玩一小時電動遊戲",                price=80,  type="activity",  emoji="🎮", priceType="redeemable" },
        new { name="週末外出選地點",      desc="週末出遊時你來決定去哪裡",            price=200, type="activity",  emoji="🗺️", priceType="redeemable" },
        new { name="點一個喜歡的晚餐",    desc="今天晚餐你說了算",                   price=120, type="activity",  emoji="🍜", priceType="redeemable" },
        // ── 實體物品 ──────────────────────────────────
        new { name="週末零食自選",        desc="週末可以挑一份零食",                  price=30,  type="physical",  emoji="🍫", priceType="redeemable" },
        new { name="買一本喜歡的書",      desc="可以選一本喜歡的書（200元以內）",    price=150, type="physical",  emoji="📚", priceType="redeemable" },
        new { name="小玩具/文具一樣",     desc="可以選一樣小玩具或文具（150元以內）",price=180, type="physical",  emoji="🧸", priceType="redeemable" },
    };

    var batch = db.StartBatch();
    foreach (var item in shopItems) {
        var itemId = Guid.NewGuid().ToString("N");
        batch.Set(shopRef.Document(itemId), new Dictionary<string, object> {
            ["itemId"]       = itemId,
            ["name"]         = item.name,
            ["description"]  = item.desc,
            ["price"]        = item.price,
            ["type"]         = item.type,
            ["emoji"]        = item.emoji,
            ["isActive"]     = true,
            ["priceType"]    = item.priceType,
            ["allowanceGiven"] = 0,
        });
        Console.WriteLine($"  + {item.emoji} {item.name} ({item.price} RP)");
    }
    await batch.CommitAsync();
    Console.WriteLine($"  ✓ Created {shopItems.Length} shop items.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 每日/週任務
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("\n📋 [3/5] Seeding tasks...");

var tasksRef = familyRef.Collection("tasks");
var existingTasks = await tasksRef.GetSnapshotAsync();
if (existingTasks.Count > 0) {
    Console.WriteLine($"  ⚠ Already has {existingTasks.Count} tasks, skipping.");
} else {
    var tasks = new[] {
        // ── 每日任務（兩人共用）────────────────────────
        new { title="整理書包和書桌",      type="household", diff="easy",   xp=5,  period="daily",  days=new[]{1,2,3,4,5},   players=new[]{"ian","justin"} },
        new { title="完成回家作業",         type="exam",      diff="easy",   xp=10, period="daily",  days=new[]{1,2,3,4,5},   players=new[]{"ian","justin"} },
        new { title="自主閱讀20分鐘",       type="exam",      diff="easy",   xp=10, period="daily",  days=new[]{1,2,3,4,5},   players=new[]{"ian","justin"} },
        new { title="幫忙收拾餐桌/洗碗",   type="household", diff="easy",   xp=8,  period="daily",  days=new[]{1,2,3,4,5,6,0}, players=new[]{"ian","justin"} },
        new { title="練習才藝30分鐘",       type="activity",  diff="medium", xp=15, period="daily",  days=new[]{1,2,3,4,5},   players=new[]{"ian","justin"} },
        new { title="運動/戶外活動20分鐘",  type="activity",  diff="easy",   xp=10, period="daily",  days=new[]{1,2,3,4,5,6,0}, players=new[]{"ian","justin"} },
        // ── 每週任務 ────────────────────────────────────
        new { title="打掃自己的房間",       type="household", diff="medium", xp=20, period="weekly", days=new[]{6},           players=new[]{"ian","justin"} },
        new { title="幫忙打掃客廳/廚房",    type="household", diff="medium", xp=25, period="weekly", days=new[]{6,0},         players=new[]{"ian","justin"} },
        new { title="幫忙倒垃圾",           type="household", diff="easy",   xp=10, period="weekly", days=new[]{2,5},         players=new[]{"ian","justin"} },
        new { title="整理自己的衣物",       type="household", diff="easy",   xp=12, period="weekly", days=new[]{6},           players=new[]{"ian","justin"} },
    };

    var batch = db.StartBatch();
    foreach (var t in tasks) {
        var taskId = Guid.NewGuid().ToString("N");
        batch.Set(tasksRef.Document(taskId), new Dictionary<string, object> {
            ["taskId"]           = taskId,
            ["title"]            = t.title,
            ["type"]             = t.type,
            ["difficulty"]       = t.diff,
            ["xpReward"]         = t.xp,
            ["allowanceReward"]  = 0,
            ["periodType"]       = t.period,
            ["weekDays"]         = new List<int>(t.days),
            ["playerProposed"]   = false,
            ["isActive"]         = true,
            ["assignedPlayerIds"] = new List<string>(t.players),
            ["createdAt"]        = now,
            ["createdBy"]        = uid,
        });
        Console.WriteLine($"  + [{t.period}] {t.title} (+{t.xp} XP)");
    }
    await batch.CommitAsync();
    Console.WriteLine($"  ✓ Created {tasks.Length} tasks.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 家庭事件（2026 春～夏）
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("\n📅 [4/5] Seeding events...");

var eventsRef = familyRef.Collection("events");
var existingEvents = await eventsRef.GetSnapshotAsync();
if (existingEvents.Count > 0) {
    Console.WriteLine($"  ⚠ Already has {existingEvents.Count} events, skipping.");
} else {
    var events = new[] {
        new { title="期中考試",         type="other",    start="2026-03-20", end="2026-03-27", emoji="📝", color="#e74c3c", desc="好好複習，考出好成績！" },
        new { title="清明連假出遊",     type="trip",     start="2026-04-03", end="2026-04-06", emoji="🌸", color="#22c55e", desc="清明節連假家族出遊" },
        new { title="兒童節慶典",       type="activity", start="2026-04-04", end="",            emoji="🎉", color="#f97316", desc="兒童節快樂！特別加分日" },
        new { title="才藝發表會",       type="activity", start="2026-05-10", end="",            emoji="🎹", color="#8b5cf6", desc="期末才藝發表，加油！" },
        new { title="母親節家庭活動",   type="activity", start="2026-05-10", end="",            emoji="💐", color="#ec4899", desc="為媽媽準備驚喜" },
        new { title="學期末考試",       type="other",    start="2026-06-08", end="2026-06-19", emoji="📚", color="#e74c3c", desc="期末衝刺！每天讀書有加分" },
        new { title="暑假親子旅遊",     type="trip",     start="2026-07-10", end="2026-07-14", emoji="🏖️", color="#06b6d4", desc="暑假全家出遊，期待嗎？" },
    };

    var batch = db.StartBatch();
    foreach (var e in events) {
        var eventId = Guid.NewGuid().ToString("N");
        var data = new Dictionary<string, object> {
            ["eventId"]   = eventId,
            ["title"]     = e.title,
            ["type"]      = e.type,
            ["startDate"] = e.start,
            ["emoji"]     = e.emoji,
            ["color"]     = e.color,
            ["description"] = e.desc,
            ["createdBy"] = uid,
            ["createdAt"] = now,
        };
        if (!string.IsNullOrEmpty(e.end)) data["endDate"] = e.end;
        batch.Set(eventsRef.Document(eventId), data);
        Console.WriteLine($"  + {e.emoji} {e.title} ({e.start})");
    }
    await batch.CommitAsync();
    Console.WriteLine($"  ✓ Created {events.Length} events.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 確認 family meta（displayCode / adminUid）
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("\n🏠 [5/5] Verifying family doc...");
var familySnap = await familyRef.GetSnapshotAsync();
if (!familySnap.Exists) {
    await familyRef.SetAsync(new Dictionary<string, object> {
        ["familyId"]    = familyId,
        ["adminUid"]    = uid,
        ["adminEmails"] = new[] { "pin0513@gmail.com" },
        ["displayCode"] = "MIDO0513",
        ["createdAt"]   = now,
        ["updatedAt"]   = now,
    });
    Console.WriteLine("  + Created family doc with displayCode=MIDO0513");
} else {
    Console.WriteLine($"  ✓ Family doc exists (displayCode={familySnap.GetValue<string>("displayCode")})");
}

Console.WriteLine();
Console.WriteLine("════════════════════════════════════════════");
Console.WriteLine("✅ Seed 完成！");
Console.WriteLine($"   Family: {familyId}");
Console.WriteLine("   玩家:   Ian（米豆）🌾 + Justin（毛豆）🌿");
Console.WriteLine("   商城:   10 件道具");
Console.WriteLine("   任務:   10 項（6 每日 + 4 每週）");
Console.WriteLine("   事件:   7 項（2026 春～夏）");
Console.WriteLine("════════════════════════════════════════════");
Console.WriteLine();
Console.WriteLine("💡 快速加扣分分類（前端 CATEGORIES）已在 page.tsx 更新");
