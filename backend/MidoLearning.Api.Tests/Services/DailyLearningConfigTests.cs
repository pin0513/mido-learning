using FluentAssertions;
using MidoLearning.Api.Models.FamilyKanban;
using MidoLearning.Api.Services.FamilyKanban;

namespace MidoLearning.Api.Tests.Services;

/// <summary>
/// 純邏輯測試（不碰 Firestore）：每日學習設定檔的 children JSON 序列化 / 反序列化。
/// 每位孩子設定以 JSON 字串存 Firestore；壞 / 空 JSON 必須安全回空清單，不得炸掉整個設定讀取。
/// </summary>
public class DailyLearningConfigTests
{
    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    [InlineData("not-json")]
    [InlineData("{ broken")]
    public void ParseChildrenJson_NullEmptyOrInvalid_ReturnsEmpty(string? json)
    {
        FirebaseFamilyKanbanService.ParseChildrenJson(json).Should().BeEmpty();
    }

    [Fact]
    public void SerializeThenParse_RoundTrips()
    {
        var children = new List<DailyLearningChildConfig>
        {
            new("ian", true, "elementary", "word", new[] { "lego", "space" }),
            new("justin", true, "beginner", "sentence", new[] { "dance" }),
        };

        var json = FirebaseFamilyKanbanService.SerializeChildren(children);
        var parsed = FirebaseFamilyKanbanService.ParseChildrenJson(json);

        parsed.Should().HaveCount(2);
        parsed[0].PlayerId.Should().Be("ian");
        parsed[0].Level.Should().Be("elementary");
        parsed[0].Focus.Should().Be("word");
        parsed[0].Interests.Should().BeEquivalentTo(new[] { "lego", "space" });
        parsed[1].PlayerId.Should().Be("justin");
        parsed[1].Enabled.Should().BeTrue();
    }
}
