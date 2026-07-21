using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace MidoLearning.Api.Tests.Helpers;

public class TestAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    public const string AuthenticationScheme = "TestScheme";
    public const string UserIdHeader = "X-Test-UserId";
    public const string UserRoleHeader = "X-Test-UserRole";
    public const string UserEmailHeader = "X-Test-UserEmail";

    public TestAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder)
        : base(options, logger, encoder)
    {
    }

    protected override Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Check for test headers
        var userId = Request.Headers[UserIdHeader].FirstOrDefault();
        var userRole = Request.Headers[UserRoleHeader].FirstOrDefault();
        var userEmail = Request.Headers[UserEmailHeader].FirstOrDefault();

        if (string.IsNullOrEmpty(userId))
        {
            return Task.FromResult(AuthenticateResult.Fail("No test user ID provided"));
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new("firebase_uid", userId),
            // 沒帶 X-Test-UserEmail 時維持既有行為（{userId}@test.com），
            // 帶了就用指定值 —— 讓需要精確控制 email（例如 per-user 私密文件測試）的
            // 測試可以用真實的 email 格式，不影響既有測試。
            new(ClaimTypes.Email, string.IsNullOrEmpty(userEmail) ? $"{userId}@test.com" : userEmail)
        };

        if (!string.IsNullOrEmpty(userRole))
        {
            claims.Add(new Claim(ClaimTypes.Role, userRole));

            // For admin role, also add the admin claim
            if (userRole.Equals("admin", StringComparison.OrdinalIgnoreCase))
            {
                claims.Add(new Claim("admin", "true"));
            }
        }

        var identity = new ClaimsIdentity(claims, AuthenticationScheme);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, AuthenticationScheme);

        return Task.FromResult(AuthenticateResult.Success(ticket));
    }
}
