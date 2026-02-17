# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 📚 Quick Navigation

### 🎯 Essential Documents
- **This File**: Project overview and AI guidance
- **[README.md](./README.md)**: User-facing project introduction
- **[Product Manual](./docs/current/product-manual.md)**: User documentation
- **[Tech Debt](./docs/TECH_DEBT.md)**: Known issues and TODOs

### 📖 Documentation Index
```
docs/
├── arch/                    # Architecture documentation
│   ├── architecture-overview.md       # System architecture overview
│   ├── backend-architecture.md        # Backend design & patterns
│   ├── frontend-architecture.md       # Frontend design & patterns
│   ├── database-design.md             # Firestore schema & indexes
│   ├── infrastructure.md              # Cloud Run deployment
│   └── security-considerations.md     # Security & auth design
├── specs/                   # Feature specifications
│   ├── 20260131-01-wish-chatbot-frontend.md
│   ├── 20260131-02-wish-api.md
│   ├── 20260131-03-admin-users.md
│   ├── 20260131-04-learning-component-crud.md
│   ├── 20260201-01-material-viewer-rwd.md
│   └── 20260211-01-skill-village.md
├── qa-reports/              # QA test reports
│   └── 20260201-material-viewer-rwd-FINAL.md
├── worklogs/                # Development logs
│   └── 2026-01-31.md
└── current/                 # Current version docs
    └── product-manual.md
```

### 📋 Specification Files
```
spec/
├── 20260214-requirement.md  # Latest requirements
├── FunctionalMap.md         # Feature mapping
└── seeds/                   # Seed data definitions
```

### 💻 Code Structure

#### Frontend (Next.js 14 App Router)
```
frontend/
├── app/                     # Next.js App Router
│   ├── (public)/           # Public pages (no auth)
│   ├── (auth)/             # Login/Register (redirect if logged in)
│   ├── (member)/           # Member area (auth required)
│   ├── (teacher)/          # Teacher area (teacher role required)
│   ├── (admin)/            # Admin area (admin role required)
│   ├── (game-admin)/       # Game admin (admin role required)
│   └── (fullscreen)/       # Material viewer (iframe display)
├── components/              # React components
│   ├── admin/              # Admin-specific components
│   ├── auth/               # Auth forms & buttons
│   ├── game/               # Game-related components
│   ├── layout/             # Layout components (header, footer)
│   ├── learning/           # Learning component displays
│   ├── materials/          # Material upload/view components
│   ├── skill-village/      # Skill village game components
│   ├── ui/                 # UI primitives (shadcn/ui)
│   └── wish/               # Wish chatbot components
├── lib/                     # Utility libraries
│   ├── firebase.ts         # Firebase client SDK initialization
│   ├── api/                # API client functions
│   └── REQUEST_QUEUE_README.md  # Request queue documentation
├── hooks/                   # React hooks
│   └── game/               # Game-specific hooks
├── stores/                  # State management (Zustand)
├── types/                   # TypeScript type definitions
│   └── skill-village/      # Skill village types
├── utils/                   # Utility functions
│   └── skill-village/      # Skill village utilities
├── e2e/                     # Playwright E2E tests
├── public/                  # Static assets
│   └── images/             # Image assets
├── README.md               # Frontend-specific README
├── SKILL_VILLAGE_README.md # Skill village documentation
└── SKILL_VILLAGE_PROGRESS.md  # Skill village progress tracking
```

#### Backend (.NET 8 Minimal API)
```
backend/MidoLearning.Api/
├── Program.cs              # App entry, middleware, endpoints
├── Endpoints/              # Minimal API endpoint definitions
│   ├── AuthEndpoints.cs           # /api/auth/*
│   ├── UserEndpoints.cs           # /api/users/*
│   ├── AdminEndpoints.cs          # /api/admin/* (admin only)
│   ├── ComponentEndpoints.cs     # /api/components/* (CRUD)
│   ├── MaterialEndpoints.cs      # /api/materials/* (upload/download)
│   ├── WishEndpoints.cs          # /api/wishes/* (chatbot)
│   ├── CategoryEndpoints.cs      # /api/categories/*
│   ├── RatingEndpoints.cs        # /api/ratings/*
│   └── GameEndpoints.cs          # /api/game/* (skill village)
├── Middleware/
│   └── FirebaseAuthMiddleware.cs # Token validation
├── Services/
│   ├── FirebaseService.cs        # Firebase Admin SDK wrapper
│   └── StorageService.cs         # Firebase Storage operations
├── Models/                 # DTOs & domain models
│   ├── LearningComponent.cs
│   ├── CourseMaterial.cs
│   ├── Wish.cs
│   └── SkillVillage/      # Skill village domain models
├── Modules/                # Feature modules
│   └── SkillVillage/      # Skill village module
└── SKILL_VILLAGE_IMPLEMENTATION_STATUS.md
```

