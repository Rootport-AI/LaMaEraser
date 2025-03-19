document.addEventListener('DOMContentLoaded', function() {
    const canvas = document.getElementById('canvas-layer');
    const ctx = canvas.getContext('2d');
    const layerContainer = document.getElementById('layer-container');
    const brushPreview = document.getElementById('brush-preview');
    const backgroundLayer = document.getElementById('background-layer'); 
    const bgCtx = backgroundLayer.getContext('2d'); 
    const previewLayer = document.getElementById('preview-layer'); 
    const previewCtx = previewLayer.getContext('2d'); 

    // キャンバスサイズをローカル変数で管理
    let canvasWidth = 800;
    let canvasHeight = 600;

    // グローバル変数でファイル名を保持
    let baseImageName = 'default';
    
    canvas.width = canvasWidth; 
    canvas.height = canvasHeight; 
    backgroundLayer.width = canvasWidth; 
    backgroundLayer.height = canvasHeight; 
    previewLayer.width = canvasWidth; 
    previewLayer.height = canvasHeight; 
    
    let brushSize = 10;
    let currentColor = '#00FF00';
    let brushMode = 1; // 1: ブラシ, 0: 消しゴム
    let isPainting = false;
    let isMouseDown = false;
    let isPanning = false;
    let lastX, lastY;
    let history = [];
    let redoStack = [];
    let historyLimit = 30;
    let bgHistory = [];
    let bgRedoStack = [];
    let bgHistoryLimit = 30; 
    let isShiftDown = false; 
    let isDrawingLine = false; 
    
    // Canvas初期設定でアンチエイリアスオフ 
    ctx.imageSmoothingEnabled = false; // スケーリング用
    bgCtx.imageSmoothingEnabled = false;

    let transform = {
        scale: 1,
        offsetX: 0,
        offsetY: 0,
        initialScale: 1, // 初期/リセット用のスケール保持

        // スクリーン座標からワールド座標への変換（#layer-container基準）
        screenToWorld: function(x, y) {
            const rect = layerContainer.getBoundingClientRect();
            return {
                x: (x - rect.left) / this.scale,
                y: (y - rect.top) / this.scale
            };
        },
        
        apply: function() {
            layerContainer.style.transform = `translate(-50%, -50%) translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
        },
        reset: function() {
            this.scale = this.initialScale; // 100%ではなくinitialScaleに
            this.offsetX = 0;
            this.offsetY = 0;
            this.apply();
            updateZoomSlider();
        },
        adjustToResize: function() {
            const workArea = document.querySelector('.work-area');
            const workAreaRect = workArea.getBoundingClientRect();
            const canvasRect = canvas.getBoundingClientRect();
            const currentCenterX = canvasRect.left + (canvasRect.width / 2);
            const currentCenterY = canvasRect.top + (canvasRect.height / 2);
            const newCenterX = workAreaRect.left + (workAreaRect.width / 2);
            const newCenterY = workAreaRect.top + (workAreaRect.height / 2);
            this.offsetX += (newCenterX - currentCenterX) / this.scale;
            this.offsetY += (newCenterY - currentCenterY) / this.scale;
            this.apply();
        }
    };
    
    // ウィンドウサイズに合わせたスケール計算関数
    function calculateInitialScale(width, height) {
        const windowWidth = window.innerWidth - 55; // ツールバー幅を引く
        const windowHeight = window.innerHeight;
        const scale = Math.min(windowWidth / width, windowHeight / height) * 0.9; // 90%で余白確保
        return Math.max(0.25, Math.min(6, scale)); // zoom-sliderの範囲に制限
    }
    
    // 初期スケール設定
    transform.initialScale = calculateInitialScale(canvasWidth, canvasHeight);
    transform.scale = transform.initialScale;
    
    // CSSサイズを動的に設定
    layerContainer.style.width = `${canvasWidth}px`;
    layerContainer.style.height = `${canvasHeight}px`;
    backgroundLayer.style.width = `${canvasWidth}px`;
    backgroundLayer.style.height = `${canvasHeight}px`;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    previewLayer.style.width = `${canvasWidth}px`; 
    previewLayer.style.height = `${canvasHeight}px`;
    
    // 背景画像の初期読み込み
    const bgImage = new Image();
    bgImage.src = '/static/images/defimg.png';
    bgImage.onload = function() {
        bgCtx.drawImage(bgImage, 0, 0, canvasWidth, canvasHeight);
        saveBgState();
    };
    
    // saveStateの実装
    function saveState() {
        history.push(canvas.toDataURL());
        if (history.length > historyLimit) {
            history.shift();
        }
        redoStack = [];
        updateUndoRedoButtons();
    }
    // 背景画像の状態を保存（バックエンド連携時に呼び出し予定）
    function saveBgState() {
        bgHistory.push(backgroundLayer.toDataURL());
        if (bgHistory.length > bgHistoryLimit) {
            bgHistory.shift();
        }
        bgRedoStack = [];      
    }
    
    // ファイル選択UI
    const loadButton = document.getElementById('load-button');
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none'; // 隠す
    document.body.appendChild(fileInput); // DOMに追加
    
    loadButton.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;
        baseImageName = file.name.split('.')[0]; // 拡張子を除くファイル名を保持
        const reader = new FileReader();
        reader.onload = function(event) {
            const newImage = new Image();
            newImage.src = event.target.result;
            newImage.onload = function() {
                // サイズを更新
                canvasWidth = newImage.naturalWidth;
                canvasHeight = newImage.naturalHeight;
                
                // キャンバスサイズ適用
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                backgroundLayer.width = canvasWidth;
                backgroundLayer.height = canvasHeight;
                previewLayer.width = canvasWidth;
                previewLayer.height = canvasHeight;

                // CSSサイズ更新
                layerContainer.style.width = `${canvasWidth}px`;
                layerContainer.style.height = `${canvasHeight}px`;
                backgroundLayer.style.width = `${canvasWidth}px`;
                backgroundLayer.style.height = `${canvasHeight}px`;
                canvas.style.width = `${canvasWidth}px`;
                canvas.style.height = `${canvasHeight}px`;
                previewLayer.style.width = `${canvasWidth}px`;
                previewLayer.style.height = `${canvasHeight}px`;
                
                // スケール再計算 
                transform.initialScale = calculateInitialScale(canvasWidth, canvasHeight);
                transform.scale = transform.initialScale;

                // 背景描画（サイズ更新後）
                bgCtx.clearRect(0, 0, canvasWidth, canvasHeight); // 前の画像をクリア
                bgCtx.drawImage(newImage, 0, 0, canvasWidth, canvasHeight);
                
                // マスクもクリアしてリセット
                ctx.clearRect(0, 0, canvasWidth, canvasHeight);
                history = []; // 履歴リセット
                redoStack = [];
                saveBgState();
                updateUndoRedoButtons();
                transform.apply(); // scale適用
            };
        };
        reader.readAsDataURL(file);
    });

    // 作業エリアにドラッグ＆ドロップ処理を追加
    const workArea = document.querySelector('.work-area');
    workArea.addEventListener('dragover', (e) => {
        e.preventDefault(); // デフォルト動作（画像をタブで開く）をキャンセル
    });
    workArea.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            fileInput.files = e.dataTransfer.files; // fileInputにファイルをセット
            fileInput.dispatchEvent(new Event('change')); // changeイベントを発火
        }
    });    
    
    function updateUndoRedoButtons() {
        document.getElementById('undo-button').classList.toggle('disabled', history.length === 0 && bgHistory.length === 0);
        document.getElementById('redo-button').classList.toggle('disabled', redoStack.length === 0 && bgRedoStack.length === 0);
    }

    function undo() {
        if (history.length === 0) return;
        redoStack.push(canvas.toDataURL());
        const lastState = history.pop();
        const img = new Image();
        img.onload = function() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            updateUndoRedoButtons();
        };
        img.src = lastState;

        if (bgHistory.length > 0) { 
            bgRedoStack.push(backgroundLayer.toDataURL());
            const lastBgState = bgHistory.pop();
            const bgImg = new Image();
            bgImg.onload = function() {
                // サイズ確認と調整
                if (bgImg.width !== canvasWidth || bgImg.height !== canvasHeight) {
                    canvasWidth = bgImg.width;
                    canvasHeight = bgImg.height;
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                    backgroundLayer.width = canvasWidth;
                    backgroundLayer.height = canvasHeight;
                    previewLayer.width = canvasWidth;
                    previewLayer.height = canvasHeight;
                    layerContainer.style.width = `${canvasWidth}px`;
                    layerContainer.style.height = `${canvasHeight}px`;
                    backgroundLayer.style.width = `${canvasWidth}px`;
                    backgroundLayer.style.height = `${canvasHeight}px`;
                    canvas.style.width = `${canvasWidth}px`;
                    canvas.style.height = `${canvasHeight}px`;
                    previewLayer.style.width = `${canvasWidth}px`;
                    previewLayer.style.height = `${canvasHeight}px`;
                    transform.initialScale = calculateInitialScale(canvasWidth, canvasHeight);
                    transform.scale = transform.initialScale;
                    transform.apply();
                }
                bgCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                bgCtx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
                updateUndoRedoButtons();
            };
            bgImg.src = lastBgState;
        }
    }
    
    // Redoの実装（背景とマスクの両方を扱う）
    function redo() {
        // マスクのRedo
        if (redoStack.length > 0) {
            history.push(canvas.toDataURL());
            const nextState = redoStack.pop();
            const img = new Image();
            img.onload = function() {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);
                updateUndoRedoButtons();
            };
            img.src = nextState;
        }

        // 背景画像のRedo
        if (bgRedoStack.length > 0) {
            bgHistory.push(backgroundLayer.toDataURL());
            const nextBgState = bgRedoStack.pop();
            const bgImg = new Image();
            bgImg.onload = function() {
                // サイズ確認と調整
                if (bgImg.width !== canvasWidth || bgImg.height !== canvasHeight) {
                    canvasWidth = bgImg.width;
                    canvasHeight = bgImg.height;
                    canvas.width = canvasWidth;
                    canvas.height = canvasHeight;
                    backgroundLayer.width = canvasWidth;
                    backgroundLayer.height = canvasHeight;
                    previewLayer.width = canvasWidth;
                    previewLayer.height = canvasHeight;
                    layerContainer.style.width = `${canvasWidth}px`;
                    layerContainer.style.height = `${canvasHeight}px`;
                    backgroundLayer.style.width = `${canvasWidth}px`;
                    backgroundLayer.style.height = `${canvasHeight}px`;
                    canvas.style.width = `${canvasWidth}px`;
                    canvas.style.height = `${canvasHeight}px`;
                    previewLayer.style.width = `${canvasWidth}px`;
                    previewLayer.style.height = `${canvasHeight}px`;
                    transform.initialScale = calculateInitialScale(canvasWidth, canvasHeight);
                    transform.scale = transform.initialScale;
                    transform.apply();
                }
                bgCtx.clearRect(0, 0, canvasWidth, canvasHeight);
                bgCtx.drawImage(bgImg, 0, 0, canvasWidth, canvasHeight);
                updateUndoRedoButtons();
            };
            bgImg.src = nextBgState;
        }
    }

    window.addEventListener('resize', function() {
        transform.adjustToResize();
    });

    // ブラシプレビューの更新（キャンバス座標で直接指定）
    function updateBrushPreview(x, y) {
        if (isPanning || brushMode === 2) { // バケツモードで非表示
            brushPreview.style.display = 'none';
            return;
        }
        
        const previewSize = brushSize;
        const canvasPos = transform.screenToWorld(x, y); // キャンバス座標を取得
        
        // worldToScreenを介さず、キャンバス座標を直接使用 #Add
        brushPreview.style.left = `${canvasPos.x - previewSize / 2}px`;
        brushPreview.style.top = `${canvasPos.y - previewSize / 2}px`;
        brushPreview.style.width = `${previewSize}px`;
        brushPreview.style.height = `${previewSize}px`;
        brushPreview.style.display = 'block';
        
        if (brushMode === 1) {
            brushPreview.style.backgroundColor = currentColor;
            brushPreview.style.border = 'none';
        } else {
            brushPreview.style.backgroundColor = 'transparent';
            brushPreview.style.border = `1px solid ${currentColor}`;
        }
    }
        
    function drawLine(x0, y0, x1, y1) {
        ctx.save();
         if (brushMode === 1) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.strokeStyle = currentColor;
        } else {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.strokeStyle = 'rgba(0, 0, 0, 1)';
        }
        ctx.beginPath();
        ctx.moveTo(Math.round(x0), Math.round(y0)); // ピクセルスナップ強化 
        ctx.lineTo(Math.round(x1), Math.round(y1)); // ピクセルスナップ強化 
        ctx.lineWidth = Math.round(brushSize); // 整数化 
        ctx.lineCap = 'round';
        ctx.stroke();
        ctx.restore();
    }
    
    function drawDot(x, y) {
        ctx.save();
        if (brushMode === 1) {
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = currentColor;
        } else {
            ctx.globalCompositeOperation = 'destination-out';
            ctx.fillStyle = 'rgba(0, 0, 0, 1)';
        }
        ctx.beginPath();
        ctx.arc(Math.round(x), Math.round(y), Math.round(brushSize / 2), 0, Math.PI * 2); // ピクセルスナップ強化
        ctx.fill();
        ctx.restore();
    }
    
    // Scanline Flood Fill関数 
    function scanlineFill(x, y, fillColor, targetColor) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const pixels = imageData.data;
        const width = canvas.width;
        const height = canvas.height;
        const stack = [[x, y]];

        while (stack.length) {
            let [xStart, y] = stack.pop();
            let xLeft = xStart;
            let xRight = xStart;

            const posStart = (y * width + xStart) * 4;
            if (!matchColor(pixels, posStart, targetColor) || matchColor(pixels, posStart, fillColor)) continue;

            // 左端を探す
            while (xLeft >= 0 && matchColor(pixels, (y * width + xLeft) * 4, targetColor)) {
                xLeft--;
            }
            xLeft++;
            // 右端を探す
            while (xRight < width && matchColor(pixels, (y * width + xRight) * 4, targetColor)) {
                xRight++;
            }
            xRight--;

            // ラインを塗る
            for (let x = xLeft; x <= xRight; x++) {
                const pos = (y * width + x) * 4;
                if (!matchColor(pixels, pos, fillColor)) {
                    pixels[pos] = fillColor[0];
                    pixels[pos + 1] = fillColor[1];
                    pixels[pos + 2] = fillColor[2];
                    pixels[pos + 3] = fillColor[3];
                }
            }

            // 上のラインをチェック
            if (y > 0) {
                for (let x = xLeft; x <= xRight; x++) {
                    const pos = ((y - 1) * width + x) * 4;
                    if (matchColor(pixels, pos, targetColor) && !matchColor(pixels, pos, fillColor)) {
                        stack.push([x, y - 1]);
                        break; // 一旦中断、次の開始点は次のループで
                    }
                }
            }
            // 下のラインをチェック
            if (y < height - 1) {
                for (let x = xLeft; x <= xRight; x++) {
                    const pos = ((y + 1) * width + x) * 4;
                    if (matchColor(pixels, pos, targetColor) && !matchColor(pixels, pos, fillColor)) {
                        stack.push([x, y + 1]);
                        break;
                    }
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
    }

    // 色比較と設定ヘルパー
    function matchColor(pixels, pos, color) {
        if (pixels[pos + 3] === 0 && color[3] === 0) return true; // アルファが0なら透明として扱う
        // アルファが低いなら透明とみなす アルファ=0～255
        if (pixels[pos + 3] <= 254 && color[3] === 0) return true;
        // RGBのトレランス（±10）
        const tolerance = 10;
        return pixels[pos] === color[0] &&
               pixels[pos + 1] === color[1] &&
               pixels[pos + 2] === color[2] &&
               pixels[pos + 3] === color[3];
    }

    function hexToRGBA(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b, 255]; // 不透明度固定
    }

    function updateZoomSlider() {
        const zoomSlider = document.getElementById('zoom-slider');
        const zoomValue = document.getElementById('zoom-value');
        zoomSlider.value = transform.scale;
        zoomValue.textContent = `${Math.round(transform.scale * 100)}%`;
    }
    
    function updateBrushSizeSlider() {
        const brushSizeSlider = document.getElementById('brush-size-slider');
        const brushSizeValue = document.getElementById('brush-size-value');
        brushSizeSlider.value = brushSize;
        brushSizeValue.textContent = `${brushSize}px`;
    }
    
    function updateColorButton() {
        const colorButton = document.getElementById('color-button');
        colorButton.querySelector('i').style.color = currentColor;
    }
    
    // ツールボタン更新 
    function updateToolButtons() {
        document.querySelectorAll('.tool-button').forEach(btn => btn.classList.remove('active'));
        if (isPanning) document.getElementById('pan-button').classList.add('active');
        else if (brushMode === 0) document.getElementById('eraser-button').classList.add('active');
        else if (brushMode === 1) document.getElementById('brush-button').classList.add('active');
        else if (brushMode === 2) document.getElementById('bucket-button').classList.add('active'); 
    }
    
    canvas.addEventListener('mousedown', function(e) {
        isMouseDown = true;
        if (isPanning) {
            document.querySelector('.work-area').style.cursor = 'grabbing'; // クリックで握った手に
            lastX = e.clientX;
            lastY = e.clientY;
            return;
        }
        const { x, y } = transform.screenToWorld(e.clientX, e.clientY);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const targetColor = [
            imageData.data[(Math.floor(y) * canvas.width + Math.floor(x)) * 4],
            imageData.data[(Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 1],
            imageData.data[(Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 2],
            imageData.data[(Math.floor(y) * canvas.width + Math.floor(x)) * 4 + 3]
        ];
        
        if (brushMode === 2) { // バケツモード 
            scanlineFill(Math.floor(x), Math.floor(y), hexToRGBA(currentColor), targetColor);
            saveState();
            return;
        }

        if (isShiftDown && brushMode !== 2) { // Shift直線描画
            if (lastX !== undefined && lastY !== undefined) {
                drawLine(lastX, lastY, x, y); // 直線確定描画
                saveState();
            }
            lastX = x;
            lastY = y;
            return;
        }

        isPainting = true;
        lastX = x;
        lastY = y;
        drawDot(x, y);
        saveState();
    });
    
    window.addEventListener('mouseup', function() {
        isMouseDown = false;
        isPainting = false;
        isDrawingLine = false;
        previewCtx.clearRect(0, 0, canvasWidth, canvasHeight); // プレビュークリア
        if (isPanning) { // パンモード中に戻す 
            document.querySelector('.work-area').style.cursor = 'grab'; // リリースで開いた手に 
        }
    });
    
    // #layer-containerにmousemoveを追加
    layerContainer.addEventListener('mousemove', function(e) {
        const rect = this.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
    
        // カーソル制御
        if (isPanning) {
            this.parentElement.style.cursor = isMouseDown ? 'grabbing' : 'grab';
        } else if (brushMode === 2) {
            this.parentElement.style.cursor = 'crosshair'; // バケツモード時
        } else {
            this.parentElement.style.cursor = 'none'; // ブラシ/消しゴム
        }        
        updateBrushPreview(e.clientX, e.clientY);
    
        // 直線プレビュー
        if (isDrawingLine && brushMode !== 2) {
            const { x, y } = transform.screenToWorld(e.clientX, e.clientY);
            previewCtx.clearRect(0, 0, canvasWidth, canvasHeight);
            previewCtx.save();

            // 1. 基本の直線（ブラシ or 消しゴム）
            if (brushMode === 1) { // ブラシモード
                previewCtx.globalCompositeOperation = 'source-over';
                previewCtx.strokeStyle = currentColor;
                previewCtx.lineWidth = Math.round(brushSize);
                previewCtx.beginPath(); 
                previewCtx.moveTo(Math.round(lastX), Math.round(lastY)); 
                previewCtx.lineTo(Math.round(x), Math.round(y)); 
                previewCtx.lineCap = 'round'; 
                previewCtx.stroke(); 
            } else { // 消しゴムモード
                // まず縁取り用の外側線を描く
                previewCtx.globalCompositeOperation = 'source-over';
                previewCtx.strokeStyle = currentColor;
                previewCtx.lineWidth = Math.round(brushSize); // 外側は同じ太さに
                previewCtx.beginPath();
                previewCtx.moveTo(Math.round(lastX), Math.round(lastY));
                previewCtx.lineTo(Math.round(x), Math.round(y));
                previewCtx.lineCap = 'round';
                previewCtx.stroke();

                // 次に内側を透明化
                previewCtx.globalCompositeOperation = 'destination-out';
                previewCtx.strokeStyle = 'rgba(0, 0, 0, 1)';
                previewCtx.lineWidth = Math.round(brushSize) - 4 ; // 少し小さくくり抜く
                previewCtx.beginPath();
                previewCtx.moveTo(Math.round(lastX), Math.round(lastY));
                previewCtx.lineTo(Math.round(x), Math.round(y));
                previewCtx.lineCap = 'round';
                previewCtx.stroke();
            }
            previewCtx.restore();
        }

        if (!isMouseDown) return;
    
        if (isPanning) {
            const dx = e.clientX - lastX;
            const dy = e.clientY - lastY;
            transform.offsetX += dx / transform.scale;
            transform.offsetY += dy / transform.scale;
            transform.apply();
            lastX = e.clientX;
            lastY = e.clientY;
            return;
        }
    
    if (isPainting) {
            const { x, y } = transform.screenToWorld(e.clientX, e.clientY);
            drawLine(lastX, lastY, x, y);
            lastX = x;
            lastY = y;
        }
    });
        
    // #layer-containerのmouseleave修正
    layerContainer.addEventListener('mouseleave', function() {
        this.parentElement.style.cursor = 'default';
        brushPreview.style.display = 'none';
    });
    
    document.getElementById('pan-button').addEventListener('click', function() {
        isPanning = !isPanning;
        updateToolButtons();
        const workArea = document.querySelector('.work-area');
        workArea.style.cursor = isPanning ? 'grab' : 'default';
        if (isPanning) brushPreview.style.display = 'none';
    });

    // Shiftキー検知
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Shift') {
            isShiftDown = true;
            if (brushMode !== 2 ) { // バケツ以外ならプレビュー開始
                isDrawingLine = true;
            }
            return;
        }


    // Ctrlキーとの組み合わせ
    if (e.ctrlKey) {
        if (e.key === 'z' || e.key === 'Z') { // Ctrl + Z: Undo
            e.preventDefault();
            undo();
        } else if (e.key === 'y' || e.key === 'Y') { // Ctrl + Y: Redo
            e.preventDefault();
            redo();
        }
        return;
    }

    // 単独キー
    switch (e.key.toLowerCase()) {
        case 'h': // H: Pan
            e.preventDefault();
            isPanning = !isPanning;
            updateToolButtons();
            document.querySelector('.work-area').style.cursor = isPanning ? 'grab' : 'default';
            if (isPanning) brushPreview.style.display = 'none';
            break;
        case 'p': 
        case 'b': // B: Brush
            e.preventDefault();
            brushMode = 1;
            isPanning = false;
            updateToolButtons();
            document.querySelector('.work-area').style.cursor = 'default';
            break;
        case 'g': // G: Bucket
            e.preventDefault();
            brushMode = 2;
            isPanning = false;
            updateToolButtons();
            document.querySelector('.work-area').style.cursor = 'crosshair';
            break;
        case 'e': // E: Eraser
            e.preventDefault();
            brushMode = 0;
            isPanning = false;
            updateToolButtons();
            document.querySelector('.work-area').style.cursor = 'default';
            break;
        case '[': // [: Brush Size Decrease
            e.preventDefault();
            brushSize = Math.max(1, brushSize - 10); // 最小1
            updateBrushSizeSlider();
            break;
        case ']': // ]: Brush Size Increase
            e.preventDefault();
            brushSize = Math.min(200, brushSize + 10); // 最大200
            updateBrushSizeSlider();
            break;
        case '+': // +: Zoom In
        case '=': // =も対応（USキーボード対策）
            e.preventDefault();
            transform.scale = Math.min(6, transform.scale + 0.1); // 最大6
            transform.apply();
            updateZoomSlider();
            break;
        case '-': // -: Zoom Out
            e.preventDefault();
            transform.scale = Math.max(0.25, transform.scale - 0.1); // 最小0.25
            transform.apply();
            updateZoomSlider();
            break;
        case '0': // 0: Reset
            e.preventDefault();
            transform.reset();
            brushSize = 10;
            currentColor = '#00FF00';
            brushMode = 1;
            updateBrushSizeSlider();
            updateColorButton();
            updateToolButtons();
            break;
        case 'f': // F: Load File
            e.preventDefault();
            fileInput.click();
            break;
        case 'enter': // Enter: Run
            e.preventDefault();
            document.getElementById('run-button').click();
            break;
        case 's': // S: Download
            e.preventDefault();
            document.getElementById('dl-button').click();
            break;
    }
    });

    // マウスホイールでズーム（マウス位置中心）
    layerContainer.addEventListener('wheel', function(e) {
        e.preventDefault();
        const zoomStep = 0.1;
        const delta = e.deltaY < 0 ? zoomStep : -zoomStep;
    
        // 新しいスケールを計算
        const newScale = Math.max(0.25, Math.min(6, transform.scale + delta));
        if (newScale === transform.scale) return;
    
        // スケール更新（offsetX/Y は変更しない）
        transform.scale = newScale;
        transform.apply();
        updateZoomSlider();
    });

    // Shiftキー解放でプレビュー終了
    document.addEventListener('keyup', function(e) {
        if (e.key === 'Shift') {
            isShiftDown = false;
            isDrawingLine = false;
            previewCtx.clearRect(0, 0, canvasWidth, canvasHeight);
        }
    });

    document.getElementById('brush-button').addEventListener('click', function() {
        brushMode = 1;
        isPanning = false;
        updateToolButtons();
        document.querySelector('.work-area').style.cursor = 'default'; 
    });
   
    // バケツボタン追加
    document.getElementById('bucket-button').addEventListener('click', function() {
        brushMode = 2;
        isPanning = false;
        updateToolButtons();
        document.querySelector('.work-area').style.cursor = 'crosshair';
    });

    document.getElementById('eraser-button').addEventListener('click', function() {
        brushMode = 0;
        isPanning = false;
        updateToolButtons();
        document.querySelector('.work-area').style.cursor = 'default'; 
    });
    
   
    document.getElementById('undo-button').addEventListener('click', undo);
    document.getElementById('redo-button').addEventListener('click', redo);
    
    document.getElementById('color-button').addEventListener('click', function() {
        const colorPalette = document.getElementById('color-palette');
        const colorButton = this;
        const buttonRect = colorButton.getBoundingClientRect();
        colorPalette.style.top = `${buttonRect.top}px`;
        colorPalette.style.display = colorPalette.style.display === 'grid' ? 'none' : 'grid';
    });
    
    document.querySelectorAll('.color-option').forEach(option => {
        option.addEventListener('click', function() {
            currentColor = this.getAttribute('data-color');
            updateColorButton();
            document.getElementById('color-palette').style.display = 'none';
        });
    });
    
    const brushSlider = document.getElementById('brush-size-slider');
    if (typeof noUiSlider === 'undefined') {
        console.error('noUiSliderが読み込まれていません。CDNの読み込みを確認してください。');
    } else {
        noUiSlider.create(brushSlider, {
            start: 40,
            range: { min: 1, max: 200 },
            orientation: 'vertical',
            direction: 'rtl',
        });
        brushSlider.noUiSlider.on('update', (values) => {
            brushSize = parseInt(values[0]);
            document.getElementById('brush-size-value').textContent = `${brushSize}px`;
        });
    }

    const zoomSlider = document.getElementById('zoom-slider');
    if (typeof noUiSlider === 'undefined') {
        console.error('noUiSliderが読み込まれていません。CDNの読み込みを確認してください。');
    } else {
        noUiSlider.create(zoomSlider, {
            start: 1,
            range: { min: 0.25, max: 6 },
            step: 0.1,
            orientation: 'vertical',
            direction: 'rtl',
        });
        zoomSlider.noUiSlider.on('update', (values) => {
            transform.scale = parseFloat(values[0]);
            transform.apply();
            document.getElementById('zoom-value').textContent = `${Math.round(transform.scale * 100)}%`;
        });    
    }
    
    document.getElementById('reset-button').addEventListener('click', function() {
        transform.reset();
        brushSize = 10;
        currentColor = '#00FF00';
        brushMode = 1;
        updateBrushSizeSlider();
        updateColorButton();
        updateToolButtons();
    });
    
    document.getElementById('run-button').addEventListener('click', function() {
        const overlay = document.getElementById('loading-overlay'); // オーバーレイとスピナーを表示
        overlay.style.display = 'flex';

        // 元画像とマスクをData URLとして取得
        const imageDataURL = backgroundLayer.toDataURL('image/png');
        const maskDataURL = canvas.toDataURL('image/png');
  
        // FormDataを使って送信 
        const formData = new FormData();
        formData.append('image', dataURLToBlob(imageDataURL), `${baseImageName}.png`);
        formData.append('mask', dataURLToBlob(maskDataURL), `${baseImageName}_mask.png`);

        ctx.clearRect(0, 0, canvasWidth, canvasHeight); // 描画レイヤーを透明に塗りつぶす

        fetch('/process', {
            method: 'POST',
            body: formData 
        })
        .then(response => response.json())
        .then(data => {
            overlay.style.display = 'none'; // スピナーを非表示
            if (data.success) {
                const resultImage = new Image();
                resultImage.src = data.result_url + '?t=' + new Date().getTime(); // キャッシュ回避
                resultImage.onload = function() {
                    // サイズ確認と調整 
                    if (resultImage.width !== canvasWidth || resultImage.height !== canvasHeight) {
                        canvasWidth = resultImage.width;
                        canvasHeight = resultImage.height;
                        canvas.width = canvasWidth;
                        canvas.height = canvasHeight;
                        backgroundLayer.width = canvasWidth;
                        backgroundLayer.height = canvasHeight;
                        previewLayer.width = canvasWidth;
                        previewLayer.height = canvasHeight;
                        layerContainer.style.width = `${canvasWidth}px`;
                        layerContainer.style.height = `${canvasHeight}px`;
                        backgroundLayer.style.width = `${canvasWidth}px`;
                        backgroundLayer.style.height = `${canvasHeight}px`;
                        canvas.style.width = `${canvasWidth}px`;
                        canvas.style.height = `${canvasHeight}px`;
                        previewLayer.style.width = `${canvasWidth}px`;
                        previewLayer.style.height = `${canvasHeight}px`;
                        transform.initialScale = calculateInitialScale(canvasWidth, canvasHeight);
                        transform.scale = transform.initialScale;
                        transform.apply();
                    }
                    bgCtx.clearRect(0, 0, canvasWidth, canvasHeight); 
                    bgCtx.drawImage(resultImage, 0, 0, canvasWidth, canvasHeight); 
                    saveBgState(); 
                    updateUndoRedoButtons(); 
                };
            } else {
                alert('エラー: ' + data.error);
            }
        })
        .catch(error => {
            overlay.style.display = 'none'; // エラー時も非表示
            alert('エラー: ' + error);
        })
        .finally(() => {
            overlay.style.display = 'none'; // 成功/失敗に関わらず非表示
        });
    });

    // Data URLをBlobに変換するヘルパー関数 
    function dataURLToBlob(dataURL) {
        const arr = dataURL.split(',');
        const mime = arr[0].match(/:(.*?);/)[1];
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
            u8arr[n] = bstr.charCodeAt(n);
        }
        return new Blob([u8arr], { type: mime });
    }
    
    document.addEventListener('click', function(e) {
        const colorPalette = document.getElementById('color-palette');
        const colorButton = document.getElementById('color-button');
        if (!colorButton.contains(e.target) && !colorPalette.contains(e.target)) {
            colorPalette.style.display = 'none';
        }
    });
    
    // ダウンロード用のコード
    document.getElementById('dl-button').addEventListener('click', function() {
        const dataURL = backgroundLayer.toDataURL('image/png');
    
        const link = document.createElement('a');
        link.href = dataURL;
        link.download = `${baseImageName}_result.png`;
    
        document.body.appendChild(link);
        link.click();

        document.body.removeChild(link);
    });

    transform.apply();
    updateColorButton();
    updateToolButtons();
    updateUndoRedoButtons();
    saveState();
});