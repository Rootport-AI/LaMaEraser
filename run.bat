@echo off

REM --- ベースディレクトリとアプリケーションディレクトリを設定 ---
set BASE_DIR=%~dp0
set APP_DIR=%BASE_DIR%appfiles\lama

REM --- アプリケーションディレクトリが存在するか確認 ---
if not exist "%APP_DIR%" (
    echo エラー: アプリケーションが見つかりません。%APP_DIR% が存在しません。
    echo セットアップを先に実行してください。
    pause
    exit /b 1
)

REM --- 作業ディレクトリをアプリケーションディレクトリに移動 ---
cd /d "%APP_DIR%"

REM --- 仮想環境を有効化 ---
echo 仮想環境を有効化しています...
call venv\Scripts\activate
if errorlevel 1 (
    echo エラー: 仮想環境の有効化に失敗しました。
    pause
    exit /b 1
)

REM --- 環境変数を設定 ---
set TORCH_HOME=%CD%
set PYTHONPATH=%CD%

REM --- アプリケーションを起動 ---
echo LaMa AI消しツールを起動しています...
echo 起動が完了したら、ブラウザで http://localhost:7859 を開いてください。
python app.py
if errorlevel 1 (
    echo エラー: アプリケーションの起動に失敗しました。
    pause
    exit /b 1
)

pause