using System.ComponentModel.DataAnnotations;

namespace MidoLearning.Api.Modules.SkillVillage.Auth.Dtos;

/// <summary>
/// 遊戲註冊 DTO
/// </summary>
public class RegisterSimpleDto
{
    /// <summary>
    /// 使用者名稱（4-16 字元，僅允許英文、數字、底線）
    /// </summary>
    [Required(ErrorMessage = "使用者名稱為必填")]
    [StringLength(16, MinimumLength = 4, ErrorMessage = "使用者名稱長度必須為 4-16 字元")]
    [RegularExpression(@"^[a-zA-Z0-9_]+$", ErrorMessage = "使用者名稱僅允許英文、數字、底線")]
    public string Username { get; set; } = string.Empty;

    /// <summary>
    /// 密碼（4-8 字元，可包含英文、數字）
    /// ⚠️ 注意：這是為了讓小學生易於記憶，安全性較低（TD-001）
    /// </summary>
    [Required(ErrorMessage = "密碼為必填")]
    [StringLength(8, MinimumLength = 4, ErrorMessage = "密碼長度必須為 4-8 字元")]
    [RegularExpression(@"^[a-zA-Z0-9]+$", ErrorMessage = "密碼僅允許英文、數字")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// 確認密碼
    /// </summary>
    [Required(ErrorMessage = "確認密碼為必填")]
    [Compare(nameof(Password), ErrorMessage = "密碼與確認密碼不一致")]
    public string PasswordConfirm { get; set; } = string.Empty;

    /// <summary>
    /// 角色名稱（可選，預設使用 username）
    /// </summary>
    [StringLength(12, MinimumLength = 2, ErrorMessage = "角色名稱長度必須為 2-12 字元")]
    public string? CharacterName { get; set; }

    /// <summary>
    /// 虛擬貨幣名稱（可選，預設「米豆幣」）
    /// </summary>
    [StringLength(8, MinimumLength = 2, ErrorMessage = "虛擬貨幣名稱長度必須為 2-8 字元")]
    public string? CurrencyName { get; set; }
}
