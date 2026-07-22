using System.Security.Claims;
using MidoLearning.Api.Services.FamilyAccess;

namespace MidoLearning.Api.Endpoints;

/// <summary>
/// 共用的 IDOR 防護 gate —— 搬自 Phase 0 的 FamilyScoreboardEndpoints.RequireFamilyAccessAsync
/// （邏輯完全不變），抽出來讓 family-scoreboard 與 family-kanban 兩個獨立模組共用同一份
/// gate 實作。兩個模組的 route group 都用 <see cref="RequireFamilyAccessAsync"/> 當
/// AddEndpointFilter，彼此不直接依賴，只共同依賴 <see cref="IFamilyAccessService"/>。
/// </summary>
public static class FamilyAccessEndpointFilter
{
    /// <summary>
    /// 從 query string 取得 familyId，若無則 fallback 到 family_{uid}。
    /// 這讓 co-admin 能在指定 familyId 的情況下使用原本 hardcode family_{uid} 的端點。
    /// </summary>
    public static string ResolveFamilyId(HttpContext httpContext, string uid)
    {
        return httpContext.Request.Query.TryGetValue("familyId", out var fid) && !string.IsNullOrEmpty(fid)
            ? fid.ToString()
            : $"family_{uid}";
    }

    /// <summary>
    /// IDOR 防護 gate：套用在需要「呼叫者必須是這個 familyId 的 primary admin 或
    /// co-admin」的 route group（family-scoreboard 的 admin / read / readExtended /
    /// playerGroup，family-kanban 的 admin group）。
    /// 解析出這次請求實際操作的 familyId（優先取路由的 {familyId}，沒有就退回
    /// ResolveFamilyId 的 query-string/family_{uid} 邏輯），再呼叫
    /// <see cref="IFamilyAccessService.CanAccessFamilyAsync"/> 確認呼叫者（uid）
    /// 是該家庭的 primary admin 或 co-admin。不通過一律回 403 Forbidden，
    /// 阻止登入者用已知/猜測的 familyId 讀寫他人家庭資料。
    ///
    /// 「player」角色（子女 JWT）走另一條分支：Player JWT 簽發時已經把 familyId
    /// 綁在 claim 上（見 FirebaseAuthHandler.TryAuthenticatePlayerJwt），這裡的
    /// uid（NameIdentifier）其實是 playerId，不是任何家庭的 primary admin/co-admin，
    /// 不能拿去問 CanAccessFamilyAsync —— 那樣會把所有子女請求都擋成 403。
    /// 子女的正確檢查是「路由的 {familyId} 是否等於 JWT 內的 familyId claim」。
    ///
    /// 帶 "auth_method=dev_api_key" claim 的呼叫者（見
    /// FirebaseAuthHandler.TryAuthenticateWithApiKey）完全跳過家庭歸屬檢查：這是
    /// Development-only 的測試後門身份，E2E 測試會用它操作每次 run 動態建立、
    /// 隨機命名的測試家庭，本來就不會出現在任何真實家庭的 coAdmins 名單裡。
    /// 這個 claim 只可能由該後門本身設定（非 Development 已停用、也不是使用者可控輸入），
    /// 不會被拿來偽造繞過正式環境的 IDOR 防護。
    /// </summary>
    public static async ValueTask<object?> RequireFamilyAccessAsync(
        EndpointFilterInvocationContext filterContext,
        EndpointFilterDelegate next)
    {
        var httpContext = filterContext.HttpContext;
        var user = httpContext.User;

        if (user.HasClaim("auth_method", "dev_api_key"))
            return await next(filterContext);

        var routeFamilyId = httpContext.Request.RouteValues.TryGetValue("familyId", out var routeValue)
            && routeValue is string rid && !string.IsNullOrEmpty(rid)
            ? rid
            : null;

        if (user.IsInRole("player"))
        {
            var jwtFamilyId = user.FindFirstValue("familyId");
            if (routeFamilyId is not null && routeFamilyId != jwtFamilyId)
                return Results.Forbid();

            return await next(filterContext);
        }

        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier) ?? user.FindFirstValue("user_id");
        if (uid is null) return Results.Unauthorized();

        var familyId = routeFamilyId ?? ResolveFamilyId(httpContext, uid);

        var svc = httpContext.RequestServices.GetRequiredService<IFamilyAccessService>();
        var canAccess = await svc.CanAccessFamilyAsync(uid, familyId, httpContext.RequestAborted);
        if (!canAccess) return Results.Forbid();

        return await next(filterContext);
    }
}
