function calcSpacing(total, barW, innerCount) {
  return (total - innerCount * barW) / (innerCount + 1);
}

function calcInnerCountBySpacing(total, barW, spacing) {
  let raw = (total - spacing) / (barW + spacing);
  let n = Math.floor(raw);
  if (n < 0) n = 0;
  while (n > 0 && calcSpacing(total, barW, n) < spacing) {
    n--;
  }
  return n;
}

function genAllSchemes(total, barW) {
  const list = [];
  const maxN = Math.floor(total / Math.max(barW, 1));
  for (let i = 0; i <= maxN; i++) {
    const sp = calcSpacing(total, barW, i);
    if (sp >= 0) list.push({ count: i, spacing: sp });
  }
  return list;
}

export function initSpacingCalculator() {
  const totalEl = document.getElementById('totalLength');
  const widthEl = document.getElementById('barWidth');
  const countEl = document.getElementById('inputCount');
  const spacingEl = document.getElementById('inputSpacing');
  const resultsEl = document.getElementById('spacingResults');
  const canvas = document.getElementById('previewCanvas');
  const form = document.getElementById('spacingForm');
  if (!totalEl || !widthEl || !countEl || !spacingEl || !resultsEl || !canvas || !form) {
    return;
  }

  const ctx = canvas.getContext('2d');
  let lastAction = null;

  form.addEventListener('submit', evt => evt.preventDefault());

  function adjTotal() {
    return parseFloat(totalEl.value) || 0;
  }
  function adjWidth() {
    return parseFloat(widthEl.value) || 0;
  }

  function clearOutput() {
    resultsEl.innerHTML = '<p class="muted">請輸入根數或間距進行計算。</p>';
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function resizeCanvas() {
    const wrapperWidth = canvas.parentElement?.clientWidth || 600;
    canvas.width = wrapperWidth;
    canvas.height = 260;
  }

  function render(innerCount, spacing) {
    const L = adjTotal();
    const W = adjWidth();
    if (!Number.isFinite(spacing) || spacing < 0) {
      clearOutput();
      return;
    }
    resultsEl.innerHTML = `
      <h3>計算結果</h3>
      <p>中間根數 <strong>${innerCount}</strong> → 間距 <strong>${spacing.toFixed(2)}</strong> mm</p>
      <h4>所有可行方案（柱數 → 間距）</h4>
      <ul>
        ${genAllSchemes(L, W).map(o => `<li>${o.count} 根 → 間距 ${o.spacing.toFixed(2)} mm</li>`).join('')}
      </ul>
    `;
    resizeCanvas();
    drawPreview(L, W, innerCount, spacing);
  }

  function drawPreview(totalOuter, barW, innerCount, spacing) {
    const padding = 40;
    const w = canvas.width;
    const h = canvas.height;
    const railTopY = 80;
    const railBotY = h - 80;
    const railGap = 6;
    const available = Math.max(totalOuter, 1);
    const scale = (w - padding * 2) / available;
    const barWpx = barW * scale;
    const spPx = spacing * scale;
    const arrowSize = 6;

    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#003366';
    ctx.fillStyle = '#003366';
    ctx.lineWidth = 2;
    ctx.textAlign = 'center';

    ctx.beginPath();
    ctx.moveTo(padding, railTopY);
    ctx.lineTo(w - padding, railTopY);
    ctx.moveTo(padding, railTopY + railGap);
    ctx.lineTo(w - padding, railTopY + railGap);
    ctx.moveTo(padding, railBotY);
    ctx.lineTo(w - padding, railBotY);
    ctx.moveTo(padding, railBotY - railGap);
    ctx.lineTo(w - padding, railBotY - railGap);
    ctx.stroke();

    for (let i = 0; i < innerCount; i++) {
      const x = padding + (barWpx + spPx) * i + spPx;
      const y = railTopY + railGap;
      const hBar = railBotY - railTopY - railGap * 2;
      ctx.fillRect(x, y, barWpx, hBar);
    }

    const dimY = railTopY - 40;
    ctx.setLineDash([5, 3]);
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

    ctx.beginPath();
    ctx.moveTo(padding, dimY);
    ctx.lineTo(padding + arrowSize, dimY - arrowSize);
    ctx.lineTo(padding + arrowSize, dimY + arrowSize);
    ctx.moveTo(w - padding, dimY);
    ctx.lineTo(w - padding - arrowSize, dimY - arrowSize);
    ctx.lineTo(w - padding - arrowSize, dimY + arrowSize);
    ctx.stroke();

    ctx.font = '16px sans-serif';
    ctx.fillText(`${totalOuter.toFixed(2)} mm`, w / 2, dimY - 10);

    ctx.lineWidth = 1;
    ctx.font = '14px sans-serif';
    for (let j = 0; j <= innerCount; j++) {
      const startX = padding + (barWpx + spPx) * j;
      const endX = startX + spPx;
      const ay = railBotY + 20;

      ctx.beginPath();
      ctx.moveTo(startX, ay);
      ctx.lineTo(endX, ay);
      ctx.stroke();

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

      ctx.fillText(`${spacing.toFixed(2)}`, (startX + endX) / 2, ay - 8);
    }
  }

  countEl.addEventListener('input', () => {
    lastAction = 'count';
    const n = parseInt(countEl.value, 10);
    if (!isNaN(n)) {
      const s = calcSpacing(adjTotal(), adjWidth(), n);
      spacingEl.value = s.toFixed(2);
      render(n, s);
    } else {
      clearOutput();
    }
  });

  spacingEl.addEventListener('input', () => {
    lastAction = 'spacing';
    const s = parseFloat(spacingEl.value);
    if (!isNaN(s)) {
      const n = calcInnerCountBySpacing(adjTotal(), adjWidth(), s);
      countEl.value = n;
      render(n, calcSpacing(adjTotal(), adjWidth(), n));
    } else {
      clearOutput();
    }
  });

  [totalEl, widthEl].forEach(el => {
    el.addEventListener('input', () => {
      if (lastAction === 'count') {
        countEl.dispatchEvent(new Event('input'));
      } else if (lastAction === 'spacing') {
        spacingEl.dispatchEvent(new Event('input'));
      } else {
        clearOutput();
      }
    });
  });

  clearOutput();
}
