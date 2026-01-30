using System.Security.Claims;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Endpoints;

public static class AdminEndpoints
{
    private static readonly HashSet<string> ValidRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "student", "teacher", "admin"
    };

    // Protected admin email that cannot be deleted
    private const string ProtectedAdminEmail = "pin0513@gmail.com";

    public static void MapAdminEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/admin")
            .WithTags("Admin")
            .RequireAuthorization("AdminOnly");

        group.MapPost("/set-admin/{uid}", SetAdminRole)
            .WithName("SetAdminRole")
            .WithOpenApi();

        group.MapDelete("/remove-admin/{uid}", RemoveAdminRole)
            .WithName("RemoveAdminRole")
            .WithOpenApi();

        group.MapGet("/stats", GetStats)
            .WithName("GetAdminStats")
            .WithOpenApi();

        group.MapGet("/users", GetUsers)
            .WithName("GetAdminUsers")
            .WithOpenApi();

        group.MapPatch("/users/{uid}/role", UpdateUserRole)
            .WithName("UpdateUserRole")
            .WithOpenApi();

        group.MapDelete("/users/{uid}", DeleteUser)
            .WithName("DeleteUser")
            .WithOpenApi();
    }

    private static async Task<IResult> SetAdminRole(
        string uid,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            await firebaseService.SetCustomClaimsAsync(uid, new Dictionary<string, object>
            {
                { "admin", true }
            });

            logger.LogInformation("Admin role granted to user {Uid}", uid);
            return Results.Ok(ApiResponse.Ok($"Admin role granted to user {uid}"));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to set admin role: {ex.Message}"));
        }
    }

    private static async Task<IResult> RemoveAdminRole(
        string uid,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            await firebaseService.SetCustomClaimsAsync(uid, new Dictionary<string, object>
            {
                { "admin", false }
            });

            logger.LogInformation("Admin role removed from user {Uid}", uid);
            return Results.Ok(ApiResponse.Ok($"Admin role removed from user {uid}"));
        }
        catch (Exception ex)
        {
            return Results.BadRequest(ApiResponse.Fail($"Failed to remove admin role: {ex.Message}"));
        }
    }

    private static IResult GetStats()
    {
        var response = ApiResponse<object>.Ok(new
        {
            TotalUsers = 0,
            ActiveCourses = 0,
            TotalEnrollments = 0,
            CompletionRate = 0.0
        });

        return Results.Ok(response);
    }

    private static async Task<IResult> GetUsers(
        IFirebaseService firebaseService,
        ILogger<Program> logger,
        int page = 1,
        int limit = 20,
        string? role = null,
        string? search = null)
    {
        try
        {
            var result = await firebaseService.ListUsersAsync(page, limit, role, search);

            var response = ApiResponse<UserListResponse>.Ok(new UserListResponse(
                result.Users,
                result.Total,
                page,
                limit
            ));

            return Results.Ok(response);
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to list users");
            return Results.BadRequest(ApiResponse.Fail($"Failed to list users: {ex.Message}"));
        }
    }

    private static async Task<IResult> UpdateUserRole(
        string uid,
        UpdateRoleRequest request,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        if (!ValidRoles.Contains(request.Role))
        {
            return Results.BadRequest(ApiResponse.Fail($"Invalid role: {request.Role}. Valid roles are: {string.Join(", ", ValidRoles)}"));
        }

        try
        {
            await firebaseService.UpdateUserRoleAsync(uid, request.Role);

            logger.LogInformation("User {Uid} role updated to {Role}", uid, request.Role);
            return Results.Ok(ApiResponse.Ok($"使用者角色已更新為 {request.Role}"));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to update user role for {Uid}", uid);
            return Results.BadRequest(ApiResponse.Fail($"Failed to update user role: {ex.Message}"));
        }
    }

    private static async Task<IResult> DeleteUser(
        string uid,
        IFirebaseService firebaseService,
        ILogger<Program> logger)
    {
        try
        {
            // Get user to check if it's protected
            var user = await firebaseService.GetUserAsync(uid);
            if (user.Email?.Equals(ProtectedAdminEmail, StringComparison.OrdinalIgnoreCase) == true)
            {
                return Results.BadRequest(ApiResponse.Fail("無法刪除系統管理員帳號"));
            }

            await firebaseService.DeleteUserAsync(uid);

            logger.LogInformation("User {Uid} deleted", uid);
            return Results.Ok(ApiResponse.Ok("用戶已成功刪除"));
        }
        catch (Exception ex)
        {
            logger.LogError(ex, "Failed to delete user {Uid}", uid);
            return Results.BadRequest(ApiResponse.Fail($"刪除用戶失敗: {ex.Message}"));
        }
    }
}
