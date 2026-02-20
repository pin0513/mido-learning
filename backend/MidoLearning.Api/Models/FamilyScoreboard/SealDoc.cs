using Google.Cloud.Firestore;
namespace MidoLearning.Api.Models.FamilyScoreboard;

[FirestoreData]
public class SealDoc
{
    [FirestoreProperty("sealId")]
    public string SealId { get; set; } = string.Empty;

    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("type")]
    public string Type { get; set; } = "custom"; // 'no-tv' | 'no-toys' | 'no-games' | 'no-sweets' | 'custom'

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("status")]
    public string Status { get; set; } = "active"; // 'active' | 'lifted'

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("liftedAt")]
    public Timestamp? LiftedAt { get; set; }

    public SealDto ToDto() => new(
        SealId, PlayerId, Name, Type, Description, Status, CreatedBy,
        CreatedAt.ToDateTimeOffset(), LiftedAt?.ToDateTimeOffset()
    );
}
