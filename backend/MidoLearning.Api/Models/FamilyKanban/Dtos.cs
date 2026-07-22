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

// ── Scoreboard（單向讀取 family-scoreboard 的「薄而誠實」投影）───────────────────
// 只含後端 scores 真有的欄位；level / badge / weekly_delta / streak / coop-goals 後端
// 未實作，故不放（不憑空捏造 mockup 才有的欄位）。展示用單向讀取 —— family-kanban 不寫、
// 不 import 計分邏輯，僅讀取 family-scoreboard 的資料模型（見 IFamilyKanbanService 註解）。
public record KanbanScoreboardMemberDto(
    string PlayerId,
    string Name,
    string? Emoji,
    int AchievementPoints
);
