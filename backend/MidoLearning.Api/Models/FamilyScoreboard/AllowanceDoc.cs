using Google.Cloud.Firestore;
namespace MidoLearning.Api.Models.FamilyScoreboard;

[FirestoreData]
public class AllowanceLedgerDoc
{
    [FirestoreProperty("recordId")]
    public string RecordId { get; set; } = string.Empty;

    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("amount")]
    public int Amount { get; set; } // positive = earn, negative = spend

    [FirestoreProperty("reason")]
    public string Reason { get; set; } = string.Empty;

    [FirestoreProperty("type")]
    public string Type { get; set; } = "earn"; // earn | spend | adjust

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("note")]
    public string? Note { get; set; }

    public AllowanceLedgerDto ToDto() => new(
        RecordId, PlayerId, Amount, Reason, Type, CreatedBy,
        CreatedAt.ToDateTimeOffset(), Note
    );
}