#### Backend Tests
```
backend/MidoLearning.Api.Tests/
├── Tests/                  # Unit & integration tests
├── Endpoints/              # Endpoint test helpers
└── Helpers/                # Test utilities
```

---

## 🚀 Project Overview

Mido Learning is an online learning platform built with:
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Firebase Client SDK
- **Backend**: .NET 8 Minimal API + Firebase Admin SDK
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication (Email/Password + Google OAuth)
- **Deployment**: Google Cloud Run via GitHub Actions

### Key Features
- **Learning Components**: Create, browse, rate components
- **Material Upload**: Upload ZIP files (HTML/CSS/JS) as learning materials
- **Material Viewer**: Secure iframe-based viewer with RWD support
- **Wish Chatbot**: AI-powered learning wish collection
- **Admin Dashboard**: User management, role assignment
- **Skill Village**: Gamified skill tree learning system (NEW)

---

## 📝 Commands

### Frontend (Next.js)
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
npx playwright test  # Run E2E tests
```

### Backend (.NET)
```bash
cd backend/MidoLearning.Api
dotnet restore       # Restore packages
dotnet build         # Build project
dotnet run           # Start API (http://localhost:5000)
dotnet test          # Run tests
```

### Deployment
```bash
gh workflow run "Deploy Frontend"   # Trigger frontend deployment
gh workflow run "Deploy Backend"    # Trigger backend deployment
gh run list --limit 4               # Check deployment status
```

---

## 🏗️ Architecture

### Frontend Route Groups
The frontend uses Next.js App Router with route groups for access control:
- `app/(public)/*` - Public pages (home, about, materials) - no auth required
- `app/(auth)/*` - Auth pages (login, register) - redirect if logged in
- `app/(member)/*` - Member pages (dashboard, profile, components) - requires authentication
- `app/(teacher)/*` - Teacher pages (component management, upload) - requires teacher/admin role
- `app/(admin)/*` - Admin pages - requires admin role via Firebase custom claims
- `app/(game-admin)/*` - Game admin pages - requires admin role
- `app/(fullscreen)/*` - Material viewer - public/auth based on component visibility

### Authentication Flow
1. Frontend: User signs in via Firebase Auth → receives ID token
2. Frontend: Sends ID token in `Authorization: Bearer <token>` header
3. Backend: `FirebaseAuthMiddleware` validates token, extracts claims (uid, email, admin role)
4. Backend: Endpoints use `[Authorize]` or `RequireAuthorization("AdminOnly")` for access control

### Firebase Integration
- **Frontend** (`lib/firebase.ts`): Lazy-initialized Firebase client SDK, only runs in browser
- **Backend**: Uses `GoogleCredential.FromFile()` with path from `appsettings.Development.json`
- **Local dev**: Requires `credentials/firebase-admin-key.json` (not committed to git)

### API Response Format
All API responses follow this wrapper format:
```json
{
  "success": true|false,
  "data": { ... },
  "message": "optional message",
  "errors": ["optional", "error", "list"]
}
```

Frontend must extract `apiResponse.data` when parsing responses.

---

## 🔧 Environment Setup

### Frontend (.env.local)
```
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=mido-learning
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_API_URL=http://localhost:5000
```

### Backend (appsettings.Development.json)
```json
{
  "Firebase": {
    "ProjectId": "mido-learning",
    "CredentialPath": "../../credentials/firebase-admin-key.json"
  }
}
```

---

## 🌐 Cloud Run URLs
- Frontend: https://mido-learning-frontend-24mwb46hra-de.a.run.app
- Backend: https://mido-learning-api-24mwb46hra-de.a.run.app

---

## 🎯 Development Guidelines

### Pre-Deployment E2E Testing (MANDATORY)

**Before any `git push`, you MUST run Playwright E2E tests to verify the material upload flow works correctly.**

Test Scenarios (all must pass):
1. **Upload Material**: Create component, upload ZIP file, verify upload success
2. **View Material**: Navigate to material detail page, verify iframe loads correctly
3. **Upload V2**: Upload a second version, verify version number increments
4. **Delete Material**: Delete a material version, verify deletion success

```bash
# Run E2E tests before push
cd frontend
npx playwright test e2e/materials.spec.ts

# If tests fail, fix the issue before pushing
```

### Material Upload Flow
1. Teacher creates component via `/teacher/components/upload`
2. Backend validates ZIP (must contain an HTML file at root level)
   - Prefers `index.html` as entry point
   - Falls back to first root HTML file (e.g., `presentation.html`)
   - Skips macOS `__MACOSX` metadata files
3. ZIP is extracted to Firebase Storage: `materials/{componentId}/v{version}/`
4. Material manifest (with detected entry point) is stored in Firestore
5. Frontend displays material via iframe using content proxy API

### Material Access Control
Materials are stored privately in Firebase Storage. Access is controlled via the content proxy API:
- **API Endpoint**: `/api/materials/{materialId}/content/{path}`
- **Access rules based on component visibility**:
  - `published`: Anonymous access allowed
  - `login`: Requires authenticated user
  - `private`: Owner or admin only

### Categories
- Categories are **dynamic** and can be created/managed via API
- API: `/api/categories` for listing, `/api/categories/{id}` for CRUD
- Frontend displays with color-coded styling from `CATEGORY_CONFIG`

---

## 🎮 Skill Village (Game Module)

### Overview
Skill Village is a gamified learning system that visualizes skills as a village map. Users progress through skill trees by completing learning components.

### Key Documents
- **[Frontend README](./frontend/SKILL_VILLAGE_README.md)**: Frontend architecture & implementation
- **[Progress Tracking](./frontend/SKILL_VILLAGE_PROGRESS.md)**: Development status
- **[Backend Status](./backend/MidoLearning.Api/SKILL_VILLAGE_IMPLEMENTATION_STATUS.md)**: Backend implementation status
- **[Specification](./docs/specs/20260211-01-skill-village.md)**: Feature specification

### Architecture
- **Frontend**: React components + Canvas rendering + Zustand state management
- **Backend**: Dedicated `GameEndpoints.cs` + `SkillVillage` module
- **Data**: Firestore collections for skills, user progress, achievements

---

## 🐛 Known Issues & Tech Debt

See [TECH_DEBT.md](./docs/TECH_DEBT.md) for:
- Known bugs
- Performance issues
- Refactoring candidates
- Future improvements

---

## 📌 Important Notes for AI

### When Reading Code
1. **Check route groups** to understand access control
2. **Frontend uses API wrappers** in `lib/api/` - don't call fetch directly
3. **Backend uses DTOs** - check `Models/` for request/response shapes
4. **Material paths** are relative to ZIP root, not storage root

### When Making Changes
1. **Run E2E tests** before committing
2. **Update documentation** if changing architecture
3. **Follow API response format** - always use wrapper
4. **Respect access control** - verify route groups and endpoint policies

### Common Pitfalls
- ❌ Forgetting to extract `apiResponse.data` in frontend
- ❌ Using absolute paths in material HTML (should be relative)
- ❌ Not validating ZIP structure before upload
- ❌ Bypassing Firebase auth middleware in backend

---

## 📞 Getting Help

### Quick Reference
- **Architecture docs**: `docs/arch/`
- **Feature specs**: `docs/specs/`
- **QA reports**: `docs/qa-reports/`
- **Frontend README**: `frontend/README.md`
- **Backend scripts**: `backend/scripts/`

### Debugging
- **Frontend errors**: Check browser console + Network tab
- **Backend errors**: Check terminal output + Firestore logs
- **Auth issues**: Verify Firebase token in Network tab headers
- **Material viewer**: Check iframe console for CORS/path errors

---

**Last Updated**: 2026-02-17
