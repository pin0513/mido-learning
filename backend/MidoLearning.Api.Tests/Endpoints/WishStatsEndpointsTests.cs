using System.Reflection;
using FluentAssertions;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.Extensions.Logging;
using MidoLearning.Api.Endpoints;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;
using Moq;

namespace MidoLearning.Api.Tests.Endpoints;

public class WishStatsEndpointsTests
{
    private readonly Mock<IFirebaseService> _mockFirebaseService;
    private readonly Mock<ILogger<Program>> _mockLogger;

    public WishStatsEndpointsTests()
    {
        _mockFirebaseService = new Mock<IFirebaseService>();
        _mockLogger = new Mock<ILogger<Program>>();
    }

    [Fact]
    public async Task GetWishStats_ReturnsCorrectStructure()
    {
        // Arrange
        var stats = new WishStatsResult(
            TotalCount: 100,
            ByStatus: new Dictionary<string, int>
            {
                { "pending", 30 },
                { "processing", 20 },
                { "completed", 40 },
                { "deleted", 10 }
            },
            WeeklyTrend: new List<DailyWishCount>
            {
                new() { Date = "2026-01-25", Count = 10 },
                new() { Date = "2026-01-26", Count = 15 },
                new() { Date = "2026-01-27", Count = 12 },
                new() { Date = "2026-01-28", Count = 18 },
                new() { Date = "2026-01-29", Count = 20 },
                new() { Date = "2026-01-30", Count = 14 },
                new() { Date = "2026-01-31", Count = 11 }
            },
            AvgProcessingTimeHours: 24.5,
            CompletionRate: 0.444
        );

        _mockFirebaseService
            .Setup(s => s.GetWishStatsAsync())
            .ReturnsAsync(stats);

        // Act
        var result = await InvokeGetWishStats();

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<WishStatsResponse>>>();
        var okResult = (Ok<ApiResponse<WishStatsResponse>>)result;
        okResult.Value.Should().NotBeNull();
        okResult.Value!.Success.Should().BeTrue();
        okResult.Value.Data.Should().NotBeNull();
        okResult.Value.Data!.TotalCount.Should().Be(100);
        okResult.Value.Data.ByStatus.Should().HaveCount(4);
        okResult.Value.Data.WeeklyTrend.Should().HaveCount(7);
        okResult.Value.Data.AvgProcessingTimeHours.Should().Be(24.5);
        okResult.Value.Data.CompletionRate.Should().Be(0.444);
    }

    [Fact]
    public async Task GetWishStats_ByStatusCountsAreCorrect()
    {
        // Arrange
        var stats = new WishStatsResult(
            TotalCount: 50,
            ByStatus: new Dictionary<string, int>
            {
                { "pending", 15 },
                { "processing", 10 },
                { "completed", 20 },
                { "deleted", 5 }
            },
            WeeklyTrend: Array.Empty<DailyWishCount>(),
            AvgProcessingTimeHours: 0,
            CompletionRate: 0
        );

        _mockFirebaseService
            .Setup(s => s.GetWishStatsAsync())
            .ReturnsAsync(stats);

        // Act
        var result = await InvokeGetWishStats();

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<WishStatsResponse>>>();
        var okResult = (Ok<ApiResponse<WishStatsResponse>>)result;
        var data = okResult.Value!.Data!;

        data.ByStatus["pending"].Should().Be(15);
        data.ByStatus["processing"].Should().Be(10);
        data.ByStatus["completed"].Should().Be(20);
        data.ByStatus["deleted"].Should().Be(5);
    }

