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
    }
}
