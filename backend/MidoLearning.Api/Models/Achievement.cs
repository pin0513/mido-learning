namespace MidoLearning.Api.Models;

/// <summary>
/// 成就定義
/// </summary>
public record Achievement
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string Icon { get; init; }  // Emoji or icon identifier
    public required AchievementType Type { get; init; }
    public required AchievementCondition Condition { get; init; }
    public required AchievementReward Reward { get; init; }
    public bool IsActive { get; init; } = true;
    public int DisplayOrder { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime UpdatedAt { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// 成就類型
/// </summary>
public enum AchievementType
{
    GameCompletion,    // 完成特定遊戲
    StarCollection,    // 累積星數
    WinStreak,         // 連勝
    SkillMastery,      // 技能精通（WPM/正確率）
    Milestone          // 里程碑（總次數、總時間）
}

/// <summary>
/// 成就解鎖條件
/// </summary>
public record AchievementCondition
{
    public required ConditionType Type { get; init; }
    public string? GameType { get; init; }         // 特定遊戲類型（typing/math/memory）
    public string? CourseId { get; init; }         // 特定課程 ID
    public int? TargetValue { get; init; }         // 目標值（次數、星數、WPM 等）
    public int? MinStars { get; init; }            // 最低星數要求
    public double? MinAccuracy { get; init; }      // 最低正確率要求
    public int? MinWpm { get; init; }              // 最低 WPM 要求
    public int? ConsecutiveWins { get; init; }     // 連續完美通關次數
    public int? TotalGames { get; init; }          // 總遊戲次數
    public int? TotalStars { get; init; }          // 總星數
}

/// <summary>
/// 條件類型
/// </summary>
public enum ConditionType
{
    CompleteCourse,        // 完成特定課程
    CompleteWithStars,     // 以特定星數完成
    ReachWpm,              // 達到 WPM
    ReachAccuracy,         // 達到正確率
    ConsecutivePerfect,    // 連續完美通關
    TotalGamesPlayed,      // 總遊戲次數
    TotalStarsCollected,   // 總星數累積
    CompleteAllInCategory  // 完成類別內所有課程
}

/// <summary>
/// 成就獎勵
/// </summary>
public record AchievementReward
{
    public int Experience { get; init; }           // 經驗值獎勵
    public int Coins { get; init; }                // 金幣獎勵
    public string? Title { get; init; }            // 稱號獎勵
    public string? Badge { get; init; }            // 徽章獎勵
}

/// <summary>
/// 用戶成就記錄
/// </summary>
public record UserAchievement
{
    public required string Id { get; init; }
    public required string UserId { get; init; }
    public required string AchievementId { get; init; }
    public DateTime UnlockedAt { get; init; } = DateTime.UtcNow;
    public bool IsClaimed { get; init; }           // 是否已領取獎勵
    public DateTime? ClaimedAt { get; init; }
}

/// <summary>
/// 成就進度追蹤
/// </summary>
public record AchievementProgress
{
    public required string UserId { get; init; }
    public required string AchievementId { get; init; }
    public int CurrentValue { get; init; }         // 當前進度值
    public int TargetValue { get; init; }          // 目標值
    public double ProgressPercentage => TargetValue > 0 ? (double)CurrentValue / TargetValue * 100 : 0;
    public DateTime UpdatedAt { get; init; } = DateTime.UtcNow;
}

/// <summary>
/// 成就 DTO（用於 API 回應）
/// </summary>
public record AchievementDto
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string Icon { get; init; }
    public required string Type { get; init; }
    public required AchievementCondition Condition { get; init; }
    public required AchievementReward Reward { get; init; }
    public bool IsActive { get; init; }
    public int DisplayOrder { get; init; }

    // 用戶相關資料（如果已登入）
    public bool? IsUnlocked { get; init; }
    public DateTime? UnlockedAt { get; init; }
    public int? CurrentProgress { get; init; }
    public int? TargetProgress { get; init; }
}

/// <summary>
/// 解鎖成就回應
/// </summary>
public record UnlockAchievementResponse
{
    public required List<AchievementDto> NewlyUnlocked { get; init; }
    public required AchievementReward TotalRewards { get; init; }
}

/// <summary>
/// 建立成就請求
/// </summary>
public record CreateAchievementRequest
{
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string Icon { get; init; }
    public required AchievementType Type { get; init; }
    public required AchievementCondition Condition { get; init; }
    public required AchievementReward Reward { get; init; }
    public bool IsActive { get; init; } = true;
    public int DisplayOrder { get; init; }
}

/// <summary>
/// 更新成就請求
/// </summary>
public record UpdateAchievementRequest
{
    public string? Title { get; init; }
    public string? Description { get; init; }
    public string? Icon { get; init; }
    public AchievementCondition? Condition { get; init; }
    public AchievementReward? Reward { get; init; }
    public bool? IsActive { get; init; }
    public int? DisplayOrder { get; init; }
}
