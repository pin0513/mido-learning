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
    Task DeleteUserAsync(string uid);
    Task<(List<T> Items, int Total)> GetDocumentsAsync<T>(string collection, int page, int limit, string? search, string[]? orderBy) where T : class;
    Task<List<CourseMaterial>> GetMaterialsByComponentIdAsync(string componentId);
    Task<int> GetNextMaterialVersionAsync(string componentId);
    Task<WishListResult> GetWishesAsync(int page, int limit, string? status, string? search);
    Task UpdateWishStatusAsync(string wishId, string status, string? linkedComponentId, string processedBy);
    Task<WishStatsResult> GetWishStatsAsync();
    Task<(List<string> Categories, List<string> Tags)> GetUsedCategoriesAndTagsAsync();

    // Analytics methods
    Task IncrementCounterAsync(string collection, string documentId, string field);
    Task<AnalyticsStatsResponse> GetAnalyticsStatsAsync();
    Task<List<MaterialStatsItem>> GetMaterialStatsAsync(int limit);
    Task RecordVisitAsync(string pageType, string? componentId, string ipAddress);
    Task<VisitorStatsResponse> GetVisitorStatsAsync();
    Task<List<VisitRecord>> GetRecentVisitsAsync(int limit);
}

public record AnalyticsStatsResponse(
    long TotalPageViews,
    long TodayPageViews,
    long TotalMaterialViews,
    List<DailyStats> Last7Days
);

public record DailyStats(string Date, long Count);

public record MaterialStatsItem(
    string ComponentId,
    string? Title,
    long ViewCount
);

public record VisitorStatsResponse(
    int UniqueVisitors,
    int TodayUniqueVisitors,
    List<IpVisitCount> TopIps
);

public record IpVisitCount(string IpAddress, int Count);

public record VisitRecord(
    string Id,
    string PageType,
    string? ComponentId,
    string? ComponentTitle,
    string IpAddress,
    DateTime VisitedAt
);
