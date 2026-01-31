using System.Security.Claims;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class CategoryEndpoints
{
    private const string ComponentsCollection = "components";
    private const int DefaultPageSize = 12;
    private const int MaxPageSize = 100;

    // Available categories
    private static readonly CategoryInfo[] Categories =
    {
        new("adult", "Adult Learning", "Advanced courses for adult learners"),
        new("kid", "Kids Learning", "Fun and engaging courses for children"),
        new("Programming", "Programming", "Learn to code with various programming languages"),
        new("Language", "Language", "Master new languages from around the world"),
        new("Science", "Science", "Explore the wonders of natural sciences"),
        new("Art", "Art", "Express yourself through creative arts")
    };

    public static void MapCategoryEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/categories")
            .WithTags("Categories");

        group.MapGet("/", GetCategories)
            .WithName("GetCategories")
            .AllowAnonymous()
            .WithOpenApi();

        group.MapGet("/{category}/components", GetCategoryComponents)
            .WithName("GetCategoryComponents")
            .AllowAnonymous()
            .WithOpenApi();
    }

    /// <summary>
    /// Get all available categories
    /// </summary>
    private static IResult GetCategories()
    {
        var response = ApiResponse<CategoryListResponse>.Ok(new CategoryListResponse
        {
            Categories = Categories
        });

        return Results.Ok(response);
    }

    /// <summary>
    /// Get components for a specific category
    /// </summary>
    private static async Task<IResult> GetCategoryComponents(
        string category,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int page = 1,
        int limit = DefaultPageSize,
        string? tags = null,
        string sortBy = "createdAt",
        string sortOrder = "desc")
    {
        try
        {
            // Validate category
            if (!Categories.Any(c => c.Id.Equals(category, StringComparison.OrdinalIgnoreCase)))
            {
                return Results.NotFound(ApiResponse.Fail($"Category '{category}' not found"));
            }

            (page, limit) = NormalizePaginationParams(page, limit);

            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAuthenticated = !string.IsNullOrEmpty(uid);
            var isAdmin = context.User.HasClaim("admin", "true");

            var (components, total) = await firebaseService.GetDocumentsAsync<LearningComponent>(
                ComponentsCollection,
                page,
                limit,
                null,
                null);

            // Filter by category
            var filteredComponents = components.Where(c =>
                c.Category.Equals(category, StringComparison.OrdinalIgnoreCase));

            // Filter based on visibility
            if (isAdmin)
            {
                // Admin sees all
            }
            else if (isAuthenticated)
            {
                // Logged-in users see published + login + their own private
                filteredComponents = filteredComponents.Where(c =>
                    c.Visibility == "published" ||
                    c.Visibility == "login" ||
                    (c.Visibility == "private" && c.CreatedBy?.Uid == uid));
            }
            else
            {
                // Anonymous users see only published
                filteredComponents = filteredComponents.Where(c => c.Visibility == "published");
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
            logger.LogError(ex, "Failed to get components for category {Category}", category);
            return Results.Problem(
                detail: "Failed to retrieve components",
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
            _ => isDescending
                ? components.OrderByDescending(c => c.CreatedAt)
                : components.OrderBy(c => c.CreatedAt)
        };
    }

    private static (int page, int limit) NormalizePaginationParams(int page, int limit)
    {
        if (page < 1) page = 1;
        if (limit < 1) limit = DefaultPageSize;
        if (limit > MaxPageSize) limit = MaxPageSize;
        return (page, limit);
    }
}

/// <summary>
/// Category information
/// </summary>
public record CategoryInfo(string Id, string Name, string Description);

/// <summary>
/// Response DTO for category list
/// </summary>
public record CategoryListResponse
{
    public IEnumerable<CategoryInfo> Categories { get; init; } = Array.Empty<CategoryInfo>();
}
