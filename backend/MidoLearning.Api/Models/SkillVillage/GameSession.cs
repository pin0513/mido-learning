using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.SkillVillage;

/// <summary>
/// 遊戲記錄
/// </summary>
[FirestoreData]
public class GameSession
{
    [FirestoreDocumentId]
    public string? Id { get; set; }

    [FirestoreProperty("characterId")]
    public string CharacterId { get; set; } = string.Empty;

    [FirestoreProperty("skillId")]
    public string SkillId { get; set; } = string.Empty;

    [FirestoreProperty("levelId")]
    public string LevelId { get; set; } = string.Empty;

    [FirestoreProperty("performance")]
    public GamePerformance Performance { get; set; } = new();

    [FirestoreProperty("result")]
    public GameResult Result { get; set; } = new();

    [FirestoreProperty("metadata")]
    public GameMetadata Metadata { get; set; } = new();

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }
}

/// <summary>
/// 遊戲表現
/// </summary>
[FirestoreData]
public class GamePerformance
{
    [FirestoreProperty("playTime")]
    public int PlayTime { get; set; } = 0; // 分鐘

    [FirestoreProperty("accuracy")]
    public double? Accuracy { get; set; }

    [FirestoreProperty("wpm")]
    public double? Wpm { get; set; }

    [FirestoreProperty("score")]
    public double? Score { get; set; }

    [FirestoreProperty("challengeCount")]
    public int? ChallengeCount { get; set; }
}

/// <summary>
/// 遊戲結果
/// </summary>
[FirestoreData]
public class GameResult
{
    [FirestoreProperty("expGained")]
    public int ExpGained { get; set; } = 0;

    [FirestoreProperty("levelUp")]
    public bool LevelUp { get; set; } = false;

    [FirestoreProperty("newLevel")]
    public int NewLevel { get; set; } = 1;

    [FirestoreProperty("rewardEarned")]
    public int RewardEarned { get; set; } = 0;

    [FirestoreProperty("message")]
    public string Message { get; set; } = string.Empty;
}

/// <summary>
/// 遊戲 Metadata
/// </summary>
[FirestoreData]
public class GameMetadata
{
    [FirestoreProperty("ip")]
    public string Ip { get; set; } = string.Empty;

    [FirestoreProperty("userAgent")]
    public string UserAgent { get; set; } = string.Empty;

    [FirestoreProperty("sessionId")]
    public string SessionId { get; set; } = string.Empty;
}
