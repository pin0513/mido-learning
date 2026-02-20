using Google.Cloud.Firestore;
namespace MidoLearning.Api.Models.FamilyScoreboard;

[FirestoreData]
public class TaskTemplateDoc
{
    [FirestoreProperty("templateId")]
    public string TemplateId { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("taskIds")]
    public List<string> TaskIds { get; set; } = new();

    public TaskTemplateDto ToDto() => new(
        TemplateId, Name, Description, TaskIds.AsReadOnly()
    );
}
