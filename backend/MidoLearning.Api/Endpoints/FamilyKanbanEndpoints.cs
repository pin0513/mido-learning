using System.Security.Claims;
using MidoLearning.Api.Models.FamilyKanban;
using MidoLearning.Api.Services.FamilyKanban;

namespace MidoLearning.Api.Endpoints;

/// <summary>
/// family-kanban 是獨立模組（前綴 /api/family-kanban），不是 family-scoreboard 的一部分。
/// 授權上共用 FamilyAdmin policy（player role 不算 family admin，見 Program.cs）與
/// FamilyAccessEndpointFilter.RequireFamilyAccessAsync（家庭歸屬 gate），
/// 但不依賴 FamilyScoreboardEndpoints 或 IFamilyScoreboardService ——
/// 兩個模組彼此不直接依賴，只共同依賴 IFamilyAccessService。
/// </summary>
public static class FamilyKanbanEndpoints
{
    public static void MapFamilyKanbanEndpoints(this WebApplication app)
    {
        // ── Public read（家庭儀表板公開唯讀，對齊 DATA_CONTRACT §3 public）──────────
        // 計分板「薄而誠實」單向讀取：只回 name/emoji/成就點（與既有 /family-scoreboard/visitor
        // 同屬公開的計分板資料，不含零用金等財務欄位）。無需登入，故不套 FamilyAdmin / 家庭歸屬 gate。
        var pub = app.MapGroup("/api/family-kanban");

        // 用家庭顯示碼查詢（公開 handle，不外露內部 familyId）；碼不存在回 404。
        pub.MapGet("/scoreboard", async (
            string code, IFamilyKanbanService svc, CancellationToken ct) =>
        {
            var members = await svc.GetScoreboardByCodeAsync(code, ct);
            return members is null ? Results.NotFound() : Results.Ok(members);
        });

        // 成員介紹（§2）
        pub.MapGet("/members", async (
            string code, IFamilyKanbanService svc, CancellationToken ct) =>
        {
            var members = await svc.GetMembersByCodeAsync(code, ct);
            return members is null ? Results.NotFound() : Results.Ok(members);
        });

        // 行事曆（§4）
        pub.MapGet("/calendar", async (
            string code, IFamilyKanbanService svc, CancellationToken ct) =>
        {
            var events = await svc.GetCalendarByCodeAsync(code, ct);
            return events is null ? Results.NotFound() : Results.Ok(events);
        });

        // 報報 / 新知（§7）
        pub.MapGet("/news", async (
            string code, string? audience, string? date, IFamilyKanbanService svc, CancellationToken ct) =>
        {
            var news = await svc.GetNewsByCodeAsync(code, audience, date, ct);
            return news is null ? Results.NotFound() : Results.Ok(news);
        });

        // 每日英文
        pub.MapGet("/daily-english", async (
            string code, string? playerId, string? date, IFamilyKanbanService svc, CancellationToken ct) =>
        {
            var items = await svc.GetDailyEnglishByCodeAsync(code, playerId, date, ct);
            return items is null ? Results.NotFound() : Results.Ok(items);
        });

        // ── Family Admin routes（需要 FamilyAdmin 授權 + 家庭歸屬 gate）──────────
        var admin = app.MapGroup("/api/family-kanban")
            .RequireAuthorization("FamilyAdmin")
            .AddEndpointFilter(FamilyAccessEndpointFilter.RequireFamilyAccessAsync);

        // ── Private Docs（per-user 私密文件） ────────────────────────────────────
        // 建立/刪除受 FamilyAdmin policy + RequireFamilyAccessAsync 把關
        // （呼叫者必須是這個家庭的 primary admin 或 co-admin）。
        // GET 額外套用 per-doc email 過濾（GetVisiblePrivateDocsAsync）——這一層比家庭
        // 歸屬更嚴：即使是同家庭的 primary admin，也只看得到 visibleToEmail 是自己的文件。
        admin.MapPost("/{familyId}/private-docs", async (
            string familyId, CreatePrivateDocRequest request,
            IFamilyKanbanService svc, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var uid = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("user_id");
            if (uid is null) return Results.Unauthorized();
            var doc = await svc.CreatePrivateDocAsync(familyId, request.Title, request.Content, request.VisibleToEmail, uid, ct);
            return Results.Created($"/api/family-kanban/{familyId}/private-docs/{doc.Id}", doc);
        });

        admin.MapGet("/{familyId}/private-docs", async (
            string familyId, IFamilyKanbanService svc, ClaimsPrincipal user, CancellationToken ct) =>
        {
            var email = user.FindFirstValue(ClaimTypes.Email);
            if (string.IsNullOrEmpty(email)) return Results.Ok(Array.Empty<PrivateDocDto>());
            var docs = await svc.GetVisiblePrivateDocsAsync(familyId, email, ct);
            return Results.Ok(docs);
        });

        admin.MapDelete("/{familyId}/private-docs/{docId}", async (
            string familyId, string docId, IFamilyKanbanService svc, CancellationToken ct) =>
        {
            await svc.DeletePrivateDocAsync(familyId, docId, ct);
            return Results.Ok();
        });

        // ── Tasks（任務佇列，bot 介接）────────────────────────────────────────────
        // 家長/前端 POST 建任務；bot（openab，以 admin service account）GET 拉 pending、
        // 執行後 PATCH 回填 status + resultRef。bot 的 cron 排程本身不在後端。
        admin.MapPost("/{familyId}/tasks", async (
            string familyId, CreateTaskRequest request, IFamilyKanbanService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var requestedBy = request.RequestedBy
                ?? user.FindFirstValue(ClaimTypes.Email) ?? "parent";
            var task = await svc.CreateTaskAsync(
                familyId, request.Kind, request.PayloadJson ?? "{}", requestedBy, ct);
            return Results.Created($"/api/family-kanban/{familyId}/tasks/{task.Id}", task);
        });

        admin.MapGet("/{familyId}/tasks", async (
            string familyId, string? status, IFamilyKanbanService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetTasksAsync(familyId, status, ct)));

        admin.MapPatch("/{familyId}/tasks/{taskId}", async (
            string familyId, string taskId, UpdateTaskRequest request,
            IFamilyKanbanService svc, CancellationToken ct) =>
        {
            try
            {
                var task = await svc.UpdateTaskAsync(familyId, taskId, request.Status, request.ResultRef, ct);
                return task is null ? Results.NotFound() : Results.Ok(task);
            }
            catch (InvalidOperationException ex)
            {
                return Results.BadRequest(new { message = ex.Message });
            }
        });

        // ── 內容寫入（bot 回填 / 家長維護；FamilyAdmin + 家庭歸屬 gate）─────────────
        admin.MapPost("/{familyId}/news", async (
            string familyId, CreateNewsRequest request, IFamilyKanbanService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var by = request.CreatedBy ?? user.FindFirstValue(ClaimTypes.Email) ?? "bot";
            var news = await svc.CreateNewsAsync(familyId, request, by, ct);
            return Results.Created($"/api/family-kanban/news?code=&id={news.Id}", news);
        });

        admin.MapPost("/{familyId}/daily-english", async (
            string familyId, CreateDailyEnglishRequest request, IFamilyKanbanService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var by = request.CreatedBy ?? user.FindFirstValue(ClaimTypes.Email) ?? "bot";
            var item = await svc.CreateDailyEnglishAsync(familyId, request, by, ct);
            return Results.Created($"/api/family-kanban/daily-english?id={item.Id}", item);
        });

        admin.MapPost("/{familyId}/calendar", async (
            string familyId, CreateCalendarEventRequest request, IFamilyKanbanService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var by = request.CreatedBy ?? user.FindFirstValue(ClaimTypes.Email) ?? "parent";
            var ev = await svc.CreateCalendarEventAsync(familyId, request, by, ct);
            return Results.Created($"/api/family-kanban/calendar?id={ev.Id}", ev);
        });

        admin.MapPost("/{familyId}/members", async (
            string familyId, UpsertMemberRequest request, IFamilyKanbanService svc, CancellationToken ct) =>
        {
            var member = await svc.UpsertMemberAsync(familyId, request, ct);
            return Results.Ok(member);
        });

        // ── 每日學習/英文設定檔（只有家庭 admin＝pin0513 / daisy9928 可讀寫；bot 亦以 admin 讀取）──
        admin.MapGet("/{familyId}/daily-learning-config", async (
            string familyId, IFamilyKanbanService svc, CancellationToken ct) =>
            Results.Ok(await svc.GetDailyLearningConfigAsync(familyId, ct)));

        admin.MapPut("/{familyId}/daily-learning-config", async (
            string familyId, UpdateDailyLearningConfigRequest request, IFamilyKanbanService svc,
            ClaimsPrincipal user, CancellationToken ct) =>
        {
            var by = user.FindFirstValue(ClaimTypes.Email) ?? "admin";
            var cfg = await svc.UpdateDailyLearningConfigAsync(familyId, request, by, ct);
            return Results.Ok(cfg);
        });
    }
}
