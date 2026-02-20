#!/usr/bin/env dotnet-script
// SeedPlayers - 初始化 Ian & Justin 到 pin0513@gmail.com 的家庭

using System;
using System.Threading.Tasks;
using Google.Cloud.Firestore;
using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;

// 設定 credentials
Environment.SetEnvironmentVariable(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "/Users/paul_huang/DEV/projects/mido-learning/credentials/firebase-admin-key.json"
);

Console.WriteLine("Initializing Firebase...");
FirebaseApp.Create(new AppOptions {
    Credential = GoogleCredential.GetApplicationDefault()
});

var db = FirestoreDb.Create("mido-learning");
var auth = FirebaseAuth.DefaultInstance;

// 取得 pin0513@gmail.com 的 UID
Console.WriteLine("Looking up pin0513@gmail.com...");
var user = await auth.GetUserByEmailAsync("pin0513@gmail.com");
var uid = user.Uid;
var familyId = $"family_{uid}";
Console.WriteLine($"UID: {uid}");
Console.WriteLine($"FamilyId: {familyId}");

// 確認 family doc 存在
var familyRef = db.Collection("families").Document(familyId);
var familySnap = await familyRef.GetSnapshotAsync();
if (!familySnap.Exists) {
    await familyRef.SetAsync(new {
        familyId = familyId,
        adminUid = uid,
        adminEmails = new[] { "pin0513@gmail.com" },
        displayCode = "MIDO0513",
        createdAt = Timestamp.GetCurrentTimestamp(),
        updatedAt = Timestamp.GetCurrentTimestamp()
    });
    Console.WriteLine("Created family doc");
}

// 建立玩家分數 doc
async Task UpsertPlayerScore(string playerId, string name, string color, string emoji, string role, int xp) {
    var scoreRef = familyRef.Collection("player-scores").Document(playerId);
    var snap = await scoreRef.GetSnapshotAsync();
    if (snap.Exists) {
        Console.WriteLine($"Player {name} already exists, skipping.");
        return;
    }
    await scoreRef.SetAsync(new {
        playerId = playerId,
        name = name,
        color = color,
        emoji = emoji,
        role = role,
        achievementPoints = xp,
        redeemablePoints = xp,
        totalEarned = xp,
        totalDeducted = 0,
        totalRedeemed = 0,
        createdAt = Timestamp.GetCurrentTimestamp()
    });
    Console.WriteLine($"Created player: {name} ({playerId}) with {xp} XP");
}

await UpsertPlayerScore("ian",    "Ian（米豆）",    "#f59e0b", "🌾", "大哥", 0);
await UpsertPlayerScore("justin", "Justin（毛豆）", "#10b981", "🌿", "弟弟", 0);

Console.WriteLine("\n✅ Done! Ian and Justin are ready in the family scoreboard.");
