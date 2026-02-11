using MidoLearning.Api.Models;

namespace MidoLearning.Api.Services;

public interface IGameService
{
    Task<GameSession> CreateGameSessionAsync(string userId, string courseId);
    Task<GameSession?> GetGameSessionAsync(string sessionId);
    Task SaveGameSessionAsync(GameSession session);
    Task<GameProgress?> GetGameProgressAsync(string userId, string gameType);
    Task UpdateGameProgressAsync(string userId, GameSession session);
    Task<List<LeaderboardEntry>> GetLeaderboardAsync(string gameType, int limit = 10);
    Task<CompleteGameResponse> CalculateRewardsAsync(string userId, GameSession session);
    Task<List<GameSessionDto>> GetRecentGameSessionsAsync(string userId, int limit = 10);
}
