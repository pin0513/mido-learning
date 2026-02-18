using MidoLearning.Api.Models.Music;

namespace MidoLearning.Api.Services.Music;

public interface IMusicProducerService
{
    Task<AnalysisResult> UploadAndAnalyzeAsync(Stream audioStream, string fileName, CancellationToken ct = default);
    Task<string> StartGenerationAsync(GenerateMusicRequest request, CancellationToken ct = default);
    MusicTaskStatus? GetTaskStatus(string taskId);
    Task<(Stream stream, string contentType, string fileName)> DownloadAsync(string taskId, string fileType, CancellationToken ct = default);
}
