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

measureSwitch.addEventListener('change', () => {
  measureSwitch.setAttribute('aria-checked', measureSwitch.checked);
  measureLabel.textContent = measureSwitch.checked ? '包外 (外徑)' : '實內 (淨內)';
  handleCalc();
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
  const scale = (w - padding * 2) / total;
  ctx.clearRect(0, 0, w, h);

  ctx.textAlign = 'center';
  ctx.fillStyle = '#000';
  ctx.font = '16px sans-serif';
  ctx.fillText(`${count} 根等距排布 (間距 ${spacing.toFixed(2)} cm)`, w / 2, titleY);

  ctx.strokeStyle = '#000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(padding, baselineY);
  ctx.lineTo(w - padding, baselineY);
  ctx.stroke();

  const barWpx = barW * scale;
  const spPx = spacing * scale;
  ctx.fillStyle = '#FFA500';
  const barH = 60;
  let x = padding;
  for (let i = 0; i < count; i++) {
    ctx.fillRect(x, baselineY - barH, barWpx, barH);
    x += barWpx + spPx;
  }

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

function handleCalc(e) {
  if (e && e.preventDefault) e.preventDefault();

  const L0 = parseFloat(totalEl.value);
  const W  = parseFloat(widthEl.value);
  if (isNaN(L0) || isNaN(W)) {
    resultsEl.innerHTML = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  let L = L0 + (measureSwitch.checked ? 2 * W : 0);

  const userCount   = parseInt(countEl.value, 10);
  const userSpacing = parseFloat(spacingEl.value);

  let lastCount, lastSpacing;
  let html = '<h2>結果</h2>';

  if (!isNaN(userCount) && userCount >= 2) {
    lastCount   = userCount;
    lastSpacing = calcSpacing(L, W, lastCount);
    spacingEl.value = lastSpacing.toFixed(2);
    html += `<p>指定根數 <b>${lastCount}</b> → 間距 <b>${lastSpacing.toFixed(2)}</b> cm</p>`;
  }
  else if (!isNaN(userSpacing) && userSpacing >= 0) {
    lastSpacing = userSpacing;
    lastCount   = calcCountBySpacing(L, W, lastSpacing);
    countEl.value = lastCount;
    html += `<p>指定間距 <b>${lastSpacing.toFixed(2)}</b> cm → 根數 <b>${lastCount}</b> 根</p>`;
  } else {
    resultsEl.innerHTML = '';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  // 加回「所有可行方案」
  html += '<h3>所有可行方案</h3><ul>';
  genAllSchemes(L, W).forEach(o => {
    html += `<li>${o.count} 根 → 間距 ${o.spacing.toFixed(2)} cm</li>`;
  });
  html += '</ul>';

  resultsEl.innerHTML = html;

  canvas.width  = resultsEl.clientWidth;
  canvas.height = 150;
  drawPreview(L, W, lastCount, lastSpacing);
}

form.addEventListener('submit', handleCalc);
[ totalEl, widthEl, countEl, spacingEl ].forEach(el => {
  el.addEventListener('input', handleCalc);
});
