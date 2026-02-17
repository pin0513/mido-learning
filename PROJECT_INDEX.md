# 📑 Mido Learning - Project Index

> **Purpose**: Quick reference for AI agents to locate project documentation and code

## 🎯 Start Here

| Document | Purpose | Path |
|----------|---------|------|
| **CLAUDE.md** | AI guidance & project overview | `./CLAUDE.md` |
| **README.md** | User-facing introduction | `./README.md` |
| **This File** | Documentation index | `./PROJECT_INDEX.md` |

---

## 📚 Documentation

### Architecture (docs/arch/)

| Document | What It Covers | When to Read |
|----------|----------------|--------------|
| **architecture-overview.md** | System-wide architecture | Understanding overall design |
| **backend-architecture.md** | .NET API structure, patterns | Working on backend |
| **frontend-architecture.md** | Next.js structure, routing | Working on frontend |
| **database-design.md** | Firestore schema, indexes | Database queries/modeling |
| **infrastructure.md** | Cloud Run deployment | Deployment issues |
| **security-considerations.md** | Auth, access control | Security features |

### Specifications (docs/specs/)

| Date | Feature | Path |
|------|---------|------|
| 2026-01-31 | Wish Chatbot (Frontend) | `docs/specs/20260131-01-wish-chatbot-frontend.md` |
| 2026-01-31 | Wish API | `docs/specs/20260131-02-wish-api.md` |
| 2026-01-31 | Admin Users | `docs/specs/20260131-03-admin-users.md` |
| 2026-01-31 | Component CRUD | `docs/specs/20260131-04-learning-component-crud.md` |
| 2026-02-01 | Material Viewer RWD | `docs/specs/20260201-01-material-viewer-rwd.md` |
| 2026-02-11 | **Skill Village** | `docs/specs/20260211-01-skill-village.md` |

### QA Reports (docs/qa-reports/)

| Date | Topic | Path |
|------|-------|------|
| 2026-02-01 | Material Viewer RWD (FINAL) | `docs/qa-reports/20260201-material-viewer-rwd-FINAL.md` |

### Other Docs

| Category | Document | Path |
|----------|----------|------|
| Current | Product Manual | `docs/current/product-manual.md` |
| Tech Debt | Known Issues & TODOs | `docs/TECH_DEBT.md` |
| Worklog | 2026-01-31 | `docs/worklogs/2026-01-31.md` |

---

## 📋 Specifications (spec/)

