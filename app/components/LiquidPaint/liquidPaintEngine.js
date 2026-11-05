// @ts-nocheck
/**
 * Liquid Paint engine (WebGL2).
 *
 * Draws flowing liquid paint on a <canvas>. Every pixel is calculated on the
 * graphics card: noise bent by noise picks a number from 0 to 1, the number
 * picks a color, thin lines are drawn where it crosses fixed values, and the
 * mouse trail (32 points) bends the paint and adds its own colors.
 *
 * Keep this function self-contained: it must not use imports or anything
 * declared outside it. liquidPaintExport.js reads its source with toString()
 * to build the exported HTML and Next.js files, so those stay identical to what
 * runs here.
 *
 * Options: colorMode ('palette' | 'single'), surface1..surface4, mouse1,
 * mouse2 (any CSS color), flow (0-2), streaks (0-100), mouseEffect ('smear' |
 * 'swirl' | 'bulge'), strength (0-100), mix (0-100), brushSize (40-400 px), linger (0-100),
 * renderScale (0.3-1), respectReducedMotion.
 *
 * Add data-liquid-ignore to any element that should not affect the paint while
 * the pointer is over it.
 *
 * Returns { supported, setOptions(options), destroy() }. setOptions replaces the
 * options: anything left out goes back to its default.
 */
