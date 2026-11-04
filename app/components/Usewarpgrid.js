'use client';

import { useEffect, useRef } from 'react';
import { DIGITS, LETTERS, PHRASE, FONTS } from './warpGridConfig';

const TAU = Math.PI * 2;

const hexRgb = (h) => {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
};

/**
 * Runs the warp grid canvas engine.
 * @param canvasRef  ref to the <canvas>
 * @param settings   current settings object (immutable updates)
 */
export default function useWarpGrid(canvasRef, settings) {
  const settingsRef = useRef(settings);
  const prevRef = useRef(settings);
  const dirtyRef = useRef({
    rebuild: true,
    geo: false,
    mask: false,
    colors: true,
    sprites: true,
    glyphs: false,
    font: false,
    clearTrail: false,
  });

  // Translate settings changes into "dirty" flags for the engine.
  useEffect(() => {
    settingsRef.current = settings;
    const prev = prevRef.current;
    prevRef.current = settings;
    const d = dirtyRef.current;
    for (const key of Object.keys(settings)) {
      if (settings[key] === prev[key]) continue;
      switch (key) {
        case 'mode': d.glyphs = true; d.sprites = true; break;
        case 'font': d.font = true; d.sprites = true; break;
        case 'fontSize': d.sprites = true; break;
        case 'spacing': d.rebuild = true; break;
        case 'dotColor':
        case 'waveGlow':
        case 'background': d.colors = true; break;
        case 'originX':
        case 'originY': d.geo = true; break;
        case 'expansion':
        case 'feathering': d.mask = true; break;
        case 'trail': if (!settings.trail) d.clearTrail = true; break;
        default: break;
      }
    }
  }, [settings]);

  // Engine (mounted once).
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const ctx = cv.getContext('2d');
    const dirty = dirtyRef.current;
    dirty.rebuild = true;
    dirty.colors = true;
    dirty.sprites = true;

    let S = settingsRef.current;
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, N = 0, step = 10;
    let px, py, ox, oy, vx, vy, ux, uy, dist, mask, glyph;
    let maxR0 = 1;
    let spr0 = [], spr1 = [], cell = 10, half = 5;
    let bg = [10, 10, 10];
    let bucketColors = [];
    let t = 0, last = performance.now(), shuffleRem = 0;
    let raf = 0;
    const ptr = { x: 0, y: 0, active: false };
    const trail = [];
    const clicks = [];
    const paths = new Array(48);

    const randGlyph = () =>
      S.mode === 'digits' ? (Math.random() * 10) | 0 : (Math.random() * 26) | 0;

    function assignGlyphs() {
      glyph = new Int8Array(N);
      if (S.mode === 'dots') return;
      for (let i = 0; i < N; i++) {
        if (S.mode === 'digits') { glyph[i] = (Math.random() * 10) | 0; continue; }
        const r = (i / cols) | 0, c = i - r * cols;
        glyph[i] = LETTERS.indexOf(PHRASE[(c + r * 3) % PHRASE.length]);
      }
    }

    function computeMask() {
      const R = (S.expansion / 100) * maxR0 * 1.2;
      const inner = R * (1 - S.feathering / 100);
      for (let i = 0; i < N; i++) {
        const d = dist[i];
        let a;
        if (R <= 0 || d >= R) a = 0;
        else if (d <= inner) a = 1;
        else { const u = (R - d) / (R - inner); a = u * u * (3 - 2 * u); }
        mask[i] = a;
      }
    }

    function geo() {
      const cx = (S.originX / 100) * W, cy = (S.originY / 100) * H;
      maxR0 = Math.max(1, Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)));
      for (let i = 0; i < N; i++) {
        const dx = px[i] - cx, dy = py[i] - cy;
        const d = Math.sqrt(dx * dx + dy * dy);
        dist[i] = d;
        ux[i] = d > 0.001 ? dx / d : 0;
        uy[i] = d > 0.001 ? dy / d : 0;
      }
      computeMask();
    }

    function rebuild() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = cv.clientWidth || window.innerWidth;
      H = cv.clientHeight || window.innerHeight;
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      step = Math.max(S.spacing, Math.sqrt((W * H) / 40000));
      cols = Math.floor(W / step) + 2;
      rows = Math.floor(H / step) + 2;
      N = cols * rows;
      const x0 = (W - (cols - 1) * step) / 2, y0 = (H - (rows - 1) * step) / 2;
      px = new Float32Array(N); py = new Float32Array(N);
      ox = new Float32Array(N); oy = new Float32Array(N);
      vx = new Float32Array(N); vy = new Float32Array(N);
      ux = new Float32Array(N); uy = new Float32Array(N);
      dist = new Float32Array(N); mask = new Float32Array(N);
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const i = r * cols + c;
          px[i] = x0 + c * step;
          py[i] = y0 + r * step;
        }
      }
      assignGlyphs();
      geo();
      computeMask();
      dirty.sprites = true;
    }

    function updateColors() {
      const a = hexRgb(S.dotColor), b = hexRgb(S.waveGlow);
      bucketColors = [];
      for (let k = 0; k < 6; k++) {
        const f = k / 5;
        bucketColors.push(
          'rgb(' + Math.round(a[0] + (b[0] - a[0]) * f) + ',' +
          Math.round(a[1] + (b[1] - a[1]) * f) + ',' +
          Math.round(a[2] + (b[2] - a[2]) * f) + ')'
        );
      }
      bg = hexRgb(S.background);
    }

    function buildSprites() {
      spr0 = []; spr1 = [];
      if (S.mode === 'dots') return;
      const chars = S.mode === 'digits' ? DIGITS : LETTERS;
      cell = Math.ceil(S.fontSize * 1.6) + 2;
      half = cell / 2;
      const fam = FONTS[S.font];
      const make = (color, out) => {
        for (const ch of chars) {
          const c = document.createElement('canvas');
          c.width = c.height = Math.ceil(cell * dpr);
          const x = c.getContext('2d');
          x.scale(c.width / cell, c.height / cell);
          x.font = S.fontSize + 'px ' + fam;
          x.textAlign = 'center';
          x.textBaseline = 'middle';
          x.fillStyle = color;
          x.fillText(ch, half, half);
          out.push(c);
        }
      };
      make(S.dotColor, spr0);
      make(S.waveGlow, spr1);
    }

    function ensureFont() {
      try {
        document.fonts.load('12px ' + FONTS[S.font]).then(() => { dirty.sprites = true; });
      } catch (e) { /* font loading unsupported */ }
    }

    function frame(now) {
      raf = requestAnimationFrame(frame);
      S = settingsRef.current;
      const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
      last = now;
      t += dt;

      if (dirty.rebuild) {
        rebuild();
        dirty.rebuild = false; dirty.geo = false; dirty.mask = false; dirty.glyphs = false;
      }
      if (dirty.glyphs) { assignGlyphs(); dirty.glyphs = false; }
      if (dirty.geo) { geo(); dirty.geo = false; dirty.mask = false; }
      if (dirty.mask) { computeMask(); dirty.mask = false; }
      if (dirty.font) { ensureFont(); dirty.font = false; }
      if (dirty.clearTrail) { trail.length = 0; dirty.clearTrail = false; }
      if (dirty.colors) { updateColors(); dirty.colors = false; dirty.sprites = true; }
      if (dirty.sprites) { buildSprites(); dirty.sprites = false; }

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.globalAlpha = 1;
      ctx.fillStyle = S.motionBlur
        ? 'rgba(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ',0.2)'
        : S.background;
      ctx.fillRect(0, 0, W, H);

      // shuffle
      if (S.shuffle > 0 && S.mode !== 'dots') {
        shuffleRem += N * S.shuffle * dt;
        const n = shuffleRem | 0;
        shuffleRem -= n;
        for (let j = 0; j < n; j++) glyph[(Math.random() * N) | 0] = randGlyph();
      }

      // wave front
      const ww = Math.max(1, (S.length / 100) * maxR0 * 0.5);
      const phase = (t / S.speed) % 1;
      const rFront = phase * (maxR0 + 4 * ww) - 2 * ww;
      const fadeA = Math.min(1, phase / 0.08), fadeB = Math.min(1, (1 - phase) / 0.08);
      const waveFade = Math.min(fadeA, fadeB);
      const rip = Math.PI * S.ripples * 0.75;
      const force = S.force;

      // click ripples
      const life = Math.max(2.5, S.speed * 0.4);
      for (let j = clicks.length - 1; j >= 0; j--) if (t - clicks[j].t0 > life) clicks.splice(j, 1);
      const cl = [];
      for (const c of clicks) {
        const age = (t - c.t0) / life;
        const mr = Math.hypot(Math.max(c.x, W - c.x), Math.max(c.y, H - c.y));
        cl.push(c.x, c.y, age * (mr + 4 * ww) - 2 * ww, 1 - age);
      }

      // cursor sources
      while (trail.length && t - trail[0].t > 0.9) trail.shift();
      const srcs = [];
      if (S.cursor) {
        if (ptr.active) srcs.push(ptr.x, ptr.y, 1);
        if (S.trail) {
          for (const p of trail) {
            const w = 1 - (t - p.t) / 0.9;
            if (w > 0.02) srcs.push(p.x, p.y, w * 0.9);
          }
        }
      }
      const R = S.radius, R2 = R * R, dir = S.cursorMode === 'attract' ? 1 : -1, pull = S.pull;

      const k = 220, c = 2 * Math.sqrt(k) * 0.75;
      const dots = S.mode === 'dots';
      const dotR = Math.max(0.6, S.fontSize * 0.28);
      for (let b = 0; b < 48; b++) paths[b] = null;

      for (let i = 0; i < N; i++) {
        const a = mask[i];
        if (a < 0.03) continue;
        const bx = px[i], by = py[i];
        let tx = 0, ty = 0, g = 0;

        if (S.wave) {
          const u = (dist[i] - rFront) / ww;
          if (u * u < 14) {
            const f = Math.exp(-u * u * 0.35) * Math.cos(u * rip);
            const amp = force * f * waveFade;
            tx += ux[i] * amp; ty += uy[i] * amp;
            if (f > 0) { const gg = f * waveFade; if (gg > g) g = gg; }
          }
        }
        for (let j = 0; j < cl.length; j += 4) {
          const dx = bx - cl[j], dy = by - cl[j + 1];
          const d = Math.sqrt(dx * dx + dy * dy);
          const u = (d - cl[j + 2]) / ww;
          if (u * u < 14 && d > 0.001) {
            const f = Math.exp(-u * u * 0.35) * Math.cos(u * rip) * cl[j + 3];
            const amp = force * f;
            tx += (dx / d) * amp; ty += (dy / d) * amp;
            if (f > g) g = f;
          }
        }
        for (let j = 0; j < srcs.length; j += 3) {
          const dx = srcs[j] - bx, dy = srcs[j + 1] - by;
          const d2 = dx * dx + dy * dy;
          if (d2 < R2 && d2 > 0.01) {
            const d = Math.sqrt(d2);
            let q = 1 - d / R;
            q = q * q * (3 - 2 * q);
            let mag = pull * q * srcs[j + 2];
            if (mag > d * 0.9) mag = d * 0.9;
            tx += (dx / d) * mag * dir; ty += (dy / d) * mag * dir;
          }
        }

        vx[i] += ((tx - ox[i]) * k - vx[i] * c) * dt;
        vy[i] += ((ty - oy[i]) * k - vy[i] * c) * dt;
        ox[i] += vx[i] * dt;
        oy[i] += vy[i] * dt;
        const x = bx + ox[i], y = by + oy[i];
        if (g > 1) g = 1;

        if (dots) {
          const gb = Math.min(5, (g * 6) | 0);
          const ab = Math.min(7, (a * 8) | 0);
          const bi = ab * 6 + gb;
          let p = paths[bi];
          if (!p) p = paths[bi] = new Path2D();
          const rr = dotR * (1 + 0.35 * gb / 5);
          p.moveTo(x + rr, y);
          p.arc(x, y, rr, 0, TAU);
        } else {
          const gi = glyph[i];
          if (gi < 0) continue;
          const g1 = g;
          const aBase = a * (1 - g1), aGlow = a * g1;
          if (aBase > 0.03) { ctx.globalAlpha = aBase; ctx.drawImage(spr0[gi], x - half, y - half, cell, cell); }
          if (aGlow > 0.03) { ctx.globalAlpha = aGlow; ctx.drawImage(spr1[gi], x - half, y - half, cell, cell); }
        }
      }

      if (dots) {
        for (let b = 0; b < 48; b++) {
          const p = paths[b];
          if (!p) continue;
          ctx.globalAlpha = ((b / 6 | 0) + 0.75) / 8;
          ctx.fillStyle = bucketColors[b % 6];
          ctx.fill(p);
        }
      }
      ctx.globalAlpha = 1;
    }

    // ---------- pointer ----------
    const onMove = (e) => {
      if (e.target && e.target.closest && e.target.closest('[data-wg-ignore]')) {
        ptr.active = false;
        return;
      }
      const moved = Math.hypot(e.clientX - ptr.x, e.clientY - ptr.y);
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true;
      const cur = settingsRef.current;
      if (cur.trail && cur.cursor && moved > 5) trail.push({ x: ptr.x, y: ptr.y, t });
    };
    const onLeave = () => { ptr.active = false; };
    const onDown = (e) => {
      ptr.x = e.clientX; ptr.y = e.clientY; ptr.active = true;
      clicks.push({ x: e.clientX, y: e.clientY, t0: t });
      if (clicks.length > 4) clicks.shift();
    };
    const endTouch = (e) => { if (e.pointerType === 'touch') ptr.active = false; };
    const onResize = () => { dirty.rebuild = true; };

    window.addEventListener('pointermove', onMove, { passive: true });
    document.documentElement.addEventListener('mouseleave', onLeave);
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointerup', endTouch);
    cv.addEventListener('pointercancel', endTouch);
    window.addEventListener('resize', onResize);

    ensureFont();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      document.documentElement.removeEventListener('mouseleave', onLeave);
      cv.removeEventListener('pointerdown', onDown);
      cv.removeEventListener('pointerup', endTouch);
      cv.removeEventListener('pointercancel', endTouch);
      window.removeEventListener('resize', onResize);
    };
  }, [canvasRef]);
}