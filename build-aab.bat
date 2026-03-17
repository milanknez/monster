@echo off
setlocal enabledelayedexpansion

:: Nastaveni kódování pro češtinu
chcp 65001 >nul

set "GRADLE_FILE=android\app\build.gradle"

echo ===================================================
echo   Priprava sestaveni pro Google Play (.aab)
echo ===================================================
echo.

if not exist "%GRADLE_FILE%" (
    echo [CHYBA] Soubor %GRADLE_FILE% nebyl nalezen.
    echo Spoustite tento skript v korenu projektu monster?
    pause
    exit /b 1
)

:: Extrakce verzi do docasnych souboru (nejstabilnejsi metoda pro CMD)
powershell -Command "$c = Get-Content '%GRADLE_FILE%' -Raw; if ($c -match 'versionCode\s+(\d+)') { $matches[1] | Out-File -FilePath 'vcode.tmp' -Encoding ascii }"
powershell -Command "$c = Get-Content '%GRADLE_FILE%' -Raw; if ($c -match 'versionName\s+\"(.+)\"') { $matches[1] | Out-File -FilePath 'vname.tmp' -Encoding ascii }"

if exist vcode.tmp (set /p OLD_CODE=<vcode.tmp) else (set OLD_CODE=1)
if exist vname.tmp (set /p OLD_NAME=<vname.tmp) else (set OLD_NAME=1.0)
del vcode.tmp vname.tmp 2>nul

echo Aktualni nastaveni v build.gradle:
echo   Version Code: %OLD_CODE%
echo   Version Name: %OLD_NAME%
echo.

set /p "NEW_CODE=Zadejte NOVE versionCode (musi byt vyssi nez %OLD_CODE%, Enter pro %OLD_CODE%): "
set /p "NEW_NAME=Zadejte NOVE versionName (napr. 1.2, Enter pro %OLD_NAME%): "

if "!NEW_CODE!"=="" set "NEW_CODE=%OLD_CODE%"
if "!NEW_NAME!"=="" set "NEW_NAME=%OLD_NAME%"

echo.
echo Aktualizuji soubor %GRADLE_FILE% na verzi !NEW_NAME! (!NEW_CODE!)...

:: Samotna aktualizace v souboru
powershell -Command "$c = Get-Content '%GRADLE_FILE%'; $c = $c -replace 'versionCode\s+\d+', 'versionCode %NEW_CODE%'; $c = $c -replace 'versionName\s+\".*\"', 'versionName \"%NEW_NAME%\"'; $c | Set-Content '%GRADLE_FILE%'"

echo.
echo [1/4] Budovani webove aplikace (dist)...
call npm run build
if %ERRORLEVEL% neq 0 goto :error

echo.
echo [2/4] Synchronizace s Android projektem...
call npx cap sync android
if %ERRORLEVEL% neq 0 goto :error

echo.
echo [3/4] Sestavovani AAB (release + signed)...
cd android
call gradlew.bat bundleRelease
if %ERRORLEVEL% neq 0 (
    cd ..
    goto :error
)
cd ..

echo.
echo [4/4] Hotovo!
echo ===================================================
echo Vasi AAB pro Google Play najdete zde:
echo android\app\build\outputs\bundle\release\app-release.aab
echo ===================================================
echo.
pause
exit /b 0

:error
echo.
echo [CHYBA] Proces selhal. Zkontrolujte vypis vyse.
echo.
pause
exit /b 1
