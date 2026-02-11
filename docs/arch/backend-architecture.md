# 後端架構設計（NestJS）

**版本**: 1.0
**日期**: 2026-02-12
**審查者**: Software Architect

---

## NestJS 模組架構圖

```
backend/skill-village-api/
├── src/
│   ├── main.ts                          # 應用程式入口
│   ├── app.module.ts                    # Root Module
│   │
│   ├── common/                          # 共用程式碼
│   │   ├── decorators/
│   │   │   ├── current-user.decorator.ts    # @CurrentUser()
│   │   │   └── roles.decorator.ts           # @Roles()
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts           # JWT 驗證
│   │   │   └── roles.guard.ts              # 角色權限
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts      # 請求日誌
│   │   │   └── transform.interceptor.ts    # 回應格式包裝
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts    # 統一錯誤處理
│   │   └── dto/
│   │       └── api-response.dto.ts         # 統一回應格式
│   │
│   ├── config/                          # 設定管理
│   │   ├── firebase.config.ts              # Firebase 設定
│   │   └── app.config.ts                   # 應用設定
│   │
│   ├── auth/                            # 認證模組
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts              # /api/auth/*
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts             # JWT 驗證策略
│   │   │   └── simple-auth.strategy.ts     # 遊戲註冊驗證
│   │   └── dto/
│   │       ├── register-simple.dto.ts
│   │       ├── register-full.dto.ts
│   │       └── login.dto.ts
│   │
│   ├── characters/                      # 角色管理模組
│   │   ├── characters.module.ts
│   │   ├── characters.controller.ts        # /api/characters/*
│   │   ├── characters.service.ts
│   │   └── dto/
│   │       ├── create-character.dto.ts
│   │       ├── update-character.dto.ts
│   │       └── change-password.dto.ts
│   │
│   ├── game-engine/                     # 遊戲引擎模組（核心）
│   │   ├── game-engine.module.ts
│   │   ├── game-engine.controller.ts       # /api/game/*
│   │   ├── game-engine.service.ts
│   │   ├── calculators/
│   │   │   ├── exp-calculator.service.ts   # 經驗值計算
│   │   │   ├── reward-calculator.service.ts # 獎勵計算
│   │   │   └── level-service.ts            # 等級系統
│   │   ├── validators/
│   │   │   ├── anti-cheat.validator.ts     # 防作弊驗證
│   │   │   └── session.validator.ts        # Session 驗證
│   │   └── dto/
│   │       ├── game-complete.dto.ts
│   │       └── game-result.dto.ts
│   │
│   ├── skills/                          # 技能配置模組
│   │   ├── skills.module.ts
│   │   ├── skills.controller.ts            # /api/skills/*
│   │   ├── skills.service.ts
│   │   └── dto/
│   │       ├── create-skill.dto.ts
│   │       └── update-skill.dto.ts
│   │
│   ├── rewards/                         # 獎勵模組
│   │   ├── rewards.module.ts
│   │   ├── rewards.controller.ts           # /api/rewards/*
│   │   ├── rewards.service.ts
│   │   └── dto/
│   │       ├── redeem.dto.ts
│   │       └── manual-reward.dto.ts
│   │
│   ├── messages/                        # 訊息模組
│   │   ├── messages.module.ts
│   │   ├── messages.controller.ts          # /api/messages/*
│   │   ├── messages.service.ts
│   │   └── dto/
│   │       ├── create-message.dto.ts
│   │       └── reply-message.dto.ts
│   │
│   ├── admin/                           # 管理員模組
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts             # /api/admin/*
│   │   └── admin.service.ts
│   │
│   └── firebase/                        # Firebase 服務
│       ├── firebase.module.ts
│       └── firebase.service.ts             # Firestore 操作封裝
│
├── test/                                # E2E 測試
│   └── app.e2e-spec.ts
│
├── Dockerfile                           # Docker 配置
├── .env.example                         # 環境變數範本
├── nest-cli.json                        # NestJS CLI 設定
├── tsconfig.json                        # TypeScript 設定
└── package.json
```

