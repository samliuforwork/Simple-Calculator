const DIM_WIDTH = 100;

function parseNumberList(raw) {
  if (!raw) return [];
  return raw
    .split(/[\n,，、;；]+/)
    .map(str => str.trim())
    .filter(Boolean)
    .map(str => parseFloat(str))
    .filter(num => Number.isFinite(num));
}

function formatNumber(value) {
  return Number.isFinite(value) ? value.toFixed(2) : '—';
}

function calcLength(dx, dy) {
  return Math.hypot(dx, dy);
}

export function initColumnVisualizer() {
  const form = document.getElementById('columnForm');
  const resultsEl = document.getElementById('columnResults');
  const canvas = document.getElementById('columnCanvas');
  if (!form || !resultsEl || !canvas) return;

  const ctx = canvas.getContext('2d');
  let lastModel = null;

  const heightListRow = document.getElementById('heightListRow');
  const hStartRow = document.getElementById('hStartRow');
  const hEndRow = document.getElementById('hEndRow');
  const customSpansRow = document.getElementById('customSpansRow');
  const totalLengthRow = document.getElementById('totalLengthRow');

  function getHeightMode() {
    return form.querySelector('input[name="heightMode"]:checked')?.value || 'slopeAuto';
  }

  function getLengthMode() {
    return form.querySelector('input[name="lengthMode"]:checked')?.value || 'totalEven';
  }

  function syncFormStates() {
    const heightMode = getHeightMode();
    if (heightMode === 'customHeights') {
      heightListRow?.classList.remove('is-hidden');
      hStartRow?.classList.add('is-hidden');
      hEndRow?.classList.add('is-hidden');
    } else {
      heightListRow?.classList.add('is-hidden');
      hStartRow?.classList.remove('is-hidden');
      hEndRow?.classList.remove('is-hidden');
    }

    const lengthMode = getLengthMode();
    const useCustomSpans = lengthMode === 'customSpans';
    customSpansRow?.classList.toggle('is-hidden', !useCustomSpans);
    totalLengthRow?.classList.toggle('is-hidden', useCustomSpans);
  }

  form.querySelectorAll('input[name="heightMode"]').forEach(input => {
    input.addEventListener('change', syncFormStates);
  });

  form.querySelectorAll('input[name="lengthMode"]').forEach(input => {
    input.addEventListener('change', syncFormStates);
  });

  syncFormStates();

  form.addEventListener('submit', evt => {
    evt.preventDefault();
    const model = buildModel();
    if (!model.ok) {
      lastModel = null;
      resultsEl.innerHTML = `<p class="error">${model.error}</p>`;
      const fallbackDepth = Math.max(1, parseFloat(document.getElementById('columnDepth')?.value) || 100);
      drawEmptyScene(fallbackDepth);
      return;
    }
    lastModel = model.data;
    renderResults(model.data);
    drawDiagram(model.data);
  });

  window.addEventListener('resize', () => {
    if (lastModel) {
      drawDiagram(lastModel);
    }
  });

  function buildModel() {
    const heightMode = getHeightMode();
    const lengthMode = getLengthMode();
    const hStart = parseFloat(document.getElementById('colHStart')?.value);
    const hEnd = parseFloat(document.getElementById('colHEnd')?.value);
    const heightList = document.getElementById('heightList')?.value || '';
    const middleCountRaw = parseInt(document.getElementById('middleCount')?.value, 10);
    const spanList = document.getElementById('spanList')?.value || '';
    const columnDepth = Math.max(1, parseFloat(document.getElementById('columnDepth')?.value) || 100);

    if (!Number.isFinite(columnDepth) || columnDepth <= 0) {
      return { ok: false, error: '請輸入大於 0 的柱截面深度（例如 100 或 200）。' };
    }

    let heights = [];
    let totalColumns = 0;

    if (heightMode === 'customHeights') {
      heights = parseNumberList(heightList);
      if (heights.length < 2) {
        return { ok: false, error: '手動模式至少需要兩支柱的高度。' };
      }
      if (heights.some(v => !Number.isFinite(v) || v <= 0)) {
        return { ok: false, error: '每支柱高度需為大於 0 的數值。' };
      }
      totalColumns = heights.length;
    } else {
      if (!Number.isFinite(hStart) || !Number.isFinite(hEnd)) {
        return { ok: false, error: '請輸入最低點與最高點高度。' };
      }
      const middleCount = Number.isInteger(middleCountRaw) ? Math.max(0, middleCountRaw) : 0;
      totalColumns = Math.max(2, middleCount + 2);
    }

    if (totalColumns < 2) {
      return { ok: false, error: '至少需要 2 支柱子。' };
    }

    let spans = [];
    let totalLength = 0;
    const spanCount = totalColumns - 1;

    if (lengthMode === 'customSpans') {
      spans = parseNumberList(spanList);
      if (spans.length !== spanCount) {
        return { ok: false, error: `目前柱數為 ${totalColumns}（需 ${spanCount} 個跨距），但輸入了 ${spans.length} 個。` };
      }
      if (spans.some(span => !Number.isFinite(span) || span <= 0)) {
        return { ok: false, error: '每跨柱距必須為正值。' };
      }
      totalLength = spans.reduce((sum, span) => sum + span, 0);
    } else {
      const totalLengthVal = parseFloat(document.getElementById('colTotalLength')?.value);
      if (!Number.isFinite(totalLengthVal) || totalLengthVal <= 0) {
        return { ok: false, error: '請輸入正確的總長度。' };
      }
      totalLength = totalLengthVal;
      const span = totalLength / spanCount;
      spans = Array(spanCount).fill(span);
    }

    if (totalLength <= 0) {
      return { ok: false, error: '資料有誤，請檢查高度或距離設定。' };
    }

    const positions = [0];
    let run = 0;
    spans.forEach(span => {
      run += span;
      positions.push(run);
    });

    if (heightMode === 'slopeAuto') {
      const totalRun = positions[positions.length - 1];
      if (totalRun <= 0) {
        return { ok: false, error: '總長度需大於 0。' };
      }
      heights = positions.map(pos => hStart + (hEnd - hStart) * (pos / totalRun));
    } else if (heights.length !== positions.length) {
      return { ok: false, error: '高度數量需與柱數一致。' };
    }

    const columns = heights.map((height, idx) => ({
      index: idx + 1,
      x: positions[idx],
      height,
    }));

    const beams = [];
    for (let i = 0; i < columns.length - 1; i++) {
      const dx = spans[i];
      const dy = columns[i + 1].height - columns[i].height;
      const length = calcLength(dx, dy);
      const slopeRad = Math.atan2(dy, dx);
      const slopeDeg = slopeRad * (180 / Math.PI);
      const deltaH = DIM_WIDTH * Math.tan(slopeRad);
      beams.push({
        from: columns[i].index,
        to: columns[i + 1].index,
        dx,
        dy,
        length,
        slopeRad,
        slopeDeg,
        deltaH,
      });
    }

    const totalRun = positions[positions.length - 1];
    return {
      ok: true,
      data: {
        heights,
        spans,
        positions,
        totalRun,
        columnDepth,
        columns,
        beams,
        middleCount: Math.max(columns.length - 2, 0),
      },
    };
  }

  function renderResults(model) {
    const { columns, totalRun, beams, middleCount } = model;
    const positions = columns.map(col => col.x);
    const summary = `
      <div>計算結果（與輸入高度 / 距離同單位）：</div>
      <div class="muted" style="margin-top:4px;">
        整體共 <b>${columns.length}</b> 支柱子，中間柱 <b>${middleCount}</b> 支。<br>
        總長度 ≈ <b>${formatNumber(totalRun)}</b>。<br>
        柱截面深度僅影響圖面顯示，不影響柱寬兩端高差 ΔH。<br>
        ΔH 以固定標註寬度 <b>${DIM_WIDTH} mm</b> 計算。
      </div>
    `;

    const posRows = columns.map((col, idx) => {
      const prevX = idx === 0 ? 0 : positions[idx - 1];
      const dx = idx === 0 ? 0 : col.x - prevX;
      const label = col.index === 1
        ? '柱1（起點）'
        : col.index === columns.length
        ? `柱${col.index}（終點）`
        : `柱${col.index}`;
      return `
        <tr>
          <td>${label}</td>
          <td>${formatNumber(col.x)}</td>
          <td>${idx === 0 ? '—' : formatNumber(dx)}</td>
        </tr>
      `;
    }).join('');

    const heightRows = columns.map(col => {
      const label = col.index === 1
        ? '柱1（起點）'
        : col.index === columns.length
        ? `柱${col.index}（終點）`
        : `柱${col.index}`;
      const cls = col.index === 1 || col.index === columns.length ? 'highlight' : '';
      return `
        <tr>
          <td>${label}</td>
          <td class="${cls}">${formatNumber(col.height)}</td>
        </tr>
      `;
    }).join('');

    const beamRows = beams.map(beam => `
      <tr>
        <td>柱${beam.from} → 柱${beam.to}</td>
        <td class="highlight">${formatNumber(beam.length)}</td>
        <td>${formatNumber(beam.slopeDeg)}</td>
        <td>${formatNumber(beam.dy)}</td>
        <td>${formatNumber(beam.dx)}</td>
      </tr>
    `).join('');

    const deltaRows = beams.map(beam => {
      const absDelta = Math.abs(beam.deltaH);
      const half = absDelta / 2;
      return `
        <tr>
          <td>柱${beam.from} → 柱${beam.to}</td>
          <td class="highlight">${formatNumber(absDelta)}</td>
          <td>${formatNumber(half)}</td>
        </tr>
      `;
    }).join('');

    resultsEl.innerHTML = `
      ${summary}
      <div class="section-title">柱位置尺寸（工程標註用）</div>
      <table>
        <thead>
          <tr>
            <th>柱號</th>
            <th>距柱1距離 X</th>
            <th>與前一柱柱距</th>
          </tr>
        </thead>
        <tbody>${posRows}</tbody>
      </table>

      <div class="section-title">各柱高度</div>
      <table>
        <thead>
          <tr>
            <th>柱號</th>
            <th>高度</th>
          </tr>
        </thead>
        <tbody>${heightRows}</tbody>
      </table>

      <div class="section-title">各跨 H 鋼斜梁</div>
      <table>
        <thead>
          <tr>
            <th>跨別</th>
            <th>斜長</th>
            <th>坡度 (°)</th>
            <th>高差（兩柱中心）</th>
            <th>水平距離（柱距）</th>
          </tr>
        </thead>
        <tbody>${beamRows}</tbody>
      </table>

      <div class="section-title">柱寬兩端高差 ΔH（標註寬度 ${DIM_WIDTH}mm）</div>
      <table>
        <thead>
          <tr>
            <th>跨別</th>
            <th>同一柱寬度兩端高差 ΔH</th>
            <th>ΔH ÷ 2</th>
          </tr>
        </thead>
        <tbody>${deltaRows}</tbody>
      </table>

      <div class="muted" style="margin-top:4px;">
        ΔH 以固定標註寬度 ${DIM_WIDTH}mm 計算，所以你把 H100 換成 H200，ΔH 不會變。<br>
        Canvas 上橘色斜線 = 斜梁在柱寬上的實際斜接線，只是視覺示意，與計算用標註寬度獨立。
      </div>
    `;
  }

  function drawEmptyScene(columnDepth = 100) {
    drawDiagram({
      columns: [],
      spans: [],
      totalRun: 0,
      columnDepth,
      beams: [],
    });
  }

  function drawDiagram(model) {
    const { columns, spans, totalRun, columnDepth, beams } = model;
    const dpr = window.devicePixelRatio || 1;
    const displayWidth = canvas.clientWidth || canvas.width;
    const displayHeight = canvas.clientHeight || canvas.height;

    if (canvas.width !== displayWidth * dpr || canvas.height !== displayHeight * dpr) {
      canvas.width = displayWidth * dpr;
      canvas.height = displayHeight * dpr;
    }

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    const w = displayWidth;
    const h = displayHeight;
    ctx.clearRect(0, 0, w, h);

    const margin = 50;
    const groundY = h - 60;
    const topPadding = 40;

    if (!columns || columns.length < 2 || totalRun <= 0) {
      ctx.strokeStyle = '#6b7280';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(margin, groundY);
      ctx.lineTo(w - margin, groundY);
      ctx.stroke();
      return;
    }

    const scaleX = (w - margin * 2) / Math.max(totalRun, 1);
    const maxH = Math.max(...columns.map(col => col.height), 1);
    const scaleY = (groundY - topPadding) / maxH;
    const halfD = columnDepth / 2;

    const worldToScreenX = x => margin + x * scaleX;
    const worldToScreenY = hVal => groundY - hVal * scaleY;

    ctx.strokeStyle = '#4c566a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin, groundY);
    ctx.lineTo(w - margin, groundY);
    ctx.stroke();

    ctx.font = '12px sans-serif';
    ctx.textAlign = 'center';

    const screenColumns = columns.map(col => {
      const cx = worldToScreenX(col.x);
      const colHeight = col.height * scaleY;
      const yTop = groundY - colHeight;
      const xLeft = worldToScreenX(col.x - halfD);
      const xRight = worldToScreenX(col.x + halfD);
      const widthPx = Math.max(xRight - xLeft, 4);

      ctx.fillStyle = '#d1fae5';
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(xLeft, yTop, widthPx, groundY - yTop);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = '#1e2a35';
      ctx.fillText(`${formatNumber(col.height)} mm`, cx, yTop - 8);
      ctx.fillStyle = '#4b5563';
      ctx.fillText(`柱${col.index}`, cx, groundY + 14);

      return { ...col, cx, xLeft, xRight, yTop, yBottom: groundY };
    });

    ctx.strokeStyle = '#b66d0d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    screenColumns.forEach((col, idx) => {
      if (idx === 0) ctx.moveTo(col.cx, col.yTop);
      else ctx.lineTo(col.cx, col.yTop);
    });
    ctx.stroke();

    ctx.fillStyle = '#d97706';
    beams.forEach((beam, idx) => {
      const a = screenColumns[idx];
      const b = screenColumns[idx + 1];
      const mx = (a.cx + b.cx) / 2;
      const my = (a.yTop + b.yTop) / 2;
      ctx.fillText(`L${beam.from}-${beam.to} ≈ ${formatNumber(beam.length)}`, mx, my - 6);
    });

    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.5;
    beams.forEach((beam, idx) => {
      const tanTheta = Math.tan(beam.slopeRad);
      const leftCol = columns[idx];
      const rightCol = columns[idx + 1];

      const leftXLeft = worldToScreenX(leftCol.x - halfD);
      const leftXRight = worldToScreenX(leftCol.x + halfD);
      const leftYStart = worldToScreenY(leftCol.height - tanTheta * halfD);
      const leftYEnd = worldToScreenY(leftCol.height + tanTheta * halfD);
      ctx.beginPath();
      ctx.moveTo(leftXLeft, leftYStart);
      ctx.lineTo(leftXRight, leftYEnd);
      ctx.stroke();

      const rightXLeft = worldToScreenX(rightCol.x - halfD);
      const rightXRight = worldToScreenX(rightCol.x + halfD);
      const rightYStart = worldToScreenY(rightCol.height - tanTheta * halfD);
      const rightYEnd = worldToScreenY(rightCol.height + tanTheta * halfD);
      ctx.beginPath();
      ctx.moveTo(rightXLeft, rightYStart);
      ctx.lineTo(rightXRight, rightYEnd);
      ctx.stroke();
    });

    const drawVerticalDim = (screenCol, side) => {
      const offset = 25;
      const xDim = side === 'left' ? screenCol.cx - offset : screenCol.cx + offset;
      ctx.strokeStyle = '#4b5563';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(xDim, screenCol.yTop);
      ctx.lineTo(xDim, groundY);
      ctx.stroke();

      const arrow = 4;
      ctx.beginPath();
      ctx.moveTo(xDim, screenCol.yTop);
      ctx.lineTo(xDim - arrow, screenCol.yTop + arrow);
      ctx.moveTo(xDim, screenCol.yTop);
      ctx.lineTo(xDim + arrow, screenCol.yTop + arrow);
      ctx.moveTo(xDim, groundY);
      ctx.lineTo(xDim - arrow, groundY - arrow);
      ctx.moveTo(xDim, groundY);
      ctx.lineTo(xDim + arrow, groundY - arrow);
      ctx.stroke();

      ctx.fillStyle = '#111827';
      ctx.textAlign = side === 'left' ? 'right' : 'left';
      ctx.fillText(`H≈${formatNumber(screenCol.height)}`, xDim + (side === 'left' ? -6 : 6), (screenCol.yTop + groundY) / 2);
    };
    if (screenColumns.length >= 1) {
      drawVerticalDim(screenColumns[0], 'left');
    }
    if (screenColumns.length >= 2) {
      drawVerticalDim(screenColumns[screenColumns.length - 1], 'right');
    }

    const dimYSpans = groundY + 24;
    ctx.strokeStyle = '#374151';
    ctx.fillStyle = '#1f2933';
    ctx.textAlign = 'center';
    const arrow = 5;
    spans.forEach((span, idx) => {
      const startX = screenColumns[idx].cx;
      const endX = screenColumns[idx + 1].cx;
      const mid = (startX + endX) / 2;
      ctx.beginPath();
      ctx.moveTo(startX, dimYSpans);
      ctx.lineTo(endX, dimYSpans);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX, dimYSpans);
      ctx.lineTo(startX + arrow, dimYSpans - arrow);
      ctx.moveTo(startX, dimYSpans);
      ctx.lineTo(startX + arrow, dimYSpans + arrow);
      ctx.moveTo(endX, dimYSpans);
      ctx.lineTo(endX - arrow, dimYSpans - arrow);
      ctx.moveTo(endX, dimYSpans);
      ctx.lineTo(endX - arrow, dimYSpans + arrow);
      ctx.stroke();

      ctx.fillText(formatNumber(span), mid, dimYSpans - 6);
    });

    const startX = worldToScreenX(0);
    const endX = worldToScreenX(totalRun);
    const dimYTotal = groundY + 44;
    ctx.beginPath();
    ctx.moveTo(startX, dimYTotal);
    ctx.lineTo(endX, dimYTotal);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(startX, dimYTotal);
    ctx.lineTo(startX + arrow, dimYTotal - arrow);
    ctx.moveTo(startX, dimYTotal);
    ctx.lineTo(startX + arrow, dimYTotal + arrow);
    ctx.moveTo(endX, dimYTotal);
    ctx.lineTo(endX - arrow, dimYTotal - arrow);
    ctx.moveTo(endX, dimYTotal);
    ctx.lineTo(endX - arrow, dimYTotal + arrow);
    ctx.stroke();
    ctx.fillText(`總長度 ≈ ${formatNumber(totalRun)}`, (startX + endX) / 2, dimYTotal - 6);
  }

  drawEmptyScene();
  resultsEl.innerHTML = '<p class="muted">請輸入參數後按「開始計算」。</p>';
}
