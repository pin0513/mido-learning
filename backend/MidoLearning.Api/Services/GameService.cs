using Google.Cloud.Firestore;
using MidoLearning.Api.Models;

namespace MidoLearning.Api.Services;

public class GameService : IGameService
{
    private readonly FirestoreDb _firestore;
    private readonly ILogger<GameService> _logger;

    public GameService(IConfiguration configuration, ILogger<GameService> logger)
    {
        _logger = logger;
        var projectId = configuration["Firebase:ProjectId"];
        _firestore = FirestoreDb.Create(projectId);
    }

    public async Task<GameSession> CreateGameSessionAsync(string userId, string courseId)
    {
        var session = new GameSession
        {
            Id = Guid.NewGuid().ToString(),
            UserId = userId,
            CourseId = courseId,
            GameType = "typing", // TODO: Get from course data
            Level = 1, // TODO: Get from course data
            Score = 0,
            Accuracy = 0,
            Stars = 0,
            TimeSpent = 0,
            CreatedAt = DateTime.UtcNow
        };

        var docRef = _firestore.Collection("gameSessions").Document(session.Id);
        await docRef.SetAsync(new
        {
            userId = session.UserId,
            courseId = session.CourseId,
            gameType = session.GameType,
            level = session.Level,
            score = session.Score,
            accuracy = session.Accuracy,
            stars = session.Stars,
            timeSpent = session.TimeSpent,
            createdAt = Timestamp.FromDateTime(session.CreatedAt)
        });

        _logger.LogInformation("Created game session {SessionId} for user {UserId}", session.Id, userId);
        return session;
    }

    public async Task<GameSession?> GetGameSessionAsync(string sessionId)
    {
        var docRef = _firestore.Collection("gameSessions").Document(sessionId);
        var snapshot = await docRef.GetSnapshotAsync();

        if (!snapshot.Exists)
        {
            return null;
        }

        var data = snapshot.ToDictionary();
        return new GameSession
        {
            Id = snapshot.Id,
            UserId = data["userId"].ToString()!,
            CourseId = data["courseId"].ToString()!,
            GameType = data["gameType"].ToString()!,
            Level = Convert.ToInt32(data["level"]),
            Score = Convert.ToInt32(data["score"]),
            Wpm = data.ContainsKey("wpm") ? Convert.ToDouble(data["wpm"]) : null,
            Accuracy = Convert.ToDouble(data["accuracy"]),
            Stars = Convert.ToInt32(data["stars"]),
            TimeSpent = Convert.ToInt32(data["timeSpent"]),
            CorrectChars = data.ContainsKey("correctChars") ? Convert.ToInt32(data["correctChars"]) : null,
            TotalChars = data.ContainsKey("totalChars") ? Convert.ToInt32(data["totalChars"]) : null,
            CreatedAt = ((Timestamp)data["createdAt"]).ToDateTime()
        };
    }

    public async Task SaveGameSessionAsync(GameSession session)
    {
        var docRef = _firestore.Collection("gameSessions").Document(session.Id);
        await docRef.SetAsync(new
        {
            userId = session.UserId,
            courseId = session.CourseId,
            gameType = session.GameType,
            level = session.Level,
            score = session.Score,
            wpm = session.Wpm,
            accuracy = session.Accuracy,
            stars = session.Stars,
            timeSpent = session.TimeSpent,
            correctChars = session.CorrectChars,
            totalChars = session.TotalChars,
            createdAt = Timestamp.FromDateTime(session.CreatedAt)
        }, SetOptions.MergeAll);

        _logger.LogInformation("Saved game session {SessionId}", session.Id);
    }

    public async Task<GameProgress?> GetGameProgressAsync(string userId, string gameType)
    {
        var docId = $"{userId}_{gameType}";
        var docRef = _firestore.Collection("gameProgress").Document(docId);
        var snapshot = await docRef.GetSnapshotAsync();

        if (!snapshot.Exists)
        {
            return null;
        }

        var data = snapshot.ToDictionary();
        return new GameProgress
        {
            UserId = data["userId"].ToString()!,
            GameType = data["gameType"].ToString()!,
            TotalPlays = Convert.ToInt32(data["totalPlays"]),
            BestScore = Convert.ToInt32(data["bestScore"]),
            BestWpm = data.ContainsKey("bestWpm") ? Convert.ToDouble(data["bestWpm"]) : null,
            BestAccuracy = Convert.ToDouble(data["bestAccuracy"]),
            TotalStars = Convert.ToInt32(data["totalStars"]),
            CompletedLevels = data.ContainsKey("completedLevels")
                ? ((List<object>)data["completedLevels"]).Select(x => Convert.ToInt32(x)).ToList()
                : new List<int>(),
            UpdatedAt = ((Timestamp)data["updatedAt"]).ToDateTime()
        };
    }

