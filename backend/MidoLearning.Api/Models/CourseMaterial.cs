using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models;

/// <summary>
/// Course material stored in Firestore
/// </summary>
[FirestoreData]
public record CourseMaterial
{
    [FirestoreProperty]
    public string Id { get; init; } = string.Empty;

    [FirestoreProperty]
    public string ComponentId { get; init; } = string.Empty;

    [FirestoreProperty]
    public int Version { get; init; }

    [FirestoreProperty]
    public string Filename { get; init; } = string.Empty;

    [FirestoreProperty]
    public long Size { get; init; }

    [FirestoreProperty]
    public string? StoragePath { get; init; }

    [FirestoreProperty]
    public MaterialManifest? Manifest { get; init; }

    [FirestoreProperty]
    public string UploadedBy { get; init; } = string.Empty;

    [FirestoreProperty]
    public DateTime UploadedAt { get; init; }
}

/// <summary>
/// Material manifest containing entry point and file list
/// </summary>
[FirestoreData]
public record MaterialManifest
{
    [FirestoreProperty]
    public string EntryPoint { get; init; } = "index.html";

    [FirestoreProperty]
    public string[] Files { get; init; } = Array.Empty<string>();
}

/// <summary>
/// Response DTO for material upload
/// </summary>
public record MaterialUploadResponse
{
    public string MaterialId { get; init; } = string.Empty;
    public int Version { get; init; }
    public string Filename { get; init; } = string.Empty;
    public long Size { get; init; }
}

/// <summary>
/// Response DTO for material list
/// </summary>
public record MaterialListResponse
{
    public IEnumerable<MaterialListItem> Materials { get; init; } = Array.Empty<MaterialListItem>();
}

/// <summary>
/// Material item in list response
/// </summary>
public record MaterialListItem
{
    public string Id { get; init; } = string.Empty;
    public int Version { get; init; }
    public string Filename { get; init; } = string.Empty;
    public long Size { get; init; }
    public DateTime UploadedAt { get; init; }
    public string UploadedBy { get; init; } = string.Empty;
}

/// <summary>
/// Response DTO for material manifest
/// </summary>
public record MaterialManifestResponse
{
    public string MaterialId { get; init; } = string.Empty;
    public string ComponentId { get; init; } = string.Empty;
    public int Version { get; init; }
    public string EntryPoint { get; init; } = string.Empty;
    public IEnumerable<string> Files { get; init; } = Array.Empty<string>();
    public string BaseUrl { get; init; } = string.Empty;
    public string? AccessToken { get; init; }
}

/// <summary>
/// Request DTO for batch material query
/// </summary>
public record MaterialBatchRequest
{
    public List<string> Ids { get; init; } = new();
}

/// <summary>
/// Single item in batch material response (metadata + manifest combined)
/// </summary>
public record MaterialBatchItem
{
    public string Id { get; init; } = string.Empty;
    public string ComponentId { get; init; } = string.Empty;
    public int Version { get; init; }
    public string Filename { get; init; } = string.Empty;
    public long Size { get; init; }
    public DateTime UploadedAt { get; init; }
    public string EntryPoint { get; init; } = string.Empty;
    public IEnumerable<string> Files { get; init; } = Array.Empty<string>();
    public string BaseUrl { get; init; } = string.Empty;
    public string? AccessToken { get; init; }
}

/// <summary>
/// Response DTO for batch material query
/// </summary>
public record MaterialBatchResponse
{
    public IEnumerable<MaterialBatchItem> Materials { get; init; } = Array.Empty<MaterialBatchItem>();
}
