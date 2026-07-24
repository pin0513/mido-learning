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

// ── Tasks（任務佇列，bot 介接）──────────────────────────────────────────────
// 家長/前端建立任務 → bot 拉取 pending → 執行後 PATCH 回填 status + resultRef。
// bot cron 排程不在後端；後端只提供「取任務 + 回填」的 API。
public record KanbanTaskDto(
    string Id,
    string Kind,
    string PayloadJson,
    string Status,
    string? ResultRef,
    string RequestedBy,
    DateTimeOffset CreatedAt,
    DateTimeOffset UpdatedAt
);

public record CreateTaskRequest(
    string Kind,
    string? PayloadJson,
    string? RequestedBy
);

// bot 回填用：只允許更新 status 與 resultRef。
public record UpdateTaskRequest(
    string Status,
    string? ResultRef
);

// ── News（報報 / 新知）──────────────────────────────────────────────────────
public record KanbanNewsDto(
    string Id,
    string Title,
    string Body,
    string Audience,
    string? Category,
    string Date,
    string? SourceUrl,
    string CreatedBy,
    DateTimeOffset CreatedAt
);

public record CreateNewsRequest(
    string Title,
    string Body,
    string? Audience,
    string? Category,
    string? Date,
    string? SourceUrl,
    string? CreatedBy
);

// ── Daily English（每日英文）────────────────────────────────────────────────
public record KanbanDailyEnglishDto(
    string Id,
    string PlayerId,
    string Date,
    string Kind,
    string Term,
    string? Meaning,
    string? Example,
    string? ExampleZh,
    string CreatedBy,
    DateTimeOffset CreatedAt
);

public record CreateDailyEnglishRequest(
    string PlayerId,
    string? Date,
    string? Kind,
    string Term,
    string? Meaning,
    string? Example,
    string? ExampleZh,
    string? CreatedBy
);

// ── Calendar（行事曆）───────────────────────────────────────────────────────
public record KanbanCalendarEventDto(
    string Id,
    string Title,
    int? Dow,
    string? Date,
    string Start,
    string? End,
    string? Location,
    string Members,
    string Tag,
    string CreatedBy,
    DateTimeOffset CreatedAt
);

public record CreateCalendarEventRequest(
    string Title,
    int? Dow,
    string? Date,
    string Start,
    string? End,
    string? Location,
    string? Members,
    string? Tag,
    string? CreatedBy
);

// ── Members（成員介紹）──────────────────────────────────────────────────────
public record KanbanMemberDto(
    string PlayerId,
    string Name,
    string Role,
    string? Emoji,
    string? IntroPublic,
    IReadOnlyList<string> Likes,
    int SortOrder
);

public record UpsertMemberRequest(
    string PlayerId,
    string Name,
    string Role,
    string? Emoji,
    string? IntroPublic,
    IReadOnlyList<string>? Likes,
    int? SortOrder
);

// ── Daily Learning Config（每日學習/英文設定檔，家庭 admin 設定）────────────────
// 每位孩子的等級/類型/主題，bot 依此產生每日英文。
public record DailyLearningChildConfig(
    string PlayerId,
    bool Enabled,
    string Level,   // beginner | elementary | intermediate
    string Focus,   // word | sentence | mixed
    IReadOnlyList<string> Interests
);

public record DailyLearningConfigDto(
    bool Enabled,
    IReadOnlyList<DailyLearningChildConfig> Children,
    string? UpdatedBy,
    DateTimeOffset? UpdatedAt
);

public record UpdateDailyLearningConfigRequest(
    bool Enabled,
    IReadOnlyList<DailyLearningChildConfig> Children
);
