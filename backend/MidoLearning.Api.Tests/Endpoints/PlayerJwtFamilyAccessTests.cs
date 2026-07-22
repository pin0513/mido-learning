using System.IdentityModel.Tokens.Jwt;
using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Security.Claims;
using System.Text;
using FluentAssertions;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.IdentityModel.Tokens;
using MidoLearning.Api.Models.FamilyScoreboard;
using MidoLearning.Api.Services;
using MidoLearning.Api.Services.FamilyAccess;
using MidoLearning.Api.Services.FamilyScoreboard;
using Moq;

namespace MidoLearning.Api.Tests.Endpoints;

/// <summary>
/// 驗證 Player JWT（子女帳號）打 read group（AuthenticatedOnly）/ playerGroup（PlayerOnly）
/// 端點時，FamilyAccessEndpointFilter.RequireFamilyAccessAsync 的 player 分支正確生效：
///   - JWT 的 familyId claim 與路由 {familyId} 相符 → 放行（回歸測試：不可誤傷正常的子女讀取，
///     這是 Phase 0 開發過程中真的踩到的一個坑——見 FamilyAccessEndpointFilter 註解）。
///   - 不符 → 403（IDOR 防護：子女 token 不能拿去讀別的家庭）。
///
/// 這個測試類別刻意不用 TestAuthHandler 覆蓋預設 auth scheme，
/// 讓請求真的走 Program.cs 註冊的 "Firebase" scheme（FirebaseAuthHandler.TryAuthenticatePlayerJwt），
/// 才能驗到「真的簽發、真的驗證」的 Player JWT 行為。
/// </summary>
public class PlayerJwtFamilyAccessTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IFamilyScoreboardService> _mockSvc;

    public PlayerJwtFamilyAccessTests(WebApplicationFactory<Program> factory)
    {
        _mockSvc = new Mock<IFamilyScoreboardService>();

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IFamilyScoreboardService));
                if (descriptor != null) services.Remove(descriptor);
                services.AddSingleton(_mockSvc.Object);

                // FirebaseAuthHandler 建構時一定要有 IFirebaseService（即使 player JWT 分支
                // 根本不會呼叫它）；換成 mock，避免 DI 真的建構 FirebaseService、
                // 進而在建構子同步讀取本機不存在的 GCP 憑證檔案而炸掉整個 request。
                var firebaseDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IFirebaseService));
                if (firebaseDescriptor != null) services.Remove(firebaseDescriptor);
                services.AddSingleton(new Mock<IFirebaseService>().Object);

                // player 分支不會呼叫 IFamilyAccessService，但防禦性地也換成 mock，
                // 避免以後有人在這個類別加測試時不小心觸發 else 分支、意外去建構
                // 真的 FirebaseFamilyAccessService（同樣需要真的 FirestoreDb）。
                var accessDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IFamilyAccessService));
                if (accessDescriptor != null) services.Remove(accessDescriptor);
                services.AddSingleton(new Mock<IFamilyAccessService>().Object);

                // 刻意不動 AddAuthentication —— 保留 Program.cs 的 "Firebase" 預設 scheme，
                // 讓 FirebaseAuthHandler 真的驗證下面手動簽發的 Player JWT。
            });
        });
    }

    private static string IssuePlayerJwt(string familyId, string playerId)
    {
        // 與 FirebaseScoreboardService.PlayerLoginAsync 相同的簽發方式，
        // 測試環境（WebApplicationFactory 預設 Development）沒設定 Jwt:Key，
        // 所以跟正式簽發邏輯一樣會落到 JwtKeyProvider.DevelopmentFallbackKey。
        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(JwtKeyProvider.DevelopmentFallbackKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("type", "player"),
            new Claim("familyId", familyId),
            new Claim("playerId", playerId),
            new Claim("playerName", "測試小孩"),
            new Claim(JwtRegisteredClaimNames.Sub, playerId),
        };

        var token = new JwtSecurityToken(
            issuer: "MidoLearning",
            audience: "MidoLearningPlayer",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds);

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    private HttpClient CreatePlayerClient(string familyId, string playerId)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", IssuePlayerJwt(familyId, playerId));
        return client;
    }

    [Fact]
    public async Task ReadEndpoint_PlayerJwt_MatchingFamilyId_Succeeds()
    {
        _mockSvc
            .Setup(s => s.GetScoresAsync("family_a", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PlayerScoreDto>());

        var client = CreatePlayerClient(familyId: "family_a", playerId: "p1");

        var response = await client.GetAsync("/api/family-scoreboard/family_a/scores");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task ReadEndpoint_PlayerJwt_DifferentFamilyId_Returns403()
    {
        // p1 的 token 綁定 family_a，卻嘗試讀 family_b 的積分 —— 必須被擋。
        var client = CreatePlayerClient(familyId: "family_a", playerId: "p1");

        var response = await client.GetAsync("/api/family-scoreboard/family_b/scores");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _mockSvc.Verify(s => s.GetScoresAsync("family_b", It.IsAny<CancellationToken>()), Times.Never);
    }

    [Fact]
    public async Task PlayerGroupEndpoint_PlayerJwt_DifferentFamilyId_Returns403()
    {
        var client = CreatePlayerClient(familyId: "family_a", playerId: "p1");

        var response = await client.GetAsync("/api/family-scoreboard/family_b/my-status");

        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
        _mockSvc.Verify(
            s => s.GetPlayerStatusAsync("family_b", It.IsAny<string>(), It.IsAny<CancellationToken>()),
            Times.Never);
    }

    [Fact]
    public async Task PlayerGroupEndpoint_PlayerJwt_MatchingFamilyId_Succeeds()
    {
        _mockSvc
            .Setup(s => s.GetPlayerStatusAsync("family_a", "p1", It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlayerStatusDto("p1", new List<SealDto>(), new List<PenaltyDto>(), new List<ActiveEffectDto>()));

        var client = CreatePlayerClient(familyId: "family_a", playerId: "p1");

        var response = await client.GetAsync("/api/family-scoreboard/family_a/my-status");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }
}

/// <summary>
/// 回歸測試：Development-only 的 X-API-Key 測試後門（appsettings.Development.json 的
/// ApiKey:TestKey，固定 uid = ApiKey:AdminUid）必須能操作「任意」familyId，
/// 不受 CanAccessFamilyAsync 限制。
///
/// 這是 Phase 0 開發過程中發現的真實迴歸：既有 E2E 測試套件
/// （frontend/e2e/family-scoreboard.spec.ts）全靠這把 API Key 操作每次 run
/// 動態建立、隨機命名的測試家庭（例如 family_test20260722153000），這個固定的
/// adminUid 本來就不會是任何測試家庭的 primary admin / co-admin —— 如果
/// RequireFamilyAccessAsync 對它也套用 CanAccessFamilyAsync，會把整套 E2E
/// （19 處呼叫）都擋成 403。修法見 FirebaseAuthHandler.TryAuthenticateWithApiKey
/// 加的 "auth_method=dev_api_key" claim + FamilyAccessEndpointFilter 的早退分支。
/// </summary>
public class DevApiKeyFamilyAccessTests : IClassFixture<WebApplicationFactory<Program>>
{
    private const string ApiKeyHeaderValue = "mido-test-api-key-2026"; // 對應 appsettings.Development.json ApiKey:TestKey

    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IFamilyScoreboardService> _mockSvc;

    public DevApiKeyFamilyAccessTests(WebApplicationFactory<Program> factory)
    {
        _mockSvc = new Mock<IFamilyScoreboardService>();

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IFamilyScoreboardService));
                if (descriptor != null) services.Remove(descriptor);
                services.AddSingleton(_mockSvc.Object);

                var firebaseDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IFirebaseService));
                if (firebaseDescriptor != null) services.Remove(firebaseDescriptor);
                services.AddSingleton(new Mock<IFirebaseService>().Object);

                // dev_api_key 分支不會呼叫 IFamilyAccessService，同樣防禦性地換成 mock。
                var accessDescriptor = services.SingleOrDefault(d => d.ServiceType == typeof(IFamilyAccessService));
                if (accessDescriptor != null) services.Remove(accessDescriptor);
                services.AddSingleton(new Mock<IFamilyAccessService>().Object);
                // 刻意不動 AddAuthentication —— 保留 "Firebase" 預設 scheme，
                // 讓 FirebaseAuthHandler.TryAuthenticateWithApiKey 真的跑。
            });
        });
    }

    private HttpClient CreateApiKeyClient()
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add("X-API-Key", ApiKeyHeaderValue);
        return client;
    }

    [Fact]
    public async Task ReadEndpoint_DevApiKey_ArbitraryDynamicFamilyId_Succeeds()
    {
        // 固定 admin uid（test-admin-uid，見 appsettings.Development.json）
        // 對一個它從未被登記為 primary admin / co-admin 的動態家庭發出請求。
        const string dynamicTestFamilyId = "family_test20260722153000";
        _mockSvc
            .Setup(s => s.GetScoresAsync(dynamicTestFamilyId, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<PlayerScoreDto>());

        var client = CreateApiKeyClient();

        var response = await client.GetAsync($"/api/family-scoreboard/{dynamicTestFamilyId}/scores");

        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task AdminEndpoint_DevApiKey_ArbitraryDynamicFamilyId_Succeeds()
    {
        const string dynamicTestFamilyId = "family_test20260722153000";
        _mockSvc
            .Setup(s => s.CreatePlayerAsync(dynamicTestFamilyId, It.IsAny<CreatePlayerRequest>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PlayerScoreDto("p1", "測試玩家", "#3b82f6", 0, 0, 0, 0, 0));

        var client = CreateApiKeyClient();

        var response = await client.PostAsJsonAsync(
            $"/api/family-scoreboard/{dynamicTestFamilyId}/players",
            new CreatePlayerRequest("p1", "測試玩家", "#3b82f6"));

        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }
}