export function createLiquid(cv, initial) {
  'use strict';
  const TAU = Math.PI * 2;
  const MAX_TRAIL = 32;
  const DEFAULT_OPTIONS = {
    colorMode: 'palette',
    surface1: '#070810', surface2: '#3a1d7a', surface3: '#0b8a8f', surface4: '#f4d6a0',
    mouse1: '#ff5a36', mouse2: '#3df0c2',
    flow: 0.5, streaks: 30, mouseEffect: 'smear', strength: 60, mix: 80, brushSize: 160, linger: 55,
    renderScale: 0.75, respectReducedMotion: true
  };
  const RANGES = { flow: [0, 2], streaks: [0, 100], strength: [0, 100], mix: [0, 100], brushSize: [40, 400], linger: [0, 100], renderScale: [0.3, 1] };
  const COLOR_KEYS = ['surface1', 'surface2', 'surface3', 'surface4', 'mouse1', 'mouse2'];
  const FALLBACK_RGB = {
    surface1: [7, 8, 16], surface2: [58, 29, 122], surface3: [11, 138, 143], surface4: [244, 214, 160],
    mouse1: [255, 90, 54], mouse2: [61, 240, 194]
  };
  const SENTINEL = '#010203';

  const VERT = `
#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}
`.trim();

  // The picture is calculated per pixel: warped noise picks a number from 0 to 1,
  // the number picks a color, thin lines are drawn where it crosses fixed values,
  // and the mouse trail twists the space and adds its own colors.
  const FRAG = `
#version 300 es
precision highp float;
precision highp int;
out vec4 outColor;

uniform vec2 u_res;
uniform float u_time;
uniform float u_streaks;
uniform float u_single;
uniform float u_brush;
uniform float u_mode;
uniform float u_strength;
uniform float u_mix;
uniform vec2 u_dir[32];
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec3 u_m0;
uniform vec3 u_m1;
uniform vec4 u_trail[32];

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * f * (f * (f * 6.0 - 15.0) + 10.0);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

const mat2 ROT = mat2(1.6, 1.2, -1.2, 1.6);

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = ROT * p;
    a *= 0.5;
  }
  return v;
}

vec3 palette(float x) {
  vec3 c = mix(u_c0, u_c1, smoothstep(0.05, 0.40, x));
  c = mix(c, u_c2, smoothstep(0.35, 0.70, x));
  c = mix(c, u_c3, smoothstep(0.65, 0.95, x));
  return c;
}

vec3 single(float x) {
  vec3 dark = u_c0 * 0.28;
  vec3 light = mix(u_c0, vec3(1.0), 0.55);
  return mix(dark, light, smoothstep(0.0, 1.0, x));
}

void main() {
  float m = min(u_res.x, u_res.y);
  vec2 uv = (gl_FragCoord.xy - 0.5 * u_res) / m;

  // Mouse trail: each point bends the space around it (smear, swirl or bulge) and adds a color.
  vec3 mcol = vec3(0.0);
  float mw = 0.0;
  float b2 = u_brush * u_brush;
  for (int i = 0; i < 32; i++) {
    vec4 tp = u_trail[i];
    if (tp.z < 0.003) continue;
    float st = tp.z * tp.z * (3.0 - 2.0 * tp.z);
    vec2 d = uv - tp.xy;
    float w = st * exp(-dot(d, d) / b2);
    if (w < 0.002) continue;
    if (u_mode < 0.5) {
      // smear: the paint is dragged the way the mouse moved
      uv -= u_dir[i] * (w * u_strength * 0.16);
    } else if (u_mode < 1.5) {
      // swirl: the paint is twisted around the point
      float a = w * u_strength * 2.4;
      float cs = cos(a);
      float sn = sin(a);
      uv = tp.xy + vec2(cs * d.x - sn * d.y, sn * d.x + cs * d.y);
    } else {
      // bulge: the paint is magnified around the point
      uv -= d * (w * u_strength * 0.5);
    }
    mcol += mix(u_m0, u_m1, tp.w) * w;
    mw += w;
  }

  // Liquid: noise bent by noise, bent again. Time moves it slowly.
  vec2 p = uv * 1.5;
  float t = u_time;
  vec2 q = vec2(fbm(p + 0.15 * t), fbm(p + vec2(5.2, 1.3) - 0.12 * t));
  vec2 r = vec2(fbm(p + 2.6 * q + vec2(1.7, 9.2) + 0.2 * t),
                fbm(p + 2.6 * q + vec2(8.3, 2.8) - 0.16 * t));
  float f = fbm(p + 2.6 * r);
  f = clamp((f - 0.26) / 0.5, 0.0, 1.0);
  f = pow(f, 1.25);

  // Number to color.
  vec3 col = mix(palette(f), single(f), u_single);

  // Mouse colors fade into the liquid where the trail is strong.
  // The mouse colors dissolve into the paint: they take on the paint's own light and
  // dark, settle into its flowing shapes, and weave both mouse colors through them.
  float dye = smoothstep(0.0, 1.0, clamp(mw * 0.9, 0.0, 1.0));
  vec3 mc = mcol / max(mw, 0.0001);
  float band = 0.5 + 0.5 * sin(f * 9.0 + r.x * 7.0);
  mc = mix(mc, mix(u_m0, u_m1, band), 0.25);
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  vec3 tint = mc * (0.4 + 1.3 * lum);
  float amt = dye * u_mix * (0.35 + 0.65 * band);
  col = mix(col, min(tint, vec3(1.0)), clamp(amt, 0.0, 1.0));

  // Streaks: thin bright lines where the number crosses fixed values.
  float gate = smoothstep(0.0, 0.1, u_streaks);
  float s = f * mix(2.0, 12.0, u_streaks);
  float fw = fwidth(s);
  float dd = abs(fract(s) - 0.5);
  float line = 1.0 - smoothstep(0.0, fw * 1.2 + 0.0001, dd);
  float glow = 1.0 - smoothstep(0.0, fw * 6.0 + 0.0001, dd);
  vec3 lc = mix(col, vec3(1.0), 0.55);
  col = mix(col, lc, clamp(line * 0.75 + glow * 0.12, 0.0, 1.0) * gate);

  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
`.trim();

  function resolve(input) {
    const out = Object.assign({}, DEFAULT_OPTIONS);
    const src = input || {};
    for (const key in src) if (src[key] !== undefined) out[key] = src[key];
    for (const k in RANGES) {
      const v = out[k];
      out[k] = (typeof v === 'number' && isFinite(v)) ? Math.min(RANGES[k][1], Math.max(RANGES[k][0], v)) : DEFAULT_OPTIONS[k];
    }
    for (let i = 0; i < COLOR_KEYS.length; i++) {
      const k = COLOR_KEYS[i];
      if (typeof out[k] !== 'string' || !out[k]) out[k] = DEFAULT_OPTIONS[k];
    }
    if (out.colorMode !== 'palette' && out.colorMode !== 'single') out.colorMode = DEFAULT_OPTIONS.colorMode;
    if (out.mouseEffect !== 'smear' && out.mouseEffect !== 'swirl' && out.mouseEffect !== 'bulge') out.mouseEffect = DEFAULT_OPTIONS.mouseEffect;
    out.respectReducedMotion = !!out.respectReducedMotion;
    return out;
  }

  // Turns any CSS color the browser understands into [r, g, b] (0 to 255).
  let scratch = null;
  function parseColor(input, fallback) {
    if (!scratch) scratch = document.createElement('canvas').getContext('2d');
    if (!scratch) return fallback;
    scratch.fillStyle = SENTINEL;
    scratch.fillStyle = input;
    const v = scratch.fillStyle;
    if (typeof v !== 'string') return fallback;
    if (v === SENTINEL && String(input).trim().toLowerCase() !== SENTINEL) return fallback;
    if (v.charAt(0) === '#' && v.length === 7) {
      const n = parseInt(v.slice(1), 16);
      return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
    }
    const m = /^rgba?\(([^)]+)\)/.exec(v);
    if (m && m[1]) {
      const p = m[1].split(',').map(function (s) { return parseFloat(s); });
      if (p.length >= 3 && p.every(function (x) { return isFinite(x); })) return [p[0], p[1], p[2]];
    }
    return fallback;
  }

  let o = resolve(initial);
  let gl = null, prog = null;
  let loc = {};
  let cols = {};
  let W = 0, H = 0, raf = 0, t = 0, last = performance.now();
  let visible = true, reduced = false, destroyed = false, lost = false, sizeDirty = true;
  const trail = [];
  for (let i = 0; i < MAX_TRAIL; i++) trail.push({ x: 0, y: 0, dx: 0, dy: 0, life: 0, mix: 0 });
  const trailData = new Float32Array(MAX_TRAIL * 4);
  const trailDir = new Float32Array(MAX_TRAIL * 2);
  let head = 0, lastP = null, travel = 0;
  const cleanups = [];

  function applyColors() {
    cols = {};
    for (let i = 0; i < COLOR_KEYS.length; i++) {
      const k = COLOR_KEYS[i];
      const c = parseColor(o[k], FALLBACK_RGB[k]);
      cols[k] = [c[0] / 255, c[1] / 255, c[2] / 255];
    }
  }

  function showFallback() {
    cv.style.background = 'linear-gradient(135deg,' + [o.surface1, o.surface2, o.surface3, o.surface4].join(',') + ')';
  }

  function compile(type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Liquid shader: ' + log);
    }
    return s;
  }

  function init() {
    gl = cv.getContext('webgl2', { antialias: false, alpha: false, depth: false, stencil: false, powerPreference: 'high-performance' });
    if (!gl) { showFallback(); return false; }
    try {
      const vs = compile(gl.VERTEX_SHADER, VERT);
      const fs = compile(gl.FRAGMENT_SHADER, FRAG);
      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error('Liquid shader link: ' + gl.getProgramInfoLog(prog));
    } catch (e) {
      console.error(e);
      gl = null;
      showFallback();
      return false;
    }
    gl.useProgram(prog);
    const names = ['u_res', 'u_time', 'u_streaks', 'u_single', 'u_brush', 'u_mode', 'u_strength', 'u_mix', 'u_dir', 'u_c0', 'u_c1', 'u_c2', 'u_c3', 'u_m0', 'u_m1', 'u_trail'];
    loc = {};
    for (let i = 0; i < names.length; i++) loc[names[i]] = gl.getUniformLocation(prog, names[i]);
    cv.style.background = '';
    sizeDirty = true;
    return true;
  }

  function resize() {
    W = cv.clientWidth || window.innerWidth;
    H = cv.clientHeight || window.innerHeight;
    cv.width = Math.max(2, Math.round(W * o.renderScale));
    cv.height = Math.max(2, Math.round(H * o.renderScale));
    gl.viewport(0, 0, cv.width, cv.height);
  }

  function ignored(e) {
    const target = e.target;
    return !!(target && target.closest && target.closest('[data-liquid-ignore]'));
  }

  function addPoint(x, y, dirX, dirY) {
    const m = Math.min(W, H) || 1;
    const p = trail[head];
    head = (head + 1) % MAX_TRAIL;
    p.x = (x - W / 2) / m;
    p.y = (H / 2 - y) / m;
    p.dx = dirX;
    p.dy = dirY;
    p.life = 1;
    // the mouse color drifts from color 1 to color 2 and back as the pointer travels
    p.mix = 0.5 + 0.5 * Math.sin((travel / 1400) * TAU);
  }

  function onMove(e) {
    if (ignored(e) || (o.respectReducedMotion && reduced)) { lastP = null; return; }
    const r = cv.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > W || y > H) { lastP = null; return; }
    if (!lastP) { lastP = { x: x, y: y }; addPoint(x, y, 0, 0); return; }
    const dx = x - lastP.x;
    const dy = y - lastP.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const spacing = Math.max(8, o.brushSize * 0.2);
    if (dist < spacing) return;
    const n = Math.min(8, Math.floor(dist / spacing));
    for (let k = 1; k <= n; k++) {
      travel += dist / n;
      // the direction is the way the mouse moved, with y flipped because the canvas counts up
      addPoint(lastP.x + (dx * k) / n, lastP.y + (dy * k) / n, dx / dist, -dy / dist);
    }
    lastP.x = x;
    lastP.y = y;
  }
  function onLeave() { lastP = null; }
  function onResize() { sizeDirty = true; }
  function onLost(e) { e.preventDefault(); lost = true; }
  function onRestored() { lost = false; init(); }

  window.addEventListener('pointermove', onMove, { passive: true });
  window.addEventListener('resize', onResize);
  document.documentElement.addEventListener('mouseleave', onLeave);
  cv.addEventListener('webglcontextlost', onLost);
  cv.addEventListener('webglcontextrestored', onRestored);
  cleanups.push(function () {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('resize', onResize);
    document.documentElement.removeEventListener('mouseleave', onLeave);
    cv.removeEventListener('webglcontextlost', onLost);
    cv.removeEventListener('webglcontextrestored', onRestored);
  });
  if (typeof window.matchMedia === 'function') {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced = mq.matches;
    const onMq = function (e) { reduced = e.matches; };
    if (mq.addEventListener) {
      mq.addEventListener('change', onMq);
      cleanups.push(function () { mq.removeEventListener('change', onMq); });
    }
  }
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(onResize);
    ro.observe(cv);
    cleanups.push(function () { ro.disconnect(); });
  }
  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(function (entries) {
      const entry = entries[entries.length - 1];
      if (entry) visible = entry.isIntersecting;
    });
    io.observe(cv);
    cleanups.push(function () { io.disconnect(); });
  }

  function frame(now) {
    if (destroyed) return;
    raf = requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
    last = now;
    if (!gl || lost || !visible) return;

    const calm = o.respectReducedMotion && reduced;
    t += dt * o.flow * (calm ? 0.1 : 1) * 0.8;

    // trail points weaken a little every frame; linger sets how fast
    const secs = 0.4 + (o.linger / 100) * 9;
    for (let i = 0; i < MAX_TRAIL; i++) {
      const p = trail[i];
      if (p.life > 0) p.life = Math.max(0, p.life - dt / secs);
      trailData[i * 4] = p.x;
      trailData[i * 4 + 1] = p.y;
      trailData[i * 4 + 2] = p.life;
      trailData[i * 4 + 3] = p.mix;
      trailDir[i * 2] = p.dx;
      trailDir[i * 2 + 1] = p.dy;
    }

    if (sizeDirty) { resize(); sizeDirty = false; }
    gl.uniform2f(loc.u_res, cv.width, cv.height);
    gl.uniform1f(loc.u_time, t);
    gl.uniform1f(loc.u_streaks, o.streaks / 100);
    gl.uniform1f(loc.u_single, o.colorMode === 'single' ? 1 : 0);
    gl.uniform1f(loc.u_brush, o.brushSize / (Math.min(W, H) || 1));
    gl.uniform1f(loc.u_mode, o.mouseEffect === 'smear' ? 0 : o.mouseEffect === 'swirl' ? 1 : 2);
    gl.uniform1f(loc.u_strength, o.strength / 100);
    gl.uniform1f(loc.u_mix, o.mix / 100);
    gl.uniform2fv(loc.u_dir, trailDir);
    gl.uniform3fv(loc.u_c0, cols.surface1);
    gl.uniform3fv(loc.u_c1, cols.surface2);
    gl.uniform3fv(loc.u_c2, cols.surface3);
    gl.uniform3fv(loc.u_c3, cols.surface4);
    gl.uniform3fv(loc.u_m0, cols.mouse1);
    gl.uniform3fv(loc.u_m1, cols.mouse2);
    gl.uniform4fv(loc.u_trail, trailData);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  applyColors();
  const supported = init();
  raf = requestAnimationFrame(frame);

  return {
    supported: supported,
    /** Replace the options. Anything left out goes back to its default. */
    setOptions: function (partial) {
      const prev = o;
      o = resolve(partial);
      applyColors();
      if (o.renderScale !== prev.renderScale) sizeDirty = true;
      if (!gl) showFallback();
    },
    /** Stop drawing and remove every listener. */
    destroy: function () {
      if (destroyed) return;
      destroyed = true;
      cancelAnimationFrame(raf);
      for (let i = 0; i < cleanups.length; i++) cleanups[i]();
      cleanups.length = 0;
      if (gl && prog) { gl.deleteProgram(prog); prog = null; }
    }
  };
}
