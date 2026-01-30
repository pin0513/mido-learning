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

    public static void MapComponentEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/components")
            .WithTags("Components")
            .RequireAuthorization();

        group.MapGet("/", GetComponents)
            .WithName("GetComponents")
            .WithOpenApi();

        group.MapGet("/{id}", GetComponentById)
            .WithName("GetComponentById")
            .WithOpenApi();

        group.MapPost("/", CreateComponent)
            .WithName("CreateComponent")
            .RequireAuthorization("TeacherOrAdmin")
            .WithOpenApi();
    }

    private static async Task<IResult> GetComponents(
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int page = 1,
        int limit = DefaultPageSize,
        string? category = null,
        string? tags = null)
    {
        try
        {
            (page, limit) = NormalizePaginationParams(page, limit);

            var (components, total) = await firebaseService.GetDocumentsAsync<LearningComponent>(
                ComponentsCollection,
                page,
                limit,
                category,
                null);

            // Apply category filter if provided (in case Firestore query doesn't support it)
            var filteredComponents = components.AsEnumerable();
            if (!string.IsNullOrEmpty(category))
            {
                filteredComponents = filteredComponents.Where(c =>
                    c.Category.Equals(category, StringComparison.OrdinalIgnoreCase));
            }

            // Apply tags filter if provided
            if (!string.IsNullOrEmpty(tags))
            {
                var tagList = tags.Split(',').Select(t => t.Trim().ToLowerInvariant()).ToArray();
                filteredComponents = filteredComponents.Where(c =>
                    c.Tags.Any(t => tagList.Contains(t.ToLowerInvariant())));
            }

            var response = ApiResponse<ComponentListResponse>.Ok(new ComponentListResponse
            {
                Components = filteredComponents,
                Total = total,
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

    private static async Task<IResult> GetComponentById(
        string id,
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

    private static async Task<IResult> CreateComponent(
        CreateComponentRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        // Validate request
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
