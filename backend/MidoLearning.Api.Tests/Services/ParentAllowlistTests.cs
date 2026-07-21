using FluentAssertions;
using Microsoft.Extensions.Configuration;
using MidoLearning.Api.Services.FamilyScoreboard;

namespace MidoLearning.Api.Tests.Services;

public class ParentAllowlistTests
{
    private static IParentAllowlist BuildAllowlist(params string[] emails)
    {
        var data = new Dictionary<string, string?>();
        for (var i = 0; i < emails.Length; i++)
        {
            data[$"FamilyScoreboard:ParentEmails:{i}"] = emails[i];
        }

        var configuration = new ConfigurationBuilder().AddInMemoryCollection(data).Build();
        return new ParentAllowlist(configuration);
    }

    [Theory]
    [InlineData("pin0513@gmail.com")]
    [InlineData("daisy9928@gmail.com")]
    public void IsParent_ConfiguredEmail_ReturnsTrue(string email)
    {
        var allowlist = BuildAllowlist("pin0513@gmail.com", "daisy9928@gmail.com");

        allowlist.IsParent(email).Should().BeTrue();
    }

    [Fact]
    public void IsParent_ConfiguredEmail_IsCaseInsensitive()
    {
        var allowlist = BuildAllowlist("pin0513@gmail.com", "daisy9928@gmail.com");

        allowlist.IsParent("PIN0513@GMAIL.COM").Should().BeTrue();
    }

    [Fact]
    public void IsParent_UnknownEmail_ReturnsFalse()
    {
        var allowlist = BuildAllowlist("pin0513@gmail.com", "daisy9928@gmail.com");

        allowlist.IsParent("stranger@example.com").Should().BeFalse();
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("   ")]
    public void IsParent_NullOrWhitespaceEmail_ReturnsFalse(string? email)
    {
        var allowlist = BuildAllowlist("pin0513@gmail.com", "daisy9928@gmail.com");

        allowlist.IsParent(email).Should().BeFalse();
    }

    [Fact]
    public void IsParent_EmptyAllowlist_ReturnsFalse()
    {
        var allowlist = BuildAllowlist();

        allowlist.IsParent("pin0513@gmail.com").Should().BeFalse();
    }
}
