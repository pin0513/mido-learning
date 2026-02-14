using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.SkillVillage;

/// <summary>
/// 技能遊戲配置
/// </summary>
[FirestoreData]
public class Skill
{
    [FirestoreDocumentId]
    public string? Id { get; set; }

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("icon")]
    public string Icon { get; set; } = string.Empty;

    [FirestoreProperty("description")]
    public string Description { get; set; } = string.Empty;

    [FirestoreProperty("category")]
    public string Category { get; set; } = string.Empty; // "language" | "math" | "memory" | "logic"

    [FirestoreProperty("status")]
    public string Status { get; set; } = "active"; // "active" | "coming_soon" | "disabled"

    [FirestoreProperty("levels")]
    public List<SkillLevel> Levels { get; set; } = new();

    [FirestoreProperty("gameConfig")]
    public Dictionary<string, object> GameConfig { get; set; } = new();

    [FirestoreProperty("expRules")]
    public ExpRules ExpRules { get; set; } = new();

    [FirestoreProperty("rewardRules")]
    public RewardRules RewardRules { get; set; } = new();

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public Timestamp UpdatedAt { get; set; }
}

/// <summary>
/// 技能關卡配置
/// </summary>
[FirestoreData]
public class SkillLevel
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("unlockCondition")]
    public UnlockCondition UnlockCondition { get; set; } = new();

    [FirestoreProperty("difficulty")]
    public int Difficulty { get; set; } = 1;

    [FirestoreProperty("expMultiplier")]
    public double ExpMultiplier { get; set; } = 1.0;

    [FirestoreProperty("rewardMultiplier")]
    public double RewardMultiplier { get; set; } = 1.0;
}

/// <summary>
/// 解鎖條件
/// </summary>
[FirestoreData]
public class UnlockCondition
{
    [FirestoreProperty("characterLevel")]
    public int? CharacterLevel { get; set; }

    [FirestoreProperty("skillLevel")]
    public int? SkillLevel { get; set; }
}

/// <summary>
/// 經驗值規則
/// </summary>
[FirestoreData]
public class ExpRules
{
    [FirestoreProperty("baseExp")]
    public int BaseExp { get; set; } = 10;

    [FirestoreProperty("timeBonus")]
    public int TimeBonus { get; set; } = 2;

    [FirestoreProperty("accuracyBonus")]
    public AccuracyBonus? AccuracyBonus { get; set; }

    [FirestoreProperty("streakBonus")]
    public StreakBonus? StreakBonus { get; set; }
}

/// <summary>
/// 正確率加成
/// </summary>
[FirestoreData]
public class AccuracyBonus
{
    [FirestoreProperty("threshold")]
    public double Threshold { get; set; } = 0.9;

    [FirestoreProperty("bonus")]
    public int Bonus { get; set; } = 5;
}

/// <summary>
/// 連勝加成
/// </summary>
[FirestoreData]
public class StreakBonus
{
    [FirestoreProperty("threshold")]
    public int Threshold { get; set; } = 3;

    [FirestoreProperty("bonus")]
    public int Bonus { get; set; } = 10;
}

/// <summary>
/// 獎勵規則
/// </summary>
[FirestoreData]
public class RewardRules
{
    [FirestoreProperty("minPlayTime")]
    public int MinPlayTime { get; set; } = 10; // 分鐘

    [FirestoreProperty("rewardRange")]
    public List<int> RewardRange { get; set; } = new() { 1, 5 };

    [FirestoreProperty("dailyLimit")]
    public int DailyLimit { get; set; } = 20;

    [FirestoreProperty("cooldown")]
    public int Cooldown { get; set; } = 10; // 分鐘
}
