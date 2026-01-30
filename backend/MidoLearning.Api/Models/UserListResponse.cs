namespace MidoLearning.Api.Models;

/// <summary>
/// Response DTO for paginated user list
/// </summary>
public record UserListResponse(
    IEnumerable<UserDto> Users,
    int Total,
    int Page,
    int Limit
);

/// <summary>
/// User data transfer object for admin user list
/// </summary>
public record UserDto(
    string Uid,
    string Email,
    string? DisplayName,
    string Role,
    DateTime CreatedAt,
    DateTime? LastLoginAt
);

/// <summary>
/// Result from Firebase service for user listing
/// </summary>
public record UserListResult(
    IEnumerable<UserDto> Users,
    int Total
);

/// <summary>
/// Request DTO for updating user role
/// </summary>
public record UpdateRoleRequest(string Role);