| Document | Purpose |
|----------|---------|
| **20260214-requirement.md** | Latest requirements |
| **FunctionalMap.md** | Feature mapping |
| **seeds/** | Seed data definitions |

---

## 💻 Code Structure

### Frontend (frontend/)

#### Core Files

| File | Purpose |
|------|---------|
| **README.md** | Frontend-specific documentation |
| **SKILL_VILLAGE_README.md** | Skill Village implementation guide |
| **SKILL_VILLAGE_PROGRESS.md** | Development progress tracking |
| **package.json** | Dependencies & scripts |
| **next.config.js** | Next.js configuration |
| **tailwind.config.ts** | Tailwind CSS configuration |

#### Key Directories

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| **app/** | Next.js App Router | Route groups, pages, layouts |
| **components/** | React components | UI, layout, feature components |
| **lib/** | Utilities & clients | `firebase.ts`, `api/*` |
| **hooks/** | React hooks | Custom hooks, game hooks |
| **stores/** | State management | Zustand stores |
| **types/** | TypeScript types | Type definitions |
| **e2e/** | E2E tests | Playwright tests |
| **public/** | Static assets | Images, icons |

#### Route Groups (app/)

| Route Group | Access Level | Purpose |
|-------------|--------------|---------|
| **(public)** | Anonymous | Home, about, browse materials |
| **(auth)** | Anonymous (redirect if logged in) | Login, register |
| **(member)** | Authenticated | Dashboard, profile, components |
| **(teacher)** | Teacher/Admin | Component management, upload |
| **(admin)** | Admin | User management, role assignment |
| **(game-admin)** | Admin | Skill village admin |
| **(fullscreen)** | Dynamic | Material viewer (iframe) |

#### Component Categories

| Directory | Components |
|-----------|------------|
| **admin/** | User management, role forms |
| **auth/** | Login, register, auth buttons |
| **game/** | Skill village game UI |
| **layout/** | Header, footer, sidebar |
| **learning/** | Component cards, lists |
| **materials/** | Upload, viewer, file picker |
| **skill-village/** | Village map, skill tree |
| **ui/** | Primitives (shadcn/ui) |
| **wish/** | Chatbot UI |

### Backend (backend/MidoLearning.Api/)

#### Core Files

| File | Purpose |
|------|---------|
| **Program.cs** | App entry, middleware setup, endpoint mapping |
| **appsettings.json** | Configuration (production) |
| **appsettings.Development.json** | Configuration (development) |
| **MidoLearning.Api.csproj** | Project file, dependencies |
| **SKILL_VILLAGE_IMPLEMENTATION_STATUS.md** | Skill Village backend status |

#### Directories

| Directory | Purpose | Key Files |
|-----------|---------|-----------|
| **Endpoints/** | Minimal API endpoints | `*Endpoints.cs` files |
| **Middleware/** | Custom middleware | `FirebaseAuthMiddleware.cs` |
| **Services/** | Business logic | `FirebaseService.cs`, `StorageService.cs` |
| **Models/** | DTOs & domain models | Request/response shapes |
| **Modules/** | Feature modules | `SkillVillage/` module |

#### API Endpoints

| Endpoint File | Routes | Purpose |
|---------------|--------|---------|
| **AuthEndpoints.cs** | `/api/auth/*` | Register, login, verify token |
| **UserEndpoints.cs** | `/api/users/*` | User profile, preferences |
| **AdminEndpoints.cs** | `/api/admin/*` | User management (admin only) |
| **ComponentEndpoints.cs** | `/api/components/*` | CRUD for learning components |
| **MaterialEndpoints.cs** | `/api/materials/*` | Upload, download, content proxy |
| **WishEndpoints.cs** | `/api/wishes/*` | Chatbot wishes |
| **CategoryEndpoints.cs** | `/api/categories/*` | Category management |
| **RatingEndpoints.cs** | `/api/ratings/*` | Component ratings |
| **GameEndpoints.cs** | `/api/game/*` | Skill village API |

### Backend Tests (backend/MidoLearning.Api.Tests/)

| Directory | Purpose |
|-----------|---------|
| **Tests/** | Unit & integration tests |
| **Endpoints/** | Endpoint test helpers |
| **Helpers/** | Test utilities |

---

## 🔍 Quick Lookup

### By Feature

| Feature | Frontend | Backend | Docs |
|---------|----------|---------|------|
| **Auth** | `components/auth/`, `app/(auth)/` | `Endpoints/AuthEndpoints.cs` | `docs/arch/security-considerations.md` |
| **Components** | `components/learning/`, `app/(member)/components/` | `Endpoints/ComponentEndpoints.cs` | `docs/specs/20260131-04-learning-component-crud.md` |
| **Materials** | `components/materials/`, `app/(fullscreen)/` | `Endpoints/MaterialEndpoints.cs` | `docs/specs/20260201-01-material-viewer-rwd.md` |
| **Wishes** | `components/wish/` | `Endpoints/WishEndpoints.cs` | `docs/specs/20260131-01-wish-chatbot-frontend.md` |
| **Admin** | `components/admin/`, `app/(admin)/` | `Endpoints/AdminEndpoints.cs` | `docs/specs/20260131-03-admin-users.md` |
| **Skill Village** | `components/skill-village/`, `app/(game-admin)/` | `Endpoints/GameEndpoints.cs`, `Modules/SkillVillage/` | `docs/specs/20260211-01-skill-village.md` |

### By File Type

#### Configuration

| File | Location | Purpose |
|------|----------|---------|
| `.env.local` | `frontend/.env.local` | Frontend environment variables |
| `appsettings.Development.json` | `backend/MidoLearning.Api/` | Backend dev config |
| `firebase.json` | Root | Firebase hosting config |
| `firestore.indexes.json` | Root | Firestore indexes |
| `firestore.rules` | Root | Firestore security rules |
| `storage.rules` | Root | Firebase Storage rules |

#### CI/CD

| File | Location | Purpose |
|------|----------|---------|
| `.github/workflows/deploy-frontend.yml` | `.github/workflows/` | Frontend deployment |
| `.github/workflows/deploy-backend.yml` | `.github/workflows/` | Backend deployment |

#### Tests

| File | Location | Purpose |
|------|----------|---------|
| `e2e/materials.spec.ts` | `frontend/e2e/` | Material upload E2E tests |
| `playwright.config.ts` | `frontend/` | Playwright configuration |

---

## 🎮 Skill Village Module

### Frontend

| Path | Purpose |
|------|---------|
| `frontend/SKILL_VILLAGE_README.md` | Implementation guide |
| `frontend/SKILL_VILLAGE_PROGRESS.md` | Progress tracking |
| `frontend/components/skill-village/` | React components |
| `frontend/types/skill-village/` | TypeScript types |
| `frontend/utils/skill-village/` | Utility functions |
| `frontend/hooks/game/` | Game-specific hooks |
| `frontend/stores/` | Zustand state stores |

### Backend

| Path | Purpose |
|------|---------|
| `backend/MidoLearning.Api/Endpoints/GameEndpoints.cs` | API endpoints |
| `backend/MidoLearning.Api/Modules/SkillVillage/` | Domain module |
| `backend/MidoLearning.Api/Models/SkillVillage/` | DTOs & models |
| `backend/MidoLearning.Api/SKILL_VILLAGE_IMPLEMENTATION_STATUS.md` | Backend status |

### Documentation

| Path | Purpose |
|------|---------|
| `docs/specs/20260211-01-skill-village.md` | Feature specification |

---

## 🛠️ Development Workflows

### Local Development

| Task | Command | Location |
|------|---------|----------|
| Start frontend | `npm run dev` | `frontend/` |
| Start backend | `dotnet run` | `backend/MidoLearning.Api/` |
| Run E2E tests | `npx playwright test` | `frontend/` |
| Run backend tests | `dotnet test` | `backend/` |

### Debugging

| Issue | Check | Path |
|-------|-------|------|
| Frontend errors | Browser console + Network tab | - |
| Backend errors | Terminal output + logs | - |
| Auth issues | Firebase token in headers | Network tab |
| Material viewer | iframe console | Browser DevTools |
| API errors | Response wrapper format | `Models/` |

---

## 📞 Common Tasks

### I Want to...

| Task | Where to Look |
|------|---------------|
| **Understand the system** | `CLAUDE.md` → `docs/arch/architecture-overview.md` |
| **Add a new feature** | Find related spec in `docs/specs/` |
| **Fix a bug** | Check `docs/TECH_DEBT.md`, then relevant code |
| **Add an API endpoint** | `backend/MidoLearning.Api/Endpoints/` |
| **Add a page** | `frontend/app/` (choose route group) |
| **Add a component** | `frontend/components/` (choose category) |
| **Modify database** | `docs/arch/database-design.md` + Firestore console |
| **Deploy** | `.github/workflows/` + `gh workflow run` |
| **Run tests** | `frontend/e2e/` (E2E) + `backend/*.Tests/` (unit) |
| **Check Skill Village status** | `frontend/SKILL_VILLAGE_PROGRESS.md` + backend status doc |

---

**Last Updated**: 2026-02-17
**Generated by**: Claude Code

---

## 📝 Notes

- **Always check CLAUDE.md first** for AI-specific guidance
- **Follow route group conventions** for access control
- **Use API wrapper format** for all responses
- **Run E2E tests** before pushing code
- **Update docs** when changing architecture
