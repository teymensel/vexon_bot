@echo off
echo Tum Botlar Baslatiliyor (Oto-Restart Modu)...

start "Vexon Bot 1" /min baslat-bot-1.bat
timeout /t 2 >nul

start "Vexon Bot 2" /min baslat-bot-2.bat
timeout /t 2 >nul

start "Vexon Bot 3" /min baslat-bot-3.bat
timeout /t 2 >nul

start "Vexon Bot 4" /min baslat-bot-4.bat

echo.
echo 4 Bot da ayri pencerelerde ve DONGU modunda baslatildi.
echo !!restart komutu artik calisacaktir.
pause
