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

        // Get visitor stats - admin only
        group.MapGet("/visitors", GetVisitorStats)
            .WithName("GetVisitorStats")
            .RequireAuthorization("AdminOnly")
            .WithOpenApi();

        // Get recent visits - admin only
        group.MapGet("/recent", GetRecentVisits)
            .WithName("GetRecentVisits")
            .RequireAuthorization("AdminOnly")
            .WithOpenApi();
    }

    private static string GetClientIp(HttpContext context)
    {
        // Check X-Forwarded-For header (for proxies like Cloud Run)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            return forwardedFor.Split(',')[0].Trim();
        }

        // Check X-Real-IP
        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        // Fall back to RemoteIpAddress
        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
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
            var clientIp = GetClientIp(httpContext);

            await firebaseService.IncrementCounterAsync("analytics", docId, "count");

            // Also increment total
            await firebaseService.IncrementCounterAsync("analytics", "total_pageviews", "count");

            // Record visit with IP
            await firebaseService.RecordVisitAsync("homepage", null, clientIp);

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
        HttpContext httpContext,
        ILogger<Program> logger)
    {
        try
        {
            var today = DateTime.UtcNow.ToString("yyyy-MM-dd");
            var clientIp = GetClientIp(httpContext);

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

            // Record visit with IP
            await firebaseService.RecordVisitAsync("material", componentId, clientIp);

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

    private static async Task<IResult> GetVisitorStats(
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var stats = await firebaseService.GetVisitorStatsAsync();
            return Results.Ok(ApiResponse<VisitorStatsResponse>.Ok(stats));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get visitor stats");
            return Results.BadRequest(ApiResponse.Fail($"Failed to get visitor stats: {ex.Message}"));
        }
    }

    private static async Task<IResult> GetRecentVisits(
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int limit = 50)
    {
        try
        {
            var visits = await firebaseService.GetRecentVisitsAsync(limit);
            return Results.Ok(ApiResponse<List<VisitRecord>>.Ok(visits));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get recent visits");
            return Results.BadRequest(ApiResponse.Fail($"Failed to get recent visits: {ex.Message}"));
        }
    }
}
