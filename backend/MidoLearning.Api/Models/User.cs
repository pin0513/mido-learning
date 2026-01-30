namespace MidoLearning.Api.Models;

public record User
{
    public required string Id { get; init; }
    public required string Email { get; init; }
    public string? DisplayName { get; init; }
    public string? PhotoUrl { get; init; }
    public string Role { get; init; } = "member";
    public DateTime CreatedAt { get; init; } = DateTime.UtcNow;
    public DateTime? LastLoginAt { get; init; }
}
