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

        // ── Public routes (無需 auth) ────────────────────────────────────────
        var publicGroup = app.MapGroup("/api/family-scoreboard");

        publicGroup.MapGet("/lookup", async (
            string code,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var result = await svc.LookupByCodeAsync(code, ct);
            return result is null ? Results.NotFound() : Results.Ok(result);
        });

        publicGroup.MapPost("/player-login", async (
            PlayerLoginRequest request,
            IFamilyScoreboardService svc,
            IConfiguration config,
            CancellationToken ct) =>
        {
            try
            {
                var result = await svc.PlayerLoginAsync(request, config, ct);
                return Results.Ok(result);
            }
            catch (UnauthorizedAccessException)
            {
                return Results.Unauthorized();
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        // ── Admin new endpoints ───────────────────────────────────────────────

        admin.MapPost("/generate-code", async (
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();
            var familyId = $"family_{uid}";
            var code = await svc.GenerateDisplayCodeAsync(familyId, ct);
            return Results.Ok(new { displayCode = code });
        });

        admin.MapPost("/{familyId}/players", async (
            string familyId,
            CreatePlayerRequest request,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var player = await svc.CreatePlayerAsync(familyId, request, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/players/{player.PlayerId}", player);
        });

        admin.MapPut("/{familyId}/players/{playerId}", async (
            string familyId,
            string playerId,
            UpdatePlayerRequest request,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var player = await svc.UpdatePlayerAsync(familyId, playerId, request, ct);
            return Results.Ok(player);
        });

        admin.MapPut("/{familyId}/players/{playerId}/password", async (
            string familyId,
            string playerId,
            SetPlayerPasswordRequest request,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            await svc.SetPlayerPasswordAsync(familyId, playerId, request.Password, ct);
            return Results.Ok();
        });

        admin.MapPost("/{familyId}/tasks", async (
            string familyId,
            CreateTaskRequest request,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();
            var task = await svc.CreateTaskAsync(familyId, request, uid, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/tasks/{task.TaskId}", task);
        });

        admin.MapGet("/{familyId}/tasks", async (
            string familyId,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var tasks = await svc.GetTasksAsync(familyId, ct);
            return Results.Ok(tasks);
        });

        admin.MapPut("/{familyId}/tasks/{taskId}", async (
            string familyId,
            string taskId,
            CreateTaskRequest request,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var task = await svc.UpdateTaskAsync(familyId, taskId, request, ct);
            return Results.Ok(task);
        });

        admin.MapDelete("/{familyId}/tasks/{taskId}", async (
            string familyId,
            string taskId,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            await svc.DeactivateTaskAsync(familyId, taskId, ct);
            return Results.Ok();
        });

        admin.MapGet("/{familyId}/task-completions", async (
            string familyId,
            string? status,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var completions = await svc.GetTaskCompletionsAsync(familyId, status, ct);
            return Results.Ok(completions);
        });

        admin.MapPost("/{familyId}/task-completions/{completionId}/process", async (
            string familyId,
            string completionId,
            ProcessTaskCompletionRequest request,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();
            var result = await svc.ProcessTaskCompletionAsync(familyId, completionId, request, uid, ct);
            return Results.Ok(result);
        });

        admin.MapGet("/{familyId}/player-submissions", async (
            string familyId,
            string? status,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var submissions = await svc.GetPlayerSubmissionsAsync(familyId, status, ct);
            return Results.Ok(submissions);
        });

        admin.MapPost("/{familyId}/player-submissions/{submissionId}/process", async (
            string familyId,
            string submissionId,
            ProcessTaskCompletionRequest request,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();
            var result = await svc.ProcessPlayerSubmissionAsync(familyId, submissionId, request, uid, ct);
            return Results.Ok(result);
        });

        // ── Player endpoints (PlayerOnly policy) ─────────────────────────────
        var playerGroup = app.MapGroup("/api/family-scoreboard")
            .RequireAuthorization("PlayerOnly");

        playerGroup.MapGet("/{familyId}/tasks/available", async (
            string familyId,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var tasks = await svc.GetTasksAsync(familyId, ct);
            var playerId = user.FindFirstValue("playerId");
            if (playerId is null) return Results.Unauthorized();
            var available = tasks.Where(t => t.AssignedPlayerIds.Count == 0 || t.AssignedPlayerIds.Contains(playerId)).ToList();
            return Results.Ok(available);
        });

        playerGroup.MapPost("/{familyId}/task-completions", async (
            string familyId,
            SubmitTaskCompletionRequest request,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var playerId = user.FindFirstValue("playerId");
            if (playerId is null) return Results.Unauthorized();
            var completion = await svc.SubmitTaskCompletionAsync(familyId, request, playerId, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/task-completions/{completion.CompletionId}", completion);
        });

        playerGroup.MapPost("/{familyId}/player-submissions", async (
            string familyId,
            CreatePlayerSubmissionRequest request,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var playerId = user.FindFirstValue("playerId");
            if (playerId is null) return Results.Unauthorized();
            var submission = await svc.SubmitPlayerSubmissionAsync(familyId, request, playerId, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/player-submissions/{submission.SubmissionId}", submission);
        });

        playerGroup.MapGet("/{familyId}/my-history", async (
            string familyId,
            IFamilyScoreboardService svc,
            ClaimsPrincipal user,
            CancellationToken ct) =>
        {
            var playerId = user.FindFirstValue("playerId");
            if (playerId is null) return Results.Unauthorized();
            var txs = await svc.GetTransactionsAsync(familyId, playerId, ct);
            return Results.Ok(txs);
        });

        // ── Phase 3 Public: Shop（玩家可瀏覽商品，需要登入） ─────────────────────
        var readExtended = app.MapGroup("/api/family-scoreboard")
            .RequireAuthorization("AuthenticatedOnly");

        readExtended.MapGet("/{familyId}/shop-items", async (
            string familyId, IFamilyScoreboardService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetShopItemsAsync(familyId, ct)));

        readExtended.MapGet("/{familyId}/events", async (
            string familyId, string? month, IFamilyScoreboardService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetEventsAsync(familyId, month, ct)));

        // ── Phase 3 Admin: Allowance ──────────────────────────────────────────────
        admin.MapGet("/{familyId}/allowance", async (
            string familyId, string? playerId, IFamilyScoreboardService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetAllowanceLedgerAsync(familyId, playerId, ct)));

        admin.MapGet("/{familyId}/allowance/{playerId}/balance", async (
            string familyId, string playerId, IFamilyScoreboardService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetAllowanceBalanceAsync(familyId, playerId, ct)));

        admin.MapPost("/{familyId}/allowance", async (
            string familyId, AdjustAllowanceRequest request,
            IFamilyScoreboardService svc, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();
            var result = await svc.AdjustAllowanceAsync(familyId, request, uid, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/allowance/{result.RecordId}", result);
        });

        // ── Phase 3 Admin: Shop Management ───────────────────────────────────────
        admin.MapPost("/{familyId}/shop-items", async (
            string familyId, CreateShopItemRequest request,
            IFamilyScoreboardService svc, CancellationToken ct) =>
        {
            var item = await svc.CreateShopItemAsync(familyId, request, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/shop-items/{item.ItemId}", item);
        });

        admin.MapPut("/{familyId}/shop-items/{itemId}", async (
            string familyId, string itemId, CreateShopItemRequest request,
            IFamilyScoreboardService svc, CancellationToken ct) =>
            Results.Ok(await svc.UpdateShopItemAsync(familyId, itemId, request, ct)));

        admin.MapDelete("/{familyId}/shop-items/{itemId}", async (
            string familyId, string itemId, IFamilyScoreboardService svc, CancellationToken ct) =>
        {
            await svc.DeactivateShopItemAsync(familyId, itemId, ct);
            return Results.Ok();
        });

        admin.MapGet("/{familyId}/shop-orders", async (
            string familyId, string? status, IFamilyScoreboardService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetShopOrdersAsync(familyId, status, ct)));

        admin.MapPost("/{familyId}/shop-orders/{orderId}/process", async (
            string familyId, string orderId, ProcessShopOrderRequest request,
            IFamilyScoreboardService svc, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();
            var result = await svc.ProcessShopOrderAsync(familyId, orderId, request, uid, ct);
            return Results.Ok(result);
        });

        // ── Phase 3 Admin: Events ─────────────────────────────────────────────────
        admin.MapPost("/{familyId}/events", async (
            string familyId, CreateEventRequest request,
            IFamilyScoreboardService svc, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();
            var ev = await svc.CreateEventAsync(familyId, request, uid, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/events/{ev.EventId}", ev);
        });

        admin.MapPut("/{familyId}/events/{eventId}", async (
            string familyId, string eventId, CreateEventRequest request,
            IFamilyScoreboardService svc, CancellationToken ct) =>
            Results.Ok(await svc.UpdateEventAsync(familyId, eventId, request, ct)));

        admin.MapDelete("/{familyId}/events/{eventId}", async (
            string familyId, string eventId, IFamilyScoreboardService svc, CancellationToken ct) =>
        {
            await svc.DeleteEventAsync(familyId, eventId, ct);
            return Results.Ok();
        });

        // ── Phase 3 Admin: Task Templates ─────────────────────────────────────────
        admin.MapGet("/{familyId}/task-templates", async (
            string familyId, IFamilyScoreboardService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetTaskTemplatesAsync(familyId, ct)));

        admin.MapPost("/{familyId}/task-templates", async (
            string familyId, CreateTaskTemplateRequest request,
            IFamilyScoreboardService svc, CancellationToken ct) =>
        {
            var tmpl = await svc.CreateTaskTemplateAsync(familyId, request, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/task-templates/{tmpl.TemplateId}", tmpl);
        });

        admin.MapDelete("/{familyId}/task-templates/{templateId}", async (
            string familyId, string templateId, IFamilyScoreboardService svc, CancellationToken ct) =>
        {
            await svc.DeleteTaskTemplateAsync(familyId, templateId, ct);
            return Results.Ok();
        });

        // ── Phase 4 Admin: Backup ─────────────────────────────────────────────────
        admin.MapGet("/{familyId}/backup", async (
            string familyId, IFamilyScoreboardService svc, CancellationToken ct) =>
            Results.Ok(await svc.ExportBackupAsync(familyId, ct)));

        admin.MapPost("/{familyId}/backup/import", async (
            string familyId, FamilyBackupDto backup,
            IFamilyScoreboardService svc, CancellationToken ct) =>
        {
            await svc.ImportBackupAsync(familyId, backup, ct);
            return Results.Ok(new { message = "匯入成功" });
        });

        // ── Phase 3 Player: Shop 操作 ─────────────────────────────────────────────
        playerGroup.MapPost("/{familyId}/shop-orders", async (
            string familyId, CreateShopOrderRequest request,
            IFamilyScoreboardService svc, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var playerId = user.FindFirstValue("playerId");
            if (playerId is null) return Results.Unauthorized();
            var order = await svc.CreateShopOrderAsync(familyId, request, playerId, ct);
            return Results.Created($"/api/family-scoreboard/{familyId}/shop-orders/{order.OrderId}", order);
        });

        playerGroup.MapGet("/{familyId}/allowance/balance", async (
            string familyId, IFamilyScoreboardService svc, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var playerId = user.FindFirstValue("playerId");
            if (playerId is null) return Results.Unauthorized();
            return Results.Ok(await svc.GetAllowanceBalanceAsync(familyId, playerId, ct));
        });

        playerGroup.MapGet("/{familyId}/allowance/ledger", async (
            string familyId, IFamilyScoreboardService svc, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var playerId = user.FindFirstValue("playerId");
            if (playerId is null) return Results.Unauthorized();
            return Results.Ok(await svc.GetAllowanceLedgerAsync(familyId, playerId, ct));
        });
    }
}
