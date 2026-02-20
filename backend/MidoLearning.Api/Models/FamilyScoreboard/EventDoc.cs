using Google.Cloud.Firestore;
namespace MidoLearning.Api.Models.FamilyScoreboard;

[FirestoreData]
public class EventDoc
{
    [FirestoreProperty("eventId")]
    public string EventId { get; set; } = string.Empty;

    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    [FirestoreProperty("type")]
    public string Type { get; set; } = "activity"; // trip | sports | activity | other

    [FirestoreProperty("startDate")]
    public string StartDate { get; set; } = string.Empty; // yyyy-MM-dd

    [FirestoreProperty("endDate")]
    public string? EndDate { get; set; }

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("emoji")]
    public string Emoji { get; set; } = "📅";

    [FirestoreProperty("color")]
    public string Color { get; set; } = "#4CAF50";

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    public EventDto ToDto() => new(
        EventId, Title, Type, StartDate, EndDate, Description, Emoji, Color,
        CreatedBy, CreatedAt.ToDateTimeOffset()
    );
}
