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
