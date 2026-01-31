using System.Reflection;
using System.Security.Claims;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging;
using MidoLearning.Api.Endpoints;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;
using Moq;

namespace MidoLearning.Api.Tests.Endpoints;

public class AdminUsersEndpointsTests
{
    private readonly Mock<IFirebaseService> _mockFirebaseService;
    private readonly Mock<ILogger<Program>> _mockLogger;

    public AdminUsersEndpointsTests()
    {
        _mockFirebaseService = new Mock<IFirebaseService>();
        _mockLogger = new Mock<ILogger<Program>>();
    }

    [Fact]
    public async Task GetUsers_AsAdmin_ReturnsUserList()
    {
        // Arrange
        var testUsers = new List<UserDto>
        {
            new("user1", "user1@test.com", "User One", "member", DateTime.UtcNow.AddDays(-10), DateTime.UtcNow),
            new("user2", "user2@test.com", "User Two", "teacher", DateTime.UtcNow.AddDays(-5), DateTime.UtcNow)
        };

        _mockFirebaseService
            .Setup(s => s.ListUsersAsync(1, 20, null, null))
            .ReturnsAsync(new UserListResult(testUsers, 2));

        // Act
        var result = await InvokeGetUsers(page: 1, limit: 20, role: null, search: null);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<UserListResponse>>>();
        var okResult = (Ok<ApiResponse<UserListResponse>>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Data.Should().NotBeNull();
        okResult.Value.Data!.Users.Should().HaveCount(2);
        okResult.Value.Data.Total.Should().Be(2);
        okResult.Value.Data.Page.Should().Be(1);
        okResult.Value.Data.Limit.Should().Be(20);
    }

    [Fact]
    public async Task GetUsers_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        var testUsers = new List<UserDto>
        {
            new("user3", "user3@test.com", "User Three", "member", DateTime.UtcNow.AddDays(-3), DateTime.UtcNow)
        };

        _mockFirebaseService
            .Setup(s => s.ListUsersAsync(2, 10, null, null))
            .ReturnsAsync(new UserListResult(testUsers, 25));

        // Act
        var result = await InvokeGetUsers(page: 2, limit: 10, role: null, search: null);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<UserListResponse>>>();
        var okResult = (Ok<ApiResponse<UserListResponse>>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Data.Should().NotBeNull();
        okResult.Value.Data!.Page.Should().Be(2);
        okResult.Value.Data.Limit.Should().Be(10);
        okResult.Value.Data.Total.Should().Be(25);

        _mockFirebaseService.Verify(s => s.ListUsersAsync(2, 10, null, null), Times.Once);
    }

    [Fact]
    public async Task GetUsers_WithRoleFilter_ReturnsFilteredUsers()
    {
        // Arrange
        var teacherUsers = new List<UserDto>
        {
            new("teacher1", "teacher1@test.com", "Teacher One", "teacher", DateTime.UtcNow.AddDays(-10), DateTime.UtcNow),
            new("teacher2", "teacher2@test.com", "Teacher Two", "teacher", DateTime.UtcNow.AddDays(-5), DateTime.UtcNow)
        };

        _mockFirebaseService
            .Setup(s => s.ListUsersAsync(1, 20, "teacher", null))
            .ReturnsAsync(new UserListResult(teacherUsers, 2));

        // Act
        var result = await InvokeGetUsers(page: 1, limit: 20, role: "teacher", search: null);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<UserListResponse>>>();
        var okResult = (Ok<ApiResponse<UserListResponse>>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Data.Should().NotBeNull();
        okResult.Value.Data!.Users.Should().AllSatisfy(u => u.Role.Should().Be("teacher"));

        _mockFirebaseService.Verify(s => s.ListUsersAsync(1, 20, "teacher", null), Times.Once);
    }

    [Fact]
    public async Task GetUsers_WithSearchFilter_ReturnsFilteredUsers()
    {
        // Arrange
        var filteredUsers = new List<UserDto>
        {
            new("user1", "user1@gmail.com", "Gmail User", "member", DateTime.UtcNow.AddDays(-10), DateTime.UtcNow)
        };

        _mockFirebaseService
            .Setup(s => s.ListUsersAsync(1, 20, null, "@gmail"))
            .ReturnsAsync(new UserListResult(filteredUsers, 1));

        // Act
        var result = await InvokeGetUsers(page: 1, limit: 20, role: null, search: "@gmail");

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<UserListResponse>>>();
        var okResult = (Ok<ApiResponse<UserListResponse>>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Data.Should().NotBeNull();
        okResult.Value.Data!.Users.Should().HaveCount(1);

        _mockFirebaseService.Verify(s => s.ListUsersAsync(1, 20, null, "@gmail"), Times.Once);
    }

    [Fact]
    public async Task GetUsers_ServiceThrowsException_ReturnsBadRequest()
    {
        // Arrange
        _mockFirebaseService
            .Setup(s => s.ListUsersAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .ThrowsAsync(new Exception("Firebase error"));

        // Act
        var result = await InvokeGetUsers(page: 1, limit: 20, role: null, search: null);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badResult = (BadRequest<ApiResponse>)result;
        badResult.Value.Should().NotBeNull();
        badResult.Value!.Success.Should().BeFalse();
        badResult.Value.Message.Should().Contain("Failed to list users");
    }

    [Fact]
    public async Task UpdateUserRole_AsAdmin_ReturnsSuccess()
    {
        // Arrange
        _mockFirebaseService
            .Setup(s => s.UpdateUserRoleAsync("target-uid", "teacher"))
            .Returns(Task.CompletedTask);

        var request = new UpdateRoleRequest("teacher");

        // Act
        var result = await InvokeUpdateUserRole("target-uid", request);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse>>();
        var okResult = (Ok<ApiResponse>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Message.Should().Contain("teacher");

        _mockFirebaseService.Verify(s => s.UpdateUserRoleAsync("target-uid", "teacher"), Times.Once);
    }

    [Fact]
    public async Task UpdateUserRole_InvalidRole_ReturnsBadRequest()
    {
        // Arrange
        var request = new UpdateRoleRequest("invalid_role");

        // Act
        var result = await InvokeUpdateUserRole("target-uid", request);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badResult = (BadRequest<ApiResponse>)result;
        badResult.Value.Should().NotBeNull();
        badResult.Value!.Success.Should().BeFalse();
        badResult.Value.Message.Should().Contain("Invalid role");

        _mockFirebaseService.Verify(
            s => s.UpdateUserRoleAsync(It.IsAny<string>(), It.IsAny<string>()),
            Times.Never);
    }

    [Theory]
    [InlineData("student")]
    [InlineData("teacher")]
    [InlineData("admin")]
    [InlineData("Student")]  // Test case insensitivity
    [InlineData("TEACHER")]
    [InlineData("Admin")]
    public async Task UpdateUserRole_ValidRoles_ReturnsSuccess(string role)
    {
        // Arrange
        _mockFirebaseService
            .Setup(s => s.UpdateUserRoleAsync(It.IsAny<string>(), It.IsAny<string>()))
            .Returns(Task.CompletedTask);

        var request = new UpdateRoleRequest(role);

        // Act
        var result = await InvokeUpdateUserRole("user-uid", request);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse>>();
        var okResult = (Ok<ApiResponse>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
    }

    [Fact]
    public async Task UpdateUserRole_ServiceThrowsException_ReturnsBadRequest()
    {
        // Arrange
        _mockFirebaseService
            .Setup(s => s.UpdateUserRoleAsync(It.IsAny<string>(), It.IsAny<string>()))
            .ThrowsAsync(new Exception("Firebase error"));

        var request = new UpdateRoleRequest("teacher");

        // Act
        var result = await InvokeUpdateUserRole("target-uid", request);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badResult = (BadRequest<ApiResponse>)result;
        badResult.Value.Should().NotBeNull();
        badResult.Value!.Success.Should().BeFalse();
        badResult.Value.Message.Should().Contain("Failed to update user role");
    }

    private async Task<IResult> InvokeGetUsers(int page, int limit, string? role, string? search)
    {
        var endpointsType = typeof(AdminEndpoints);
        var method = endpointsType.GetMethod(
            "GetUsers",
            BindingFlags.NonPublic | BindingFlags.Static);

        if (method is null)
        {
            throw new InvalidOperationException("GetUsers method not found");
        }

        var task = (Task<IResult>)method.Invoke(
            null,
            new object?[]
            {
                _mockFirebaseService.Object,
                _mockLogger.Object,
                page,
                limit,
                role,
                search
            })!;

        return await task;
    }

    private async Task<IResult> InvokeUpdateUserRole(string uid, UpdateRoleRequest request)
    {
        var endpointsType = typeof(AdminEndpoints);
        var method = endpointsType.GetMethod(
            "UpdateUserRole",
            BindingFlags.NonPublic | BindingFlags.Static);

        if (method is null)
        {
            throw new InvalidOperationException("UpdateUserRole method not found");
        }

        var task = (Task<IResult>)method.Invoke(
            null,
            new object[]
            {
                uid,
                request,
                _mockFirebaseService.Object,
                _mockLogger.Object
            })!;

        return await task;
    }
}
