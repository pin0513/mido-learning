using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.FamilyKanban;

/// <summary>
/// 家庭看板「報報 / 新知」：有趣的新聞與學習內容（給小孩、或全家一起）。bot 產生後寫入，
/// 前端 public 依家庭碼讀取。audience：kids（兒童）| family（全家）。
/// </summary>
[FirestoreData]
public class KanbanNewsDoc
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    [FirestoreProperty("body")]
    public string Body { get; set; } = string.Empty;

    /// <summary>kids | family</summary>
    [FirestoreProperty("audience")]
    public string Audience { get; set; } = "family";

    /// <summary>lego | tech | trend | learning | news ...（自由分類）</summary>
    [FirestoreProperty("category")]
    public string? Category { get; set; }

    /// <summary>YYYY-MM-DD</summary>
    [FirestoreProperty("date")]
    public string Date { get; set; } = string.Empty;

    [FirestoreProperty("sourceUrl")]
    public string? SourceUrl { get; set; }

    /// <summary>bot | parent 等。</summary>
    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    public KanbanNewsDto ToDto() => new(
        Id, Title, Body, Audience, Category, Date, SourceUrl, CreatedBy,
        CreatedAt.ToDateTimeOffset());
}
