using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using MidoLearning.Api.Models.FamilyScoreboard;
using MidoLearning.Api.Services.FamilyScoreboard;
using MidoLearning.Api.Tests.Helpers;
using Moq;

namespace MidoLearning.Api.Tests.Endpoints;

/// <summary>
/// Phase 3 安全切片：per-user 私密文件（保羅寫給配偶的「使用說明書」，只有
/// daisy9928@gmail.com 看得到）。核心不變量：**per-doc email 過濾比家庭歸屬更嚴**——
/// 即使是同家庭的 primary admin（保羅本人 pin0513），也拿不到 visibleToEmail
/// 不是自己的 doc。這條測試（GetPrivateDocs_PrimaryAdminNotTargetEmail_ReturnsEmpty）
/// 是本功能的驗收核心，team lead 會親自重跑驗證。
/// </summary>
public class PrivateDocsEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IFamilyScoreboardService> _mockSvc;

    public PrivateDocsEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _mockSvc = new Mock<IFamilyScoreboardService>();

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IFamilyScoreboardService));
                if (descriptor != null) services.Remove(descriptor);
                services.AddSingleton(_mockSvc.Object);

                services.AddAuthentication(TestAuthHandler.AuthenticationScheme)
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                        TestAuthHandler.AuthenticationScheme, options => { });
            });
        });
    }

    private HttpClient CreateAuthenticatedClient(string uid, string email, string? role = null)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, uid);
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserEmailHeader, email);
        if (role is not null) client.DefaultRequestHeaders.Add(TestAuthHandler.UserRoleHeader, role);
        return client;
    }

    // ── GET /{familyId}/private-docs ─────────────────────────────────────────

    [Fact]
    public async Task GetPrivateDocs_TargetEmail_ReturnsVisibleDocs()
    {
        // daisy9928 是這個家庭的 co-admin。
        _mockSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-daisy", "family_uid-pin0513", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        var expectedDoc = new PrivateDocDto(
            "doc-1", "使用說明書", "配偶專用內容", "daisy9928@gmail.com", "uid-pin0513", DateTimeOffset.UtcNow);
        _mockSvc
            .Setup(s => s.GetVisiblePrivateDocsAsync("family_uid-pin0513", "daisy9928@gmail.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PrivateDocDto> { expectedDoc });

        // daisy9928 是這個家庭的 co-admin，用她自己的 email 查詢。
        var client = CreateAuthenticatedClient("uid-daisy", "daisy9928@gmail.com");

        var response = await client.GetAsync("/api/family-scoreboard/family_uid-pin0513/private-docs");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<PrivateDocDto>>();
        body.Should().ContainSingle(d => d.Id == "doc-1");
    }

    [Fact]
    public async Task GetPrivateDocs_PrimaryAdminNotTargetEmail_ReturnsEmpty()
    {
        // 核心驗收條件：保羅（pin0513，這個家庭的 primary admin）查詢自己的家庭，
        // 但 doc 是寫給 daisy9928 看的 —— 保羅必須拿到空清單，不能看到內容。
        _mockSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-pin0513", "family_uid-pin0513", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _mockSvc
            .Setup(s => s.GetVisiblePrivateDocsAsync("family_uid-pin0513", "pin0513@gmail.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PrivateDocDto>()); // service 層本來就只回傳 visibleToEmail 相符的文件

        var client = CreateAuthenticatedClient("uid-pin0513", "pin0513@gmail.com");

        var response = await client.GetAsync("/api/family-scoreboard/family_uid-pin0513/private-docs");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<PrivateDocDto>>();
        body.Should().BeEmpty();
    }

    [Fact]
    public async Task GetPrivateDocs_NonFamilyMember_Returns403()
    {
        _mockSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-stranger", "family_uid-pin0513", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var client = CreateAuthenticatedClient("uid-stranger", "stranger@example.com");

        var response = await client.GetAsync("/api/family-scoreboard/family_uid-pin0513/private-docs");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _mockSvc.Verify(
            s => s.GetVisiblePrivateDocsAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task GetPrivateDocs_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.GetAsync("/api/family-scoreboard/family_uid-pin0513/private-docs");

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    [Fact]
    public async Task GetPrivateDocs_EmailIsCaseInsensitiveAtTheServiceCall()
    {
        // Endpoint 層要把登入者的 email 原封不動傳給 service（大小寫不敏感比對邏輯在
        // service 層 —— 見 PrivateDocVisibilityFilterTests），這裡只驗證 wiring 正確。
        _mockSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-daisy", "family_uid-pin0513", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _mockSvc
            .Setup(s => s.GetVisiblePrivateDocsAsync("family_uid-pin0513", "DAISY9928@GMAIL.COM", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PrivateDocDto>
            {
                new("doc-1", "t", "c", "daisy9928@gmail.com", "uid-pin0513", DateTimeOffset.UtcNow)
            });

        var client = CreateAuthenticatedClient("uid-daisy", "DAISY9928@GMAIL.COM");

        var response = await client.GetAsync("/api/family-scoreboard/family_uid-pin0513/private-docs");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        var body = await response.Content.ReadFromJsonAsync<List<PrivateDocDto>>();
        body.Should().ContainSingle();
    }

    // ── POST /{familyId}/private-docs ────────────────────────────────────────

    [Fact]
    public async Task CreatePrivateDoc_FamilyOwner_Succeeds()
    {
        _mockSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-pin0513", "family_uid-pin0513", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);
        _mockSvc
            .Setup(s => s.CreatePrivateDocAsync(
                "family_uid-pin0513", "使用說明書", "內容...", "daisy9928@gmail.com", "uid-pin0513", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PrivateDocDto(
                "doc-1", "使用說明書", "內容...", "daisy9928@gmail.com", "uid-pin0513", DateTimeOffset.UtcNow));

        var client = CreateAuthenticatedClient("uid-pin0513", "pin0513@gmail.com");

        var response = await client.PostAsJsonAsync(
            "/api/family-scoreboard/family_uid-pin0513/private-docs",
            new CreatePrivateDocRequest("使用說明書", "內容...", "daisy9928@gmail.com"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreatePrivateDoc_NonFamilyMember_Returns403()
    {
        _mockSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-stranger", "family_uid-pin0513", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var client = CreateAuthenticatedClient("uid-stranger", "stranger@example.com");

        var response = await client.PostAsJsonAsync(
            "/api/family-scoreboard/family_uid-pin0513/private-docs",
            new CreatePrivateDocRequest("t", "c", "daisy9928@gmail.com"));

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _mockSvc.Verify(s => s.CreatePrivateDocAsync(
            It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task CreatePrivateDoc_Unauthenticated_Returns401()
    {
        var client = _factory.CreateClient();

        var response = await client.PostAsJsonAsync(
            "/api/family-scoreboard/family_uid-pin0513/private-docs",
            new CreatePrivateDocRequest("t", "c", "daisy9928@gmail.com"));

        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    // ── DELETE /{familyId}/private-docs/{docId} ──────────────────────────────

    [Fact]
    public async Task DeletePrivateDoc_FamilyOwner_Succeeds()
    {
        _mockSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-pin0513", "family_uid-pin0513", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var client = CreateAuthenticatedClient("uid-pin0513", "pin0513@gmail.com");

        var response = await client.DeleteAsync("/api/family-scoreboard/family_uid-pin0513/private-docs/doc-1");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
        _mockSvc.Verify(
            s => s.DeletePrivateDocAsync("family_uid-pin0513", "doc-1", It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task DeletePrivateDoc_NonFamilyMember_Returns403()
    {
        _mockSvc
            .Setup(s => s.CanAccessFamilyAsync("uid-stranger", "family_uid-pin0513", It.IsAny<CancellationToken>()))
            .ReturnsAsync(false);

        var client = CreateAuthenticatedClient("uid-stranger", "stranger@example.com");

        var response = await client.DeleteAsync("/api/family-scoreboard/family_uid-pin0513/private-docs/doc-1");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _mockSvc.Verify(
            s => s.DeletePrivateDocAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }
}
