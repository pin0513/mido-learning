using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.FamilyKanban;

/// <summary>
/// 家庭看板行事曆事件。支援兩種：每週固定（Dow 0-6、Date 為 null）與單次（Date=YYYY-MM-DD、Dow 為 null）。
/// bot 可寫入天氣/建議（以 event 形式或 adhoc），前端 public 依家庭碼讀取。
/// </summary>
[FirestoreData]
public class KanbanCalendarEventDoc
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    /// <summary>每週固定活動的星期（0=日 … 6=六）；單次事件為 null。</summary>
    [FirestoreProperty("dow")]
    public int? Dow { get; set; }

    /// <summary>單次事件日期 YYYY-MM-DD；每週固定為 null。</summary>
    [FirestoreProperty("date")]
    public string? Date { get; set; }

    /// <summary>HH:mm</summary>
    [FirestoreProperty("start")]
    public string Start { get; set; } = string.Empty;

    [FirestoreProperty("end")]
    public string? End { get; set; }

    [FirestoreProperty("location")]
    public string? Location { get; set; }

    /// <summary>參與成員（playerId 逗號分隔，或 "all"）。</summary>
    [FirestoreProperty("members")]
    public string Members { get; set; } = "all";

    /// <summary>family | dad | mom | class | outdoor</summary>
    [FirestoreProperty("tag")]
    public string Tag { get; set; } = "family";

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    public KanbanCalendarEventDto ToDto() => new(
        Id, Title, Dow, Date, Start, End, Location, Members, Tag, CreatedBy,
        CreatedAt.ToDateTimeOffset());
}
