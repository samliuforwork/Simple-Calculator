import { initTabs } from './js/tabs.js';
import { initSpacingCalculator } from './js/simpleSpacing.js';
import { initColumnVisualizer } from './js/columnVisualizer.js';

document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initColumnVisualizer();
  initSpacingCalculator();
});
