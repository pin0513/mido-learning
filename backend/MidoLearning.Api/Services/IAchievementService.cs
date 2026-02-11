using MidoLearning.Api.Models;

namespace MidoLearning.Api.Services;

public interface IAchievementService
{
    // Achievement CRUD
    Task<Achievement> CreateAchievementAsync(CreateAchievementRequest request);
    Task<Achievement?> GetAchievementAsync(string achievementId);
    Task<List<Achievement>> GetAllAchievementsAsync(bool activeOnly = true);
    Task<Achievement> UpdateAchievementAsync(string achievementId, UpdateAchievementRequest request);
    Task DeleteAchievementAsync(string achievementId);

    // User Achievement Management
    Task<List<AchievementDto>> GetUserAchievementsAsync(string userId);
    Task<UnlockAchievementResponse> CheckAndUnlockAchievementsAsync(string userId, GameSession session);
    Task<AchievementDto> ClaimAchievementRewardAsync(string userId, string achievementId);

    // Progress Tracking
    Task<List<AchievementProgress>> GetUserProgressAsync(string userId);
    Task UpdateProgressAsync(string userId, string achievementId, int currentValue);
}
