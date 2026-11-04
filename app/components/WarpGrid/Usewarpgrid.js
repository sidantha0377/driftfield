'use client';

import { useEffect, useRef } from 'react';
import { createWarpGrid } from './warpGridEngine';

/**
 * Runs the warp grid canvas engine.
 * @param canvasRef  ref to the <canvas>
 * @param settings   current settings object (immutable updates)
 *
 * The engine itself lives in warpGridEngine.js so the editor and the exported
 * HTML / Next.js code run exactly the same drawing code.
 */
export default function useWarpGrid(canvasRef, settings) {
  const engineRef = useRef(null);
  const initialRef = useRef(settings);

  // Engine (mounted once). The editor turns the wave and cursor off itself for
  // reduced motion (see getStartSettings), so the engine's own switch stays off here.
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return undefined;
    const engine = createWarpGrid(cv, { ...initialRef.current, respectReducedMotion: false });
    engineRef.current = engine;
    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [canvasRef]);

  // Push settings changes into the running engine. It rebuilds only what changed.
  useEffect(() => {
    if (engineRef.current) {
      engineRef.current.setOptions({ ...settings, respectReducedMotion: false });
    }
  }, [settings]);
}
