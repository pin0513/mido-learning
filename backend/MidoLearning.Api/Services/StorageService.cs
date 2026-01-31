using Google.Apis.Auth.OAuth2;
using Google.Cloud.Storage.V1;

namespace MidoLearning.Api.Services;

/// <summary>
/// Firebase Storage service implementation using Google Cloud Storage
/// </summary>
public class StorageService : IStorageService
{
    private readonly StorageClient _storageClient;
    private readonly string _bucketName;
    private readonly ILogger<StorageService> _logger;
    private readonly GoogleCredential _credential;

    public StorageService(IConfiguration configuration, ILogger<StorageService> logger)
    {
        _logger = logger;

        var projectId = configuration["Firebase:ProjectId"]
            ?? throw new InvalidOperationException("Firebase:ProjectId not configured");

        _bucketName = configuration["Firebase:StorageBucket"]
            ?? $"{projectId}.appspot.com";

        var credentialPath = configuration["Firebase:CredentialPath"];

        if (!string.IsNullOrEmpty(credentialPath) && File.Exists(credentialPath))
        {
            _credential = GoogleCredential.FromFile(credentialPath);
            _storageClient = StorageClient.Create(_credential);
        }
        else
        {
            // Use Application Default Credentials (for Cloud Run)
            _credential = GoogleCredential.GetApplicationDefault();
            _storageClient = StorageClient.Create();
        }

        _logger.LogInformation("StorageService initialized with bucket: {BucketName}", _bucketName);
    }

    public async Task<string> UploadFileAsync(string path, Stream stream, string contentType)
    {
        try
        {
            var obj = await _storageClient.UploadObjectAsync(
                _bucketName,
                path,
                contentType,
                stream);

            _logger.LogInformation("File uploaded: {Path}", path);
            return path;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to upload file: {Path}", path);
            throw;
        }
    }

    public async Task<string> UploadFileAsync(string path, byte[] data, string contentType)
    {
        using var stream = new MemoryStream(data);
        return await UploadFileAsync(path, stream, contentType);
    }

    public async Task DeleteFileAsync(string path)
    {
        try
        {
            await _storageClient.DeleteObjectAsync(_bucketName, path);
            _logger.LogInformation("File deleted: {Path}", path);
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            _logger.LogWarning("File not found for deletion: {Path}", path);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete file: {Path}", path);
            throw;
        }
    }

    public async Task DeleteFolderAsync(string folderPath)
    {
        try
        {
            var prefix = folderPath.EndsWith("/") ? folderPath : $"{folderPath}/";
            var objects = _storageClient.ListObjects(_bucketName, prefix);

            var deleteTasks = new List<Task>();
            foreach (var obj in objects)
            {
                deleteTasks.Add(_storageClient.DeleteObjectAsync(_bucketName, obj.Name));
            }

            await Task.WhenAll(deleteTasks);
            _logger.LogInformation("Folder deleted: {FolderPath}, {Count} files", folderPath, deleteTasks.Count);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to delete folder: {FolderPath}", folderPath);
            throw;
        }
    }

    public async Task<string> GetSignedUrlAsync(string path, TimeSpan expiration)
    {
        try
        {
            var urlSigner = UrlSigner.FromCredential(_credential);
            var signedUrl = await urlSigner.SignAsync(
                _bucketName,
                path,
                expiration,
                HttpMethod.Get);

            return signedUrl;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to generate signed URL for: {Path}", path);
            throw;
        }
    }

    public Task<string> GetPublicBaseUrlAsync(string folderPath)
    {
        // Return the public URL pattern for the folder (with trailing slash)
        var normalizedPath = folderPath.TrimEnd('/');
        var baseUrl = $"https://storage.googleapis.com/{_bucketName}/{normalizedPath}/";
        return Task.FromResult(baseUrl);
    }

    public Task<IEnumerable<string>> ListFilesAsync(string folderPath)
    {
        try
        {
            var prefix = folderPath.EndsWith("/") ? folderPath : $"{folderPath}/";
            var objects = _storageClient.ListObjects(_bucketName, prefix);

            var files = objects
                .Select(obj => obj.Name.Substring(prefix.Length))
                .Where(name => !string.IsNullOrEmpty(name))
                .ToList();

            return Task.FromResult<IEnumerable<string>>(files);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to list files in: {FolderPath}", folderPath);
            throw;
        }
    }

    public async Task<bool> FileExistsAsync(string path)
    {
        try
        {
            await _storageClient.GetObjectAsync(_bucketName, path);
            return true;
        }
        catch (Google.GoogleApiException ex) when (ex.HttpStatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    public async Task<(Stream Content, string ContentType)> DownloadFileAsync(string path)
    {
        try
        {
            var obj = await _storageClient.GetObjectAsync(_bucketName, path);
            var memoryStream = new MemoryStream();
            await _storageClient.DownloadObjectAsync(_bucketName, path, memoryStream);
            memoryStream.Position = 0;

            var contentType = obj.ContentType ?? "application/octet-stream";
            return (memoryStream, contentType);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Failed to download file: {Path}", path);
            throw;
        }
    }
}
