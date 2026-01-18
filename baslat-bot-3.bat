@echo off
cd apps/bot
:loop
echo [Bot 3] Baslatiliyor...
call npm run dev -- --bot=3
echo [Bot 3] Kapandi. 3 saniye icinde yeniden baslatiliyor...
timeout /t 3 >nul
goto loop
