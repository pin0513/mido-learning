using FluentAssertions;
using MidoLearning.Api.Services.FamilyScoreboard;

namespace MidoLearning.Api.Tests.Services;

/// <summary>
/// 純邏輯測試（不碰 Firestore）：零用金加扣的「冪等鍵 → 確定性 ledger doc id」推導。
/// 根因：AdjustAllowanceAsync 原本每次 Guid.NewGuid() 開新 doc，雙擊/重送 → 兩筆重複 ledger
/// （正式站 Ian 就被灌了 +90、+700 兩組雙擊）。冪等鍵讓「同一次操作」對到同一個 doc id，
/// 雙擊只產生一筆。DeriveLedgerRecordId 為 internal static（靠 csproj 既有的 InternalsVisibleTo）。
/// </summary>
public class AllowanceIdempotencyTests
{
    [Fact]
    public void DeriveLedgerRecordId_SameClientRequestId_SameRecordId()
    {
        // 冪等核心不變量：同一 clientRequestId → 同一 ledger doc id → 雙擊/重送只算一筆。
        var a = FirebaseScoreboardService.DeriveLedgerRecordId("req-abc-123");
        var b = FirebaseScoreboardService.DeriveLedgerRecordId("req-abc-123");

        a.Should().Be(b);
    }

    [Fact]
    public void DeriveLedgerRecordId_DifferentClientRequestId_DifferentRecordId()
    {
        FirebaseScoreboardService.DeriveLedgerRecordId("req-1")
            .Should().NotBe(FirebaseScoreboardService.DeriveLedgerRecordId("req-2"));
    }

    [Fact]
    public void DeriveLedgerRecordId_ProducesFirestoreSafeId()
    {
        // 任意輸入都要能安全當 Firestore doc id（無 '/'、空白等），故用 SHA256 hex。
        var id = FirebaseScoreboardService.DeriveLedgerRecordId("Some/Weird Id:含特殊字元");

        id.Should().MatchRegex("^[a-f0-9]{64}$");
    }
}
