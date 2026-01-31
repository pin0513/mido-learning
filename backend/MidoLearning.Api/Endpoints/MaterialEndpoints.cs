using System.IO.Compression;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class MaterialEndpoints
{
    private const string MaterialsCollection = "materials";
    private const string ComponentsCollection = "components";
    private const long MaxFileSize = 50 * 1024 * 1024; // 50MB
    private static readonly TimeSpan SignedUrlExpiration = TimeSpan.FromHours(1);
    private static readonly TimeSpan ContentTokenExpiration = TimeSpan.FromHours(2);
    private const string TokenSecret = "MidoLearning-Content-Access-Secret-2026"; // In production, use configuration

    public static void MapMaterialEndpoints(this IEndpointRouteBuilder app)
    {
        // Component-scoped material endpoints
        var componentGroup = app.MapGroup("/api/components/{componentId}/materials")
            .WithTags("Materials")
            .RequireAuthorization();

        componentGroup.MapPost("/", UploadMaterial)
            .WithName("UploadMaterial")
            .RequireAuthorization("TeacherOrAdmin")
            .DisableAntiforgery()
            .WithOpenApi();

        // Materials list allows anonymous - it checks visibility internally
        componentGroup.MapGet("/", GetMaterials)
            .WithName("GetMaterials")
            .AllowAnonymous()
            .WithOpenApi();

        // Material-specific endpoints
        var materialGroup = app.MapGroup("/api/materials/{materialId}")
            .WithTags("Materials")
            .RequireAuthorization();

        materialGroup.MapDelete("/", DeleteMaterial)
            .WithName("DeleteMaterial")
            .RequireAuthorization("TeacherOrAdmin")
            .WithOpenApi();

        materialGroup.MapGet("/download", DownloadMaterial)
            .WithName("DownloadMaterial")
            .WithOpenApi();

        // Manifest endpoint allows anonymous - it checks visibility internally
        materialGroup.MapGet("/manifest", GetManifest)
            .WithName("GetManifest")
            .AllowAnonymous()
            .WithOpenApi();

        materialGroup.MapGet("/file", GetFile)
            .WithName("GetFile")
            .WithOpenApi();

        // Content proxy endpoint (allows anonymous access, validates based on material/component visibility)
        materialGroup.MapGet("/content/{*path}", GetContent)
            .WithName("GetMaterialContent")
            .AllowAnonymous()
            .WithOpenApi();
    }

    private static async Task<IResult> UploadMaterial(
        string componentId,
        HttpRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        IStorageService storageService,
        ILogger<Program> logger)
    {
        try
        {
            // Check if component exists
            var component = await firebaseService.GetDocumentAsync<LearningComponentDetail>(
                ComponentsCollection, componentId);

            if (component is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            // Check file size from header (for early rejection)
            if (request.Headers.TryGetValue("X-Expected-Size", out var expectedSizeHeader) &&
                long.TryParse(expectedSizeHeader, out var expectedSize) &&
                expectedSize > MaxFileSize)
            {
                return Results.BadRequest(ApiResponse.Fail($"File size exceeds maximum allowed size of 50MB"));
            }

            // Read the uploaded file
            var form = await request.ReadFormAsync();
            var file = form.Files.GetFile("file");

            if (file is null || file.Length == 0)
            {
                return Results.BadRequest(ApiResponse.Fail("No file uploaded"));
            }

            // Check file size
            if (file.Length > MaxFileSize)
            {
                return Results.BadRequest(ApiResponse.Fail($"File size exceeds maximum allowed size of 50MB"));
            }

            // Validate ZIP file and extract manifest
            var (isValid, manifest, validationError) = await ValidateZipFileAsync(file);
            if (!isValid)
            {
                logger.LogWarning("ZIP validation failed for component {ComponentId}: {Error}", componentId, validationError);
                return Results.BadRequest(ApiResponse.Fail(validationError!));
            }

            // Get next version number
            var version = await firebaseService.GetNextMaterialVersionAsync(componentId);

            // Define storage path
            var storagePath = $"materials/{componentId}/v{version}";

            // Upload extracted files to storage
            using var zipStream = file.OpenReadStream();
            using var archive = new ZipArchive(zipStream, ZipArchiveMode.Read);

            foreach (var entry in archive.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name))
                {
                    continue; // Skip directories
                }

                var filePath = $"{storagePath}/{entry.FullName}";
                using var entryStream = entry.Open();
                using var memoryStream = new MemoryStream();
                await entryStream.CopyToAsync(memoryStream);
                memoryStream.Position = 0;

                var contentType = GetContentType(entry.FullName);
                await storageService.UploadFileAsync(filePath, memoryStream, contentType);
            }

            // Get current user
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier) ?? string.Empty;

            // Create material document
            var material = new CourseMaterial
            {
                ComponentId = componentId,
                Version = version,
                Filename = file.FileName,
                Size = file.Length,
                StoragePath = storagePath,
                Manifest = manifest,
                UploadedBy = uid,
                UploadedAt = DateTime.UtcNow
            };

            var materialId = await firebaseService.AddDocumentAsync(MaterialsCollection, material);

            logger.LogInformation(
                "Material uploaded: {MaterialId} for component {ComponentId}, version {Version} by user {UserId}",
                materialId, componentId, version, uid);

            var response = ApiResponse<MaterialUploadResponse>.Ok(new MaterialUploadResponse
            {
                MaterialId = materialId,
                Version = version,
                Filename = file.FileName,
                Size = file.Length
            });

            return Results.Created($"/api/materials/{materialId}", response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to upload material for component {ComponentId}", componentId);
            return Results.Problem(
                detail: "Failed to upload material",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<IResult> GetMaterials(
        string componentId,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            // Check component visibility for anonymous access
            var component = await firebaseService.GetDocumentAsync<LearningComponent>(
                ComponentsCollection, componentId);

            if (component is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            var visibility = component.Visibility ?? "published";
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.IsInRole("admin");

            switch (visibility)
            {
                case "private":
                    if (!isAdmin && component.CreatedBy?.Uid != uid)
                    {
                        return Results.Forbid();
                    }
                    break;

                case "login":
                    if (string.IsNullOrEmpty(uid))
                    {
                        return Results.Unauthorized();
                    }
                    break;

                case "published":
                default:
                    // Allow anonymous access
                    break;
            }

            var materials = await firebaseService.GetMaterialsByComponentIdAsync(componentId);

            var response = ApiResponse<MaterialListResponse>.Ok(new MaterialListResponse
            {
                Materials = materials.Select(m => new MaterialListItem
                {
                    Id = m.Id,
                    Version = m.Version,
                    Filename = m.Filename,
                    Size = m.Size,
                    UploadedAt = m.UploadedAt,
                    UploadedBy = m.UploadedBy
                })
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get materials for component {ComponentId}", componentId);
            return Results.Problem(
                detail: "Failed to retrieve materials",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<IResult> DeleteMaterial(
        string materialId,
        HttpContext context,
        IFirebaseService firebaseService,
        IStorageService storageService,
        ILogger<Program> logger)
    {
        try
        {
            var material = await firebaseService.GetDocumentAsync<CourseMaterial>(
                MaterialsCollection, materialId);

            if (material is null)
            {
                return Results.NotFound(ApiResponse.Fail("Material not found"));
            }

            // Check authorization: owner or admin
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.IsInRole("admin");

            if (!isAdmin && material.UploadedBy != uid)
            {
                return Results.Forbid();
            }

            // Delete files from storage
            if (!string.IsNullOrEmpty(material.StoragePath))
            {
                await storageService.DeleteFolderAsync(material.StoragePath);
            }

            // Delete document from Firestore
            await firebaseService.DeleteDocumentAsync(MaterialsCollection, materialId);

            logger.LogInformation(
                "Material deleted: {MaterialId} by user {UserId}",
                materialId, uid);

            return Results.Ok(ApiResponse.Ok("Material has been deleted"));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete material {MaterialId}", materialId);
            return Results.Problem(
                detail: "Failed to delete material",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<IResult> DownloadMaterial(
        string materialId,
        IFirebaseService firebaseService,
        IStorageService storageService,
        ILogger<Program> logger)
    {
        try
        {
            var material = await firebaseService.GetDocumentAsync<CourseMaterial>(
                MaterialsCollection, materialId);

            if (material is null)
            {
                return Results.NotFound(ApiResponse.Fail("Material not found"));
            }

            // For now, redirect to the entry point file
            var entryPoint = material.Manifest?.EntryPoint ?? "index.html";
            var filePath = $"{material.StoragePath}/{entryPoint}";

            var signedUrl = await storageService.GetSignedUrlAsync(filePath, SignedUrlExpiration);

            return Results.Redirect(signedUrl);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to download material {MaterialId}", materialId);
            return Results.Problem(
                detail: "Failed to download material",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<IResult> GetManifest(
        string materialId,
        HttpRequest request,
        HttpContext context,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            var material = await firebaseService.GetDocumentAsync<CourseMaterial>(
                MaterialsCollection, materialId);

            if (material is null)
            {
                return Results.NotFound(ApiResponse.Fail("Material not found"));
            }

            // Check visibility-based access
            var component = await firebaseService.GetDocumentAsync<LearningComponent>(
                ComponentsCollection, material.ComponentId);

            if (component is null)
            {
                return Results.NotFound(ApiResponse.Fail("Component not found"));
            }

            var visibility = component.Visibility ?? "published";
            var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
            var isAdmin = context.User.IsInRole("admin");

            switch (visibility)
            {
                case "private":
                    if (!isAdmin && component.CreatedBy?.Uid != uid)
                    {
                        return Results.Forbid();
                    }
                    break;

                case "login":
                    if (string.IsNullOrEmpty(uid))
                    {
                        return Results.Unauthorized();
                    }
                    break;

                case "published":
                default:
                    // Allow anonymous access
                    break;
            }

            // Generate access token for iframe content loading
            var accessToken = GenerateContentAccessToken(materialId);

            // Use content API endpoint as base URL for proper access control
            // In Cloud Run, TLS terminates at load balancer, so check X-Forwarded-Proto header
            var scheme = request.Headers["X-Forwarded-Proto"].FirstOrDefault() ?? request.Scheme;
            if (scheme == "http" && !request.Host.Host.Contains("localhost"))
            {
                scheme = "https"; // Force HTTPS for non-localhost environments
            }
            var host = request.Host.ToString();
            // Base URL ends with / so entryPoint can be appended directly
            // Token will be added as query param by frontend
            var baseUrl = $"{scheme}://{host}/api/materials/{materialId}/content/";
            var tokenParam = $"?token={accessToken}";

            var response = ApiResponse<MaterialManifestResponse>.Ok(new MaterialManifestResponse
            {
                MaterialId = materialId,
                ComponentId = material.ComponentId,
                Version = material.Version,
                EntryPoint = material.Manifest?.EntryPoint ?? "index.html",
                Files = material.Manifest?.Files ?? Array.Empty<string>(),
                BaseUrl = baseUrl,
                AccessToken = accessToken
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get manifest for material {MaterialId}", materialId);
            return Results.Problem(
                detail: "Failed to retrieve manifest",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Generate a time-limited access token for material content
    /// </summary>
    private static string GenerateContentAccessToken(string materialId)
    {
        var expiry = DateTimeOffset.UtcNow.Add(ContentTokenExpiration).ToUnixTimeSeconds();
        var data = $"{materialId}:{expiry}";

        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(TokenSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var signature = Convert.ToBase64String(hash).Replace("+", "-").Replace("/", "_").TrimEnd('=');

        return $"{expiry}.{signature}";
    }

    /// <summary>
    /// Validate a content access token
    /// </summary>
    private static bool ValidateContentAccessToken(string materialId, string? token)
    {
        if (string.IsNullOrEmpty(token))
            return false;

        var parts = token.Split('.');
        if (parts.Length != 2)
            return false;

        if (!long.TryParse(parts[0], out var expiry))
            return false;

        // Check expiry
        if (DateTimeOffset.UtcNow.ToUnixTimeSeconds() > expiry)
            return false;

        // Verify signature
        var data = $"{materialId}:{expiry}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(TokenSecret));
        var hash = hmac.ComputeHash(Encoding.UTF8.GetBytes(data));
        var expectedSignature = Convert.ToBase64String(hash).Replace("+", "-").Replace("/", "_").TrimEnd('=');

        return parts[1] == expectedSignature;
    }

    /// <summary>
    /// Validate Referer header - allows relative resources loaded from same material
    /// </summary>
    private static bool ValidateReferer(HttpContext context, string materialId)
    {
        var referer = context.Request.Headers.Referer.FirstOrDefault();
        if (string.IsNullOrEmpty(referer))
            return false;

        // Check if referer contains this material's content URL (with valid token)
        // This allows relative resources (images, css, js) to load
        return referer.Contains($"/api/materials/{materialId}/content/") ||
               referer.Contains($"/materials/{materialId}") ||
               referer.Contains($"/components/") && referer.Contains("/materials/");
    }

    private static async Task<IResult> GetFile(
        string materialId,
        string? path,
        IFirebaseService firebaseService,
        IStorageService storageService,
        ILogger<Program> logger)
    {
        try
        {
            // Validate path parameter
            if (string.IsNullOrEmpty(path))
            {
                return Results.BadRequest(ApiResponse.Fail("Path parameter is required"));
            }

            // Prevent path traversal attacks
            if (path.Contains("..") || path.StartsWith("/") || path.Contains("\\"))
            {
                return Results.BadRequest(ApiResponse.Fail("Invalid path"));
            }

            var material = await firebaseService.GetDocumentAsync<CourseMaterial>(
                MaterialsCollection, materialId);

            if (material is null)
            {
                return Results.NotFound(ApiResponse.Fail("Material not found"));
            }

            // Check if file is in manifest
            var files = material.Manifest?.Files ?? Array.Empty<string>();
            if (!files.Contains(path))
            {
                return Results.NotFound(ApiResponse.Fail("File not found in material"));
            }

            var filePath = $"{material.StoragePath}/{path}";
            var signedUrl = await storageService.GetSignedUrlAsync(filePath, SignedUrlExpiration);

            return Results.Redirect(signedUrl);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get file {Path} for material {MaterialId}", path, materialId);
            return Results.Problem(
                detail: "Failed to retrieve file",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    /// <summary>
    /// Get material content with visibility-based access control.
    /// Allows anonymous access for published materials, requires login for login-required materials,
    /// and restricts private materials to owner/admin only.
    /// Also accepts a valid access token (from manifest) to bypass visibility checks for iframe loading.
    /// </summary>
    private static async Task<IResult> GetContent(
        string materialId,
        string? path,
        string? token,
        HttpContext context,
        IFirebaseService firebaseService,
        IStorageService storageService,
        ILogger<Program> logger)
    {
        try
        {
            // Get material first to determine entry point if path is empty
            var material = await firebaseService.GetDocumentAsync<CourseMaterial>(
                MaterialsCollection, materialId);

            if (material is null)
            {
                return Results.NotFound(ApiResponse.Fail("Material not found"));
            }

            // Default to manifest's entry point if no path specified
            var filePath = string.IsNullOrEmpty(path)
                ? (material.Manifest?.EntryPoint ?? "index.html")
                : path;

            // Prevent path traversal attacks
            if (filePath.Contains("..") || filePath.StartsWith("/") || filePath.Contains("\\"))
            {
                return Results.BadRequest(ApiResponse.Fail("Invalid path"));
            }

            // Check if valid access token is provided (for iframe loading)
            // Also check Referer header for relative resources loaded by the HTML
            var hasValidToken = ValidateContentAccessToken(materialId, token);
            var hasValidReferer = ValidateReferer(context, materialId);

            if (!hasValidToken && !hasValidReferer)
            {
                // No valid token, check visibility-based access
                var component = await firebaseService.GetDocumentAsync<LearningComponent>(
                    ComponentsCollection, material.ComponentId);

                if (component is null)
                {
                    return Results.NotFound(ApiResponse.Fail("Component not found"));
                }

                var visibility = component.Visibility ?? "published"; // Default to published for legacy data
                var uid = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
                var isAdmin = context.User.IsInRole("admin");

                switch (visibility)
                {
                    case "private":
                        // Only owner or admin can access
                        if (!isAdmin && component.CreatedBy?.Uid != uid)
                        {
                            return Results.Forbid();
                        }
                        break;

                    case "login":
                        // Requires authenticated user
                        if (string.IsNullOrEmpty(uid))
                        {
                            return Results.Unauthorized();
                        }
                        break;

                    case "published":
                    default:
                        // Allow anonymous access
                        break;
                }
            }

            // Build the full storage path and download file content
            var storagePath = $"{material.StoragePath}/{filePath}";

            try
            {
                var (content, contentType) = await storageService.DownloadFileAsync(storagePath);
                return Results.File(content, contentType);
            }
            catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
            {
                return Results.NotFound(ApiResponse.Fail("File not found"));
            }
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to get content {Path} for material {MaterialId}", path, materialId);
            return Results.Problem(
                detail: "Failed to retrieve content",
                statusCode: StatusCodes.Status500InternalServerError);
        }
    }

    private static async Task<(bool IsValid, MaterialManifest? Manifest, string? Error)> ValidateZipFileAsync(
        IFormFile file)
    {
        try
        {
            using var stream = file.OpenReadStream();
            using var archive = new ZipArchive(stream, ZipArchiveMode.Read);

            var files = new List<string>();
            var rootHtmlFiles = new List<string>();

            foreach (var entry in archive.Entries)
            {
                if (string.IsNullOrEmpty(entry.Name))
                {
                    continue; // Skip directories
                }

                // Skip macOS metadata files
                if (entry.FullName.StartsWith("__MACOSX/", StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                files.Add(entry.FullName);

                // Check for HTML files in root directory (no path separator)
                if (!entry.FullName.Contains('/') &&
                    (entry.FullName.EndsWith(".html", StringComparison.OrdinalIgnoreCase) ||
                     entry.FullName.EndsWith(".htm", StringComparison.OrdinalIgnoreCase)))
                {
                    rootHtmlFiles.Add(entry.FullName);
                }
            }

            // Determine entry point: prefer index.html/index.htm, otherwise use first root HTML file
            string? entryPoint = null;

            // Try to find index.html (case-insensitive, but preserve actual filename)
            var indexHtml = rootHtmlFiles.FirstOrDefault(f => f.Equals("index.html", StringComparison.OrdinalIgnoreCase));
            if (indexHtml is not null)
            {
                entryPoint = indexHtml;
            }
            else
            {
                // Try to find index.htm (case-insensitive, but preserve actual filename)
                var indexHtm = rootHtmlFiles.FirstOrDefault(f => f.Equals("index.htm", StringComparison.OrdinalIgnoreCase));
                if (indexHtm is not null)
                {
                    entryPoint = indexHtm;
                }
                else if (rootHtmlFiles.Count > 0)
                {
                    // Use first available HTML file
                    entryPoint = rootHtmlFiles[0];
                }
            }

            if (entryPoint is null)
            {
                var fileList = string.Join(", ", files.Take(10));
                return (false, null, $"ZIP file must contain an HTML file at the root level. Found files: [{fileList}]");
            }

            var manifest = new MaterialManifest
            {
                EntryPoint = entryPoint,
                Files = files.ToArray()
            };

            return (true, manifest, null);
        }
        catch (InvalidDataException)
        {
            return (false, null, "Invalid ZIP file format");
        }
        catch (Exception ex)
        {
            return (false, null, $"Failed to validate ZIP file: {ex.Message}");
        }
    }

    private static string GetContentType(string fileName)
    {
        var extension = Path.GetExtension(fileName).ToLowerInvariant();
        return extension switch
        {
            ".html" or ".htm" => "text/html",
            ".css" => "text/css",
            ".js" => "application/javascript",
            ".json" => "application/json",
            ".md" => "text/markdown",
            ".txt" => "text/plain",
            ".png" => "image/png",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".gif" => "image/gif",
            ".svg" => "image/svg+xml",
            ".webp" => "image/webp",
            ".mp4" => "video/mp4",
            ".webm" => "video/webm",
            ".mp3" => "audio/mpeg",
            ".wav" => "audio/wav",
            ".pdf" => "application/pdf",
            ".zip" => "application/zip",
            _ => "application/octet-stream"
        };
    }
}
