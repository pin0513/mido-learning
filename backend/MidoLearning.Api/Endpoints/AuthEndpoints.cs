using System.Security.Claims;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/auth").WithTags("Auth");

        group.MapGet("/me", GetCurrentUser)
            .RequireAuthorization()
            .WithName("GetCurrentUser")
            .WithOpenApi();

        group.MapPost("/verify", VerifyToken)
            .WithName("VerifyToken")
            .WithOpenApi();
    }

    private static IResult GetCurrentUser(ClaimsPrincipal user)
    {
        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);
        var email = user.FindFirstValue(ClaimTypes.Email);
        var role = user.FindFirstValue(ClaimTypes.Role);

        if (string.IsNullOrEmpty(uid))
        {
            return Results.Unauthorized();
        }

        var response = ApiResponse<object>.Ok(new
        {
            Uid = uid,
            Email = email,
            Role = role
        });

        return Results.Ok(response);
    }

    private static async Task<IResult> VerifyToken(
        HttpContext context,
        IFirebaseService firebaseService)
    {
        var authHeader = context.Request.Headers.Authorization.FirstOrDefault();

        if (string.IsNullOrEmpty(authHeader) || !authHeader.StartsWith("Bearer "))
        {
            return Results.BadRequest(ApiResponse.Fail("Missing or invalid authorization header"));
        }

        var token = authHeader["Bearer ".Length..];

        try
        {
            var decodedToken = await firebaseService.VerifyIdTokenAsync(token);
            var response = ApiResponse<object>.Ok(new
            {
                Uid = decodedToken.Uid,
                Email = decodedToken.Claims.GetValueOrDefault("email"),
                EmailVerified = decodedToken.Claims.GetValueOrDefault("email_verified"),
                IsAdmin = decodedToken.Claims.GetValueOrDefault("admin", false)
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Token verification failed: {ex.Message}"));
        }
    }
}