    public async Task UpdateGameProgressAsync(string userId, GameSession session)
    {
        var docId = $"{userId}_{session.GameType}";
        var docRef = _firestore.Collection("gameProgress").Document(docId);

        // Get existing progress
        var snapshot = await docRef.GetSnapshotAsync();
        var exists = snapshot.Exists;

        if (!exists)
        {
            // Create new progress
            await docRef.SetAsync(new
            {
                userId,
                gameType = session.GameType,
                totalPlays = 1,
                bestScore = session.Score,
                bestWpm = session.Wpm,
                bestAccuracy = session.Accuracy,
                totalStars = session.Stars,
                completedLevels = new List<int> { session.Level },
                updatedAt = Timestamp.FromDateTime(DateTime.UtcNow)
            });
        }
        else
        {
            // Update existing progress
            var data = snapshot.ToDictionary();
            var currentBestScore = Convert.ToInt32(data["bestScore"]);
            var currentBestWpm = data.ContainsKey("bestWpm") ? Convert.ToDouble(data["bestWpm"]) : 0;
            var currentBestAccuracy = Convert.ToDouble(data["bestAccuracy"]);
            var currentTotalStars = Convert.ToInt32(data["totalStars"]);
            var completedLevels = data.ContainsKey("completedLevels")
                ? ((List<object>)data["completedLevels"]).Select(x => Convert.ToInt32(x)).ToList()
                : new List<int>();

            if (!completedLevels.Contains(session.Level))
            {
                completedLevels.Add(session.Level);
            }

            await docRef.UpdateAsync(new Dictionary<string, object>
            {
                { "totalPlays", FieldValue.Increment(1) },
                { "bestScore", Math.Max(currentBestScore, session.Score) },
                { "bestWpm", session.Wpm.HasValue ? Math.Max(currentBestWpm, session.Wpm.Value) : currentBestWpm },
                { "bestAccuracy", Math.Max(currentBestAccuracy, session.Accuracy) },
                { "totalStars", currentTotalStars + session.Stars },
                { "completedLevels", completedLevels },
                { "updatedAt", Timestamp.FromDateTime(DateTime.UtcNow) }
            });
        }

        _logger.LogInformation("Updated game progress for user {UserId}, game {GameType}", userId, session.GameType);
    }

    public async Task<List<LeaderboardEntry>> GetLeaderboardAsync(string gameType, int limit = 10)
    {
        var query = _firestore.Collection("gameProgress")
            .WhereEqualTo("gameType", gameType)
            .OrderByDescending("bestScore")
            .Limit(limit);

        var snapshot = await query.GetSnapshotAsync();
        var leaderboard = new List<LeaderboardEntry>();
        int rank = 1;

        foreach (var doc in snapshot.Documents)
        {
            var data = doc.ToDictionary();
            leaderboard.Add(new LeaderboardEntry
            {
                Rank = rank++,
                UserId = data["userId"].ToString()!,
                DisplayName = data.ContainsKey("displayName") ? data["displayName"].ToString()! : "Anonymous",
                BestScore = Convert.ToInt32(data["bestScore"]),
                BestWpm = data.ContainsKey("bestWpm") ? Convert.ToDouble(data["bestWpm"]) : null
            });
        }

        return leaderboard;
    }

    public async Task<CompleteGameResponse> CalculateRewardsAsync(string userId, GameSession session)
    {
        // Calculate experience based on stars and accuracy
        const int baseExp = 10;
        int expGained = (int)(baseExp * session.Stars * (session.Accuracy / 100));

        // Calculate coins
        const int baseCoins = 5;
        int coinsEarned = baseCoins * session.Stars;

        // TODO: Check for level up logic (requires user level from Firestore)
        // TODO: Check for achievements

        return new CompleteGameResponse
        {
            ExperienceGained = expGained,
            CoinsEarned = coinsEarned,
            LevelUp = false,
            NewLevel = null,
            Achievements = null
        };
    }
}
