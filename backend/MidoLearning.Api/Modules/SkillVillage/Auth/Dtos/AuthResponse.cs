using MidoLearning.Api.Models.SkillVillage;

namespace MidoLearning.Api.Modules.SkillVillage.Auth.Dtos;

/// <summary>
/// 認證回應
/// </summary>
public class AuthResponse
{
    public bool Success { get; set; }
    public string? Token { get; set; }
    public Character? Character { get; set; }
    public List<Character>? Characters { get; set; } // for full account login
    public string? Message { get; set; }
}
