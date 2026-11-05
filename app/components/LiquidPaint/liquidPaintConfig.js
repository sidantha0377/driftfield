// @ts-nocheck
export const STORAGE_KEY = 'liquidpaint.settings';

export const COLOR_KEYS = ['surface1', 'surface2', 'surface3', 'surface4', 'mouse1', 'mouse2'];

export const PRESETS = [
  { id: 'oil', name: 'Oil slick', surface1: '#070810', surface2: '#3a1d7a', surface3: '#0b8a8f', surface4: '#f4d6a0', mouse1: '#ff5a36', mouse2: '#3df0c2' },
  { id: 'ember', name: 'Ember', surface1: '#0b0504', surface2: '#5c130a', surface3: '#c4421a', surface4: '#ffd08a', mouse1: '#7aa2ff', mouse2: '#fff1c9' },
  { id: 'sea', name: 'Deep sea', surface1: '#020a14', surface2: '#06365a', surface3: '#118a9c', surface4: '#bff3e4', mouse1: '#ff7a59', mouse2: '#ffd36b' },
  { id: 'ink', name: 'Ink', surface1: '#0a0a0a', surface2: '#2a2a2a', surface3: '#6e6e6e', surface4: '#f2f2f2', mouse1: '#ff3b30', mouse2: '#0a84ff' },
  { id: 'candy', name: 'Candy', surface1: '#1b0b2e', surface2: '#7b2cbf', surface3: '#ff4d9d', surface4: '#ffd6e8', mouse1: '#00e5ff', mouse2: '#ffe14d' },
];

export const DEFAULTS = {
  colorMode: 'palette',
  surface1: PRESETS[0].surface1,
  surface2: PRESETS[0].surface2,
  surface3: PRESETS[0].surface3,
  surface4: PRESETS[0].surface4,
  mouse1: PRESETS[0].mouse1,
  mouse2: PRESETS[0].mouse2,
  flow: 0.5,
  streaks: 30,
  mouseEffect: 'smear',
  strength: 60,
  mix: 80,
  brushSize: 160,
  linger: 55,
  renderScale: 0.75,
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

export const getStartSettings = () =>
  prefersReducedMotion() ? { ...DEFAULTS, flow: 0.1 } : { ...DEFAULTS };

export const SCHEMA = [
  {
    title: 'Colors',
    items: [
      { t: 'presets' },
      { k: 'colorMode', t: 'seg', label: 'Color mode', opts: [['palette', 'Palette'], ['single', 'Single']] },
      { k: 'surface1', t: 'color', label: 'Surface 1' },
      { k: 'surface2', t: 'color', label: 'Surface 2' },
      { k: 'surface3', t: 'color', label: 'Surface 3' },
      { k: 'surface4', t: 'color', label: 'Surface 4' },
      { k: 'mouse1', t: 'color', label: 'Mouse 1' },
      { k: 'mouse2', t: 'color', label: 'Mouse 2' },
    ],
  },
  {
    title: 'Liquid',
    items: [
      { k: 'flow', t: 'range', label: 'Flow', min: 0, max: 2, step: 0.05, fmt: (v) => v.toFixed(2) + 'x' },
      { k: 'streaks', t: 'range', label: 'Streaks', min: 0, max: 100, step: 1, fmt: (v) => v + '%' },
    ],
  },
  {
    title: 'Mouse',
    items: [
      { k: 'mouseEffect', t: 'seg', label: 'Effect', opts: [['smear', 'Smear'], ['swirl', 'Swirl'], ['bulge', 'Bulge']] },
      { k: 'strength', t: 'range', label: 'Strength', min: 0, max: 100, step: 1, fmt: (v) => v + '%' },
      { k: 'mix', t: 'range', label: 'Color Mix', min: 0, max: 100, step: 1, fmt: (v) => v + '%' },
      { k: 'brushSize', t: 'range', label: 'Brush Size', min: 40, max: 400, step: 5, fmt: (v) => v + 'px' },
      { k: 'linger', t: 'range', label: 'Linger', min: 0, max: 100, step: 1, fmt: (v) => v + '%' },
    ],
  },
  {
    title: 'Quality',
    items: [
      { k: 'renderScale', t: 'range', label: 'Detail', min: 0.3, max: 1, step: 0.05, fmt: (v) => Math.round(v * 100) + '%' },
    ],
  },
];

export const ITEMS = SCHEMA.flatMap((s) => s.items).filter((it) => it.k);

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
