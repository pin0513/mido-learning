using Google.Cloud.Firestore;
namespace MidoLearning.Api.Models.FamilyScoreboard;

[FirestoreData]
public class TaskDoc
{
    [FirestoreProperty("taskId")]
    public string TaskId { get; set; } = string.Empty;

    [FirestoreProperty("title")]
    public string Title { get; set; } = string.Empty;

    [FirestoreProperty("type")]
    public string Type { get; set; } = string.Empty; // household | exam | activity

    [FirestoreProperty("difficulty")]
    public string Difficulty { get; set; } = "easy"; // easy | medium | hard

    [FirestoreProperty("xpReward")]
    public int XpReward { get; set; }

    [FirestoreProperty("description")]
    public string? Description { get; set; }

    [FirestoreProperty("isActive")]
    public bool IsActive { get; set; } = true;

    [FirestoreProperty("assignedPlayerIds")]
    public List<string> AssignedPlayerIds { get; set; } = new();

    [FirestoreProperty("periodType")]
    public string PeriodType { get; set; } = "once"; // once | daily | weekly

    [FirestoreProperty("weekDays")]
    public List<int> WeekDays { get; set; } = new(); // 0=Sun,1=Mon...6=Sat

    [FirestoreProperty("allowanceReward")]
    public int AllowanceReward { get; set; } // 零用金獎勵

    [FirestoreProperty("templateId")]
    public string? TemplateId { get; set; } // 屬於哪個任務範本

    [FirestoreProperty("playerProposed")]
    public bool PlayerProposed { get; set; } // 玩家自行提議

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    public TaskDto ToDto() => new(
        TaskId, Title, Type, Difficulty, XpReward, AllowanceReward, Description,
        IsActive, PeriodType, WeekDays.AsReadOnly(), AssignedPlayerIds.AsReadOnly(), PlayerProposed
    );
}

[FirestoreData]
public class TaskCompletionDoc
{
    [FirestoreProperty("completionId")]
    public string CompletionId { get; set; } = string.Empty;

    [FirestoreProperty("taskId")]
    public string TaskId { get; set; } = string.Empty;

    [FirestoreProperty("taskTitle")]
    public string TaskTitle { get; set; } = string.Empty;

    [FirestoreProperty("xpReward")]
    public int XpReward { get; set; }

    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("note")]
    public string? Note { get; set; }

    [FirestoreProperty("status")]
    public string Status { get; set; } = "pending"; // pending | approved | rejected

    [FirestoreProperty("submittedAt")]
    public Timestamp SubmittedAt { get; set; }

    [FirestoreProperty("processedAt")]
    public Timestamp? ProcessedAt { get; set; }

    [FirestoreProperty("processedBy")]
    public string? ProcessedBy { get; set; }

    [FirestoreProperty("transactionId")]
    public string? TransactionId { get; set; }

    public TaskCompletionDto ToDto() => new(
        CompletionId, TaskId, TaskTitle, XpReward, PlayerId, Note, Status,
        SubmittedAt.ToDateTimeOffset(),
        ProcessedAt?.ToDateTimeOffset()
    );
}

[FirestoreData]
public class PlayerSubmissionDoc
{
    [FirestoreProperty("submissionId")]
    public string SubmissionId { get; set; } = string.Empty;

    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("type")]
    public string Type { get; set; } = "earn";

    [FirestoreProperty("amount")]
    public int Amount { get; set; }

    [FirestoreProperty("reason")]
    public string Reason { get; set; } = string.Empty;

    [FirestoreProperty("categoryType")]
    public string CategoryType { get; set; } = string.Empty; // household | exam | activity

    [FirestoreProperty("note")]
    public string? Note { get; set; }

    [FirestoreProperty("status")]
    public string Status { get; set; } = "pending"; // pending | approved | rejected

    [FirestoreProperty("submittedAt")]
    public Timestamp SubmittedAt { get; set; }

    [FirestoreProperty("processedAt")]
    public Timestamp? ProcessedAt { get; set; }

    [FirestoreProperty("processedBy")]
    public string? ProcessedBy { get; set; }

    [FirestoreProperty("transactionId")]
    public string? TransactionId { get; set; }

    public PlayerSubmissionDto ToDto() => new(
        SubmissionId, PlayerId, Type, Amount, Reason, CategoryType, Note, Status,
        SubmittedAt.ToDateTimeOffset(),
        ProcessedAt?.ToDateTimeOffset()
    );
}
