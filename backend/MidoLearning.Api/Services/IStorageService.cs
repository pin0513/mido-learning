namespace MidoLearning.Api.Services;

/// <summary>
/// Interface for Firebase Storage operations
/// </summary>
public interface IStorageService
{
    /// <summary>
    /// Uploads a file to Firebase Storage
    /// </summary>
    /// <param name="path">The destination path in storage</param>
    /// <param name="stream">The file content stream</param>
    /// <param name="contentType">The content type of the file</param>
    /// <returns>The full storage path of the uploaded file</returns>
    Task<string> UploadFileAsync(string path, Stream stream, string contentType);

    /// <summary>
    /// Uploads a byte array to Firebase Storage
    /// </summary>
    /// <param name="path">The destination path in storage</param>
    /// <param name="data">The file content as byte array</param>
    /// <param name="contentType">The content type of the file</param>
    /// <returns>The full storage path of the uploaded file</returns>
    Task<string> UploadFileAsync(string path, byte[] data, string contentType);

    /// <summary>
    /// Deletes a file from Firebase Storage
    /// </summary>
    /// <param name="path">The path of the file to delete</param>
    Task DeleteFileAsync(string path);

    /// <summary>
    /// Deletes all files in a folder from Firebase Storage
    /// </summary>
    /// <param name="folderPath">The folder path to delete</param>
    Task DeleteFolderAsync(string folderPath);

    /// <summary>
    /// Generates a signed URL for downloading a file
    /// </summary>
    /// <param name="path">The path of the file</param>
    /// <param name="expiration">The URL expiration duration</param>
    /// <returns>A signed URL for the file</returns>
    Task<string> GetSignedUrlAsync(string path, TimeSpan expiration);

    /// <summary>
    /// Gets the public base URL for a folder
    /// </summary>
    /// <param name="folderPath">The folder path</param>
    /// <returns>The public base URL</returns>
    Task<string> GetPublicBaseUrlAsync(string folderPath);

    /// <summary>
    /// Lists all files in a folder
    /// </summary>
    /// <param name="folderPath">The folder path</param>
    /// <returns>A list of file paths</returns>
    Task<IEnumerable<string>> ListFilesAsync(string folderPath);

    /// <summary>
    /// Checks if a file exists
    /// </summary>
    /// <param name="path">The path of the file</param>
    /// <returns>True if the file exists</returns>
    Task<bool> FileExistsAsync(string path);
}
