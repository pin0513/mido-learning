using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using MidoLearning.Api.Models.FamilyScoreboard;
using MidoLearning.Api.Services.FamilyAccess;
using MidoLearning.Api.Services.FamilyScoreboard;
using MidoLearning.Api.Tests.Helpers;
using Moq;

namespace MidoLearning.Api.Tests.Endpoints;

/// <summary>
/// Phase 0 安全地基：驗證 IDOR gate（IFamilyAccessService.CanAccessFamilyAsync，
/// 家庭歸屬架構獨立化後的共用授權服務）與 FamilyAdmin policy（player role 不算
/// family admin）確實在每個 admin / read / readExtended endpoint 生效。
/// </summary>
public class FamilyScoreboardAuthorizationTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IFamilyScoreboardService> _mockSvc;
    private readonly Mock<IFamilyAccessService> _mockAccessSvc;

    public FamilyScoreboardAuthorizationTests(WebApplicationFactory<Program> factory)
    {
        _mockSvc = new Mock<IFamilyScoreboardService>();
        _mockAccessSvc = new Mock<IFamilyAccessService>();

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IFamilyScoreboardService));
                if (descriptor != null) services.Remove(descriptor);
                services.AddSingleton(_mockSvc.Object);

                var accessDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IFamilyAccessService));
                if (accessDescriptor != null) services.Remove(accessDescriptor);
                services.AddSingleton(_mockAccessSvc.Object);

                services.AddAuthentication(TestAuthHandler.AuthenticationScheme)
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                        TestAuthHandler.AuthenticationScheme, options => { });
            });
        });
    }

    private HttpClient CreateAuthenticatedClient(string uid, string? role = null)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, uid);
        if (role is not null)
        {
            client.DefaultRequestHeaders.Add(TestAuthHandler.UserRoleHeader, role);
        }
        return client;
    }

    // ── Admin group（POST /transactions?familyId=xxx）────────────────────────

    [Fact]
    public async Task AdminEndpoint_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/family-scoreboard/transactions?familyId=family_abc",
            new AddTransactionRequest(new[] { "p1" }, "earn", 5, "test", null, null));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task AdminEndpoint_PlayerRole_Returns403()
    {
        // player 角色（子女 JWT）即使已登入，也不算 family admin —— FamilyAdmin policy 直接擋下。
        var client = CreateAuthenticatedClient("uid-1", role: "player");

        var response = await client.PostAsJsonAsync(
            "/api/family-scoreboard/transactions?familyId=family_uid-1",
            new AddTransactionRequest(new[] { "p1" }, "earn", 5, "test", null, null));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _mockSvc.Verify(s => s.AddTransactionAsync(
            It.IsAny<string>(), It.IsAny<AddTransactionRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AdminEndpoint_AuthenticatedButNotFamilyOwner_Returns403()
    {
        // IDOR：uid-attacker 已登入（非 player），但不是 family_victim 的 primary admin 或 co-admin。
        _mockAccessSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-attacker", "family_victim", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var client = CreateAuthenticatedClient("uid-attacker");

        var response = await client.PostAsJsonAsync(
            "/api/family-scoreboard/transactions?familyId=family_victim",
            new AddTransactionRequest(new[] { "p1" }, "earn", 5, "test", null, null));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _mockSvc.Verify(s => s.AddTransactionAsync(
            It.IsAny<string>(), It.IsAny<AddTransactionRequest>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task AdminEndpoint_FamilyOwner_Succeeds()
    {
        _mockAccessSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-owner", "family_uid-owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _mockSvc
            .Setup(s => s.AddTransactionAsync(
                "family_uid-owner", It.IsAny<AddTransactionRequest>(), "uid-owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TransactionDto(
                "tx-1", new[] { "p1" }, "earn", 5, "test", null, "uid-owner", DateTimeOffset.UtcNow, null));

        var client = CreateAuthenticatedClient("uid-owner");

        var response = await client.PostAsJsonAsync(
            "/api/family-scoreboard/transactions?familyId=family_uid-owner",
            new AddTransactionRequest(new[] { "p1" }, "earn", 5, "test", null, null));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task AdminEndpoint_CoAdmin_Succeeds()
    {
        // co-admin：familyId 不等於 family_{uid}，但 CanAccessFamilyAsync 判定為 true。
        _mockAccessSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-coadmin", "family_primary", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _mockSvc
            .Setup(s => s.AddTransactionAsync(
                "family_primary", It.IsAny<AddTransactionRequest>(), "uid-coadmin", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new TransactionDto(
                "tx-2", new[] { "p1" }, "earn", 5, "test", null, "uid-coadmin", DateTimeOffset.UtcNow, null));

        var client = CreateAuthenticatedClient("uid-coadmin");

        var response = await client.PostAsJsonAsync(
            "/api/family-scoreboard/transactions?familyId=family_primary",
            new AddTransactionRequest(new[] { "p1" }, "earn", 5, "test", null, null));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    // ── Read group（GET /{familyId}/scores）───────────────────────────────────

    [Fact]
    public async Task ReadEndpoint_AuthenticatedNonMember_Returns403()
    {
        _mockAccessSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-stranger", "family_someone-else", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var client = CreateAuthenticatedClient("uid-stranger");

        var response = await client.GetAsync("/api/family-scoreboard/family_someone-else/scores");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _mockSvc.Verify(s => s.GetScoresAsync(It.IsAny<string>(), It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task ReadEndpoint_FamilyOwner_Succeeds()
    {
        _mockAccessSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-owner", "family_uid-owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _mockSvc
            .Setup(s => s.GetScoresAsync("family_uid-owner", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PlayerScoreDto>());

        var client = CreateAuthenticatedClient("uid-owner");

        var response = await client.GetAsync("/api/family-scoreboard/family_uid-owner/scores");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    // ── Visitor（匿名）endpoint 依家庭決定「公開展示零用金」而回傳餘額（owner 2026-07-22 拍板）──
    // 這推翻了先前「訪客不得見零用金餘額」的隱私設計；屬明知的 Information Disclosure，
    // 由資料擁有者明確授權接受（見 VisitorPlayerDto 註解與 FirebaseScoreboardService.SumAllowanceByPlayer）。

    [Fact]
    public async Task VisitorEndpoint_IncludesAllowanceBalance()
    {
        _mockSvc
            .Setup(s => s.GetVisitorLeaderboardAsync("ABCD", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new VisitorLeaderboardDto("ABCD", new[]
            {
                new VisitorPlayerDto("p1", "小明", "#ff0000", null, 100, 50, 1385, true)
            }));

        var client = _factory.CreateClient(); // 匿名，無需登入

        var response = await client.GetAsync("/api/family-scoreboard/visitor?code=ABCD");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadAsStringAsync();
        body.Should().Contain("allowanceBalance", "家庭已決定把零用金餘額公開展示給知道代碼的人");
        body.Should().Contain("1385");
    }
}
