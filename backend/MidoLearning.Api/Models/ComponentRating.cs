using System.ComponentModel.DataAnnotations;
using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models;

/// <summary>
/// Rating for a learning component
/// </summary>
[FirestoreData]
public record ComponentRating
{
    [FirestoreProperty]
    public string Id { get; init; } = string.Empty;

    [FirestoreProperty]
    public string ComponentId { get; init; } = string.Empty;

    [FirestoreProperty]
    public string UserId { get; init; } = string.Empty;

    /// <summary>
    /// Rating score from 1 to 5
    /// </summary>
    [FirestoreProperty]
    public int Score { get; init; }

    [FirestoreProperty]
    public DateTime CreatedAt { get; init; }

    [FirestoreProperty]
    public DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Request DTO for creating a rating
/// </summary>
public record CreateRatingRequest
{
    [Required(ErrorMessage = "Score is required")]
    [Range(1, 5, ErrorMessage = "Score must be between 1 and 5")]
    public int Score { get; init; }
}

/// <summary>
/// Request DTO for updating a rating
/// </summary>
public record UpdateRatingRequest
{
    [Required(ErrorMessage = "Score is required")]
    [Range(1, 5, ErrorMessage = "Score must be between 1 and 5")]
    public int Score { get; init; }
}

/// <summary>
/// Response DTO for a single rating
/// </summary>
public record RatingResponse
{
    public string Id { get; init; } = string.Empty;
    public string ComponentId { get; init; } = string.Empty;
    public string UserId { get; init; } = string.Empty;
    public int Score { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Response DTO for user's own rating
/// </summary>
public record UserRatingResponse
{
    public int? Score { get; init; }
    public bool HasRated { get; init; }
}

/// <summary>
/// Response DTO for rating list with statistics
/// </summary>
public record RatingListResponse
{
    public IEnumerable<RatingResponse> Ratings { get; init; } = Array.Empty<RatingResponse>();
    public double Average { get; init; }
    public int Total { get; init; }
    public int[] Distribution { get; init; } = new int[5]; // Index 0 = 1 star, Index 4 = 5 stars
}
