using System.Security.Claims;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class AdminEndpoints
{
    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("Admin")
            .RequireAuthorization("AdminOnly");

        group.MapPost("/set-admin/{uid}", SetAdminRole)
            .WithName("SetAdminRole")
            .WithOpenApi();

        group.MapDelete("/remove-admin/{uid}", RemoveAdminRole)
            .WithName("RemoveAdminRole")
            .WithOpenApi();

        group.MapGet("/stats", GetStats)
            .WithName("GetAdminStats")
            .WithOpenApi();
    }

    private static async Task<IResult> SetAdminRole(
        string uid,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            await firebaseService.SetCustomClaimsAsync(uid, new Dictionary<string, object>
            {
                { "admin", true }
            });

            logger.LogInformation("Admin role granted to user {Uid}", uid);
            return Results.Ok(ApiResponse.Ok($"Admin role granted to user {uid}"));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to set admin role: {ex.Message}"));
        }
    }

    private static async Task<IResult> RemoveAdminRole(
        string uid,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            await firebaseService.SetCustomClaimsAsync(uid, new Dictionary<string, object>
            {
                { "admin", false }
            });

            logger.LogInformation("Admin role removed from user {Uid}", uid);
            return Results.Ok(ApiResponse.Ok($"Admin role removed from user {uid}"));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to remove admin role: {ex.Message}"));
        }
    }

    private static IResult GetStats()
    {
        var response = ApiResponse<object>.Ok(new
        {
            TotalUsers = 0,
            ActiveCourses = 0,
            TotalEnrollments = 0,
            CompletionRate = 0.0
        });

        return Results.Ok(response);
    }
}
