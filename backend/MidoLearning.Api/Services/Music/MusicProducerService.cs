using MidoLearning.Api.Models.Music;

namespace MidoLearning.Api.Services.Music;

public class MusicProducerService : IMusicProducerService
{
    private readonly IPythonSidecarClient _sidecar;
    private readonly MusicTaskStore _taskStore;
    private readonly ILogger<MusicProducerService> _logger;

    // Map from our task ID to sidecar task ID
    private readonly Dictionary<string, string> _taskMap = new();

    public MusicProducerService(
        IPythonSidecarClient sidecar,
        MusicTaskStore taskStore,
        ILogger<MusicProducerService> logger)
    {
        _sidecar = sidecar;
        _taskStore = taskStore;
        _logger = logger;
    }

    public async Task<AnalysisResult> UploadAndAnalyzeAsync(Stream audioStream, string fileName, CancellationToken ct = default)
    {
        try
        {
            return await _sidecar.AnalyzeAudioAsync(audioStream, fileName, ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Audio analysis failed, returning defaults");
            return new AnalysisResult { Confidence = 0 };
        }
    }

    public async Task<string> StartGenerationAsync(GenerateMusicRequest request, CancellationToken ct = default)
    {
        var taskId = Guid.NewGuid().ToString();
        var sidecarTaskId = await _sidecar.StartGenerationAsync(request, ct);

        _taskMap[taskId] = sidecarTaskId;
        _taskStore.Set(taskId, new MusicTaskStatus { Status = "pending", Progress = 0 });

        // Start background polling
        _ = Task.Run(async () => await PollTaskAsync(taskId, sidecarTaskId), CancellationToken.None);

        return taskId;
    }

    public MusicTaskStatus? GetTaskStatus(string taskId) => _taskStore.Get(taskId);

    public async Task<(Stream stream, string contentType, string fileName)> DownloadAsync(
        string taskId, string fileType, CancellationToken ct = default)
    {
        if (!_taskMap.TryGetValue(taskId, out var sidecarTaskId))
            throw new KeyNotFoundException($"Task {taskId} not found");

        var stream = await _sidecar.DownloadFileAsync(sidecarTaskId, fileType, ct);
        var ext = fileType switch
        {
            "mp3" => "mp3",
            "wav" => "wav",
            _ => "mid",
        };
        var contentType = fileType switch
        {
            "mp3" => "audio/mpeg",
            "wav" => "audio/wav",
            _ => "audio/midi",
        };
        return (stream, contentType, $"{taskId}.{ext}");
    }

    private async Task PollTaskAsync(string taskId, string sidecarTaskId)
    {
        var maxAttempts = 120; // 2 minutes with 1s interval
        for (int i = 0; i < maxAttempts; i++)
        {
            await Task.Delay(1000);
            try
            {
                var status = await _sidecar.GetStatusAsync(sidecarTaskId);
                _taskStore.Set(taskId, status);

                if (status.Status is "completed" or "failed")
                    break;
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "Polling failed for task {TaskId}", taskId);
            }
        }
    }
}
