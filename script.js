// script.js
// ------------
// 取得 DOM 元素
const totalEl   = document.getElementById('totalLength');
const widthEl   = document.getElementById('barWidth');
const countEl   = document.getElementById('inputCount');
const spacingEl = document.getElementById('inputSpacing');
const resultsEl = document.getElementById('results');
const canvas    = document.getElementById('previewCanvas');
const ctx       = canvas.getContext('2d');

let lastAction = null;

// —— 核心計算函式 ——
// 永遠以「包外 (外徑)」計算：L = L0 + 2*W
function adjTotal() {
  const L0 = parseFloat(totalEl.value) || 0;
  const W  = parseFloat(widthEl.value) || 0;
  return L0 + 2 * W;
}
function adjWidth() {
  return parseFloat(widthEl.value) || 0;
}

// 以「中間柱子數 innerCount」計算間距
function calcSpacing(total, barW, innerCount) {
  return (total - (innerCount + 2) * barW) / (innerCount + 1);
}
// 以「間距 spacing」反算中間柱子數（floor + 校正）
function calcInnerCountBySpacing(total, barW, spacing) {
  const raw = (total - spacing - 2 * barW) / (spacing + barW);
  let n = Math.floor(raw);
  if (n < 0) n = 0;
  while (n > 0 && calcSpacing(total, barW, n) < spacing) {
    n--;
  }
  return n;
}
// 列出所有可行方案
function genAllSchemes(total, barW) {
  const schemes = [];
  const maxInner = Math.floor(total / barW) - 2;
  for (let i = 0; i <= maxInner; i++) {
    const sp = calcSpacing(total, barW, i);
    if (sp >= 0) schemes.push({ count: i, spacing: sp });
  }
  return schemes;
}

