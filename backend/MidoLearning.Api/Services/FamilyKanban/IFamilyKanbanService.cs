using MidoLearning.Api.Models.FamilyKanban;

namespace MidoLearning.Api.Services.FamilyKanban;

/// <summary>
/// family-kanban 是獨立模組（前綴 /api/family-kanban），有自己的 service 與資料，
/// 不依賴 family-scoreboard 的 IFamilyScoreboardService，也不碰計分/商城/封印等
/// 計分板管控邏輯。兩個模組只共用家庭歸屬授權基礎
/// （MidoLearning.Api.Services.FamilyAccess.IFamilyAccessService）。
/// 未來若要顯示點數/零用金，只會單向讀取 family-scoreboard 的資料，不會寫入。
/// </summary>
public interface IFamilyKanbanService
{
    // ── Scoreboard（單向讀取，展示用） ────────────────────────────────────────
    /// <summary>
    /// 依家庭顯示碼（displayCode）單向讀取 family-scoreboard 的 scores，投影成「薄而誠實」的
    /// 計分板（只含後端真有的欄位：name / emoji / 成就點；依成就點由高到低）。
    /// 唯讀、不寫、不 import 計分邏輯，也不依賴 IFamilyScoreboardService。
    /// 用顯示碼（而非內部 familyId）當公開 handle，不外露內部 id。顯示碼不存在時回 null（endpoint 轉 404）。
    /// </summary>
    Task<IReadOnlyList<KanbanScoreboardMemberDto>?> GetScoreboardByCodeAsync(
        string code, CancellationToken ct = default);

    // ── Private Docs（per-user 私密文件） ──────────────────────────────────────
    /// <summary>建立私密文件，只有 visibleToEmail 本人查詢時看得到。</summary>
    Task<PrivateDocDto> CreatePrivateDocAsync(
        string familyId, string title, string content, string visibleToEmail, string createdByUid, CancellationToken ct = default);

    /// <summary>
    /// 只回傳 visibleToEmail 與 viewerEmail 相符（大小寫不敏感）的文件。
    /// 這個過濾比家庭歸屬（IFamilyAccessService.CanAccessFamilyAsync）更嚴：
    /// 同家庭的其他 admin/co-admin 一律看不到。
    /// </summary>
    Task<IReadOnlyList<PrivateDocDto>> GetVisiblePrivateDocsAsync(
        string familyId, string viewerEmail, CancellationToken ct = default);

    Task DeletePrivateDocAsync(string familyId, string docId, CancellationToken ct = default);
}
