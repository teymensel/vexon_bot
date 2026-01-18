@echo off
cd apps/bot
:loop
echo [Bot 2] Baslatiliyor...
call npm run dev -- --bot=2
echo [Bot 2] Kapandi. 3 saniye icinde yeniden baslatiliyor...
timeout /t 3 >nul
goto loop