// —— 清空與渲染 —— 
function clearOutput() {
  resultsEl.innerHTML = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function render(innerCount, spacing) {
  const L = adjTotal(), W = adjWidth();
  // 更新結果文字
  resultsEl.innerHTML = `
    <h2>結果</h2>
    <p>中間根數 <b>${innerCount}</b> → 間距 <b>${spacing.toFixed(2)}</b> cm（不含端柱）</p>
    <h3>所有可行方案（中間根數 → 間距）</h3>
    <ul>
      ${genAllSchemes(L, W).map(o =>
        `<li>${o.count} 根 → 間距 ${o.spacing.toFixed(2)} cm</li>`
      ).join('')}
    </ul>
  `;
  // 調整 canvas 大小並繪圖
  canvas.width  = resultsEl.clientWidth;
  canvas.height = 260;  // 增高一點給寬度標示留空間
  drawPreview(L, W, innerCount, spacing);
}

// —— 繪圖 ——
// 1. 雙線橫樑  
// 2. 垂直欄杆（細線）  
// 3. 上方尺寸線＋箭頭＋總長度文字  
// 4. 在第一根柱子上方，畫出「鐵條寬度」尺寸
function drawPreview(total, barW, innerCount, spacing) {
  const totalBars   = innerCount + 2;
  const padding     = 40;
  const w           = canvas.width;
  const h           = canvas.height;
  const railTopY    = 80;
  const railBottomY = h - 80;
  const railGap     = 6;
  const scale       = (w - padding * 2) / total;
  const barWpx      = barW * scale;
  const spPx        = spacing * scale;

  ctx.clearRect(0, 0, w, h);

  // 基本設定
  ctx.strokeStyle = '#003366';
  ctx.fillStyle   = '#003366';
  ctx.lineWidth   = 2;
  ctx.textAlign   = 'center';
  ctx.font        = '14px sans-serif';

  // 1) 雙線橫樑（保持不變）
  ctx.beginPath();
  ctx.moveTo(padding, railTopY);
  ctx.lineTo(w - padding, railTopY);
  ctx.moveTo(padding, railTopY + railGap);
  ctx.lineTo(w - padding, railTopY + railGap);
  ctx.moveTo(padding, railBottomY);
  ctx.lineTo(w - padding, railBottomY);
  ctx.moveTo(padding, railBottomY - railGap);
  ctx.lineTo(w - padding, railBottomY - railGap);
  ctx.stroke();

  // 2) 實體豎條：首尾用淺灰，其餘深藍
  for (let i = 0, x = padding; i < totalBars; i++) {
    const barHeight = railBottomY - railTopY - railGap * 2;
    const yTop      = railTopY + railGap;
    if (i === 0 || i === totalBars - 1) {
      ctx.fillStyle = '#CCC';       // 端點兩根淺灰
    } else {
      ctx.fillStyle = '#003366';    // 中間深藍
    }
    ctx.fillRect(x, yTop, barWpx, barHeight);
    x += barWpx + spPx;
  }

  // 3) 總長度尺寸標註（同之前）
  const dimY = railTopY - 40;
  ctx.setLineDash([5,3]);
  ctx.beginPath();
  ctx.moveTo(padding, dimY);
  ctx.lineTo(w - padding, dimY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(padding, dimY);
  ctx.lineTo(padding, railTopY);
  ctx.moveTo(w - padding, dimY);
  ctx.lineTo(w - padding, railTopY);
  ctx.stroke();
  const a = 6;
  ctx.beginPath();
  ctx.moveTo(padding, dimY);
  ctx.lineTo(padding + a, dimY - a);
  ctx.moveTo(padding, dimY);
  ctx.lineTo(padding + a, dimY + a);
  ctx.moveTo(w - padding, dimY);
  ctx.lineTo(w - padding - a, dimY - a);
  ctx.moveTo(w - padding, dimY);
  ctx.lineTo(w - padding - a, dimY + a);
  ctx.stroke();
  ctx.fillStyle = '#003366';
  ctx.font = '16px sans-serif';
  ctx.fillText(`${total.toFixed(2)} cm`, w/2, dimY - 10);

  // 4) 鐵條寬度標示（保持原本實現）
  const firstX = padding + barWpx/2;
  const wDimY  = railTopY - 80;
  ctx.setLineDash([5,3]);
  ctx.beginPath();
  ctx.moveTo(firstX - barWpx/2, wDimY);
  ctx.lineTo(firstX + barWpx/2, wDimY);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.beginPath();
  ctx.moveTo(firstX - barWpx/2, wDimY);
  ctx.lineTo(firstX - barWpx/2, railTopY);
  ctx.moveTo(firstX + barWpx/2, wDimY);
  ctx.lineTo(firstX + barWpx/2, railTopY);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(firstX - barWpx/2, wDimY);
  ctx.lineTo(firstX - barWpx/2 + a, wDimY - a);
  ctx.moveTo(firstX - barWpx/2, wDimY);
  ctx.lineTo(firstX - barWpx/2 + a, wDimY + a);
  ctx.moveTo(firstX + barWpx/2, wDimY);
  ctx.lineTo(firstX + barWpx/2 - a, wDimY - a);
  ctx.moveTo(firstX + barWpx/2, wDimY);
  ctx.lineTo(firstX + barWpx/2 - a, wDimY + a);
  ctx.stroke();
  ctx.fillStyle = '#003366';
  ctx.font = '16px sans-serif';
  ctx.fillText(`${barW.toFixed(2)} cm`, firstX, wDimY - 10);
}


// —— 綁定使用者輸入 ——
// 指定根數
countEl.addEventListener('input', () => {
  lastAction = 'count';
  const n = parseInt(countEl.value, 10);
  if (!isNaN(n) && n >= 0) {
    const s = calcSpacing(adjTotal(), adjWidth(), n);
    spacingEl.value = s.toFixed(2);
    render(n, s);
  } else {
    clearOutput();
  }
});
// 指定間距
spacingEl.addEventListener('input', () => {
  lastAction = 'spacing';
  const s = parseFloat(spacingEl.value);
  if (!isNaN(s) && s >= 0) {
    const n = calcInnerCountBySpacing(adjTotal(), adjWidth(), s);
    countEl.value = n;
    render(n, calcSpacing(adjTotal(), adjWidth(), n));
  } else {
    clearOutput();
  }
});

// 總長度/寬度變動時，依最後操作欄位重算
[totalEl, widthEl].forEach(el =>
  el.addEventListener('input', () => {
    if (lastAction === 'count') countEl.dispatchEvent(new Event('input'));
    else if (lastAction === 'spacing') spacingEl.dispatchEvent(new Event('input'));
  })
);

// 頁面初始化時清空
clearOutput();
