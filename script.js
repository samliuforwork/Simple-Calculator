const form = document.getElementById('calcForm');
const totalEl = document.getElementById('totalLength');
const widthEl = document.getElementById('barWidth');
const measureSwitch = document.getElementById('measureSwitch');
const measureLabel = document.getElementById('measureLabel');
const countEl = document.getElementById('inputCount');
const spacingEl = document.getElementById('inputSpacing');
const resultsEl = document.getElementById('results');

measureSwitch.addEventListener('change', () => {
  const isOuter = measureSwitch.checked;
  measureSwitch.setAttribute('aria-checked', isOuter);
  measureLabel.textContent = isOuter ? '包外 (外徑)' : '實內 (淨內)';
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
    const sp = calcSpacing(total, barW, c);
    if (sp >= 0) schemes.push({ count: c, spacing: sp });
  }
  return schemes;
}

form.addEventListener('submit', e => {
  e.preventDefault();
  let L = parseFloat(totalEl.value);
  const W = parseFloat(widthEl.value);
  if (!measureSwitch.checked) {
    // unchecked = outer; checked = inner
  } else {
    // inner → convert to outer
    L += 2 * W;
  }

  let html = `<h2>結果</h2>`;
  const userCount = parseInt(countEl.value, 10);
  if (!isNaN(userCount) && userCount >= 2) {
    const sp = calcSpacing(L, W, userCount);
    html += `<p>指定根數 <b>${userCount}</b> → 間距 ${sp.toFixed(2)} cm</p>`;
  }

  const userSpacing = parseFloat(spacingEl.value);
  if (!isNaN(userSpacing) && userSpacing >= 0) {
    const c = calcCountBySpacing(L, W, userSpacing);
    html += `<p>指定間距 ${userSpacing.toFixed(2)} cm → 根數 ${c} 根</p>`;
  }

  html += `<h3>所有可行方案</h3><ul>`;
  genAllSchemes(L, W).forEach(o => {
    html += `<li>${o.count} 根 → 間距 ${o.spacing.toFixed(2)} cm</li>`;
  });
  html += `</ul>`;
  resultsEl.innerHTML = html;
});
