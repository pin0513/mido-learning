using Google.Cloud.Firestore;
using MidoLearning.Api.Models.SkillVillage;
using MidoLearning.Api.Modules.SkillVillage.Auth.Dtos;
using MidoLearning.Api.Services;
using BCrypt.Net;
using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using Microsoft.IdentityModel.Tokens;
using System.Text;

namespace MidoLearning.Api.Modules.SkillVillage.Auth.Services;

/// <summary>
/// 技能村認證服務
/// </summary>
public class SkillVillageAuthService
{
    private readonly FirestoreDb _firestoreDb;
    private readonly IConfiguration _configuration;

    public SkillVillageAuthService(FirestoreDb firestoreDb, IConfiguration configuration)
    {
        _firestoreDb = firestoreDb;
        _configuration = configuration;
    }

    /// <summary>
    /// 遊戲註冊（Simple Auth）
    /// </summary>
    public async Task<AuthResponse> RegisterSimpleAsync(RegisterSimpleDto dto, string ip)
    {
        var db = _firestoreDb;

        // 1. 檢查 username 是否已存在
        var existingUserQuery = db.Collection("skill_village_characters")
            .WhereEqualTo("username", dto.Username)
            .Limit(1);

        var existingUserSnapshot = await existingUserQuery.GetSnapshotAsync();

        if (existingUserSnapshot.Count > 0)
        {
            return new AuthResponse
            {
                Success = false,
                Message = "使用者名稱已被使用"
            };
        }

        // 2. 檢查 IP 註冊限制（每日 3 次）
        var ipRegistrationCount = await GetRegistrationCountByIPAsync(ip);

        if (ipRegistrationCount >= 3)
        {
            return new AuthResponse
            {
                Success = false,
                Message = "今日註冊次數已達上限"
            };
        }

        // 3. Hash 密碼
        string passwordHash = BCrypt.Net.BCrypt.HashPassword(dto.Password);

        // 4. 建立角色
        var character = new Character
        {
            AccountType = "simple",
            Username = dto.Username,
            PasswordHash = passwordHash,
            Name = dto.CharacterName ?? dto.Username,
            CurrencyName = dto.CurrencyName ?? "米豆幣",
            Level = 1,
            TotalExp = 0,
            CurrentLevelExp = 0,
            NextLevelExp = 100,
            SkillProgress = new Dictionary<string, SkillProgress>(),
            Rewards = new RewardInfo
            {
                TotalEarned = 0,
                Available = 0,
                Redeemed = 0
            },
            Status = "active",
            CreatedAt = Timestamp.GetCurrentTimestamp(),
            UpdatedAt = Timestamp.GetCurrentTimestamp(),
            LastLoginAt = Timestamp.GetCurrentTimestamp()
        };

        var characterRef = await db.Collection("skill_village_characters").AddAsync(character);
        character.Id = characterRef.Id;

        // 5. 產生 JWT Token
        var token = GenerateJwtToken(character);

        return new AuthResponse
        {
            Success = true,
            Token = token,
            Character = character,
            Message = "註冊成功"
        };
    }

    /// <summary>
    /// 登入
    /// </summary>
    public async Task<AuthResponse> LoginAsync(LoginDto dto)
    {
        var db = _firestoreDb;

        // 判斷 identifier 是 username 還是 email
        bool isEmail = dto.Identifier.Contains('@');

        Query query;
        if (isEmail)
        {
            // Full account login
            query = db.Collection("skill_village_characters")
                .WhereEqualTo("userId", dto.Identifier) // 這裡應該要先用 Firebase Auth 驗證
                .Limit(10); // Full account 可能有多個角色
        }
        else
        {
            // Simple account login
            query = db.Collection("skill_village_characters")
                .WhereEqualTo("username", dto.Identifier)
                .Limit(1);
        }

        var snapshot = await query.GetSnapshotAsync();

        if (snapshot.Count == 0)
        {
            return new AuthResponse
            {
                Success = false,
                Message = "帳號或密碼錯誤"
            };
        }

        if (isEmail)
        {
            // TODO: Full account login - 需要 Firebase Auth 驗證
            return new AuthResponse
            {
                Success = false,
                Message = "Email 登入尚未實作"
            };
        }
        else
        {
            // Simple account login
            var characterDoc = snapshot.Documents[0];
            var character = characterDoc.ConvertTo<Character>();
            character.Id = characterDoc.Id;

            // 驗證密碼
            if (character.PasswordHash == null || !BCrypt.Net.BCrypt.Verify(dto.Password, character.PasswordHash))
            {
                return new AuthResponse
                {
                    Success = false,
                    Message = "帳號或密碼錯誤"
                };
            }

            // 更新最後登入時間
            await characterDoc.Reference.UpdateAsync(new Dictionary<string, object>
            {
                { "lastLoginAt", Timestamp.GetCurrentTimestamp() }
            });

            // 產生 JWT Token
            var token = GenerateJwtToken(character);

            return new AuthResponse
            {
                Success = true,
                Token = token,
                Character = character,
                Message = "登入成功"
            };
        }
    }

    /// <summary>
    /// 查詢 IP 今日註冊次數
    /// </summary>
    private async Task<int> GetRegistrationCountByIPAsync(string ip)
    {
        var db = _firestoreDb;
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var todayStart = Timestamp.FromDateTime(DateTime.SpecifyKind(today, DateTimeKind.Utc));
        var todayEnd = Timestamp.FromDateTime(DateTime.SpecifyKind(tomorrow, DateTimeKind.Utc));

        // 查詢今日此 IP 建立的角色數量
        var query = db.Collection("skill_village_characters")
            .WhereGreaterThanOrEqualTo("createdAt", todayStart)
            .WhereLessThan("createdAt", todayEnd);

        var snapshot = await query.GetSnapshotAsync();

        // 這裡簡化處理，實際應該在建立角色時記錄 IP
        // TODO: 在 Character model 加入 createdFromIp 欄位
        return snapshot.Count;
    }

    /// <summary>
    /// 產生 JWT Token
    /// </summary>
    private string GenerateJwtToken(Character character)
    {
        var jwtKey = _configuration["Jwt:Key"] ?? "your-super-secret-key-change-this-in-production";
        var jwtIssuer = _configuration["Jwt:Issuer"] ?? "MidoLearning";

        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, character.Id ?? string.Empty),
            new(ClaimTypes.Name, character.Name),
            new("accountType", character.AccountType)
        };

        if (character.Username != null)
        {
            claims.Add(new Claim("username", character.Username));
        }

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtKey));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var token = new JwtSecurityToken(
            issuer: jwtIssuer,
            audience: jwtIssuer,
            claims: claims,
            expires: DateTime.UtcNow.AddDays(30), // Token 有效期 30 天
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }
}
