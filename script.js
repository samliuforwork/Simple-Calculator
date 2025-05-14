// script.js
function calculateBarSpacing(totalLength, barWidth) {
  const results = [];
  const maxBars = Math.floor(totalLength / barWidth);
  for (let count = 2; count <= maxBars; count++) {
    const spacing = (totalLength - count * barWidth) / (count - 1);
    if (spacing >= 0) results.push({ count, spacing });
  }
  return results;
}

document.getElementById('calcForm').addEventListener('submit', e => {
  e.preventDefault();
  const L = parseFloat(document.getElementById('totalLength').value);
  const W = parseFloat(document.getElementById('barWidth').value);
  const out = calculateBarSpacing(L, W);
  const container = document.getElementById('results');
  container.innerHTML = '<h2>排布方案</h2>' +
    '<ul>' + out.map(o => 
      `<li>${o.count} 根 → 間距 ${o.spacing.toFixed(2)} cm</li>`
    ).join('') + '</ul>';
});

