using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.FamilyKanban;

/// <summary>
/// 家庭看板任務佇列（bot 介接）。家長 / 前端建立任務，bot（openab）以 service account 拉取
/// pending 任務、執行後 PATCH 回填 status 與 resultRef。bot 的 cron 排程本身不在後端，
/// 但「取任務 + 回填」的 API 由此模組提供，讓 bot 能無痛接上。
/// payload 以 JSON 字串存（各 kind 的 payload 形狀不同，見 DATA_CONTRACT §6）。
/// </summary>
[FirestoreData]
public class KanbanTaskDoc
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>任務類型：calendar-weather | daily-report | daily-english | news | panel-digest | weekly-report | scoreboard-sync | adhoc</summary>
    [FirestoreProperty("kind")]
    public string Kind { get; set; } = string.Empty;

    /// <summary>任務參數（JSON 字串；各 kind 形狀不同）。</summary>
    [FirestoreProperty("payloadJson")]
    public string PayloadJson { get; set; } = "{}";

    /// <summary>pending | running | done | failed</summary>
    [FirestoreProperty("status")]
    public string Status { get; set; } = "pending";

    /// <summary>bot 回填：結果落地位置（如 news doc id、daily-english doc id、或訊息）。</summary>
    [FirestoreProperty("resultRef")]
    public string? ResultRef { get; set; }

    /// <summary>誰交辦：dad | mom | bot | system 等。</summary>
    [FirestoreProperty("requestedBy")]
    public string RequestedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public Timestamp UpdatedAt { get; set; }

    public KanbanTaskDto ToDto() => new(
        Id, Kind, PayloadJson, Status, ResultRef, RequestedBy,
        CreatedAt.ToDateTimeOffset(), UpdatedAt.ToDateTimeOffset());
}
