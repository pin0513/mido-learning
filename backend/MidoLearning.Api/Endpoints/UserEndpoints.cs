using System.Security.Claims;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class UserEndpoints
{
    public static void MapUserEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/users")
            .WithTags("Users")
            .RequireAuthorization();

        group.MapGet("/profile", GetProfile)
            .WithName("GetProfile")
            .WithOpenApi();

        group.MapGet("/{uid}", GetUser)
            .WithName("GetUser")
            .WithOpenApi();
    }

    private static async Task<IResult> GetProfile(
        ClaimsPrincipal user,
        IFirebaseService firebaseService)
    {
        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(uid))
        {
            return Results.Unauthorized();
        }

        try
        {
            var userRecord = await firebaseService.GetUserAsync(uid);
            var response = ApiResponse<User>.Ok(new User
            {
                Id = userRecord.Uid,
                Email = userRecord.Email,
                DisplayName = userRecord.DisplayName,
                PhotoUrl = userRecord.PhotoUrl
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.NotFound(ApiResponse.Fail($"User not found: {ex.Message}"));
        }
    }

    private static async Task<IResult> GetUser(
        string uid,
        ClaimsPrincipal user,
        IFirebaseService firebaseService)
    {
        var currentUid = user.FindFirstValue(ClaimTypes.NameIdentifier);
        var role = user.FindFirstValue(ClaimTypes.Role);

        if (currentUid != uid && role != "admin")
        {
            return Results.Forbid();
        }

        try
        {
            var userRecord = await firebaseService.GetUserAsync(uid);
            var response = ApiResponse<User>.Ok(new User
            {
                Id = userRecord.Uid,
                Email = userRecord.Email,
                DisplayName = userRecord.DisplayName,
                PhotoUrl = userRecord.PhotoUrl
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.NotFound(ApiResponse.Fail($"User not found: {ex.Message}"));
        }
    }
}
