using Google.Cloud.Firestore;
using MidoLearning.Api.Models;

namespace MidoLearning.Api.Services;

public class AchievementService : IAchievementService
{
    private readonly FirestoreDb _firestore;
    private readonly ILogger<AchievementService> _logger;
    private readonly IGameService _gameService;

    public AchievementService(
        IConfiguration configuration,
        ILogger<AchievementService> logger,
        IGameService gameService)
    {
        _logger = logger;
        _gameService = gameService;
        var projectId = configuration["Firebase:ProjectId"];
        _firestore = FirestoreDb.Create(projectId);
    }

    public async Task<Achievement> CreateAchievementAsync(CreateAchievementRequest request)
    {
        var achievement = new Achievement
        {
            Id = Guid.NewGuid().ToString(),
            Title = request.Title,
            Description = request.Description,
            Icon = request.Icon,
            Type = request.Type,
            Condition = request.Condition,
            Reward = request.Reward,
            IsActive = request.IsActive,
            DisplayOrder = request.DisplayOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };

        var docRef = _firestore.Collection("achievements").Document(achievement.Id);
        await docRef.SetAsync(new
        {
            title = achievement.Title,
            description = achievement.Description,
            icon = achievement.Icon,
            type = achievement.Type.ToString(),
            condition = achievement.Condition,
            reward = achievement.Reward,
            isActive = achievement.IsActive,
            displayOrder = achievement.DisplayOrder,
            createdAt = Timestamp.FromDateTime(achievement.CreatedAt),
            updatedAt = Timestamp.FromDateTime(achievement.UpdatedAt)
        });

        _logger.LogInformation("Created achievement {AchievementId}: {Title}", achievement.Id, achievement.Title);
        return achievement;
    }

    public async Task<Achievement?> GetAchievementAsync(string achievementId)
    {
        var docRef = _firestore.Collection("achievements").Document(achievementId);
        var snapshot = await docRef.GetSnapshotAsync();

        if (!snapshot.Exists)
        {
            return null;
        }

        return ParseAchievement(snapshot);
    }

    public async Task<List<Achievement>> GetAllAchievementsAsync(bool activeOnly = true)
    {
        Query query = _firestore.Collection("achievements");

        if (activeOnly)
        {
            query = query.WhereEqualTo("isActive", true);
        }

        query = query.OrderBy("displayOrder");

        var snapshot = await query.GetSnapshotAsync();
        var achievements = new List<Achievement>();

        foreach (var doc in snapshot.Documents)
        {
            achievements.Add(ParseAchievement(doc));
        }

        return achievements;
    }

    public async Task<Achievement> UpdateAchievementAsync(string achievementId, UpdateAchievementRequest request)
    {
        var docRef = _firestore.Collection("achievements").Document(achievementId);
        var updates = new Dictionary<string, object>
        {
            { "updatedAt", Timestamp.FromDateTime(DateTime.UtcNow) }
        };

        if (request.Title != null) updates["title"] = request.Title;
        if (request.Description != null) updates["description"] = request.Description;
        if (request.Icon != null) updates["icon"] = request.Icon;
        if (request.Condition != null) updates["condition"] = request.Condition;
        if (request.Reward != null) updates["reward"] = request.Reward;
        if (request.IsActive.HasValue) updates["isActive"] = request.IsActive.Value;
        if (request.DisplayOrder.HasValue) updates["displayOrder"] = request.DisplayOrder.Value;

        await docRef.UpdateAsync(updates);

        _logger.LogInformation("Updated achievement {AchievementId}", achievementId);
        return (await GetAchievementAsync(achievementId))!;
    }

    public async Task DeleteAchievementAsync(string achievementId)
    {
        await _firestore.Collection("achievements").Document(achievementId).DeleteAsync();
        _logger.LogInformation("Deleted achievement {AchievementId}", achievementId);
    }

    public async Task<List<AchievementDto>> GetUserAchievementsAsync(string userId)
    {
        var allAchievements = await GetAllAchievementsAsync(activeOnly: true);
        var userAchievements = await GetUserUnlockedAchievementsAsync(userId);
        var progress = await GetUserProgressAsync(userId);

        return allAchievements.Select(achievement =>
        {
            var unlocked = userAchievements.FirstOrDefault(ua => ua.AchievementId == achievement.Id);
            var prog = progress.FirstOrDefault(p => p.AchievementId == achievement.Id);

            return new AchievementDto
            {
                Id = achievement.Id,
                Title = achievement.Title,
                Description = achievement.Description,
                Icon = achievement.Icon,
                Type = achievement.Type.ToString(),
                Condition = achievement.Condition,
                Reward = achievement.Reward,
                IsActive = achievement.IsActive,
                DisplayOrder = achievement.DisplayOrder,
                IsUnlocked = unlocked != null,
                UnlockedAt = unlocked?.UnlockedAt,
                CurrentProgress = prog?.CurrentValue,
                TargetProgress = prog?.TargetValue
            };
        }).ToList();
    }

