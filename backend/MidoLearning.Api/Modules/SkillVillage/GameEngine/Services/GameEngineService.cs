using Google.Cloud.Firestore;
using MidoLearning.Api.Models.SkillVillage;
using MidoLearning.Api.Modules.SkillVillage.GameEngine.Calculators;
using MidoLearning.Api.Modules.SkillVillage.GameEngine.Dtos;
using MidoLearning.Api.Services;

namespace MidoLearning.Api.Modules.SkillVillage.GameEngine.Services;

/// <summary>
/// 遊戲引擎服務（核心規則引擎）
/// </summary>
public class GameEngineService
{
    private readonly FirestoreDb _firestoreDb;
    private readonly RewardCalculator _rewardCalculator;

    public GameEngineService(FirestoreDb firestoreDb, RewardCalculator rewardCalculator)
    {
        _firestoreDb = firestoreDb;
        _rewardCalculator = rewardCalculator;
    }

    /// <summary>
    /// 處理遊戲完成
    /// 這是最核心的方法！
    /// </summary>
    public async Task<GameCompleteResponse> ProcessGameCompleteAsync(
        string characterId,
        GameCompleteDto dto,
        string ip,
        string userAgent)
    {
        var db = _firestoreDb;

        // 1. 防止重複提交（檢查 sessionId）
        var existingSession = await db.Collection("skill_village_game_sessions")
            .WhereEqualTo("metadata.sessionId", dto.SessionId)
            .Limit(1)
            .GetSnapshotAsync();

        if (existingSession.Count > 0)
        {
            return new GameCompleteResponse
            {
                Success = false,
                Message = "此遊戲記錄已提交過"
            };
        }

        // 2. 取得角色資料
        var characterDoc = await db.Collection("skill_village_characters").Document(characterId).GetSnapshotAsync();

        if (!characterDoc.Exists)
        {
            return new GameCompleteResponse
            {
                Success = false,
                Message = "角色不存在"
            };
        }

        var character = characterDoc.ConvertTo<Character>();
        character.Id = characterDoc.Id;

        // 3. 取得技能配置
        var skillDoc = await db.Collection("skill_village_skills").Document(dto.SkillId).GetSnapshotAsync();

        if (!skillDoc.Exists)
        {
            return new GameCompleteResponse
            {
                Success = false,
                Message = "技能不存在"
            };
        }

        var skill = skillDoc.ConvertTo<Skill>();
        skill.Id = skillDoc.Id;

        // 4. 取得關卡配置
        var level = skill.Levels.FirstOrDefault(l => l.Id == dto.LevelId);

        if (level == null)
        {
            return new GameCompleteResponse
            {
                Success = false,
                Message = "關卡不存在"
            };
        }

        // 5. 驗證遊戲時間是否合理（防作弊）
        if (!ValidateGameTime(dto.PlayTimeSeconds, skill, level))
        {
            return new GameCompleteResponse
            {
                Success = false,
                Message = "遊戲時間不合理"
            };
        }

        // 6. 準備 GamePerformance
        var performance = new GamePerformance
        {
            PlayTime = dto.PlayTimeSeconds / 60, // 轉換為分鐘
            Accuracy = dto.Accuracy,
            Wpm = dto.Wpm,
            Score = dto.Score,
            ChallengeCount = dto.ChallengeCount
        };

        // 7. 取得當前技能進度
        character.SkillProgress.TryGetValue(dto.SkillId, out var skillProgress);

        // 8. 計算經驗值
        int expGained = ExpCalculator.Calculate(skill, level, performance, skillProgress);

        // 9. 計算獎勵
        int rewardEarned = await _rewardCalculator.CalculateAsync(character, skill, level, performance);

        // 10. 更新角色資料（使用 Transaction 確保一致性）
        var result = await UpdateCharacterAsync(db, character, dto.SkillId, expGained, rewardEarned, performance);

        // 11. 記錄遊戲 session
        await SaveGameSessionAsync(db, character.Id!, skill.Id!, dto.LevelId, performance, result, ip, userAgent, dto.SessionId);

        // 12. 記錄獎勵（如果有）
        if (rewardEarned > 0)
        {
            await SaveRewardAsync(db, character.Id!, skill.Id!, rewardEarned);
        }

        return new GameCompleteResponse
        {
            Success = true,
            ExpGained = result.ExpGained,
            LevelUp = result.LevelUp,
            NewLevel = result.NewLevel,
            RewardEarned = result.RewardEarned,
            Message = BuildResultMessage(result),
            CharacterState = new CharacterState
            {
                Level = result.NewLevel,
                TotalExp = result.NewTotalExp,
                CurrentLevelExp = result.CurrentLevelExp,
                NextLevelExp = result.NextLevelExp,
                RewardBalance = result.RewardBalance
            }
        };
    }

    /// <summary>
    /// 驗證遊戲時間是否合理（防作弊）
    /// </summary>
    private bool ValidateGameTime(int playTimeSeconds, Skill skill, SkillLevel level)
    {
        // 基本檢查：時間不能太短或太長
        if (playTimeSeconds < 10) return false; // 至少 10 秒
        if (playTimeSeconds > 3600) return false; // 最多 1 小時

        // TODO: 根據遊戲類型加入更詳細的驗證
        // 例如：英打遊戲，1 分鐘內不可能打完 100 個字

        return true;
    }

