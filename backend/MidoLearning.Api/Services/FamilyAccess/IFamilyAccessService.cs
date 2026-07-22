namespace MidoLearning.Api.Services.FamilyAccess;

/// <summary>
/// 家庭歸屬判定 —— 單一職責：回答「這個 uid 有沒有權限存取這個 familyId」。
/// 抽出來給 family-scoreboard 與 family-kanban 兩個獨立模組共用（兩個模組彼此不互相依賴，
/// 但都依賴這個共用授權基礎），避免同一條 IDOR 防護邏輯在兩個模組各寫一份、之後改一邊漏一邊。
/// </summary>
public interface IFamilyAccessService
{
    /// <summary>
    /// uid 可存取 familyId 若且唯若：
    ///   1. uid 是該家庭的 primary admin（familyId == "family_{uid}"），或
    ///   2. uid 出現在該家庭的 coAdmins 子集合中。
    /// </summary>
    Task<bool> CanAccessFamilyAsync(string uid, string familyId, CancellationToken ct = default);
}
