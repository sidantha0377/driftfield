// @ts-nocheck
import { createLiquid } from './liquidPaintEngine';
import { ITEMS } from './liquidPaintConfig';

/** Settings in the order the panel shows them, plus the reduced-motion switch for exported code. */
export function exportOptions(settings) {
  const out = {};
  for (const it of ITEMS) out[it.k] = settings[it.k];
  out.respectReducedMotion = true;
  return out;
}

/**
 * The engine is a self-contained function, so its own source is the exported code.
 * In a production build the source is minified. It still runs the same way.
 */
export function engineSource() {
  return 'var createLiquid = ' + createLiquid.toString() + ';';
}

/** The whole animation as one HTML file. */
export function toHTML(settings) {
  const cfg = JSON.stringify(exportOptions(settings), null, 2).replace(/\n/g, '\n  ');
  return [
    '<!doctype html>',
    '<html lang="en">',
    '<head>',
    '<meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    '<title>Liquid Paint</title>',
    '<style>',
    '  html { background: ' + settings.surface1 + '; }',
    '  body { margin: 0; }',
    '  #liquid { position: fixed; inset: 0; width: 100%; height: 100%; display: block; z-index: -1; pointer-events: none; }',
    '</style>',
    '</head>',
    '<body>',
    '<!-- Liquid Paint: the whole animation is in this file. Put your own content after the canvas. -->',
    '<canvas id="liquid" aria-hidden="true"></canvas>',
    '<script>',
    engineSource(),
    '',
    'var liquid = createLiquid(document.getElementById("liquid"), ' + cfg + ');',
    '// liquid.setOptions({ ... }) changes settings later. liquid.destroy() stops it.',
    '</script>',
    '</body>',
    '</html>',
    ''
  ].join('\n');
}

/** One Next.js client component with the engine and the current settings inside. */
export function toNext(settings) {
  const cfg = JSON.stringify(exportOptions(settings), null, 2);
  return [
    '// @ts-nocheck',
    '/* eslint-disable */',
    "'use client';",
    '',
    '// Liquid Paint background for Next.js. Save as components/LiquidPaintBackground.jsx (or .tsx).',
    '// The first two lines turn off type and lint checks for this file, so it also works in a TypeScript project.',
    '// Use it once in app/layout.js:  <LiquidPaintBackground />',
    '// Props override the settings below, for example <LiquidPaintBackground mouseEffect="swirl" flow={1} />.',
    '// Add data-liquid-ignore to any area that should not react to the mouse.',
    '// If your body or a wrapper has its own background color, it hides the canvas. Remove it, or use zIndex={0}.',
    '',
    "import { useEffect, useRef } from 'react';",
    '',
    'const DEFAULTS = ' + cfg + ';',
    '',
    engineSource(),
    '',
    'export default function LiquidPaintBackground({ fixed = true, zIndex = -1, className, style, ...options }) {',
    '  const ref = useRef(null);',
    '  const field = useRef(null);',
    '  const merged = { ...DEFAULTS, ...options };',
    '  const key = JSON.stringify(merged);',
    '  const first = useRef(merged);',
    '',
    '  useEffect(() => {',
    '    const instance = createLiquid(ref.current, first.current);',
    '    field.current = instance;',
    '    return () => {',
    '      instance.destroy();',
    '      field.current = null;',
    '    };',
    '  }, []);',
    '',
    '  useEffect(() => {',
    '    if (field.current) field.current.setOptions(JSON.parse(key));',
    '  }, [key]);',
    '',
    '  return (',
    '    <canvas',
    '      ref={ref}',
    '      aria-hidden="true"',
    '      className={className}',
    '      style={{',
    "        position: fixed ? 'fixed' : 'absolute',",
    '        inset: 0,',
    "        width: '100%',",
    "        height: '100%',",
    '        zIndex,',
    "        pointerEvents: 'none',",
    '        background: merged.surface1,',
    '        ...style,',
    '      }}',
    '    />',
    '  );',
    '}',
    ''
  ].join('\n');
}
