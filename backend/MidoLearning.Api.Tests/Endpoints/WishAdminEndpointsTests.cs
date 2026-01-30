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

public class WishAdminEndpointsTests
{
    private readonly Mock<IFirebaseService> _mockFirebaseService;
    private readonly Mock<ILogger<Program>> _mockLogger;

    public WishAdminEndpointsTests()
    {
        _mockFirebaseService = new Mock<IFirebaseService>();
        _mockLogger = new Mock<ILogger<Program>>();
    }

    #region GetWishes Tests

    [Fact]
    public async Task GetWishes_AsAdmin_ReturnsList()
    {
        // Arrange
        var testWishes = new List<WishDto>
        {
            new()
            {
                Id = "wish-001",
                Content = "I want to learn Python",
                Email = "user@example.com",
                Status = "pending",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            },
            new()
            {
                Id = "wish-002",
                Content = "I want to learn JavaScript",
                Email = "user2@example.com",
                Status = "processing",
                CreatedAt = DateTime.UtcNow.AddDays(-2)
            }
        };

        _mockFirebaseService
            .Setup(s => s.GetWishesAsync(1, 20, null, null))
            .ReturnsAsync(new WishListResult(testWishes, 2));

        // Act
        var result = await InvokeGetWishes(page: 1, limit: 20, status: null, search: null);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<WishListResponse>>>();
        var okResult = (Ok<ApiResponse<WishListResponse>>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Data.Should().NotBeNull();
        okResult.Value.Data!.Wishes.Should().HaveCount(2);
        okResult.Value.Data.Total.Should().Be(2);
        okResult.Value.Data.Page.Should().Be(1);
        okResult.Value.Data.Limit.Should().Be(20);
    }

    [Fact]
    public async Task GetWishes_WithStatusFilter_ReturnsFiltered()
    {
        // Arrange
        var pendingWishes = new List<WishDto>
        {
            new()
            {
                Id = "wish-001",
                Content = "I want to learn Python",
                Status = "pending",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };

        _mockFirebaseService
            .Setup(s => s.GetWishesAsync(1, 20, "pending", null))
            .ReturnsAsync(new WishListResult(pendingWishes, 1));

        // Act
        var result = await InvokeGetWishes(page: 1, limit: 20, status: "pending", search: null);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<WishListResponse>>>();
        var okResult = (Ok<ApiResponse<WishListResponse>>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Data.Should().NotBeNull();
        okResult.Value.Data!.Wishes.Should().HaveCount(1);
        okResult.Value.Data.Wishes.First().Status.Should().Be("pending");

        _mockFirebaseService.Verify(s => s.GetWishesAsync(1, 20, "pending", null), Times.Once);
    }

    [Fact]
    public async Task GetWishes_WithSearch_ReturnsFiltered()
    {
        // Arrange
        var filteredWishes = new List<WishDto>
        {
            new()
            {
                Id = "wish-001",
                Content = "I want to learn Python",
                Status = "pending",
                CreatedAt = DateTime.UtcNow.AddDays(-1)
            }
        };

        _mockFirebaseService
            .Setup(s => s.GetWishesAsync(1, 20, null, "python"))
            .ReturnsAsync(new WishListResult(filteredWishes, 1));

        // Act
        var result = await InvokeGetWishes(page: 1, limit: 20, status: null, search: "python");

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<WishListResponse>>>();
        var okResult = (Ok<ApiResponse<WishListResponse>>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Data.Should().NotBeNull();
        okResult.Value.Data!.Wishes.Should().HaveCount(1);
        okResult.Value.Data.Wishes.First().Content.Should().Contain("Python");

        _mockFirebaseService.Verify(s => s.GetWishesAsync(1, 20, null, "python"), Times.Once);
    }

    [Fact]
    public async Task GetWishes_ServiceThrowsException_ReturnsError()
    {
        // Arrange
        _mockFirebaseService
            .Setup(s => s.GetWishesAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string?>(), It.IsAny<string?>()))
            .ThrowsAsync(new Exception("Firebase error"));

        // Act
        var result = await InvokeGetWishes(page: 1, limit: 20, status: null, search: null);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badResult = (BadRequest<ApiResponse>)result;
        badResult.Value.Should().NotBeNull();
        badResult.Value!.Success.Should().BeFalse();
    }

    #endregion

    #region UpdateStatus Tests

    [Fact]
    public async Task UpdateStatus_ToProcessing_ReturnsSuccess()
    {
        // Arrange
        var wishId = "wish-001";
        var adminUid = "admin-001";
        var existingWish = new Wish
        {
            Id = wishId,
            Content = "I want to learn Python",
            Status = "pending"
        };

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync(existingWish);

        _mockFirebaseService
            .Setup(s => s.UpdateWishStatusAsync(wishId, "processing", null, adminUid))
            .Returns(Task.CompletedTask);

        var request = new UpdateWishStatusRequest { Status = "processing" };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeUpdateWishStatus(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse>>();
        var okResult = (Ok<ApiResponse>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Message.Should().Contain("已更新");

        _mockFirebaseService.Verify(
            s => s.UpdateWishStatusAsync(wishId, "processing", null, adminUid),
            Times.Once);
    }

    [Fact]
    public async Task UpdateStatus_ToCompleted_RequiresLinkedComponent()
    {
        // Arrange
        var wishId = "wish-001";
        var adminUid = "admin-001";
        var existingWish = new Wish
        {
            Id = wishId,
            Content = "I want to learn Python",
            Status = "processing"
        };

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync(existingWish);

        // Request without linkedComponentId
        var request = new UpdateWishStatusRequest { Status = "completed" };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeUpdateWishStatus(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badResult = (BadRequest<ApiResponse>)result;
        badResult.Value.Should().NotBeNull();
        badResult.Value!.Success.Should().BeFalse();
        badResult.Value.Message.Should().Contain("linkedComponentId");

        _mockFirebaseService.Verify(
            s => s.UpdateWishStatusAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateStatus_ToCompleted_WithLinkedComponent_ReturnsSuccess()
    {
        // Arrange
        var wishId = "wish-001";
        var adminUid = "admin-001";
        var linkedComponentId = "comp-001";
        var existingWish = new Wish
        {
            Id = wishId,
            Content = "I want to learn Python",
            Status = "processing"
        };

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync(existingWish);

        _mockFirebaseService
            .Setup(s => s.UpdateWishStatusAsync(wishId, "completed", linkedComponentId, adminUid))
            .Returns(Task.CompletedTask);

        var request = new UpdateWishStatusRequest
        {
            Status = "completed",
            LinkedComponentId = linkedComponentId
        };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeUpdateWishStatus(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse>>();
        var okResult = (Ok<ApiResponse>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();

        _mockFirebaseService.Verify(
            s => s.UpdateWishStatusAsync(wishId, "completed", linkedComponentId, adminUid),
            Times.Once);
    }

    [Fact]
    public async Task UpdateStatus_ToDeleted_ReturnsSuccess()
    {
        // Arrange
        var wishId = "wish-001";
        var adminUid = "admin-001";
        var existingWish = new Wish
        {
            Id = wishId,
            Content = "I want to learn Python",
            Status = "pending"
        };

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync(existingWish);

        _mockFirebaseService
            .Setup(s => s.UpdateWishStatusAsync(wishId, "deleted", null, adminUid))
            .Returns(Task.CompletedTask);

        var request = new UpdateWishStatusRequest { Status = "deleted" };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeUpdateWishStatus(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<Ok<ApiResponse>>();
        var okResult = (Ok<ApiResponse>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();

        _mockFirebaseService.Verify(
            s => s.UpdateWishStatusAsync(wishId, "deleted", null, adminUid),
            Times.Once);
    }

    [Fact]
    public async Task UpdateStatus_InvalidTransition_ReturnsBadRequest()
    {
        // Arrange - trying to go from completed to pending (invalid)
        var wishId = "wish-001";
        var adminUid = "admin-001";
        var existingWish = new Wish
        {
            Id = wishId,
            Content = "I want to learn Python",
            Status = "completed"
        };

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync(existingWish);

        var request = new UpdateWishStatusRequest { Status = "pending" };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeUpdateWishStatus(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badResult = (BadRequest<ApiResponse>)result;
        badResult.Value.Should().NotBeNull();
        badResult.Value!.Success.Should().BeFalse();
        badResult.Value.Message.Should().Contain("無效的狀態轉換");

        _mockFirebaseService.Verify(
            s => s.UpdateWishStatusAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string?>(), It.IsAny<string>()),
            Times.Never);
    }

    [Fact]
    public async Task UpdateStatus_WishNotFound_ReturnsNotFound()
    {
        // Arrange
        var wishId = "non-existent";
        var adminUid = "admin-001";

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync((Wish?)null);

        var request = new UpdateWishStatusRequest { Status = "processing" };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeUpdateWishStatus(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<NotFound<ApiResponse>>();
        var notFoundResult = (NotFound<ApiResponse>)result;
        notFoundResult.Value.Should().NotBeNull();
        notFoundResult.Value!.Success.Should().BeFalse();
    }

    #endregion

    #region CreateComponentFromWish Tests

    [Fact]
    public async Task CreateComponentFromWish_ReturnsCreatedAndUpdatesWish()
    {
        // Arrange
        var wishId = "wish-001";
        var adminUid = "admin-001";
        var componentId = "comp-new-001";
        var existingWish = new Wish
        {
            Id = wishId,
            Content = "I want to learn Python",
            Status = "pending"
        };

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync(existingWish);

        _mockFirebaseService
            .Setup(s => s.AddDocumentAsync("components", It.IsAny<LearningComponentDetail>()))
            .ReturnsAsync(componentId);

        _mockFirebaseService
            .Setup(s => s.UpdateWishStatusAsync(wishId, "completed", componentId, adminUid))
            .Returns(Task.CompletedTask);

        var request = new CreateComponentFromWishRequest
        {
            Title = "Python Basics",
            Theme = "Learn Python from scratch",
            Description = "A comprehensive guide to Python",
            Category = "adult",
            Tags = new[] { "python", "programming" },
            Questions = new[]
            {
                new QuestionAnswer { Question = "What is Python?", Answer = "A programming language" }
            }
        };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeCreateComponentFromWish(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<Created<ApiResponse<CreateComponentFromWishResponse>>>();
        var createdResult = (Created<ApiResponse<CreateComponentFromWishResponse>>)result;
        createdResult.Value.Should().NotBeNull();
        createdResult.Value!.Success.Should().BeTrue();
        createdResult.Value.Data.Should().NotBeNull();
        createdResult.Value.Data!.ComponentId.Should().Be(componentId);
        createdResult.Value.Data.WishId.Should().Be(wishId);
        createdResult.Value.Message.Should().Contain("已建立");

        _mockFirebaseService.Verify(
            s => s.AddDocumentAsync("components", It.Is<LearningComponentDetail>(c =>
                c.Title == request.Title &&
                c.Theme == request.Theme &&
                c.Description == request.Description)),
            Times.Once);

        _mockFirebaseService.Verify(
            s => s.UpdateWishStatusAsync(wishId, "completed", componentId, adminUid),
            Times.Once);
    }

    [Fact]
    public async Task CreateComponentFromWish_WishNotPending_ReturnsBadRequest()
    {
        // Arrange
        var wishId = "wish-001";
        var adminUid = "admin-001";
        var existingWish = new Wish
        {
            Id = wishId,
            Content = "I want to learn Python",
            Status = "completed"  // Already completed
        };

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync(existingWish);

        var request = new CreateComponentFromWishRequest
        {
            Title = "Python Basics",
            Theme = "Learn Python from scratch",
            Description = "A comprehensive guide to Python",
            Category = "adult"
        };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeCreateComponentFromWish(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badResult = (BadRequest<ApiResponse>)result;
        badResult.Value.Should().NotBeNull();
        badResult.Value!.Success.Should().BeFalse();
        badResult.Value.Message.Should().Contain("pending");

        _mockFirebaseService.Verify(
            s => s.AddDocumentAsync(It.IsAny<string>(), It.IsAny<LearningComponentDetail>()),
            Times.Never);
    }

    [Fact]
    public async Task CreateComponentFromWish_WishNotFound_ReturnsNotFound()
    {
        // Arrange
        var wishId = "non-existent";
        var adminUid = "admin-001";

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync((Wish?)null);

        var request = new CreateComponentFromWishRequest
        {
            Title = "Python Basics",
            Theme = "Learn Python from scratch",
            Description = "A comprehensive guide to Python",
            Category = "adult"
        };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeCreateComponentFromWish(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<NotFound<ApiResponse>>();
        var notFoundResult = (NotFound<ApiResponse>)result;
        notFoundResult.Value.Should().NotBeNull();
        notFoundResult.Value!.Success.Should().BeFalse();
    }

    [Fact]
    public async Task CreateComponentFromWish_InvalidRequest_ReturnsBadRequest()
    {
        // Arrange
        var wishId = "wish-001";
        var adminUid = "admin-001";
        var existingWish = new Wish
        {
            Id = wishId,
            Content = "I want to learn Python",
            Status = "pending"
        };

        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<Wish>("wishes", wishId))
            .ReturnsAsync(existingWish);

        // Missing required fields
        var request = new CreateComponentFromWishRequest
        {
            Title = "",  // Empty title
            Theme = "",
            Description = "",
            Category = ""
        };
        var httpContext = CreateHttpContext(adminUid, "admin");

        // Act
        var result = await InvokeCreateComponentFromWish(wishId, request, httpContext);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badResult = (BadRequest<ApiResponse>)result;
        badResult.Value.Should().NotBeNull();
        badResult.Value!.Success.Should().BeFalse();
    }

    #endregion

    #region Helper Methods

    private static HttpContext CreateHttpContext(string userId, string role)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, userId),
            new("firebase_uid", userId),
            new(ClaimTypes.Role, role)
        };

        if (role.Equals("admin", StringComparison.OrdinalIgnoreCase))
        {
            claims.Add(new Claim("admin", "true"));
        }

        var identity = new ClaimsIdentity(claims, "Test");
        var principal = new ClaimsPrincipal(identity);

        var httpContext = new DefaultHttpContext
        {
            User = principal
        };

        return httpContext;
    }

    private async Task<IResult> InvokeGetWishes(int page, int limit, string? status, string? search)
    {
        var endpointsType = typeof(WishEndpoints);
        var method = endpointsType.GetMethod(
            "GetAdminWishes",
            BindingFlags.NonPublic | BindingFlags.Static);

        if (method is null)
        {
            throw new InvalidOperationException("GetAdminWishes method not found");
        }

        var task = (Task<IResult>)method.Invoke(
            null,
            new object?[]
            {
                _mockFirebaseService.Object,
                _mockLogger.Object,
                page,
                limit,
                status,
                search
            })!;

        return await task;
    }

    private async Task<IResult> InvokeUpdateWishStatus(string wishId, UpdateWishStatusRequest request, HttpContext httpContext)
    {
        var endpointsType = typeof(WishEndpoints);
        var method = endpointsType.GetMethod(
            "UpdateWishStatus",
            BindingFlags.NonPublic | BindingFlags.Static);

        if (method is null)
        {
            throw new InvalidOperationException("UpdateWishStatus method not found");
        }

        var task = (Task<IResult>)method.Invoke(
            null,
            new object[]
            {
                wishId,
                request,
                httpContext,
                _mockFirebaseService.Object,
                _mockLogger.Object
            })!;

        return await task;
    }

    private async Task<IResult> InvokeCreateComponentFromWish(string wishId, CreateComponentFromWishRequest request, HttpContext httpContext)
    {
        var endpointsType = typeof(WishEndpoints);
        var method = endpointsType.GetMethod(
            "CreateComponentFromWish",
            BindingFlags.NonPublic | BindingFlags.Static);

        if (method is null)
        {
            throw new InvalidOperationException("CreateComponentFromWish method not found");
        }

        var task = (Task<IResult>)method.Invoke(
            null,
            new object[]
            {
                wishId,
                request,
                httpContext,
                _mockFirebaseService.Object,
                _mockLogger.Object
            })!;

        return await task;
    }

    #endregion
}
