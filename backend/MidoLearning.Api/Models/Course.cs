namespace MidoLearning.Api.Models;

public record CourseDto
{
    public required string Id { get; init; }
    public required string Title { get; init; }
    public required string Description { get; init; }
    public required string Instructor { get; init; }
    public required string Thumbnail { get; init; }
    public required int Price { get; init; }
    public required string Status { get; init; }  // draft, published
    public required string Category { get; init; }
    public required string Type { get; init; }  // video, article, game
    public GameConfigDto? GameConfig { get; init; }
    public DateTime CreatedAt { get; init; }
    public DateTime UpdatedAt { get; init; }
}

public record GameConfigDto
{
    public required string GameType { get; init; }  // typing, math, memory
    public required int Level { get; init; }
    public required int TimeLimit { get; init; }
    public int? TargetWPM { get; init; }  // Only for typing games
    public required List<GameQuestionDto> Questions { get; init; }
}

public record GameQuestionDto
{
    public required string Text { get; init; }
    public string? Difficulty { get; init; }  // easy, medium, hard
}
