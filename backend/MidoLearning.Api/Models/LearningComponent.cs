using System.ComponentModel.DataAnnotations;
using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models;

/// <summary>
/// Learning component for list view
/// </summary>
[FirestoreData]
public record LearningComponent
{
    [FirestoreProperty]
    public string Id { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Title { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Theme { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Description { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Category { get; init; } = string.Empty;

    [FirestoreProperty]
    public string[] Tags { get; init; } = Array.Empty<string>();

    [FirestoreProperty]
    public string? Thumbnail { get; init; }

    [FirestoreProperty]
    public int MaterialCount { get; init; }

    /// <summary>
    /// Visibility level: "published" (public), "login" (requires login), "private" (owner only)
    /// For backward compatibility, null means "published" (legacy documents)
    /// </summary>
    [FirestoreProperty]
    public string? Visibility { get; init; }

    /// <summary>
    /// Average rating score (1-5)
    /// </summary>
    [FirestoreProperty]
    public double RatingAverage { get; init; } = 0;

    /// <summary>
    /// Number of ratings received
    /// </summary>
    [FirestoreProperty]
    public int RatingCount { get; init; } = 0;

    [FirestoreProperty]
    public CreatedByInfo? CreatedBy { get; init; }

    [FirestoreProperty]
    public DateTime CreatedAt { get; init; }
}

/// <summary>
/// Learning component for detail view with questions and materials
/// </summary>
[FirestoreData]
public record LearningComponentDetail
{
    [FirestoreProperty]
    public string Id { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Title { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Theme { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Description { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Category { get; init; } = string.Empty;

    [FirestoreProperty]
    public string[] Tags { get; init; } = Array.Empty<string>();

    [FirestoreProperty]
    public QuestionAnswer[] Questions { get; init; } = Array.Empty<QuestionAnswer>();

    [FirestoreProperty]
    public Material[] Materials { get; init; } = Array.Empty<Material>();

    /// <summary>
    /// Visibility level: "published" (public), "login" (requires login), "private" (owner only)
    /// For backward compatibility, null means "published" (legacy documents)
    /// </summary>
    [FirestoreProperty]
    public string? Visibility { get; init; }

    /// <summary>
    /// Average rating score (1-5)
    /// </summary>
    [FirestoreProperty]
    public double RatingAverage { get; init; } = 0;

    /// <summary>
    /// Number of ratings received
    /// </summary>
    [FirestoreProperty]
    public int RatingCount { get; init; } = 0;

    [FirestoreProperty]
    public CreatedByInfo? CreatedBy { get; init; }

    [FirestoreProperty]
    public DateTime CreatedAt { get; init; }

    [FirestoreProperty]
    public DateTime UpdatedAt { get; init; }
}

/// <summary>
/// Question and answer pair for learning component
/// </summary>
[FirestoreData]
public record QuestionAnswer
{
    [FirestoreProperty]
    public string Question { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Answer { get; init; } = string.Empty;
}

/// <summary>
/// Material attached to a learning component
/// </summary>
[FirestoreData]
public record Material
{
    [FirestoreProperty]
    public string Id { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Name { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Url { get; init; } = string.Empty;

    [FirestoreProperty]
    public string Type { get; init; } = string.Empty;
}

/// <summary>
/// Creator information for learning component
/// </summary>
[FirestoreData]
public record CreatedByInfo
{
    [FirestoreProperty]
    public string Uid { get; init; } = string.Empty;

    [FirestoreProperty]
    public string DisplayName { get; init; } = string.Empty;
}

/// <summary>
/// Response DTO for component list
/// </summary>
public record ComponentListResponse
{
    public IEnumerable<LearningComponent> Components { get; init; } = Array.Empty<LearningComponent>();
    public int Total { get; init; }
    public int Page { get; init; }
    public int Limit { get; init; }
}

/// <summary>
/// Request DTO for creating a learning component
/// </summary>
public record CreateComponentRequest
{
    [Required(ErrorMessage = "Title is required")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 200 characters")]
    public string Title { get; init; } = string.Empty;

    [Required(ErrorMessage = "Theme is required")]
    public string Theme { get; init; } = string.Empty;

    public string? Description { get; init; }

    [Required(ErrorMessage = "Category is required")]
    public string Category { get; init; } = string.Empty;

    public string[] Tags { get; init; } = Array.Empty<string>();

    public QuestionAnswer[] Questions { get; init; } = Array.Empty<QuestionAnswer>();
}

/// <summary>
/// Response DTO for component creation
/// </summary>
public record CreateComponentResponse
{
    public string Id { get; init; } = string.Empty;
}

/// <summary>
/// Request DTO for updating a learning component
/// </summary>
public record UpdateComponentRequest
{
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 200 characters")]
    public string? Title { get; init; }

    public string? Theme { get; init; }

    public string? Description { get; init; }

    public string? Category { get; init; }

    public string[]? Tags { get; init; }

    public QuestionAnswer[]? Questions { get; init; }

    public string? Thumbnail { get; init; }
}

/// <summary>
/// Request DTO for updating component visibility
/// </summary>
public record UpdateVisibilityRequest
{
    [Required(ErrorMessage = "Visibility is required")]
    [RegularExpression("^(published|login|private)$", ErrorMessage = "Visibility must be 'published', 'login', or 'private'")]
    public string Visibility { get; init; } = string.Empty;
}