---

## 模組職責詳細說明

### 1. Auth Module（認證模組）

**職責**：
- 處理遊戲註冊（Simple Auth）
- 處理完整註冊（Full Auth with Email）
- 處理 Google OAuth 登入
- 產生與驗證 JWT Token

**API Endpoints**:

```typescript
// auth.controller.ts

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 遊戲註冊
  @Post('register-simple')
  async registerSimple(@Body() dto: RegisterSimpleDto) {
    // 1. 驗證 username 唯一性
    // 2. Hash 密碼
    // 3. 建立角色
    // 4. 產生 JWT Token
    // 5. 回傳 token + character
  }

  // 完整註冊
  @Post('register-full')
  async registerFull(@Body() dto: RegisterFullDto) {
    // 1. 使用 Firebase Auth 建立帳號
    // 2. 建立角色
    // 3. 產生 JWT Token
  }

  // 登入
  @Post('login')
  async login(@Body() dto: LoginDto) {
    // 1. 判斷 identifier 是 username 還是 email
    // 2. 驗證密碼
    // 3. 產生 JWT Token
    // 4. 回傳 token + characters
  }

  // Google OAuth 登入
  @Post('google-login')
  async googleLogin(@Body() dto: GoogleLoginDto) {
    // 1. 驗證 Google ID Token
    // 2. 查詢或建立 Firebase Auth 帳號
    // 3. 查詢關聯的角色
    // 4. 產生 JWT Token
  }
}
```

**Service 層實作**:

```typescript
// auth.service.ts

@Injectable()
export class AuthService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly jwtService: JwtService,
  ) {}

  async registerSimple(dto: RegisterSimpleDto): Promise<AuthResponse> {
    // 1. 檢查 username 是否已存在
    const existingUser = await this.firebaseService
      .collection('characters')
      .where('username', '==', dto.username)
      .get();

    if (!existingUser.empty) {
      throw new ConflictException('使用者名稱已被使用');
    }

    // 2. 檢查 IP 註冊限制（每日 3 次）
    const ipCount = await this.getRegistrationCountByIP(dto.ip);
    if (ipCount >= 3) {
      throw new ForbiddenException('今日註冊次數已達上限');
    }

    // 3. Hash 密碼
    const passwordHash = await bcrypt.hash(dto.password, 10);

    // 4. 建立角色
    const characterRef = await this.firebaseService
      .collection('characters')
      .add({
        accountType: 'simple',
        username: dto.username,
        passwordHash: passwordHash,
        name: dto.characterName || dto.username,
        currencyName: '米豆幣',
        level: 1,
        totalExp: 0,
        currentLevelExp: 0,
        nextLevelExp: 100,
        skillProgress: {},
        rewards: {
          totalEarned: 0,
          available: 0,
          redeemed: 0,
        },
        status: 'active',
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

    const character = await characterRef.get();

    // 5. 產生 JWT Token
    const token = this.jwtService.sign({
      sub: character.id,
      username: dto.username,
      accountType: 'simple',
    });

    return {
      success: true,
      token,
      character: character.data(),
    };
  }
}
```

---

### 2. Characters Module（角色管理模組）

**職責**：
- CRUD 角色資料
- 修改角色名稱、虛擬貨幣名稱
- 重設密碼（for 遊戲註冊用戶）
- 查詢角色列表（for 完整註冊帳號）

**API Endpoints**:

