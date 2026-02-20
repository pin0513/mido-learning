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

    // ── Default player definitions ────────────────────────────────────────────

    /// <summary>
    /// Default players for the family. IDs are stable so scores accumulate
    /// correctly even if initialization is called more than once.
    /// </summary>
    private static readonly IReadOnlyList<(string Id, Dictionary<string, object> Fields)> DefaultPlayers =
    [
        ("playerA", new Dictionary<string, object>
        {
            ["playerId"]          = "playerA",
            ["name"]              = "Ian 祤恩",
            ["emoji"]             = "🌟",
            ["color"]             = "#4CAF50",
            ["birthday"]          = "2016-09-18",
            ["role"]              = "哥哥",
            ["achievementPoints"] = 0,
            ["redeemablePoints"]  = 0,
            ["totalEarned"]       = 0,
            ["totalDeducted"]     = 0,
            ["totalRedeemed"]     = 0,
        }),
        ("playerB", new Dictionary<string, object>
        {
            ["playerId"]          = "playerB",
            ["name"]              = "Justin 祤杰",
            ["emoji"]             = "🚀",
            ["color"]             = "#2196F3",
            ["birthday"]          = "2019-08-24",
            ["role"]              = "弟弟",
            ["achievementPoints"] = 0,
            ["redeemablePoints"]  = 0,
            ["totalEarned"]       = 0,
            ["totalDeducted"]     = 0,
            ["totalRedeemed"]     = 0,
        }),
    ];

    // ── InitializeAsync ───────────────────────────────────────────────────────

    /// <summary>
    /// Idempotent family initialization — safe to call multiple times.
    /// - Always upserts family meta (preserves scores, updates admin list).
    /// - Creates each default player only if that player doc doesn't exist yet.
    /// - Creates default reward only if it doesn't exist yet.
    /// </summary>
    public async Task InitializeAsync(string familyId, string adminUid, CancellationToken ct = default)
    {
        var familyRef = _db.Collection("families").Document(familyId);
        var now = Timestamp.GetCurrentTimestamp();

        // 1. Upsert family meta (MergeAll preserves existing fields like createdAt)
        await familyRef.SetAsync(new Dictionary<string, object>
        {
            ["adminUid"]    = adminUid,
            ["familyId"]    = familyId,
            // Multiple parents: all emails listed here have admin management access
            ["adminEmails"] = new List<string> { "pin0513@gmail.com" },
            ["updatedAt"]   = now,
        }, SetOptions.MergeAll, ct);

        // 2. Check each player individually — create only if missing
        var batch = _db.StartBatch();
        var hasBatchWork = false;

        foreach (var (playerId, fields) in DefaultPlayers)
        {
            var playerRef = Scores(familyId).Document(playerId);
            var playerSnap = await playerRef.GetSnapshotAsync(ct);
            if (playerSnap.Exists)
            {
                _logger.LogInformation(
                    "Player {PlayerId} already exists in family {FamilyId} — skipping", playerId, familyId);
                continue;
            }

            var data = new Dictionary<string, object>(fields)
            {
                ["createdAt"] = now,
                ["updatedAt"] = now,
            };
            batch.Set(playerRef, data);
            hasBatchWork = true;
            _logger.LogInformation(
                "Creating player {PlayerId} ({Name}) in family {FamilyId}",
                playerId, fields["name"], familyId);
        }

        // 3. Create default reward only if missing
        var rewardRef = Rewards(familyId).Document("reward_1");
        var rewardSnap = await rewardRef.GetSnapshotAsync(ct);
        if (!rewardSnap.Exists)
        {
            batch.Set(rewardRef, new Dictionary<string, object>
            {
                ["id"]          = "reward_1",
                ["name"]        = "看一小時 YouTube",
                ["cost"]        = 50,
                ["description"] = "可以看一小時 YouTube",
                ["icon"]        = "📺",
                ["isActive"]    = true,
            });
            hasBatchWork = true;
        }

        if (hasBatchWork)
        {
            await batch.CommitAsync(ct);
            _logger.LogInformation(
                "Family {FamilyId} default data committed by {AdminUid}", familyId, adminUid);
        }
        else
        {
            _logger.LogInformation(
                "Family {FamilyId} already fully initialized — no changes needed", familyId);
        }
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
