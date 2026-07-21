using FluentAssertions;
using Google.Cloud.Firestore;
using MidoLearning.Api.Models.FamilyScoreboard;
using MidoLearning.Api.Services.FamilyScoreboard;

namespace MidoLearning.Api.Tests.Services;

/// <summary>
/// 純邏輯測試（不碰 Firestore）：驗證 per-user 私密文件的 email 過濾規則。
/// FirebaseScoreboardService.CanAccessFamilyAsync 用真的 FirestoreDb 沒辦法在這個
/// 專案的測試環境下直接單元測試（沒有 Firestore emulator harness），但過濾邏輯本身
/// 是純函式，抽出來（FirebaseScoreboardService.FilterVisiblePrivateDocs，internal
/// static，靠 csproj 既有的 InternalsVisibleTo 讓這裡看得到）可以獨立驗證，
/// 尤其是「pin0513 看不到 daisy9928 專屬文件」這個核心不變量。
/// </summary>
public class PrivateDocVisibilityFilterTests
{
    private static PrivateDocDoc MakeDoc(string visibleToEmail, string id = "doc-1") => new()
    {
        Id = id,
        Title = "使用說明書",
        Content = "配偶專用內容",
        VisibleToEmail = visibleToEmail,
        CreatedBy = "uid-pin0513",
        CreatedAt = Timestamp.GetCurrentTimestamp(),
    };

    [Fact]
    public void FilterVisiblePrivateDocs_ExactEmailMatch_Included()
    {
        var docs = new[] { MakeDoc("daisy9928@gmail.com") };

        var result = FirebaseScoreboardService.FilterVisiblePrivateDocs(docs, "daisy9928@gmail.com");

        result.Should().ContainSingle(d => d.Id == "doc-1");
    }

    [Fact]
    public void FilterVisiblePrivateDocs_DifferentCase_StillIncluded()
    {
        var docs = new[] { MakeDoc("daisy9928@gmail.com") };

        var result = FirebaseScoreboardService.FilterVisiblePrivateDocs(docs, "DAISY9928@Gmail.com");

        result.Should().ContainSingle(d => d.Id == "doc-1");
    }

    [Fact]
    public void FilterVisiblePrivateDocs_PrimaryAdminEmail_DoesNotSeeSpouseOnlyDoc()
    {
        // 核心不變量：doc 是寫給 daisy9928 看的，pin0513（家庭 primary admin）查詢時必須拿到空清單。
        var docs = new[] { MakeDoc("daisy9928@gmail.com") };

        var result = FirebaseScoreboardService.FilterVisiblePrivateDocs(docs, "pin0513@gmail.com");

        result.Should().BeEmpty();
    }

    [Fact]
    public void FilterVisiblePrivateDocs_MultipleDocsForDifferentViewers_OnlyMatchingReturned()
    {
        var docs = new[]
        {
            MakeDoc("daisy9928@gmail.com", "doc-for-daisy"),
            MakeDoc("pin0513@gmail.com", "doc-for-pin0513"),
        };

        var forDaisy = FirebaseScoreboardService.FilterVisiblePrivateDocs(docs, "daisy9928@gmail.com");
        var forPin0513 = FirebaseScoreboardService.FilterVisiblePrivateDocs(docs, "pin0513@gmail.com");

        forDaisy.Should().ContainSingle(d => d.Id == "doc-for-daisy");
        forPin0513.Should().ContainSingle(d => d.Id == "doc-for-pin0513");
    }

    [Fact]
    public void FilterVisiblePrivateDocs_NoMatchingDocs_ReturnsEmpty()
    {
        var docs = new[] { MakeDoc("daisy9928@gmail.com") };

        var result = FirebaseScoreboardService.FilterVisiblePrivateDocs(docs, "stranger@example.com");

        result.Should().BeEmpty();
    }
}
