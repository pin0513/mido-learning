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
        // Public endpoint - no auth required (outside group to avoid any auth inheritance)
        app.MapGet("/api/components/public", GetPublicComponents)
            .WithName("GetPublicComponents")
            .WithTags("Components")
            .AllowAnonymous()
            .WithOpenApi();

        var group = app.MapGroup("/api/components")
            .WithTags("Components");

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

        group.MapPut("/{id}/order", UpdateComponentOrder)
            .WithName("UpdateComponentOrder")
            .RequireAuthorization("TeacherOrAdmin")
            .WithOpenApi();

        group.MapPut("/reorder", ReorderComponents)
            .WithName("ReorderComponents")
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

        // Series: list children of a hub component (anonymous, visibility-filtered per child)
        group.MapGet("/{id}/children", GetComponentChildren)
            .WithName("GetComponentChildren")
            .AllowAnonymous()
            .WithOpenApi();

        // Series: reorder children within a hub (owner or admin)
        group.MapPut("/{id}/children/order", ReorderComponentChildren)
            .WithName("ReorderComponentChildren")
            .RequireAuthorization("TeacherOrAdmin")
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
        string? search = null,
        string sortBy = "createdAt",
        string sortOrder = "desc")
    {
        try
        {
            (page, limit) = NormalizePaginationParams(page, limit);

            // Fetch all components first, then filter and paginate in memory
            // This ensures filters work correctly before pagination
            var (components, _) = await firebaseService.GetDocumentsAsync<LearningComponent>(
                ComponentsCollection,
                1,
                1000, // Fetch all (reasonable upper limit)
                null,
                null);

            // Filter to only published components
            // For backward compatibility, treat null/empty visibility as "published" (legacy documents)
            var filteredComponents = components.Where(c =>
                c.Visibility == "published" || c.Visibility is null || c.Visibility == "");

            // Apply search filter
            if (!string.IsNullOrEmpty(search))
            {
                var searchTerm = search.Trim().ToLowerInvariant();
                filteredComponents = filteredComponents.Where(c =>
                    (c.Title?.ToLowerInvariant().Contains(searchTerm) ?? false) ||
                    (c.Description?.ToLowerInvariant().Contains(searchTerm) ?? false) ||
                    (c.Theme?.ToLowerInvariant().Contains(searchTerm) ?? false) ||
                    (c.Category?.ToLowerInvariant().Contains(searchTerm) ?? false) ||
                    c.Tags.Any(t => t.ToLowerInvariant().Contains(searchTerm)));
            }

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

            // Get total count before pagination
            var allFiltered = filteredComponents.ToList();
            var totalCount = allFiltered.Count;

            // Apply pagination
            var componentList = allFiltered
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToList();

            var response = ApiResponse<ComponentListResponse>.Ok(new ComponentListResponse
            {
                Components = componentList,
                Total = totalCount,
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
            // For backward compatibility, treat null/empty visibility as accessible to logged-in users
            var filteredComponents = components.Where(c =>
                c.Visibility is null ||
                c.Visibility == "" ||
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

            // For backward compatibility, treat null/empty as "published" (legacy documents)
            var canAccess = componentWithId.Visibility switch
            {
                null or "" or "published" => true, // Backward compatibility: legacy documents are public
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
    /// Admin sees all components, teacher sees only their own
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

            var isAdmin = context.User.IsInRole("admin");

            (page, limit) = NormalizePaginationParams(page, limit);

            // Fetch all components first (similar to GetPublicComponents)
            // This ensures filtering works correctly before pagination
            var (components, _) = await firebaseService.GetDocumentsAsync<LearningComponent>(
                ComponentsCollection,
                1,
                1000, // Fetch all (reasonable upper limit)
                null,
                null);

            // Admin sees all components, teacher sees only their own
            var myComponents = isAdmin
                ? components.AsEnumerable()
                : components.Where(c => c.CreatedBy?.Uid == uid);

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

            // Get total count before pagination
            var allFiltered = myComponents.ToList();
            var totalCount = allFiltered.Count;

            // Apply pagination
            var componentList = allFiltered
                .Skip((page - 1) * limit)
                .Take(limit)
                .ToList();

            var response = ApiResponse<ComponentListResponse>.Ok(new ComponentListResponse
            {
                Components = componentList,
                Total = totalCount,
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

        // Series validation: if ParentComponentId provided, parent must exist and itself be a root.
        if (!string.IsNullOrEmpty(request.ParentComponentId))
        {
            var parentError = await ValidateParentReferenceAsync(
                firebaseService, request.ParentComponentId, currentComponentId: null);
            if (parentError is not null) return parentError;
        }

        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;
            var displayName = context.User.FindFirstValue(ClaimTypes.Name) ?? "Unknown";

            var component = new LearningComponentDetail
            {
                Title = request.Title,
                Theme = request.Theme,
                Description = request.Description ?? string.Empty,
                Category = request.Category,
                Tags = request.Tags,
                Questions = request.Questions,
                Materials = Array.Empty<Material>(),
                Visibility = "private", // Default to private
                LayoutMode = request.LayoutMode ?? "fixed",
                DisplayOrder = request.DisplayOrder ?? 0,
                RatingAverage = 0,
                RatingCount = 0,
                ParentComponentId = string.IsNullOrEmpty(request.ParentComponentId) ? null : request.ParentComponentId,
                OrderInSeries = request.OrderInSeries,
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

            // === Series: resolve new parent ===
            // request.ParentComponentId semantics:
            //   null         → field not provided → keep existing
            //   ""           → explicit clear   → set to null
            //   "abc"        → set to "abc" (validated below)
            string? newParentId;
            if (request.ParentComponentId is null)
            {
                newParentId = existing.ParentComponentId;
            }
            else if (request.ParentComponentId == string.Empty)
            {
                newParentId = null;
            }
            else
            {
                newParentId = request.ParentComponentId;
            }

            // Validate parent change only if it's actually changing to a non-null value
            if (newParentId != existing.ParentComponentId && !string.IsNullOrEmpty(newParentId))
            {
                var parentError = await ValidateParentReferenceAsync(
                    firebaseService, newParentId, currentComponentId: id);
                if (parentError is not null) return parentError;

                // 1-level limit also applies: if this component currently has children,
                // it can't itself become a child (would create 2-level nesting).
                var hasChildren = await ComponentHasChildrenAsync(firebaseService, id);
                if (hasChildren)
                {
                    return Results.BadRequest(ApiResponse.Fail(
                        "This component already has children, so it cannot itself become a child."));
                }
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
                LayoutMode = request.LayoutMode ?? existing.LayoutMode,
                DisplayOrder = request.DisplayOrder ?? existing.DisplayOrder,
                ParentComponentId = newParentId,
                OrderInSeries = request.OrderInSeries ?? existing.OrderInSeries,
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

            // Series: prevent deleting a hub that still has children.
            // Caller must detach or delete children first.
            var hasChildren = await ComponentHasChildrenAsync(firebaseService, id);
            if (hasChildren)
            {
                return Results.Conflict(ApiResponse.Fail(
                    "This component has children. Remove or detach them first before deleting."));
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

    /// <summary>
    /// Update display order of a single component - owner or admin only
    /// </summary>
    private static async Task<IResult> UpdateComponentOrder(
        string id,
        UpdateDisplayOrderRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.HasClaim("admin", "true");

            var existing = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection,
                id);

            if (existing is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            var isOwner = existing.CreatedBy?.Uid == uid;
            if (!isOwner && !isAdmin)
            {
                return Results.Forbid();
            }

            await firebaseService.UpdateFieldsAsync(ComponentsCollection, id, new Dictionary<string, object>
            {
                { "DisplayOrder", request.DisplayOrder },
                { "UpdatedAt", DateTime.UtcNow }
            });

            logger.LogInformation(
                "Component {ComponentId} display order updated to {DisplayOrder} by user {UserId}",
                id,
                request.DisplayOrder,
                uid);

            var response = ApiResponse.Ok("Display order updated");
            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update component order {ComponentId}", id);
            return Results.Problem(
                detail: "Failed to update component order",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Batch reorder components - teacher or admin only
    /// </summary>
    private static async Task<IResult> ReorderComponents(
        ReorderComponentsRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        if (request.Items.Length == 0)
        {
            return Results.BadRequest(ApiResponse.Fail("Items array cannot be empty"));
        }

        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.HasClaim("admin", "true");

            var updatedAt = DateTime.UtcNow;

            foreach (var item in request.Items)
            {
                if (string.IsNullOrEmpty(item.Id))
                {
                    continue;
                }

                // Verify the component exists and user has permission
                var existing = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                    ComponentsCollection,
                    item.Id);

                if (existing is null)
                {
                    continue; // Skip missing components
                }

                var isOwner = existing.CreatedBy?.Uid == uid;
                if (!isOwner && !isAdmin)
                {
                    continue; // Skip components user doesn't own
                }

                await firebaseService.UpdateFieldsAsync(ComponentsCollection, item.Id, new Dictionary<string, object>
                {
                    { "DisplayOrder", item.DisplayOrder },
                    { "UpdatedAt", updatedAt }
                });
            }

            logger.LogInformation(
                "Batch reorder of {Count} components by user {UserId}",
                request.Items.Length,
                uid);

            var response = ApiResponse.Ok("Components reordered successfully");
            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to reorder components");
            return Results.Problem(
                detail: "Failed to reorder components",
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
            "displayorder" => isDescending
                ? components.OrderByDescending(c => c.DisplayOrder).ThenByDescending(c => c.CreatedAt)
                : components.OrderBy(c => c.DisplayOrder).ThenBy(c => c.CreatedAt),
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

    // ===== Series (hub-children) endpoints =====

    /// <summary>
    /// GET /api/components/{id}/children
    /// Lists the children of a hub component, sorted by OrderInSeries then CreatedAt.
    /// Anonymous-accessible; each child is filtered against the caller's permission
    /// using its own Visibility (mirrors GetComponentById logic).
    /// </summary>
    private static async Task<IResult> GetComponentChildren(
        string id,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var parent = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection, id);
            if (parent is null)
            {
                return Results.NotFound(ApiResponse.Fail("Parent component not found"));
            }

            // Apply parent's visibility check first
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAuthenticated = !string.IsNullOrEmpty(uid);
            var isAdmin = context.User.HasClaim("admin", "true");
            var parentVisible = parent.Visibility switch
            {
                null or "" or "published" => true,
                "login" => isAuthenticated,
                "private" => parent.CreatedBy?.Uid == uid || isAdmin,
                _ => false
            };
            if (!parentVisible) return Results.Forbid();

            // Fetch all components and filter to children of this id
            var (all, _) = await firebaseService.GetDocumentsAsync<LearningComponent>(
                ComponentsCollection, 1, 1000, null, null);

            var children = all
                .Where(c => c.ParentComponentId == id)
                .Where(c =>
                {
                    var isOwner = c.CreatedBy?.Uid == uid;
                    return c.Visibility switch
                    {
                        null or "" or "published" => true,
                        "login" => isAuthenticated,
                        "private" => isOwner || isAdmin,
                        _ => false
                    };
                })
                .OrderBy(c => c.OrderInSeries ?? int.MaxValue)
                .ThenBy(c => c.CreatedAt)
                .ToList();

            var response = ApiResponse<ComponentChildrenResponse>.Ok(new ComponentChildrenResponse
            {
                Parent = new ComponentParentSummary { Id = id, Title = parent.Title },
                Children = children
            });
            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get children for component {ComponentId}", id);
            return Results.Problem(
                detail: "Failed to retrieve children",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// PUT /api/components/{id}/children/order
    /// Batch updates OrderInSeries for children belonging to the given parent.
    /// Caller must be the parent's owner or an admin. Items referencing a child
    /// whose ParentComponentId != id are silently skipped.
    /// </summary>
    private static async Task<IResult> ReorderComponentChildren(
        string id,
        ReorderChildrenRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        if (request.Items.Length == 0)
        {
            return Results.BadRequest(ApiResponse.Fail("Items array cannot be empty"));
        }

        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.HasClaim("admin", "true");

            var parent = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection, id);
            if (parent is null)
            {
                return Results.NotFound(ApiResponse.Fail("Parent component not found"));
            }

            var isOwner = parent.CreatedBy?.Uid == uid;
            if (!isOwner && !isAdmin) return Results.Forbid();

            var skipped = new List<string>();
            var updated = 0;
            foreach (var item in request.Items)
            {
                if (string.IsNullOrEmpty(item.Id))
                {
                    skipped.Add(item.Id);
                    continue;
                }
                var child = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                    ComponentsCollection, item.Id);
                if (child is null || child.ParentComponentId != id)
                {
                    skipped.Add(item.Id);
                    continue;
                }
                await firebaseService.UpdateFieldsAsync(ComponentsCollection, item.Id,
                    new Dictionary<string, object>
                    {
                        { "OrderInSeries", item.OrderInSeries },
                        { "UpdatedAt", DateTime.UtcNow }
                    });
                updated++;
            }

            logger.LogInformation(
                "Reordered {Count} children of {ParentId} by user {Uid} (skipped {Skipped})",
                updated, id, uid, skipped.Count);

            return Results.Ok(ApiResponse<object>.Ok(new { updated, skipped }));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to reorder children for {ParentId}", id);
            return Results.Problem(
                detail: "Failed to reorder children",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Validates that a parent reference is valid:
    ///  - parent exists
    ///  - parent is itself a root (no grandparent → 1-level nesting limit)
    ///  - parent is not the current component (no self-reference)
    /// Returns an IResult with a 400 error if invalid; null if valid.
    /// </summary>
    private static async Task<IResult?> ValidateParentReferenceAsync(
        IFirebaseService firebaseService,
        string parentId,
        string? currentComponentId)
    {
        if (currentComponentId is not null && parentId == currentComponentId)
        {
            return Results.BadRequest(ApiResponse.Fail("A component cannot be its own parent."));
        }
        var parent = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
            ComponentsCollection, parentId);
        if (parent is null)
        {
            return Results.BadRequest(ApiResponse.Fail($"Parent component '{parentId}' not found."));
        }
        if (!string.IsNullOrEmpty(parent.ParentComponentId))
        {
            return Results.BadRequest(ApiResponse.Fail(
                "Parent component is itself a child; only one level of nesting is allowed."));
        }
        return null;
    }

    /// <summary>
    /// Returns true if any component references the given id as its parent.
    /// </summary>
    private static async Task<bool> ComponentHasChildrenAsync(
        IFirebaseService firebaseService,
        string componentId)
    {
        var (all, _) = await firebaseService.GetDocumentsAsync<LearningComponent>(
            ComponentsCollection, 1, 1000, null, null);
        return all.Any(c => c.ParentComponentId == componentId);
    }
}
