using MidoLearning.Api.Models.SkillVillage;
using MidoLearning.Api.Services;
using Google.Cloud.Firestore;

namespace MidoLearning.Api.Modules.SkillVillage.GameEngine.Calculators;

/// <summary>
/// 獎勵計算器
/// 根據 Skill 的 RewardRules 計算獎勵
/// </summary>
public class RewardCalculator
{
    private readonly FirestoreDb _firestoreDb;
    private static readonly Random Random = new();

    public RewardCalculator(FirestoreDb firestoreDb)
    {
        _firestoreDb = firestoreDb;
    }

    /// <summary>
    /// 計算獎勵
    /// 規則：
    /// 1. 遊玩時間至少 10 分鐘
    /// 2. 距離上次獎勵至少 10 分鐘（冷卻時間）
    /// 3. 每日獎勵上限 20 元
    /// 4. 隨機獎勵 1-5 元
    /// </summary>
    public async Task<int> CalculateAsync(
        Character character,
        Skill skill,
        SkillLevel level,
        GamePerformance performance)
    {
        var rules = skill.RewardRules;

        // 1. 檢查遊玩時間是否足夠
        if (performance.PlayTime < rules.MinPlayTime)
        {
            return 0;
        }

        // 2. 檢查冷卻時間
        if (character.Rewards.LastRewardAt != null)
        {
            var lastRewardTime = character.Rewards.LastRewardAt.Value.ToDateTime();
            var cooldownMinutes = (DateTime.UtcNow - lastRewardTime).TotalMinutes;

            if (cooldownMinutes < rules.Cooldown)
            {
                return 0;
            }
        }

        // 3. 檢查每日獎勵上限
        var todayRewardTotal = await GetTodayRewardTotalAsync(character.Id!);

        if (todayRewardTotal >= rules.DailyLimit)
        {
            return 0;
        }

        // 4. 計算隨機獎勵
        int minReward = rules.RewardRange[0];
        int maxReward = rules.RewardRange[1];

        // 關卡倍率影響獎勵上限
        maxReward = (int)(maxReward * level.RewardMultiplier);

        int reward = Random.Next(minReward, maxReward + 1);

        // 5. 確保不超過每日上限
        int remainingDailyLimit = rules.DailyLimit - todayRewardTotal;
        reward = Math.Min(reward, remainingDailyLimit);

        return reward;
    }

    /// <summary>
    /// 查詢今日已獲得的獎勵總額
    /// </summary>
    private async Task<int> GetTodayRewardTotalAsync(string characterId)
    {
        var db = _firestoreDb;
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var todayStart = Timestamp.FromDateTime(DateTime.SpecifyKind(today, DateTimeKind.Utc));
        var todayEnd = Timestamp.FromDateTime(DateTime.SpecifyKind(tomorrow, DateTimeKind.Utc));

        var rewardsQuery = db.Collection("skill_village_rewards")
            .WhereEqualTo("characterId", characterId)
            .WhereGreaterThanOrEqualTo("createdAt", todayStart)
            .WhereLessThan("createdAt", todayEnd);

        var snapshot = await rewardsQuery.GetSnapshotAsync();

        int total = 0;
        foreach (var doc in snapshot.Documents)
        {
            if (doc.TryGetValue("amount", out int amount))
            {
                total += amount;
            }
        }

        return total;
    }
}
