using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class ComponentEndpoints
{
    private const string ComponentsCollection = "components";
    private const int DefaultPageSize = 12;
    private const int MaxPageSize = 100;

    // Valid visibility values
    private static readonly string[] ValidVisibilities = { "published", "login", "private" };

    public static void MapComponentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/components")
            .WithTags("Components");

        // Public endpoint - no auth required
        group.MapGet("/public", GetPublicComponents)
            .WithName("GetPublicComponents")
            .AllowAnonymous()
            .WithOpenApi();

        // Authenticated endpoints
        group.MapGet("/", GetComponents)
            .WithName("GetComponents")
            .RequireAuthorization()
            .WithOpenApi();

        group.MapGet("/{id}", GetComponentById)
            .WithName("GetComponentById")
            .AllowAnonymous()
            .WithOpenApi();

        group.MapPost("/", CreateComponent)
            .WithName("CreateComponent")
            .RequireAuthorization("TeacherOrAdmin")
            .WithOpenApi();

        group.MapPut("/{id}", UpdateComponent)
            .WithName("UpdateComponent")
            .RequireAuthorization("TeacherOrAdmin")
            .WithOpenApi();

        group.MapPut("/{id}/visibility", UpdateComponentVisibility)
            .WithName("UpdateComponentVisibility")
            .RequireAuthorization("TeacherOrAdmin")
            .WithOpenApi();

        group.MapDelete("/{id}", DeleteComponent)
            .WithName("DeleteComponent")
            .RequireAuthorization("TeacherOrAdmin")
            .WithOpenApi();

        group.MapGet("/my", GetMyComponents)
            .WithName("GetMyComponents")
            .RequireAuthorization("TeacherOrAdmin")
            .WithOpenApi();

        // Admin only endpoint
        group.MapGet("/all", GetAllComponents)
            .WithName("GetAllComponents")
            .RequireAuthorization("AdminOnly")
            .WithOpenApi();
    }

    /// <summary>
    /// Get public (published) components - no auth required
    /// </summary>
    private static async Task<IResult> GetPublicComponents(
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int page = 1,
        int limit = DefaultPageSize,
        string? category = null,
        string? tags = null,
        string sortBy = "createdAt",
        string sortOrder = "desc")
    {
        try
        {
            (page, limit) = NormalizePaginationParams(page, limit);

            var (components, total) = await firebaseService.GetDocumentsAsync<LearningComponent>(
                ComponentsCollection,
                page,
                limit,
                null,
                null);

            // Filter to only published components
            var filteredComponents = components.Where(c => c.Visibility == "published");

            // Apply category filter
            if (!string.IsNullOrEmpty(category))
            {
                filteredComponents = filteredComponents.Where(c =>
                    c.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            }

            // Apply tags filter
            if (!string.IsNullOrEmpty(tags))
            {
                var tagList = tags.Split(',').Select(t => t.Trim().ToLowerInvariant()).ToArray();
                filteredComponents = filteredComponents.Where(c =>
                    c.Tags.Any(t => tagList.Contains(t.ToLowerInvariant())));
            }

            // Apply sorting
            filteredComponents = ApplySorting(filteredComponents, sortBy, sortOrder);

            var componentList = filteredComponents.ToList();

            var response = ApiResponse<ComponentListResponse>.Ok(new ComponentListResponse
            {
                Components = componentList,
                Total = componentList.Count,
                Page = page,
                Limit = limit
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get public components");
            return Results.Problem(
                detail: "Failed to retrieve components",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Get components for logged-in users (published + login visibility)
    /// </summary>
    private static async Task<IResult> GetComponents(
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int page = 1,
        int limit = DefaultPageSize,
        string? category = null,
        string? tags = null,
        string sortBy = "createdAt",
        string sortOrder = "desc")
    {
        try
        {
            (page, limit) = NormalizePaginationParams(page, limit);

            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.HasClaim("admin", "true");

            var (components, total) = await firebaseService.GetDocumentsAsync<LearningComponent>(
                ComponentsCollection,
                page,
                limit,
                null,
                null);

            // Filter based on visibility and ownership
            var filteredComponents = components.Where(c =>
                c.Visibility == "published" ||
                c.Visibility == "login" ||
                (c.Visibility == "private" && c.CreatedBy?.Uid == uid) ||
                isAdmin);

            // Apply category filter
            if (!string.IsNullOrEmpty(category))
            {
                filteredComponents = filteredComponents.Where(c =>
                    c.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            }

            // Apply tags filter
            if (!string.IsNullOrEmpty(tags))
            {
                var tagList = tags.Split(',').Select(t => t.Trim().ToLowerInvariant()).ToArray();
                filteredComponents = filteredComponents.Where(c =>
                    c.Tags.Any(t => tagList.Contains(t.ToLowerInvariant())));
            }

            // Apply sorting
            filteredComponents = ApplySorting(filteredComponents, sortBy, sortOrder);

            var componentList = filteredComponents.ToList();

            var response = ApiResponse<ComponentListResponse>.Ok(new ComponentListResponse
            {
                Components = componentList,
                Total = componentList.Count,
                Page = page,
                Limit = limit
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get components");
            return Results.Problem(
                detail: "Failed to retrieve components",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Get component by ID - checks visibility permissions
    /// </summary>
    private static async Task<IResult> GetComponentById(
        string id,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var component = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection,
                id);

            if (component is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            // Set the ID from the document ID
            var componentWithId = component with { Id = id };

            // Check visibility permissions
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAuthenticated = !string.IsNullOrEmpty(uid);
            var isAdmin = context.User.HasClaim("admin", "true");
            var isOwner = componentWithId.CreatedBy?.Uid == uid;

            var canAccess = componentWithId.Visibility switch
            {
                "published" => true,
                "login" => isAuthenticated,
                "private" => isOwner || isAdmin,
                _ => false
            };

            if (!canAccess)
            {
                return Results.Forbid();
            }

            var response = ApiResponse<LearningComponentDetail>.Ok(componentWithId);
            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get component {ComponentId}", id);
            return Results.Problem(
                detail: "Failed to retrieve component",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Get current user's components (teacher/admin)
    /// </summary>
    private static async Task<IResult> GetMyComponents(
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int page = 1,
        int limit = DefaultPageSize,
        string? category = null,
        string? visibility = null,
        string sortBy = "createdAt",
        string sortOrder = "desc")
    {
        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid))
            {
                return Results.Unauthorized();
            }

            (page, limit) = NormalizePaginationParams(page, limit);

            var (components, total) = await firebaseService.GetDocumentsAsync<LearningComponent>(
                ComponentsCollection,
                page,
                limit,
                null,
                null);

            // Filter by creator
            var myComponents = components.Where(c => c.CreatedBy?.Uid == uid);

            // Apply category filter
            if (!string.IsNullOrEmpty(category))
            {
                myComponents = myComponents.Where(c =>
                    c.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            }

            // Apply visibility filter
            if (!string.IsNullOrEmpty(visibility) && ValidVisibilities.Contains(visibility))
            {
                myComponents = myComponents.Where(c => c.Visibility == visibility);
            }

            // Apply sorting
            myComponents = ApplySorting(myComponents, sortBy, sortOrder);

            var componentList = myComponents.ToList();

            var response = ApiResponse<ComponentListResponse>.Ok(new ComponentListResponse
            {
                Components = componentList,
                Total = componentList.Count,
                Page = page,
                Limit = limit
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get my components");
            return Results.Problem(
                detail: "Failed to retrieve components",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Get all components (admin only)
    /// </summary>
    private static async Task<IResult> GetAllComponents(
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int page = 1,
        int limit = DefaultPageSize,
        string? category = null,
        string? visibility = null,
        string? createdBy = null,
        string sortBy = "createdAt",
        string sortOrder = "desc")
    {
        try
        {
            (page, limit) = NormalizePaginationParams(page, limit);

            var (components, total) = await firebaseService.GetDocumentsAsync<LearningComponent>(
                ComponentsCollection,
                page,
                limit,
                null,
                null);

            var filteredComponents = components.AsEnumerable();

            // Apply category filter
            if (!string.IsNullOrEmpty(category))
            {
                filteredComponents = filteredComponents.Where(c =>
                    c.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            }

            // Apply visibility filter
            if (!string.IsNullOrEmpty(visibility) && ValidVisibilities.Contains(visibility))
            {
                filteredComponents = filteredComponents.Where(c => c.Visibility == visibility);
            }

            // Apply createdBy filter
            if (!string.IsNullOrEmpty(createdBy))
            {
                filteredComponents = filteredComponents.Where(c => c.CreatedBy?.Uid == createdBy);
            }

            // Apply sorting
            filteredComponents = ApplySorting(filteredComponents, sortBy, sortOrder);

            var componentList = filteredComponents.ToList();

            var response = ApiResponse<ComponentListResponse>.Ok(new ComponentListResponse
            {
                Components = componentList,
                Total = componentList.Count,
                Page = page,
                Limit = limit
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get all components");
            return Results.Problem(
                detail: "Failed to retrieve components",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<IResult> CreateComponent(
        CreateComponentRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        var validationErrors = ValidateRequest(request);
        if (validationErrors.Count > 0)
        {
            return Results.BadRequest(ApiResponse.Fail("Validation failed", validationErrors));
        }

        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var displayName = context.User.FindFirstValue(ClaimTypes.Name) ?? "Unknown";

            var component = new LearningComponentDetail
            {
                Title = request.Title,
                Theme = request.Theme,
                Description = request.Description,
                Category = request.Category,
                Tags = request.Tags,
                Questions = request.Questions,
                Materials = Array.Empty<Material>(),
                Visibility = "private", // Default to private
                RatingAverage = 0,
                RatingCount = 0,
                CreatedBy = new CreatedByInfo
                {
                    Uid = uid,
                    DisplayName = displayName
                },
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var componentId = await firebaseService.AddDocumentAsync(ComponentsCollection, component);

            logger.LogInformation(
                "Component created with ID: {ComponentId} by user {UserId}",
                componentId,
                uid);

            var response = ApiResponse<CreateComponentResponse>.Ok(
                new CreateComponentResponse { Id = componentId });

            return Results.Created($"/api/components/{componentId}", response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create component");
            return Results.Problem(
                detail: "Failed to create component",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Update component - owner or admin only
    /// </summary>
    private static async Task<IResult> UpdateComponent(
        string id,
        UpdateComponentRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.HasClaim("admin", "true");

            // Get existing component
            var existing = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection,
                id);

            if (existing is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            // Check ownership
            var isOwner = existing.CreatedBy?.Uid == uid;
            if (!isOwner && !isAdmin)
            {
                return Results.Forbid();
            }

            // Build update object with only provided fields
            var updated = existing with
            {
                Title = request.Title ?? existing.Title,
                Theme = request.Theme ?? existing.Theme,
                Description = request.Description ?? existing.Description,
                Category = request.Category ?? existing.Category,
                Tags = request.Tags ?? existing.Tags,
                Questions = request.Questions ?? existing.Questions,
                UpdatedAt = DateTime.UtcNow
            };

            await firebaseService.UpdateDocumentAsync(ComponentsCollection, id, updated);

            logger.LogInformation(
                "Component {ComponentId} updated by user {UserId}",
                id,
                uid);

            var response = ApiResponse<LearningComponentDetail>.Ok(updated with { Id = id });
            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update component {ComponentId}", id);
            return Results.Problem(
                detail: "Failed to update component",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Update component visibility - owner or admin only
    /// </summary>
    private static async Task<IResult> UpdateComponentVisibility(
        string id,
        UpdateVisibilityRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        // Validate visibility value
        if (!ValidVisibilities.Contains(request.Visibility))
        {
            return Results.BadRequest(ApiResponse.Fail(
                "Invalid visibility value. Must be 'published', 'login', or 'private'"));
        }

        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.HasClaim("admin", "true");

            // Get existing component
            var existing = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection,
                id);

            if (existing is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            // Check ownership
            var isOwner = existing.CreatedBy?.Uid == uid;
            if (!isOwner && !isAdmin)
            {
                return Results.Forbid();
            }

            // Update visibility
            var updated = existing with
            {
                Visibility = request.Visibility,
                UpdatedAt = DateTime.UtcNow
            };

            await firebaseService.UpdateDocumentAsync(ComponentsCollection, id, updated);

            logger.LogInformation(
                "Component {ComponentId} visibility changed to {Visibility} by user {UserId}",
                id,
                request.Visibility,
                uid);

            var response = ApiResponse<LearningComponentDetail>.Ok(updated with { Id = id });
            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update component visibility {ComponentId}", id);
            return Results.Problem(
                detail: "Failed to update component visibility",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Delete component - owner or admin only
    /// </summary>
    private static async Task<IResult> DeleteComponent(
        string id,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.HasClaim("admin", "true");

            // Get existing component
            var existing = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection,
                id);

            if (existing is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            // Check ownership
            var isOwner = existing.CreatedBy?.Uid == uid;
            if (!isOwner && !isAdmin)
            {
                return Results.Forbid();
            }

            await firebaseService.DeleteDocumentAsync(ComponentsCollection, id);

            logger.LogInformation(
                "Component {ComponentId} deleted by user {UserId}",
                id,
                uid);

            return Results.NoContent();
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete component {ComponentId}", id);
            return Results.Problem(
                detail: "Failed to delete component",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static IEnumerable<LearningComponent> ApplySorting(
        IEnumerable<LearningComponent> components,
        string sortBy,
        string sortOrder)
    {
        var isDescending = sortOrder.Equals("desc", StringComparison.OrdinalIgnoreCase);

        return sortBy.ToLowerInvariant() switch
        {
            "ratingaverage" or "rating" => isDescending
                ? components.OrderByDescending(c => c.RatingAverage)
                : components.OrderBy(c => c.RatingAverage),
            "ratingcount" => isDescending
                ? components.OrderByDescending(c => c.RatingCount)
                : components.OrderBy(c => c.RatingCount),
            "title" => isDescending
                ? components.OrderByDescending(c => c.Title)
                : components.OrderBy(c => c.Title),
            _ => isDescending // Default to createdAt
                ? components.OrderByDescending(c => c.CreatedAt)
                : components.OrderBy(c => c.CreatedAt)
        };
    }

    private static List<string> ValidateRequest(CreateComponentRequest request)
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
}
