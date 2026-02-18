namespace MidoLearning.Api.Models.FamilyScoreboard;

// ── Response DTOs ─────────────────────────────────────────────────────────────

public record PlayerScoreDto(
    string PlayerId,
    string Name,
    string Color,
    int AchievementPoints,
    int RedeemablePoints,
    int TotalEarned,
    int TotalDeducted,
    int TotalRedeemed
);

public record TransactionDto(
    string Id,
    IReadOnlyList<string> PlayerIds,
    string Type,
    int Amount,
    string Reason,
    string? CategoryId,
    string CreatedBy,
    DateTimeOffset CreatedAt,
    string? Note
);

public record RewardDto(
    string Id,
    string Name,
    int Cost,
    string Description,
    string Icon,
    bool IsActive,
    int? Stock
);

public record RedemptionDto(
    string Id,
    string PlayerId,
    string RewardId,
    string RewardName,
    int Cost,
    string Status,
    DateTimeOffset RequestedAt,
    DateTimeOffset? ProcessedAt,
    string? ProcessedBy,
    string? Note
);

// ── Request DTOs ──────────────────────────────────────────────────────────────

public record AddTransactionRequest(
    IReadOnlyList<string> PlayerIds,
    string Type,
    int Amount,
    string Reason,
    string? CategoryId,
    string? Note
);

public record CreateRedemptionRequest(
    string RewardId,
    string? Note
);

public record ProcessRedemptionRequest(
    string Action,   // "approve" | "reject"
    string? Note
);
