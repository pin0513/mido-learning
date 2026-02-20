using Google.Cloud.Firestore;
namespace MidoLearning.Api.Models.FamilyScoreboard;

[FirestoreData]
public class ShopItemDoc
{
    [FirestoreProperty("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [FirestoreProperty("name")]
    public string Name { get; set; } = string.Empty;

    [FirestoreProperty("description")]
    public string Description { get; set; } = string.Empty;

    [FirestoreProperty("price")]
    public int Price { get; set; }

    [FirestoreProperty("type")]
    public string Type { get; set; } = "activity"; // physical | activity | privilege | money

    [FirestoreProperty("emoji")]
    public string Emoji { get; set; } = "🎁";

    [FirestoreProperty("isActive")]
    public bool IsActive { get; set; } = true;

    [FirestoreProperty("stock")]
    public int? Stock { get; set; }

    [FirestoreProperty("priceType")]
    public string PriceType { get; set; } = "allowance"; // "allowance" | "xp"

    [FirestoreProperty("dailyLimit")]
    public int? DailyLimit { get; set; } // null = 無上限; 1 = 每日一次

    [FirestoreProperty("allowanceGiven")]
    public int AllowanceGiven { get; set; } // 僅 priceType=xp 時：給予多少零用金

    public ShopItemDto ToDto() => new(
        ItemId, Name, Description, Price, Type, Emoji, IsActive, Stock,
        PriceType, DailyLimit, AllowanceGiven
    );
}

[FirestoreData]
public class ShopOrderDoc
{
    [FirestoreProperty("orderId")]
    public string OrderId { get; set; } = string.Empty;

    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = string.Empty;

    [FirestoreProperty("itemId")]
    public string ItemId { get; set; } = string.Empty;

    [FirestoreProperty("itemName")]
    public string ItemName { get; set; } = string.Empty;

    [FirestoreProperty("price")]
    public int Price { get; set; }

    [FirestoreProperty("status")]
    public string Status { get; set; } = "pending";

    [FirestoreProperty("requestedAt")]
    public Timestamp RequestedAt { get; set; }

    [FirestoreProperty("processedAt")]
    public Timestamp? ProcessedAt { get; set; }

    [FirestoreProperty("processedBy")]
    public string? ProcessedBy { get; set; }

    [FirestoreProperty("note")]
    public string? Note { get; set; }

    public ShopOrderDto ToDto() => new(
        OrderId, PlayerId, ItemId, ItemName, Price, Status,
        RequestedAt.ToDateTimeOffset(),
        ProcessedAt?.ToDateTimeOffset(),
        ProcessedBy, Note
    );
}
