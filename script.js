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
// 固定「包外 (外徑)」：L = L0 + 2*W
function adjTotal() {
  const L0 = parseFloat(totalEl.value) || 0;
  // const W  = parseFloat(widthEl.value) || 0;
  return L0;
}
function adjWidth() {
  return parseFloat(widthEl.value) || 0;
}

// 以「中間柱子數 innerCount」計算間距
function calcSpacing(total, barW, innerCount) {
  return (total - innerCount * barW) / (innerCount + 1);
}
// 以「間距 spacing」反算中間柱子數
function calcInnerCountBySpacing(total, barW, spacing) {
  let raw = (total - spacing) / (barW + spacing);
  let n = Math.floor(raw);
  if (n < 0) n = 0;
  // 校正不超過
  while (n > 0 && calcSpacing(total, barW, n) < spacing) {
    n--;
  }
  return n;
}
function genAllSchemes(total, barW) {
  const list = [];
  const maxN = Math.floor(total / barW);
  for (let i = 0; i <= maxN; i++) {
    const sp = calcSpacing(total, barW, i);
    if (sp >= 0) list.push({ count: i, spacing: sp });
  }
  return list;
}

// —— 輸出與綁定 —— 
function clearOutput() {
  resultsEl.innerHTML = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
function render(innerCount, spacing) {
  const L = adjTotal(), W = adjWidth();
  resultsEl.innerHTML = `
    <h2>結果</h2>
    <p>中間根數 <b>${innerCount}</b> → 間距 <b>${spacing.toFixed(2)}</b> mm</p>
    <h3>所有可行方案（柱數 → 間距）</h3>
    <ul>
      ${genAllSchemes(L, W).map(o =>
        `<li>${o.count} 根 → 間距 ${o.spacing.toFixed(2)} mm</li>`
      ).join('')}
    </ul>
  `;
  canvas.width  = resultsEl.clientWidth;
  canvas.height = 260;
  drawPreview(L, W, innerCount, spacing);
}

// —— 全新 drawPreview —— 
function drawPreview(totalOuter, barW, innerCount, spacing) {
  // totalOuter = L₀ + 2*barW （畫圖用）
  // rawTotal   = L₀（顯示用）
  const rawTotal   = totalOuter;
  const padding    = 40;
  const w          = canvas.width;
  const h          = canvas.height;
  const railTopY   = 80;
  const railBotY   = h - 80;
  const railGap    = 6;
  const scale      = (w - padding * 2) / totalOuter;
  const barWpx     = barW * scale;
  const spPx       = spacing * scale;
  const arrowSize  = 6;

  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = '#003366';
  ctx.fillStyle   = '#003366';
  ctx.lineWidth   = 2;
  ctx.textAlign   = 'center';

  // 1) 雙線橫樑
  ctx.beginPath();
  // 上
  ctx.moveTo(padding, railTopY);
  ctx.lineTo(w - padding, railTopY);
  ctx.moveTo(padding, railTopY + railGap);
  ctx.lineTo(w - padding, railTopY + railGap);
  // 下
  ctx.moveTo(padding, railBotY);
  ctx.lineTo(w - padding, railBotY);
  ctx.moveTo(padding, railBotY - railGap);
  ctx.lineTo(w - padding, railBotY - railGap);
  ctx.stroke();

  // 2) 中間柱子（實體矩形，不含端柱）
  for (let i = 0; i < innerCount; i++) {
    const x = padding + (barWpx + spPx) * i + spPx;
    const y = railTopY + railGap;
    const hBar = railBotY - railTopY - railGap * 2;
    ctx.fillRect(x, y, barWpx, hBar);
  }

  // 3) 總長度尺寸線（標示 rawTotal）
  const dimY = railTopY - 40;
  ctx.setLineDash([5,3]);
  ctx.beginPath();
  ctx.moveTo(padding, dimY);
  ctx.lineTo(w - padding, dimY);
  ctx.stroke();
  ctx.setLineDash([]);
  // 延伸線
  ctx.beginPath();
  ctx.moveTo(padding, dimY);
  ctx.lineTo(padding, railTopY);
  ctx.moveTo(w - padding, dimY);
  ctx.lineTo(w - padding, railTopY);
  ctx.stroke();
  // 箭頭
  ctx.beginPath();
  ctx.moveTo(padding, dimY);
  ctx.lineTo(padding + arrowSize, dimY - arrowSize);
  ctx.moveTo(padding, dimY);
  ctx.lineTo(padding + arrowSize, dimY + arrowSize);
  ctx.moveTo(w - padding, dimY);
  ctx.lineTo(w - padding - arrowSize, dimY - arrowSize);
  ctx.moveTo(w - padding, dimY);
  ctx.lineTo(w - padding - arrowSize, dimY + arrowSize);
  ctx.stroke();
  // 文字
  ctx.font = '16px sans-serif';
  ctx.fillText(`${rawTotal.toFixed(2)} mm`, w / 2, dimY - 10);

  // 4) 每段間距尺寸（共 innerCount+1 段）
  ctx.lineWidth = 1;
  ctx.font      = '14px sans-serif';
  for (let j = 0; j <= innerCount; j++) {
    const startX = padding + (barWpx + spPx) * j;
    const endX   = startX + spPx;
    const ay     = railBotY + 20;

    // 主線
    ctx.beginPath();
    ctx.moveTo(startX, ay);
    ctx.lineTo(endX, ay);
    ctx.stroke();
    // 箭頭
    ctx.beginPath();
    ctx.moveTo(startX, ay);
    ctx.lineTo(startX + arrowSize, ay - arrowSize);
    ctx.moveTo(startX, ay);
    ctx.lineTo(startX + arrowSize, ay + arrowSize);
    ctx.moveTo(endX, ay);
    ctx.lineTo(endX - arrowSize, ay - arrowSize);
    ctx.moveTo(endX, ay);
    ctx.lineTo(endX - arrowSize, ay + arrowSize);
    ctx.stroke();
    // 標距文字
    ctx.fillText(`${spacing.toFixed(2)}`, (startX + endX) / 2, ay - 8);
  }
}

// —— 綁定事件 ——
// 根數輸入
countEl.addEventListener('input', () => {
  lastAction = 'count';
  const n = parseInt(countEl.value, 10);
  if (!isNaN(n)) {
    const s = calcSpacing(adjTotal(), adjWidth(), n);
    spacingEl.value = s.toFixed(2);
    render(n, s);
  } else clearOutput();
});
// 間距輸入
spacingEl.addEventListener('input', () => {
  lastAction = 'spacing';
  const s = parseFloat(spacingEl.value);
  if (!isNaN(s)) {
    const n = calcInnerCountBySpacing(adjTotal(), adjWidth(), s);
    countEl.value = n;
    render(n, calcSpacing(adjTotal(), adjWidth(), n));
  } else clearOutput();
});
// 總長度/寬度變動
[totalEl, widthEl].forEach(el =>
  el.addEventListener('input', () => {
    if (lastAction === 'count') countEl.dispatchEvent(new Event('input'));
    else if (lastAction === 'spacing') spacingEl.dispatchEvent(new Event('input'));
  })
);

// 初始化
clearOutput();
