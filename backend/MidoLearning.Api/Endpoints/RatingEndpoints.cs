using System.ComponentModel.DataAnnotations;
using System.Security.Claims;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class RatingEndpoints
{
    private const string RatingsCollection = "ratings";
    private const string ComponentsCollection = "components";

    public static void MapRatingEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/components/{componentId}/ratings")
            .WithTags("Ratings")
            .RequireAuthorization();

        group.MapGet("/", GetComponentRatings)
            .WithName("GetComponentRatings")
            .WithOpenApi();

        group.MapGet("/my", GetMyRating)
            .WithName("GetMyRating")
            .WithOpenApi();

        group.MapPost("/", CreateRating)
            .WithName("CreateRating")
            .WithOpenApi();

        group.MapPut("/my", UpdateMyRating)
            .WithName("UpdateMyRating")
            .WithOpenApi();
    }

    /// <summary>
    /// Get all ratings for a component with statistics
    /// </summary>
    private static async Task<IResult> GetComponentRatings(
        string componentId,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            // Verify component exists
            var component = await firebaseService.GetDocumentAsync<LearningComponent>(
                ComponentsCollection,
                componentId);

            if (component is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            // Get all ratings for this component
            var (ratings, total) = await firebaseService.GetDocumentsAsync<ComponentRating>(
                RatingsCollection,
                1,
                1000, // Get all ratings
                null,
                null);

            var componentRatings = ratings
                .Where(r => r.ComponentId == componentId)
                .ToList();

            // Calculate distribution (1-5 stars)
            var distribution = new int[5];
            foreach (var rating in componentRatings)
            {
                if (rating.Score >= 1 && rating.Score <= 5)
                {
                    distribution[rating.Score - 1]++;
                }
            }

            var average = componentRatings.Count > 0
                ? componentRatings.Average(r => r.Score)
                : 0;

            var response = ApiResponse<RatingListResponse>.Ok(new RatingListResponse
            {
                Ratings = componentRatings.Select(r => new RatingResponse
                {
                    Id = r.Id,
                    ComponentId = r.ComponentId,
                    UserId = r.UserId,
                    Score = r.Score,
                    CreatedAt = r.CreatedAt,
                    UpdatedAt = r.UpdatedAt
                }),
                Average = Math.Round(average, 2),
                Total = componentRatings.Count,
                Distribution = distribution
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get ratings for component {ComponentId}", componentId);
            return Results.Problem(
                detail: "Failed to retrieve ratings",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Get current user's rating for a component
    /// </summary>
    private static async Task<IResult> GetMyRating(
        string componentId,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid))
            {
                return Results.Unauthorized();
            }

            // Get all ratings and find user's rating
            var (ratings, _) = await firebaseService.GetDocumentsAsync<ComponentRating>(
                RatingsCollection,
                1,
                1000,
                null,
                null);

            var userRating = ratings.FirstOrDefault(r =>
                r.ComponentId == componentId && r.UserId == uid);

            var response = ApiResponse<UserRatingResponse>.Ok(new UserRatingResponse
            {
                Score = userRating?.Score,
                HasRated = userRating is not null
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get user rating for component {ComponentId}", componentId);
            return Results.Problem(
                detail: "Failed to retrieve rating",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Create a rating for a component
    /// </summary>
    private static async Task<IResult> CreateRating(
        string componentId,
        CreateRatingRequest request,
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
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid))
            {
                return Results.Unauthorized();
            }

            // Verify component exists
            var component = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection,
                componentId);

            if (component is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            // Check if user already rated this component
            var (ratings, _) = await firebaseService.GetDocumentsAsync<ComponentRating>(
                RatingsCollection,
                1,
                1000,
                null,
                null);

            var existingRating = ratings.FirstOrDefault(r =>
                r.ComponentId == componentId && r.UserId == uid);

            if (existingRating is not null)
            {
                return Results.Conflict(ApiResponse.Fail("You have already rated this component. Use PUT to update your rating."));
            }

            // Create new rating
            var rating = new ComponentRating
            {
                ComponentId = componentId,
                UserId = uid,
                Score = request.Score,
                CreatedAt = DateTime.UtcNow,
                UpdatedAt = DateTime.UtcNow
            };

            var ratingId = await firebaseService.AddDocumentAsync(RatingsCollection, rating);

            // Update component's rating statistics
            var componentRatings = ratings
                .Where(r => r.ComponentId == componentId)
                .Append(rating)
                .ToList();

            var newAverage = componentRatings.Average(r => r.Score);
            var newCount = componentRatings.Count;

            var updatedComponent = component with
            {
                RatingAverage = Math.Round(newAverage, 2),
                RatingCount = newCount,
                UpdatedAt = DateTime.UtcNow
            };

            await firebaseService.UpdateDocumentAsync(ComponentsCollection, componentId, updatedComponent);

            logger.LogInformation(
                "Rating created for component {ComponentId} by user {UserId} with score {Score}",
                componentId,
                uid,
                request.Score);

            var response = ApiResponse<RatingResponse>.Ok(new RatingResponse
            {
                Id = ratingId,
                ComponentId = componentId,
                UserId = uid,
                Score = request.Score,
                CreatedAt = rating.CreatedAt,
                UpdatedAt = rating.UpdatedAt
            });

            return Results.Created($"/api/components/{componentId}/ratings/{ratingId}", response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to create rating for component {ComponentId}", componentId);
            return Results.Problem(
                detail: "Failed to create rating",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Update current user's rating for a component
    /// </summary>
    private static async Task<IResult> UpdateMyRating(
        string componentId,
        UpdateRatingRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        // Validate request
        var validationErrors = ValidateUpdateRequest(request);
        if (validationErrors.Count > 0)
        {
            return Results.BadRequest(ApiResponse.Fail("Validation failed", validationErrors));
        }

        try
        {
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            if (string.IsNullOrEmpty(uid))
            {
                return Results.Unauthorized();
            }

            // Get all ratings to find user's existing rating
            var (ratings, _) = await firebaseService.GetDocumentsAsync<ComponentRating>(
                RatingsCollection,
                1,
                1000,
                null,
                null);

            var existingRating = ratings.FirstOrDefault(r =>
                r.ComponentId == componentId && r.UserId == uid);

            if (existingRating is null)
            {
                return Results.NotFound(ApiResponse.Fail("You haven't rated this component yet. Use POST to create a rating."));
            }

            // Update rating
            var updatedRating = existingRating with
            {
                Score = request.Score,
                UpdatedAt = DateTime.UtcNow
            };

            await firebaseService.UpdateDocumentAsync(RatingsCollection, existingRating.Id, updatedRating);

            // Update component's rating statistics
            var component = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection,
                componentId);

            if (component is not null)
            {
                var componentRatings = ratings
                    .Where(r => r.ComponentId == componentId && r.UserId != uid)
                    .Append(updatedRating)
                    .ToList();

                var newAverage = componentRatings.Average(r => r.Score);

                var updatedComponent = component with
                {
                    RatingAverage = Math.Round(newAverage, 2),
                    UpdatedAt = DateTime.UtcNow
                };

                await firebaseService.UpdateDocumentAsync(ComponentsCollection, componentId, updatedComponent);
            }

            logger.LogInformation(
                "Rating updated for component {ComponentId} by user {UserId} to score {Score}",
                componentId,
                uid,
                request.Score);

            var response = ApiResponse<RatingResponse>.Ok(new RatingResponse
            {
                Id = existingRating.Id,
                ComponentId = componentId,
                UserId = uid,
                Score = request.Score,
                CreatedAt = existingRating.CreatedAt,
                UpdatedAt = updatedRating.UpdatedAt
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update rating for component {ComponentId}", componentId);
            return Results.Problem(
                detail: "Failed to update rating",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static List<string> ValidateRequest(CreateRatingRequest request)
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

    private static List<string> ValidateUpdateRequest(UpdateRatingRequest request)
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
}
