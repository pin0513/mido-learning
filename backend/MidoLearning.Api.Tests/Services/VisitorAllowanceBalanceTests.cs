using FluentAssertions;
using MidoLearning.Api.Models.FamilyScoreboard;
using MidoLearning.Api.Services.FamilyScoreboard;

namespace MidoLearning.Api.Tests.Services;

/// <summary>
/// 純邏輯測試（不碰 Firestore）：驗證訪客排行榜零用金餘額的投影規則。
/// 核心不變量：每位玩家零用金 = SUM(該玩家 allowance-ledger.amount)，
/// 與 FirebaseScoreboardService.GetAllowanceBalanceAsync / admin 面板 / 主計分板同一算法，
/// 確保三端一致、不 drift。刻意不接 redeemablePoints 快照（那是會漂移的來源）。
/// SumAllowanceByPlayer 為 internal static（靠 csproj 既有的 InternalsVisibleTo 讓這裡看得到）。
/// </summary>
public class VisitorAllowanceBalanceTests
{
    private static AllowanceLedgerDoc Entry(string playerId, int amount) => new()
    {
        PlayerId = playerId,
        Amount = amount,
    };

    [Fact]
    public void SumAllowanceByPlayer_MultipleEntries_SumsEarnAndSpend()
    {
        // 同一玩家多筆：earn(+) 與 spend(-) 全部相加，等於 ledger 真源。
        var records = new[]
        {
            Entry("ian", 500),
            Entry("ian", 985),
            Entry("ian", -100),
        };

        var result = FirebaseScoreboardService.SumAllowanceByPlayer(records);

        result["ian"].Should().Be(1385);
    }

    [Fact]
    public void SumAllowanceByPlayer_OverspentPlayer_AllowsNegativeBalance()
    {
        // 不做 clamp：ledger 加總可為負，忠實反映真源（GetAllowanceBalanceAsync 也不 clamp）。
        var records = new[]
        {
            Entry("justin", 100),
            Entry("justin", -300),
        };

        var result = FirebaseScoreboardService.SumAllowanceByPlayer(records);

        result["justin"].Should().Be(-200);
    }

    [Fact]
    public void SumAllowanceByPlayer_MultiplePlayers_GroupedIndependently()
    {
        var records = new[]
        {
            Entry("ian", 500),
            Entry("justin", 985),
            Entry("ian", 200),
        };

        var result = FirebaseScoreboardService.SumAllowanceByPlayer(records);

        result["ian"].Should().Be(700);
        result["justin"].Should().Be(985);
    }

    [Fact]
    public void SumAllowanceByPlayer_EmptyLedger_ReturnsEmpty()
    {
        var result = FirebaseScoreboardService.SumAllowanceByPlayer(Array.Empty<AllowanceLedgerDoc>());

        result.Should().BeEmpty();
    }

    [Fact]
    public void SumAllowanceByPlayer_PlayerAbsentFromLedger_DefaultsToZeroViaLookup()
    {
        // 契約：ledger 沒有紀錄的玩家不在 dict 裡；呼叫端以 GetValueOrDefault(playerId, 0) 補 0。
        var records = new[] { Entry("ian", 500) };

        var result = FirebaseScoreboardService.SumAllowanceByPlayer(records);

        result.ContainsKey("justin").Should().BeFalse();
        result.GetValueOrDefault("justin", 0).Should().Be(0);
    }
}
