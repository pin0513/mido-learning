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

        if (string.IsNullOrEmpty(userId))
        {
            return Task.FromResult(AuthenticateResult.Fail("No test user ID provided"));
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new("firebase_uid", userId),
            new(ClaimTypes.Email, $"{userId}@test.com")
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
