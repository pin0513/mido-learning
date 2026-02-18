namespace MidoLearning.Api.Models.Music;

public class MusicTaskStatus
{
    public string Status { get; set; } = "pending";
    public int Progress { get; set; }
    public List<object>? ProductionLog { get; set; }
    public bool HasAudio { get; set; }
    public Dictionary<string, string>? Files { get; set; }
    public string? Error { get; set; }
}
