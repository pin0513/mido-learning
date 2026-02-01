using MidoLearning.Api.Models;
using MidoLearning.Api.Services;
using static MidoLearning.Api.Services.IFirebaseService;

namespace MidoLearning.Api.Endpoints;

public static class AnalyticsEndpoints
{
    public static void MapAnalyticsEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/analytics")
            .WithTags("Analytics");

        // Record page view - anonymous access allowed
        group.MapPost("/pageview", RecordPageView)
            .WithName("RecordPageView")
            .AllowAnonymous()
            .WithOpenApi();

        // Record material view - anonymous access allowed
        group.MapPost("/material/{componentId}", RecordMaterialView)
            .WithName("RecordMaterialView")
            .AllowAnonymous()
            .WithOpenApi();

        // Get stats - admin only
        group.MapGet("/stats", GetAnalyticsStats)
            .WithName("GetAnalyticsStats")
            .RequireAuthorization("AdminOnly")
            .WithOpenApi();

        // Get material stats - admin only
        group.MapGet("/materials", GetMaterialStats)
            .WithName("GetMaterialStats")
            .RequireAuthorization("AdminOnly")
            .WithOpenApi();
    }

    private static async Task<IResult> RecordPageView(
        IFirebaseService firebaseService,
        HttpContext httpContext,
        ILogger<Program> logger)
    {
        try
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var docId = $"pageviews_{today}";

            await firebaseService.IncrementCounterAsync("analytics", docId, "count");

            // Also increment total
            await firebaseService.IncrementCounterAsync("analytics", "total_pageviews", "count");

            return Results.Ok(ApiResponse.Ok("recorded"));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to record page view");
            // Don't fail the request for analytics errors
            return Results.Ok(ApiResponse.Ok("skipped"));
        }
    }

    private static async Task<IResult> RecordMaterialView(
        string componentId,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

            // Increment component view count
            await firebaseService.IncrementCounterAsync(
                "analytics_materials",
                componentId,
                "viewCount");

            // Record daily view
            await firebaseService.IncrementCounterAsync(
                "analytics_materials",
                $"{componentId}_{today}",
                "count");

            return Results.Ok(ApiResponse.Ok("recorded"));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to record material view for {ComponentId}", componentId);
            return Results.Ok(ApiResponse.Ok("skipped"));
        }
    }

    private static async Task<IResult> GetAnalyticsStats(
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var stats = await firebaseService.GetAnalyticsStatsAsync();
            return Results.Ok(ApiResponse<AnalyticsStatsResponse>.Ok(stats));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get analytics stats");
            return Results.BadRequest(ApiResponse.Fail($"Failed to get stats: {ex.Message}"));
        }
    }

    private static async Task<IResult> GetMaterialStats(
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int limit = 20)
    {
        try
        {
            var stats = await firebaseService.GetMaterialStatsAsync(limit);
            return Results.Ok(ApiResponse<List<MaterialStatsItem>>.Ok(stats));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get material stats");
            return Results.BadRequest(ApiResponse.Fail($"Failed to get material stats: {ex.Message}"));
        }
    }
}
