using Google.Cloud.Firestore;
namespace MidoLearning.Api.Models.FamilyKanban;

/// <summary>
/// per-user 私密文件（例如保羅寫給配偶的「使用說明書」）。
/// 儲存路徑：family-kanban/{familyId}/private-docs/{docId} —— 獨立於
/// family-scoreboard 的 families/{familyId}/* 集合，family-kanban 是獨立模組，
/// 有自己的 Firestore 資料，只「讀」family-scoreboard 的家庭歸屬（coAdmins）做授權判定。
/// 可見性由 VisibleToEmail 決定，過濾規則見 FirebaseFamilyKanbanService.FilterVisiblePrivateDocs
/// —— 比家庭歸屬（IFamilyAccessService.CanAccessFamilyAsync）更嚴：同家庭的其他
/// admin/co-admin 也看不到。
/// </summary>
[FirestoreData]
public class PrivateDocDoc
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    [FirestoreProperty("content")]
    public string Content { get; set; } = string.Empty;

    [FirestoreProperty("visibleToEmail")]
    public string VisibleToEmail { get; set; } = string.Empty;

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    public PrivateDocDto ToDto() => new(
        Id, Title, Content, VisibleToEmail, CreatedBy, CreatedAt.ToDateTimeOffset()
    );
}
