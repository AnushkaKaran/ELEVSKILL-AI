# ELEVSKILL AI — Node.js + Express.js Backend

REST API backend for **ELEVSKILL AI**, connecting the React + Vite frontend (`D:\ELEVSKILLS\ElevSkill_Frontend`) to Microsoft SQL Server (`ELEVSKILL_AI_DB`) and orchestrating the four Python FastAPI AI services.

## Tech Stack
- **Runtime**: Node.js (ES Modules, JavaScript ES6+)
- **Framework**: Express.js
- **Database**: Microsoft SQL Server (`mssql` + `mssql/msnodesqlv8` for Windows Authentication)
- **Auth**: JWT (`jsonwebtoken`) + `bcrypt`
- **File Uploads**: `multer` (PDF-only, 10 MB limit, stored outside public directories)

## Setup & Startup

1. Configure `.env` (copy from `.env.example`):
   ```powershell
   Copy-Item .env.example .env
   ```
2. Run SQL Server migrations:
   ```powershell
   npm.cmd run migrate
   ```
3. Start the backend:
   ```powershell
   npm.cmd run dev   # development (nodemon)
   npm.cmd start     # production
   ```
4. Run integration tests:
   ```powershell
   npm.cmd test
   ```
