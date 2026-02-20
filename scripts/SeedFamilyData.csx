#!/usr/bin/env dotnet-script
// SeedFamilyData - 從 seed-data/pin0513.json 讀取設定，初始化家庭資料到 Firestore
//
// 執行方式：
//   dotnet script scripts/SeedFamilyData.csx

#r "nuget: Google.Cloud.Firestore, 3.7.0"
#r "nuget: FirebaseAdmin, 2.4.0"
#r "nuget: Google.Apis.Auth, 1.67.0"

using System;
using System.IO;
using System.Text.Json;
using System.Text.Json.Nodes;
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

// ── 讀取 JSON 設定 ────────────────────────────────────────────────────────────
var scriptDir = Path.GetDirectoryName(Path.GetFullPath(Args.Count > 0 ? Args[0] : "scripts/SeedFamilyData.csx"))
    ?? Directory.GetCurrentDirectory();
// 搜尋 seed-data 目錄（相對 script 或工作目錄）
var jsonPath = Path.Combine(Directory.GetCurrentDirectory(), "scripts", "seed-data", "pin0513.json");
if (!File.Exists(jsonPath)) jsonPath = Path.Combine(scriptDir, "seed-data", "pin0513.json");
Console.WriteLine($"📄 Loading seed data from: {jsonPath}");
var jsonText = File.ReadAllText(jsonPath);
var data = JsonNode.Parse(jsonText)!;

Console.WriteLine("🔥 Initializing Firebase...");
FirebaseApp.Create(new AppOptions {
    Credential = GoogleCredential.GetApplicationDefault()
});

var db = FirestoreDb.Create("mido-learning");
var auth = FirebaseAuth.DefaultInstance;

// ── 取得家庭 ID ───────────────────────────────────────────────────────────────
var account = data["account"]!.GetValue<string>();
Console.WriteLine($"🔍 Looking up {account}...");
var user = await auth.GetUserByEmailAsync(account);
var uid = user.Uid;
var familyId = $"family_{uid}";
Console.WriteLine($"✓ UID: {uid}");
Console.WriteLine($"✓ FamilyId: {familyId}");
Console.WriteLine();

var familyRef = db.Collection("families").Document(familyId);
var now = Timestamp.GetCurrentTimestamp();

