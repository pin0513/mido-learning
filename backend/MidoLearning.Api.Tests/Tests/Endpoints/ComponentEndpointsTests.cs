using System.Net;
using System.Net.Http.Json;
using FluentAssertions;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using MidoLearning.Api.Models;
using MidoLearning.Api.Services;
using MidoLearning.Api.Tests.Helpers;
using Moq;

namespace MidoLearning.Api.Tests.Endpoints;

public class ComponentEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IFirebaseService> _mockFirebaseService;

    public ComponentEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _mockFirebaseService = new Mock<IFirebaseService>();

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                // Remove existing IFirebaseService registration
                var descriptor = services.SingleOrDefault(
                    d => d.ServiceType == typeof(IFirebaseService));
                if (descriptor != null)
                {
                    services.Remove(descriptor);
                }

                // Add mock service
                services.AddSingleton(_mockFirebaseService.Object);

                // Add test authentication
                services.AddAuthentication(TestAuthHandler.AuthenticationScheme)
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                        TestAuthHandler.AuthenticationScheme, options => { });
            });
        });
    }

    #region GET /api/components (List)

    [Fact]
    public async Task GetComponents_ReturnsComponentList()
    {
        // Arrange
        var components = CreateTestComponents(3);
        SetupMockGetComponentsAsync(components);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync("/api/components");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ComponentListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Components.Should().HaveCount(3);
        result.Data.Total.Should().Be(3);
    }

    [Fact]
    public async Task GetComponents_WithCategoryFilter_ReturnsFiltered()
    {
        // Arrange
        var allComponents = new List<LearningComponent>
        {
            CreateTestComponent("comp-1", "adult"),
            CreateTestComponent("comp-2", "child"),
            CreateTestComponent("comp-3", "adult")
        };
        SetupMockGetComponentsAsync(allComponents);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync("/api/components?category=adult");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ComponentListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data!.Components.Should().OnlyContain(c => c.Category == "adult");
    }

    [Fact]
    public async Task GetComponents_WithPagination_ReturnsCorrectPage()
    {
        // Arrange
        var components = CreateTestComponents(25);
        SetupMockGetComponentsAsync(components);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync("/api/components?page=2&limit=10");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ComponentListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data!.Page.Should().Be(2);
        result.Data.Limit.Should().Be(10);
        result.Data.Total.Should().Be(25);
    }

    [Fact]
    public async Task GetComponents_Unauthenticated_Returns401()
    {
        // Arrange
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/components");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GET /api/components/{id} (Detail)

    [Fact]
    public async Task GetComponent_ValidId_ReturnsComponent()
    {
        // Arrange
        var component = CreateTestComponentDetail("comp-123");
        SetupMockGetComponentByIdAsync("comp-123", component);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync("/api/components/comp-123");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<LearningComponentDetail>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be("comp-123");
    }

    [Fact]
    public async Task GetComponent_InvalidId_Returns404()
    {
        // Arrange
        SetupMockGetComponentByIdAsync("non-existent", null);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync("/api/components/non-existent");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetComponent_Unauthenticated_CanAccessPublished()
    {
        // Arrange - Public component should be accessible without auth
        var component = CreateTestComponentDetail("comp-123");
        var componentWithVisibility = component with { Visibility = "published" };
        SetupMockGetComponentByIdAsync("comp-123", componentWithVisibility);
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/components/comp-123");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task GetComponent_Unauthenticated_CannotAccessPrivate()
    {
        // Arrange - Private component should not be accessible without auth
        var component = CreateTestComponentDetail("comp-123");
        var componentWithVisibility = component with { Visibility = "private" };
        SetupMockGetComponentByIdAsync("comp-123", componentWithVisibility);
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/components/comp-123");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    #endregion

    #region GET /api/components/public (Public List)

    [Fact]
    public async Task GetPublicComponents_ReturnsPublishedComponents()
    {
        // Arrange
        var components = new List<LearningComponent>
        {
            CreateTestComponentWithVisibility("comp-1", "published"),
            CreateTestComponentWithVisibility("comp-2", "private"),
            CreateTestComponentWithVisibility("comp-3", "published")
        };
        SetupMockGetComponentsAsync(components);
        var client = _factory.CreateClient(); // No auth required

        // Act
        var response = await client.GetAsync("/api/components/public");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ComponentListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data!.Components.Should().HaveCount(2);
        result.Data.Components.Should().OnlyContain(c => c.Visibility == "published");
    }

    [Fact]
    public async Task GetPublicComponents_ReturnsLegacyComponentsWithNullVisibility()
    {
        // Arrange - Legacy components have null visibility
        var components = new List<LearningComponent>
        {
            CreateTestComponentWithVisibility("comp-1", null), // Legacy
            CreateTestComponentWithVisibility("comp-2", "private"),
            CreateTestComponentWithVisibility("comp-3", null) // Legacy
        };
        SetupMockGetComponentsAsync(components);
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync("/api/components/public");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ComponentListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data!.Components.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetPublicComponents_DoesNotRequireAuthentication()
    {
        // Arrange
        var components = new List<LearningComponent>
        {
            CreateTestComponentWithVisibility("comp-1", "published")
        };
        SetupMockGetComponentsAsync(components);
        var client = _factory.CreateClient(); // No auth

        // Act
        var response = await client.GetAsync("/api/components/public");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    #endregion

    #region Visibility Tests

    [Fact]
    public async Task GetComponents_ShowsLoginVisibilityToAuthenticatedUsers()
    {
        // Arrange
        var components = new List<LearningComponent>
        {
            CreateTestComponentWithVisibility("comp-1", "published"),
            CreateTestComponentWithVisibility("comp-2", "login"),
            CreateTestComponentWithVisibility("comp-3", "private", "other-user")
        };
        SetupMockGetComponentsAsync(components);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync("/api/components");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ComponentListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        // Should see published and login, but not private from other user
        result.Data!.Components.Should().HaveCount(2);
    }

    [Fact]
    public async Task GetComponents_ShowsPrivateToOwner()
    {
        // Arrange
        var components = new List<LearningComponent>
        {
            CreateTestComponentWithVisibility("comp-1", "private", "user-123") // Owner's private
        };
        SetupMockGetComponentsAsync(components);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync("/api/components");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ComponentListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data!.Components.Should().HaveCount(1);
    }

    [Fact]
    public async Task GetMyComponents_AdminSeesAllComponents()
    {
        // Arrange - Admin should see all components, not just their own
        var components = new List<LearningComponent>
        {
            CreateTestComponentWithVisibility("comp-1", "private", "other-user-1"),
            CreateTestComponentWithVisibility("comp-2", "published", "other-user-2"),
            CreateTestComponentWithVisibility("comp-3", "private", "admin-123") // Admin's own
        };
        SetupMockGetComponentsAsync(components);
        var client = CreateAuthenticatedClient("admin-123", "admin");

        // Act
        var response = await client.GetAsync("/api/components/my");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ComponentListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        // Admin should see ALL components
        result.Data!.Components.Should().HaveCount(3);
    }

    [Fact]
    public async Task GetMyComponents_TeacherSeesOnlyOwnComponents()
    {
        // Arrange - Teacher should only see their own components
        var components = new List<LearningComponent>
        {
            CreateTestComponentWithVisibility("comp-1", "private", "other-user"),
            CreateTestComponentWithVisibility("comp-2", "published", "teacher-123"), // Teacher's own
            CreateTestComponentWithVisibility("comp-3", "private", "teacher-123") // Teacher's own
        };
        SetupMockGetComponentsAsync(components);
        var client = CreateAuthenticatedClient("teacher-123", "teacher");

        // Act
        var response = await client.GetAsync("/api/components/my");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<ComponentListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        // Teacher should only see their own 2 components
        result.Data!.Components.Should().HaveCount(2);
    }

    #endregion

    #region POST /api/components (Create)

    [Fact]
    public async Task CreateComponent_AsTeacher_ReturnsCreated()
    {
        // Arrange
        SetupMockCreateComponentAsync("new-comp-id");
        var client = CreateAuthenticatedClient("teacher-123", "teacher");
        var request = new CreateComponentRequest
        {
            Title = "Test Component",
            Theme = "Test Theme",
            Description = "Test Description",
            Category = "adult",
            Tags = new[] { "python", "beginner" },
            Questions = new[]
            {
                new QuestionAnswer { Question = "Q1?", Answer = "A1" }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/components", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<CreateComponentResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Id.Should().Be("new-comp-id");
    }

    [Fact]
    public async Task CreateComponent_AsAdmin_ReturnsCreated()
    {
        // Arrange
        SetupMockCreateComponentAsync("admin-comp-id");
        var client = CreateAuthenticatedClient("admin-123", "admin");
        var request = new CreateComponentRequest
        {
            Title = "Admin Component",
            Theme = "Admin Theme",
            Description = "Admin Description",
            Category = "adult",
            Tags = new[] { "admin" },
            Questions = new[]
            {
                new QuestionAnswer { Question = "Q1?", Answer = "A1" }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/components", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task CreateComponent_AsStudent_Returns403()
    {
        // Arrange
        var client = CreateAuthenticatedClient("student-123", "member");
        var request = new CreateComponentRequest
        {
            Title = "Student Component",
            Theme = "Student Theme",
            Description = "Student Description",
            Category = "adult",
            Tags = new[] { "student" },
            Questions = new[]
            {
                new QuestionAnswer { Question = "Q1?", Answer = "A1" }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/components", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task CreateComponent_MissingTitle_ReturnsBadRequest()
    {
        // Arrange
        var client = CreateAuthenticatedClient("teacher-123", "teacher");
        var request = new CreateComponentRequest
        {
            Title = "", // Empty required field
            Theme = "Test Theme",
            Description = "Test Description",
            Category = "adult",
            Tags = new[] { "python" },
            Questions = new[]
            {
                new QuestionAnswer { Question = "Q1?", Answer = "A1" }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/components", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task CreateComponent_Unauthenticated_Returns401()
    {
        // Arrange
        var client = _factory.CreateClient();
        var request = new CreateComponentRequest
        {
            Title = "Test Component",
            Theme = "Test Theme",
            Description = "Test Description",
            Category = "adult",
            Tags = new[] { "python" },
            Questions = new[]
            {
                new QuestionAnswer { Question = "Q1?", Answer = "A1" }
            }
        };

        // Act
        var response = await client.PostAsJsonAsync("/api/components", request);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region Helper Methods

    private HttpClient CreateAuthenticatedClient(string uid, string role)
    {
        var client = _factory.CreateClient();
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, uid);
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserRoleHeader, role);
        return client;
    }

    private List<LearningComponent> CreateTestComponents(int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => CreateTestComponent($"comp-{i}", "adult"))
            .ToList();
    }

    private LearningComponent CreateTestComponent(string id, string category)
    {
        return new LearningComponent
        {
            Id = id,
            Title = $"Component {id}",
            Theme = "Test Theme",
            Description = "Test Description",
            Category = category,
            Tags = new[] { "tag1", "tag2" },
            Thumbnail = "https://example.com/thumbnail.jpg",
            MaterialCount = 5,
            CreatedAt = DateTime.UtcNow
        };
    }

    private LearningComponent CreateTestComponentWithVisibility(string id, string? visibility, string? createdByUid = null)
    {
        return new LearningComponent
        {
            Id = id,
            Title = $"Component {id}",
            Theme = "Test Theme",
            Description = "Test Description",
            Category = "adult",
            Tags = new[] { "tag1", "tag2" },
            Thumbnail = "https://example.com/thumbnail.jpg",
            MaterialCount = 5,
            Visibility = visibility,
            CreatedBy = createdByUid != null ? new CreatedByInfo { Uid = createdByUid, DisplayName = "Test User" } : null,
            CreatedAt = DateTime.UtcNow
        };
    }

    private LearningComponentDetail CreateTestComponentDetail(string id)
    {
        return new LearningComponentDetail
        {
            Id = id,
            Title = $"Component {id}",
            Theme = "Test Theme",
            Description = "Test Description",
            Category = "adult",
            Tags = new[] { "tag1", "tag2" },
            Questions = new[]
            {
                new QuestionAnswer { Question = "Q1?", Answer = "A1" }
            },
            Materials = Array.Empty<Material>(),
            CreatedBy = new CreatedByInfo { Uid = "user-123", DisplayName = "Test User" },
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow
        };
    }

    private void SetupMockGetComponentsAsync(List<LearningComponent> components)
    {
        _mockFirebaseService
            .Setup(s => s.GetDocumentsAsync<LearningComponent>(
                It.IsAny<string>(),
                It.IsAny<int>(),
                It.IsAny<int>(),
                It.IsAny<string?>(),
                It.IsAny<string[]?>()))
            .ReturnsAsync((components, components.Count));
    }

    private void SetupMockGetComponentByIdAsync(string id, LearningComponentDetail? component)
    {
        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<LearningComponentDetail>("components", id))
            .ReturnsAsync(component);
    }

    private void SetupMockCreateComponentAsync(string newId)
    {
        _mockFirebaseService
            .Setup(s => s.AddDocumentAsync(It.IsAny<string>(), It.IsAny<LearningComponentDetail>()))
            .ReturnsAsync(newId);
    }

    #endregion
}
