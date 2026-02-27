using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using MidoLearning.Api.Models.FamilyScoreboard;
using MidoLearning.Api.Services.FamilyScoreboard;

namespace MidoLearning.Api.Endpoints;

/// <summary>
/// Local-only dev helpers — 僅在 Development 環境載入
/// </summary>
public static class DevEndpoints
{
    public static void MapDevEndpoints(this WebApplication app)
    {
        if (!app.Environment.IsDevelopment()) return;

        var dev = app.MapGroup("/api/dev").AllowAnonymous();

        // ── 1. 產生 Player JWT（免密碼，Dev only）────────────────────────────
        // POST /api/dev/player-token
        // Body: { "familyId": "...", "playerId": "...", "playerName": "..." }
        dev.MapPost("/player-token", (
            PlayerTokenRequest req,
            IConfiguration config) =>
        {
            var jwtKey = config["Jwt:Key"] ?? "your-super-secret-jwt-key-change-this-in-production-skill-village";
            var jwtIssuer = config["Jwt:Issuer"] ?? "MidoLearning";
            var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
            var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

            var claims = new[]
            {
                new Claim("type",       "player"),
                new Claim("familyId",   req.FamilyId),
                new Claim("playerId",   req.PlayerId),
                new Claim("playerName", req.PlayerName),
                new Claim(JwtRegisteredClaimNames.Sub, req.PlayerId),
            };

            var token = new JwtSecurityToken(
                issuer:            jwtIssuer,
                audience:          "MidoLearningPlayer",
                claims:            claims,
                expires:           DateTime.UtcNow.AddDays(7),
                signingCredentials: creds
            );

            return Results.Ok(new
            {
                token = new JwtSecurityTokenHandler().WriteToken(token),
                familyId   = req.FamilyId,
                playerId   = req.PlayerId,
                playerName = req.PlayerName,
                hint       = "Use: Authorization: Bearer <token>"
            });
        });

        // ── 2. Seed 任務 + 商城（Dev only）────────────────────────────────────
        // POST /api/dev/seed
        // Header: X-API-Key: mido-test-api-key-2026
        // Body: { "familyId": "family_test-admin-uid" }
        dev.MapPost("/seed", async (
            SeedRequest req,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var familyId = req.FamilyId;
            var adminId  = "dev-seed";
            var results  = new List<string>();

            // ── Tasks ────────────────────────────────────────────────────────
            // 經驗值換算基準: 10 exp = 1元，300 exp = 30元
            // 規則: 商城"看20分鐘"需 300 exp → 日常短任務必須 < 300 exp
            //       任務達 300 exp 以上，表示需要至少 1 小時投入

            var tasks = new[]
            {
                // ── 日常短任務（< 300 exp，適合 20-45 分鐘）────────────────
                new CreateTaskRequest(
                    Title:             "整理房間",
                    Type:              "daily",
                    Difficulty:        "easy",
                    XpReward:          100,
                    AllowanceReward:   null,
                    Description:       "整理個人房間並保持整潔（約 20 分鐘）",
                    PeriodType:        "daily",
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                new CreateTaskRequest(
                    Title:             "閱讀 30 分鐘",
                    Type:              "daily",
                    Difficulty:        "easy",
                    XpReward:          150,
                    AllowanceReward:   null,
                    Description:       "閱讀課外書或學習材料 30 分鐘",
                    PeriodType:        "daily",
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                new CreateTaskRequest(
                    Title:             "運動 30 分鐘",
                    Type:              "daily",
                    Difficulty:        "easy",
                    XpReward:          150,
                    AllowanceReward:   null,
                    Description:       "戶外運動或室內訓練 30 分鐘",
                    PeriodType:        "daily",
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                new CreateTaskRequest(
                    Title:             "完成作業",
                    Type:              "daily",
                    Difficulty:        "normal",
                    XpReward:          200,
                    AllowanceReward:   null,
                    Description:       "完成當日所有學校作業（約 45 分鐘）",
                    PeriodType:        "daily",
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                // ── 中等任務（300+ exp，需 1 小時以上）──────────────────────
                new CreateTaskRequest(
                    Title:             "深度閱讀 1 小時",
                    Type:              "weekly",
                    Difficulty:        "normal",
                    XpReward:          300,
                    AllowanceReward:   null,
                    Description:       "專注閱讀 1 小時，並寫下閱讀心得",
                    PeriodType:        "weekly",
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                new CreateTaskRequest(
                    Title:             "學習新技能 1 小時",
                    Type:              "weekly",
                    Difficulty:        "hard",
                    XpReward:          400,
                    AllowanceReward:   null,
                    Description:       "自主學習新技能（程式、樂器、語言等）至少 1 小時",
                    PeriodType:        "weekly",
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                // ── 成就任務（一次性高分獎勵）───────────────────────────────
                // 小考 100 分 ≈ 100元 = 1000 exp
                new CreateTaskRequest(
                    Title:             "小考 100 分",
                    Type:              "achievement",
                    Difficulty:        "hard",
                    XpReward:          1000,
                    AllowanceReward:   null,
                    Description:       "任一小考、隨堂測驗取得滿分",
                    PeriodType:        null,
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                // 期中考 100 分 ≈ 500元/科 = 5000 exp
                new CreateTaskRequest(
                    Title:             "期中考 100 分（一科）",
                    Type:              "achievement",
                    Difficulty:        "hard",
                    XpReward:          5000,
                    AllowanceReward:   null,
                    Description:       "期中考單科取得滿分",
                    PeriodType:        null,
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                // 期末考 100 分 ≈ 500元/科 = 5000 exp
                new CreateTaskRequest(
                    Title:             "期末考 100 分（一科）",
                    Type:              "achievement",
                    Difficulty:        "hard",
                    XpReward:          5000,
                    AllowanceReward:   null,
                    Description:       "期末考單科取得滿分",
                    PeriodType:        null,
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                // 比賽得名（普通）≈ 500元 = 5000 exp
                new CreateTaskRequest(
                    Title:             "比賽得名（普通獎）",
                    Type:              "achievement",
                    Difficulty:        "hard",
                    XpReward:          5000,
                    AllowanceReward:   null,
                    Description:       "在學校或校外比賽中獲得名次（相當於 500 元獎勵）",
                    PeriodType:        null,
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                // 比賽得名（優秀）≈ 1000元 = 10000 exp
                new CreateTaskRequest(
                    Title:             "比賽得名（優秀獎）",
                    Type:              "achievement",
                    Difficulty:        "hard",
                    XpReward:          10000,
                    AllowanceReward:   null,
                    Description:       "在重要比賽中獲得優秀名次（相當於 1000 元獎勵）",
                    PeriodType:        null,
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                // 月考某科100分 → 1000 exp
                new CreateTaskRequest(
                    Title:             "月考 100 分（一科）",
                    Type:              "achievement",
                    Difficulty:        "hard",
                    XpReward:          1000,
                    AllowanceReward:   null,
                    Description:       "🎯 高分獎勵規則：月考任一科目取得滿分（100分），即可獲得 1,000 XP 獎勵。家長確認成績單後，由家長提交完成並發放 XP。每科月考各自計算，同月可多科獲獎。",
                    PeriodType:        null,
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                // 優秀表現（小）≈ 50元 = 500 exp
                new CreateTaskRequest(
                    Title:             "優秀表現（小）",
                    Type:              "achievement",
                    Difficulty:        "normal",
                    XpReward:          500,
                    AllowanceReward:   null,
                    Description:       "受到老師表揚或有正面表現（視項目而定，相當於 50 元）",
                    PeriodType:        null,
                    WeekDays:          null,
                    AssignedPlayerIds: null),

                // 優秀表現（大）≈ 100元 = 1000 exp
                new CreateTaskRequest(
                    Title:             "優秀表現（大）",
                    Type:              "achievement",
                    Difficulty:        "hard",
                    XpReward:          1000,
                    AllowanceReward:   null,
                    Description:       "顯著的正面表現或貢獻（相當於 100 元獎勵）",
                    PeriodType:        null,
                    WeekDays:          null,
                    AssignedPlayerIds: null),
            };

            foreach (var t in tasks)
            {
                try
                {
                    var created = await svc.CreateTaskAsync(familyId, t, adminId, ct);
                    results.Add($"✅ Task: {created.Title} (+{created.XpReward} exp)");
                }
                catch (Exception ex)
                {
                    results.Add($"⚠️ Task '{t.Title}' failed: {ex.Message}");
                }
            }

            // ── Shop Items ───────────────────────────────────────────────────
            // 零用金 = 新台幣（NT$），兌換獎勵用零用金支付
            // XP 轉換項目：300 exp → 30 NT$（10 exp = 1 NT$）

            var shopItems = new[]
            {
                // 看影片 20 分鐘 → NT$30（雙標價：也可用 150 XP 購買）
                new CreateShopItemRequest(
                    Name:          "看影片 20 分鐘",
                    Description:   "兌換一次看 YouTube / Netflix 20 分鐘的機會（需家長批准）",
                    XpPrice:       150,
                    Type:          "reward",
                    Emoji:         "📺",
                    Stock:         null,
                    AllowancePrice: 30,
                    DailyLimit:    2,
                    AllowanceGiven: null),

                // 自選電影一部 → NT$100（雙標價：也可用 500 XP 購買）
                new CreateShopItemRequest(
                    Name:          "自選電影一部",
                    Description:   "自己挑一部電影，和家人一起觀看（需家長批准）",
                    XpPrice:       500,
                    Type:          "reward",
                    Emoji:         "🎬",
                    Stock:         null,
                    AllowancePrice: 100,
                    DailyLimit:    1,
                    AllowanceGiven: null),

                // XP 兌換零用金: 300 exp → NT$30（僅限 XP 購買）
                new CreateShopItemRequest(
                    Name:          "零用金兌換 30 元",
                    Description:   "將 300 經驗值兌換為 NT$30 零用金（匯率：10 exp = 1 NT$）",
                    XpPrice:       300,
                    Type:          "allowance",
                    Emoji:         "💰",
                    Stock:         null,
                    AllowancePrice: 0,
                    DailyLimit:    null,
                    AllowanceGiven: 30),

                // 玩 Switch 30 分鐘 → NT$50（雙標價：也可用 250 XP 購買）
                new CreateShopItemRequest(
                    Name:          "玩 Switch 30 分鐘",
                    Description:   "兌換一次玩任天堂 Switch 30 分鐘的機會（需家長批准）",
                    XpPrice:       250,
                    Type:          "reward",
                    Emoji:         "🎮",
                    Stock:         null,
                    AllowancePrice: 50,
                    DailyLimit:    2,
                    AllowanceGiven: null),
            };

            foreach (var item in shopItems)
            {
                try
                {
                    var created = await svc.CreateShopItemAsync(familyId, item, ct);
                    results.Add($"✅ Shop: {created.Name} (XP:{created.XpPrice} / NT${created.AllowancePrice})");
                }
                catch (Exception ex)
                {
                    results.Add($"⚠️ Shop '{item.Name}' failed: {ex.Message}");
                }
            }

            // 初始化 family settings（匯率 10 XP = $1）
            try
            {
                await svc.UpdateFamilySettingsAsync(familyId, new UpdateFamilySettingsRequest(10, true), ct);
                results.Add("✅ Family settings: xpToAllowanceRate=10, enabled=true");
            }
            catch (Exception ex)
            {
                results.Add($"⚠️ Family settings failed: {ex.Message}");
            }

            return Results.Ok(new
            {
                familyId,
                seeded = results.Count(r => r.StartsWith("✅")),
                total  = results.Count,
                details = results,
                adminHint = "Admin: X-API-Key: mido-test-api-key-2026",
                playerHint = "Player: POST /api/dev/player-token with { familyId, playerId, playerName }"
            });
        });

        // ── 3. 初始化家庭（Dev only，指定 familyId）──────────────────────────────
        // POST /api/dev/init-family
        // Body: { "familyId": "...", "adminUid": "..." }
        dev.MapPost("/init-family", async (
            InitFamilyRequest req,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            await svc.InitializeAsync(req.FamilyId, req.AdminUid, ct);
            return Results.Ok(new { message = $"✅ Family {req.FamilyId} initialized", adminUid = req.AdminUid });
        });

        // ── 4. 為任意家庭新增積分交易（Dev only）──────────────────────────────
        // POST /api/dev/transaction
        // Body: { "familyId": "...", "playerIds": [...], "type": "earn|deduct", "amount": N, "reason": "..." }
        dev.MapPost("/transaction", async (
            DevTransactionRequest req,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var txReq = new AddTransactionRequest(req.PlayerIds, req.Type, req.Amount, req.Reason, null, req.Note, req.Currency);
            var result = await svc.AddTransactionAsync(req.FamilyId, txReq, "dev-test", ct);
            return Results.Created($"/api/dev/transaction/{result.Id}", result);
        });

        // ── 5. 設定初始零用金餘額（Dev only）────────────────────────────────
        // POST /api/dev/allowance-init
        dev.MapPost("/allowance-init", async (
            AllowanceInitRequest req,
            IFamilyScoreboardService svc,
            CancellationToken ct) =>
        {
            var adjustReq = new AdjustAllowanceRequest(
                PlayerId: req.PlayerId,
                Amount:   req.Amount,
                Reason:   "初始零用金（家長設定）",
                Note:     "由 Dev Seed 設定"
            );
            var result = await svc.AdjustAllowanceAsync(req.FamilyId, adjustReq, "dev-seed", ct);
            return Results.Ok(new { message = $"✅ {req.PlayerId} 零用金 +{req.Amount} 元", record = result });
        });
    }
}

// ── Dev-only request records ──────────────────────────────────────────────────

public record PlayerTokenRequest(string FamilyId, string PlayerId, string PlayerName);
public record SeedRequest(string FamilyId);
public record InitFamilyRequest(string FamilyId, string AdminUid);
public record DevTransactionRequest(string FamilyId, List<string> PlayerIds, string Type, int Amount, string Reason, string? Note = null, string? Currency = null);
public record AllowanceInitRequest(string FamilyId, string PlayerId, int Amount);
