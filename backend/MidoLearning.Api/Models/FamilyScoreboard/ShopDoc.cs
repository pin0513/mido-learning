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

    [FirestoreProperty("xpPrice")]
    public int XpPrice { get; set; }

    [FirestoreProperty("type")]
    public string Type { get; set; } = "activity"; // physical | activity | privilege | money

    [FirestoreProperty("emoji")]
    public string Emoji { get; set; } = "🎁";

    [FirestoreProperty("isActive")]
    public bool IsActive { get; set; } = true;

    [FirestoreProperty("stock")]
    public int? Stock { get; set; }

    [FirestoreProperty("allowancePrice")]
    public int AllowancePrice { get; set; }

    [FirestoreProperty("dailyLimit")]
    public int? DailyLimit { get; set; } // null = 無上限; 1 = 每日一次

    [FirestoreProperty("allowanceGiven")]
    public int AllowanceGiven { get; set; } // 僅 priceType=xp 時：給予多少零用金

    [FirestoreProperty("durationMinutes")]
    public int? DurationMinutes { get; set; } // 時效道具：兌換後 ActiveEffect 持續分鐘數

    [FirestoreProperty("effectType")]
    public string? EffectType { get; set; } // 'xp-multiplier' | 'time-item' | null

    [FirestoreProperty("effectValue")]
    public double? EffectValue { get; set; } // xp-multiplier 倍率（stored as double in Firestore）

    public ShopItemDto ToDto() => new(
        ItemId, Name, Description, XpPrice, Type, Emoji, IsActive, Stock,
        AllowancePrice, DailyLimit, AllowanceGiven, DurationMinutes, EffectType,
        EffectValue.HasValue ? (decimal?)Convert.ToDecimal(EffectValue.Value) : null
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

    [FirestoreProperty("paymentMethod")]
    public string? PaymentMethod { get; set; }

    public ShopOrderDto ToDto() => new(
        OrderId, PlayerId, ItemId, ItemName, Price, Status,
        RequestedAt.ToDateTimeOffset(),
        ProcessedAt?.ToDateTimeOffset(),
        ProcessedBy, Note, PaymentMethod
    );
}

[FirestoreData]
public class WithdrawalRequestDoc
{
    [FirestoreProperty("requestId")]
    public string RequestId { get; set; } = "";

    [FirestoreProperty("playerId")]
    public string PlayerId { get; set; } = "";

    [FirestoreProperty("amount")]
    public int Amount { get; set; }

    [FirestoreProperty("reason")]
    public string Reason { get; set; } = "";

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

    public WithdrawalRequestDto ToDto() => new(
        RequestId, PlayerId, Amount, Reason, Status,
        RequestedAt.ToDateTime(),
        ProcessedAt?.ToDateTime(),
        ProcessedBy, Note);
}
