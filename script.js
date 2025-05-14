// script.js
// ------------
// 取得 DOM 元素
const totalEl       = document.getElementById('totalLength');
const widthEl       = document.getElementById('barWidth');
const measureSwitch = document.getElementById('measureSwitch');
const measureLabel  = document.getElementById('measureLabel');
const countEl       = document.getElementById('inputCount');
const spacingEl     = document.getElementById('inputSpacing');
const resultsEl     = document.getElementById('results');
const canvas        = document.getElementById('previewCanvas');
const ctx           = canvas.getContext('2d');

// 追蹤最後一次使用者操作是哪個欄位（"count" / "spacing"）
let lastAction = null;

// 切換包外／實內
measureSwitch.addEventListener('change', () => {
  const checked = measureSwitch.checked;
  measureSwitch.setAttribute('aria-checked', checked);
  measureLabel.textContent = checked ? '包外 (外徑)' : '實內 (淨內)';
  // 依最後操作欄位重算
  if (lastAction === 'count') countEl.dispatchEvent(new Event('input'));
  else if (lastAction === 'spacing') spacingEl.dispatchEvent(new Event('input'));
});

// 當 總長度 或 寬度 改變時，也要觸發重算
[totalEl, widthEl].forEach(el =>
  el.addEventListener('input', () => {
    if (lastAction === 'count') countEl.dispatchEvent(new Event('input'));
    else if (lastAction === 'spacing') spacingEl.dispatchEvent(new Event('input'));
  })
);

// —— 核心計算函式 ——
// 以「中間柱子數 innerCount」計算間距
function calcSpacing(total, barW, innerCount) {
  // totalBars = innerCount + 2
  // spaces    = innerCount + 1
  return (total - (innerCount + 2) * barW) / (innerCount + 1);
}
// 以「間距 spacing」反算中間柱子數（取 floor，並校正不超過）
function calcInnerCountBySpacing(total, barW, spacing) {
  const raw = (total - spacing - 2 * barW) / (spacing + barW);
  let n = Math.floor(raw);
  if (n < 0) n = 0;
  // 確保算出的真實間距不會小於使用者輸入（也就是不超過）
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

// —— 渲染結果 與 繪圖 ——
// 清空畫面
function clearOutput() {
  resultsEl.innerHTML = '';
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}
// 顯示並繪製
function render(innerCount, spacing) {
  // 更新結果文字
  const html = `
    <h2>結果</h2>
    <p>中間根數 <b>${innerCount}</b> → 間距 <b>${spacing.toFixed(2)}</b> cm（不含端柱）</p>
    <h3>所有可行方案（中間根數 → 間距）</h3>
    <ul>
      ${genAllSchemes(adjTotal(), adjWidth()).map(o =>
        `<li>${o.count} 根 → 間距 ${o.spacing.toFixed(2)} cm</li>`
      ).join('')}
    </ul>
  `;
  resultsEl.innerHTML = html;

  // 調整 canvas 大小並繪圖
  canvas.width  = resultsEl.clientWidth;
  canvas.height = 200;
  drawPreview(adjTotal(), adjWidth(), innerCount, spacing);
}

// 計算調整後的「總長度 L」
function adjTotal() {
  const L0 = parseFloat(totalEl.value) || 0;
  const W  = parseFloat(widthEl.value) || 0;
  return measureSwitch.checked ? L0 + 2 * W : L0;
}
// 取得鐵條寬度
function adjWidth() {
  return parseFloat(widthEl.value) || 0;
}

// 繪製示意圖，左右端為灰色，中間為橘色
function drawPreview(total, barW, innerCount, spacing) {
  const totalBars    = innerCount + 2;
  const padding      = 40;
  const w            = canvas.width;
  const h            = canvas.height;
  const railTopY     = 60;
  const railBottomY  = h - 60;
  const railGap      = 6;    // 雙線橫樑間距
  const scale        = (w - padding * 2) / total;
  const barWpx       = barW * scale;
  const spPx         = spacing * scale;

  // 清空
  ctx.clearRect(0, 0, w, h);

  // 基本設定：深藍色、線寬 2px
  ctx.strokeStyle = '#003366';
  ctx.fillStyle   = '#003366';
  ctx.lineWidth   = 2;
  ctx.textAlign   = 'center';
  ctx.font        = '14px sans-serif';

  // 1. 畫雙線上、下橫樑
  ctx.beginPath();
  // 上橫樑
  ctx.moveTo(padding,         railTopY);
  ctx.lineTo(w - padding,     railTopY);
  ctx.moveTo(padding,         railTopY + railGap);
  ctx.lineTo(w - padding,     railTopY + railGap);
  // 下橫樑
  ctx.moveTo(padding,         railBottomY);
  ctx.lineTo(w - padding,     railBottomY);
  ctx.moveTo(padding,         railBottomY - railGap);
  ctx.lineTo(w - padding,     railBottomY - railGap);
  ctx.stroke();

  // 2. 畫垂直欄杆（端柱灰、中間橘改為深藍細線）
  ctx.lineWidth = 1.5;
  for (let i = 0, x = padding; i < totalBars; i++) {
    ctx.beginPath();
    ctx.moveTo(x + barWpx / 2, railTopY + railGap);
    ctx.lineTo(x + barWpx / 2, railBottomY - railGap);
    ctx.stroke();
    x += barWpx + spPx;
  }

  // 3. 畫尺寸虛線
  const dimY = railTopY - 30;
  ctx.setLineDash([5, 3]);
  ctx.beginPath();
  ctx.moveTo(padding, dimY);
  ctx.lineTo(w - padding, dimY);
  ctx.stroke();
  ctx.setLineDash([]);

  // 4. 畫尺寸延伸線
  ctx.beginPath();
  ctx.moveTo(padding, dimY);
  ctx.lineTo(padding, railTopY);
  ctx.moveTo(w - padding, dimY);
  ctx.lineTo(w - padding, railTopY);
  ctx.stroke();

  // 5. 畫尺寸箭頭
  const arrowSize = 6;
  // 左箭頭
  ctx.beginPath();
  ctx.moveTo(padding, dimY);
  ctx.lineTo(padding + arrowSize, dimY - arrowSize);
  ctx.moveTo(padding, dimY);
  ctx.lineTo(padding + arrowSize, dimY + arrowSize);
  // 右箭頭
  ctx.moveTo(w - padding, dimY);
  ctx.lineTo(w - padding - arrowSize, dimY - arrowSize);
  ctx.moveTo(w - padding, dimY);
  ctx.lineTo(w - padding - arrowSize, dimY + arrowSize);
  ctx.stroke();

  // 6. 標註總長度文字
  ctx.fillStyle = '#003366';
  ctx.font = '16px sans-serif';
  ctx.fillText(
    `${total.toFixed(2)} cm`,
    w / 2,
    dimY - 10
  );
}

// —— 綁定使用者輸入 ——
// 「指定根數」輸入
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
// 「指定間距」輸入
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

// 第一次載入時，清空畫面
clearOutput();
