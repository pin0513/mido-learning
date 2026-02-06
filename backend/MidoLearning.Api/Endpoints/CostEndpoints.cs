using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class CostEndpoints
{
    public static void MapCostEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin/costs")
            .WithTags("GCP Costs")
            .RequireAuthorization("AdminOnly");

        group.MapGet("/summary", GetCostSummary)
            .WithName("GetCostSummary")
            .WithOpenApi();

        group.MapGet("/breakdown", GetServiceBreakdown)
            .WithName("GetServiceBreakdown")
            .WithOpenApi();

        group.MapGet("/history", GetCostHistory)
            .WithName("GetCostHistory")
            .WithOpenApi();
    }

    private static async Task<IResult> GetCostSummary(
        IGcpCostService costService,
        ILogger<Program> logger)
    {
        try
        {
            var summary = await costService.GetCostSummaryAsync();
            return Results.Ok(ApiResponse<GcpCostSummary>.Ok(summary));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get GCP cost summary");
            return Results.BadRequest(ApiResponse.Fail($"Failed to get cost summary: {ex.Message}"));
        }
    }

    private static async Task<IResult> GetServiceBreakdown(
        IGcpCostService costService,
        ILogger<Program> logger)
    {
        try
        {
            var breakdown = await costService.GetServiceBreakdownAsync();
            return Results.Ok(ApiResponse<List<ServiceCostDetail>>.Ok(breakdown));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get GCP service breakdown");
            return Results.BadRequest(ApiResponse.Fail($"Failed to get service breakdown: {ex.Message}"));
        }
    }

    private static async Task<IResult> GetCostHistory(
        IGcpCostService costService,
        ILogger<Program> logger,
        int months = 6)
    {
        try
        {
            var history = await costService.GetCostHistoryAsync(months);
            return Results.Ok(ApiResponse<List<MonthlyCost>>.Ok(history));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get GCP cost history");
            return Results.BadRequest(ApiResponse.Fail($"Failed to get cost history: {ex.Message}"));
        }
    }
}