```typescript
// characters.controller.ts

@Controller('api/characters')
export class CharactersController {
  constructor(private readonly charactersService: CharactersService) {}

  // 建立角色（需要完整註冊帳號）
  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@CurrentUser() user, @Body() dto: CreateCharacterDto) {
    // 1. 檢查是否為完整註冊帳號
    // 2. 檢查角色數量限制（5 個）
    // 3. 建立角色
  }

  // 取得當前使用者的所有角色
  @Get()
  @UseGuards(JwtAuthGuard)
  async findAll(@CurrentUser() user) {
    // 1. 查詢 userId 關聯的所有角色
  }

  // 更新角色資訊
  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body() dto: UpdateCharacterDto,
  ) {
    // 1. 驗證角色屬於當前使用者
    // 2. 更新 name 或 currencyName
  }

  // 修改密碼（僅限 simple 帳號）
  @Post(':id/change-password')
  @UseGuards(JwtAuthGuard)
  async changePassword(
    @Param('id') id: string,
    @CurrentUser() user,
    @Body() dto: ChangePasswordDto,
  ) {
    // 1. 驗證舊密碼
    // 2. Hash 新密碼並更新
  }
}
```

---

### 3. Game Engine Module（遊戲引擎模組）⭐ 核心

**職責**：
- 處理遊戲完成請求
- 經驗值計算（套用規則引擎）
- 獎勵計算（套用獎勵規則）
- 升級判定
- 防作弊驗證

**API Endpoints**:

```typescript
// game-engine.controller.ts

@Controller('api/game')
export class GameEngineController {
  constructor(private readonly gameEngineService: GameEngineService) {}

  // 遊戲完成
  @Post('complete')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(ThrottlerInterceptor) // Rate Limiting
  async complete(@Body() dto: GameCompleteDto, @Req() req) {
    // 1. 驗證 session 合法性
    // 2. 防作弊檢查
    // 3. 計算經驗值
    // 4. 計算獎勵
    // 5. 更新角色資料
    // 6. 記錄 game_sessions
    // 7. 回傳結果
  }
}
```

**核心 Service 層實作**:

```typescript
// game-engine.service.ts

@Injectable()
export class GameEngineService {
  constructor(
    private readonly firebaseService: FirebaseService,
    private readonly expCalculator: ExpCalculatorService,
    private readonly rewardCalculator: RewardCalculatorService,
    private readonly levelService: LevelService,
    private readonly antiCheatValidator: AntiCheatValidator,
  ) {}

  async completeGame(dto: GameCompleteDto, metadata: GameMetadata): Promise<GameResult> {
    // === 1. 驗證與防作弊 ===
    await this.antiCheatValidator.validate(dto, metadata);

    // === 2. 讀取必要資料 ===
    const [character, skill] = await Promise.all([
      this.getCharacter(dto.characterId),
      this.getSkill(dto.skillId),
    ]);

    const level = skill.levels.find(l => l.id === dto.levelId);

    // === 3. 計算經驗值 ===
    const expGained = await this.expCalculator.calculate({
      skill,
      level,
      performance: dto.performance,
      character,
    });

    // === 4. 計算獎勵 ===
    const rewardEarned = await this.rewardCalculator.calculate({
      skill,
      level,
      performance: dto.performance,
      character,
    });

    // === 5. 更新角色資料 ===
    const newTotalExp = character.totalExp + expGained;
    const levelUpResult = await this.levelService.checkLevelUp(
      character.level,
      newTotalExp,
    );

    const updatedCharacter = await this.updateCharacter(character.id, {
      totalExp: newTotalExp,
      level: levelUpResult.newLevel,
      currentLevelExp: levelUpResult.currentLevelExp,
      nextLevelExp: levelUpResult.nextLevelExp,
      [`skillProgress.${dto.skillId}`]: {
        skillLevel: character.skillProgress[dto.skillId]?.skillLevel || 1,
        skillExp: (character.skillProgress[dto.skillId]?.skillExp || 0) + expGained,
        playCount: (character.skillProgress[dto.skillId]?.playCount || 0) + 1,
        totalPlayTime: (character.skillProgress[dto.skillId]?.totalPlayTime || 0) + dto.performance.playTime,
        lastPlayedAt: FieldValue.serverTimestamp(),
        streak: (character.skillProgress[dto.skillId]?.streak || 0) + 1,
        bestScore: this.updateBestScore(
          character.skillProgress[dto.skillId]?.bestScore,
          dto.performance,
        ),
      },
      'rewards.available': character.rewards.available + rewardEarned,
      'rewards.totalEarned': character.rewards.totalEarned + rewardEarned,
      'rewards.lastRewardAt': rewardEarned > 0 ? FieldValue.serverTimestamp() : character.rewards.lastRewardAt,
    });

    // === 6. 記錄 game_sessions ===
    await this.createGameSession({
      characterId: character.id,
      skillId: dto.skillId,
      levelId: dto.levelId,
      performance: dto.performance,
      result: {
        expGained,
        levelUp: levelUpResult.leveledUp,
        newLevel: levelUpResult.newLevel,
        rewardEarned,
        message: this.buildResultMessage(dto.performance, expGained, levelUpResult.leveledUp),
      },
      metadata,
    });

    // === 7. 記錄獎勵（如有） ===
    if (rewardEarned > 0) {
      await this.createReward({
        characterId: character.id,
        type: 'play_time',
        amount: rewardEarned,
        source: dto.skillId,
        description: `完成 ${skill.name} 獲得`,
      });
    }

    // === 8. 回傳結果 ===
    return {
      success: true,
      result: {
        expGained,
        levelUp: levelUpResult.leveledUp,
        newLevel: levelUpResult.newLevel,
        newExp: newTotalExp,
        rewardEarned,
        message: this.buildResultMessage(dto.performance, expGained, levelUpResult.leveledUp),
      },
    };
  }
}
```

