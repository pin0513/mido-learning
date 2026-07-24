using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.FamilyKanban;

/// <summary>
/// 每日學習（英文）設定檔（每家庭一份，doc id 固定 "daily-learning"）。
/// 由家庭 admin（pin0513 / daisy9928）設定，bot 依此產生每日英文內容。
/// 每位孩子的設定（等級/類型/主題）以 JSON 字串存（ChildrenJson），
/// 服務層以 System.Text.Json 轉成 DailyLearningChildConfig 清單，避免 Firestore 巢狀映射複雜度。
/// </summary>
[FirestoreData]
public class KanbanDailyLearningConfigDoc
{
    [FirestoreProperty("enabled")]
    public bool Enabled { get; set; } = true;

    /// <summary>DailyLearningChildConfig[] 的 JSON 字串。</summary>
    [FirestoreProperty("childrenJson")]
    public string ChildrenJson { get; set; } = "[]";

    [FirestoreProperty("updatedBy")]
    public string? UpdatedBy { get; set; }

    [FirestoreProperty("updatedAt")]
    public Timestamp UpdatedAt { get; set; }
}
