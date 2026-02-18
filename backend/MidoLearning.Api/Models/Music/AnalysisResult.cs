namespace MidoLearning.Api.Models.Music;

public class AnalysisResult
{
    public string Key { get; set; } = "C";
    public string Scale { get; set; } = "major";
    public float Bpm { get; set; } = 120f;
    public List<int>? MotifNotes { get; set; }
    public List<float>? MotifRhythm { get; set; }
    public float Confidence { get; set; }
    public string RecordingId { get; set; } = string.Empty;
}
