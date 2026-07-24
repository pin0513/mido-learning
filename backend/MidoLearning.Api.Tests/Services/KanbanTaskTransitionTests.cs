using FluentAssertions;
using MidoLearning.Api.Services.FamilyKanban;

namespace MidoLearning.Api.Tests.Services;

/// <summary>
/// 純邏輯測試（不碰 Firestore）：任務狀態轉移規則。bot PATCH 回填時用來擋非法轉移
/// （done 是終態、不得回頭）。狀態機：pending → running/done/failed；running → done/failed/pending(requeue)；
/// failed → pending/running(retry)；done → 終態。同狀態視為冪等 no-op（允許）。
/// IsValidTaskTransition 為 internal static（靠 csproj 既有的 InternalsVisibleTo）。
/// </summary>
public class KanbanTaskTransitionTests
{
    [Theory]
    [InlineData("pending", "running")]
    [InlineData("pending", "done")]
    [InlineData("pending", "failed")]
    [InlineData("running", "done")]
    [InlineData("running", "failed")]
    [InlineData("running", "pending")]
    [InlineData("failed", "running")]
    [InlineData("failed", "pending")]
    [InlineData("pending", "pending")] // 冪等 no-op
    [InlineData("done", "done")]       // 冪等 no-op（終態自我）
    public void IsValidTaskTransition_AllowedTransitions_ReturnsTrue(string from, string to)
    {
        FirebaseFamilyKanbanService.IsValidTaskTransition(from, to).Should().BeTrue();
    }

    [Theory]
    [InlineData("done", "running")]   // done 是終態，不得回頭
    [InlineData("done", "pending")]
    [InlineData("pending", "archived")] // 未知狀態
    [InlineData("running", "unknown")]
    public void IsValidTaskTransition_IllegalOrUnknown_ReturnsFalse(string from, string to)
    {
        FirebaseFamilyKanbanService.IsValidTaskTransition(from, to).Should().BeFalse();
    }
}
