using MidoLearning.Api.Modules.SkillVillage.Auth.Dtos;
using MidoLearning.Api.Modules.SkillVillage.Auth.Services;

namespace MidoLearning.Api.Endpoints;

/// <summary>
/// 技能村認證端點
/// </summary>
public static class SkillVillageAuthEndpoints
{
    public static void MapSkillVillageAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/skill-village/auth")
            .WithTags("Skill Village - Auth")
            .WithOpenApi();

        // 遊戲註冊
        group.MapPost("/register-simple", async (
            RegisterSimpleDto dto,
            SkillVillageAuthService authService,
            HttpContext context) =>
        {
            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var result = await authService.RegisterSimpleAsync(dto, ip);

            return result.Success
                ? Results.Ok(new { success = true, data = result })
                : Results.BadRequest(new { success = false, message = result.Message });
        })
        .WithName("SkillVillage_RegisterSimple")
        .WithSummary("遊戲註冊")
        .WithDescription("使用 username + 簡單密碼註冊（for 小學生）");

        // 登入
        group.MapPost("/login", async (
            LoginDto dto,
            SkillVillageAuthService authService) =>
        {
            var result = await authService.LoginAsync(dto);

            return result.Success
                ? Results.Ok(new { success = true, data = result })
                : Results.Unauthorized();
        })
        .WithName("SkillVillage_Login")
        .WithSummary("登入")
        .WithDescription("使用 username 或 email 登入");
    }
}
