@echo off
set PYTHONUTF8=1
echo Starting setup...

REM 1. 現在のディレクトリをベースとして、appfilesディレクトリを作成
set BASE_DIR=%~dp0
set APP_DIR=%BASE_DIR%appfiles
echo Setting up in: %APP_DIR%

if not exist "%APP_DIR%" mkdir "%APP_DIR%"
cd /d "%APP_DIR%"

REM 2. Rootport-AIのLaMaフォークをGitHubからクローン
echo Cloning Rootport-AI LaMa repository (GPU-enhanced fork)...
git clone https://github.com/Rootport-AI/lama.git
if errorlevel 1 (
    echo Failed to clone repository.
    pause
    exit /b 1
)

REM 3. クローンしたlamaディレクトリに移動し、Flaskアプリ用のディレクトリを作成
cd lama
echo Creating directories for Flask app...
if not exist "templates" mkdir templates
if not exist "static\js" mkdir static\js
if not exist "static\css" mkdir static\css
if not exist "static\images" mkdir static\images

REM 4. カスタムファイルをコピー
echo Copying custom files...
copy /Y "%BASE_DIR%app.py" .
copy /Y "%BASE_DIR%index.html" "templates\index.html"
copy /Y "%BASE_DIR%main.js" "static\js\main.js"
copy /Y "%BASE_DIR%style.css" "static\css\style.css"
copy /Y "%BASE_DIR%nouislider.min.css" "static\css\nouislider.min.css"
copy /Y "%BASE_DIR%nouislider.min.js" "static\js\nouislider.min.js"
copy /Y "%BASE_DIR%images\defimg.png" "static\images\defimg.png"
copy /Y "%BASE_DIR%images\favicon16.png" "static\images\favicon16.png"
copy /Y "%BASE_DIR%images\favicon32.png" "static\images\favicon32.png"
copy /Y "%BASE_DIR%images\favicon64.png" "static\images\favicon64.png"
copy /Y "%BASE_DIR%images\favicon_original.jpg" "static\images\favicon_original.jpg"

REM 5. Python仮想環境を作成
echo Creating virtual environment...
python -m venv venv
if errorlevel 1 (
    echo Failed to create virtual environment.
    pause
    exit /b 1
)

REM 6. 仮想環境をアクティベート
echo Activating virtual environment...
call venv\Scripts\activate

REM 7. pipを特定のバージョンに固定（23.0.1）
echo Installing pip 23.0.1...
python -m pip install pip==23.0.1
if errorlevel 1 (
    echo Failed to install pip 23.0.1.
    pause
    exit /b 1
)

REM 8. require.txtから依存関係をインストール
echo Installing requirements from require.txt...
pip install -r "%BASE_DIR%require.txt"
if errorlevel 1 (
    echo Failed to install requirements.
    pause
    exit /b 1
)

REM 9. big-lamaモデルをHugging Faceから自動ダウンロード
echo Downloading big-lama model from Hugging Face...
curl -L -o big-lama.zip https://huggingface.co/smartywu/big-lama/resolve/main/big-lama.zip
if errorlevel 1 (
    echo Failed to download big-lama model. Check your internet connection.
    pause
    exit /b 1
)

REM 10. ダウンロードしたzipを解凍して正しい場所に配置
echo Extracting big-lama model...
mkdir temp
powershell -Command "Expand-Archive -Path big-lama.zip -DestinationPath temp -Force"
if errorlevel 1 (
    echo Failed to extract big-lama model.
    pause
    exit /b 1
)

if exist big-lama rmdir /s /q big-lama
move temp\big-lama big-lama
if errorlevel 1 (
    echo Failed to move model files.
    pause
    exit /b 1
)

rmdir /s /q temp
del big-lama.zip

REM 11. PYTHONPATHを設定
echo Setting PYTHONPATH for saicinpainting...
set PYTHONPATH=%APP_DIR%\lama;%PYTHONPATH%

REM 12. セットアップ完了を通知
echo Setup completed successfully.
echo Application installed in: %APP_DIR%
pause