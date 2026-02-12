using System.Security.Claims;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class GameEndpoints
{
    public static void MapGameEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/games")
            .WithTags("Games")
            .RequireAuthorization();

        group.MapPost("/start", StartGame)
            .WithName("StartGame")
            .WithOpenApi();

        group.MapPost("/complete", CompleteGame)
            .WithName("CompleteGame")
            .WithOpenApi();

        group.MapGet("/progress", GetProgress)
            .WithName("GetGameProgress")
            .WithOpenApi();

        group.MapGet("/leaderboard", GetLeaderboard)
            .WithName("GetLeaderboard")
            .WithOpenApi();

        group.MapGet("/sessions/recent", GetRecentSessions)
            .WithName("GetRecentGameSessions")
            .WithOpenApi();
    }

    private static async Task<IResult> StartGame(
        StartGameRequest request,
        ClaimsPrincipal user,
        IGameService gameService)
    {
        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(uid))
        {
            return Results.Unauthorized();
        }

        try
        {
            var session = await gameService.CreateGameSessionAsync(uid, request.CourseId);

            // TODO: Get course data to populate response
            var response = ApiResponse<StartGameResponse>.Ok(new StartGameResponse
            {
                SessionId = session.Id,
                CourseId = session.CourseId,
                GameType = session.GameType,
                Level = session.Level,
                TimeLimit = 60, // TODO: Get from course data
                StartedAt = session.CreatedAt
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to start game: {ex.Message}"));
        }
    }

    private static async Task<IResult> CompleteGame(
        CompleteGameRequest request,
        ClaimsPrincipal user,
        IGameService gameService,
        IAchievementService achievementService)
    {
        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(uid))
        {
            return Results.Unauthorized();
        }

        try
        {
            // Verify session exists and belongs to user
            var session = await gameService.GetGameSessionAsync(request.SessionId);
            if (session == null)
            {
                return Results.NotFound(ApiResponse.Fail("Game session not found"));
            }

            if (session.UserId != uid)
            {
                return Results.Forbid();
            }

            // Update session with results
            var completedSession = session with
            {
                Score = request.Score,
                Wpm = request.Wpm,
                Accuracy = request.Accuracy,
                Stars = request.Stars,
                TimeSpent = request.TimeSpent,
                CorrectChars = request.CorrectChars,
                TotalChars = request.TotalChars
            };

            await gameService.SaveGameSessionAsync(completedSession);

            // Update game progress
            await gameService.UpdateGameProgressAsync(uid, completedSession);

            // Calculate rewards
            var rewards = await gameService.CalculateRewardsAsync(uid, completedSession);

            // Check and unlock achievements
            var achievementResult = await achievementService.CheckAndUnlockAchievementsAsync(uid, completedSession);

            // Combine rewards with achievement rewards
            var totalExp = rewards.ExperienceGained + achievementResult.TotalRewards.Experience;
            var totalCoins = rewards.CoinsEarned + achievementResult.TotalRewards.Coins;

            var finalRewards = rewards with
            {
                ExperienceGained = totalExp,
                CoinsEarned = totalCoins,
                Achievements = achievementResult.NewlyUnlocked
                    .Select(a => new AchievementSummary
                    {
                        Id = a.Id,
                        Title = a.Title,
                        Icon = a.Icon
                    })
                    .ToList()
            };

            var response = ApiResponse<CompleteGameResponse>.Ok(finalRewards);
            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to complete game: {ex.Message}"));
        }
    }

    private static async Task<IResult> GetProgress(
        ClaimsPrincipal user,
        IGameService gameService,
        string gameType = "typing")
    {
        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(uid))
        {
            return Results.Unauthorized();
        }

        try
        {
            var progress = await gameService.GetGameProgressAsync(uid, gameType);

            if (progress == null)
            {
                // Return empty progress
                progress = new GameProgress
                {
                    UserId = uid,
                    GameType = gameType,
                    TotalPlays = 0,
                    BestScore = 0,
                    BestAccuracy = 0,
                    TotalStars = 0,
                    CompletedLevels = new List<int>()
                };
            }

            var response = ApiResponse<GameProgress>.Ok(progress);
            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to get progress: {ex.Message}"));
        }
    }

    private static async Task<IResult> GetLeaderboard(
        IGameService gameService,
        string gameType = "typing",
        int limit = 10)
    {
        try
        {
            var leaderboard = await gameService.GetLeaderboardAsync(gameType, limit);

            var response = ApiResponse<LeaderboardResponse>.Ok(new LeaderboardResponse
            {
                Leaderboard = leaderboard,
                YourRank = null // TODO: Calculate user's rank
            });

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to get leaderboard: {ex.Message}"));
        }
    }

    private static async Task<IResult> GetRecentSessions(
        ClaimsPrincipal user,
        IGameService gameService,
        int limit = 10)
    {
        var uid = user.FindFirstValue(ClaimTypes.NameIdentifier);

        if (string.IsNullOrEmpty(uid))
        {
            return Results.Unauthorized();
        }

        try
        {
            var sessions = await gameService.GetRecentGameSessionsAsync(uid, limit);
            var response = ApiResponse<List<GameSessionDto>>.Ok(sessions);
            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to get recent sessions: {ex.Message}"));
        }
    }
}
