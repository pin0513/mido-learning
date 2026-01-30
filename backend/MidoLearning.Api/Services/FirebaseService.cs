using FirebaseAdmin;
using FirebaseAdmin.Auth;
using Google.Apis.Auth.OAuth2;
using Google.Cloud.Firestore;
using MidoLearning.Api.Models;

namespace MidoLearning.Api.Services;

public class FirebaseService : IFirebaseService
{
    private readonly ILogger<FirebaseService> _logger;
    private readonly FirestoreDb _firestoreDb;

    public FirebaseService(IConfiguration configuration, ILogger<FirebaseService> logger)
    {
        _logger = logger;

        var projectId = configuration["Firebase:ProjectId"];
        var credentialPath = configuration["Firebase:CredentialPath"];

        GoogleCredential? credential = null;
        if (!string.IsNullOrEmpty(credentialPath))
        {
            using var stream = File.OpenRead(credentialPath);
            credential = GoogleCredential.FromStream(stream);
        }

        if (FirebaseApp.DefaultInstance is null)
        {
            FirebaseApp.Create(new AppOptions
            {
                Credential = credential ?? GoogleCredential.GetApplicationDefault(),
                ProjectId = projectId
            });

            _logger.LogInformation("Firebase initialized with project: {ProjectId}", projectId);
        }

        var firestoreBuilder = new FirestoreDbBuilder
        {
            ProjectId = projectId,
            GoogleCredential = credential ?? GoogleCredential.GetApplicationDefault()
        };

        _firestoreDb = firestoreBuilder.Build();
        _logger.LogInformation("Firestore initialized with project: {ProjectId}", projectId);
    }

    public async Task<FirebaseToken> VerifyIdTokenAsync(string idToken)
    {
        return await FirebaseAuth.DefaultInstance.VerifyIdTokenAsync(idToken);
    }

    public async Task<UserRecord> GetUserAsync(string uid)
    {
        return await FirebaseAuth.DefaultInstance.GetUserAsync(uid);
    }

    public async Task SetCustomClaimsAsync(string uid, Dictionary<string, object> claims)
    {
        await FirebaseAuth.DefaultInstance.SetCustomUserClaimsAsync(uid, claims);
        _logger.LogInformation("Set custom claims for user {Uid}: {Claims}", uid, claims);
    }

    public async Task<string> AddDocumentAsync<T>(string collection, T data) where T : class
    {
        var docRef = await _firestoreDb.Collection(collection).AddAsync(data);
        _logger.LogInformation("Added document to {Collection} with ID: {DocumentId}", collection, docRef.Id);
        return docRef.Id;
    }

    public async Task<T?> GetDocumentAsync<T>(string collection, string documentId) where T : class
    {
        var docRef = _firestoreDb.Collection(collection).Document(documentId);
        var snapshot = await docRef.GetSnapshotAsync();

        if (!snapshot.Exists)
        {
            return null;
        }

        return snapshot.ConvertTo<T>();
    }

    public async Task<UserListResult> ListUsersAsync(int page, int limit, string? role, string? search)
    {
        var users = new List<UserDto>();
        var allUsers = new List<ExportedUserRecord>();

        // Firebase Auth doesn't support pagination directly, so we need to list all users
        // and apply filtering/pagination in memory
        var pagedEnumerable = FirebaseAuth.DefaultInstance.ListUsersAsync(null);
        var enumerator = pagedEnumerable.GetAsyncEnumerator();

        while (await enumerator.MoveNextAsync())
        {
            allUsers.Add(enumerator.Current);
        }

        // Apply filters
        var filteredUsers = allUsers.AsEnumerable();

        if (!string.IsNullOrEmpty(search))
        {
            filteredUsers = filteredUsers.Where(u =>
                (u.Email?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false) ||
                (u.DisplayName?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false));
        }

        if (!string.IsNullOrEmpty(role))
        {
            filteredUsers = filteredUsers.Where(u =>
            {
                var userRole = GetUserRole(u.CustomClaims);
                return userRole.Equals(role, StringComparison.OrdinalIgnoreCase);
            });
        }

        var total = filteredUsers.Count();

        // Apply pagination
        var pagedUsers = filteredUsers
            .Skip((page - 1) * limit)
            .Take(limit);

        foreach (var user in pagedUsers)
        {
            users.Add(new UserDto(
                user.Uid,
                user.Email ?? string.Empty,
                user.DisplayName,
                GetUserRole(user.CustomClaims),
                user.UserMetaData?.CreationTimestamp ?? DateTime.UtcNow,
                user.UserMetaData?.LastSignInTimestamp
            ));
        }

        _logger.LogInformation("Listed {Count} users (total: {Total}, page: {Page})", users.Count, total, page);

        return new UserListResult(users, total);
    }

