using Google.Cloud.Firestore;
using Microsoft.AspNetCore.Identity;
using Microsoft.IdentityModel.Tokens;
using MidoLearning.Api.Models.FamilyScoreboard;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;

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

    // ── Phase 2: New collection helpers ──────────────────────────────────────

    private CollectionReference PlayerCredentials(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("player-credentials");

    private CollectionReference Tasks(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("tasks");

    private CollectionReference TaskCompletions(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("task-completions");

    private CollectionReference PlayerSubmissions(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("player-submissions");

    private CollectionReference DisplayCodes() =>
        _db.Collection("displayCodes");

    // ── Phase 3: New collection helpers ──────────────────────────────────────

    private CollectionReference AllowanceLedger(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("allowance-ledger");

    private CollectionReference ShopItems(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("shop-items");

    private CollectionReference ShopOrders(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("shop-orders");

    private CollectionReference Events(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("events");

    private CollectionReference TaskTemplates(string familyId) =>
        _db.Collection("families").Document(familyId).Collection("task-templates");

    // ── GenerateDisplayCodeAsync ──────────────────────────────────────────────

    public async Task<string> GenerateDisplayCodeAsync(string familyId, CancellationToken ct = default)
    {
        var random = new Random();
        var code = "MIDO" + random.Next(1000, 9999).ToString();
        var now = Timestamp.GetCurrentTimestamp();

        var familyRef = _db.Collection("families").Document(familyId);
        await familyRef.SetAsync(new Dictionary<string, object>
        {
            ["displayCode"] = code,
            ["displayCodeUpdatedAt"] = now,
            ["updatedAt"] = now,
        }, SetOptions.MergeAll, ct);

        await DisplayCodes().Document(code).SetAsync(new Dictionary<string, object>
        {
            ["familyId"] = familyId,
            ["createdAt"] = now,
        }, cancellationToken: ct);

        return code;
    }

    // ── LookupByCodeAsync ─────────────────────────────────────────────────────

    public async Task<FamilyLookupDto?> LookupByCodeAsync(string code, CancellationToken ct = default)
    {
        var codeSnap = await DisplayCodes().Document(code.ToUpper()).GetSnapshotAsync(ct);
        if (!codeSnap.Exists) return null;

        var familyId = codeSnap.GetValue<string>("familyId");

        var scoresSnap = await Scores(familyId).GetSnapshotAsync(ct);
        var credentialsSnap = await PlayerCredentials(familyId).GetSnapshotAsync(ct);
        var credentialIds = credentialsSnap.Documents.Select(d => d.Id).ToHashSet();

        var players = scoresSnap.Documents
            .Select(d => d.ConvertTo<PlayerScoreDoc>())
            .Select(p => new PlayerSummaryDto(
                p.PlayerId, p.Name, p.Color, p.Emoji,
                credentialIds.Contains(p.PlayerId)))
            .ToList()
            .AsReadOnly();

        return new FamilyLookupDto(familyId, code.ToUpper(), players);
    }

    // ── CreatePlayerAsync ─────────────────────────────────────────────────────

    public async Task<PlayerScoreDto> CreatePlayerAsync(string familyId, CreatePlayerRequest req, CancellationToken ct = default)
    {
        var now = Timestamp.GetCurrentTimestamp();
        var data = new Dictionary<string, object>
        {
            ["playerId"] = req.PlayerId,
            ["name"] = req.Name,
            ["color"] = req.Color,
            ["achievementPoints"] = 0,
            ["redeemablePoints"] = 0,
            ["totalEarned"] = 0,
            ["totalDeducted"] = 0,
            ["totalRedeemed"] = 0,
            ["createdAt"] = now,
            ["updatedAt"] = now,
        };
        if (req.Emoji != null) data["emoji"] = req.Emoji;
        if (req.Role != null) data["role"] = req.Role;
        if (req.Birthday != null) data["birthday"] = req.Birthday;

        await Scores(familyId).Document(req.PlayerId).SetAsync(data, cancellationToken: ct);
        var snap = await Scores(familyId).Document(req.PlayerId).GetSnapshotAsync(ct);
        return snap.ConvertTo<PlayerScoreDoc>().ToDto();
    }

    // ── UpdatePlayerAsync ─────────────────────────────────────────────────────

    public async Task<PlayerScoreDto> UpdatePlayerAsync(string familyId, string playerId, UpdatePlayerRequest req, CancellationToken ct = default)
    {
        var now = Timestamp.GetCurrentTimestamp();
        var updates = new Dictionary<string, object>
        {
            ["name"] = req.Name,
            ["color"] = req.Color,
            ["updatedAt"] = now,
        };
        if (req.Emoji != null) updates["emoji"] = req.Emoji;
        if (req.Role != null) updates["role"] = req.Role;
        if (req.Birthday != null) updates["birthday"] = req.Birthday;

        var scoreRef = Scores(familyId).Document(playerId);
        await scoreRef.UpdateAsync(updates);
        var snap = await scoreRef.GetSnapshotAsync(ct);
        return snap.ConvertTo<PlayerScoreDoc>().ToDto();
    }

    // ── SetPlayerPasswordAsync ────────────────────────────────────────────────

    public async Task SetPlayerPasswordAsync(string familyId, string playerId, string password, CancellationToken ct = default)
    {
        var hasher = new PasswordHasher<string>();
        var hash = hasher.HashPassword(playerId, password);
        var now = Timestamp.GetCurrentTimestamp();

        await PlayerCredentials(familyId).Document(playerId).SetAsync(new Dictionary<string, object>
        {
            ["playerId"] = playerId,
            ["passwordHash"] = hash,
            ["updatedAt"] = now,
        }, cancellationToken: ct);
    }

    // ── PlayerLoginAsync ──────────────────────────────────────────────────────

    public async Task<PlayerTokenDto> PlayerLoginAsync(PlayerLoginRequest req, IConfiguration configuration, CancellationToken ct = default)
    {
        var familyDto = await LookupByCodeAsync(req.FamilyCode, ct);
        if (familyDto == null)
            throw new InvalidOperationException("Family code not found");

        var familyId = familyDto.FamilyId;

        var playerSnap = await Scores(familyId).Document(req.PlayerId).GetSnapshotAsync(ct);
        if (!playerSnap.Exists)
            throw new InvalidOperationException("Player not found");

        var player = playerSnap.ConvertTo<PlayerScoreDoc>();

        var credSnap = await PlayerCredentials(familyId).Document(req.PlayerId).GetSnapshotAsync(ct);
        if (!credSnap.Exists)
            throw new UnauthorizedAccessException("Password not set. Please ask the admin to set a password.");

        var cred = credSnap.ConvertTo<PlayerCredentialDoc>();
        var hasher = new PasswordHasher<string>();
        var result = hasher.VerifyHashedPassword(req.PlayerId, cred.PasswordHash, req.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new UnauthorizedAccessException("Invalid password");

        var jwtKey = configuration["Jwt:Key"] ?? "your-super-secret-jwt-key-change-this-in-production-skill-village";
        var jwtIssuer = configuration["Jwt:Issuer"] ?? "MidoLearning";

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var claims = new[]
        {
            new Claim("type", "player"),
            new Claim("familyId", familyId),
            new Claim("playerId", req.PlayerId),
            new Claim("playerName", player.Name),
            new Claim(JwtRegisteredClaimNames.Sub, req.PlayerId),
        };

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: "MidoLearningPlayer",
            claims: claims,
            expires: DateTime.UtcNow.AddHours(24),
            signingCredentials: creds
        );

        var tokenString = new JwtSecurityTokenHandler().WriteToken(token);
        return new PlayerTokenDto(tokenString, req.PlayerId, player.Name, familyId);
    }

    // ── Task CRUD ─────────────────────────────────────────────────────────────

    private static int DefaultXpReward(string difficulty) => difficulty switch
    {
        "easy" => 5,
        "medium" => 15,
        "hard" => 30,
        _ => 5
    };

    public async Task<TaskDto> CreateTaskAsync(string familyId, CreateTaskRequest req, string adminUid, CancellationToken ct = default)
    {
        var taskId = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();
        var xpReward = req.XpReward ?? DefaultXpReward(req.Difficulty);

        var data = new Dictionary<string, object>
        {
            ["taskId"] = taskId,
            ["title"] = req.Title,
            ["type"] = req.Type,
            ["difficulty"] = req.Difficulty,
            ["xpReward"] = xpReward,
            ["allowanceReward"] = req.AllowanceReward ?? 0,
            ["periodType"] = req.PeriodType ?? "once",
            ["weekDays"] = req.WeekDays?.ToList() ?? new List<int>(),
            ["playerProposed"] = false,
            ["isActive"] = true,
            ["assignedPlayerIds"] = req.AssignedPlayerIds?.ToList() ?? new List<string>(),
            ["createdAt"] = now,
            ["createdBy"] = adminUid,
        };
        if (req.Description != null) data["description"] = req.Description;

        await Tasks(familyId).Document(taskId).SetAsync(data, cancellationToken: ct);
        var snap = await Tasks(familyId).Document(taskId).GetSnapshotAsync(ct);
        return snap.ConvertTo<TaskDoc>().ToDto();
    }

    public async Task<IReadOnlyList<TaskDto>> GetTasksAsync(string familyId, CancellationToken ct = default)
    {
        var snaps = await Tasks(familyId).WhereEqualTo("isActive", true).GetSnapshotAsync(ct);
        return snaps.Documents.Select(d => d.ConvertTo<TaskDoc>().ToDto()).ToList().AsReadOnly();
    }

    public async Task<TaskDto> UpdateTaskAsync(string familyId, string taskId, CreateTaskRequest req, CancellationToken ct = default)
    {
        var xpReward = req.XpReward ?? DefaultXpReward(req.Difficulty);
        var updates = new Dictionary<string, object>
        {
            ["title"] = req.Title,
            ["type"] = req.Type,
            ["difficulty"] = req.Difficulty,
            ["xpReward"] = xpReward,
            ["allowanceReward"] = req.AllowanceReward ?? 0,
            ["periodType"] = req.PeriodType ?? "once",
            ["weekDays"] = req.WeekDays?.ToList() ?? new List<int>(),
            ["assignedPlayerIds"] = req.AssignedPlayerIds?.ToList() ?? new List<string>(),
        };
        if (req.Description != null) updates["description"] = req.Description;

        var taskRef = Tasks(familyId).Document(taskId);
        await taskRef.UpdateAsync(updates);
        var snap = await taskRef.GetSnapshotAsync(ct);
        return snap.ConvertTo<TaskDoc>().ToDto();
    }

    public async Task DeactivateTaskAsync(string familyId, string taskId, CancellationToken ct = default)
    {
        await Tasks(familyId).Document(taskId).UpdateAsync(
            new Dictionary<string, object> { ["isActive"] = false });
    }

    // ── Task Completions ──────────────────────────────────────────────────────

    public async Task<TaskCompletionDto> SubmitTaskCompletionAsync(string familyId, SubmitTaskCompletionRequest req, string playerId, CancellationToken ct = default)
    {
        var taskSnap = await Tasks(familyId).Document(req.TaskId).GetSnapshotAsync(ct);
        if (!taskSnap.Exists)
            throw new InvalidOperationException($"Task {req.TaskId} not found");

        var task = taskSnap.ConvertTo<TaskDoc>();

        var completionId = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();

        var data = new Dictionary<string, object>
        {
            ["completionId"] = completionId,
            ["taskId"] = req.TaskId,
            ["taskTitle"] = task.Title,
            ["xpReward"] = task.XpReward,
            ["playerId"] = playerId,
            ["status"] = "pending",
            ["submittedAt"] = now,
        };
        if (req.Note != null) data["note"] = req.Note;

        await TaskCompletions(familyId).Document(completionId).SetAsync(data, cancellationToken: ct);
        var snap = await TaskCompletions(familyId).Document(completionId).GetSnapshotAsync(ct);
        return snap.ConvertTo<TaskCompletionDoc>().ToDto();
    }

    public async Task<IReadOnlyList<TaskCompletionDto>> GetTaskCompletionsAsync(string familyId, string? status, CancellationToken ct = default)
    {
        Query query = TaskCompletions(familyId).OrderByDescending("submittedAt").Limit(100);
        if (!string.IsNullOrEmpty(status))
            query = TaskCompletions(familyId).WhereEqualTo("status", status).OrderByDescending("submittedAt").Limit(100);

        var snaps = await query.GetSnapshotAsync(ct);
        return snaps.Documents.Select(d => d.ConvertTo<TaskCompletionDoc>().ToDto()).ToList().AsReadOnly();
    }

    public async Task<TaskCompletionDto> ProcessTaskCompletionAsync(string familyId, string completionId, ProcessTaskCompletionRequest req, string adminUid, CancellationToken ct = default)
    {
        var completionRef = TaskCompletions(familyId).Document(completionId);
        TaskCompletionDoc? result = null;

        await _db.RunTransactionAsync(async tx =>
        {
            var snap = await tx.GetSnapshotAsync(completionRef);
            if (!snap.Exists)
                throw new InvalidOperationException($"Completion {completionId} not found");

            var doc = snap.ConvertTo<TaskCompletionDoc>();
            if (doc.Status != "pending")
                throw new InvalidOperationException($"Completion is already {doc.Status}");

            var now = Timestamp.GetCurrentTimestamp();
            var newStatus = req.Action == "approve" ? "approved" : "rejected";

            var updates = new Dictionary<string, object>
            {
                ["status"] = newStatus,
                ["processedAt"] = now,
                ["processedBy"] = adminUid,
            };

            if (req.Action == "approve")
            {
                var txId = Guid.NewGuid().ToString("N");
                var txRef = Transactions(familyId).Document(txId);
                var scoreRef = Scores(familyId).Document(doc.PlayerId);

                tx.Set(txRef, new Dictionary<string, object>
                {
                    ["id"] = txId,
                    ["playerIds"] = new List<string> { doc.PlayerId },
                    ["type"] = "earn",
                    ["amount"] = doc.XpReward,
                    ["reason"] = $"任務完成：{doc.TaskTitle}",
                    ["createdBy"] = adminUid,
                    ["createdAt"] = now,
                });

                tx.Update(scoreRef, new Dictionary<string, object>
                {
                    ["achievementPoints"] = FieldValue.Increment(doc.XpReward),
                    ["redeemablePoints"] = FieldValue.Increment(doc.XpReward),
                    ["totalEarned"] = FieldValue.Increment(doc.XpReward),
                    ["updatedAt"] = now,
                });

                updates["transactionId"] = txId;

                // Also add allowance reward if configured
                var taskSnap2 = await tx.GetSnapshotAsync(Tasks(familyId).Document(doc.TaskId));
                if (taskSnap2.Exists)
                {
                    var taskDoc = taskSnap2.ConvertTo<TaskDoc>();
                    if (taskDoc.AllowanceReward > 0)
                    {
                        var allowanceId = Guid.NewGuid().ToString("N");
                        var allowanceRef = AllowanceLedger(familyId).Document(allowanceId);
                        tx.Set(allowanceRef, new Dictionary<string, object>
                        {
                            ["recordId"] = allowanceId,
                            ["playerId"] = doc.PlayerId,
                            ["amount"] = taskDoc.AllowanceReward,
                            ["reason"] = $"任務完成：{doc.TaskTitle}",
                            ["type"] = "earn",
                            ["createdBy"] = adminUid,
                            ["createdAt"] = now,
                        });
                    }
                }
            }

            tx.Update(completionRef, updates);

            result = new TaskCompletionDoc
            {
                CompletionId = doc.CompletionId,
                TaskId = doc.TaskId,
                TaskTitle = doc.TaskTitle,
                XpReward = doc.XpReward,
                PlayerId = doc.PlayerId,
                Note = doc.Note,
                Status = newStatus,
                SubmittedAt = doc.SubmittedAt,
                ProcessedAt = now,
                ProcessedBy = adminUid,
            };
        }, cancellationToken: ct);

        return result!.ToDto();
    }

    // ── Player Self-Submissions ───────────────────────────────────────────────

    public async Task<PlayerSubmissionDto> SubmitPlayerSubmissionAsync(string familyId, CreatePlayerSubmissionRequest req, string playerId, CancellationToken ct = default)
    {
        var submissionId = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();

        var data = new Dictionary<string, object>
        {
            ["submissionId"] = submissionId,
            ["playerId"] = playerId,
            ["type"] = "earn",
            ["amount"] = req.Amount,
            ["reason"] = req.Reason,
            ["categoryType"] = req.CategoryType,
            ["status"] = "pending",
            ["submittedAt"] = now,
        };
        if (req.Note != null) data["note"] = req.Note;

        await PlayerSubmissions(familyId).Document(submissionId).SetAsync(data, cancellationToken: ct);
        var snap = await PlayerSubmissions(familyId).Document(submissionId).GetSnapshotAsync(ct);
        return snap.ConvertTo<PlayerSubmissionDoc>().ToDto();
    }

    public async Task<IReadOnlyList<PlayerSubmissionDto>> GetPlayerSubmissionsAsync(string familyId, string? status, CancellationToken ct = default)
    {
        Query query = PlayerSubmissions(familyId).OrderByDescending("submittedAt").Limit(100);
        if (!string.IsNullOrEmpty(status))
            query = PlayerSubmissions(familyId).WhereEqualTo("status", status).OrderByDescending("submittedAt").Limit(100);

        var snaps = await query.GetSnapshotAsync(ct);
        return snaps.Documents.Select(d => d.ConvertTo<PlayerSubmissionDoc>().ToDto()).ToList().AsReadOnly();
    }

    public async Task<PlayerSubmissionDto> ProcessPlayerSubmissionAsync(string familyId, string submissionId, ProcessTaskCompletionRequest req, string adminUid, CancellationToken ct = default)
    {
        var submissionRef = PlayerSubmissions(familyId).Document(submissionId);
        PlayerSubmissionDoc? result = null;

        await _db.RunTransactionAsync(async tx =>
        {
            var snap = await tx.GetSnapshotAsync(submissionRef);
            if (!snap.Exists)
                throw new InvalidOperationException($"Submission {submissionId} not found");

            var doc = snap.ConvertTo<PlayerSubmissionDoc>();
            if (doc.Status != "pending")
                throw new InvalidOperationException($"Submission is already {doc.Status}");

            var now = Timestamp.GetCurrentTimestamp();
            var newStatus = req.Action == "approve" ? "approved" : "rejected";

            var updates = new Dictionary<string, object>
            {
                ["status"] = newStatus,
                ["processedAt"] = now,
                ["processedBy"] = adminUid,
            };

            if (req.Action == "approve")
            {
                var txId = Guid.NewGuid().ToString("N");
                var txRef = Transactions(familyId).Document(txId);
                var scoreRef = Scores(familyId).Document(doc.PlayerId);

                tx.Set(txRef, new Dictionary<string, object>
                {
                    ["id"] = txId,
                    ["playerIds"] = new List<string> { doc.PlayerId },
                    ["type"] = "earn",
                    ["amount"] = doc.Amount,
                    ["reason"] = doc.Reason,
                    ["createdBy"] = adminUid,
                    ["createdAt"] = now,
                });

                tx.Update(scoreRef, new Dictionary<string, object>
                {
                    ["achievementPoints"] = FieldValue.Increment(doc.Amount),
                    ["redeemablePoints"] = FieldValue.Increment(doc.Amount),
                    ["totalEarned"] = FieldValue.Increment(doc.Amount),
                    ["updatedAt"] = now,
                });

                updates["transactionId"] = txId;
            }

            tx.Update(submissionRef, updates);

            result = new PlayerSubmissionDoc
            {
                SubmissionId = doc.SubmissionId,
                PlayerId = doc.PlayerId,
                Type = doc.Type,
                Amount = doc.Amount,
                Reason = doc.Reason,
                CategoryType = doc.CategoryType,
                Note = doc.Note,
                Status = newStatus,
                SubmittedAt = doc.SubmittedAt,
                ProcessedAt = now,
                ProcessedBy = adminUid,
            };
        }, cancellationToken: ct);

        return result!.ToDto();
    }

    // ── Phase 3: Allowance（零用金） ──────────────────────────────────────────

    public async Task<AllowanceBalanceDto> GetAllowanceBalanceAsync(string familyId, string playerId, CancellationToken ct = default)
    {
        var snaps = await AllowanceLedger(familyId)
            .WhereEqualTo("playerId", playerId)
            .GetSnapshotAsync(ct);

        var records = snaps.Documents.Select(d => d.ConvertTo<AllowanceLedgerDoc>()).ToList();
        var balance = records.Sum(r => r.Amount);
        var totalEarned = records.Where(r => r.Amount > 0).Sum(r => r.Amount);
        var totalSpent = records.Where(r => r.Amount < 0).Sum(r => Math.Abs(r.Amount));

        return new AllowanceBalanceDto(playerId, balance, totalEarned, totalSpent);
    }

    public async Task<IReadOnlyList<AllowanceLedgerDto>> GetAllowanceLedgerAsync(string familyId, string? playerId, CancellationToken ct = default)
    {
        Query query;
        if (!string.IsNullOrEmpty(playerId))
            query = AllowanceLedger(familyId)
                .WhereEqualTo("playerId", playerId)
                .OrderByDescending("createdAt").Limit(100);
        else
            query = AllowanceLedger(familyId).OrderByDescending("createdAt").Limit(100);

        var snaps = await query.GetSnapshotAsync(ct);
        return snaps.Documents.Select(d => d.ConvertTo<AllowanceLedgerDoc>().ToDto()).ToList().AsReadOnly();
    }

    public async Task<AllowanceLedgerDto> AdjustAllowanceAsync(string familyId, AdjustAllowanceRequest req, string adminUid, CancellationToken ct = default)
    {
        var recordId = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();
        var type = req.Amount > 0 ? "earn" : "adjust";

        var data = new Dictionary<string, object>
        {
            ["recordId"] = recordId,
            ["playerId"] = req.PlayerId,
            ["amount"] = req.Amount,
            ["reason"] = req.Reason,
            ["type"] = type,
            ["createdBy"] = adminUid,
            ["createdAt"] = now,
        };
        if (req.Note != null) data["note"] = req.Note;

        await AllowanceLedger(familyId).Document(recordId).SetAsync(data, cancellationToken: ct);
        var snap = await AllowanceLedger(familyId).Document(recordId).GetSnapshotAsync(ct);
        return snap.ConvertTo<AllowanceLedgerDoc>().ToDto();
    }

    // ── Phase 3: Shop Items（商城商品） ───────────────────────────────────────

    public async Task<IReadOnlyList<ShopItemDto>> GetShopItemsAsync(string familyId, CancellationToken ct = default)
    {
        var snaps = await ShopItems(familyId).WhereEqualTo("isActive", true).GetSnapshotAsync(ct);
        return snaps.Documents.Select(d => d.ConvertTo<ShopItemDoc>().ToDto()).ToList().AsReadOnly();
    }

    public async Task<ShopItemDto> CreateShopItemAsync(string familyId, CreateShopItemRequest req, CancellationToken ct = default)
    {
        var itemId = Guid.NewGuid().ToString("N");
        var data = new Dictionary<string, object>
        {
            ["itemId"] = itemId,
            ["name"] = req.Name,
            ["description"] = req.Description,
            ["price"] = req.Price,
            ["type"] = req.Type,
            ["emoji"] = req.Emoji,
            ["isActive"] = true,
            ["priceType"] = req.PriceType ?? "allowance",
            ["allowanceGiven"] = req.AllowanceGiven ?? 0,
        };
        if (req.Stock.HasValue) data["stock"] = req.Stock.Value;
        if (req.DailyLimit.HasValue) data["dailyLimit"] = req.DailyLimit.Value;

        await ShopItems(familyId).Document(itemId).SetAsync(data, cancellationToken: ct);
        var snap = await ShopItems(familyId).Document(itemId).GetSnapshotAsync(ct);
        return snap.ConvertTo<ShopItemDoc>().ToDto();
    }

    public async Task<ShopItemDto> UpdateShopItemAsync(string familyId, string itemId, CreateShopItemRequest req, CancellationToken ct = default)
    {
        var updates = new Dictionary<string, object>
        {
            ["name"] = req.Name,
            ["description"] = req.Description,
            ["price"] = req.Price,
            ["type"] = req.Type,
            ["emoji"] = req.Emoji,
            ["priceType"] = req.PriceType ?? "allowance",
            ["allowanceGiven"] = req.AllowanceGiven ?? 0,
        };
        if (req.Stock.HasValue) updates["stock"] = req.Stock.Value;
        if (req.DailyLimit.HasValue) updates["dailyLimit"] = req.DailyLimit.Value;

        var itemRef = ShopItems(familyId).Document(itemId);
        await itemRef.UpdateAsync(updates);
        var snap = await itemRef.GetSnapshotAsync(ct);
        return snap.ConvertTo<ShopItemDoc>().ToDto();
    }

    public async Task DeactivateShopItemAsync(string familyId, string itemId, CancellationToken ct = default)
    {
        await ShopItems(familyId).Document(itemId).UpdateAsync(
            new Dictionary<string, object> { ["isActive"] = false });
    }

    // ── Phase 3: Shop Orders（商城訂單） ──────────────────────────────────────

    public async Task<ShopOrderDto> CreateShopOrderAsync(string familyId, CreateShopOrderRequest req, string playerId, CancellationToken ct = default)
    {
        var itemSnap = await ShopItems(familyId).Document(req.ItemId).GetSnapshotAsync(ct);
        if (!itemSnap.Exists) throw new InvalidOperationException($"Item {req.ItemId} not found");
        var item = itemSnap.ConvertTo<ShopItemDoc>();

        var orderId = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();

        var data = new Dictionary<string, object>
        {
            ["orderId"] = orderId,
            ["playerId"] = playerId,
            ["itemId"] = req.ItemId,
            ["itemName"] = item.Name,
            ["price"] = item.Price,
            ["status"] = "pending",
            ["requestedAt"] = now,
        };
        if (req.Note != null) data["note"] = req.Note;

        await ShopOrders(familyId).Document(orderId).SetAsync(data, cancellationToken: ct);
        var snap = await ShopOrders(familyId).Document(orderId).GetSnapshotAsync(ct);
        return snap.ConvertTo<ShopOrderDoc>().ToDto();
    }

    public async Task<IReadOnlyList<ShopOrderDto>> GetShopOrdersAsync(string familyId, string? status, CancellationToken ct = default)
    {
        Query query;
        if (!string.IsNullOrEmpty(status))
            query = ShopOrders(familyId).WhereEqualTo("status", status).OrderByDescending("requestedAt").Limit(50);
        else
            query = ShopOrders(familyId).OrderByDescending("requestedAt").Limit(50);

        var snaps = await query.GetSnapshotAsync(ct);
        return snaps.Documents.Select(d => d.ConvertTo<ShopOrderDoc>().ToDto()).ToList().AsReadOnly();
    }

    public async Task<ShopOrderDto> ProcessShopOrderAsync(string familyId, string orderId, ProcessShopOrderRequest req, string adminUid, CancellationToken ct = default)
    {
        // 先讀取 order 與 item（在 Firestore transaction 外，方便做集合查詢）
        var orderSnap = await ShopOrders(familyId).Document(orderId).GetSnapshotAsync(ct);
        if (!orderSnap.Exists) throw new InvalidOperationException($"Order {orderId} not found");
        var order = orderSnap.ConvertTo<ShopOrderDoc>();
        if (order.Status != "pending") throw new InvalidOperationException($"Order is already {order.Status}");

        var itemSnap = await ShopItems(familyId).Document(order.ItemId).GetSnapshotAsync(ct);
        if (!itemSnap.Exists) throw new InvalidOperationException($"Item {order.ItemId} not found");
        var item = itemSnap.ConvertTo<ShopItemDoc>();

        var now = Timestamp.GetCurrentTimestamp();
        var action = req.Action;
        var note = req.Note;

        // 每日上限檢查（僅在 approve 時）
        if (action == "approve" && item.DailyLimit.HasValue)
        {
            var today = DateTimeOffset.UtcNow.Date;
            var todayOrdersSnap = await ShopOrders(familyId)
                .WhereEqualTo("playerId", order.PlayerId)
                .WhereEqualTo("itemId", order.ItemId)
                .WhereEqualTo("status", "approved")
                .GetSnapshotAsync(ct);

            var todayCount = todayOrdersSnap.Documents
                .Select(d => d.ConvertTo<ShopOrderDoc>())
                .Count(o => o.ProcessedAt?.ToDateTimeOffset().Date == today);

            if (todayCount >= item.DailyLimit.Value)
            {
                action = "reject";
                note = "已達每日兌換上限";
            }
        }

        var newStatus = action == "approve" ? "approved" : "rejected";

        var updates = new Dictionary<string, object>
        {
            ["status"] = newStatus,
            ["processedAt"] = now,
            ["processedBy"] = adminUid,
        };
        if (note != null) updates["note"] = note;

        await ShopOrders(familyId).Document(orderId).UpdateAsync(updates, cancellationToken: ct);

        if (action == "approve")
        {
            if (item.PriceType == "xp")
            {
                // 扣除 XP（建立 deduct transaction）
                var xpTransId = Guid.NewGuid().ToString("N")[..12];
                var xpTrans = new Dictionary<string, object>
                {
                    ["id"] = xpTransId,
                    ["playerIds"] = new List<string> { order.PlayerId },
                    ["type"] = "deduct",
                    ["amount"] = item.Price,
                    ["reason"] = $"XP 兌換：{item.Name}",
                    ["createdBy"] = adminUid,
                    ["createdAt"] = now,
                };
                await Transactions(familyId).Document(xpTransId).SetAsync(xpTrans, null, ct);

                // 更新 PlayerScoreDoc（原子更新 redeemablePoints）
                var scoreRef = Scores(familyId).Document(order.PlayerId);
                await _db.RunTransactionAsync(async tx =>
                {
                    var scoreSnap = await tx.GetSnapshotAsync(scoreRef);
                    if (!scoreSnap.Exists) return;
                    var score = scoreSnap.ConvertTo<PlayerScoreDoc>();
                    tx.Update(scoreRef, new Dictionary<string, object>
                    {
                        ["redeemablePoints"] = Math.Max(0, score.RedeemablePoints - item.Price),
                        ["totalDeducted"] = score.TotalDeducted + item.Price,
                        ["updatedAt"] = now,
                    });
                }, cancellationToken: ct);

                // 給予零用金（若有設定）
                if (item.AllowanceGiven > 0)
                {
                    var allowanceId = Guid.NewGuid().ToString("N")[..12];
                    var allowanceData = new Dictionary<string, object>
                    {
                        ["recordId"] = allowanceId,
                        ["playerId"] = order.PlayerId,
                        ["amount"] = item.AllowanceGiven,
                        ["reason"] = $"XP 兌換：{item.Name}",
                        ["type"] = "earn",
                        ["createdBy"] = adminUid,
                        ["createdAt"] = now,
                    };
                    await AllowanceLedger(familyId).Document(allowanceId).SetAsync(allowanceData, null, ct);
                }
            }
            else // priceType = "allowance"（原本邏輯）
            {
                var ledgerRecordId = Guid.NewGuid().ToString("N");
                var ledgerData = new Dictionary<string, object>
                {
                    ["recordId"] = ledgerRecordId,
                    ["playerId"] = order.PlayerId,
                    ["amount"] = -order.Price,
                    ["reason"] = $"商城兌換：{order.ItemName}",
                    ["type"] = "spend",
                    ["createdBy"] = adminUid,
                    ["createdAt"] = now,
                };
                await AllowanceLedger(familyId).Document(ledgerRecordId).SetAsync(ledgerData, null, ct);
            }
        }

        return new ShopOrderDoc
        {
            OrderId = order.OrderId, PlayerId = order.PlayerId, ItemId = order.ItemId,
            ItemName = order.ItemName, Price = order.Price, Status = newStatus,
            RequestedAt = order.RequestedAt, ProcessedAt = now, ProcessedBy = adminUid,
            Note = note ?? order.Note,
        }.ToDto();
    }

    // ── Phase 3: Events（家庭活動） ───────────────────────────────────────────

    public async Task<IReadOnlyList<EventDto>> GetEventsAsync(string familyId, string? month, CancellationToken ct = default)
    {
        var snaps = await Events(familyId).OrderBy("startDate").Limit(100).GetSnapshotAsync(ct);
        var all = snaps.Documents.Select(d => d.ConvertTo<EventDoc>().ToDto()).ToList();
        if (!string.IsNullOrEmpty(month))
            all = all.Where(e => e.StartDate.StartsWith(month)).ToList();
        return all.AsReadOnly();
    }

    public async Task<EventDto> CreateEventAsync(string familyId, CreateEventRequest req, string adminUid, CancellationToken ct = default)
    {
        var eventId = Guid.NewGuid().ToString("N");
        var now = Timestamp.GetCurrentTimestamp();

        var data = new Dictionary<string, object>
        {
            ["eventId"] = eventId,
            ["title"] = req.Title,
            ["type"] = req.Type,
            ["startDate"] = req.StartDate,
            ["emoji"] = req.Emoji ?? "📅",
            ["color"] = req.Color ?? "#4CAF50",
            ["createdBy"] = adminUid,
            ["createdAt"] = now,
        };
        if (req.EndDate != null) data["endDate"] = req.EndDate;
        if (req.Description != null) data["description"] = req.Description;

        await Events(familyId).Document(eventId).SetAsync(data, cancellationToken: ct);
        var snap = await Events(familyId).Document(eventId).GetSnapshotAsync(ct);
        return snap.ConvertTo<EventDoc>().ToDto();
    }

    public async Task<EventDto> UpdateEventAsync(string familyId, string eventId, CreateEventRequest req, CancellationToken ct = default)
    {
        var updates = new Dictionary<string, object>
        {
            ["title"] = req.Title,
            ["type"] = req.Type,
            ["startDate"] = req.StartDate,
            ["emoji"] = req.Emoji ?? "📅",
            ["color"] = req.Color ?? "#4CAF50",
        };
        if (req.EndDate != null) updates["endDate"] = req.EndDate;
        if (req.Description != null) updates["description"] = req.Description;

        var eventRef = Events(familyId).Document(eventId);
        await eventRef.UpdateAsync(updates);
        var snap = await eventRef.GetSnapshotAsync(ct);
        return snap.ConvertTo<EventDoc>().ToDto();
    }

    public async Task DeleteEventAsync(string familyId, string eventId, CancellationToken ct = default)
    {
        await Events(familyId).Document(eventId).DeleteAsync();
    }

    // ── Phase 3: Task Templates（任務範本） ───────────────────────────────────

    public async Task<IReadOnlyList<TaskTemplateDto>> GetTaskTemplatesAsync(string familyId, CancellationToken ct = default)
    {
        var snaps = await TaskTemplates(familyId).GetSnapshotAsync(ct);
        return snaps.Documents.Select(d => d.ConvertTo<TaskTemplateDoc>().ToDto()).ToList().AsReadOnly();
    }

    public async Task<TaskTemplateDto> CreateTaskTemplateAsync(string familyId, CreateTaskTemplateRequest req, CancellationToken ct = default)
    {
        var templateId = Guid.NewGuid().ToString("N");
        var data = new Dictionary<string, object>
        {
            ["templateId"] = templateId,
            ["name"] = req.Name,
            ["taskIds"] = req.TaskIds?.ToList() ?? new List<string>(),
        };
        if (req.Description != null) data["description"] = req.Description;

        await TaskTemplates(familyId).Document(templateId).SetAsync(data, cancellationToken: ct);
        var snap = await TaskTemplates(familyId).Document(templateId).GetSnapshotAsync(ct);
        return snap.ConvertTo<TaskTemplateDoc>().ToDto();
    }

    public async Task DeleteTaskTemplateAsync(string familyId, string templateId, CancellationToken ct = default)
    {
        await TaskTemplates(familyId).Document(templateId).DeleteAsync();
    }

    // ── Phase 4: Backup ───────────────────────────────────────────────────────

    public async Task<FamilyBackupDto> ExportBackupAsync(string familyId, CancellationToken ct = default)
    {
        var playersTask = GetScoresAsync(familyId, ct);
        var transactionsTask = GetTransactionsAsync(familyId, null, ct);
        var tasksTask = GetTasksAsync(familyId, ct);
        var shopItemsTask = GetShopItemsAsync(familyId, ct);
        var eventsTask = GetEventsAsync(familyId, null, ct);
        var templatesTask = GetTaskTemplatesAsync(familyId, ct);
        var allowanceTask = GetAllowanceLedgerAsync(familyId, null, ct);

        await Task.WhenAll(playersTask, transactionsTask, tasksTask, shopItemsTask, eventsTask, templatesTask, allowanceTask);

        return new FamilyBackupDto(
            FamilyId: familyId,
            Version: "1.0",
            ExportedAt: DateTimeOffset.UtcNow,
            Players: playersTask.Result,
            Transactions: transactionsTask.Result,
            Tasks: tasksTask.Result,
            ShopItems: shopItemsTask.Result,
            Events: eventsTask.Result,
            TaskTemplates: templatesTask.Result,
            AllowanceLedger: allowanceTask.Result
        );
    }

    public async Task ImportBackupAsync(string familyId, FamilyBackupDto backup, CancellationToken ct = default)
    {
        WriteBatch batch = _db.StartBatch();
        int opCount = 0;

        async Task CommitIfNeededAsync()
        {
            if (opCount >= 400)
            {
                await batch.CommitAsync(ct);
                batch = _db.StartBatch();
                opCount = 0;
            }
        }

        // 匯入 Tasks
        foreach (var task in backup.Tasks)
        {
            var data = new Dictionary<string, object>
            {
                ["taskId"] = task.TaskId,
                ["title"] = task.Title,
                ["type"] = task.Type,
                ["difficulty"] = task.Difficulty,
                ["xpReward"] = task.XpReward,
                ["allowanceReward"] = task.AllowanceReward,
                ["isActive"] = task.IsActive,
                ["periodType"] = task.PeriodType,
                ["weekDays"] = task.WeekDays.ToList(),
                ["assignedPlayerIds"] = task.AssignedPlayerIds.ToList(),
                ["playerProposed"] = task.PlayerProposed,
            };
            if (task.Description != null) data["description"] = task.Description;
            batch.Set(Tasks(familyId).Document(task.TaskId), data);
            opCount++;
            await CommitIfNeededAsync();
        }

        // 匯入 ShopItems
        foreach (var item in backup.ShopItems)
        {
            var data = new Dictionary<string, object>
            {
                ["itemId"] = item.ItemId,
                ["name"] = item.Name,
                ["description"] = item.Description,
                ["price"] = item.Price,
                ["type"] = item.Type,
                ["emoji"] = item.Emoji,
                ["isActive"] = item.IsActive,
                ["priceType"] = item.PriceType,
                ["allowanceGiven"] = item.AllowanceGiven,
            };
            if (item.Stock.HasValue) data["stock"] = item.Stock.Value;
            if (item.DailyLimit.HasValue) data["dailyLimit"] = item.DailyLimit.Value;
            batch.Set(ShopItems(familyId).Document(item.ItemId), data);
            opCount++;
            await CommitIfNeededAsync();
        }

        // 匯入 Events
        foreach (var ev in backup.Events)
        {
            var data = new Dictionary<string, object>
            {
                ["eventId"] = ev.EventId,
                ["title"] = ev.Title,
                ["type"] = ev.Type,
                ["startDate"] = ev.StartDate,
                ["emoji"] = ev.Emoji,
                ["color"] = ev.Color,
                ["createdBy"] = ev.CreatedBy,
                ["createdAt"] = Timestamp.FromDateTimeOffset(ev.CreatedAt),
            };
            if (ev.EndDate != null) data["endDate"] = ev.EndDate;
            if (ev.Description != null) data["description"] = ev.Description;
            batch.Set(Events(familyId).Document(ev.EventId), data);
            opCount++;
            await CommitIfNeededAsync();
        }

        // 匯入 Task Templates
        foreach (var tmpl in backup.TaskTemplates)
        {
            var data = new Dictionary<string, object>
            {
                ["templateId"] = tmpl.TemplateId,
                ["name"] = tmpl.Name,
                ["taskIds"] = tmpl.TaskIds.ToList(),
            };
            if (tmpl.Description != null) data["description"] = tmpl.Description;
            batch.Set(TaskTemplates(familyId).Document(tmpl.TemplateId), data);
            opCount++;
            await CommitIfNeededAsync();
        }

        if (opCount > 0)
            await batch.CommitAsync(ct);
    }
}