// ═══════════════════════════════════════════════════════════════════════════════
// 1. 玩家（Upsert，不動已存在玩家的積分）
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("👤 [1/5] Setting up players...");
var players = data["players"]!.AsArray();
foreach (var p in players) {
    var playerId = p!["playerId"]!.GetValue<string>();
    var name     = p["name"]!.GetValue<string>();
    var color    = p["color"]!.GetValue<string>();
    var emoji    = p["emoji"]!.GetValue<string>();
    var role     = p["role"]!.GetValue<string>();
    var birthday = p["birthday"]!.GetValue<string>();
    var initXp   = p["initialXp"]!.GetValue<int>();
    var initRp   = p["initialRp"]!.GetValue<int>();

    var ref_ = familyRef.Collection("scores").Document(playerId);
    var snap = await ref_.GetSnapshotAsync();
    if (snap.Exists) {
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
            ["achievementPoints"]  = initXp,
            ["redeemablePoints"]   = initRp,
            ["totalEarned"]        = initXp,
            ["totalDeducted"]      = 0,
            ["totalRedeemed"]      = 0,
            ["createdAt"]          = now,
            ["updatedAt"]          = now,
        });
        Console.WriteLine($"  + Created player: {name} (XP={initXp}, RP={initRp})");
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// 2. 商城道具（清空重建）
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("\n🛒 [2/5] Seeding shop items...");
var shopRef = familyRef.Collection("shop-items");
var existingItems = await shopRef.GetSnapshotAsync();
if (existingItems.Count > 0) {
    Console.WriteLine($"  🗑 Deleting {existingItems.Count} existing shop items...");
    var delBatch = db.StartBatch();
    foreach (var doc in existingItems.Documents) delBatch.Delete(doc.Reference);
    await delBatch.CommitAsync();
}
var shopItems = data["shopItems"]!.AsArray();
{
    var batch = db.StartBatch();
    foreach (var item in shopItems) {
        var itemId = Guid.NewGuid().ToString("N");
        batch.Set(shopRef.Document(itemId), new Dictionary<string, object> {
            ["itemId"]          = itemId,
            ["name"]            = item!["name"]!.GetValue<string>(),
            ["description"]     = item["description"]!.GetValue<string>(),
            ["price"]           = item["price"]!.GetValue<int>(),
            ["type"]            = item["type"]!.GetValue<string>(),
            ["emoji"]           = item["emoji"]!.GetValue<string>(),
            ["isActive"]        = true,
            ["priceType"]       = item["priceType"]!.GetValue<string>(),
            ["allowanceGiven"]  = 0,
        });
        Console.WriteLine($"  + {item["emoji"]} {item["name"]} ({item["price"]} {item["priceType"]})");
    }
    await batch.CommitAsync();
    Console.WriteLine($"  ✓ Created {shopItems.Count} shop items.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 3. 每日/週任務（清空重建）
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("\n📋 [3/5] Seeding tasks...");
var tasksRef = familyRef.Collection("tasks");
var existingTasks = await tasksRef.GetSnapshotAsync();
if (existingTasks.Count > 0) {
    Console.WriteLine($"  🗑 Deleting {existingTasks.Count} existing tasks...");
    var toDelete = existingTasks.Documents.ToList();
    for (int i = 0; i < toDelete.Count; i += 400) {
        var delBatch = db.StartBatch();
        foreach (var doc in toDelete.Skip(i).Take(400)) delBatch.Delete(doc.Reference);
        await delBatch.CommitAsync();
    }
}
var tasks = data["tasks"]!.AsArray();
{
    var batch = db.StartBatch();
    foreach (var t in tasks) {
        var taskId = Guid.NewGuid().ToString("N");
        var days = t!["weekDays"]!.AsArray().Select(d => d!.GetValue<int>()).ToList();
        var assignedPlayers = t["assignedPlayerIds"]!.AsArray().Select(p => p!.GetValue<string>()).ToList<object>();
        batch.Set(tasksRef.Document(taskId), new Dictionary<string, object> {
            ["taskId"]            = taskId,
            ["title"]             = t["title"]!.GetValue<string>(),
            ["type"]              = t["type"]!.GetValue<string>(),
            ["difficulty"]        = t["difficulty"]!.GetValue<string>(),
            ["xpReward"]          = t["xpReward"]!.GetValue<int>(),
            ["allowanceReward"]   = 0,
            ["periodType"]        = t["periodType"]!.GetValue<string>(),
            ["weekDays"]          = days,
            ["playerProposed"]    = false,
            ["isActive"]          = true,
            ["assignedPlayerIds"] = assignedPlayers,
            ["createdAt"]         = now,
            ["createdBy"]         = uid,
        });
        Console.WriteLine($"  + [{t["periodType"]}] {t["title"]} (+{t["xpReward"]} XP)");
    }
    await batch.CommitAsync();
    Console.WriteLine($"  ✓ Created {tasks.Count} tasks.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 4. 家庭事件（跳過已存在）
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("\n📅 [4/5] Seeding events...");
var eventsRef = familyRef.Collection("events");
var existingEvents = await eventsRef.GetSnapshotAsync();
if (existingEvents.Count > 0) {
    Console.WriteLine($"  ⚠ Already has {existingEvents.Count} events, skipping.");
} else {
    var events = data["events"]!.AsArray();
    var batch = db.StartBatch();
    foreach (var e in events) {
        var eventId = Guid.NewGuid().ToString("N");
        var eventData = new Dictionary<string, object> {
            ["eventId"]     = eventId,
            ["title"]       = e!["title"]!.GetValue<string>(),
            ["type"]        = e["type"]!.GetValue<string>(),
            ["startDate"]   = e["startDate"]!.GetValue<string>(),
            ["emoji"]       = e["emoji"]!.GetValue<string>(),
            ["color"]       = e["color"]!.GetValue<string>(),
            ["description"] = e["description"]!.GetValue<string>(),
            ["createdBy"]   = uid,
            ["createdAt"]   = now,
        };
        var endDate = e["endDate"]?.GetValue<string>() ?? "";
        if (!string.IsNullOrEmpty(endDate)) eventData["endDate"] = endDate;
        batch.Set(eventsRef.Document(eventId), eventData);
        Console.WriteLine($"  + {e["emoji"]} {e["title"]} ({e["startDate"]})");
    }
    await batch.CommitAsync();
    Console.WriteLine($"  ✓ Created {data["events"]!.AsArray().Count} events.");
}

// ═══════════════════════════════════════════════════════════════════════════════
// 5. 確認 family meta
// ═══════════════════════════════════════════════════════════════════════════════
Console.WriteLine("\n🏠 [5/5] Verifying family doc...");
var familySnap = await familyRef.GetSnapshotAsync();
if (!familySnap.Exists) {
    var defaultCode = data["family"]!["defaultDisplayCode"]!.GetValue<string>();
    await familyRef.SetAsync(new Dictionary<string, object> {
        ["familyId"]    = familyId,
        ["adminUid"]    = uid,
        ["adminEmails"] = new[] { account },
        ["displayCode"] = defaultCode,
        ["createdAt"]   = now,
        ["updatedAt"]   = now,
    });
    Console.WriteLine($"  + Created family doc with displayCode={defaultCode}");
} else {
    Console.WriteLine($"  ✓ Family doc exists (displayCode={familySnap.GetValue<string>("displayCode")})");
}

Console.WriteLine();
Console.WriteLine("════════════════════════════════════════════");
Console.WriteLine("✅ Seed 完成！");
Console.WriteLine($"   Family:  {familyId}");
Console.WriteLine($"   玩家:    {players.Count} 位（{string.Join("、", players.Select(p => p!["name"]!.GetValue<string>()))}）");
Console.WriteLine($"   商城:    {shopItems.Count} 件道具");
Console.WriteLine($"   任務:    {tasks.Count} 項");
Console.WriteLine($"   設定檔:  scripts/seed-data/pin0513.json");
Console.WriteLine("════════════════════════════════════════════");
