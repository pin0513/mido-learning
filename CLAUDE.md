# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Mido Learning is an online learning platform built with:
- **Frontend**: Next.js 14 (App Router) + Tailwind CSS + Firebase Client SDK
- **Backend**: .NET 8 Minimal API + Firebase Admin SDK
- **Database**: Firebase Firestore
- **Auth**: Firebase Authentication (Email/Password + Google OAuth)
- **Deployment**: Google Cloud Run via GitHub Actions

## Commands

### Frontend (Next.js)
```bash
cd frontend
npm install          # Install dependencies
npm run dev          # Start dev server (http://localhost:3000)
npm run build        # Production build
npm run lint         # Run ESLint
```

### Backend (.NET)
```bash
cd backend/MidoLearning.Api
dotnet restore       # Restore packages
dotnet build         # Build project
dotnet run           # Start API (http://localhost:5000)
dotnet run --urls "http://localhost:5000"  # Explicit port
```

### Deployment
```bash
gh workflow run "Deploy Frontend"   # Trigger frontend deployment
gh workflow run "Deploy Backend"    # Trigger backend deployment
gh run list --limit 4               # Check deployment status
```

## Architecture

### Frontend Route Groups
The frontend uses Next.js App Router with route groups for access control:
- `app/(public)/*` - Public pages (home, about, materials) - no auth required
- `app/(auth)/*` - Auth pages (login, register) - redirect if logged in
- `app/(member)/*` - Member pages (dashboard, profile, components) - requires authentication
- `app/(teacher)/*` - Teacher pages (component management, upload) - requires teacher/admin role
- `app/(admin)/*` - Admin pages - requires admin role via Firebase custom claims

### Backend Structure
```
backend/MidoLearning.Api/
├── Program.cs           # App entry, middleware setup, endpoint mapping
├── Endpoints/           # Minimal API endpoint definitions
│   ├── AuthEndpoints.cs       # /api/auth/*
│   ├── UserEndpoints.cs       # /api/users/*
│   ├── AdminEndpoints.cs      # /api/admin/* (requires "AdminOnly" policy)
│   ├── ComponentEndpoints.cs  # /api/components/* (CRUD for learning components)
│   ├── MaterialEndpoints.cs   # /api/materials/* (upload, download, manifest)
│   ├── WishEndpoints.cs       # /api/wishes/* (ChatBot wishes)
│   ├── CategoryEndpoints.cs   # /api/categories/*
│   └── RatingEndpoints.cs     # /api/ratings/*
├── Middleware/
│   └── FirebaseAuthMiddleware.cs  # Validates Firebase ID tokens, sets ClaimsPrincipal
├── Services/
│   ├── FirebaseService.cs     # Firebase Admin SDK wrapper
│   └── StorageService.cs      # Firebase Storage operations
└── Models/
    ├── LearningComponent.cs   # Component DTOs
    ├── CourseMaterial.cs      # Material DTOs
    └── Wish.cs                # Wish DTOs
```

### Authentication Flow
1. Frontend: User signs in via Firebase Auth → receives ID token
2. Frontend: Sends ID token in `Authorization: Bearer <token>` header
3. Backend: `FirebaseAuthMiddleware` validates token, extracts claims (uid, email, admin role)
4. Backend: Endpoints use `[Authorize]` or `RequireAuthorization("AdminOnly")` for access control

### Firebase Integration
- **Frontend** (`lib/firebase.ts`): Lazy-initialized Firebase client SDK, only runs in browser
- **Backend**: Uses `GoogleCredential.FromFile()` with path from `appsettings.Development.json`
- **Local dev**: Requires `credentials/firebase-admin-key.json` (not committed to git)

## Environment Setup

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

## Cloud Run URLs
- Frontend: https://mido-learning-frontend-24mwb46hra-de.a.run.app
- Backend: https://mido-learning-api-24mwb46hra-de.a.run.app

## Development Guidelines

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
2. Backend validates ZIP (must contain `index.html`)
3. ZIP is extracted to Firebase Storage: `materials/{componentId}/v{version}/`
4. Material manifest is stored in Firestore
5. Frontend displays material via iframe using signed URLs

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