    public async Task<UnlockAchievementResponse> CheckAndUnlockAchievementsAsync(string userId, GameSession session)
    {
        var allAchievements = await GetAllAchievementsAsync(activeOnly: true);
        var userProgress = await _gameService.GetGameProgressAsync(userId, session.GameType);
        var newlyUnlocked = new List<AchievementDto>();
        var totalExp = 0;
        var totalCoins = 0;

        foreach (var achievement in allAchievements)
        {
            // Skip if already unlocked
            if (await IsAchievementUnlockedAsync(userId, achievement.Id))
            {
                continue;
            }

            // Check if achievement is unlocked
            if (await CheckAchievementConditionAsync(userId, achievement, session, userProgress))
            {
                await UnlockAchievementAsync(userId, achievement.Id);

                newlyUnlocked.Add(new AchievementDto
                {
                    Id = achievement.Id,
                    Title = achievement.Title,
                    Description = achievement.Description,
                    Icon = achievement.Icon,
                    Type = achievement.Type.ToString(),
                    Condition = achievement.Condition,
                    Reward = achievement.Reward,
                    IsActive = achievement.IsActive,
                    DisplayOrder = achievement.DisplayOrder,
                    IsUnlocked = true,
                    UnlockedAt = DateTime.UtcNow
                });

                totalExp += achievement.Reward.Experience;
                totalCoins += achievement.Reward.Coins;
            }
        }

        _logger.LogInformation("User {UserId} unlocked {Count} achievements", userId, newlyUnlocked.Count);

        return new UnlockAchievementResponse
        {
            NewlyUnlocked = newlyUnlocked,
            TotalRewards = new AchievementReward
            {
                Experience = totalExp,
                Coins = totalCoins
            }
        };
    }

    public async Task<AchievementDto> ClaimAchievementRewardAsync(string userId, string achievementId)
    {
        var docId = $"{userId}_{achievementId}";
        var docRef = _firestore.Collection("userAchievements").Document(docId);

        await docRef.UpdateAsync(new Dictionary<string, object>
        {
            { "isClaimed", true },
            { "claimedAt", Timestamp.FromDateTime(DateTime.UtcNow) }
        });

        var achievement = await GetAchievementAsync(achievementId);
        return new AchievementDto
        {
            Id = achievement!.Id,
            Title = achievement.Title,
            Description = achievement.Description,
            Icon = achievement.Icon,
            Type = achievement.Type.ToString(),
            Condition = achievement.Condition,
            Reward = achievement.Reward,
            IsActive = achievement.IsActive,
            DisplayOrder = achievement.DisplayOrder,
            IsUnlocked = true
        };
    }

    public async Task<List<AchievementProgress>> GetUserProgressAsync(string userId)
    {
        var query = _firestore.Collection("achievementProgress")
            .WhereEqualTo("userId", userId);

        var snapshot = await query.GetSnapshotAsync();
        var progress = new List<AchievementProgress>();

        foreach (var doc in snapshot.Documents)
        {
            var data = doc.ToDictionary();
            progress.Add(new AchievementProgress
            {
                UserId = data["userId"].ToString()!,
                AchievementId = data["achievementId"].ToString()!,
                CurrentValue = Convert.ToInt32(data["currentValue"]),
                TargetValue = Convert.ToInt32(data["targetValue"]),
                UpdatedAt = ((Timestamp)data["updatedAt"]).ToDateTime()
            });
        }

        return progress;
    }

    public async Task UpdateProgressAsync(string userId, string achievementId, int currentValue)
    {
        var achievement = await GetAchievementAsync(achievementId);
        if (achievement == null) return;

        var targetValue = GetTargetValueFromCondition(achievement.Condition);
        var docId = $"{userId}_{achievementId}";
        var docRef = _firestore.Collection("achievementProgress").Document(docId);

        await docRef.SetAsync(new
        {
            userId,
            achievementId,
            currentValue,
            targetValue,
            updatedAt = Timestamp.FromDateTime(DateTime.UtcNow)
        }, SetOptions.MergeAll);
    }

