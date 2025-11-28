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

export function initColumnVisualizer() {
  const form = document.getElementById('columnForm');
  const resultsEl = document.getElementById('columnResults');
  const canvas = document.getElementById('columnCanvas');
  if (!form || !resultsEl || !canvas) return;

  const ctx = canvas.getContext('2d');
  let lastModel = null;

  const heightListRow = document.getElementById('heightListRow');
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
    } else {
      heightListRow?.classList.add('is-hidden');
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
      ctx.clearRect(0, 0, canvas.width, canvas.height);
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
    const totalLength = parseFloat(document.getElementById('colTotalLength')?.value);
    const spanList = document.getElementById('spanList')?.value || '';
    const columnDepth = Math.max(1, parseFloat(document.getElementById('columnDepth')?.value) || 100);

    let heights = [];
    if (heightMode === 'customHeights') {
      heights = parseNumberList(heightList);
      if (heights.length < 2) {
        return { ok: false, error: '手動模式至少需要兩支柱的高度。' };
      }
    } else {
      if (!Number.isFinite(hStart) || !Number.isFinite(hEnd)) {
        return { ok: false, error: '請輸入最低點與最高點高度。' };
      }
      let middleCount = Number.isInteger(middleCountRaw) ? Math.max(0, middleCountRaw) : 0;
      const totalColumns = Math.max(2, middleCount + 2);
      const delta = (hEnd - hStart) / (totalColumns - 1);
      heights = Array.from({ length: totalColumns }, (_, idx) => hStart + delta * idx);
    }

    const columnCount = heights.length;
    const spanCount = columnCount - 1;
    if (spanCount <= 0) {
      return { ok: false, error: '需要至少兩支柱才能計算跨度。' };
    }

    let spans = [];
    if (lengthMode === 'customSpans') {
      spans = parseNumberList(spanList);
      if (spans.length !== spanCount) {
        return {
          ok: false,
          error: `目前柱數為 ${columnCount}（需 ${spanCount} 個跨距），但輸入了 ${spans.length} 個。`,
        };
      }
      if (spans.some(span => span <= 0)) {
        return { ok: false, error: '每跨柱距必須為正值。' };
      }
    } else {
      if (!Number.isFinite(totalLength) || totalLength <= 0) {
        return { ok: false, error: '請輸入正確的總長度。' };
      }
      const evenSpan = totalLength / spanCount;
      spans = Array(spanCount).fill(evenSpan);
    }

    const positions = [0];
    let run = 0;
    spans.forEach(span => {
      run += span;
      positions.push(run);
    });

    const maxHeight = Math.max(...heights);
    return {
      ok: true,
      data: {
        heights,
        spans,
        positions,
        totalRun: run,
        columnDepth,
        maxHeight,
      },
    };
  }

  function renderResults(model) {
    const { heights, spans, positions, totalRun, maxHeight } = model;
    const rows = heights.map((height, idx) => {
      const spanToHere = idx === 0 ? 0 : spans[idx - 1];
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${formatNumber(positions[idx])}</td>
          <td>${formatNumber(height)}</td>
          <td>${idx === 0 ? '—' : formatNumber(spanToHere)}</td>
        </tr>
      `;
    }).join('');

    resultsEl.innerHTML = `
      <div class="summary">
        <p><strong>總柱數：</strong>${heights.length} 支</p>
        <p><strong>總長度：</strong>${formatNumber(totalRun)} mm</p>
        <p><strong>最高柱：</strong>${formatNumber(maxHeight)} mm</p>
      </div>
      <table>
        <thead>
          <tr>
            <th>柱序</th>
            <th>水平位置 (mm)</th>
            <th>高度 (mm)</th>
            <th>前一跨距 (mm)</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  function drawDiagram(model) {
    const { heights, positions, spans, totalRun, columnDepth } = model;
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

    const marginX = 60;
    const topPadding = 40;
    const groundY = h - 70;

    const drawHeight = Math.max(...heights, 1);
    const scaleY = (groundY - topPadding) / drawHeight;
    const run = Math.max(totalRun, 1);
    const scaleX = (w - marginX * 2) / run;
    const depthPx = Math.max(6, columnDepth * scaleX);

    ctx.strokeStyle = '#4c566a';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(marginX, groundY);
    ctx.lineTo(w - marginX, groundY);
    ctx.stroke();

    ctx.fillStyle = '#355c7d';
    heights.forEach((height, idx) => {
      const xCenter = marginX + positions[idx] * scaleX;
      const colHeight = height * scaleY;
      const x = xCenter - depthPx / 2;
      const y = groundY - colHeight;
      ctx.fillRect(x, y, depthPx, colHeight);

      ctx.fillStyle = '#1e2a35';
      ctx.font = '12px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(`${formatNumber(height)} mm`, xCenter, y - 8);
      ctx.fillStyle = '#355c7d';
    });

    ctx.strokeStyle = '#b66d0d';
    ctx.lineWidth = 3;
    ctx.beginPath();
    heights.forEach((height, idx) => {
      const xCenter = marginX + positions[idx] * scaleX;
      const y = groundY - height * scaleY;
      if (idx === 0) {
        ctx.moveTo(xCenter, y);
      } else {
        ctx.lineTo(xCenter, y);
      }
    });
    ctx.stroke();

    ctx.strokeStyle = '#d08b39';
    ctx.lineWidth = 1;
    heights.forEach((height, idx) => {
      if (idx === 0) return;
      const prevX = marginX + positions[idx - 1] * scaleX + depthPx / 2;
      const currX = marginX + positions[idx] * scaleX - depthPx / 2;
      const prevY = groundY - heights[idx - 1] * scaleY;
      const currY = groundY - height * scaleY;
      ctx.beginPath();
      ctx.moveTo(prevX, prevY);
      ctx.lineTo(currX, currY);
      ctx.stroke();
    });

    const dimY = groundY + 30;
    ctx.strokeStyle = '#1f2933';
    ctx.fillStyle = '#1f2933';
    ctx.lineWidth = 1;
    ctx.textAlign = 'center';
    ctx.font = '12px sans-serif';
    const arrow = 6;
    spans.forEach((span, idx) => {
      const startX = marginX + positions[idx] * scaleX;
      const endX = marginX + positions[idx + 1] * scaleX;
      ctx.beginPath();
      ctx.moveTo(startX, dimY);
      ctx.lineTo(endX, dimY);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(startX, dimY);
      ctx.lineTo(startX + arrow, dimY - arrow);
      ctx.lineTo(startX + arrow, dimY + arrow);
      ctx.moveTo(endX, dimY);
      ctx.lineTo(endX - arrow, dimY - arrow);
      ctx.lineTo(endX - arrow, dimY + arrow);
      ctx.stroke();

      ctx.fillText(`${formatNumber(span)} mm`, (startX + endX) / 2, dimY - 6);
    });

    ctx.lineWidth = 1;
    ctx.setLineDash([5, 4]);
    ctx.beginPath();
    ctx.moveTo(marginX, topPadding);
    ctx.lineTo(marginX, groundY);
    ctx.moveTo(w - marginX, topPadding);
    ctx.lineTo(w - marginX, groundY);
    ctx.stroke();
    ctx.setLineDash([]);
  }
}
