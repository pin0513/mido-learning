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
}
