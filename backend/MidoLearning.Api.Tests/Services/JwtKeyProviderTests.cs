using FluentAssertions;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Hosting;
using MidoLearning.Api.Services;
using Moq;

namespace MidoLearning.Api.Tests.Services;

public class JwtKeyProviderTests
{
    private static IConfiguration BuildConfiguration(string? jwtKey)
    {
        var data = new Dictionary<string, string?>();
        if (jwtKey is not null)
            data["Jwt:Key"] = jwtKey;

        return new ConfigurationBuilder().AddInMemoryCollection(data).Build();
    }

    private static IHostEnvironment BuildEnvironment(string environmentName)
    {
        var mock = new Mock<IHostEnvironment>();
        mock.Setup(e => e.EnvironmentName).Returns(environmentName);
        return mock.Object;
    }

    [Fact]
    public void ResolveKey_DevelopmentWithoutConfiguredKey_ReturnsFallback()
    {
        var configuration = BuildConfiguration(jwtKey: null);
        var environment = BuildEnvironment(Environments.Development);

        var key = JwtKeyProvider.ResolveKey(configuration, environment);

        key.Should().Be(JwtKeyProvider.DevelopmentFallbackKey);
    }

    [Fact]
    public void ResolveKey_DevelopmentWithConfiguredKey_ReturnsConfiguredKey()
    {
        var configuration = BuildConfiguration(jwtKey: "dev-configured-key");
        var environment = BuildEnvironment(Environments.Development);

        var key = JwtKeyProvider.ResolveKey(configuration, environment);

        key.Should().Be("dev-configured-key");
    }

    [Theory]
    [InlineData("Production")]
    [InlineData("Staging")]
    [InlineData("Test")]
    public void ResolveKey_NonDevelopmentWithoutConfiguredKey_Throws(string environmentName)
    {
        var configuration = BuildConfiguration(jwtKey: null);
        var environment = BuildEnvironment(environmentName);

        var act = () => JwtKeyProvider.ResolveKey(configuration, environment);

        act.Should().Throw<InvalidOperationException>()
            .WithMessage("*Jwt:Key*");
    }

    [Fact]
    public void ResolveKey_NonDevelopmentWithConfiguredKey_ReturnsConfiguredKey()
    {
        var configuration = BuildConfiguration(jwtKey: "prod-configured-key");
        var environment = BuildEnvironment(Environments.Production);

        var key = JwtKeyProvider.ResolveKey(configuration, environment);

        key.Should().Be("prod-configured-key");
    }
}
