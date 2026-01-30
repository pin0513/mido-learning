using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.IO.Compression;
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

public class MaterialEndpointsTests : IClassFixture<WebApplicationFactory<Program>>
{
    private const long MaxFileSize = 50 * 1024 * 1024; // 50MB

    private readonly WebApplicationFactory<Program> _factory;
    private readonly Mock<IFirebaseService> _mockFirebaseService;
    private readonly Mock<IStorageService> _mockStorageService;

    public MaterialEndpointsTests(WebApplicationFactory<Program> factory)
    {
        _mockFirebaseService = new Mock<IFirebaseService>();
        _mockStorageService = new Mock<IStorageService>();

        _factory = factory.WithWebHostBuilder(builder =>
        {
            builder.ConfigureTestServices(services =>
            {
                // Remove existing service registrations
                RemoveService<IFirebaseService>(services);
                RemoveService<IStorageService>(services);

                // Add mock services
                services.AddSingleton(_mockFirebaseService.Object);
                services.AddSingleton(_mockStorageService.Object);

                // Add test authentication
                services.AddAuthentication(TestAuthHandler.AuthenticationScheme)
                    .AddScheme<AuthenticationSchemeOptions, TestAuthHandler>(
                        TestAuthHandler.AuthenticationScheme, options => { });
            });
        });
    }

    #region POST /api/components/{componentId}/materials (Upload)

