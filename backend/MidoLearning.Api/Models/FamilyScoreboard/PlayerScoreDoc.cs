using Google.Cloud.Firestore;

namespace MidoLearning.Api.Models.FamilyScoreboard;

/// <summary>
/// Firestore document model for the 'scores/{playerId}' sub-collection.
/// Maps to: families/{familyId}/scores/{playerId}
/// </summary>
[FirestoreData]
public class PlayerScoreDoc
{
    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("color")]
    public string Color { get; set; } = "#4CAF50";

    [FirestoreProperty("achievementPoints")]
    public int AchievementPoints { get; set; }

    [FirestoreProperty("redeemablePoints")]
    public int RedeemablePoints { get; set; }

    [FirestoreProperty("totalEarned")]
    public int TotalEarned { get; set; }

    [FirestoreProperty("totalDeducted")]
    public int TotalDeducted { get; set; }

    [FirestoreProperty("totalRedeemed")]
    public int TotalRedeemed { get; set; }

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("updatedAt")]
    public Timestamp UpdatedAt { get; set; }

    public PlayerScoreDto ToDto() => new(
        PlayerId, Name, Color,
        AchievementPoints, RedeemablePoints,
        TotalEarned, TotalDeducted, TotalRedeemed
    );
}

/// <summary>
/// Firestore document model for the 'transactions/{txId}' sub-collection.
/// Maps to: families/{familyId}/transactions/{transactionId}
/// </summary>
[FirestoreData]
public class TransactionDoc
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("playerIds")]
    public List<string> PlayerIds { get; set; } = new();

    [FirestoreProperty("type")]
    public string Type { get; set; } = string.Empty;  // "earn" | "deduct"

    [FirestoreProperty("amount")]
    public int Amount { get; set; }

    [FirestoreProperty("reason")]
    public string Reason { get; set; } = string.Empty;

    [FirestoreProperty("categoryId")]
    public string? CategoryId { get; set; }

    [FirestoreProperty("createdBy")]
    public string CreatedBy { get; set; } = string.Empty;

    [FirestoreProperty("createdAt")]
    public Timestamp CreatedAt { get; set; }

    [FirestoreProperty("note")]
    public string? Note { get; set; }

    public TransactionDto ToDto() => new(
        Id, PlayerIds.AsReadOnly(), Type, Amount, Reason, CategoryId,
        CreatedBy, CreatedAt.ToDateTimeOffset(), Note
    );
}

/// <summary>
/// Firestore document model for the 'rewards/{rewardId}' sub-collection.
/// Maps to: families/{familyId}/rewards/{rewardId}
/// </summary>
[FirestoreData]
public class RewardDoc
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("cost")]
    public int Cost { get; set; }

    [FirestoreProperty("description")]
    public string Description { get; set; } = string.Empty;

    [FirestoreProperty("icon")]
    public string Icon { get; set; } = "🎁";

    [FirestoreProperty("isActive")]
    public bool IsActive { get; set; } = true;

    [FirestoreProperty("stock")]
    public int? Stock { get; set; }

    public RewardDto ToDto() => new(Id, Name, Cost, Description, Icon, IsActive, Stock);
}

/// <summary>
/// Firestore document model for the 'redemptions/{redemptionId}' sub-collection.
/// Maps to: families/{familyId}/redemptions/{redemptionId}
/// </summary>
[FirestoreData]
public class RedemptionDoc
{
    [FirestoreProperty("id")]
    public string Id { get; set; } = string.Empty;

    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("rewardId")]
    public string RewardId { get; set; } = string.Empty;

    [FirestoreProperty("rewardName")]
    public string RewardName { get; set; } = string.Empty;

    [FirestoreProperty("cost")]
    public int Cost { get; set; }

    [FirestoreProperty("status")]
    public string Status { get; set; } = "pending";  // "pending" | "approved" | "rejected"

    [FirestoreProperty("requestedAt")]
    public Timestamp RequestedAt { get; set; }

    [FirestoreProperty("processedAt")]
    public Timestamp? ProcessedAt { get; set; }

    [FirestoreProperty("processedBy")]
    public string? ProcessedBy { get; set; }

    [FirestoreProperty("note")]
    public string? Note { get; set; }

    public RedemptionDto ToDto() => new(
        Id, PlayerId, RewardId, RewardName, Cost, Status,
        RequestedAt.ToDateTimeOffset(),
        ProcessedAt?.ToDateTimeOffset(),
        ProcessedBy, Note
    );
}
