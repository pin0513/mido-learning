using Google.Cloud.Firestore;

namespace MidoLearning.Api.Services.FamilyAccess;

/// <summary>
/// Firestore 版的家庭歸屬判定。搬自 Phase 0 的
/// FirebaseScoreboardService.CanAccessFamilyAsync（邏輯完全不變，只是抽成獨立、
/// 單一職責的 service）。家庭資料仍然存在 families/{familyId}/coAdmins —— 這是
/// family-scoreboard 既有的家庭結構，family-kanban 只「讀」這個歸屬關係來做授權判定，
/// 不擁有、也不寫入這個 collection。
/// </summary>
public class FirebaseFamilyAccessService : IFamilyAccessService
{
    private readonly FirestoreDb _db;

    public FirebaseFamilyAccessService(FirestoreDb db)
    {
        _db = db;
    }

    public async Task<bool> CanAccessFamilyAsync(string uid, string familyId, CancellationToken ct = default)
    {
        if (string.IsNullOrEmpty(familyId))
            return false;

        // 1. Primary admin
        if (familyId == $"family_{uid}")
            return true;

        // 2. Co-admin
        var coAdminSnap = await _db.Collection("families").Document(familyId)
            .Collection("coAdmins").Document(uid).GetSnapshotAsync(ct);
        return coAdminSnap.Exists;
    }
}