**經驗值計算器**:

```typescript
// calculators/exp-calculator.service.ts

@Injectable()
export class ExpCalculatorService {
  calculate(params: ExpCalculationParams): number {
    const { skill, level, performance, character } = params;
    const rules = skill.expRules;

    let totalExp = rules.baseExp;

    // 時間加成
    totalExp += performance.playTime * rules.timeBonus;

    // 正確率加成
    if (rules.accuracyBonus && performance.accuracy >= rules.accuracyBonus.threshold) {
      totalExp += rules.accuracyBonus.bonus;
    }

    // 連續加成
    const streak = character.skillProgress[skill.id]?.streak || 0;
    if (rules.streakBonus && streak >= rules.streakBonus.threshold) {
      totalExp += rules.streakBonus.bonus;
    }

    // 應用難度倍率
    totalExp = Math.round(totalExp * level.expMultiplier);

    return totalExp;
  }
}
```

**獎勵計算器**:

```typescript
// calculators/reward-calculator.service.ts

@Injectable()
export class RewardCalculatorService {
  constructor(private readonly firebaseService: FirebaseService) {}

  async calculate(params: RewardCalculationParams): Promise<number> {
    const { skill, level, performance, character } = params;
    const rules = skill.rewardRules;

    // 1. 檢查最低遊玩時間
    if (performance.playTime < rules.minPlayTime) {
      return 0;
    }

    // 2. 檢查冷卻時間
    if (character.rewards.lastRewardAt) {
      const minutesSince = (Date.now() - character.rewards.lastRewardAt.toMillis()) / 60000;
      if (minutesSince < rules.cooldown) {
        return 0;
      }
    }

    // 3. 檢查每日上限
    const todayEarned = await this.getTodayEarned(character.id);
    if (todayEarned >= rules.dailyLimit) {
      return 0;
    }

    // 4. 隨機獎勵
    const [min, max] = rules.rewardRange;
    let reward = Math.floor(Math.random() * (max - min + 1)) + min;

    // 5. 應用難度倍率
    reward = Math.round(reward * level.rewardMultiplier);

    // 6. 不超過每日上限
    reward = Math.min(reward, rules.dailyLimit - todayEarned);

    return reward;
  }

  private async getTodayEarned(characterId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const snapshot = await this.firebaseService
      .collection('rewards')
      .where('characterId', '==', characterId)
      .where('createdAt', '>=', today)
      .get();

    return snapshot.docs.reduce((sum, doc) => sum + doc.data().amount, 0);
  }
}
```

