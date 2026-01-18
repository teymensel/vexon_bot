@echo off
echo Tum Botlar Baslatiliyor (Coklu Pencere Modu)...
echo Eger pencereler acilmazsa lutfen manuel olarak tek tek acmayi deneyin.

start "Vexon Bot 1" /min cmd /c "cd apps/bot && npm run dev -- --bot=1"
timeout /t 2 >nul

start "Vexon Bot 2" /min cmd /c "cd apps/bot && npm run dev -- --bot=2"
timeout /t 2 >nul

start "Vexon Bot 3" /min cmd /c "cd apps/bot && npm run dev -- --bot=3"
timeout /t 2 >nul

start "Vexon Bot 4" /min cmd /c "cd apps/bot && npm run dev -- --bot=4"

echo.
echo 4 Bot da ayri pencerelerde baslatildi.
echo Bu pencereyi kapatabilirsiniz.
pause
