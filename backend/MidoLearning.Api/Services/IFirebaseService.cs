using FirebaseAdmin.Auth;
using Google.Cloud.Firestore;
using MidoLearning.Api.Models;

namespace MidoLearning.Api.Services;

public interface IFirebaseService
{
    Task<FirebaseToken> VerifyIdTokenAsync(string idToken);
    Task<UserRecord> GetUserAsync(string uid);
    Task SetCustomClaimsAsync(string uid, Dictionary<string, object> claims);
    Task<string> AddDocumentAsync<T>(string collection, T data) where T : class;
    Task<T?> GetDocumentAsync<T>(string collection, string documentId) where T : class;
    Task UpdateDocumentAsync<T>(string collection, string documentId, T data) where T : class;
    Task DeleteDocumentAsync(string collection, string documentId);
    Task<UserListResult> ListUsersAsync(int page, int limit, string? role, string? search);
    Task UpdateUserRoleAsync(string uid, string role);
    Task<(List<T> Items, int Total)> GetDocumentsAsync<T>(string collection, int page, int limit, string? search, string[]? orderBy) where T : class;
    Task<List<CourseMaterial>> GetMaterialsByComponentIdAsync(string componentId);
    Task<int> GetNextMaterialVersionAsync(string componentId);
    Task<WishListResult> GetWishesAsync(int page, int limit, string? status, string? search);
    Task UpdateWishStatusAsync(string wishId, string status, string? linkedComponentId, string processedBy);
    Task<WishStatsResult> GetWishStatsAsync();
}
