using Google.Cloud.Firestore;
namespace MidoLearning.Api.Models.FamilyScoreboard;

[FirestoreData]
public class ActiveEffectDoc
{
    [FirestoreProperty("effectId")]
    public string EffectId { get; set; } = string.Empty;

    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("type")]
    public string Type { get; set; } = "custom"; // 'xp-multiplier' | 'time-item' | 'custom'

    [FirestoreProperty("multiplier")]
    public double? Multiplier { get; set; } // for xp-multiplier, e.g. 2.0 = double XP

    [FirestoreProperty("durationMinutes")]
    public int? DurationMinutes { get; set; }

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("status")]
    public string Status { get; set; } = "active"; // 'active' | 'expired'

    [FirestoreProperty("source")]
    public string Source { get; set; } = "admin"; // 'shop' | 'admin'

    [FirestoreProperty("sourceId")]
    public string? SourceId { get; set; }

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("expiresAt")]
    public Timestamp? ExpiresAt { get; set; }

    [FirestoreProperty("expiredAt")]
    public Timestamp? ExpiredAt { get; set; }

    public ActiveEffectDto ToDto() => new(
        EffectId, PlayerId, Name, Type,
        Multiplier.HasValue ? (decimal?)Convert.ToDecimal(Multiplier.Value) : null,
        DurationMinutes, Description, Status, Source, SourceId,
        CreatedAt.ToDateTimeOffset(), ExpiresAt?.ToDateTimeOffset(), ExpiredAt?.ToDateTimeOffset()
    );
}
