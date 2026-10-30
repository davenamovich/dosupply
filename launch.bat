@echo off
setlocal
cd /d "%~dp0"

set "APP_PORT=3500"
set "APP_URL=http://localhost:%APP_PORT%"

echo ==========================================
echo   Local launcher - Next.js on port %APP_PORT%
echo ==========================================
echo.

where bun >nul 2>&1
if errorlevel 1 (
    echo [ERROR] bun is not installed or not on PATH.
    echo         Install it from https://bun.sh and run this file again.
    exit /b 1
)

netstat -ano | findstr /r /c:":%APP_PORT% .*LISTENING" >nul
if not errorlevel 1 (
    echo [ERROR] Port %APP_PORT% is already in use.
    echo         Stop the process listening on it and try again.
    exit /b 1
)

if not exist "node_modules" (
    echo [1/3] Installing dependencies...
    call bun install
    if errorlevel 1 exit /b 1
) else (
    echo [1/3] Dependencies already installed.
)

echo [2/3] Preparing Prisma client and database...
call bunx prisma generate
if errorlevel 1 echo [WARN] prisma generate failed, continuing.

if exist "db\custom.db" (
    echo       Database found - skipping schema push to keep existing data.
) else (
    call bun run db:push
    if errorlevel 1 echo [WARN] Database init failed, continuing. Check DATABASE_URL in .env.
)

echo [3/3] Starting Next.js on %APP_URL% ...
echo.
echo Press Ctrl+C to stop the server.
echo.
call bunx next dev -p %APP_PORT%

endlocal
