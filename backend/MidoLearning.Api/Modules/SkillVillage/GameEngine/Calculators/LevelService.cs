namespace MidoLearning.Api.Modules.SkillVillage.GameEngine.Calculators;

/// <summary>
/// 等級系統服務
/// 根據規格計算等級與所需經驗值（Lv 1-1000）
/// </summary>
public class LevelService
{
    // 快取等級對照表（避免重複計算）
    private static readonly Dictionary<int, int> LevelExpTable = new();

    static LevelService()
    {
        // 建立 Lv 1-1000 的經驗值對照表
        BuildLevelTable();
    }

    /// <summary>
    /// 建立等級對照表
    /// 公式：每級所需經驗 = 100 + (level - 1) * 20
    /// Lv 1: 100 exp
    /// Lv 2: 120 exp (累計 220)
    /// Lv 3: 140 exp (累計 360)
    /// ...
    /// </summary>
    private static void BuildLevelTable()
    {
        int totalExp = 0;

        for (int level = 1; level <= 1000; level++)
        {
            int requiredExp = 100 + (level - 1) * 20;
            totalExp += requiredExp;
            LevelExpTable[level] = totalExp;
        }
    }

    /// <summary>
    /// 計算指定等級需要的總經驗值
    /// </summary>
    public static int GetTotalExpForLevel(int level)
    {
        if (level < 1) return 0;
        if (level > 1000) level = 1000;

        return LevelExpTable.TryGetValue(level, out int exp) ? exp : 0;
    }

    /// <summary>
    /// 計算從當前等級升到下一級所需的經驗值
    /// </summary>
    public static int GetExpRequiredForLevel(int level)
    {
        if (level < 1) return 100;
        if (level > 1000) return int.MaxValue; // 已滿級

        return 100 + (level - 1) * 20;
    }

    /// <summary>
    /// 根據總經驗值計算目前等級
    /// </summary>
    public static int CalculateLevel(int totalExp)
    {
        if (totalExp <= 0) return 1;

        // 二分搜尋找出等級
        int left = 1, right = 1000;

        while (left < right)
        {
            int mid = (left + right + 1) / 2;
            if (GetTotalExpForLevel(mid) <= totalExp)
            {
                left = mid;
            }
            else
            {
                right = mid - 1;
            }
        }

        return left;
    }

    /// <summary>
    /// 計算等級相關資訊
    /// </summary>
    public static LevelInfo CalculateLevelInfo(int totalExp)
    {
        int level = CalculateLevel(totalExp);
        int prevLevelTotalExp = level > 1 ? GetTotalExpForLevel(level - 1) : 0;
        int currentLevelExp = totalExp - prevLevelTotalExp;
        int nextLevelExp = GetExpRequiredForLevel(level);

        return new LevelInfo
        {
            Level = level,
            TotalExp = totalExp,
            CurrentLevelExp = currentLevelExp,
            NextLevelExp = nextLevelExp
        };
    }

    /// <summary>
    /// 檢查是否升級
    /// </summary>
    public static bool CheckLevelUp(int oldTotalExp, int newTotalExp)
    {
        int oldLevel = CalculateLevel(oldTotalExp);
        int newLevel = CalculateLevel(newTotalExp);

        return newLevel > oldLevel;
    }
}

/// <summary>
/// 等級資訊
/// </summary>
public class LevelInfo
{
    public int Level { get; set; }
    public int TotalExp { get; set; }
    public int CurrentLevelExp { get; set; }
    public int NextLevelExp { get; set; }
}
