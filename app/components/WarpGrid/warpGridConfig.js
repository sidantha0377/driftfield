export const STORAGE_KEY = 'warpgrid.settings';

export const DIGITS = '0123456789';
export const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
export const PHRASE = 'WARP GRID ';

export const FONTS = {
  mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
  courier: '"Courier New", Courier, monospace',
  sans: '"DM Sans", system-ui, sans-serif',
  serif: '"Newsreader", Georgia, serif',
};

export const DEFAULTS = {
  mode: 'digits',
  fontSize: 5,
  font: 'courier',
  shuffle: 0,
  spacing: 10,
  dotColor: '#585858',
  background: '#0a0a0a',
  originX: 50,
  originY: 50,
  expansion: 100,
  feathering: 100,
  wave: true,
  speed: 10.5,
  length: 60,
  force: 10,
  ripples: 1,
  waveGlow: '#e8e8e8',
  cursor: true,
  cursorMode: 'attract',
  radius: 30,
  pull: 13,
  trail: false,
  motionBlur: false,
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const getStartSettings = () =>
  prefersReducedMotion()
    ? { ...DEFAULTS, wave: false, cursor: false }
    : { ...DEFAULTS };

const pct = (v) => v + '%';

export const SCHEMA = [
  {
    title: 'Appearance',
    items: [
      { k: 'mode', t: 'seg', label: 'Mode', opts: [['dots', 'Dots'], ['text', 'Text'], ['digits', 'Digits']] },
      { k: 'fontSize', t: 'range', label: 'Font Size', min: 3, max: 14, step: 1, fmt: (v) => v + 'px' },
      { k: 'font', t: 'seg', label: 'Font', opts: [['mono', 'Mono'], ['courier', 'Courier'], ['sans', 'Sans'], ['serif', 'Serif']] },
      { k: 'shuffle', t: 'range', label: 'Shuffle', min: 0, max: 12, step: 0.5, fmt: (v) => v + '/s' },
      { k: 'spacing', t: 'range', label: 'Spacing', min: 6, max: 40, step: 1, fmt: (v) => String(v) },
      { k: 'dotColor', t: 'color', label: 'Dot Color' },
      { k: 'background', t: 'color', label: 'Background' },
    ],
  },
  {
    title: 'Mask',
    items: [
      { k: 'originX', t: 'range', label: 'Origin X', min: 0, max: 100, step: 1, fmt: pct },
      { k: 'originY', t: 'range', label: 'Origin Y', min: 0, max: 100, step: 1, fmt: pct },
      { k: 'expansion', t: 'range', label: 'Expansion', min: 0, max: 150, step: 1, fmt: pct },
      { k: 'feathering', t: 'range', label: 'Feathering', min: 0, max: 100, step: 1, fmt: pct },
    ],
  },
  {
    title: 'Wave',
    items: [
      { k: 'wave', t: 'toggle', label: 'Wave' },
      { k: 'speed', t: 'range', label: 'Speed', min: 2, max: 20, step: 0.5, fmt: (v) => v.toFixed(1) + 's' },
      { k: 'length', t: 'range', label: 'Length', min: 10, max: 100, step: 1, fmt: pct },
      { k: 'force', t: 'range', label: 'Force', min: 0, max: 40, step: 0.5, fmt: (v) => v.toFixed(1) },
      { k: 'ripples', t: 'range', label: 'Ripples', min: 1, max: 6, step: 1, fmt: (v) => String(v) },
      { k: 'waveGlow', t: 'color', label: 'Wave Glow' },
    ],
  },
  {
    title: 'Cursor',
    items: [
      { k: 'cursor', t: 'toggle', label: 'Cursor' },
      { k: 'cursorMode', t: 'seg', label: 'Mode', opts: [['attract', 'Attract'], ['repel', 'Repulse']] },
      { k: 'radius', t: 'range', label: 'Radius', min: 30, max: 300, step: 5, fmt: (v) => v + 'px' },
      { k: 'pull', t: 'range', label: 'Pull', min: 0, max: 80, step: 1, fmt: (v) => String(v) },
    ],
  },
  { title: 'Trail', items: [{ k: 'trail', t: 'toggle', label: 'Trail' }] },
  { title: 'Motion Blur', items: [{ k: 'motionBlur', t: 'toggle', label: 'Motion Blur' }] },
];

const ITEMS = SCHEMA.flatMap((s) => s.items);

function sanitize(o) {
  const out = {};
  for (const it of ITEMS) {
    const v = o[it.k];
    if (it.t === 'range' && typeof v === 'number' && isFinite(v)) {
      out[it.k] = Math.min(it.max, Math.max(it.min, v));
    } else if (it.t === 'seg' && it.opts.some((p) => p[0] === v)) {
      out[it.k] = v;
    } else if (it.t === 'color' && typeof v === 'string' && /^#[0-9a-f]{6}$/.test(v)) {
      out[it.k] = v;
    } else if (it.t === 'toggle' && typeof v === 'boolean') {
      out[it.k] = v;
    }
  }
  return out;
}

export function loadSettings() {
  const start = getStartSettings();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...start, ...sanitize(JSON.parse(raw)) } : start;
  } catch (e) {
    return start;
  }
}

export function saveSettings(settings) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    /* storage unavailable */
  }
}

export function toCSS(S) {
  const f = (v) => (v ? 'on' : 'off');
  return [
    '/* Warp Grid style. Use with warp-grid.js on <canvas class="warp-grid"></canvas> */',
    '.warp-grid {',
    '  position: fixed;',
    '  inset: 0;',
    '  width: 100%;',
    '  height: 100%;',
    '  z-index: -1;',
    '  pointer-events: none;',
    '  background: var(--wg-background);',
    '',
    '  /* Appearance */',
    '  --wg-mode: ' + S.mode + '; /* dots | text | digits */',
    '  --wg-font: ' + S.font + '; /* mono | courier | sans | serif */',
    '  --wg-font-size: ' + S.fontSize + 'px;',
    '  --wg-shuffle: ' + S.shuffle + '; /* changes per second */',
    '  --wg-spacing: ' + S.spacing + 'px;',
    '  --wg-dot-color: ' + S.dotColor + ';',
    '  --wg-background: ' + S.background + ';',
    '',
    '  /* Mask */',
    '  --wg-origin-x: ' + S.originX + '%;',
    '  --wg-origin-y: ' + S.originY + '%;',
    '  --wg-expansion: ' + S.expansion + '%;',
    '  --wg-feathering: ' + S.feathering + '%;',
    '',
    '  /* Wave */',
    '  --wg-wave: ' + f(S.wave) + ';',
    '  --wg-speed: ' + S.speed + 's;',
    '  --wg-length: ' + S.length + '%;',
    '  --wg-force: ' + S.force + ';',
    '  --wg-ripples: ' + S.ripples + ';',
    '  --wg-wave-glow: ' + S.waveGlow + ';',
    '',
    '  /* Cursor */',
    '  --wg-cursor: ' + f(S.cursor) + ';',
    '  --wg-cursor-mode: ' + S.cursorMode + '; /* attract | repel */',
    '  --wg-radius: ' + S.radius + 'px;',
    '  --wg-pull: ' + S.pull + ';',
    '',
    '  /* Trail and motion blur */',
    '  --wg-trail: ' + f(S.trail) + ';',
    '  --wg-motion-blur: ' + f(S.motionBlur) + ';',
    '}',
    '',
  ].join('\n');
}
