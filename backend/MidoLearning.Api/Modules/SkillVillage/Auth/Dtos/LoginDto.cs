using System.ComponentModel.DataAnnotations;

namespace MidoLearning.Api.Modules.SkillVillage.Auth.Dtos;

/// <summary>
/// 登入 DTO
/// </summary>
public class LoginDto
{
    /// <summary>
    /// 識別符（可以是 username 或 email）
    /// </summary>
    [Required(ErrorMessage = "帳號為必填")]
    public string Identifier { get; set; } = string.Empty;

    /// <summary>
    /// 密碼
    /// </summary>
    [Required(ErrorMessage = "密碼為必填")]
    public string Password { get; set; } = string.Empty;
}
