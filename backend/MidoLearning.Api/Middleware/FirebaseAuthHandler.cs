using System.Security.Claims;
using System.Text.Encodings.Web;
using Microsoft.AspNetCore.Authentication;
using Microsoft.Extensions.Options;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Middleware;

public class FirebaseAuthHandler : AuthenticationHandler<AuthenticationSchemeOptions>
{
    private readonly IFirebaseService _firebaseService;
    private readonly IConfiguration _configuration;

    public FirebaseAuthHandler(
        IOptionsMonitor<AuthenticationSchemeOptions> options,
        ILoggerFactory logger,
        UrlEncoder encoder,
        IFirebaseService firebaseService,
        IConfiguration configuration)
        : base(options, logger, encoder)
    {
        _firebaseService = firebaseService;
        _configuration = configuration;
    }

    protected override async Task<AuthenticateResult> HandleAuthenticateAsync()
    {
        // Check for API Key authentication (for testing purposes)
        var apiKeyResult = TryAuthenticateWithApiKey();
        if (apiKeyResult is not null)
        {
            return apiKeyResult;
        }

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

    private AuthenticateResult? TryAuthenticateWithApiKey()
    {
        var apiKey = Request.Headers["X-API-Key"].FirstOrDefault();
        if (string.IsNullOrEmpty(apiKey))
        {
            return null;
        }

        var configuredKey = _configuration["ApiKey:TestKey"];
        if (string.IsNullOrEmpty(configuredKey) || apiKey != configuredKey)
        {
            Logger.LogWarning("Invalid API key attempted");
            return null;
        }

        var adminUid = _configuration["ApiKey:AdminUid"] ?? "test-admin";
        var adminEmail = _configuration["ApiKey:AdminEmail"] ?? "admin@test.com";

        Logger.LogInformation("API Key authentication successful for {Email}", adminEmail);

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, adminUid),
            new(ClaimTypes.Email, adminEmail),
            new(ClaimTypes.Name, "Test Admin"),
            new(ClaimTypes.Role, "admin"),
            new("firebase_uid", adminUid)
        };

        var identity = new ClaimsIdentity(claims, Scheme.Name);
        var principal = new ClaimsPrincipal(identity);
        var ticket = new AuthenticationTicket(principal, Scheme.Name);

        return AuthenticateResult.Success(ticket);
    }
}
