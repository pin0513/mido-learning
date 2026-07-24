using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.FamilyKanban;

/// <summary>
/// 家庭看板成員介紹（§2）。只放可對外的公開描述（IntroPublic / Likes），任何盤點/分析內容不得放這。
/// 前端 public 依家庭碼讀取。以 playerId 當 doc id。
/// </summary>
[FirestoreData]
public class KanbanMemberDoc
{
    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    /// <summary>parent | child</summary>
    [FirestoreProperty("role")]
    public string Role { get; set; } = string.Empty;

    [FirestoreProperty("emoji")]
    public string? Emoji { get; set; }

    /// <summary>唯一可對外的描述欄位。</summary>
    [FirestoreProperty("introPublic")]
    public string? IntroPublic { get; set; }

    /// <summary>喜好標籤。</summary>
    [FirestoreProperty("likes")]
    public List<string> Likes { get; set; } = new();

    [FirestoreProperty("sortOrder")]
    public int SortOrder { get; set; }

    public KanbanMemberDto ToDto() => new(
        PlayerId, Name, Role, Emoji, IntroPublic, Likes.AsReadOnly(), SortOrder);
}
