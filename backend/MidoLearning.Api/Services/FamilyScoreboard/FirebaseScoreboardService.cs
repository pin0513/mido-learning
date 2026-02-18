using Google.Cloud.Firestore;
using MidoLearning.Api.Models.FamilyScoreboard;

namespace MidoLearning.Api.Services.FamilyScoreboard;

public class FirebaseScoreboardService : IFamilyScoreboardService
{
    private readonly FirestoreDb _db;
    private readonly ILogger<FirebaseScoreboardService> _logger;

    public FirebaseScoreboardService(FirestoreDb db, ILogger<FirebaseScoreboardService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── Firestore path helpers ────────────────────────────────────────────────

    private CollectionReference Scores(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("scores");

    private CollectionReference Transactions(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("transactions");

    private CollectionReference Rewards(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("rewards");

    private CollectionReference Redemptions(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("redemptions");

    // ── InitializeAsync ───────────────────────────────────────────────────────

    /// <summary>
    /// Idempotent family initialization using BatchWrite.
    /// Creates default players and rewards if the family doc doesn't exist.
    /// </summary>
    public async Task InitializeAsync(string familyId, string adminUid, CancellationToken ct = default)
    {
        var familyRef = _db.Collection("families").Document(familyId);
        var snap = await familyRef.GetSnapshotAsync(ct);
        if (snap.Exists)
        {
            _logger.LogInformation("Family {FamilyId} already initialized", familyId);
            return;
        }

        var batch = _db.StartBatch();
        var now = Timestamp.GetCurrentTimestamp();

        // Create family meta document
        batch.Set(familyRef, new Dictionary<string, object>
        {
            ["adminUid"] = adminUid,
            ["familyId"] = familyId,
            ["createdAt"] = now,
        });

        // Add default players
        AddDefaultPlayer(batch, familyId, "player_1", "小明", "#4CAF50", now);
        AddDefaultPlayer(batch, familyId, "player_2", "小美", "#E91E63", now);

        // Add default reward
        var rewardRef = Rewards(familyId).Document("reward_1");
        batch.Set(rewardRef, new Dictionary<string, object>
        {
            ["id"] = "reward_1",
            ["name"] = "看一小時 YouTube",
            ["cost"] = 50,
            ["description"] = "可以看一小時 YouTube",
            ["icon"] = "📺",
            ["isActive"] = true,
            ["stock"] = (object)FieldValue.ServerTimestamp,
        });
        // Overwrite icon after: just set the whole thing cleanly
        batch.Set(rewardRef, new Dictionary<string, object>
        {
            ["id"] = "reward_1",
            ["name"] = "看一小時 YouTube",
            ["cost"] = 50,
            ["description"] = "可以看一小時 YouTube",
            ["icon"] = "📺",
            ["isActive"] = true,
        });

        await batch.CommitAsync(ct);
        _logger.LogInformation("Family {FamilyId} initialized by {AdminUid}", familyId, adminUid);
    }

    private void AddDefaultPlayer(WriteBatch batch, string familyId, string playerId, string name, string color, Timestamp now)
    {
        var docRef = Scores(familyId).Document(playerId);
        batch.Set(docRef, new Dictionary<string, object>
        {
            ["playerId"] = playerId,
            ["name"] = name,
            ["color"] = color,
            ["achievementPoints"] = 0,
            ["redeemablePoints"] = 0,
            ["totalEarned"] = 0,
            ["totalDeducted"] = 0,
            ["totalRedeemed"] = 0,
            ["createdAt"] = now,
            ["updatedAt"] = now,
        });
    }

    // ── GetScoresAsync ────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<PlayerScoreDto>> GetScoresAsync(string familyId, CancellationToken ct = default)
    {
        var snaps = await Scores(familyId).GetSnapshotAsync(ct);
        return snaps.Documents
            .Select(d => d.ConvertTo<PlayerScoreDoc>().ToDto())
            .ToList()
            .AsReadOnly();
    }

    // ── GetTransactionsAsync ──────────────────────────────────────────────────

    public async Task<IReadOnlyList<TransactionDto>> GetTransactionsAsync(
        string familyId, string? playerId = null, CancellationToken ct = default)
    {
        Query query = Transactions(familyId).OrderByDescending("createdAt").Limit(100);

        if (!string.IsNullOrEmpty(playerId))
            query = Transactions(familyId)
                .WhereArrayContains("playerIds", playerId)
                .OrderByDescending("createdAt")
                .Limit(100);

        var snaps = await query.GetSnapshotAsync(ct);
        return snaps.Documents
            .Select(d => d.ConvertTo<TransactionDoc>().ToDto())
            .ToList()
            .AsReadOnly();
    }

    // ── AddTransactionAsync ───────────────────────────────────────────────────

    /// <summary>
    /// Adds a transaction and atomically updates player scores using Firestore Transaction.
    /// </summary>
    public async Task<TransactionDto> AddTransactionAsync(
        string familyId, AddTransactionRequest request, string adminUid, CancellationToken ct = default)
    {
        var txId = Guid.NewGuid().ToString("N");
        var txRef = Transactions(familyId).Document(txId);
        var isEarn = request.Type == "earn";
        TransactionDoc? result = null;

        await _db.RunTransactionAsync(async tx =>
        {
            // 1. Read all involved player docs
            var scoreRefs = request.PlayerIds
                .Select(pid => Scores(familyId).Document(pid))
                .ToList();

            var scoreSnaps = new List<DocumentSnapshot>();
            foreach (var r in scoreRefs)
                scoreSnaps.Add(await tx.GetSnapshotAsync(r));

            // 2. Build transaction doc
            var now = Timestamp.GetCurrentTimestamp();
            var txData = new Dictionary<string, object>
            {
                ["id"] = txId,
                ["playerIds"] = request.PlayerIds.ToList(),
                ["type"] = request.Type,
                ["amount"] = request.Amount,
                ["reason"] = request.Reason,
                ["createdBy"] = adminUid,
                ["createdAt"] = now,
            };
            if (request.CategoryId != null) txData["categoryId"] = request.CategoryId;
            if (request.Note != null) txData["note"] = request.Note;

            tx.Set(txRef, txData);

            // 3. Update each player's score atomically
            foreach (var (scoreRef, snap) in scoreRefs.Zip(scoreSnaps))
            {
                if (!snap.Exists)
                {
                    _logger.LogWarning("Player doc {PlayerId} not found in family {FamilyId}", scoreRef.Id, familyId);
                    continue;
                }

                var updates = new Dictionary<string, object>
                {
                    ["updatedAt"] = now,
                };

                if (isEarn)
                {
                    updates["achievementPoints"] = FieldValue.Increment(request.Amount);
                    updates["redeemablePoints"] = FieldValue.Increment(request.Amount);
                    updates["totalEarned"] = FieldValue.Increment(request.Amount);
                }
                else
                {
                    updates["redeemablePoints"] = FieldValue.Increment(-request.Amount);
                    updates["totalDeducted"] = FieldValue.Increment(request.Amount);
                }

                tx.Update(scoreRef, updates);
            }

            result = new TransactionDoc
            {
                Id = txId,
                PlayerIds = request.PlayerIds.ToList(),
                Type = request.Type,
                Amount = request.Amount,
                Reason = request.Reason,
                CategoryId = request.CategoryId,
                CreatedBy = adminUid,
                CreatedAt = now,
                Note = request.Note,
            };
        }, cancellationToken: ct);

        return result!.ToDto();
    }

    // ── GetRewardsAsync ───────────────────────────────────────────────────────

    public async Task<IReadOnlyList<RewardDto>> GetRewardsAsync(string familyId, CancellationToken ct = default)
    {
        var snaps = await Rewards(familyId).WhereEqualTo("isActive", true).GetSnapshotAsync(ct);
        return snaps.Documents
            .Select(d => d.ConvertTo<RewardDoc>().ToDto())
            .ToList()
            .AsReadOnly();
    }

    // ── CreateRedemptionAsync ─────────────────────────────────────────────────

    public async Task<RedemptionDto> CreateRedemptionAsync(
        string familyId, CreateRedemptionRequest request, string playerUid, CancellationToken ct = default)
    {
        // Fetch reward to get name and cost
        var rewardSnap = await Rewards(familyId).Document(request.RewardId).GetSnapshotAsync(ct);
        if (!rewardSnap.Exists)
            throw new InvalidOperationException($"Reward {request.RewardId} not found");

        var reward = rewardSnap.ConvertTo<RewardDoc>();

        var redemptionId = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();

        var data = new Dictionary<string, object>
        {
            ["id"] = redemptionId,
            ["playerId"] = playerUid,
            ["rewardId"] = request.RewardId,
            ["rewardName"] = reward.Name,
            ["cost"] = reward.Cost,
            ["status"] = "pending",
            ["requestedAt"] = now,
        };
        if (request.Note != null) data["note"] = request.Note;

        await Redemptions(familyId).Document(redemptionId).SetAsync(data, cancellationToken: ct);

        return new RedemptionDto(
            redemptionId, playerUid, request.RewardId, reward.Name, reward.Cost,
            "pending", now.ToDateTimeOffset(), null, null, request.Note
        );
    }

    // ── ProcessRedemptionAsync ────────────────────────────────────────────────

    public async Task<RedemptionDto> ProcessRedemptionAsync(
        string familyId, string redemptionId, ProcessRedemptionRequest request, string adminUid, CancellationToken ct = default)
    {
        var redemptionRef = Redemptions(familyId).Document(redemptionId);
        RedemptionDoc? result = null;

        await _db.RunTransactionAsync(async tx =>
        {
            var snap = await tx.GetSnapshotAsync(redemptionRef);
            if (!snap.Exists)
                throw new InvalidOperationException($"Redemption {redemptionId} not found");

            var doc = snap.ConvertTo<RedemptionDoc>();
            if (doc.Status != "pending")
                throw new InvalidOperationException($"Redemption is already {doc.Status}");

            var now = Timestamp.GetCurrentTimestamp();
            var newStatus = request.Action == "approve" ? "approved" : "rejected";

            var updates = new Dictionary<string, object>
            {
                ["status"] = newStatus,
                ["processedAt"] = now,
                ["processedBy"] = adminUid,
            };
            if (request.Note != null) updates["note"] = request.Note;

            tx.Update(redemptionRef, updates);

            // Deduct redeemable points if approved
            if (request.Action == "approve")
            {
                var scoreRef = Scores(familyId).Document(doc.PlayerId);
                tx.Update(scoreRef, new Dictionary<string, object>
                {
                    ["redeemablePoints"] = FieldValue.Increment(-doc.Cost),
                    ["totalRedeemed"] = FieldValue.Increment(doc.Cost),
                    ["updatedAt"] = now,
                });
            }

            result = new RedemptionDoc
            {
                Id = doc.Id,
                PlayerId = doc.PlayerId,
                RewardId = doc.RewardId,
                RewardName = doc.RewardName,
                Cost = doc.Cost,
                Status = newStatus,
                RequestedAt = doc.RequestedAt,
                ProcessedAt = now,
                ProcessedBy = adminUid,
                Note = request.Note ?? doc.Note,
            };
        }, cancellationToken: ct);

        return result!.ToDto();
    }

    // ── GetRedemptionsAsync ───────────────────────────────────────────────────

    public async Task<IReadOnlyList<RedemptionDto>> GetRedemptionsAsync(
        string familyId, string? status = null, CancellationToken ct = default)
    {
        Query query = Redemptions(familyId).OrderByDescending("requestedAt").Limit(50);

        if (!string.IsNullOrEmpty(status))
            query = Redemptions(familyId)
                .WhereEqualTo("status", status)
                .OrderByDescending("requestedAt")
                .Limit(50);

        var snaps = await query.GetSnapshotAsync(ct);
        return snaps.Documents
            .Select(d => d.ConvertTo<RedemptionDoc>().ToDto())
            .ToList()
            .AsReadOnly();
    }
}
