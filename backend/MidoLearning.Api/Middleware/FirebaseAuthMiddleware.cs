using System.Security.Claims;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Middleware;

public class FirebaseAuthMiddleware
{
    private readonly RequestDelegate _next;
    private readonly ILogger<FirebaseAuthMiddleware> _logger;

    public FirebaseAuthMiddleware(RequestDelegate next, ILogger<FirebaseAuthMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context, IFirebaseService firebaseService)
    {
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();

        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            await _next(context);
            return;
        }

        var token = authHeader["Bearer ".Length..];

        try
        {
            var decodedToken = await firebaseService.VerifyIdTokenAsync(token);

            var claims = new List<Claim>
            {
                new(ClaimTypes.NameIdentifier, decodedToken.Uid),
                new(ClaimTypes.Email, decodedToken.Claims.GetValueOrDefault("email")?.ToString() ?? ""),
                new("firebase_uid", decodedToken.Uid)
            };

            if (decodedToken.Claims.TryGetValue("admin", out var isAdmin) && (bool)isAdmin)
            {
                claims.Add(new Claim(ClaimTypes.Role, "admin"));
            }
            else
            {
                claims.Add(new Claim(ClaimTypes.Role, "member"));
            }

            var identity = new ClaimsIdentity(claims, "Firebase");
            context.User = new ClaimsPrincipal(identity);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to verify Firebase token");
        }

        await _next(context);
    }
}

public static class FirebaseAuthMiddlewareExtensions
{
    public static IApplicationBuilder UseFirebaseAuth(this IApplicationBuilder builder)
    {
        return builder.UseMiddleware<FirebaseAuthMiddleware>();
    }
}
