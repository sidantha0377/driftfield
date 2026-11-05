# Liquid Paint for Next.js

A background that looks like flowing liquid paint. It moves slowly by itself and reacts to the mouse. It is drawn live on the graphics card with WebGL2, so it needs no images.

## Install

Copy this folder into your project, for example `components/liquid-paint/`. No packages to install.

## Open the editor

The editor is the background plus the settings panel. Use it on a page of its own while you tune the look.

```jsx
// app/liquid/page.jsx
import LiquidPaint from '@/components/liquid-paint';

export default function Page() {
  return <LiquidPaint />;
}
```

Your settings are saved in the browser, so the page keeps them on reload.

## Use it as a site background

1. Tune the look in the editor.
2. In the Export section, press **Copy Next.js**.
3. Save the result as `components/LiquidPaintBackground.jsx`.
4. Add it once to the root layout:

```jsx
// app/layout.jsx
import LiquidPaintBackground from '@/components/LiquidPaintBackground';

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <LiquidPaintBackground />
        {children}
      </body>
    </html>
  );
}
```

The exported file holds the engine and your settings, so it works without the rest of this folder. Props override the settings, for example `<LiquidPaintBackground mouseEffect="swirl" flow={1} />`.

**Copy HTML** gives the same animation as a single `.html` file. **Copy JSON** gives the settings alone.

## Settings

| Setting | What it changes |
| --- | --- |
| `colorMode` | `'palette'` uses all four surfaces. `'single'` uses only surface 1, in lighter and darker tones. |
| `surface1` to `surface4` | Colors of the liquid, from low to high |
| `mouse1`, `mouse2` | Colors the mouse adds. The color drifts between them as you move. |
| `flow` | Speed of the natural movement, 0 to 2 |
| `streaks` | Number of glowing lines, 0 to 100 |
| `mouseEffect` | `'smear'` drags the paint the way the mouse moves. `'swirl'` twists it. `'bulge'` magnifies it. |
| `strength` | How strongly the mouse bends the paint, 0 to 100 |
| `brushSize` | Size of the area the mouse affects, 40 to 400 px |
| `linger` | How long mouse colors and bends stay, 0 to 100 |
| `renderScale` | Share of the screen's pixels that are drawn, 0.3 to 1. Lower it on weak graphics cards. |

## Keep an area from reacting to the mouse

Add `data-liquid-ignore` to any element, such as a menu or a form.

```jsx
<nav data-liquid-ignore>...</nav>
```

## Notes

- **Errors in a TypeScript project.** These files are plain JavaScript. Each starts with `// @ts-nocheck`, and the exported file starts with it too, so a `.tsx` copy does not report type errors.
- **A background that does not show.** The exported component sits behind your page (`z-index: -1`). If `body` or a wrapper has its own background color, it hides the canvas. Remove that color, or pass `zIndex={0}` and give your content `position: relative`.
- **Browsers.** WebGL2 is needed. Without it you get a plain gradient from your surface colors.
- **Reduced motion.** Exported code slows the flow and ignores the mouse for visitors who ask for reduced motion.
- **Production builds.** The export reads the engine's own source, so in a production build the exported code is minified. It runs the same way but is hard to read. Copy it from `next dev` if you want readable code.
- **Files.** `liquidPaintEngine.js` is the drawing code. `liquidPaintConfig.js` holds the defaults, presets and settings list. `liquidPaintExport.js` builds the exported files.
