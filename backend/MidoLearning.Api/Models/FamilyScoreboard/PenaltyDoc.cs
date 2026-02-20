using Google.Cloud.Firestore;
namespace MidoLearning.Api.Models.FamilyScoreboard;

[FirestoreData]
public class PenaltyDoc
{
    [FirestoreProperty("penaltyId")]
    public string PenaltyId { get; set; } = string.Empty;

    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("type")]
    public string Type { get; set; } = "custom"; // '罰站' | '罰寫' | '道歉' | 'custom'

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("status")]
    public string Status { get; set; } = "active"; // 'active' | 'completed'

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("completedAt")]
    public Timestamp? CompletedAt { get; set; }

    public PenaltyDto ToDto() => new(
        PenaltyId, PlayerId, Name, Type, Description, Status, CreatedBy,
        CreatedAt.ToDateTimeOffset(), CompletedAt?.ToDateTimeOffset()
    );
}
