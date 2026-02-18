using MidoLearning.Api.Models.Music;

namespace MidoLearning.Api.Services.Music;

public interface IPythonSidecarClient
{
    Task<AnalysisResult> AnalyzeAudioAsync(Stream audioStream, string fileName, CancellationToken ct = default);
    Task<string> StartGenerationAsync(GenerateMusicRequest request, CancellationToken ct = default);
    Task<MusicTaskStatus> GetStatusAsync(string sidecarTaskId, CancellationToken ct = default);
    Task<Stream> DownloadFileAsync(string sidecarTaskId, string fileType, CancellationToken ct = default);
    Task<List<EngineInfo>> GetEnginesAsync(CancellationToken ct = default);
}

public class EngineInfo
{
    public string Name { get; set; } = string.Empty;
    public string Version { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
}
