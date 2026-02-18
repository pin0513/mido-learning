using MidoLearning.Api.Models.Music;
using MidoLearning.Api.Services.Music;

namespace MidoLearning.Api.Endpoints;

public static class MusicEndpoints
{
    public static void MapMusicEndpoints(this WebApplication app)
    {
        var group = app.MapGroup("/api/music")
            .RequireAuthorization("AuthenticatedOnly");

        // POST /api/music/upload-recording
        group.MapPost("/upload-recording", async (
            HttpRequest request,
            IMusicProducerService service,
            CancellationToken ct) =>
        {
            if (!request.HasFormContentType)
                return Results.BadRequest(new { success = false, message = "Expected multipart form data" });

            var form = await request.ReadFormAsync(ct);
            var file = form.Files.GetFile("file");

            if (file is null || file.Length == 0)
                return Results.BadRequest(new { success = false, message = "No audio file provided" });

            await using var stream = file.OpenReadStream();
            var result = await service.UploadAndAnalyzeAsync(stream, file.FileName, ct);

            return Results.Ok(new
            {
                success = true,
                data = result,
            });
        })
        .WithName("UploadRecording")
        .WithOpenApi();

        // POST /api/music/generate
        group.MapPost("/generate", async (
            GenerateMusicRequest request,
            IMusicProducerService service,
            CancellationToken ct) =>
        {
            var taskId = await service.StartGenerationAsync(request, ct);
            return Results.Ok(new { success = true, data = new { task_id = taskId } });
        })
        .WithName("GenerateMusic")
        .WithOpenApi();

        // GET /api/music/status/{id}
        group.MapGet("/status/{taskId}", (
            string taskId,
            IMusicProducerService service) =>
        {
            var status = service.GetTaskStatus(taskId);
            if (status is null)
                return Results.NotFound(new { success = false, message = "Task not found" });

            return Results.Ok(new { success = true, data = status });
        })
        .WithName("GetMusicStatus")
        .WithOpenApi();

        // GET /api/music/download/{id}/{type}
        group.MapGet("/download/{taskId}/{fileType}", async (
            string taskId,
            string fileType,
            IMusicProducerService service,
            CancellationToken ct) =>
        {
            try
            {
                var (stream, contentType, fileName) = await service.DownloadAsync(taskId, fileType, ct);
                return Results.File(stream, contentType, fileName);
            }
            catch (KeyNotFoundException)
            {
                return Results.NotFound(new { success = false, message = "Task not found" });
            }
            catch (Exception ex)
            {
                return Results.Problem(ex.Message);
            }
        })
        .WithName("DownloadMusicFile")
        .WithOpenApi();
    }
}
