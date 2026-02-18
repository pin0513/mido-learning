namespace MidoLearning.Api.Models.Music;

public class GenerateMusicRequest
{
    public string Key { get; set; } = "C";
    public float Bpm { get; set; } = 120f;
    public string Style { get; set; } = "pop";
    public int Bars { get; set; } = 8;
    public string? RecordingId { get; set; }
    public string Engine { get; set; } = "theory_v1";
}
