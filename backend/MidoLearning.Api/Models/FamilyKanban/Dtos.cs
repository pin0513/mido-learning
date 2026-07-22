namespace MidoLearning.Api.Models.FamilyKanban;

// ── Private Docs（per-user 私密文件） ──────────────────────────────────────
// 例：保羅寫給配偶的「使用說明書」，只有 VisibleToEmail 本人看得到 ——
// 比家庭歸屬更嚴，同家庭其他 admin/co-admin 都看不到（見
// IFamilyAccessService.CanAccessFamilyAsync 與
// FirebaseFamilyKanbanService.FilterVisiblePrivateDocs 的差別）。

public record PrivateDocDto(
    string Id,
    string Title,
    string Content,
    string VisibleToEmail,
    string CreatedBy,
    DateTimeOffset CreatedAt
);

public record CreatePrivateDocRequest(
    string Title,
    string Content,
    string VisibleToEmail
);