    /// <summary>
    /// 更新角色資料（Transaction）
    /// </summary>
    private async Task<UpdateResult> UpdateCharacterAsync(
        FirestoreDb db,
        Character character,
        string skillId,
        int expGained,
        int rewardEarned,
        GamePerformance performance)
    {
        var characterRef = db.Collection("skill_village_characters").Document(character.Id);

        // 使用 Transaction 確保資料一致性
        var result = await db.RunTransactionAsync(async transaction =>
        {
            // 重新讀取角色資料（避免並發問題）
            var snapshot = await transaction.GetSnapshotAsync(characterRef);
            var currentChar = snapshot.ConvertTo<Character>();

            // 計算新的總經驗值
            int oldTotalExp = currentChar.TotalExp;
            int newTotalExp = oldTotalExp + expGained;

            // 計算等級資訊
            var levelInfo = LevelService.CalculateLevelInfo(newTotalExp);
            bool levelUp = levelInfo.Level > currentChar.Level;

            // 更新技能進度
            if (!currentChar.SkillProgress.ContainsKey(skillId))
            {
                currentChar.SkillProgress[skillId] = new SkillProgress();
            }

            var skillProgress = currentChar.SkillProgress[skillId];
            skillProgress.PlayCount++;
            skillProgress.TotalPlayTime += performance.PlayTime;
            skillProgress.LastPlayedAt = Timestamp.GetCurrentTimestamp();

            // 更新 streak（連勝）
            // TODO: 實作連勝邏輯（需要檢查上次遊玩時間）

            // 更新最佳成績
            UpdateBestScore(skillProgress, performance);

            // 更新獎勵
            if (rewardEarned > 0)
            {
                currentChar.Rewards.TotalEarned += rewardEarned;
                currentChar.Rewards.Available += rewardEarned;
                currentChar.Rewards.LastRewardAt = Timestamp.GetCurrentTimestamp();
            }

            // 更新角色
            var updates = new Dictionary<string, object>
            {
                { "level", levelInfo.Level },
                { "totalExp", levelInfo.TotalExp },
                { "currentLevelExp", levelInfo.CurrentLevelExp },
                { "nextLevelExp", levelInfo.NextLevelExp },
                { $"skillProgress.{skillId}", skillProgress },
                { "rewards", currentChar.Rewards },
                { "updatedAt", Timestamp.GetCurrentTimestamp() }
            };

            transaction.Update(characterRef, updates);

            return new UpdateResult
            {
                ExpGained = expGained,
                LevelUp = levelUp,
                NewLevel = levelInfo.Level,
                NewTotalExp = levelInfo.TotalExp,
                CurrentLevelExp = levelInfo.CurrentLevelExp,
                NextLevelExp = levelInfo.NextLevelExp,
                RewardEarned = rewardEarned,
                RewardBalance = currentChar.Rewards.Available
            };
        });

        return result;
    }

    /// <summary>
    /// 更新最佳成績
    /// </summary>
    private void UpdateBestScore(SkillProgress progress, GamePerformance performance)
    {
        if (progress.BestScore == null)
        {
            progress.BestScore = new BestScore();
        }

        if (performance.Accuracy.HasValue)
        {
            progress.BestScore.Accuracy = Math.Max(progress.BestScore.Accuracy ?? 0, performance.Accuracy.Value);
        }

        if (performance.Wpm.HasValue)
        {
            progress.BestScore.Wpm = Math.Max(progress.BestScore.Wpm ?? 0, performance.Wpm.Value);
        }

        if (performance.Score.HasValue)
        {
            progress.BestScore.Score = Math.Max(progress.BestScore.Score ?? 0, performance.Score.Value);
        }
    }

    /// <summary>
    /// 儲存遊戲 Session
    /// </summary>
    private async Task SaveGameSessionAsync(
        FirestoreDb db,
        string characterId,
        string skillId,
        string levelId,
        GamePerformance performance,
        UpdateResult result,
        string ip,
        string userAgent,
        string sessionId)
    {
        var session = new GameSession
        {
            CharacterId = characterId,
            SkillId = skillId,
            LevelId = levelId,
            Performance = performance,
            Result = new GameResult
            {
                ExpGained = result.ExpGained,
                LevelUp = result.LevelUp,
                NewLevel = result.NewLevel,
                RewardEarned = result.RewardEarned,
                Message = BuildResultMessage(result)
            },
            Metadata = new GameMetadata
            {
                Ip = ip,
                UserAgent = userAgent,
                SessionId = sessionId
            },
            CreatedAt = Timestamp.GetCurrentTimestamp()
        };

        await db.Collection("skill_village_game_sessions").AddAsync(session);
    }

    /// <summary>
    /// 儲存獎勵記錄
    /// </summary>
    private async Task SaveRewardAsync(FirestoreDb db, string characterId, string skillId, int amount)
    {
        var reward = new Dictionary<string, object>
        {
            { "characterId", characterId },
            { "type", "play_time" },
            { "amount", amount },
            { "source", skillId },
            { "description", $"遊玩 {skillId} 獲得獎勵" },
            { "createdAt", Timestamp.GetCurrentTimestamp() }
        };

        await db.Collection("skill_village_rewards").AddAsync(reward);
    }

    /// <summary>
    /// 建立結果訊息
    /// </summary>
    private string BuildResultMessage(UpdateResult result)
    {
        if (result.LevelUp)
        {
            return $"恭喜升級至 Lv {result.NewLevel}！";
        }

        if (result.RewardEarned > 0)
        {
            return $"獲得 {result.ExpGained} 經驗值與 {result.RewardEarned} 米豆幣！";
        }

        return $"獲得 {result.ExpGained} 經驗值！";
    }
}

/// <summary>
/// 更新結果
/// </summary>
internal class UpdateResult
{
    public int ExpGained { get; set; }
    public bool LevelUp { get; set; }
    public int NewLevel { get; set; }
    public int NewTotalExp { get; set; }
    public int CurrentLevelExp { get; set; }
    public int NextLevelExp { get; set; }
    public int RewardEarned { get; set; }
    public int RewardBalance { get; set; }
}
