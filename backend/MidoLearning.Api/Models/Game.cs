namespace MidoLearning.Api.Models;

public record GameSession
{
    public required string Id { get; init; }
    public required string UserId { get; init; }
    public required string CourseId { get; init; }
    public required string GameType { get; init; }
    public required int Level { get; init; }
    public int Score { get; init; }
    public double? Wpm { get; init; }
    public double Accuracy { get; init; }
    public int Stars { get; init; }
    public int TimeSpent { get; init; }
    public int? CorrectChars { get; init; }
    public int? TotalChars { get; init; }
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
}

public record StartGameRequest
{
    public required string CourseId { get; init; }
}

public record StartGameResponse
{
    public required string SessionId { get; init; }
    public required string CourseId { get; init; }
    public required string GameType { get; init; }
    public required int Level { get; init; }
    public required int TimeLimit { get; init; }
    public DateTime StartedAt { get; init; } = DateTime.UtcNow;
}

public record CompleteGameRequest
{
    public required string SessionId { get; init; }
    public required string CourseId { get; init; }
    public required int Score { get; init; }
    public double? Wpm { get; init; }
    public required double Accuracy { get; init; }
    public required int Stars { get; init; }
    public required int TimeSpent { get; init; }
    public int? CorrectChars { get; init; }
    public int? TotalChars { get; init; }
}

public record CompleteGameResponse
{
    public required int ExperienceGained { get; init; }
    public required int CoinsEarned { get; init; }
    public bool LevelUp { get; init; }
    public int? NewLevel { get; init; }
    public List<Achievement>? Achievements { get; init; }
}

public record Achievement
{
    public required string Id { get; init; }
    public required string Name { get; init; }
    public required string Icon { get; init; }
}

public record GameProgress
{
    public required string UserId { get; init; }
    public required string GameType { get; init; }
    public int TotalPlays { get; init; }
    public int BestScore { get; init; }
    public double? BestWpm { get; init; }
    public double BestAccuracy { get; init; }
    public int TotalStars { get; init; }
    public List<int> CompletedLevels { get; init; } = new();
    public List<GameSession>? RecentSessions { get; init; }
    public DateTime UpdatedAt { get; init; } = DateTime.UtcNow;
}

public record LeaderboardEntry
{
    public required int Rank { get; init; }
    public required string UserId { get; init; }
    public required string DisplayName { get; init; }
    public required int BestScore { get; init; }
    public double? BestWpm { get; init; }
}

public record LeaderboardResponse
{
    public required List<LeaderboardEntry> Leaderboard { get; init; }
    public int? YourRank { get; init; }
}
