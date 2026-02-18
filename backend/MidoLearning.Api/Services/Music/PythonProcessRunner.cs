using System.Diagnostics;
using System.Text.Json;
using MidoLearning.Api.Models.Music;

namespace MidoLearning.Api.Services.Music;

public class PythonProcessRunner : IPythonSidecarClient
{
    private readonly string _scriptsDir;
    private readonly ILogger<PythonProcessRunner> _logger;

    public PythonProcessRunner(IConfiguration config, ILogger<PythonProcessRunner> logger)
    {
        _scriptsDir = config["MusicProducer:ScriptsDir"] ?? "/app/music-producer";
        _logger = logger;
    }

    private async Task<string> RunScriptAsync(string scriptName, string? stdinJson, CancellationToken ct)
    {
        var scriptPath = Path.Combine(_scriptsDir, scriptName);
        var psi = new ProcessStartInfo("python3", scriptPath)
        {
            RedirectStandardInput = true,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            WorkingDirectory = _scriptsDir,
        };

        using var process = Process.Start(psi)
            ?? throw new InvalidOperationException($"Cannot start Python script: {scriptName}");

        if (stdinJson != null)
        {
            await process.StandardInput.WriteAsync(stdinJson);
            process.StandardInput.Close();
        }

        var stdoutTask = process.StandardOutput.ReadToEndAsync(ct);
        var stderrTask = process.StandardError.ReadToEndAsync(ct);

        await Task.WhenAll(stdoutTask, stderrTask);
        await process.WaitForExitAsync(ct);

        var stdout = await stdoutTask;
        var stderr = await stderrTask;

        if (process.ExitCode != 0)
        {
            _logger.LogError("Python script {Script} exited with code {Code}: {Stderr}",
                scriptName, process.ExitCode, stderr);
            throw new InvalidOperationException($"Script {scriptName} failed (exit {process.ExitCode})");
        }

        if (!string.IsNullOrWhiteSpace(stderr))
            _logger.LogDebug("Python script {Script} stderr: {Stderr}", scriptName, stderr);

        return stdout.Trim();
    }

    public async Task<AnalysisResult> AnalyzeAudioAsync(Stream audioStream, string fileName, CancellationToken ct = default)
    {
        using var ms = new MemoryStream();
        await audioStream.CopyToAsync(ms, ct);
        var base64Audio = Convert.ToBase64String(ms.ToArray());
        var suffix = Path.GetExtension(fileName);

        var input = JsonSerializer.Serialize(new { audio_b64 = base64Audio, suffix });
        var output = await RunScriptAsync("analyze_cli.py", input, ct);
        return JsonSerializer.Deserialize<AnalysisResult>(output) ?? new AnalysisResult();
    }

    public async Task<string> StartGenerationAsync(GenerateMusicRequest request, CancellationToken ct = default)
    {
        var input = JsonSerializer.Serialize(new
        {
            engine = request.Engine,
            key = request.Key,
            bpm = request.Bpm,
            style = request.Style,
            bars = request.Bars,
            recording_id = request.RecordingId,
        });

        var output = await RunScriptAsync("generate_cli.py", input, ct);
        var doc = JsonSerializer.Deserialize<JsonElement>(output);
        return doc.GetProperty("task_id").GetString()
            ?? throw new InvalidOperationException("No task_id returned from generate_cli.py");
    }

    public async Task<MusicTaskStatus> GetStatusAsync(string sidecarTaskId, CancellationToken ct = default)
    {
        var input = JsonSerializer.Serialize(new { task_id = sidecarTaskId });
        var output = await RunScriptAsync("status_cli.py", input, ct);
        return JsonSerializer.Deserialize<MusicTaskStatus>(output) ?? new MusicTaskStatus();
    }

    public async Task<Stream> DownloadFileAsync(string sidecarTaskId, string fileType, CancellationToken ct = default)
    {
        var input = JsonSerializer.Serialize(new { task_id = sidecarTaskId, type = fileType });
        var output = await RunScriptAsync("download_cli.py", input, ct);
        var doc = JsonSerializer.Deserialize<JsonElement>(output);
        var base64Data = doc.GetProperty("data").GetString() ?? string.Empty;
        return new MemoryStream(Convert.FromBase64String(base64Data));
    }

    public async Task<List<EngineInfo>> GetEnginesAsync(CancellationToken ct = default)
    {
        var output = await RunScriptAsync("engines_cli.py", null, ct);
        return JsonSerializer.Deserialize<List<EngineInfo>>(output) ?? new List<EngineInfo>();
    }
}
