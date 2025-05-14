// script.js
const form = document.getElementById('calcForm');
const totalEl = document.getElementById('totalLength');
const widthEl = document.getElementById('barWidth');
const measureSwitch = document.getElementById('measureSwitch');
const measureLabel = document.getElementById('measureLabel');
const countEl = document.getElementById('inputCount');
const spacingEl = document.getElementById('inputSpacing');
const resultsEl = document.getElementById('results');
const canvas = document.getElementById('previewCanvas');
const ctx = canvas.getContext('2d');

measureSwitch.addEventListener('change', e => {
  measureSwitch.setAttribute('aria-checked', measureSwitch.checked);
  measureLabel.textContent = measureSwitch.checked ? '包外 (外徑)' : '實內 (淨內)';
  handleCalc();  // 開關改變也觸發計算
});

function calcSpacing(total, barW, count) {
  return (total - count * barW) / (count - 1);
}

function calcCountBySpacing(total, barW, spacing) {
  const raw = (total + spacing) / (barW + spacing);
  return Math.max(2, Math.floor(raw));
}

function genAllSchemes(total, barW) {
  const schemes = [];
  const maxBars = Math.floor(total / barW);
  for (let c = 2; c <= maxBars; c++) {
    const sp = (total - c * barW) / (c - 1);
    if (sp >= 0) schemes.push({ count: c, spacing: sp });
  }
  return schemes;
}

function drawPreview(total, barW, count, spacing) {
  const padding = 40;
  const w = canvas.width;
  const h = canvas.height;
  const baselineY = h - 40;
  const titleY = 30;
  const gridStep = 50;
  const scale = (w - padding * 2) / total;
  ctx.clearRect(0, 0, w, h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#000';
  ctx.font = '16px sans-serif';
  ctx.fillText(`${count} 根等距排布 (間距 ${spacing.toFixed(2)} cm)`, w / 2, titleY);
  // 畫格線
  ctx.strokeStyle = '#ccc';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  for (let g = 1; g * gridStep < total; g++) {
    const xg = padding + g * gridStep * scale;
    ctx.beginPath();
    ctx.moveTo(xg, titleY + 10);
    ctx.lineTo(xg, baselineY);
    ctx.stroke();
  }
  ctx.setLineDash([]);
  // 底線
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, baselineY);
  ctx.lineTo(w - padding, baselineY);
  ctx.stroke();
  // 0 標記與說明
  ctx.beginPath();
  ctx.moveTo(padding, baselineY);
  ctx.lineTo(padding, baselineY - 10);
  ctx.stroke();
  ctx.font = '14px sans-serif';
  ctx.fillText('0', padding, h - 10);
  ctx.fillText('長度 (cm)', w / 2, h - 10);
  // 畫條
  const barWpx = barW * scale;
  const spPx = spacing * scale;
  ctx.fillStyle = '#FFA500';
  const barH = 60;
  let x = padding;
  for (let i = 0; i < count; i++) {
    ctx.fillRect(x, baselineY - barH, barWpx, barH);
    x += barWpx + spPx;
  }
  // 畫箭頭與間距標註
  ctx.strokeStyle = '#000';
  ctx.lineWidth = 1;
  ctx.textAlign = 'center';
  ctx.font = '14px sans-serif';
  const arrowY = titleY + 40;
  x = padding;
  for (let i = 0; i < count - 1; i++) {
    const startX = x + barWpx;
    const endX = startX + spPx;
    ctx.beginPath();
    ctx.moveTo(startX, arrowY);
    ctx.lineTo(endX, arrowY);
    ctx.stroke();
    // 箭頭
    ctx.beginPath();
    ctx.moveTo(startX, arrowY);
    ctx.lineTo(startX + 6, arrowY - 6);
    ctx.moveTo(startX, arrowY);
    ctx.lineTo(startX + 6, arrowY + 6);
    ctx.moveTo(endX, arrowY);
    ctx.lineTo(endX - 6, arrowY - 6);
    ctx.moveTo(endX, arrowY);
    ctx.lineTo(endX - 6, arrowY + 6);
    ctx.stroke();
    ctx.fillText(`${spacing.toFixed(2)} cm`, (startX + endX) / 2, arrowY - 10);
    x += barWpx + spPx;
  }
}

// 抽成獨立函式，方便多點觸發
function handleCalc(e) {
  if (e && e.preventDefault) e.preventDefault();
  const L0 = parseFloat(totalEl.value);
  const W  = parseFloat(widthEl.value);
  if (isNaN(L0) || isNaN(W)) {
    resultsEl.innerHTML = ''; 
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  let L = L0;
  if (measureSwitch.checked) {
    L += 2 * W;
  }

  const userCount   = parseInt(countEl.value, 10);
  const userSpacing = parseFloat(spacingEl.value);

  let html = '<h2>結果</h2>';
  let lastCount, lastSpacing;

  if (!isNaN(userCount) && userCount >= 2) {
    const sp = calcSpacing(L, W, userCount);
    html += `<p>指定根數 <b>${userCount}</b> → 間距 ${sp.toFixed(2)} cm</p>`;
    lastCount   = userCount;
    lastSpacing = sp;
  }

  if (!isNaN(userSpacing) && userSpacing >= 0) {
    const c = calcCountBySpacing(L, W, userSpacing);
    html += `<p>指定間距 ${userSpacing.toFixed(2)} cm → 根數 ${c} 根</p>`;
  }

  html += '<h3>所有可行方案</h3><ul>';
  genAllSchemes(L, W).forEach(o => {
    html += `<li>${o.count} 根 → 間距 ${o.spacing.toFixed(2)} cm</li>`;
  });
  html += '</ul>';

  resultsEl.innerHTML = html;

  if (lastCount && lastSpacing >= 0) {
    canvas.width  = resultsEl.clientWidth;
    canvas.height = 150;
    drawPreview(L, W, lastCount, lastSpacing);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

// 1) Submit 時觸發
form.addEventListener('submit', handleCalc);

// 2) 輸入時自動觸發
[ totalEl, widthEl, countEl, spacingEl ].forEach(el => {
  el.addEventListener('input', handleCalc);
});