**防作弊驗證器**:

```typescript
// validators/anti-cheat.validator.ts

@Injectable()
export class AntiCheatValidator {
  async validate(dto: GameCompleteDto, metadata: GameMetadata): Promise<void> {
    // 1. 驗證時間合理性
    const actualDuration = (metadata.endTime - metadata.startTime) / 60000; // 分鐘
    const diff = Math.abs(actualDuration - dto.performance.playTime);

    if (diff / dto.performance.playTime > 0.2) {
      throw new BadRequestException('遊玩時間不合理');
    }

    // 2. 驗證正確率範圍
    if (dto.performance.accuracy && (dto.performance.accuracy < 0 || dto.performance.accuracy > 1)) {
      throw new BadRequestException('正確率數值異常');
    }

    // 3. 驗證 WPM 合理性（英打遊戲）
    if (dto.skillId === 'english-typing' && dto.performance.wpm > 200) {
      throw new BadRequestException('打字速度超出合理範圍');
    }

    // 4. 檢查 sessionId 是否已使用過
    const existingSession = await this.firebaseService
      .collection('game_sessions')
      .where('metadata.sessionId', '==', metadata.sessionId)
      .get();

    if (!existingSession.empty) {
      throw new ConflictException('此 session 已提交過結果');
    }
  }
}
```

---

### 4. Skills Module（技能配置模組）

**職責**：
- 管理員新增/編輯技能配置
- 查詢技能列表（前端用）

**API Endpoints**:

```typescript
@Controller('api/skills')
export class SkillsController {
  // 取得所有技能（公開，前端直讀 Firestore 即可）
  @Get()
  async findAll(@Query('status') status?: string) {}

  // 新增技能（管理員限定）
  @Post()
  @UseGuards(JwtAuthGuard, AdminGuard)
  async create(@Body() dto: CreateSkillDto) {}

  // 更新技能配置（管理員限定）
  @Patch(':id')
  @UseGuards(JwtAuthGuard, AdminGuard)
  async update(@Param('id') id: string, @Body() dto: UpdateSkillDto) {}
}
```

---

### 5. Admin Module（管理員模組）

**職責**：
- 角色管理（搜尋、查看詳情、停用）
- 訓練記錄查詢
- 獎勵發放與兌換管理
- 訊息回覆

**API Endpoints**:

```typescript
@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  // 角色列表
  @Get('characters')
  async getCharacters(@Query() query: CharacterQueryDto) {}

  // 角色詳情
  @Get('characters/:id')
  async getCharacterDetail(@Param('id') id: string) {}

  // 手動發放獎勵
  @Post('rewards/manual')
  async manualReward(@Body() dto: ManualRewardDto) {}

  // 處理兌換申請
  @Patch('redemptions/:id')
  async processRedemption(@Param('id') id: string, @Body() dto: ProcessRedemptionDto) {}

  // 回覆訊息
  @Post('messages/:id/reply')
  async replyMessage(@Param('id') id: string, @Body() dto: ReplyMessageDto) {}
}
```

---

## 中介軟體與守衛

### JWT Authentication Guard

```typescript
// common/guards/jwt-auth.guard.ts

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  canActivate(context: ExecutionContext) {
    return super.canActivate(context);
  }

  handleRequest(err, user, info) {
    if (err || !user) {
      throw new UnauthorizedException('未授權');
    }
    return user;
  }
}
```

### Admin Guard

```typescript
// common/guards/admin.guard.ts

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly firebaseService: FirebaseService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 檢查 Firebase Custom Claims
    const firebaseUser = await this.firebaseService.getUser(user.sub);
    return firebaseUser.customClaims?.admin === true;
  }
}
```

### Rate Limiting Interceptor

