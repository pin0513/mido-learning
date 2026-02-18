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
            credential = CredentialFactory.FromFile<ServiceAccountCredential>(credentialPath).ToGoogleCredential();
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

        // Set legacy claims for backward compatibility
        if (role.Equals("super_admin", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("admin", StringComparison.OrdinalIgnoreCase))
        {
            claims["admin"] = true;
        }

        if (role.Equals("teacher", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("game_admin", StringComparison.OrdinalIgnoreCase) ||
            role.Equals("super_admin", StringComparison.OrdinalIgnoreCase))
        {
            claims["teacher"] = true;
        }

        await SetCustomClaimsAsync(uid, claims);
        _logger.LogInformation("Updated role for user {Uid} to {Role}", uid, role);
    }

    public async Task DeleteUserAsync(string uid)
    {
        await FirebaseAuth.DefaultInstance.DeleteUserAsync(uid);
        _logger.LogInformation("Deleted user {Uid}", uid);
    }

    public async Task<(List<T> Items, int Total)> GetDocumentsAsync<T>(string collection, int page, int limit, string? search, string[]? orderBy) where T : class
    {
        var query = _firestoreDb.Collection(collection).Limit(limit).Offset((page - 1) * limit);

        var snapshot = await query.GetSnapshotAsync();
        var items = snapshot.Documents
            .Select(doc =>
            {
                var item = doc.ConvertTo<T>();
                // Try to set the Id property if it exists using reflection
                var idProperty = typeof(T).GetProperty("Id");
                if (idProperty != null && idProperty.CanWrite)
                {
                    // For records with init-only setters, we need a different approach
                    // Create a new instance with the Id set
                    if (item is LearningComponent component)
                    {
                        return (T)(object)(component with { Id = doc.Id });
                    }
                }
                return item;
            })
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
        // Simple query without ordering to avoid index requirement
        var query = _firestoreDb.Collection("materials")
            .WhereEqualTo("ComponentId", componentId);

        var snapshot = await query.GetSnapshotAsync();
        var materials = snapshot.Documents
            .Select(doc =>
            {
                var material = doc.ConvertTo<CourseMaterial>();
                return material with { Id = doc.Id };
            })
            .OrderByDescending(m => m.Version) // Order in memory instead
            .ToList();

        _logger.LogInformation("Retrieved {Count} materials for component {ComponentId}", materials.Count, componentId);
        return materials;
    }

    public async Task<List<CourseMaterial>> GetMaterialsByIdsAsync(IEnumerable<string> materialIds)
    {
        var ids = materialIds.Distinct().Take(20).ToList();
        var tasks = ids.Select(async id =>
        {
            var docRef = _firestoreDb.Collection("materials").Document(id);
            var snapshot = await docRef.GetSnapshotAsync();
            if (!snapshot.Exists) return null;
            var material = snapshot.ConvertTo<CourseMaterial>();
            return material with { Id = snapshot.Id };
        });
        var results = await Task.WhenAll(tasks);
        return results.Where(m => m is not null).Cast<CourseMaterial>().ToList();
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
                    UpdatedAt = wish.UpdatedAt?.ToDateTime()
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
                    UpdatedAt = wish.UpdatedAt?.ToDateTime()
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
            .Where(w => w.Status == "completed" && w.UpdatedAt.HasValue && w.UpdatedAt.Value > w.CreatedAt)
            .ToList();

        var avgProcessingTimeHours = completedWishes.Count > 0
            ? completedWishes.Average(w => (w.UpdatedAt!.Value - w.CreatedAt).TotalHours)
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

    public async Task<(List<string> Categories, List<string> Tags)> GetUsedCategoriesAndTagsAsync()
    {
        var snapshot = await _firestoreDb.Collection("components").GetSnapshotAsync();

        var categories = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var tags = new HashSet<string>(StringComparer.OrdinalIgnoreCase);

        foreach (var doc in snapshot.Documents)
        {
            var component = doc.ConvertTo<LearningComponent>();

            if (!string.IsNullOrEmpty(component.Category))
            {
                categories.Add(component.Category);
            }

            if (component.Tags is not null)
            {
                foreach (var tag in component.Tags.Where(t => !string.IsNullOrWhiteSpace(t)))
                {
                    tags.Add(tag);
                }
            }
        }

        _logger.LogInformation(
            "Retrieved {CategoryCount} categories and {TagCount} tags from components",
            categories.Count, tags.Count);

        return (categories.OrderBy(c => c).ToList(), tags.OrderBy(t => t).ToList());
    }

    public async Task IncrementCounterAsync(string collection, string documentId, string field)
    {
        var docRef = _firestoreDb.Collection(collection).Document(documentId);
        var snapshot = await docRef.GetSnapshotAsync();

        if (snapshot.Exists)
        {
            await docRef.UpdateAsync(field, FieldValue.Increment(1));
        }
        else
        {
            await docRef.SetAsync(new Dictionary<string, object>
            {
                { field, 1 },
                { "createdAt", Timestamp.GetCurrentTimestamp() }
            });
        }
    }

    public async Task<AnalyticsStatsResponse> GetAnalyticsStatsAsync()
    {
        var today = DateTime.UtcNow.ToString("yyyy-MM-dd");

        // Get total page views
        var totalDoc = await _firestoreDb.Collection("analytics").Document("total_pageviews").GetSnapshotAsync();
        var totalPageViews = totalDoc.Exists && totalDoc.TryGetValue<long>("count", out var total) ? total : 0;

        // Get today's page views
        var todayDoc = await _firestoreDb.Collection("analytics").Document($"pageviews_{today}").GetSnapshotAsync();
        var todayPageViews = todayDoc.Exists && todayDoc.TryGetValue<long>("count", out var todayCount) ? todayCount : 0;

        // Get total material views
        var materialsSnapshot = await _firestoreDb.Collection("analytics_materials").GetSnapshotAsync();
        var totalMaterialViews = materialsSnapshot.Documents
            .Where(d => !d.Id.Contains("_")) // Exclude daily records
            .Sum(d => d.TryGetValue<long>("viewCount", out var v) ? v : 0);

        // Get last 7 days
        var last7Days = new List<DailyStats>();
        for (int i = 6; i >= 0; i--)
        {
            var date = DateTime.UtcNow.AddDays(-i).ToString("yyyy-MM-dd");
            var dayDoc = await _firestoreDb.Collection("analytics").Document($"pageviews_{date}").GetSnapshotAsync();
            var count = dayDoc.Exists && dayDoc.TryGetValue<long>("count", out var c) ? c : 0;
            last7Days.Add(new DailyStats(date, count));
        }

        return new AnalyticsStatsResponse(totalPageViews, todayPageViews, totalMaterialViews, last7Days);
    }

    public async Task<List<MaterialStatsItem>> GetMaterialStatsAsync(int limit)
    {
        var materialsSnapshot = await _firestoreDb.Collection("analytics_materials").GetSnapshotAsync();

        // Get component IDs and view counts (exclude daily records)
        var materialViews = materialsSnapshot.Documents
            .Where(d => !d.Id.Contains("_"))
            .Select(d => new
            {
                ComponentId = d.Id,
                ViewCount = d.TryGetValue<long>("viewCount", out var v) ? v : 0
            })
            .OrderByDescending(m => m.ViewCount)
            .Take(limit)
            .ToList();

        // Get component titles
        var result = new List<MaterialStatsItem>();
        foreach (var item in materialViews)
        {
            var component = await GetDocumentAsync<LearningComponent>("components", item.ComponentId);
            result.Add(new MaterialStatsItem(
                item.ComponentId,
                component?.Title,
                item.ViewCount
            ));
        }

        return result;
    }

    public async Task RecordVisitAsync(string pageType, string? componentId, string ipAddress)
    {
        var visitData = new Dictionary<string, object>
        {
            { "pageType", pageType },
            { "ipAddress", ipAddress },
            { "visitedAt", Timestamp.GetCurrentTimestamp() }
        };

        if (!string.IsNullOrEmpty(componentId))
        {
            visitData["componentId"] = componentId;
        }

        await _firestoreDb.Collection("analytics_visits").AddAsync(visitData);
    }

    public async Task<VisitorStatsResponse> GetVisitorStatsAsync()
    {
        var snapshot = await _firestoreDb.Collection("analytics_visits").GetSnapshotAsync();

        var visits = snapshot.Documents
            .Select(d => new
            {
                IpAddress = d.TryGetValue<string>("ipAddress", out var ip) ? ip : "unknown",
                VisitedAt = d.TryGetValue<Timestamp>("visitedAt", out var ts) ? ts.ToDateTime() : DateTime.MinValue
            })
            .ToList();

        var uniqueVisitors = visits.Select(v => v.IpAddress).Distinct().Count();

        var today = DateTime.UtcNow.Date;
        var todayUniqueVisitors = visits
            .Where(v => v.VisitedAt.Date == today)
            .Select(v => v.IpAddress)
            .Distinct()
            .Count();

        var topIps = visits
            .GroupBy(v => v.IpAddress)
            .Select(g => new IpVisitCount(g.Key, g.Count()))
            .OrderByDescending(x => x.Count)
            .Take(10)
            .ToList();

        return new VisitorStatsResponse(uniqueVisitors, todayUniqueVisitors, topIps);
    }

    public async Task<List<VisitRecord>> GetRecentVisitsAsync(int limit)
    {
        var query = _firestoreDb.Collection("analytics_visits")
            .OrderByDescending("visitedAt")
            .Limit(limit);

        var snapshot = await query.GetSnapshotAsync();

        var visits = new List<VisitRecord>();
        foreach (var doc in snapshot.Documents)
        {
            var pageType = doc.TryGetValue<string>("pageType", out var pt) ? pt : "unknown";
            var componentId = doc.TryGetValue<string>("componentId", out var cid) ? cid : null;
            var ipAddress = doc.TryGetValue<string>("ipAddress", out var ip) ? ip : "unknown";
            var visitedAt = doc.TryGetValue<Timestamp>("visitedAt", out var ts) ? ts.ToDateTime() : DateTime.MinValue;

            string? componentTitle = null;
            if (!string.IsNullOrEmpty(componentId))
            {
                var component = await GetDocumentAsync<LearningComponent>("components", componentId);
                componentTitle = component?.Title;
            }

            visits.Add(new VisitRecord(
                doc.Id,
                pageType,
                componentId,
                componentTitle,
                ipAddress,
                visitedAt
            ));
        }

        return visits;
    }

    public async Task<List<CourseDto>> GetCoursesAsync(
        string? type,
        string? category,
        string? status,
        string? search = null,
        int? minLevel = null,
        int? maxLevel = null,
        string? priceFilter = null,
        string? sortBy = null,
        string? gameType = null)
    {
        Query query = _firestoreDb.Collection("courses");

        if (!string.IsNullOrEmpty(type))
        {
            query = query.WhereEqualTo("type", type);
        }

        if (!string.IsNullOrEmpty(category))
        {
            query = query.WhereEqualTo("category", category);
        }

        if (!string.IsNullOrEmpty(status))
        {
            query = query.WhereEqualTo("status", status);
        }

        var snapshot = await query.GetSnapshotAsync();
        var courses = new List<CourseDto>();

        foreach (var document in snapshot.Documents)
        {
            var data = document.ToDictionary();
            courses.Add(new CourseDto
            {
                Id = document.Id,
                Title = data.GetValueOrDefault("title")?.ToString() ?? "",
                Description = data.GetValueOrDefault("description")?.ToString() ?? "",
                Instructor = data.GetValueOrDefault("instructor")?.ToString() ?? "",
                Thumbnail = data.GetValueOrDefault("thumbnail")?.ToString() ?? "",
                Price = Convert.ToInt32(data.GetValueOrDefault("price") ?? 0),
                Status = data.GetValueOrDefault("status")?.ToString() ?? "draft",
                Category = data.GetValueOrDefault("category")?.ToString() ?? "",
                Type = data.GetValueOrDefault("type")?.ToString() ?? "video",
                GameConfig = ParseGameConfig(data.GetValueOrDefault("gameConfig")),
                CreatedAt = data.ContainsKey("createdAt")
                    ? ((Timestamp)data["createdAt"]).ToDateTime()
                    : DateTime.UtcNow,
                UpdatedAt = data.ContainsKey("updatedAt")
                    ? ((Timestamp)data["updatedAt"]).ToDateTime()
                    : DateTime.UtcNow
            });
        }

        // Apply in-memory filters
        var filteredCourses = courses.AsEnumerable();

        // Search filter (title or description)
        if (!string.IsNullOrEmpty(search))
        {
            var searchLower = search.ToLower();
            filteredCourses = filteredCourses.Where(c =>
                c.Title.ToLower().Contains(searchLower) ||
                c.Description.ToLower().Contains(searchLower));
        }

        // Level filter
        if (minLevel.HasValue || maxLevel.HasValue)
        {
            filteredCourses = filteredCourses.Where(c =>
            {
                if (c.GameConfig == null) return false;
                var level = c.GameConfig.Level;
                if (minLevel.HasValue && level < minLevel.Value) return false;
                if (maxLevel.HasValue && level > maxLevel.Value) return false;
                return true;
            });
        }

        // Price filter
        if (!string.IsNullOrEmpty(priceFilter))
        {
            filteredCourses = priceFilter.ToLower() switch
            {
                "free" => filteredCourses.Where(c => c.Price == 0),
                "paid" => filteredCourses.Where(c => c.Price > 0),
                _ => filteredCourses
            };
        }

        // GameType filter (typing, math, memory)
        if (!string.IsNullOrEmpty(gameType))
        {
            filteredCourses = filteredCourses.Where(c =>
                c.GameConfig != null &&
                string.Equals(c.GameConfig.GameType, gameType, StringComparison.OrdinalIgnoreCase));
        }

        // Apply sorting
        if (!string.IsNullOrEmpty(sortBy))
        {
            filteredCourses = sortBy.ToLower() switch
            {
                "price_asc" => filteredCourses.OrderBy(c => c.Price),
                "price_desc" => filteredCourses.OrderByDescending(c => c.Price),
                "level_asc" => filteredCourses.OrderBy(c => c.GameConfig?.Level ?? 0),
                "level_desc" => filteredCourses.OrderByDescending(c => c.GameConfig?.Level ?? 0),
                "newest" => filteredCourses.OrderByDescending(c => c.CreatedAt),
                "oldest" => filteredCourses.OrderBy(c => c.CreatedAt),
                _ => filteredCourses.OrderByDescending(c => c.CreatedAt)
            };
        }
        else
        {
            // Default: newest first
            filteredCourses = filteredCourses.OrderByDescending(c => c.CreatedAt);
        }

        return filteredCourses.ToList();
    }

    public async Task<CourseDto?> GetCourseByIdAsync(string courseId)
    {
        var docRef = _firestoreDb.Collection("courses").Document(courseId);
        var snapshot = await docRef.GetSnapshotAsync();

        if (!snapshot.Exists)
        {
            return null;
        }

        var data = snapshot.ToDictionary();
        return new CourseDto
        {
            Id = snapshot.Id,
            Title = data.GetValueOrDefault("title")?.ToString() ?? "",
            Description = data.GetValueOrDefault("description")?.ToString() ?? "",
            Instructor = data.GetValueOrDefault("instructor")?.ToString() ?? "",
            Thumbnail = data.GetValueOrDefault("thumbnail")?.ToString() ?? "",
            Price = Convert.ToInt32(data.GetValueOrDefault("price") ?? 0),
            Status = data.GetValueOrDefault("status")?.ToString() ?? "draft",
            Category = data.GetValueOrDefault("category")?.ToString() ?? "",
            Type = data.GetValueOrDefault("type")?.ToString() ?? "video",
            GameConfig = ParseGameConfig(data.GetValueOrDefault("gameConfig")),
            CreatedAt = data.ContainsKey("createdAt")
                ? ((Timestamp)data["createdAt"]).ToDateTime()
                : DateTime.UtcNow,
            UpdatedAt = data.ContainsKey("updatedAt")
                ? ((Timestamp)data["updatedAt"]).ToDateTime()
                : DateTime.UtcNow
        };
    }

    private static GameConfigDto? ParseGameConfig(object? gameConfigObj)
    {
        if (gameConfigObj == null) return null;

        var gameConfigDict = gameConfigObj as Dictionary<string, object>;
        if (gameConfigDict == null) return null;

        return new GameConfigDto
        {
            GameType = gameConfigDict.GetValueOrDefault("gameType")?.ToString() ?? "typing",
            Level = Convert.ToInt32(gameConfigDict.GetValueOrDefault("level") ?? 1),
            TimeLimit = Convert.ToInt32(gameConfigDict.GetValueOrDefault("timeLimit") ?? 60),
            TargetWPM = gameConfigDict.ContainsKey("targetWPM")
                ? Convert.ToInt32(gameConfigDict["targetWPM"])
                : null,
            Questions = ParseQuestions(gameConfigDict.GetValueOrDefault("questions"))
        };
    }

    private static List<GameQuestionDto> ParseQuestions(object? questionsObj)
    {
        if (questionsObj == null) return new List<GameQuestionDto>();

        var questionsList = questionsObj as System.Collections.IEnumerable;
        if (questionsList == null) return new List<GameQuestionDto>();

        var questions = new List<GameQuestionDto>();
        foreach (var item in questionsList)
        {
            if (item is Dictionary<string, object> questionDict)
            {
                questions.Add(new GameQuestionDto
                {
                    Text = questionDict.GetValueOrDefault("text")?.ToString() ?? "",
                    Difficulty = questionDict.GetValueOrDefault("difficulty")?.ToString()
                });
            }
        }

        return questions;
    }
}
