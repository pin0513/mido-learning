namespace MidoLearning.Api.Services;

/// <summary>
/// 集中解析 Player JWT / SkillVillage JWT 的簽章金鑰。
/// 非 Development 環境缺少 <c>Jwt:Key</c> 設定時直接拋出例外，避免沿用硬編碼的開發用後門金鑰。
/// </summary>
public static class JwtKeyProvider
{
    /// <summary>僅限 Development 環境使用的預設金鑰（絕不可流入生產環境）。</summary>
    public const string DevelopmentFallbackKey = "your-super-secret-jwt-key-change-this-in-production-skill-village";

    /// <summary>
    /// 解析 JWT 簽章金鑰。
    /// - 已設定 <c>Jwt:Key</c>：一律採用設定值（任何環境）。
    /// - 未設定且環境為 Development：回退到 <see cref="DevelopmentFallbackKey"/>。
    /// - 未設定且非 Development：拋出 <see cref="InvalidOperationException"/>（啟動或首次使用即失敗，禁止沿用後門金鑰）。
    /// </summary>
    public static string ResolveKey(IConfiguration configuration, IHostEnvironment environment)
    {
        var key = configuration["Jwt:Key"];
        if (!string.IsNullOrEmpty(key))
            return key;

        if (environment.IsDevelopment())
            return DevelopmentFallbackKey;

        throw new InvalidOperationException(
            "Jwt:Key 未設定。非 Development 環境必須明確設定 Jwt:Key，禁止使用硬編碼預設金鑰。");
    }
}
