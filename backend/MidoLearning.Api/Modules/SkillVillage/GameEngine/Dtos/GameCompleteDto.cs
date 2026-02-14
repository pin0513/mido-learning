using System.ComponentModel.DataAnnotations;

namespace MidoLearning.Api.Modules.SkillVillage.GameEngine.Dtos;

/// <summary>
/// 遊戲完成 DTO
/// </summary>
public class GameCompleteDto
{
    /// <summary>
    /// 技能 ID
    /// </summary>
    [Required(ErrorMessage = "技能 ID 為必填")]
    public string SkillId { get; set; } = string.Empty;

    /// <summary>
    /// 關卡 ID
    /// </summary>
    [Required(ErrorMessage = "關卡 ID 為必填")]
    public string LevelId { get; set; } = string.Empty;

    /// <summary>
    /// 遊玩時間（秒）
    /// </summary>
    [Range(1, 3600, ErrorMessage = "遊玩時間必須為 1-3600 秒")]
    public int PlayTimeSeconds { get; set; }

    /// <summary>
    /// 正確率（0-1）
    /// </summary>
    [Range(0.0, 1.0, ErrorMessage = "正確率必須為 0-1")]
    public double? Accuracy { get; set; }

    /// <summary>
    /// WPM（每分鐘字數）
    /// </summary>
    [Range(0, 500, ErrorMessage = "WPM 必須為 0-500")]
    public double? Wpm { get; set; }

    /// <summary>
    /// 分數
    /// </summary>
    public double? Score { get; set; }

    /// <summary>
    /// 挑戰次數
    /// </summary>
    public int? ChallengeCount { get; set; }

    /// <summary>
    /// Session ID（防重複提交）
    /// </summary>
    [Required(ErrorMessage = "Session ID 為必填")]
    public string SessionId { get; set; } = string.Empty;
}
