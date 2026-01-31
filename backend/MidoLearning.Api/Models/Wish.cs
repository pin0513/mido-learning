using System.ComponentModel.DataAnnotations;
using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models;

[FirestoreData]
public record Wish
{
    [FirestoreDocumentId]
    public string? Id { get; init; }

    [FirestoreProperty("content")]
    public required string Content { get; init; }

    [FirestoreProperty("email")]
    public string? Email { get; init; }

    [FirestoreProperty("status")]
    public string Status { get; init; } = "pending";

    [FirestoreProperty("linkedComponentId")]
    public string? LinkedComponentId { get; init; }

    [FirestoreProperty("processedBy")]
    public string? ProcessedBy { get; init; }

    [FirestoreProperty("ipAddress")]
    public string? IpAddress { get; init; }

    [FirestoreProperty("userAgent")]
    public string? UserAgent { get; init; }

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; init; }

    [FirestoreProperty("updatedAt")]
    public Timestamp? UpdatedAt { get; init; }
}

public record CreateWishRequest
{
    [Required(ErrorMessage = "願望內容為必填")]
    [StringLength(500, MinimumLength = 1, ErrorMessage = "願望內容長度需在 1-500 字之間")]
    public required string Content { get; init; }

    [EmailAddress(ErrorMessage = "Email 格式不正確")]
    public string? Email { get; init; }
}

public record CreateWishResponse
{
    public required string WishId { get; init; }
}

/// <summary>
/// DTO for wish in admin list view
/// </summary>
public record WishDto
{
    public string Id { get; init; } = string.Empty;
    public string Content { get; init; } = string.Empty;
    public string? Email { get; init; }
    public string Status { get; init; } = "pending";
    public string? LinkedComponentId { get; init; }
    public string? ProcessedBy { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime? UpdatedAt { get; init; }
}

/// <summary>
/// Response DTO for admin wish list
/// </summary>
public record WishListResponse
{
    public IEnumerable<WishDto> Wishes { get; init; } = Array.Empty<WishDto>();
    public int Total { get; init; }
    public int Page { get; init; }
    public int Limit { get; init; }
}

/// <summary>
/// Request DTO for updating wish status
/// </summary>
public record UpdateWishStatusRequest
{
    [Required(ErrorMessage = "Status is required")]
    public required string Status { get; init; }

    public string? LinkedComponentId { get; init; }
}

/// <summary>
/// Request DTO for creating component from wish
/// </summary>
public record CreateComponentFromWishRequest
{
    [Required(ErrorMessage = "Title is required")]
    [StringLength(200, MinimumLength = 1, ErrorMessage = "Title must be between 1 and 200 characters")]
    public string Title { get; init; } = string.Empty;

    [Required(ErrorMessage = "Theme is required")]
    public string Theme { get; init; } = string.Empty;

    [Required(ErrorMessage = "Description is required")]
    public string Description { get; init; } = string.Empty;

    [Required(ErrorMessage = "Category is required")]
    public string Category { get; init; } = string.Empty;

    public string[] Tags { get; init; } = Array.Empty<string>();

    public QuestionAnswer[] Questions { get; init; } = Array.Empty<QuestionAnswer>();
}

/// <summary>
/// Response DTO for create component from wish
/// </summary>
public record CreateComponentFromWishResponse
{
    public string ComponentId { get; init; } = string.Empty;
    public string WishId { get; init; } = string.Empty;
}

/// <summary>
/// Result DTO for wish list query
/// </summary>
public record WishListResult(IEnumerable<WishDto> Wishes, int Total);

/// <summary>
/// Response DTO for wish statistics
/// </summary>
public record WishStatsResponse
{
    public int TotalCount { get; init; }
    public Dictionary<string, int> ByStatus { get; init; } = new();
    public IEnumerable<DailyWishCount> WeeklyTrend { get; init; } = Array.Empty<DailyWishCount>();
    public double AvgProcessingTimeHours { get; init; }
    public double CompletionRate { get; init; }
}

/// <summary>
/// Daily wish count for trend chart
/// </summary>
public record DailyWishCount
{
    public string Date { get; init; } = string.Empty;
    public int Count { get; init; }
}

/// <summary>
/// Result DTO for wish statistics query
/// </summary>
public record WishStatsResult(
    int TotalCount,
    Dictionary<string, int> ByStatus,
    IEnumerable<DailyWishCount> WeeklyTrend,
    double AvgProcessingTimeHours,
    double CompletionRate);
