using System.Security.Claims;
using MidoLearning.Api.Models.FamilyScoreboard;
using MidoLearning.Api.Services.FamilyScoreboard;

namespace MidoLearning.Api.Endpoints;

public static class FamilyScoreboardEndpoints
{
    public static void MapFamilyScoreboardEndpoints(this WebApplication app)
    {
        // ── Family Admin routes (需要 FamilyAdmin 授權) ──────────────────────
        var admin = app.MapGroup("/api/family-scoreboard")
            .RequireAuthorization("FamilyAdmin");

        // POST /api/family-scoreboard/initialize
        // Admin 初始化家庭計分板（建立預設玩家、獎勵）
        admin.MapPost("/initialize", async (
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();

            var familyId = $"family_{uid}";
            await svc.InitializeAsync(familyId, uid, ct);
            return Results.Ok(new { familyId });
        });

        // POST /api/family-scoreboard/transactions
        // Admin 新增積分交易（加分 / 扣分）
        admin.MapPost("/transactions", async (
            AddTransactionRequest request,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();

            var familyId = $"family_{uid}";
            var tx = await svc.AddTransactionAsync(familyId, request, uid, ct);
            return Results.Created($"/api/family-scoreboard/transactions/{tx.Id}", tx);
        });

        // POST /api/family-scoreboard/redemptions/{id}/process
        // Admin 審核兌換申請（approve / reject）
        admin.MapPost("/redemptions/{redemptionId}/process", async (
            string redemptionId,
            ProcessRedemptionRequest request,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();

            var familyId = $"family_{uid}";
            var result = await svc.ProcessRedemptionAsync(familyId, redemptionId, request, uid, ct);
            return Results.Ok(result);
        });

        // ── Authenticated read routes (只需登入即可) ─────────────────────────
        var read = app.MapGroup("/api/family-scoreboard")
            .RequireAuthorization("AuthenticatedOnly");

        // GET /api/family-scoreboard/{familyId}/scores
        // 查看家庭積分排行榜
        read.MapGet("/{familyId}/scores", async (
            string familyId,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var scores = await svc.GetScoresAsync(familyId, ct);
            return Results.Ok(scores);
        });

        // GET /api/family-scoreboard/{familyId}/transactions?playerId=xxx
        // 查看交易紀錄（可按玩家過濾）
        read.MapGet("/{familyId}/transactions", async (
            string familyId,
            string? playerId,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var txs = await svc.GetTransactionsAsync(familyId, playerId, ct);
            return Results.Ok(txs);
        });

        // GET /api/family-scoreboard/{familyId}/rewards
        // 查看可兌換的獎勵清單
        read.MapGet("/{familyId}/rewards", async (
            string familyId,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var rewards = await svc.GetRewardsAsync(familyId, ct);
            return Results.Ok(rewards);
        });

        // GET /api/family-scoreboard/{familyId}/redemptions?status=pending
        // 查看兌換申請清單
        read.MapGet("/{familyId}/redemptions", async (
            string familyId,
            string? status,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var redemptions = await svc.GetRedemptionsAsync(familyId, status, ct);
            return Results.Ok(redemptions);
        });

        // POST /api/family-scoreboard/{familyId}/redemptions
        // 玩家提交兌換申請
        read.MapPost("/{familyId}/redemptions", async (
            string familyId,
            CreateRedemptionRequest request,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier)
                ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();

            var redemption = await svc.CreateRedemptionAsync(familyId, request, uid, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/redemptions/{redemption.Id}", redemption);
        });
    }
}
