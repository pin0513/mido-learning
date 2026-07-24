using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.FamilyKanban;

/// <summary>
/// 家庭看板「每日英文」：給孩子（ian / justin）的每日一句型或單字。bot 產生後寫入，
/// 前端 public 依家庭碼 + playerId + date 讀取。kind：sentence（句型）| word（單字）。
/// </summary>
[FirestoreData]
public class KanbanDailyEnglishDoc
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    /// <summary>ian | justin | all</summary>
    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    /// <summary>YYYY-MM-DD</summary>
    [FirestoreProperty("date")]
    public string Date { get; set; } = string.Empty;

    /// <summary>sentence（句型）| word（單字）</summary>
    [FirestoreProperty("kind")]
    public string Kind { get; set; } = "word";

    /// <summary>單字或句型本體，如 "apple" 或 "Would you like ...?"</summary>
    [FirestoreProperty("term")]
    public string Term { get; set; } = string.Empty;

    /// <summary>中文意思。</summary>
    [FirestoreProperty("meaning")]
    public string? Meaning { get; set; }

    /// <summary>例句。</summary>
    [FirestoreProperty("example")]
    public string? Example { get; set; }

    /// <summary>例句中譯。</summary>
    [FirestoreProperty("exampleZh")]
    public string? ExampleZh { get; set; }

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    public KanbanDailyEnglishDto ToDto() => new(
        Id, PlayerId, Date, Kind, Term, Meaning, Example, ExampleZh, CreatedBy,
        CreatedAt.ToDateTimeOffset());
}
