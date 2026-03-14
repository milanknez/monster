@echo off
setlocal

echo [1/4] Budovani webove aplikace (dist)...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [CHYBA] Webovy build selhal.
    exit /b %ERRORLEVEL%
)

echo [2/4] Synchronizace s Android projektem...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo [CHYBA] Synchronizace s Android projektem selhala.
    exit /b %ERRORLEVEL%
)

echo [3/4] Sestavovani APK (debug)...
cd android
call gradlew.bat assembleDebug
if %ERRORLEVEL% neq 0 (
    echo [CHYBA] Gradle build selhal.
    cd ..
    exit /b %ERRORLEVEL%
)
cd ..

echo [4/4] Hotovo!
echo.
echo APK najdete zde:
echo android\app\build\outputs\apk\debug\app-debug.apk
echo.
pause
