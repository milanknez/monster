@echo off
setlocal EnableDelayedExpansion

set "BG_FILE=android\app\build.gradle"

echo ===================================================
echo   MONSTER APP BUILD (.aab)
echo ===================================================

:: 1. Build web part
echo.
echo [1/4] Building web application...
call npm run build
if %ERRORLEVEL% neq 0 (
    echo [ERROR] npm run build failed!
    pause
    exit /b 1
)

:: 2. Sync with Android
echo [2/4] Syncing Capacitor...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Capacitor sync failed!
    pause
    exit /b 1
)

:: 3. Update Version (Optional)
echo.
echo Current version in Gradle:
powershell -NoProfile -Command "Get-Content '%BG_FILE%' | Select-String 'versionCode|versionName'"
echo.
echo (Press ENTER to keep current value)
set /p NEW_CODE="Enter NEW versionCode (e.g. 48): "
set /p NEW_NAME="Enter NEW versionName (e.g. 1.1.0): "

if not "%NEW_CODE%"=="" (
    echo Updating versionCode to %NEW_CODE%...
    powershell -NoProfile -Command "(Get-Content '%BG_FILE%') -replace 'versionCode \d+', 'versionCode %NEW_CODE%' | Set-Content '%BG_FILE%'"
)

if not "%NEW_NAME%"=="" (
    echo Updating versionName to %NEW_NAME%...
    powershell -NoProfile -Command "(Get-Content '%BG_FILE%') -replace 'versionName \".*\"', 'versionName \"%NEW_NAME%\"' | Set-Content '%BG_FILE%'"
)

:: 4. Build AAB (Gradle)
echo.
echo [4/4] Building signed AAB (Gradle)...
if not exist "android\gradlew.bat" (
    echo [ERROR] android\gradlew.bat not found!
    pause
    exit /b 1
)

cd android
call gradlew.bat bundleRelease
set STATUS=%ERRORLEVEL%
cd ..

if %STATUS% neq 0 (
    echo [ERROR] Gradle build failed!
    pause
    exit /b 1
)

echo.
echo ===================================================
echo SUCCESS!
copy "android\app\build\outputs\bundle\release\app-release.aab" "latest-app.aab" /y
echo AAB location: android\app\build\outputs\bundle\release\app-release.aab
echo Root copy: latest-app.aab
echo ===================================================
pause
