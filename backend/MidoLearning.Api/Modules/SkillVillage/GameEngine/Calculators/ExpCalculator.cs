using MidoLearning.Api.Models.SkillVillage;

namespace MidoLearning.Api.Modules.SkillVillage.GameEngine.Calculators;

/// <summary>
/// 經驗值計算器
/// 根據 Skill 的 ExpRules 計算獲得的經驗值
/// </summary>
public class ExpCalculator
{
    /// <summary>
    /// 計算經驗值
    /// 公式：baseExp * levelMultiplier + timeBonus + accuracyBonus + streakBonus
    /// </summary>
    public static int Calculate(
        Skill skill,
        SkillLevel level,
        GamePerformance performance,
        SkillProgress? progress = null)
    {
        var rules = skill.ExpRules;

        // 1. 基礎經驗 * 關卡倍率
        int baseExp = (int)(rules.BaseExp * level.ExpMultiplier);

        // 2. 時間加成（每分鐘 timeBonus 點）
        int playTimeMinutes = performance.PlayTime;
        int timeBonus = playTimeMinutes * rules.TimeBonus;

        // 3. 正確率加成
        int accuracyBonus = 0;
        if (rules.AccuracyBonus != null
            && performance.Accuracy.HasValue
            && performance.Accuracy.Value >= rules.AccuracyBonus.Threshold)
        {
            accuracyBonus = rules.AccuracyBonus.Bonus;
        }

        // 4. 連勝加成
        int streakBonus = 0;
        if (rules.StreakBonus != null
            && progress != null
            && progress.Streak >= rules.StreakBonus.Threshold)
        {
            streakBonus = rules.StreakBonus.Bonus;
        }

        int totalExp = baseExp + timeBonus + accuracyBonus + streakBonus;

        return Math.Max(0, totalExp); // 確保不會是負數
    }
}
