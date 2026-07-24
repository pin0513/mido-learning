using System.Text.Json;
using Google.Cloud.Firestore;
using MidoLearning.Api.Models.FamilyKanban;
using MidoLearning.Api.Models.FamilyScoreboard; // 僅讀取資料模型（PlayerScoreDoc），不 import 計分邏輯

namespace MidoLearning.Api.Services.FamilyKanban;

public class FirebaseFamilyKanbanService : IFamilyKanbanService
{
    private readonly FirestoreDb _db;
    private readonly ILogger<FirebaseFamilyKanbanService> _logger;

    public FirebaseFamilyKanbanService(FirestoreDb db, ILogger<FirebaseFamilyKanbanService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── Firestore path helpers ────────────────────────────────────────────────
    // 獨立的 family-kanban 頂層 collection，不借用 family-scoreboard 的 families/*。

    private CollectionReference PrivateDocs(string familyId) =>
        _db.Collection("family-kanban").Document(familyId).Collection("private-docs");

    // family-scoreboard 的 displayCodes / scores collection —— family-kanban 單向讀取（展示用），
    // 不寫、不碰計分邏輯。displayCodes 是 code→familyId 的公開映射（visitor 端點也用它）。
    private CollectionReference DisplayCodes() => _db.Collection("displayCodes");
    private CollectionReference Scores(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("scores");

    // ── Scoreboard（單向讀取，展示用） ──────────────────────────────────────────

    public async Task<IReadOnlyList<KanbanScoreboardMemberDto>?> GetScoreboardByCodeAsync(
        string code, CancellationToken ct = default)
    {
        // 顯示碼 → familyId（同 visitor 端點的解析），不存在回 null 讓 endpoint 轉 404。
        var codeSnap = await DisplayCodes().Document(code.ToUpper()).GetSnapshotAsync(ct);
        if (!codeSnap.Exists) return null;

        var familyId = codeSnap.GetValue<string>("familyId");
        var snap = await Scores(familyId).GetSnapshotAsync(ct);
        return ProjectScoreboard(snap.Documents.Select(d => d.ConvertTo<PlayerScoreDoc>()));
    }

    /// <summary>
    /// 計分板投影（純邏輯，不碰 Firestore，internal static 方便單元測試 ——
    /// 見 MidoLearning.Api.Tests/Services/KanbanScoreboardProjectionTests.cs）。
    /// 只投影後端 scores 真有的欄位（name / emoji / 成就點），依成就點由高到低排序。
    /// 不含 level / badge / weekly_delta / streak / coop-goals（後端未實作，不憑空捏造）。
    /// </summary>
    internal static IReadOnlyList<KanbanScoreboardMemberDto> ProjectScoreboard(IEnumerable<PlayerScoreDoc> scores) =>
        scores
            .OrderByDescending(s => s.AchievementPoints)
            .Select(s => new KanbanScoreboardMemberDto(s.PlayerId, s.Name, s.Emoji, s.AchievementPoints))
            .ToList()
            .AsReadOnly();

    // ── Tasks（任務佇列，bot 介接） ──────────────────────────────────────────────

    private CollectionReference Tasks(string familyId) =>
        _db.Collection("family-kanban").Document(familyId).Collection("tasks");

    public async Task<KanbanTaskDto> CreateTaskAsync(
        string familyId, string kind, string payloadJson, string requestedBy, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();
        var data = new Dictionary<string, object>
        {
            ["id"] = id,
            ["kind"] = kind,
            ["payloadJson"] = string.IsNullOrWhiteSpace(payloadJson) ? "{}" : payloadJson,
            ["status"] = "pending",
            ["requestedBy"] = requestedBy,
            ["createdAt"] = now,
            ["updatedAt"] = now,
        };
        await Tasks(familyId).Document(id).SetAsync(data, cancellationToken: ct);
        var snap = await Tasks(familyId).Document(id).GetSnapshotAsync(ct);
        return snap.ConvertTo<KanbanTaskDoc>().ToDto();
    }

    public async Task<IReadOnlyList<KanbanTaskDto>> GetTasksAsync(
        string familyId, string? status, CancellationToken ct = default)
    {
        // 只用單欄 orderBy（免複合索引），status 在記憶體過濾（單一家庭任務量小）。
        var snap = await Tasks(familyId).OrderByDescending("createdAt").Limit(200).GetSnapshotAsync(ct);
        var items = snap.Documents.Select(d => d.ConvertTo<KanbanTaskDoc>());
        if (!string.IsNullOrWhiteSpace(status))
            items = items.Where(t => t.Status == status);
        return items.Select(t => t.ToDto()).ToList().AsReadOnly();
    }

    public async Task<KanbanTaskDto?> UpdateTaskAsync(
        string familyId, string taskId, string status, string? resultRef, CancellationToken ct = default)
    {
        var docRef = Tasks(familyId).Document(taskId);
        var snap = await docRef.GetSnapshotAsync(ct);
        if (!snap.Exists) return null;

        var current = snap.ConvertTo<KanbanTaskDoc>();
        if (!IsValidTaskTransition(current.Status, status))
            throw new InvalidOperationException($"非法任務狀態轉移：{current.Status} → {status}");

        var updates = new Dictionary<string, object>
        {
            ["status"] = status,
            ["updatedAt"] = Timestamp.GetCurrentTimestamp(),
        };
        if (resultRef != null) updates["resultRef"] = resultRef;

        await docRef.UpdateAsync(updates, cancellationToken: ct);
        var updated = await docRef.GetSnapshotAsync(ct);
        return updated.ConvertTo<KanbanTaskDoc>().ToDto();
    }

    /// <summary>
    /// 任務狀態轉移規則（純邏輯，internal static，見 KanbanTaskTransitionTests）。
    /// pending → running/done/failed；running → done/failed/pending(requeue)；failed → pending/running(retry)；
    /// done 為終態。同狀態視為冪等 no-op（但需為已知狀態）。
    /// </summary>
    internal static bool IsValidTaskTransition(string from, string to)
    {
        if (from == to)
            return from is "pending" or "running" or "failed" or "done";

        var allowed = from switch
        {
            "pending" => new[] { "running", "done", "failed" },
            "running" => new[] { "done", "failed", "pending" },
            "failed" => new[] { "pending", "running" },
            _ => Array.Empty<string>(), // done 終態 / 未知起始狀態
        };
        return allowed.Contains(to);
    }

    // ── 共用：家庭顯示碼 → familyId（public 讀取端點用；碼不存在回 null）────────────
    private async Task<string?> ResolveFamilyIdAsync(string code, CancellationToken ct)
    {
        var snap = await DisplayCodes().Document(code.ToUpper()).GetSnapshotAsync(ct);
        return snap.Exists ? snap.GetValue<string>("familyId") : null;
    }

    // ── News（報報/新知）──────────────────────────────────────────────────────
    private CollectionReference News(string familyId) =>
        _db.Collection("family-kanban").Document(familyId).Collection("news");

    public async Task<KanbanNewsDto> CreateNewsAsync(
        string familyId, CreateNewsRequest req, string createdBy, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();
        var data = new Dictionary<string, object>
        {
            ["id"] = id,
            ["title"] = req.Title,
            ["body"] = req.Body,
            ["audience"] = string.IsNullOrWhiteSpace(req.Audience) ? "family" : req.Audience,
            ["date"] = req.Date ?? now.ToDateTimeOffset().ToString("yyyy-MM-dd"),
            ["createdBy"] = createdBy,
            ["createdAt"] = now,
        };
        if (req.Category != null) data["category"] = req.Category;
        if (req.SourceUrl != null) data["sourceUrl"] = req.SourceUrl;

        await News(familyId).Document(id).SetAsync(data, cancellationToken: ct);
        var snap = await News(familyId).Document(id).GetSnapshotAsync(ct);
        return snap.ConvertTo<KanbanNewsDoc>().ToDto();
    }

    public async Task<IReadOnlyList<KanbanNewsDto>?> GetNewsByCodeAsync(
        string code, string? audience, string? date, CancellationToken ct = default)
    {
        var familyId = await ResolveFamilyIdAsync(code, ct);
        if (familyId is null) return null;

        var snap = await News(familyId).OrderByDescending("date").Limit(100).GetSnapshotAsync(ct);
        var items = snap.Documents.Select(d => d.ConvertTo<KanbanNewsDoc>());

        // audience：指定時回該對象 + family（全家內容給所有人看）；date：指定時精確過濾。
        if (!string.IsNullOrWhiteSpace(audience))
            items = items.Where(n => n.Audience == audience || n.Audience == "family");
        if (!string.IsNullOrWhiteSpace(date))
            items = items.Where(n => n.Date == date);

        return items.Select(n => n.ToDto()).ToList().AsReadOnly();
    }

    // ── Daily English（每日英文）──────────────────────────────────────────────
    private CollectionReference DailyEnglish(string familyId) =>
        _db.Collection("family-kanban").Document(familyId).Collection("daily-english");

    public async Task<KanbanDailyEnglishDto> CreateDailyEnglishAsync(
        string familyId, CreateDailyEnglishRequest req, string createdBy, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();
        var data = new Dictionary<string, object>
        {
            ["id"] = id,
            ["playerId"] = req.PlayerId,
            ["date"] = req.Date ?? now.ToDateTimeOffset().ToString("yyyy-MM-dd"),
            ["kind"] = string.IsNullOrWhiteSpace(req.Kind) ? "word" : req.Kind,
            ["term"] = req.Term,
            ["createdBy"] = createdBy,
            ["createdAt"] = now,
        };
        if (req.Meaning != null) data["meaning"] = req.Meaning;
        if (req.Example != null) data["example"] = req.Example;
        if (req.ExampleZh != null) data["exampleZh"] = req.ExampleZh;

        await DailyEnglish(familyId).Document(id).SetAsync(data, cancellationToken: ct);
        var snap = await DailyEnglish(familyId).Document(id).GetSnapshotAsync(ct);
        return snap.ConvertTo<KanbanDailyEnglishDoc>().ToDto();
    }

    public async Task<IReadOnlyList<KanbanDailyEnglishDto>?> GetDailyEnglishByCodeAsync(
        string code, string? playerId, string? date, CancellationToken ct = default)
    {
        var familyId = await ResolveFamilyIdAsync(code, ct);
        if (familyId is null) return null;

        var snap = await DailyEnglish(familyId).OrderByDescending("date").Limit(100).GetSnapshotAsync(ct);
        var items = snap.Documents.Select(d => d.ConvertTo<KanbanDailyEnglishDoc>());

        if (!string.IsNullOrWhiteSpace(playerId))
            items = items.Where(e => e.PlayerId == playerId || e.PlayerId == "all");
        if (!string.IsNullOrWhiteSpace(date))
            items = items.Where(e => e.Date == date);

        return items.Select(e => e.ToDto()).ToList().AsReadOnly();
    }

    // ── Calendar（行事曆）─────────────────────────────────────────────────────
    private CollectionReference CalendarEvents(string familyId) =>
        _db.Collection("family-kanban").Document(familyId).Collection("calendar-events");

    public async Task<KanbanCalendarEventDto> CreateCalendarEventAsync(
        string familyId, CreateCalendarEventRequest req, string createdBy, CancellationToken ct = default)
    {
        var id = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();
        var data = new Dictionary<string, object>
        {
            ["id"] = id,
            ["title"] = req.Title,
            ["start"] = req.Start,
            ["members"] = string.IsNullOrWhiteSpace(req.Members) ? "all" : req.Members,
            ["tag"] = string.IsNullOrWhiteSpace(req.Tag) ? "family" : req.Tag,
            ["createdBy"] = createdBy,
            ["createdAt"] = now,
        };
        if (req.Dow.HasValue) data["dow"] = req.Dow.Value;
        if (req.Date != null) data["date"] = req.Date;
        if (req.End != null) data["end"] = req.End;
        if (req.Location != null) data["location"] = req.Location;

        await CalendarEvents(familyId).Document(id).SetAsync(data, cancellationToken: ct);
        var snap = await CalendarEvents(familyId).Document(id).GetSnapshotAsync(ct);
        return snap.ConvertTo<KanbanCalendarEventDoc>().ToDto();
    }

    public async Task<IReadOnlyList<KanbanCalendarEventDto>?> GetCalendarByCodeAsync(
        string code, CancellationToken ct = default)
    {
        var familyId = await ResolveFamilyIdAsync(code, ct);
        if (familyId is null) return null;

        var snap = await CalendarEvents(familyId).GetSnapshotAsync(ct);
        return snap.Documents
            .Select(d => d.ConvertTo<KanbanCalendarEventDoc>().ToDto())
            .OrderBy(e => e.Dow ?? 99).ThenBy(e => e.Start)
            .ToList().AsReadOnly();
    }

    // ── Members（成員介紹）────────────────────────────────────────────────────
    private CollectionReference Members(string familyId) =>
        _db.Collection("family-kanban").Document(familyId).Collection("members");

    public async Task<KanbanMemberDto> UpsertMemberAsync(
        string familyId, UpsertMemberRequest req, CancellationToken ct = default)
    {
        // 以 playerId 當 doc id（upsert：同 playerId 覆寫）。
        var data = new Dictionary<string, object>
        {
            ["playerId"] = req.PlayerId,
            ["name"] = req.Name,
            ["role"] = req.Role,
            ["likes"] = (req.Likes ?? Array.Empty<string>()).ToList(),
            ["sortOrder"] = req.SortOrder ?? 0,
        };
        if (req.Emoji != null) data["emoji"] = req.Emoji;
        if (req.IntroPublic != null) data["introPublic"] = req.IntroPublic;

        await Members(familyId).Document(req.PlayerId).SetAsync(data, cancellationToken: ct);
        var snap = await Members(familyId).Document(req.PlayerId).GetSnapshotAsync(ct);
        return snap.ConvertTo<KanbanMemberDoc>().ToDto();
    }

    public async Task<IReadOnlyList<KanbanMemberDto>?> GetMembersByCodeAsync(
        string code, CancellationToken ct = default)
    {
        var familyId = await ResolveFamilyIdAsync(code, ct);
        if (familyId is null) return null;

        var snap = await Members(familyId).GetSnapshotAsync(ct);
        return snap.Documents
            .Select(d => d.ConvertTo<KanbanMemberDoc>().ToDto())
            .OrderBy(m => m.SortOrder)
            .ToList().AsReadOnly();
    }

    // ── Daily Learning Config（每日學習/英文設定，家庭 admin 設定）────────────────

    private static readonly JsonSerializerOptions ChildrenJsonOpts = new() { PropertyNameCaseInsensitive = true };

    private DocumentReference DailyLearningConfig(string familyId) =>
        _db.Collection("family-kanban").Document(familyId).Collection("config").Document("daily-learning");

    public async Task<DailyLearningConfigDto> GetDailyLearningConfigAsync(string familyId, CancellationToken ct = default)
    {
        var snap = await DailyLearningConfig(familyId).GetSnapshotAsync(ct);
        if (!snap.Exists)
            return new DailyLearningConfigDto(true, Array.Empty<DailyLearningChildConfig>(), null, null);

        var doc = snap.ConvertTo<KanbanDailyLearningConfigDoc>();
        return new DailyLearningConfigDto(
            doc.Enabled, ParseChildrenJson(doc.ChildrenJson), doc.UpdatedBy, doc.UpdatedAt.ToDateTimeOffset());
    }

    public async Task<DailyLearningConfigDto> UpdateDailyLearningConfigAsync(
        string familyId, UpdateDailyLearningConfigRequest req, string updatedBy, CancellationToken ct = default)
    {
        var data = new Dictionary<string, object>
        {
            ["enabled"] = req.Enabled,
            ["childrenJson"] = SerializeChildren(req.Children ?? Array.Empty<DailyLearningChildConfig>()),
            ["updatedBy"] = updatedBy,
            ["updatedAt"] = Timestamp.GetCurrentTimestamp(),
        };
        await DailyLearningConfig(familyId).SetAsync(data, cancellationToken: ct);
        return await GetDailyLearningConfigAsync(familyId, ct);
    }

    /// <summary>
    /// 解析每位孩子設定的 JSON 字串（純邏輯，internal static，見 DailyLearningConfigTests）。
    /// null/空/壞 JSON 一律回空清單（不丟例外，避免壞資料炸掉整個設定讀取）。
    /// </summary>
    internal static IReadOnlyList<DailyLearningChildConfig> ParseChildrenJson(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return Array.Empty<DailyLearningChildConfig>();
        try
        {
            return JsonSerializer.Deserialize<List<DailyLearningChildConfig>>(json, ChildrenJsonOpts)
                ?? (IReadOnlyList<DailyLearningChildConfig>)Array.Empty<DailyLearningChildConfig>();
        }
        catch (JsonException)
        {
            return Array.Empty<DailyLearningChildConfig>();
        }
    }

    internal static string SerializeChildren(IReadOnlyList<DailyLearningChildConfig> children) =>
        JsonSerializer.Serialize(children);

    // ── Private Docs（per-user 私密文件） ────────────────────────────────────────

    public async Task<PrivateDocDto> CreatePrivateDocAsync(
        string familyId, string title, string content, string visibleToEmail, string createdByUid, CancellationToken ct = default)
    {
        var docId = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();

        var data = new Dictionary<string, object>
        {
            ["id"] = docId,
            ["title"] = title,
            ["content"] = content,
            ["visibleToEmail"] = visibleToEmail,
            ["createdBy"] = createdByUid,
            ["createdAt"] = now,
        };

        await PrivateDocs(familyId).Document(docId).SetAsync(data, cancellationToken: ct);
        var snap = await PrivateDocs(familyId).Document(docId).GetSnapshotAsync(ct);
        return snap.ConvertTo<PrivateDocDoc>().ToDto();
    }

    public async Task<IReadOnlyList<PrivateDocDto>> GetVisiblePrivateDocsAsync(
        string familyId, string viewerEmail, CancellationToken ct = default)
    {
        var snap = await PrivateDocs(familyId).GetSnapshotAsync(ct);
        var docs = snap.Documents.Select(d => d.ConvertTo<PrivateDocDoc>());
        return FilterVisiblePrivateDocs(docs, viewerEmail);
    }

    /// <summary>
    /// 私密文件可見性過濾（純邏輯，不碰 Firestore，故 internal static 方便單元測試 ——
    /// 見 MidoLearning.Api.Tests/Services/PrivateDocVisibilityFilterTests.cs）。
    /// 只保留 VisibleToEmail 與 viewerEmail 相符（大小寫不敏感）的文件。
    /// 用「先讀整個 collection 再過濾」而非 Firestore WhereEqualTo 查詢，
    /// 是因為 Firestore 的等式查詢是大小寫敏感的，這裡的資料量（單一家庭的私密文件）
    /// 小到可以接受先讀後濾，換取不需要額外維護一個正規化（小寫）欄位。
    /// </summary>
    internal static IReadOnlyList<PrivateDocDto> FilterVisiblePrivateDocs(
        IEnumerable<PrivateDocDoc> docs, string? viewerEmail)
    {
        // 縱深防禦：未帶 email 的身份一律拿不到任何私密文件。即使 GET endpoint 已先擋 null，
        // filter 自己也守（避免 string.Equals(null, null) 對「viewer 無 email + doc 無 visibleToEmail」誤判成相符而洩漏）。
        if (string.IsNullOrWhiteSpace(viewerEmail))
            return Array.Empty<PrivateDocDto>();

        return docs
            .Where(doc => !string.IsNullOrWhiteSpace(doc.VisibleToEmail)
                && string.Equals(doc.VisibleToEmail.Trim(), viewerEmail.Trim(), StringComparison.OrdinalIgnoreCase))
            .Select(doc => doc.ToDto())
            .ToList()
            .AsReadOnly();
    }

    public async Task DeletePrivateDocAsync(string familyId, string docId, CancellationToken ct = default)
    {
        await PrivateDocs(familyId).Document(docId).DeleteAsync();
    }
}
