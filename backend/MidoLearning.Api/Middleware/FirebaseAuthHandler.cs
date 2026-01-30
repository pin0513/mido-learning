using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Middleware;

public class FirebaseAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IFirebaseService _firebaseService;

    public FirebaseAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IFirebaseService firebaseService)
        : base(options, logger, encoder)
    {
        _firebaseService = firebaseService;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        var authHeader = Request.Headers.Authorization.FirstOrDefault();

        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return AuthenticateResult.NoResult();
        }

        var token = authHeader["Bearer ".Length..];

        try
        {
            var decodedToken = await _firebaseService.VerifyIdTokenAsync(token);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, decodedToken.Uid),
                new(ClaimTypes.Email, decodedToken.Claims.GetValueOrDefault("email")?.ToString() ?? ""),
                new("firebase_uid", decodedToken.Uid)
            };

            // Check for admin claim
            if (decodedToken.Claims.TryGetValue("admin", out var isAdmin) && isAdmin is true)
            {
                claims.Add(new Claim(ClaimTypes.Role, "admin"));
            }

            // Check for role claim
            if (decodedToken.Claims.TryGetValue("role", out var role) && role is string roleStr)
            {
                claims.Add(new Claim(ClaimTypes.Role, roleStr));
            }
            else if (!claims.Any(c => c.Type == ClaimTypes.Role))
            {
                claims.Add(new Claim(ClaimTypes.Role, "member"));
            }

            var identity = new ClaimsIdentity(claims, Scheme.Name);
            var principal = new ClaimsPrincipal(identity);
            var ticket = new AuthenticationTicket(principal, Scheme.Name);

            return AuthenticateResult.Success(ticket);
        }
        catch (Exception ex)
        {
            Logger.LogWarning(ex, "Failed to verify Firebase token");
            return AuthenticateResult.Fail("Invalid token");
        }
    }
}
