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
    int TotalRedeemed,
    string? Emoji = null,
    string? Role = null,
    string? Birthday = null
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

// ── Player Management ─────────────────────────────────────────────────────

public record CreatePlayerRequest(
    string PlayerId,
    string Name,
    string Color,
    string? Emoji = null,
    string? Role = null,
    string? Birthday = null
);

public record UpdatePlayerRequest(
    string Name,
    string Color,
    string? Emoji = null,
    string? Role = null,
    string? Birthday = null
);

public record SetPlayerPasswordRequest(string Password);

// ── Family Lookup ─────────────────────────────────────────────────────────

public record FamilyLookupDto(
    string FamilyId,
    string FamilyCode,
    IReadOnlyList<PlayerSummaryDto> Players
);

public record PlayerSummaryDto(
    string PlayerId,
    string Name,
    string Color,
    string? Emoji,
    bool HasPassword
);

// ── Player Auth ───────────────────────────────────────────────────────────

public record PlayerLoginRequest(
    string FamilyCode,
    string PlayerId,
    string Password
);

public record PlayerTokenDto(
    string Token,
    string PlayerId,
    string PlayerName,
    string FamilyId
);

// ── Tasks ─────────────────────────────────────────────────────────────────

public record TaskDto(
    string TaskId,
    string Title,
    string Type,
    string Difficulty,
    int XpReward,
    int AllowanceReward,
    string? Description,
    bool IsActive,
    string PeriodType,
    IReadOnlyList<int> WeekDays,
    IReadOnlyList<string> AssignedPlayerIds,
    bool PlayerProposed
);

public record CreateTaskRequest(
    string Title,
    string Type,
    string Difficulty,
    int? XpReward,
    int? AllowanceReward,
    string? Description,
    string? PeriodType,
    IReadOnlyList<int>? WeekDays,
    IReadOnlyList<string>? AssignedPlayerIds
);

// ── Task Completions ──────────────────────────────────────────────────────

public record TaskCompletionDto(
    string CompletionId,
    string TaskId,
    string TaskTitle,
    int XpReward,
    string PlayerId,
    string? Note,
    string Status,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? ProcessedAt
);

public record SubmitTaskCompletionRequest(string TaskId, string? Note);

public record ProcessTaskCompletionRequest(string Action, string? Note);

// ── Player Self-Submissions ───────────────────────────────────────────────

public record PlayerSubmissionDto(
    string SubmissionId,
    string PlayerId,
    string Type,
    int Amount,
    string Reason,
    string CategoryType,
    string? Note,
    string Status,
    DateTimeOffset SubmittedAt,
    DateTimeOffset? ProcessedAt
);

public record CreatePlayerSubmissionRequest(
    string CategoryType,
    string Reason,
    int Amount,
    string? Note
);

// ── Allowance（零用金） ──────────────────────────────────────────────────

public record AllowanceLedgerDto(
    string RecordId,
    string PlayerId,
    int Amount,
    string Reason,
    string Type,
    string CreatedBy,
    DateTimeOffset CreatedAt,
    string? Note
);

public record AdjustAllowanceRequest(
    string PlayerId,
    int Amount,
    string Reason,
    string? Note
);

public record AllowanceBalanceDto(
    string PlayerId,
    int Balance,
    int TotalEarned,
    int TotalSpent
);

// ── Shop Items（商城商品） ────────────────────────────────────────────────

public record ShopItemDto(
    string ItemId,
    string Name,
    string Description,
    int Price,
    string Type,
    string Emoji,
    bool IsActive,
    int? Stock,
    string PriceType,
    int? DailyLimit,
    int AllowanceGiven
);

public record CreateShopItemRequest(
    string Name,
    string Description,
    int Price,
    string Type,
    string Emoji,
    int? Stock,
    string? PriceType,
    int? DailyLimit,
    int? AllowanceGiven
);

// ── Shop Orders（商城訂單） ───────────────────────────────────────────────

public record ShopOrderDto(
    string OrderId,
    string PlayerId,
    string ItemId,
    string ItemName,
    int Price,
    string Status,
    DateTimeOffset RequestedAt,
    DateTimeOffset? ProcessedAt,
    string? ProcessedBy,
    string? Note
);

public record CreateShopOrderRequest(string ItemId, string? Note);

public record ProcessShopOrderRequest(string Action, string? Note);

// ── Events（家庭活動/行事曆） ─────────────────────────────────────────────

public record EventDto(
    string EventId,
    string Title,
    string Type,
    string StartDate,
    string? EndDate,
    string? Description,
    string Emoji,
    string Color,
    string CreatedBy,
    DateTimeOffset CreatedAt
);

public record CreateEventRequest(
    string Title,
    string Type,
    string StartDate,
    string? EndDate,
    string? Description,
    string? Emoji,
    string? Color
);

// ── Task Templates（任務範本） ────────────────────────────────────────────

public record TaskTemplateDto(
    string TemplateId,
    string Name,
    string? Description,
    IReadOnlyList<string> TaskIds
);

public record CreateTaskTemplateRequest(
    string Name,
    string? Description,
    IReadOnlyList<string>? TaskIds
);

// ── Backup ────────────────────────────────────────────────────────────────

public record FamilyBackupDto(
    string FamilyId,
    string Version,
    DateTimeOffset ExportedAt,
    IReadOnlyList<PlayerScoreDto> Players,
    IReadOnlyList<TransactionDto> Transactions,
    IReadOnlyList<TaskDto> Tasks,
    IReadOnlyList<ShopItemDto> ShopItems,
    IReadOnlyList<EventDto> Events,
    IReadOnlyList<TaskTemplateDto> TaskTemplates,
    IReadOnlyList<AllowanceLedgerDto> AllowanceLedger
);