    // Helper methods

    private Achievement ParseAchievement(DocumentSnapshot doc)
    {
        var data = doc.ToDictionary();
        return new Achievement
        {
            Id = doc.Id,
            Title = data["title"].ToString()!,
            Description = data["description"].ToString()!,
            Icon = data["icon"].ToString()!,
            Type = Enum.Parse<AchievementType>(data["type"].ToString()!),
            Condition = data["condition"] as AchievementCondition ?? new AchievementCondition { Type = ConditionType.CompleteCourse },
            Reward = data["reward"] as AchievementReward ?? new AchievementReward { Experience = 0, Coins = 0 },
            IsActive = data.ContainsKey("isActive") && Convert.ToBoolean(data["isActive"]),
            DisplayOrder = data.ContainsKey("displayOrder") ? Convert.ToInt32(data["displayOrder"]) : 0,
            CreatedAt = data.ContainsKey("createdAt") ? ((Timestamp)data["createdAt"]).ToDateTime() : DateTime.UtcNow,
            UpdatedAt = data.ContainsKey("updatedAt") ? ((Timestamp)data["updatedAt"]).ToDateTime() : DateTime.UtcNow
        };
    }

    private async Task<List<UserAchievement>> GetUserUnlockedAchievementsAsync(string userId)
    {
        var query = _firestore.Collection("userAchievements")
            .WhereEqualTo("userId", userId);

        var snapshot = await query.GetSnapshotAsync();
        var userAchievements = new List<UserAchievement>();

        foreach (var doc in snapshot.Documents)
        {
            var data = doc.ToDictionary();
            userAchievements.Add(new UserAchievement
            {
                Id = doc.Id,
                UserId = data["userId"].ToString()!,
                AchievementId = data["achievementId"].ToString()!,
                UnlockedAt = ((Timestamp)data["unlockedAt"]).ToDateTime(),
                IsClaimed = data.ContainsKey("isClaimed") && Convert.ToBoolean(data["isClaimed"]),
                ClaimedAt = data.ContainsKey("claimedAt") ? ((Timestamp)data["claimedAt"]).ToDateTime() : null
            });
        }

        return userAchievements;
    }

    private async Task<bool> IsAchievementUnlockedAsync(string userId, string achievementId)
    {
        var docId = $"{userId}_{achievementId}";
        var docRef = _firestore.Collection("userAchievements").Document(docId);
        var snapshot = await docRef.GetSnapshotAsync();
        return snapshot.Exists;
    }

    private async Task UnlockAchievementAsync(string userId, string achievementId)
    {
        var docId = $"{userId}_{achievementId}";
        var docRef = _firestore.Collection("userAchievements").Document(docId);

        await docRef.SetAsync(new
        {
            userId,
            achievementId,
            unlockedAt = Timestamp.FromDateTime(DateTime.UtcNow),
            isClaimed = false
        });
    }

    private async Task<bool> CheckAchievementConditionAsync(
        string userId,
        Achievement achievement,
        GameSession session,
        GameProgress? progress)
    {
        var condition = achievement.Condition;

        return condition.Type switch
        {
            ConditionType.CompleteCourse => session.CourseId == condition.CourseId,

            ConditionType.CompleteWithStars => session.CourseId == condition.CourseId &&
                                                session.Stars >= (condition.MinStars ?? 0),

            ConditionType.ReachWpm => session.Wpm.HasValue &&
                                      session.Wpm.Value >= (condition.MinWpm ?? 0),

            ConditionType.ReachAccuracy => session.Accuracy >= (condition.MinAccuracy ?? 0),

            ConditionType.TotalGamesPlayed => progress != null &&
                                              progress.TotalPlays >= (condition.TotalGames ?? 0),

            ConditionType.TotalStarsCollected => progress != null &&
                                                 progress.TotalStars >= (condition.TotalStars ?? 0),

            _ => false
        };
    }

    private int GetTargetValueFromCondition(AchievementCondition condition)
    {
        return condition.Type switch
        {
            ConditionType.TotalGamesPlayed => condition.TotalGames ?? 0,
            ConditionType.TotalStarsCollected => condition.TotalStars ?? 0,
            ConditionType.ReachWpm => condition.MinWpm ?? 0,
            ConditionType.ReachAccuracy => (int)(condition.MinAccuracy ?? 0),
            _ => 1
        };
    }
}
