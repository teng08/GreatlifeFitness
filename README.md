# GreatLife Booking System

Monorepo for the GreatLife booking platform:
- `frontend` (Next.js 16 + React 19)
- `backend` (Express API)

## Requirements
- Node.js `>=20.11.0 <25`
- npm `>=10`

## Quick Start
1. Install dependencies:
   ```bash
   npm run install:all
   ```
2. Create env files:
   - Frontend:
     ```bash
     cp frontend/env.example frontend/.env.local
     ```
   - Backend:
     ```bash
     cp backend/.env.example backend/.env
     ```
3. Start both apps:
   ```bash
   npm run dev
   ```

### Windows Notes
If you use Command Prompt/PowerShell, create env files with:

```powershell
copy frontend\env.example frontend\.env.local
copy backend\.env.example backend\.env
```

Then confirm backend is reachable by opening:
`http://localhost:5000/api/health`

## Local URLs
- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:5000`

## Notes For Sharing The Repo
- `node_modules` and `.env*` are intentionally not committed.
- Anyone cloning must run install and set env files before running.
- Root `dev` script is cross-platform (works on macOS, Linux, Windows).
