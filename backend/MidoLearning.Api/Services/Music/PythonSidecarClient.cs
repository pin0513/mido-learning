using System.Net.Http.Json;
using System.Text.Json;
using MidoLearning.Api.Models.Music;

namespace MidoLearning.Api.Services.Music;

public class PythonSidecarClient : IPythonSidecarClient
{
    private readonly HttpClient _http;
    private readonly ILogger<PythonSidecarClient> _logger;

    public PythonSidecarClient(HttpClient http, ILogger<PythonSidecarClient> logger)
    {
        _http = http;
        _logger = logger;
    }

    public async Task<AnalysisResult> AnalyzeAudioAsync(Stream audioStream, string fileName, CancellationToken ct = default)
    {
        using var content = new MultipartFormDataContent();
        using var streamContent = new StreamContent(audioStream);
        content.Add(streamContent, "file", fileName);

        var response = await _http.PostAsync("/analyze", content, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<AnalysisResult>(cancellationToken: ct)
            ?? new AnalysisResult();
        return result;
    }

    public async Task<string> StartGenerationAsync(GenerateMusicRequest request, CancellationToken ct = default)
    {
        var payload = new
        {
            engine = request.Engine,
            key = request.Key,
            bpm = request.Bpm,
            style = request.Style,
            bars = request.Bars,
            recording_id = request.RecordingId,
        };

        var response = await _http.PostAsJsonAsync("/generate", payload, ct);
        response.EnsureSuccessStatusCode();

        var result = await response.Content.ReadFromJsonAsync<JsonElement>(cancellationToken: ct);
        return result.GetProperty("task_id").GetString() ?? throw new InvalidOperationException("No task_id returned");
    }

    public async Task<MusicTaskStatus> GetStatusAsync(string sidecarTaskId, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"/status/{sidecarTaskId}", ct);
        if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
            return new MusicTaskStatus { Status = "not_found" };

        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<MusicTaskStatus>(cancellationToken: ct)
            ?? new MusicTaskStatus();
    }

    public async Task<Stream> DownloadFileAsync(string sidecarTaskId, string fileType, CancellationToken ct = default)
    {
        var response = await _http.GetAsync($"/download/{sidecarTaskId}/{fileType}", ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadAsStreamAsync(ct);
    }

    public async Task<List<EngineInfo>> GetEnginesAsync(CancellationToken ct = default)
    {
        var response = await _http.GetAsync("/engines", ct);
        response.EnsureSuccessStatusCode();
        return await response.Content.ReadFromJsonAsync<List<EngineInfo>>(cancellationToken: ct)
            ?? new List<EngineInfo>();
    }
}
