@echo off
cd apps/bot
:loop
echo [Bot 1] Baslatiliyor...
call npm run dev -- --bot=1
echo [Bot 1] Kapandi. 3 saniye icinde yeniden baslatiliyor...
timeout /t 3 >nul
goto loop
