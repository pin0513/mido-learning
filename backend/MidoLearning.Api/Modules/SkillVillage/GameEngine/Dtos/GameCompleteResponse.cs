namespace MidoLearning.Api.Modules.SkillVillage.GameEngine.Dtos;

/// <summary>
/// 遊戲完成回應
/// </summary>
public class GameCompleteResponse
{
    public bool Success { get; set; }
    public int ExpGained { get; set; }
    public bool LevelUp { get; set; }
    public int NewLevel { get; set; }
    public int RewardEarned { get; set; }
    public string Message { get; set; } = string.Empty;
    public CharacterState? CharacterState { get; set; }
}

/// <summary>
/// 角色狀態
/// </summary>
public class CharacterState
{
    public int Level { get; set; }
    public int TotalExp { get; set; }
    public int CurrentLevelExp { get; set; }
    public int NextLevelExp { get; set; }
    public int RewardBalance { get; set; }
}