    [Fact]
    public async Task GetWishStats_WeeklyTrendHasSevenDays()
    {
        // Arrange
        var weeklyTrend = Enumerable.Range(0, 7)
            .Select(i => new DailyWishCount
            {
                Date = DateTime.UtcNow.AddDays(-6 + i).ToString("yyyy-MM-dd"),
                Count = i * 5
            })
            .ToList();

        var stats = new WishStatsResult(
            TotalCount: 100,
            ByStatus: new Dictionary<string, int>(),
            WeeklyTrend: weeklyTrend,
            AvgProcessingTimeHours: 0,
            CompletionRate: 0
        );

        _mockFirebaseService
            .Setup(s => s.GetWishStatsAsync())
            .ReturnsAsync(stats);

        // Act
        var result = await InvokeGetWishStats();

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<WishStatsResponse>>>();
        var okResult = (Ok<ApiResponse<WishStatsResponse>>)result;
        var data = okResult.Value!.Data!;

        data.WeeklyTrend.Should().HaveCount(7);
        data.WeeklyTrend.First().Date.Should().NotBeNullOrEmpty();
        data.WeeklyTrend.Last().Date.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetWishStats_AvgProcessingTimeIsCalculated()
    {
        // Arrange
        var stats = new WishStatsResult(
            TotalCount: 100,
            ByStatus: new Dictionary<string, int>(),
            WeeklyTrend: Array.Empty<DailyWishCount>(),
            AvgProcessingTimeHours: 48.5,
            CompletionRate: 0
        );

        _mockFirebaseService
            .Setup(s => s.GetWishStatsAsync())
            .ReturnsAsync(stats);

        // Act
        var result = await InvokeGetWishStats();

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<WishStatsResponse>>>();
        var okResult = (Ok<ApiResponse<WishStatsResponse>>)result;
        okResult.Value!.Data!.AvgProcessingTimeHours.Should().Be(48.5);
    }

    [Fact]
    public async Task GetWishStats_CompletionRateIsCalculated()
    {
        // Arrange
        // 40 completed out of 90 non-deleted = 0.444
        var stats = new WishStatsResult(
            TotalCount: 100,
            ByStatus: new Dictionary<string, int>
            {
                { "pending", 30 },
                { "processing", 20 },
                { "completed", 40 },
                { "deleted", 10 }
            },
            WeeklyTrend: Array.Empty<DailyWishCount>(),
            AvgProcessingTimeHours: 0,
            CompletionRate: 0.444
        );

        _mockFirebaseService
            .Setup(s => s.GetWishStatsAsync())
            .ReturnsAsync(stats);

        // Act
        var result = await InvokeGetWishStats();

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<WishStatsResponse>>>();
        var okResult = (Ok<ApiResponse<WishStatsResponse>>)result;
        okResult.Value!.Data!.CompletionRate.Should().BeApproximately(0.444, 0.001);
    }

    [Fact]
    public async Task GetWishStats_EmptyWishes_ReturnsZeros()
    {
        // Arrange
        var stats = new WishStatsResult(
            TotalCount: 0,
            ByStatus: new Dictionary<string, int>
            {
                { "pending", 0 },
                { "processing", 0 },
                { "completed", 0 },
                { "deleted", 0 }
            },
            WeeklyTrend: Enumerable.Range(0, 7)
                .Select(i => new DailyWishCount
                {
                    Date = DateTime.UtcNow.AddDays(-6 + i).ToString("yyyy-MM-dd"),
                    Count = 0
                })
                .ToList(),
            AvgProcessingTimeHours: 0,
            CompletionRate: 0
        );

        _mockFirebaseService
            .Setup(s => s.GetWishStatsAsync())
            .ReturnsAsync(stats);

        // Act
        var result = await InvokeGetWishStats();

        // Assert
        result.Should().BeOfType<Ok<ApiResponse<WishStatsResponse>>>();
        var okResult = (Ok<ApiResponse<WishStatsResponse>>)result;
        var data = okResult.Value!.Data!;

        data.TotalCount.Should().Be(0);
        data.AvgProcessingTimeHours.Should().Be(0);
        data.CompletionRate.Should().Be(0);
    }

    [Fact]
    public async Task GetWishStats_ServiceThrowsException_ReturnsError()
    {
        // Arrange
        _mockFirebaseService
            .Setup(s => s.GetWishStatsAsync())
            .ThrowsAsync(new Exception("Firebase error"));

        // Act
        var result = await InvokeGetWishStats();

        // Assert
        result.Should().BeOfType<BadRequest<ApiResponse>>();
        var badResult = (BadRequest<ApiResponse>)result;
        badResult.Value.Should().NotBeNull();
        badResult.Value!.Success.Should().BeFalse();
        badResult.Value.Message.Should().Contain("Firebase error");
    }

    #region Helper Methods

    private async Task<IResult> InvokeGetWishStats()
    {
        var endpointsType = typeof(WishEndpoints);
        var method = endpointsType.GetMethod(
            "GetWishStats",
            BindingFlags.NonPublic | BindingFlags.Static);

        if (method is null)
        {
            throw new InvalidOperationException("GetWishStats method not found");
        }

        var task = (Task<IResult>)method.Invoke(
            null,
            new object[]
            {
                _mockFirebaseService.Object,
                _mockLogger.Object
            })!;

        return await task;
    }

    #endregion
}
