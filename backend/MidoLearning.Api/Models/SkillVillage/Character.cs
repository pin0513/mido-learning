using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.SkillVillage;

/// <summary>
/// 角色資料模型
/// </summary>
[FirestoreData]
public class Character
{
    [FirestoreDocumentId]
    public string? Id { get; set; }

    // === 帳號資訊 ===
    [FirestoreProperty("accountType")]
    public string AccountType { get; set; } = "simple"; // "guest" | "simple" | "full"

    [FirestoreProperty("userId")]
    public string? UserId { get; set; } // full 帳號的 Firebase Auth UID

    [FirestoreProperty("username")]
    public string? Username { get; set; } // simple 帳號的使用者名稱

    [FirestoreProperty("passwordHash")]
    public string? PasswordHash { get; set; } // simple 帳號的密碼 Hash

    // === 角色資訊 ===
    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("avatar")]
    public string? Avatar { get; set; }

    [FirestoreProperty("currencyName")]
    public string CurrencyName { get; set; } = "米豆幣";

    // === 等級與經驗 ===
    [FirestoreProperty("level")]
    public int Level { get; set; } = 1;

    [FirestoreProperty("totalExp")]
    public int TotalExp { get; set; } = 0;

    [FirestoreProperty("currentLevelExp")]
    public int CurrentLevelExp { get; set; } = 0;

    [FirestoreProperty("nextLevelExp")]
    public int NextLevelExp { get; set; } = 100;

    // === 技能進度（動態欄位）===
    [FirestoreProperty("skillProgress")]
    public Dictionary<string, SkillProgress> SkillProgress { get; set; } = new();

    // === 獎勵資訊 ===
    [FirestoreProperty("rewards")]
    public RewardInfo Rewards { get; set; } = new();

    // === 狀態 ===
    [FirestoreProperty("status")]
    public string Status { get; set; } = "active"; // "active" | "suspended"

    // === 時間戳 ===
    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public Timestamp UpdatedAt { get; set; }

    [FirestoreProperty("lastLoginAt")]
    public Timestamp? LastLoginAt { get; set; }
}

/// <summary>
/// 技能進度
/// </summary>
[FirestoreData]
public class SkillProgress
{
    [FirestoreProperty("skillLevel")]
    public int SkillLevel { get; set; } = 1;

    [FirestoreProperty("skillExp")]
    public int SkillExp { get; set; } = 0;

    [FirestoreProperty("playCount")]
    public int PlayCount { get; set; } = 0;

    [FirestoreProperty("totalPlayTime")]
    public int TotalPlayTime { get; set; } = 0; // 分鐘

    [FirestoreProperty("lastPlayedAt")]
    public Timestamp? LastPlayedAt { get; set; }

    [FirestoreProperty("streak")]
    public int Streak { get; set; } = 0;

    [FirestoreProperty("bestScore")]
    public BestScore? BestScore { get; set; }
}

/// <summary>
/// 最佳成績
/// </summary>
[FirestoreData]
public class BestScore
{
    [FirestoreProperty("accuracy")]
    public double? Accuracy { get; set; }

    [FirestoreProperty("wpm")]
    public double? Wpm { get; set; }

    [FirestoreProperty("score")]
    public double? Score { get; set; }
}

/// <summary>
/// 獎勵資訊
/// </summary>
[FirestoreData]
public class RewardInfo
{
    [FirestoreProperty("totalEarned")]
    public int TotalEarned { get; set; } = 0;

    [FirestoreProperty("available")]
    public int Available { get; set; } = 0;

    [FirestoreProperty("redeemed")]
    public int Redeemed { get; set; } = 0;

    [FirestoreProperty("lastRewardAt")]
    public Timestamp? LastRewardAt { get; set; }
}
