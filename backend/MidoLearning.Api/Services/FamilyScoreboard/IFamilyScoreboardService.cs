using MidoLearning.Api.Models.FamilyScoreboard;

namespace MidoLearning.Api.Services.FamilyScoreboard;

public interface IFamilyScoreboardService
{
    // ── 初始化 ────────────────────────────────────────────────────────────────
    Task InitializeAsync(string familyId, string adminUid, CancellationToken ct = default);

    // ── 積分 ──────────────────────────────────────────────────────────────────
    Task<IReadOnlyList<PlayerScoreDto>> GetScoresAsync(string familyId, CancellationToken ct = default);

    Task<IReadOnlyList<TransactionDto>> GetTransactionsAsync(
        string familyId, string? playerId = null, CancellationToken ct = default);

    Task<TransactionDto> AddTransactionAsync(
        string familyId, AddTransactionRequest request, string adminUid, CancellationToken ct = default);

    // ── 獎勵 ──────────────────────────────────────────────────────────────────
    Task<IReadOnlyList<RewardDto>> GetRewardsAsync(string familyId, CancellationToken ct = default);

    // ── 兌換 ──────────────────────────────────────────────────────────────────
    Task<RedemptionDto> CreateRedemptionAsync(
        string familyId, CreateRedemptionRequest request, string playerUid, CancellationToken ct = default);

    Task<RedemptionDto> ProcessRedemptionAsync(
        string familyId, string redemptionId, ProcessRedemptionRequest request, string adminUid, CancellationToken ct = default);

    Task<IReadOnlyList<RedemptionDto>> GetRedemptionsAsync(
        string familyId, string? status = null, CancellationToken ct = default);

    // ── Display Code ──────────────────────────────────────────────────────────
    Task<string> GenerateDisplayCodeAsync(string familyId, CancellationToken ct = default);
    Task<FamilyLookupDto?> LookupByCodeAsync(string code, CancellationToken ct = default);

    // ── Player CRUD ───────────────────────────────────────────────────────────
    Task<PlayerScoreDto> CreatePlayerAsync(string familyId, CreatePlayerRequest req, CancellationToken ct = default);
    Task<PlayerScoreDto> UpdatePlayerAsync(string familyId, string playerId, UpdatePlayerRequest req, CancellationToken ct = default);
    Task SetPlayerPasswordAsync(string familyId, string playerId, string password, CancellationToken ct = default);
    Task<PlayerTokenDto> PlayerLoginAsync(PlayerLoginRequest req, IConfiguration configuration, CancellationToken ct = default);

    // ── Tasks ─────────────────────────────────────────────────────────────────
    Task<TaskDto> CreateTaskAsync(string familyId, CreateTaskRequest req, string adminUid, CancellationToken ct = default);
    Task<IReadOnlyList<TaskDto>> GetTasksAsync(string familyId, CancellationToken ct = default);
    Task<TaskDto> UpdateTaskAsync(string familyId, string taskId, CreateTaskRequest req, CancellationToken ct = default);
    Task DeactivateTaskAsync(string familyId, string taskId, CancellationToken ct = default);

    // ── Task Completions ──────────────────────────────────────────────────────
    Task<TaskCompletionDto> SubmitTaskCompletionAsync(string familyId, SubmitTaskCompletionRequest req, string playerId, CancellationToken ct = default);
    Task<IReadOnlyList<TaskCompletionDto>> GetTaskCompletionsAsync(string familyId, string? status, CancellationToken ct = default);
    Task<TaskCompletionDto> ProcessTaskCompletionAsync(string familyId, string completionId, ProcessTaskCompletionRequest req, string adminUid, CancellationToken ct = default);

    // ── Player Self-Submissions ───────────────────────────────────────────────
    Task<PlayerSubmissionDto> SubmitPlayerSubmissionAsync(string familyId, CreatePlayerSubmissionRequest req, string playerId, CancellationToken ct = default);
    Task<IReadOnlyList<PlayerSubmissionDto>> GetPlayerSubmissionsAsync(string familyId, string? status, CancellationToken ct = default);
    Task<PlayerSubmissionDto> ProcessPlayerSubmissionAsync(string familyId, string submissionId, ProcessTaskCompletionRequest req, string adminUid, CancellationToken ct = default);

    // ── Allowance（零用金） ──────────────────────────────────────────────────
    Task<AllowanceBalanceDto> GetAllowanceBalanceAsync(string familyId, string playerId, CancellationToken ct = default);
    Task<IReadOnlyList<AllowanceLedgerDto>> GetAllowanceLedgerAsync(string familyId, string? playerId, CancellationToken ct = default);
    Task<AllowanceLedgerDto> AdjustAllowanceAsync(string familyId, AdjustAllowanceRequest req, string adminUid, CancellationToken ct = default);

    // ── Shop Items（商城商品） ────────────────────────────────────────────────
    Task<IReadOnlyList<ShopItemDto>> GetShopItemsAsync(string familyId, CancellationToken ct = default);
    Task<ShopItemDto> CreateShopItemAsync(string familyId, CreateShopItemRequest req, CancellationToken ct = default);
    Task<ShopItemDto> UpdateShopItemAsync(string familyId, string itemId, CreateShopItemRequest req, CancellationToken ct = default);
    Task DeactivateShopItemAsync(string familyId, string itemId, CancellationToken ct = default);

    // ── Shop Orders（商城訂單） ───────────────────────────────────────────────
    Task<ShopOrderDto> CreateShopOrderAsync(string familyId, CreateShopOrderRequest req, string playerId, CancellationToken ct = default);
    Task<IReadOnlyList<ShopOrderDto>> GetShopOrdersAsync(string familyId, string? status, CancellationToken ct = default);
    Task<ShopOrderDto> ProcessShopOrderAsync(string familyId, string orderId, ProcessShopOrderRequest req, string adminUid, CancellationToken ct = default);

    // ── Events（家庭活動） ────────────────────────────────────────────────────
    Task<IReadOnlyList<EventDto>> GetEventsAsync(string familyId, string? month, CancellationToken ct = default);
    Task<EventDto> CreateEventAsync(string familyId, CreateEventRequest req, string adminUid, CancellationToken ct = default);
    Task<EventDto> UpdateEventAsync(string familyId, string eventId, CreateEventRequest req, CancellationToken ct = default);
    Task DeleteEventAsync(string familyId, string eventId, CancellationToken ct = default);

    // ── Task Templates（任務範本） ────────────────────────────────────────────
    Task<IReadOnlyList<TaskTemplateDto>> GetTaskTemplatesAsync(string familyId, CancellationToken ct = default);
    Task<TaskTemplateDto> CreateTaskTemplateAsync(string familyId, CreateTaskTemplateRequest req, CancellationToken ct = default);
    Task DeleteTaskTemplateAsync(string familyId, string templateId, CancellationToken ct = default);

    // ── Backup ────────────────────────────────────────────────────────────────
    Task<FamilyBackupDto> ExportBackupAsync(string familyId, CancellationToken ct = default);
    Task ImportBackupAsync(string familyId, FamilyBackupDto backup, CancellationToken ct = default);
}
