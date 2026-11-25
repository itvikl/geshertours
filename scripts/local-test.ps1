# Local visual test: Firebase emulators + Gesher tours + a test admin + the dev server.
# Needs Java once:  winget install EclipseAdoptium.Temurin.21.JRE   (then open a new terminal)
# Run from the repo root:  powershell -ExecutionPolicy Bypass -File scripts\local-test.ps1
# Uses .env.local, which must point at the emulators (demo-gesher), never the real project.

$ErrorActionPreference = "Stop"
Set-Location (Split-Path $PSScriptRoot -Parent)

if (-not (Get-Command java -ErrorAction SilentlyContinue)) {
  Write-Host "Java is missing. Run: winget install EclipseAdoptium.Temurin.21.JRE  - then open a new terminal." -ForegroundColor Red
  exit 1
}
if (-not (Select-String -Path .env.local -Pattern "FIRESTORE_EMULATOR_HOST" -Quiet)) {
  Write-Host ".env.local does not point at the emulators - stopping so nothing touches the real project." -ForegroundColor Red
  exit 1
}

# 1. Emulators in their own window (close that window to stop them; data is not kept).
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npx firebase-tools emulators:start --only firestore,auth --project demo-gesher"
Write-Host "Waiting for the emulators..."
do { Start-Sleep -Seconds 2 } until ((Test-NetConnection 127.0.0.1 -Port 8080 -WarningAction SilentlyContinue).TcpTestSucceeded -and (Test-NetConnection 127.0.0.1 -Port 9099 -WarningAction SilentlyContinue).TcpTestSucceeded)

# 2. Data: the 56 Gesher tours (old site's photos; the 10 with dates published) and a test admin.
npx tsx scripts/migrate/import-gesher-tours.ts --commit --keep-image-urls --publish-drafts
npx tsx scripts/create-local-admin.ts

Write-Host ""
Write-Host "Site:  http://localhost:3000" -ForegroundColor Green
Write-Host "Admin: http://localhost:3000/admin  -  admin@local.test / local-admin-123" -ForegroundColor Green
Write-Host ""

# 3. Dev server (Ctrl+C to stop).
npm run dev