```typescript
// common/interceptors/throttler.interceptor.ts

@Injectable()
export class ThrottlerInterceptor implements NestInterceptor {
  private readonly cache = new Map<string, number[]>();

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const key = `${request.ip}:${request.path}`;

    const now = Date.now();
    const requests = this.cache.get(key) || [];

    // 清除 1 分鐘前的請求記錄
    const recentRequests = requests.filter(time => now - time < 60000);

    if (recentRequests.length >= 10) {
      throw new TooManyRequestsException('請求過於頻繁，請稍後再試');
    }

    recentRequests.push(now);
    this.cache.set(key, recentRequests);

    return next.handle();
  }
}
```

---

## 統一回應格式

```typescript
// common/dto/api-response.dto.ts

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: string[];
}

// common/interceptors/transform.interceptor.ts

@Injectable()
export class TransformInterceptor<T> implements NestInterceptor<T, ApiResponse<T>> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<ApiResponse<T>> {
    return next.handle().pipe(
      map(data => ({
        success: true,
        data,
      })),
    );
  }
}
```

---

## 錯誤處理

```typescript
// common/filters/http-exception.filter.ts

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const message = typeof exceptionResponse === 'string'
      ? exceptionResponse
      : (exceptionResponse as any).message;

    response.status(status).json({
      success: false,
      message: Array.isArray(message) ? message[0] : message,
      errors: Array.isArray(message) ? message : [message],
    });
  }
}
```

---

## 開發建議

### 1. 模組開發順序

```
Firebase Module (基礎)
    ↓
Auth Module (認證)
    ↓
Characters Module (角色管理)
    ↓
Game Engine Module (核心，最複雜)
    ↓
Skills Module (技能配置)
    ↓
Rewards Module (獎勵系統)
    ↓
Messages Module (訊息系統)
    ↓
Admin Module (管理員功能)
```

### 2. 單元測試

每個 Service 都必須有對應的單元測試：

```typescript
// game-engine.service.spec.ts

describe('GameEngineService', () => {
  let service: GameEngineService;
  let firebaseService: MockFirebaseService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GameEngineService,
        { provide: FirebaseService, useClass: MockFirebaseService },
        ExpCalculatorService,
        RewardCalculatorService,
        LevelService,
        AntiCheatValidator,
      ],
    }).compile();

    service = module.get<GameEngineService>(GameEngineService);
  });

  it('should calculate exp correctly', async () => {
    const result = await service.completeGame({...});
    expect(result.result.expGained).toBe(83);
  });
});
```

### 3. API 文件（Swagger）

```typescript
// main.ts

const config = new DocumentBuilder()
  .setTitle('Skill Village API')
  .setVersion('1.0')
  .addBearerAuth()
  .build();

const document = SwaggerModule.createDocument(app, config);
SwaggerModule.setup('api/docs', app, document);
```

---

## 效能優化建議

### 1. Firestore 批次操作

```typescript
// 更新角色資料時使用 batch
const batch = this.firebaseService.batch();

batch.update(characterRef, {...});
batch.set(sessionRef, {...});
batch.set(rewardRef, {...});

await batch.commit(); // 一次寫入
```

### 2. 快取等級經驗值表

```typescript
// level.service.ts

@Injectable()
export class LevelService {
  private levelExpTable: Map<number, number> = new Map();

  constructor() {
    this.buildLevelExpTable();
  }

  private buildLevelExpTable() {
    let cumulativeExp = 0;
    for (let level = 1; level <= 1000; level++) {
      let expForNextLevel = this.calculateExpForLevel(level);
      cumulativeExp += expForNextLevel;
      this.levelExpTable.set(level, cumulativeExp);
    }
  }

  getExpForLevel(level: number): number {
    return this.levelExpTable.get(level) || 0;
  }
}
```

---

## 總結

✅ **NestJS 模組架構清晰，職責分明**
✅ **規則引擎設計優秀，擴展性強**
✅ **防作弊機制完善**
✅ **統一回應格式，前端易於處理**

⚠️ **需注意事項**：
- 確保 Rate Limiting 正確實作
- Firestore 批次操作需謹慎（最多 500 個文件）
- 等級經驗值表需快取，避免重複計算
- 所有 Service 必須撰寫單元測試