    public async Task UpdateUserRoleAsync(string uid, string role)
    {
        var claims = new Dictionary<string, object>
        {
            { "role", role }
        };

        // If the role is admin, also set the admin claim
        if (role.Equals("admin", StringComparison.OrdinalIgnoreCase))
        {
            claims["admin"] = true;
        }

        await SetCustomClaimsAsync(uid, claims);
        _logger.LogInformation("Updated role for user {Uid} to {Role}", uid, role);
    }

    public async Task<(List<T> Items, int Total)> GetDocumentsAsync<T>(string collection, int page, int limit, string? search, string[]? orderBy) where T : class
    {
        var query = _firestoreDb.Collection(collection).Limit(limit).Offset((page - 1) * limit);

        var snapshot = await query.GetSnapshotAsync();
        var items = snapshot.Documents
            .Select(doc => doc.ConvertTo<T>())
            .ToList();

        // Get total count (this is inefficient for large collections, but Firestore doesn't have a native count)
        var countSnapshot = await _firestoreDb.Collection(collection).GetSnapshotAsync();
        var total = countSnapshot.Count;

        _logger.LogInformation("Retrieved {Count} documents from {Collection} (total: {Total})", items.Count, collection, total);

        return (items, total);
    }

    public async Task UpdateDocumentAsync<T>(string collection, string documentId, T data) where T : class
    {
        var docRef = _firestoreDb.Collection(collection).Document(documentId);
        await docRef.SetAsync(data, SetOptions.MergeAll);
        _logger.LogInformation("Updated document {DocumentId} in {Collection}", documentId, collection);
    }

    public async Task DeleteDocumentAsync(string collection, string documentId)
    {
        var docRef = _firestoreDb.Collection(collection).Document(documentId);
        await docRef.DeleteAsync();
        _logger.LogInformation("Deleted document {DocumentId} from {Collection}", documentId, collection);
    }

    public async Task<List<CourseMaterial>> GetMaterialsByComponentIdAsync(string componentId)
    {
        var query = _firestoreDb.Collection("materials")
            .WhereEqualTo("ComponentId", componentId)
            .OrderByDescending("Version");

        var snapshot = await query.GetSnapshotAsync();
        var materials = snapshot.Documents
            .Select(doc =>
            {
                var material = doc.ConvertTo<CourseMaterial>();
                return material with { Id = doc.Id };
            })
            .ToList();

        _logger.LogInformation("Retrieved {Count} materials for component {ComponentId}", materials.Count, componentId);
        return materials;
    }

    public async Task<int> GetNextMaterialVersionAsync(string componentId)
    {
        var materials = await GetMaterialsByComponentIdAsync(componentId);
        if (materials.Count == 0)
        {
            return 1;
        }

        return materials.Max(m => m.Version) + 1;
    }

    private static string GetUserRole(IReadOnlyDictionary<string, object>? claims)
    {
        if (claims is null)
        {
            return "member";
        }

        if (claims.TryGetValue("role", out var role) && role is string roleStr)
        {
            return roleStr;
        }

        if (claims.TryGetValue("admin", out var admin) && admin is true)
        {
            return "admin";
        }

        return "member";
    }

