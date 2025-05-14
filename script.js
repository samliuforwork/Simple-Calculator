// 取得 DOM
const form = document.getElementById('calcForm');
const totalEl = document.getElementById('totalLength');
const widthEl = document.getElementById('barWidth');
const typeEls = document.getElementsByName('measureType');
const countEl = document.getElementById('inputCount');
const spacingEl = document.getElementById('inputSpacing');
const resultsEl = document.getElementById('results');

// 主計算函式：指定根數 → 計算間距
function calcSpacing(total, barW, count) {
  return (total - count * barW) / (count - 1);
}

// 反向計算函式：指定間距 → 最接近且不超根數
function calcCountBySpacing(total, barW, spacing) {
  // count = floor((total + spacing) / (barW + spacing))
  const raw = (total + spacing) / (barW + spacing);
  return Math.max(2, Math.floor(raw));
}

// 產生所有方案：列出 count=2..max 的間距
function genAllSchemes(total, barW) {
  const schemes = [];
  const maxBars = Math.floor(total / barW);
  for (let c = 2; c <= maxBars; c++) {
    const sp = calcSpacing(total, barW, c);
    if (sp >= 0) schemes.push({ count: c, spacing: sp });
  }
  return schemes;
}

// 取得量測類型：outer or inner
function getMeasureType() {
  for (let el of typeEls) {
    if (el.checked) return el.value;
  }
  return 'outer';
}

// 處理表單送出
form.addEventListener('submit', e => {
  e.preventDefault();
  let L = parseFloat(totalEl.value);
  const W = parseFloat(widthEl.value);
  const measure = getMeasureType();

  // 若是實內 (inner)，將內徑轉為外徑：outer = inner + 2 * barWidth
  if (measure === 'inner') {
    L = L + 2 * W;
  }

  let html = `<h2>結果</h2>`;

  // 1) 若有指定根數
  const userCount = parseInt(countEl.value, 10);
  if (!isNaN(userCount) && userCount >= 2) {
    const sp = calcSpacing(L, W, userCount);
    html += `<p>指定根數 <b>${userCount}</b> → 間距 ${sp.toFixed(2)} cm</p>`;
  }

  // 2) 若有指定間距
  const userSpacing = parseFloat(spacingEl.value);
  if (!isNaN(userSpacing) && userSpacing >= 0) {
    const c = calcCountBySpacing(L, W, userSpacing);
    html += `<p>指定間距 ${userSpacing.toFixed(2)} cm → 根數 ${c} 根</p>`;
  }

  // 3) 顯示所有可行方案
  html += `<h3>所有可行方案</h3><ul>`;
  genAllSchemes(L, W).forEach(o => {
    html += `<li>${o.count} 根 → 間距 ${o.spacing.toFixed(2)} cm</li>`;
  });
  html += `</ul>`;

  resultsEl.innerHTML = html;
});
