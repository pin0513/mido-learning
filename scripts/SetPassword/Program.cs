using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Identity;

Environment.SetEnvironmentVariable(
    "GOOGLE_APPLICATION_CREDENTIALS",
    "/Users/paul_huang/DEV/projects/mido-learning/credentials/firebase-admin-key.json"
);

var db = FirestoreDb.Create("mido-learning");
var hasher = new PasswordHasher<string>();

var familyId = "family_97umMUHWPwSA4oo1REkMiLnQTNo2";
var credCol = db.Collection("families").Document(familyId).Collection("player-credentials");

async Task SetPassword(string playerId, string password) {
    var hash = hasher.HashPassword(playerId, password);
    await credCol.Document(playerId).SetAsync(new Dictionary<string, object> {
        ["playerId"]     = playerId,
        ["passwordHash"] = hash,
        ["updatedAt"]    = Timestamp.GetCurrentTimestamp(),
    });
    Console.WriteLine($"✅ {playerId} 密碼已設定（{password}）");
}

await SetPassword("ian",    "0918");
await SetPassword("justin", "0824");
Console.WriteLine("Done.");
