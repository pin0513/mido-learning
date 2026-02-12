using System.Security.Claims;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class AchievementEndpoints
{
    public static void MapAchievementEndpoints(this IEndpointRouteBuilder app)
    {
        // Game Admin endpoints - achievement management
        var adminGroup = app.MapGroup("/api/game-admin/achievements")
            .WithTags("Game Admin - Achievements")
            .RequireAuthorization("GameAdminOnly");

        adminGroup.MapGet("", GetAllAchievements)
            .WithName("GetAllAchievements")
            .WithOpenApi();

        adminGroup.MapPost("", CreateAchievement)
            .WithName("CreateAchievement")
            .WithOpenApi();

        adminGroup.MapPut("/{id}", UpdateAchievement)
            .WithName("UpdateAchievement")
            .WithOpenApi();

        adminGroup.MapDelete("/{id}", DeleteAchievement)
            .WithName("DeleteAchievement")
            .WithOpenApi();

        // Member endpoints - user achievements
        var memberGroup = app.MapGroup("/api/achievements")
            .WithTags("Achievements")
            .RequireAuthorization();

        memberGroup.MapGet("/my", GetMyAchievements)
            .WithName("GetMyAchievements")
            .WithOpenApi();

        memberGroup.MapPost("/{id}/claim", ClaimAchievementReward)
            .WithName("ClaimAchievementReward")
            .WithOpenApi();
    }

    // Game Admin endpoints

    private static async Task<IResult> GetAllAchievements(
        IAchievementService achievementService,
        bool activeOnly = true)
    {
        try
        {
            var achievements = await achievementService.GetAllAchievementsAsync(activeOnly);
            return Results.Ok(ApiResponse<List<Achievement>>.Ok(achievements));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to get achievements: {ex.Message}"));
        }
    }

    private static async Task<IResult> CreateAchievement(
        CreateAchievementRequest request,
        IAchievementService achievementService)
    {
        try
        {
            var achievement = await achievementService.CreateAchievementAsync(request);
            return Results.Ok(ApiResponse<Achievement>.Ok(achievement));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to create achievement: {ex.Message}"));
        }
    }

    private static async Task<IResult> UpdateAchievement(
        string id,
        UpdateAchievementRequest request,
        IAchievementService achievementService)
    {
        try
        {
            var achievement = await achievementService.UpdateAchievementAsync(id, request);
            return Results.Ok(ApiResponse<Achievement>.Ok(achievement));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to update achievement: {ex.Message}"));
        }
    }

    private static async Task<IResult> DeleteAchievement(
        string id,
        IAchievementService achievementService)
    {
        try
        {
            await achievementService.DeleteAchievementAsync(id);
            return Results.Ok(ApiResponse.Ok("Achievement deleted successfully"));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to delete achievement: {ex.Message}"));
        }
    }

    // Member endpoints

    private static async Task<IResult> GetMyAchievements(
        ClaimsPrincipal user,
        IAchievementService achievementService)
    {
        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(uid))
        {
            return Results.Unauthorized();
        }

        try
        {
            var achievements = await achievementService.GetUserAchievementsAsync(uid);
            return Results.Ok(ApiResponse<List<AchievementDto>>.Ok(achievements));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to get user achievements: {ex.Message}"));
        }
    }

    private static async Task<IResult> ClaimAchievementReward(
        string id,
        ClaimsPrincipal user,
        IAchievementService achievementService)
    {
        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(uid))
        {
            return Results.Unauthorized();
        }

        try
        {
            var achievement = await achievementService.ClaimAchievementRewardAsync(uid, id);
            return Results.Ok(ApiResponse<AchievementDto>.Ok(achievement));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to claim achievement reward: {ex.Message}"));
        }
    }
}