    [Fact]
    public async Task UploadMaterial_AsTeacher_ReturnsCreated()
    {
        // Arrange
        var componentId = "comp-001";
        var materialId = "mat-001";
        SetupMockAddMaterial(materialId);
        SetupMockUploadFile();
        SetupMockComponentExists(componentId, true);

        var client = CreateAuthenticatedClient("teacher-123", "teacher");
        var content = CreateValidZipContent();

        // Act
        var response = await client.PostAsync(
            $"/api/components/{componentId}/materials",
            content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<MaterialUploadResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.MaterialId.Should().Be(materialId);
        result.Data.Version.Should().BeGreaterThan(0);
        result.Data.Filename.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task UploadMaterial_AsAdmin_ReturnsCreated()
    {
        // Arrange
        var componentId = "comp-001";
        var materialId = "mat-002";
        SetupMockAddMaterial(materialId);
        SetupMockUploadFile();
        SetupMockComponentExists(componentId, true);

        var client = CreateAuthenticatedClient("admin-123", "admin");
        var content = CreateValidZipContent();

        // Act
        var response = await client.PostAsync(
            $"/api/components/{componentId}/materials",
            content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Created);
    }

    [Fact]
    public async Task UploadMaterial_AsStudent_Returns403()
    {
        // Arrange
        var componentId = "comp-001";
        var client = CreateAuthenticatedClient("student-123", "member");
        var content = CreateValidZipContent();

        // Act
        var response = await client.PostAsync(
            $"/api/components/{componentId}/materials",
            content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task UploadMaterial_NoIndexHtml_ReturnsBadRequest()
    {
        // Arrange
        var componentId = "comp-001";
        SetupMockComponentExists(componentId, true);
        var client = CreateAuthenticatedClient("teacher-123", "teacher");
        var content = CreateZipContentWithoutIndexHtml();

        // Act
        var response = await client.PostAsync(
            $"/api/components/{componentId}/materials",
            content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse>();
        result.Should().NotBeNull();
        result!.Success.Should().BeFalse();
        result.Message.Should().Contain("index.html");
    }

    [Fact]
    public async Task UploadMaterial_FileTooLarge_ReturnsBadRequest()
    {
        // Arrange
        var componentId = "comp-001";
        SetupMockComponentExists(componentId, true);
        var client = CreateAuthenticatedClient("teacher-123", "teacher");

        // Create a content that exceeds the size limit
        var content = CreateOversizedContent();

        // Act
        var response = await client.PostAsync(
            $"/api/components/{componentId}/materials",
            content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse>();
        result.Should().NotBeNull();
        result!.Success.Should().BeFalse();
        result.Message.Should().Contain("50MB");
    }

    [Fact]
    public async Task UploadMaterial_ComponentNotFound_Returns404()
    {
        // Arrange
        var componentId = "non-existent-comp";
        SetupMockComponentExists(componentId, false);
        var client = CreateAuthenticatedClient("teacher-123", "teacher");
        var content = CreateValidZipContent();

        // Act
        var response = await client.PostAsync(
            $"/api/components/{componentId}/materials",
            content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task UploadMaterial_Unauthenticated_Returns401()
    {
        // Arrange
        var componentId = "comp-001";
        var client = _factory.CreateClient();
        var content = CreateValidZipContent();

        // Act
        var response = await client.PostAsync(
            $"/api/components/{componentId}/materials",
            content);

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GET /api/components/{componentId}/materials (List)

    [Fact]
    public async Task GetMaterials_ReturnsVersionList()
    {
        // Arrange
        var componentId = "comp-001";
        var materials = CreateTestMaterials(componentId, 3);
        SetupMockGetMaterials(componentId, materials);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync($"/api/components/{componentId}/materials");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<MaterialListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.Materials.Should().HaveCount(3);
        result.Data.Materials.Should().BeInDescendingOrder(m => m.Version);
    }

    [Fact]
    public async Task GetMaterials_EmptyList_ReturnsEmpty()
    {
        // Arrange
        var componentId = "comp-001";
        SetupMockGetMaterials(componentId, new List<CourseMaterial>());
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync($"/api/components/{componentId}/materials");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<MaterialListResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data!.Materials.Should().BeEmpty();
    }

    [Fact]
    public async Task GetMaterials_Unauthenticated_Returns401()
    {
        // Arrange
        var componentId = "comp-001";
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync($"/api/components/{componentId}/materials");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region DELETE /api/materials/{materialId} (Delete)

    [Fact]
    public async Task DeleteMaterial_AsOwner_ReturnsSuccess()
    {
        // Arrange
        var materialId = "mat-001";
        var ownerId = "teacher-123";
        var material = CreateTestMaterial(materialId, "comp-001", 1, ownerId);
        SetupMockGetMaterial(materialId, material);
        SetupMockDeleteMaterial(materialId);
        SetupMockDeleteFiles();
        var client = CreateAuthenticatedClient(ownerId, "teacher");

        // Act
        var response = await client.DeleteAsync($"/api/materials/{materialId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Message.Should().Contain("deleted");
    }

    [Fact]
    public async Task DeleteMaterial_AsAdmin_ReturnsSuccess()
    {
        // Arrange
        var materialId = "mat-001";
        var material = CreateTestMaterial(materialId, "comp-001", 1, "other-teacher");
        SetupMockGetMaterial(materialId, material);
        SetupMockDeleteMaterial(materialId);
        SetupMockDeleteFiles();
        var client = CreateAuthenticatedClient("admin-123", "admin");

        // Act
        var response = await client.DeleteAsync($"/api/materials/{materialId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);
    }

    [Fact]
    public async Task DeleteMaterial_NotOwner_Returns403()
    {
        // Arrange
        var materialId = "mat-001";
        var material = CreateTestMaterial(materialId, "comp-001", 1, "other-teacher");
        SetupMockGetMaterial(materialId, material);
        var client = CreateAuthenticatedClient("different-teacher", "teacher");

        // Act
        var response = await client.DeleteAsync($"/api/materials/{materialId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteMaterial_AsStudent_Returns403()
    {
        // Arrange
        var materialId = "mat-001";
        var client = CreateAuthenticatedClient("student-123", "member");

        // Act
        var response = await client.DeleteAsync($"/api/materials/{materialId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Forbidden);
    }

    [Fact]
    public async Task DeleteMaterial_NotFound_Returns404()
    {
        // Arrange
        var materialId = "non-existent";
        SetupMockGetMaterial(materialId, null);
        var client = CreateAuthenticatedClient("teacher-123", "teacher");

        // Act
        var response = await client.DeleteAsync($"/api/materials/{materialId}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    #endregion

    #region GET /api/materials/{materialId}/download (Download)

    [Fact]
    public async Task DownloadMaterial_ReturnsRedirect()
    {
        // Arrange
        var materialId = "mat-001";
        var material = CreateTestMaterial(materialId, "comp-001", 1, "teacher-123");
        var signedUrl = "https://storage.googleapis.com/bucket/file.zip?signature=xxx";
        SetupMockGetMaterial(materialId, material);
        // Download endpoint uses {storagePath}/{entryPoint}
        var downloadPath = $"{material.StoragePath}/{material.Manifest?.EntryPoint ?? "index.html"}";
        SetupMockGetSignedUrl(downloadPath, signedUrl);
        var client = CreateAuthenticatedClient("user-123", "member", allowAutoRedirect: false);

        // Act
        var response = await client.GetAsync($"/api/materials/{materialId}/download");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Redirect);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Contain("storage.googleapis.com");
    }

    [Fact]
    public async Task DownloadMaterial_NotFound_Returns404()
    {
        // Arrange
        var materialId = "non-existent";
        SetupMockGetMaterial(materialId, null);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync($"/api/materials/{materialId}/download");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task DownloadMaterial_Unauthenticated_Returns401()
    {
        // Arrange
        var materialId = "mat-001";
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync($"/api/materials/{materialId}/download");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GET /api/materials/{materialId}/manifest (Manifest)

    [Fact]
    public async Task GetManifest_ReturnsFileList()
    {
        // Arrange
        var materialId = "mat-001";
        var componentId = "comp-001";
        var files = new[] { "index.html", "script.md", "assets/images/slide01.png" };
        var material = CreateTestMaterial(materialId, componentId, 1, "teacher-123", files);
        var baseUrl = "https://storage.googleapis.com/bucket/materials/comp-001/v1";
        SetupMockGetMaterial(materialId, material);
        SetupMockGetBaseUrl(material.StoragePath!, baseUrl);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync($"/api/materials/{materialId}/manifest");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.OK);

        var result = await response.Content.ReadFromJsonAsync<ApiResponse<MaterialManifestResponse>>();
        result.Should().NotBeNull();
        result!.Success.Should().BeTrue();
        result.Data.Should().NotBeNull();
        result.Data!.MaterialId.Should().Be(materialId);
        result.Data.ComponentId.Should().Be(componentId);
        result.Data.Version.Should().Be(1);
        result.Data.EntryPoint.Should().Be("index.html");
        result.Data.Files.Should().BeEquivalentTo(files);
        result.Data.BaseUrl.Should().NotBeNullOrEmpty();
    }

    [Fact]
    public async Task GetManifest_NotFound_Returns404()
    {
        // Arrange
        var materialId = "non-existent";
        SetupMockGetMaterial(materialId, null);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync($"/api/materials/{materialId}/manifest");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetManifest_Unauthenticated_Returns401()
    {
        // Arrange
        var materialId = "mat-001";
        var client = _factory.CreateClient();

        // Act
        var response = await client.GetAsync($"/api/materials/{materialId}/manifest");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Unauthorized);
    }

    #endregion

    #region GET /api/materials/{materialId}/file (Get File)

    [Fact]
    public async Task GetFile_ReturnsRedirectToSignedUrl()
    {
        // Arrange
        var materialId = "mat-001";
        var filePath = "assets/images/slide01.png";
        var material = CreateTestMaterial(materialId, "comp-001", 1, "teacher-123",
            new[] { "index.html", filePath });
        var signedUrl = $"https://storage.googleapis.com/bucket/{filePath}?signature=xxx";
        SetupMockGetMaterial(materialId, material);
        SetupMockGetFileSignedUrl(material.StoragePath!, filePath, signedUrl);
        var client = CreateAuthenticatedClient("user-123", "member", allowAutoRedirect: false);

        // Act
        var response = await client.GetAsync(
            $"/api/materials/{materialId}/file?path={Uri.EscapeDataString(filePath)}");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.Redirect);
        response.Headers.Location.Should().NotBeNull();
        response.Headers.Location!.ToString().Should().Contain("storage.googleapis.com");
    }

    [Fact]
    public async Task GetFile_FileNotInManifest_Returns404()
    {
        // Arrange
        var materialId = "mat-001";
        var material = CreateTestMaterial(materialId, "comp-001", 1, "teacher-123",
            new[] { "index.html" });
        SetupMockGetMaterial(materialId, material);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync(
            $"/api/materials/{materialId}/file?path=nonexistent.png");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.NotFound);
    }

    [Fact]
    public async Task GetFile_PathTraversal_ReturnsBadRequest()
    {
        // Arrange
        var materialId = "mat-001";
        var material = CreateTestMaterial(materialId, "comp-001", 1, "teacher-123");
        SetupMockGetMaterial(materialId, material);
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync(
            $"/api/materials/{materialId}/file?path=../../../etc/passwd");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    [Fact]
    public async Task GetFile_MissingPath_ReturnsBadRequest()
    {
        // Arrange
        var materialId = "mat-001";
        var client = CreateAuthenticatedClient("user-123", "member");

        // Act
        var response = await client.GetAsync($"/api/materials/{materialId}/file");

        // Assert
        response.StatusCode.Should().Be(HttpStatusCode.BadRequest);
    }

    #endregion

    #region Helper Methods

    private static void RemoveService<T>(IServiceCollection services)
    {
        var descriptor = services.SingleOrDefault(d => d.ServiceType == typeof(T));
        if (descriptor != null)
        {
            services.Remove(descriptor);
        }
    }

    private HttpClient CreateAuthenticatedClient(string uid, string role, bool allowAutoRedirect = true)
    {
        HttpClient client;
        if (!allowAutoRedirect)
        {
            client = _factory.CreateClient(new WebApplicationFactoryClientOptions
            {
                AllowAutoRedirect = false
            });
        }
        else
        {
            client = _factory.CreateClient();
        }

        client.DefaultRequestHeaders.Add(TestAuthHandler.UserIdHeader, uid);
        client.DefaultRequestHeaders.Add(TestAuthHandler.UserRoleHeader, role);
        return client;
    }

    private static MultipartFormDataContent CreateValidZipContent()
    {
        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            // Add index.html
            var indexEntry = archive.CreateEntry("index.html");
            using (var writer = new StreamWriter(indexEntry.Open()))
            {
                writer.Write("<html><body>Hello</body></html>");
            }

            // Add script.md
            var scriptEntry = archive.CreateEntry("script.md");
            using (var writer = new StreamWriter(scriptEntry.Open()))
            {
                writer.Write("# Script\nContent here");
            }
        }

        memoryStream.Position = 0;
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(memoryStream.ToArray());
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        content.Add(fileContent, "file", "lesson.zip");
        return content;
    }

    private static MultipartFormDataContent CreateZipContentWithoutIndexHtml()
    {
        using var memoryStream = new MemoryStream();
        using (var archive = new ZipArchive(memoryStream, ZipArchiveMode.Create, true))
        {
            // Add only script.md, no index.html
            var scriptEntry = archive.CreateEntry("script.md");
            using (var writer = new StreamWriter(scriptEntry.Open()))
            {
                writer.Write("# Script\nContent here");
            }
        }

        memoryStream.Position = 0;
        var content = new MultipartFormDataContent();
        var fileContent = new ByteArrayContent(memoryStream.ToArray());
        fileContent.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        content.Add(fileContent, "file", "lesson.zip");
        return content;
    }

    private static MultipartFormDataContent CreateOversizedContent()
    {
        var content = new MultipartFormDataContent();
        // Create a content with size header exceeding limit (we'll use a mock for actual validation)
        var largeContent = new ByteArrayContent(new byte[1024]); // Small actual content
        largeContent.Headers.ContentType = new MediaTypeHeaderValue("application/zip");
        largeContent.Headers.Add("X-Content-Size", (MaxFileSize + 1).ToString());
        content.Add(largeContent, "file", "large.zip");

        // Add header to indicate intended size for testing
        content.Headers.Add("X-Expected-Size", (MaxFileSize + 1).ToString());
        return content;
    }

    private List<CourseMaterial> CreateTestMaterials(string componentId, int count)
    {
        return Enumerable.Range(1, count)
            .Select(i => CreateTestMaterial($"mat-{i}", componentId, i, "teacher-123"))
            .OrderByDescending(m => m.Version)
            .ToList();
    }

    private CourseMaterial CreateTestMaterial(
        string id,
        string componentId,
        int version,
        string uploadedBy,
        string[]? files = null)
    {
        files ??= new[] { "index.html", "script.md" };
        return new CourseMaterial
        {
            Id = id,
            ComponentId = componentId,
            Version = version,
            Filename = "lesson.zip",
            Size = 1024000,
            StoragePath = $"materials/{componentId}/v{version}",
            Manifest = new MaterialManifest
            {
                EntryPoint = "index.html",
                Files = files
            },
            UploadedBy = uploadedBy,
            UploadedAt = DateTime.UtcNow.AddDays(-version)
        };
    }

    private void SetupMockComponentExists(string componentId, bool exists)
    {
        if (exists)
        {
            _mockFirebaseService
                .Setup(s => s.GetDocumentAsync<LearningComponentDetail>("components", componentId))
                .ReturnsAsync(new LearningComponentDetail { Id = componentId });
        }
        else
        {
            _mockFirebaseService
                .Setup(s => s.GetDocumentAsync<LearningComponentDetail>("components", componentId))
                .ReturnsAsync((LearningComponentDetail?)null);
        }
    }

    private void SetupMockAddMaterial(string materialId)
    {
        _mockFirebaseService
            .Setup(s => s.AddDocumentAsync(It.IsAny<string>(), It.IsAny<CourseMaterial>()))
            .ReturnsAsync(materialId);

        _mockFirebaseService
            .Setup(s => s.GetNextMaterialVersionAsync(It.IsAny<string>()))
            .ReturnsAsync(1);
    }

    private void SetupMockUploadFile()
    {
        _mockStorageService
            .Setup(s => s.UploadFileAsync(
                It.IsAny<string>(),
                It.IsAny<Stream>(),
                It.IsAny<string>()))
            .ReturnsAsync("materials/comp-001/v1/file.zip");
    }

    private void SetupMockGetMaterials(string componentId, List<CourseMaterial> materials)
    {
        _mockFirebaseService
            .Setup(s => s.GetMaterialsByComponentIdAsync(componentId))
            .ReturnsAsync(materials);
    }

    private void SetupMockGetMaterial(string materialId, CourseMaterial? material)
    {
        _mockFirebaseService
            .Setup(s => s.GetDocumentAsync<CourseMaterial>("materials", materialId))
            .ReturnsAsync(material);
    }

    private void SetupMockDeleteMaterial(string materialId)
    {
        _mockFirebaseService
            .Setup(s => s.DeleteDocumentAsync("materials", materialId))
            .Returns(Task.CompletedTask);
    }

    private void SetupMockDeleteFiles()
    {
        _mockStorageService
            .Setup(s => s.DeleteFolderAsync(It.IsAny<string>()))
            .Returns(Task.CompletedTask);
    }

    private void SetupMockGetSignedUrl(string storagePath, string signedUrl)
    {
        _mockStorageService
            .Setup(s => s.GetSignedUrlAsync(It.Is<string>(p => p.Contains(storagePath) || p == storagePath), It.IsAny<TimeSpan>()))
            .ReturnsAsync(signedUrl);
    }

    private void SetupMockGetBaseUrl(string storagePath, string baseUrl)
    {
        _mockStorageService
            .Setup(s => s.GetPublicBaseUrlAsync(storagePath))
            .ReturnsAsync(baseUrl);
    }

    private void SetupMockGetFileSignedUrl(string storagePath, string filePath, string signedUrl)
    {
        _mockStorageService
            .Setup(s => s.GetSignedUrlAsync($"{storagePath}/{filePath}", It.IsAny<TimeSpan>()))
            .ReturnsAsync(signedUrl);
    }

    #endregion
}
