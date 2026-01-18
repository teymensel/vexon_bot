@echo off
cd apps/bot
:loop
echo [Bot 4] Baslatiliyor...
call npm run dev -- --bot=4
echo [Bot 4] Kapandi. 3 saniye icinde yeniden baslatiliyor...
timeout /t 3 >nul
goto loop