    public async Task<WishListResult> GetWishesAsync(int page, int limit, string? status, string? search)
    {
        var query = _firestoreDb.Collection("wishes").OrderByDescending("createdAt");

        // Apply status filter if provided
        if (!string.IsNullOrEmpty(status))
        {
            query = _firestoreDb.Collection("wishes")
                .WhereEqualTo("status", status)
                .OrderByDescending("createdAt");
        }

        var snapshot = await query.GetSnapshotAsync();
        var allWishes = snapshot.Documents
            .Select(doc =>
            {
                var wish = doc.ConvertTo<Wish>();
                return new WishDto
                {
                    Id = doc.Id,
                    Content = wish.Content,
                    Email = wish.Email,
                    Status = wish.Status,
                    LinkedComponentId = wish.LinkedComponentId,
                    ProcessedBy = wish.ProcessedBy,
                    CreatedAt = wish.CreatedAt.ToDateTime(),
                    UpdatedAt = wish.UpdatedAt.ToDateTime()
                };
            })
            .ToList();

        // Apply search filter in memory (Firestore doesn't support full-text search)
        if (!string.IsNullOrEmpty(search))
        {
            allWishes = allWishes
                .Where(w => w.Content.Contains(search, StringComparison.OrdinalIgnoreCase) ||
                           (w.Email?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false))
                .ToList();
        }

        var total = allWishes.Count;

        // Apply pagination
        var pagedWishes = allWishes
            .Skip((page - 1) * limit)
            .Take(limit)
            .ToList();

        _logger.LogInformation(
            "Retrieved {Count} wishes (total: {Total}, page: {Page}, status: {Status}, search: {Search})",
            pagedWishes.Count, total, page, status, search);

        return new WishListResult(pagedWishes, total);
    }

    public async Task UpdateWishStatusAsync(string wishId, string status, string? linkedComponentId, string processedBy)
    {
        var docRef = _firestoreDb.Collection("wishes").Document(wishId);

        var updates = new Dictionary<string, object>
        {
            { "status", status },
            { "processedBy", processedBy },
            { "updatedAt", Timestamp.GetCurrentTimestamp() }
        };

        if (!string.IsNullOrEmpty(linkedComponentId))
        {
            updates["linkedComponentId"] = linkedComponentId;
        }

        await docRef.UpdateAsync(updates);

        _logger.LogInformation(
            "Updated wish {WishId} status to {Status} by {ProcessedBy}",
            wishId, status, processedBy);
    }

    public async Task<WishStatsResult> GetWishStatsAsync()
    {
        var snapshot = await _firestoreDb.Collection("wishes").GetSnapshotAsync();
        var wishes = snapshot.Documents
            .Select(doc =>
            {
                var wish = doc.ConvertTo<Wish>();
                return new
                {
                    Status = wish.Status,
                    CreatedAt = wish.CreatedAt.ToDateTime(),
                    UpdatedAt = wish.UpdatedAt.ToDateTime()
                };
            })
            .ToList();

        var totalCount = wishes.Count;

        // Count by status
        var byStatus = new Dictionary<string, int>
        {
            { "pending", wishes.Count(w => w.Status == "pending") },
            { "processing", wishes.Count(w => w.Status == "processing") },
            { "completed", wishes.Count(w => w.Status == "completed") },
            { "deleted", wishes.Count(w => w.Status == "deleted") }
        };

        // Weekly trend (last 7 days)
        var today = DateTime.UtcNow.Date;
        var weeklyTrend = Enumerable.Range(0, 7)
            .Select(i => today.AddDays(-6 + i))
            .Select(date => new DailyWishCount
            {
                Date = date.ToString("yyyy-MM-dd"),
                Count = wishes.Count(w => w.CreatedAt.Date == date)
            })
            .ToList();

        // Average processing time (from pending to completed)
        var completedWishes = wishes
            .Where(w => w.Status == "completed" && w.UpdatedAt > w.CreatedAt)
            .ToList();

        var avgProcessingTimeHours = completedWishes.Count > 0
            ? completedWishes.Average(w => (w.UpdatedAt - w.CreatedAt).TotalHours)
            : 0;

        // Completion rate (completed / total excluding deleted)
        var nonDeletedCount = wishes.Count(w => w.Status != "deleted");
        var completedCount = byStatus["completed"];
        var completionRate = nonDeletedCount > 0
            ? (double)completedCount / nonDeletedCount
            : 0;

        _logger.LogInformation(
            "Retrieved wish stats: total={Total}, completed={Completed}, rate={Rate:P1}",
            totalCount, completedCount, completionRate);

        return new WishStatsResult(
            totalCount,
            byStatus,
            weeklyTrend,
            Math.Round(avgProcessingTimeHours, 1),
            Math.Round(completionRate, 3));
    }
}
