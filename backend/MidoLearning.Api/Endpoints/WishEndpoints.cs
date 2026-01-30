using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using Google.Cloud.Firestore;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class WishEndpoints
{
    private const string WishesCollection = "wishes";
    private const string ComponentsCollection = "components";
    private const int DefaultPageSize = 20;
    private const int MaxPageSize = 100;

    // Valid status transitions
    private static readonly Dictionary<string, HashSet<string>> ValidTransitions = new()
    {
        { "pending", new HashSet<string> { "processing", "deleted" } },
        { "processing", new HashSet<string> { "completed", "deleted" } }
    };

    public static void MapWishEndpoints(this IEndpointRouteBuilder app)
    {
        // Public endpoints
        var publicGroup = app.MapGroup("/api/wishes").WithTags("Wishes");

        publicGroup.MapPost("/", CreateWish)
            .WithName("CreateWish")
            .WithOpenApi();

        // Teacher endpoints (read-only)
        var teacherGroup = app.MapGroup("/api/wishes")
            .WithTags("Wishes")
            .RequireAuthorization("TeacherOrAdmin");

        teacherGroup.MapGet("/list", GetAdminWishes)
            .WithName("GetWishesList")
            .WithOpenApi();

        // Admin endpoints
        var adminGroup = app.MapGroup("/api/admin/wishes")
            .WithTags("Admin Wishes")
            .RequireAuthorization("AdminOnly");

        adminGroup.MapGet("/", GetAdminWishes)
            .WithName("GetAdminWishes")
            .WithOpenApi();

        adminGroup.MapGet("/stats", GetWishStats)
            .WithName("GetWishStats")
            .WithOpenApi();

        adminGroup.MapPatch("/{id}/status", UpdateWishStatus)
            .WithName("UpdateWishStatus")
            .WithOpenApi();

        adminGroup.MapPost("/{id}/create-component", CreateComponentFromWish)
            .WithName("CreateComponentFromWish")
            .WithOpenApi();
    }

    private static async Task<IResult> CreateWish(
        CreateWishRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        // Validate request
        var validationErrors = ValidateRequest(request);
        if (validationErrors.Count > 0)
        {
            return Results.BadRequest(ApiResponse.Fail("驗證失敗", validationErrors));
        }

        try
        {
            var ipAddress = GetClientIpAddress(context);
            var userAgent = context.Request.Headers.UserAgent.FirstOrDefault() ?? string.Empty;

            var wish = new Wish
            {
                Content = request.Content,
                Email = request.Email,
                Status = "pending",
                IpAddress = ipAddress,
                UserAgent = userAgent,
                CreatedAt = Timestamp.GetCurrentTimestamp()
            };

            var wishId = await firebaseService.AddDocumentAsync(WishesCollection, wish);

            logger.LogInformation(
                "Wish created with ID: {WishId}, IP: {IpAddress}",
                wishId,
                ipAddress);

            var response = ApiResponse<CreateWishResponse>.Ok(
                new CreateWishResponse { WishId = wishId },
                "願望已收到！");

            return Results.Created($"/api/wishes/{wishId}", response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create wish");
            return Results.Problem(
                detail: "無法儲存願望，請稍後再試",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static List<string> ValidateRequest(CreateWishRequest request)
    {
        var errors = new List<string>();
        var validationContext = new ValidationContext(request);
        var validationResults = new List<ValidationResult>();

        if (!Validator.TryValidateObject(request, validationContext, validationResults, validateAllProperties: true))
        {
            errors.AddRange(validationResults
                .Where(r => r.ErrorMessage is not null)
                .Select(r => r.ErrorMessage!));
        }

        return errors;
    }

    private static string GetClientIpAddress(HttpContext context)
    {
        // Check for forwarded headers (when behind a proxy/load balancer)
        var forwardedFor = context.Request.Headers["X-Forwarded-For"].FirstOrDefault();
        if (!string.IsNullOrEmpty(forwardedFor))
        {
            // X-Forwarded-For may contain multiple IPs, take the first one
            return forwardedFor.Split(',')[0].Trim();
        }

        var realIp = context.Request.Headers["X-Real-IP"].FirstOrDefault();
        if (!string.IsNullOrEmpty(realIp))
        {
            return realIp;
        }

        return context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
    }

    #region Admin Endpoints

    private static async Task<IResult> GetWishStats(
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var stats = await firebaseService.GetWishStatsAsync();

            var response = ApiResponse<WishStatsResponse>.Ok(new WishStatsResponse
            {
                TotalCount = stats.TotalCount,
                ByStatus = stats.ByStatus,
                WeeklyTrend = stats.WeeklyTrend,
                AvgProcessingTimeHours = stats.AvgProcessingTimeHours,
                CompletionRate = stats.CompletionRate
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get wish stats");
            return Results.BadRequest(ApiResponse.Fail($"Failed to get wish stats: {ex.Message}"));
        }
    }

    private static async Task<IResult> GetAdminWishes(
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int page = 1,
        int limit = DefaultPageSize,
        string? status = null,
        string? search = null)
    {
        try
        {
            (page, limit) = NormalizePaginationParams(page, limit);

            var result = await firebaseService.GetWishesAsync(page, limit, status, search);

            var response = ApiResponse<WishListResponse>.Ok(new WishListResponse
            {
                Wishes = result.Wishes,
                Total = result.Total,
                Page = page,
                Limit = limit
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get wishes");
            return Results.BadRequest(ApiResponse.Fail($"Failed to get wishes: {ex.Message}"));
        }
    }

    private static async Task<IResult> UpdateWishStatus(
        string id,
        UpdateWishStatusRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            // Get existing wish
            var wish = await firebaseService.GetDocumentAsync<Wish>(WishesCollection, id);
            if (wish is null)
            {
                return Results.NotFound(ApiResponse.Fail("願望不存在"));
            }

            // Validate status transition
            if (!IsValidStatusTransition(wish.Status, request.Status))
            {
                return Results.BadRequest(ApiResponse.Fail(
                    $"無效的狀態轉換: {wish.Status} -> {request.Status}"));
            }

            // Completed status requires linkedComponentId
            if (request.Status == "completed" && string.IsNullOrEmpty(request.LinkedComponentId))
            {
                return Results.BadRequest(ApiResponse.Fail(
                    "完成狀態需要提供 linkedComponentId"));
            }

            var adminUid = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

            await firebaseService.UpdateWishStatusAsync(
                id,
                request.Status,
                request.LinkedComponentId,
                adminUid);

            logger.LogInformation(
                "Wish {WishId} status updated to {Status} by {AdminUid}",
                id,
                request.Status,
                adminUid);

            return Results.Ok(ApiResponse.Ok("願望狀態已更新"));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update wish status for {WishId}", id);
            return Results.BadRequest(ApiResponse.Fail($"Failed to update wish status: {ex.Message}"));
        }
    }

    private static async Task<IResult> CreateComponentFromWish(
        string id,
        CreateComponentFromWishRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        // Validate request
        var validationErrors = ValidateComponentRequest(request);
        if (validationErrors.Count > 0)
        {
            return Results.BadRequest(ApiResponse.Fail("驗證失敗", validationErrors));
        }

        try
        {
            // Get existing wish
            var wish = await firebaseService.GetDocumentAsync<Wish>(WishesCollection, id);
            if (wish is null)
            {
                return Results.NotFound(ApiResponse.Fail("願望不存在"));
            }

            // Only pending wishes can have components created
            if (wish.Status != "pending")
            {
                return Results.BadRequest(ApiResponse.Fail(
                    $"只有 pending 狀態的願望可以建立學習元件，目前狀態: {wish.Status}"));
            }

            var adminUid = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var displayName = context.User.FindFirstValue(ClaimTypes.Name) ?? "Admin";

            // Create component
            var component = new LearningComponentDetail
            {
                Title = request.Title,
                Theme = request.Theme,
                Description = request.Description,
                Category = request.Category,
                Tags = request.Tags,
                Questions = request.Questions,
                Materials = Array.Empty<Material>(),
                CreatedBy = new CreatedByInfo
                {
                    Uid = adminUid,
                    DisplayName = displayName
                },
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var componentId = await firebaseService.AddDocumentAsync(ComponentsCollection, component);

            // Update wish status to completed
            await firebaseService.UpdateWishStatusAsync(id, "completed", componentId, adminUid);

            logger.LogInformation(
                "Component {ComponentId} created from wish {WishId} by {AdminUid}",
                componentId,
                id,
                adminUid);

            var response = ApiResponse<CreateComponentFromWishResponse>.Ok(
                new CreateComponentFromWishResponse
                {
                    ComponentId = componentId,
                    WishId = id
                },
                "學習元件已建立，願望已完成");

            return Results.Created($"/api/components/{componentId}", response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create component from wish {WishId}", id);
            return Results.BadRequest(ApiResponse.Fail($"Failed to create component: {ex.Message}"));
        }
    }

    private static bool IsValidStatusTransition(string currentStatus, string newStatus)
    {
        if (currentStatus == newStatus)
        {
            return false;
        }

        if (!ValidTransitions.TryGetValue(currentStatus, out var allowedTransitions))
        {
            return false;
        }

        return allowedTransitions.Contains(newStatus);
    }

    private static List<string> ValidateComponentRequest(CreateComponentFromWishRequest request)
    {
        var errors = new List<string>();
        var validationContext = new ValidationContext(request);
        var validationResults = new List<ValidationResult>();

        if (!Validator.TryValidateObject(request, validationContext, validationResults, validateAllProperties: true))
        {
            errors.AddRange(validationResults
                .Where(r => r.ErrorMessage is not null)
                .Select(r => r.ErrorMessage!));
        }

        return errors;
    }

    private static (int page, int limit) NormalizePaginationParams(int page, int limit)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = DefaultPageSize;
        if (limit > MaxPageSize) limit = MaxPageSize;
        return (page, limit);
    }

    #endregion
}
