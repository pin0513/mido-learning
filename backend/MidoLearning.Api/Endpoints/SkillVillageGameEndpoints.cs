using MidoLearning.Api.Modules.SkillVillage.GameEngine.Dtos;
using MidoLearning.Api.Modules.SkillVillage.GameEngine.Services;
using System.Security.Claims;

namespace MidoLearning.Api.Endpoints;

/// <summary>
/// 技能村遊戲端點
/// </summary>
public static class SkillVillageGameEndpoints
{
    public static void MapSkillVillageGameEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/api/skill-village/game")
            .WithTags("Skill Village - Game")
            .RequireAuthorization(new Microsoft.AspNetCore.Authorization.AuthorizeAttribute
            {
                AuthenticationSchemes = "SkillVillage"
            }) // 需要技能村 JWT Token
            .WithOpenApi();

        // 遊戲完成（核心 API）
        group.MapPost("/complete", async (
            GameCompleteDto dto,
            GameEngineService gameService,
            ClaimsPrincipal user,
            HttpContext context) =>
        {
            var characterId = user.FindFirst(ClaimTypes.NameIdentifier)?.Value;

            if (string.IsNullOrEmpty(characterId))
            {
                return Results.Unauthorized();
            }

            var ip = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";
            var userAgent = context.Request.Headers["User-Agent"].ToString();

            var result = await gameService.ProcessGameCompleteAsync(characterId, dto, ip, userAgent);

            return result.Success
                ? Results.Ok(new { success = true, data = result })
                : Results.BadRequest(new { success = false, message = result.Message });
        })
        .WithName("SkillVillage_GameComplete")
        .WithSummary("遊戲完成")
        .WithDescription("提交遊戲結果，計算經驗值與獎勵（核心 API）");
    }
}
