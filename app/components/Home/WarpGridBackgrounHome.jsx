'use client';

// Warp Grid background for Next.js. Save as components/WarpGridBackground.jsx.
// Use it once in app/layout.js:  <WarpGridBackground />
// Props override the settings below, for example <WarpGridBackground mode="dots" force={16} />.
// Add data-wg-ignore to any area that should not react to the cursor.

import { useEffect, useRef } from 'react';

const DEFAULTS = {
    "mode": "text",
    "fontSize": 10,
    "font": "courier",
    "shuffle": 1,
    "spacing": 18,
    "dotColor": "#ffffff",
    "background": "#0a0a0a",
    "originX": 0,
    "originY": 0,
    "expansion": 86,
    "feathering": 84,
    "wave": true,
    "speed": 3,
    "length": 64,
    "force": 10,
    "ripples": 1,
    "waveGlow": "#403b3b",
    "cursor": true,
    "cursorMode": "repel",
    "radius": 215,
    "pull": 17,
    "trail": true,
    "motionBlur": false,
    "respectReducedMotion": true
};

var createWarpGrid = function createWarpGrid(cv, initial) {
    'use strict';
    const TAU = Math.PI * 2;
    const DIGITS = '0123456789';
    const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const PHRASE = 'WARP GRID ';
    const FONTS = {
        mono: '"JetBrains Mono", ui-monospace, Menlo, monospace',
        courier: '"Courier New", Courier, monospace',
        sans: '"DM Sans", system-ui, sans-serif',
        serif: '"Newsreader", Georgia, serif'
    };
    const DEFAULT_OPTIONS = {
        mode: 'digits',
        font: 'courier',
        fontSize: 5,
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
        respectReducedMotion: true
    };
    const RANGES = {
        fontSize: [
            3,
            14
        ],
        shuffle: [
            0,
            12
        ],
        spacing: [
            6,
            40
        ],
        originX: [
            0,
            100
        ],
        originY: [
            0,
            100
        ],
        expansion: [
            0,
            150
        ],
        feathering: [
            0,
            100
        ],
        speed: [
            2,
            20
        ],
        length: [
            10,
            100
        ],
        force: [
            0,
            40
        ],
        ripples: [
            1,
            6
        ],
        radius: [
            30,
            300
        ],
        pull: [
            0,
            80
        ]
    };
    const SENTINEL = '#010203';
    const ctx = cv.getContext('2d');
    if (!ctx) throw new Error('Warp Grid: a 2D canvas is not available.');
    function resolve(input) {
        const out = Object.assign({}, DEFAULT_OPTIONS);
        const src = input || {};
        for (const key in src) if (src[key] !== undefined) out[key] = src[key];
        for (const k in RANGES) {
            const v = out[k];
            out[k] = typeof v === 'number' && isFinite(v) ? Math.min(RANGES[k][1], Math.max(RANGES[k][0], v)) : DEFAULT_OPTIONS[k];
        }
        if (out.mode !== 'dots' && out.mode !== 'text' && out.mode !== 'digits') out.mode = DEFAULT_OPTIONS.mode;
        if (!FONTS[out.font]) out.font = DEFAULT_OPTIONS.font;
        if (out.cursorMode !== 'attract' && out.cursorMode !== 'repel') out.cursorMode = DEFAULT_OPTIONS.cursorMode;
        out.wave = !!out.wave;
        out.cursor = !!out.cursor;
        out.trail = !!out.trail;
        out.motionBlur = !!out.motionBlur;
        out.respectReducedMotion = !!out.respectReducedMotion;
        if (!out.fontFamily) delete out.fontFamily;
        return out;
    }
    // Turns any CSS color the browser understands into [r, g, b].
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
            return [
                n >> 16 & 255,
                n >> 8 & 255,
                n & 255
            ];
        }
        const m = /^rgba?\(([^)]+)\)/.exec(v);
        if (m && m[1]) {
            const p = m[1].split(',').map(function (s) {
                return parseFloat(s);
            });
            if (p.length >= 3 && p.every(function (x) {
                return isFinite(x);
            })) return [
                p[0],
                p[1],
                p[2]
            ];
        }
        return fallback;
    }
    let o = resolve(initial);
    let W = 0, H = 0, dpr = 1, cols = 0, rows = 0, n = 0, step = 10, maxR0 = 1;
    let px = new Float32Array(0), py = new Float32Array(0), ox = new Float32Array(0), oy = new Float32Array(0);
    let vx = new Float32Array(0), vy = new Float32Array(0), ux = new Float32Array(0), uy = new Float32Array(0);
    let dist = new Float32Array(0), mask = new Float32Array(0), glyph = new Int8Array(0);
    let cell = 10, half = 5, spr0 = [], spr1 = [];
    let dotRgb = [
        88,
        88,
        88
    ], glowRgb = [
        232,
        232,
        232
    ], bgRgb = [
        10,
        10,
        10
    ], bucketColors = [];
    const dirty = {
        rebuild: true,
        geo: false,
        mask: false,
        colors: true,
        sprites: true,
        glyphs: false
    };
    let t = 0, last = performance.now(), shuffleRem = 0, raf = 0, visible = true, reduced = false, destroyed = false;
    const ptr = {
        x: 0,
        y: 0,
        active: false
    };
    const trail = [];
    const clicks = [];
    const paths = new Array(48).fill(null);
    const cleanups = [];
    function fontFamily() {
        return o.fontFamily || FONTS[o.font];
    }
    function ensureFont() {
        if (!document.fonts || !document.fonts.load) return;
        document.fonts.load('12px ' + fontFamily()).then(function () {
            dirty.sprites = true;
        }, function () { });
    }
    function assignGlyphs() {
        glyph = new Int8Array(n);
        if (o.mode === 'dots') return;
        for (let i = 0; i < n; i++) {
            if (o.mode === 'digits') {
                glyph[i] = Math.random() * 10 | 0;
                continue;
            }
            const r = i / cols | 0, c = i - r * cols;
            glyph[i] = LETTERS.indexOf(PHRASE.charAt((c + r * 3) % PHRASE.length));
        }
    }
    function computeMask() {
        const R = o.expansion / 100 * maxR0 * 1.2;
        const inner = R * (1 - o.feathering / 100);
        for (let i = 0; i < n; i++) {
            const d = dist[i];
            let a;
            if (R <= 0 || d >= R) a = 0;
            else if (d <= inner) a = 1;
            else {
                const u = (R - d) / (R - inner);
                a = u * u * (3 - 2 * u);
            }
            mask[i] = a;
        }
    }
    function computeGeo() {
        const cx = o.originX / 100 * W, cy = o.originY / 100 * H;
        maxR0 = Math.max(1, Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)));
        for (let i = 0; i < n; i++) {
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
        // keep the point count under 40,000 so large screens stay smooth
        step = Math.max(o.spacing, Math.sqrt(W * H / 40000));
        cols = Math.floor(W / step) + 2;
        rows = Math.floor(H / step) + 2;
        n = cols * rows;
        const x0 = (W - (cols - 1) * step) / 2, y0 = (H - (rows - 1) * step) / 2;
        px = new Float32Array(n);
        py = new Float32Array(n);
        ox = new Float32Array(n);
        oy = new Float32Array(n);
        vx = new Float32Array(n);
        vy = new Float32Array(n);
        ux = new Float32Array(n);
        uy = new Float32Array(n);
        dist = new Float32Array(n);
        mask = new Float32Array(n);
        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const i = r * cols + c;
                px[i] = x0 + c * step;
                py[i] = y0 + r * step;
            }
        }
        assignGlyphs();
        computeGeo();
        dirty.sprites = true;
    }
    function updateColors() {
        dotRgb = parseColor(o.dotColor, [
            88,
            88,
            88
        ]);
        glowRgb = parseColor(o.waveGlow, [
            232,
            232,
            232
        ]);
        bgRgb = parseColor(o.background, [
            10,
            10,
            10
        ]);
        bucketColors = [];
        for (let k = 0; k < 6; k++) {
            const f = k / 5;
            bucketColors.push('rgb(' + Math.round(dotRgb[0] + (glowRgb[0] - dotRgb[0]) * f) + ',' + Math.round(dotRgb[1] + (glowRgb[1] - dotRgb[1]) * f) + ',' + Math.round(dotRgb[2] + (glowRgb[2] - dotRgb[2]) * f) + ')');
        }
    }
    function buildSprites() {
        spr0 = [];
        spr1 = [];
        if (o.mode === 'dots') return;
        const chars = o.mode === 'digits' ? DIGITS : LETTERS;
        cell = Math.ceil(o.fontSize * 1.6) + 2;
        half = cell / 2;
        const fam = fontFamily();
        const rgb = function (c) {
            return 'rgb(' + c[0] + ',' + c[1] + ',' + c[2] + ')';
        };
        const make = function (color, out) {
            for (let i = 0; i < chars.length; i++) {
                const c = document.createElement('canvas');
                c.width = c.height = Math.ceil(cell * dpr);
                const x = c.getContext('2d');
                if (!x) continue;
                x.scale(c.width / cell, c.height / cell);
                x.font = o.fontSize + 'px ' + fam;
                x.textAlign = 'center';
                x.textBaseline = 'middle';
                x.fillStyle = color;
                x.fillText(chars.charAt(i), half, half);
                out.push(c);
            }
        };
        make(rgb(dotRgb), spr0);
        make(rgb(glowRgb), spr1);
    }
    function ignored(e) {
        const target = e.target;
        return !!(target && target.closest && target.closest('[data-wg-ignore]'));
    }
    function local(e) {
        const r = cv.getBoundingClientRect();
        return {
            x: e.clientX - r.left,
            y: e.clientY - r.top
        };
    }
    function onMove(e) {
        if (ignored(e)) {
            ptr.active = false;
            return;
        }
        const p = local(e);
        if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) {
            ptr.active = false;
            return;
        }
        const moved = Math.hypot(p.x - ptr.x, p.y - ptr.y);
        ptr.x = p.x;
        ptr.y = p.y;
        ptr.active = true;
        if (o.trail && o.cursor && moved > 5) trail.push({
            x: p.x,
            y: p.y,
            t: t
        });
    }
    function onDown(e) {
        const target = e.target;
        if (ignored(e)) return;
        if (target && target.closest && target.closest('a,button,input,textarea,select,label')) return;
        const p = local(e);
        if (p.x < 0 || p.y < 0 || p.x > W || p.y > H) return;
        ptr.x = p.x;
        ptr.y = p.y;
        ptr.active = true;
        clicks.push({
            x: p.x,
            y: p.y,
            t0: t
        });
        if (clicks.length > 4) clicks.shift();
    }
    function onUp(e) {
        if (e.pointerType === 'touch') ptr.active = false;
    }
    function onLeave() {
        ptr.active = false;
    }
    function onResize() {
        dirty.rebuild = true;
    }
    window.addEventListener('pointermove', onMove, {
        passive: true
    });
    window.addEventListener('pointerdown', onDown, {
        passive: true
    });
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    window.addEventListener('resize', onResize);
    document.documentElement.addEventListener('mouseleave', onLeave);
    cleanups.push(function () {
        window.removeEventListener('pointermove', onMove);
        window.removeEventListener('pointerdown', onDown);
        window.removeEventListener('pointerup', onUp);
        window.removeEventListener('pointercancel', onUp);
        window.removeEventListener('resize', onResize);
        document.documentElement.removeEventListener('mouseleave', onLeave);
    });
    if (typeof window.matchMedia === 'function') {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        reduced = mq.matches;
        const onMq = function (e) {
            reduced = e.matches;
        };
        if (mq.addEventListener) {
            mq.addEventListener('change', onMq);
            cleanups.push(function () {
                mq.removeEventListener('change', onMq);
            });
        }
    }
    if (typeof ResizeObserver !== 'undefined') {
        const ro = new ResizeObserver(onResize);
        ro.observe(cv);
        cleanups.push(function () {
            ro.disconnect();
        });
    }
    if (typeof IntersectionObserver !== 'undefined') {
        const io = new IntersectionObserver(function (entries) {
            const entry = entries[entries.length - 1];
            if (entry) visible = entry.isIntersecting;
        });
        io.observe(cv);
        cleanups.push(function () {
            io.disconnect();
        });
    }
    function draw(dt) {
        const bg = bgRgb;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.globalAlpha = 1;
        ctx.fillStyle = o.motionBlur ? 'rgba(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ',0.2)' : 'rgb(' + bg[0] + ',' + bg[1] + ',' + bg[2] + ')';
        ctx.fillRect(0, 0, W, H);
        const calm = o.respectReducedMotion && reduced;
        const waveOn = o.wave && !calm;
        const cursorOn = o.cursor && !calm;
        if (o.shuffle > 0 && o.mode !== 'dots' && !calm) {
            shuffleRem += n * o.shuffle * dt;
            const count = shuffleRem | 0;
            shuffleRem -= count;
            const max = o.mode === 'digits' ? 10 : 26;
            for (let j = 0; j < count; j++)glyph[Math.random() * n | 0] = Math.random() * max | 0;
        }
        const ww = Math.max(1, o.length / 100 * maxR0 * 0.5);
        const phase = t / o.speed % 1;
        const rFront = phase * (maxR0 + 4 * ww) - 2 * ww;
        const waveFade = Math.min(Math.min(1, phase / 0.08), Math.min(1, (1 - phase) / 0.08));
        const rip = Math.PI * o.ripples * 0.75;
        const force = o.force;
        const life = Math.max(2.5, o.speed * 0.4);
        for (let j = clicks.length - 1; j >= 0; j--)if (t - clicks[j].t0 > life) clicks.splice(j, 1);
        const cl = [];
        for (let j = 0; j < clicks.length; j++) {
            const c = clicks[j];
            const age = (t - c.t0) / life;
            const mr = Math.hypot(Math.max(c.x, W - c.x), Math.max(c.y, H - c.y));
            cl.push(c.x, c.y, age * (mr + 4 * ww) - 2 * ww, 1 - age);
        }
        while (trail.length && t - trail[0].t > 0.9) trail.shift();
        const srcs = [];
        if (cursorOn) {
            if (ptr.active) srcs.push(ptr.x, ptr.y, 1);
            if (o.trail) {
                for (let j = 0; j < trail.length; j++) {
                    const p = trail[j];
                    const w = 1 - (t - p.t) / 0.9;
                    if (w > 0.02) srcs.push(p.x, p.y, w * 0.9);
                }
            }
        }
        const R = o.radius, R2 = R * R, dir = o.cursorMode === 'attract' ? 1 : -1, pull = o.pull;
        const k = 220, damp = 2 * Math.sqrt(k) * 0.75;
        const dots = o.mode === 'dots';
        const dotR = Math.max(0.6, o.fontSize * 0.28);
        for (let b = 0; b < 48; b++)paths[b] = null;
        for (let i = 0; i < n; i++) {
            const a = mask[i];
            if (a < 0.03) continue;
            const bx = px[i], by = py[i];
            let tx = 0, ty = 0, g = 0;
            if (waveOn) {
                const u = (dist[i] - rFront) / ww;
                if (u * u < 14) {
                    const f = Math.exp(-u * u * 0.35) * Math.cos(u * rip);
                    const amp = force * f * waveFade;
                    tx += ux[i] * amp;
                    ty += uy[i] * amp;
                    if (f > 0) {
                        const gg = f * waveFade;
                        if (gg > g) g = gg;
                    }
                }
            }
            for (let j = 0; j < cl.length; j += 4) {
                const dx = bx - cl[j], dy = by - cl[j + 1];
                const dd = Math.sqrt(dx * dx + dy * dy);
                const u = (dd - cl[j + 2]) / ww;
                if (u * u < 14 && dd > 0.001) {
                    const f = Math.exp(-u * u * 0.35) * Math.cos(u * rip) * cl[j + 3];
                    const amp = force * f;
                    tx += dx / dd * amp;
                    ty += dy / dd * amp;
                    if (f > g) g = f;
                }
            }
            for (let j = 0; j < srcs.length; j += 3) {
                const dx = srcs[j] - bx, dy = srcs[j + 1] - by;
                const d2 = dx * dx + dy * dy;
                if (d2 < R2 && d2 > 0.01) {
                    const dd = Math.sqrt(d2);
                    let q = 1 - dd / R;
                    q = q * q * (3 - 2 * q);
                    let mag = pull * q * srcs[j + 2];
                    if (mag > dd * 0.9) mag = dd * 0.9;
                    tx += dx / dd * mag * dir;
                    ty += dy / dd * mag * dir;
                }
            }
            vx[i] += ((tx - ox[i]) * k - vx[i] * damp) * dt;
            vy[i] += ((ty - oy[i]) * k - vy[i] * damp) * dt;
            ox[i] += vx[i] * dt;
            oy[i] += vy[i] * dt;
            const x = bx + ox[i], y = by + oy[i];
            if (g > 1) g = 1;
            if (dots) {
                const gb = Math.min(5, g * 6 | 0);
                const ab = Math.min(7, a * 8 | 0);
                const bi = ab * 6 + gb;
                let p = paths[bi];
                if (!p) {
                    p = new Path2D();
                    paths[bi] = p;
                }
                const rr = dotR * (1 + 0.35 * gb / 5);
                p.moveTo(x + rr, y);
                p.arc(x, y, rr, 0, TAU);
            } else {
                const gi = glyph[i];
                if (gi < 0) continue;
                const aBase = a * (1 - g), aGlow = a * g;
                if (aBase > 0.03 && spr0[gi]) {
                    ctx.globalAlpha = aBase;
                    ctx.drawImage(spr0[gi], x - half, y - half, cell, cell);
                }
                if (aGlow > 0.03 && spr1[gi]) {
                    ctx.globalAlpha = aGlow;
                    ctx.drawImage(spr1[gi], x - half, y - half, cell, cell);
                }
            }
        }
        if (dots) {
            for (let b = 0; b < 48; b++) {
                const p = paths[b];
                if (!p) continue;
                ctx.globalAlpha = ((b / 6 | 0) + 0.75) / 8;
                ctx.fillStyle = bucketColors[b % 6] || '#888';
                ctx.fill(p);
            }
        }
        ctx.globalAlpha = 1;
    }
    function frame(now) {
        if (destroyed) return;
        raf = requestAnimationFrame(frame);
        const dt = Math.min(0.05, Math.max(0.001, (now - last) / 1000));
        last = now;
        if (!visible) return;
        t += dt;
        if (dirty.rebuild) {
            rebuild();
            dirty.rebuild = false;
            dirty.geo = false;
            dirty.mask = false;
            dirty.glyphs = false;
        }
        if (dirty.glyphs) {
            assignGlyphs();
            dirty.glyphs = false;
        }
        if (dirty.geo) {
            computeGeo();
            dirty.geo = false;
            dirty.mask = false;
        }
        if (dirty.mask) {
            computeMask();
            dirty.mask = false;
        }
        if (dirty.colors) {
            updateColors();
            dirty.colors = false;
            dirty.sprites = true;
        }
        if (dirty.sprites) {
            buildSprites();
            dirty.sprites = false;
        }
        draw(dt);
    }
    ensureFont();
    raf = requestAnimationFrame(frame);
    return {
        setOptions: function (partial) {
            const prev = o;
            const next = resolve(partial);
            o = next;
            if (next.spacing !== prev.spacing) dirty.rebuild = true;
            if (next.mode !== prev.mode) {
                dirty.glyphs = true;
                dirty.sprites = true;
            }
            if (next.font !== prev.font || next.fontFamily !== prev.fontFamily) {
                dirty.sprites = true;
                ensureFont();
            }
            if (next.fontSize !== prev.fontSize) dirty.sprites = true;
            if (next.dotColor !== prev.dotColor || next.waveGlow !== prev.waveGlow || next.background !== prev.background) dirty.colors = true;
            if (next.originX !== prev.originX || next.originY !== prev.originY) dirty.geo = true;
            if (next.expansion !== prev.expansion || next.feathering !== prev.feathering) dirty.mask = true;
            if (!next.trail) trail.length = 0;
        },
        destroy: function () {
            if (destroyed) return;
            destroyed = true;
            cancelAnimationFrame(raf);
            for (let i = 0; i < cleanups.length; i++)cleanups[i]();
            cleanups.length = 0;
        }
    };
};

export default function WarpGridBackground({ fixed = true, zIndex = -1, className = '', style = {}, ...options }) {
    const ref = useRef(null);
    const field = useRef(null);
    const merged = { ...DEFAULTS, ...options };
    const key = JSON.stringify(merged);
    const first = useRef(merged);

    useEffect(() => {
        const instance = createWarpGrid(ref.current, first.current);
        field.current = instance;
        return () => {
            instance.destroy();
            field.current = null;
        };
    }, []);

    useEffect(() => {
        if (field.current) field.current.setOptions(JSON.parse(key));
    }, [key]);

    return (
        <canvas
            ref={ref}
            aria-hidden="true"
            className={className}
            style={{
                position: fixed ? 'fixed' : 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                zIndex,
                pointerEvents: 'none',
                background: merged.background,
                ...style,
            }}
        />
    );
}
