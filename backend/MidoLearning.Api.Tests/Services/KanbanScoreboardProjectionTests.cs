using FluentAssertions;
using MidoLearning.Api.Models.FamilyScoreboard;
using MidoLearning.Api.Services.FamilyKanban;

namespace MidoLearning.Api.Tests.Services;

/// <summary>
/// 純邏輯測試（不碰 Firestore）：family-kanban 計分板「薄而誠實」單向讀取投影。
/// 只投影後端 scores 真有的欄位（playerId / name / emoji / achievementPoints），
/// 不含 level / badge / weekly_delta / streak / coop-goals —— 那些後端未實作，不憑空捏造。
/// 依成就點由高到低排序。ProjectScoreboard 為 internal static（靠 csproj 既有的 InternalsVisibleTo）。
/// family-kanban 只單向讀取 family-scoreboard 的資料模型，不依賴 IFamilyScoreboardService、不碰計分邏輯。
/// </summary>
public class KanbanScoreboardProjectionTests
{
    private static PlayerScoreDoc Score(string playerId, string name, int achievementPoints, string? emoji = null) => new()
    {
        PlayerId = playerId,
        Name = name,
        AchievementPoints = achievementPoints,
        Emoji = emoji,
    };

    [Fact]
    public void ProjectScoreboard_MapsOnlyHonestFields()
    {
        var scores = new[] { Score("ian", "米豆", 770, "🌾") };

        var result = FirebaseFamilyKanbanService.ProjectScoreboard(scores);

        result.Should().ContainSingle();
        var m = result[0];
        m.PlayerId.Should().Be("ian");
        m.Name.Should().Be("米豆");
        m.Emoji.Should().Be("🌾");
        m.AchievementPoints.Should().Be(770);
    }

    [Fact]
    public void ProjectScoreboard_OrdersByAchievementPointsDescending()
    {
        var scores = new[]
        {
            Score("justin", "毛豆", 0),
            Score("ian", "米豆", 770),
            Score("dad", "保羅", 300),
        };

        var result = FirebaseFamilyKanbanService.ProjectScoreboard(scores);

        result.Select(m => m.PlayerId).Should().ContainInOrder("ian", "dad", "justin");
    }

    [Fact]
    public void ProjectScoreboard_EmptyScores_ReturnsEmpty()
    {
        var result = FirebaseFamilyKanbanService.ProjectScoreboard(Array.Empty<PlayerScoreDoc>());

        result.Should().BeEmpty();
    }
}
