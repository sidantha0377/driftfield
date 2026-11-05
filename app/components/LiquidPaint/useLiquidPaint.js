// @ts-nocheck
'use client';

import { useEffect, useRef } from 'react';
import { createLiquid } from './liquidPaintEngine';

/**
 * Runs the liquid paint engine on a canvas.
 * @param canvasRef  ref to the <canvas>
 * @param settings   current settings object (immutable updates)
 *
 * The engine lives in liquidPaintEngine.js so the editor and the exported
 * HTML / Next.js code run exactly the same drawing code.
 */
export default function useLiquidPaint(canvasRef, settings) {
  const engineRef = useRef(null);
  const initialRef = useRef(settings);

  // Engine (mounted once). The editor turns the flow down itself for reduced
  // motion (see getStartSettings), so the engine's own switch stays off here.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const engine = createLiquid(cv, { ...initialRef.current, respectReducedMotion: false });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [canvasRef]);

  // Push settings changes into the running engine.
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOptions({ ...settings, respectReducedMotion: false });
    }
  }, [settings]);
}
