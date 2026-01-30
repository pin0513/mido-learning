using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Logging.Abstractions;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;
using Moq;
using System.Net;
using System.Reflection;

namespace MidoLearning.Api.Tests.Tests.Endpoints;

public class WishEndpointsTests
{
    private readonly Mock<IFirebaseService> _mockFirebaseService;
    private readonly ILogger<Program> _logger;
    private readonly DefaultHttpContext _httpContext;

    public WishEndpointsTests()
    {
        _mockFirebaseService = new Mock<IFirebaseService>();
        _logger = NullLogger<Program>.Instance;
        _httpContext = new DefaultHttpContext();
        _httpContext.Connection.RemoteIpAddress = IPAddress.Parse("127.0.0.1");
        _httpContext.Request.Headers.UserAgent = "TestUserAgent";
    }

    [Fact]
    public async Task CreateWish_ValidContent_ReturnsCreated()
    {
        // Arrange
        var request = new CreateWishRequest { Content = "I wish to learn programming" };
        var expectedWishId = "wish_12345";

        _mockFirebaseService
            .Setup(s => s.AddDocumentAsync(It.IsAny<string>(), It.IsAny<Wish>()))
            .ReturnsAsync(expectedWishId);

        // Act
        var result = await InvokeCreateWish(request);

        // Assert
        result.Should().BeOfType<Created<ApiResponse<CreateWishResponse>>>();
        var createdResult = (Created<ApiResponse<CreateWishResponse>>)result;
        createdResult.Location.Should().Be($"/api/wishes/{expectedWishId}");
        createdResult.Value.Should().NotBeNull();
        createdResult.Value!.Success.Should().BeTrue();
        createdResult.Value.Data.Should().NotBeNull();
        createdResult.Value.Data!.WishId.Should().Be(expectedWishId);
        createdResult.Value.Message.Should().Be("願望已收到！");

        _mockFirebaseService.Verify(
            s => s.AddDocumentAsync("wishes", It.Is<Wish>(w => w.Content == request.Content)),
            Times.Once);
    }

    [Fact]
    public async Task CreateWish_EmptyContent_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateWishRequest { Content = "" };

        // Act
        var result = await InvokeCreateWish(request);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badRequestResult = (BadRequest<ApiResponse>)result;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.Success.Should().BeFalse();
        badRequestResult.Value.Message.Should().Be("驗證失敗");
        badRequestResult.Value.Errors.Should().NotBeNullOrEmpty();

        _mockFirebaseService.Verify(
            s => s.AddDocumentAsync(It.IsAny<string>(), It.IsAny<Wish>()),
            Times.Never);
    }

    [Fact]
    public async Task CreateWish_ContentTooLong_ReturnsBadRequest()
    {
        // Arrange
        var longContent = new string('a', 501); // 501 characters exceeds 500 limit
        var request = new CreateWishRequest { Content = longContent };

        // Act
        var result = await InvokeCreateWish(request);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badRequestResult = (BadRequest<ApiResponse>)result;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.Success.Should().BeFalse();
        badRequestResult.Value.Message.Should().Be("驗證失敗");
        badRequestResult.Value.Errors.Should().Contain(e => e.Contains("1-500"));

        _mockFirebaseService.Verify(
            s => s.AddDocumentAsync(It.IsAny<string>(), It.IsAny<Wish>()),
            Times.Never);
    }

    [Fact]
    public async Task CreateWish_InvalidEmail_ReturnsBadRequest()
    {
        // Arrange
        var request = new CreateWishRequest
        {
            Content = "I wish to learn programming",
            Email = "invalid-email-format"
        };

        // Act
        var result = await InvokeCreateWish(request);

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badRequestResult = (BadRequest<ApiResponse>)result;
        badRequestResult.Value.Should().NotBeNull();
        badRequestResult.Value!.Success.Should().BeFalse();
        badRequestResult.Value.Message.Should().Be("驗證失敗");
        badRequestResult.Value.Errors.Should().Contain(e => e.Contains("Email"));

        _mockFirebaseService.Verify(
            s => s.AddDocumentAsync(It.IsAny<string>(), It.IsAny<Wish>()),
            Times.Never);
    }

    [Fact]
    public async Task CreateWish_ValidContentWithEmail_ReturnsCreated()
    {
        // Arrange
        var request = new CreateWishRequest
        {
            Content = "I wish to learn programming",
            Email = "user@example.com"
        };
        var expectedWishId = "wish_67890";

        _mockFirebaseService
            .Setup(s => s.AddDocumentAsync(It.IsAny<string>(), It.IsAny<Wish>()))
            .ReturnsAsync(expectedWishId);

        // Act
        var result = await InvokeCreateWish(request);

        // Assert
        result.Should().BeOfType<Created<ApiResponse<CreateWishResponse>>>();
        var createdResult = (Created<ApiResponse<CreateWishResponse>>)result;
        createdResult.Location.Should().Be($"/api/wishes/{expectedWishId}");
        createdResult.Value.Should().NotBeNull();
        createdResult.Value!.Success.Should().BeTrue();
        createdResult.Value.Data.Should().NotBeNull();
        createdResult.Value.Data!.WishId.Should().Be(expectedWishId);

        _mockFirebaseService.Verify(
            s => s.AddDocumentAsync("wishes", It.Is<Wish>(w =>
                w.Content == request.Content &&
                w.Email == request.Email)),
            Times.Once);
    }

    private async Task<IResult> InvokeCreateWish(CreateWishRequest request)
    {
        // Use reflection to call the private CreateWish method
        var endpointsType = typeof(MidoLearning.Api.Endpoints.WishEndpoints);
        var createWishMethod = endpointsType.GetMethod(
            "CreateWish",
            BindingFlags.NonPublic | BindingFlags.Static);

        if (createWishMethod is null)
        {
            throw new InvalidOperationException("CreateWish method not found");
        }

        var task = (Task<IResult>)createWishMethod.Invoke(
            null,
            new object[]
            {
                request,
                _httpContext,
                _mockFirebaseService.Object,
                _logger
            })!;

        return await task;
    }
}
