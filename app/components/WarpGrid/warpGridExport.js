import { createWarpGrid } from './warpGridEngine';
import { SCHEMA } from './warpGridConfig';

const ITEMS = SCHEMA.flatMap((s) => s.items);

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
  return 'var createWarpGrid = ' + createWarpGrid.toString() + ';';
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
    '<title>Warp Grid</title>',
    '<link rel="preconnect" href="https://fonts.googleapis.com">',
    '<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>',
    '<link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=JetBrains+Mono:wght@400;500&family=Newsreader:wght@400;500&display=swap" rel="stylesheet">',
    '<style>',
    '  html, body { margin: 0; height: 100%; background: ' + settings.background + '; }',
    '  #warp-grid { position: fixed; inset: 0; width: 100%; height: 100%; display: block; }',
    '</style>',
    '</head>',
    '<body>',
    '<!-- Warp Grid: the whole animation is in this file. Put your own content after the canvas. -->',
    '<canvas id="warp-grid" aria-hidden="true"></canvas>',
    '<script>',
    engineSource(),
    '',
    'var warpGrid = createWarpGrid(document.getElementById("warp-grid"), ' + cfg + ');',
    '// warpGrid.setOptions({ ... }) changes settings later. warpGrid.destroy() stops it.',
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
    "'use client';",
    '',
    '// Warp Grid background for Next.js. Save as components/WarpGridBackground.jsx.',
    '// Use it once in app/layout.js:  <WarpGridBackground />',
    '// Props override the settings below, for example <WarpGridBackground mode="dots" force={16} />.',
    '// Add data-wg-ignore to any area that should not react to the cursor.',
    '',
    "import { useEffect, useRef } from 'react';",
    '',
    'const DEFAULTS = ' + cfg + ';',
    '',
    engineSource(),
    '',
    'export default function WarpGridBackground({ fixed = true, zIndex = -1, className, style, ...options }) {',
    '  const ref = useRef(null);',
    '  const field = useRef(null);',
    '  const merged = { ...DEFAULTS, ...options };',
    '  const key = JSON.stringify(merged);',
    '  const first = useRef(merged);',
    '',
    '  useEffect(() => {',
    '    const instance = createWarpGrid(ref.current, first.current);',
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
    '        background: merged.background,',
    '        ...style,',
    '      }}',
    '    />',
    '  );',
    '}',
    ''
  ].join('\n');
}
