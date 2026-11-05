// @ts-nocheck
'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useLiquidPaint from './useLiquidPaint';
import SettingsPanel from './SettingsPanel';
import { COLOR_KEYS, DEFAULTS, loadSettings, saveSettings, getStartSettings } from './liquidPaintConfig';
import './LiquidPaint.css';

/**
 * The Liquid Paint editor: the background plus the settings panel.
 * Use <LiquidPaint showPanel={false} /> to show only the background with your saved settings.
 * For a site background without the editor, use "Copy Next.js" in the panel.
 */
export default function LiquidPaint({ showPanel = true, showHint = true }) {
    const canvasRef = useRef(null);

    // Render the defaults first so server and client markup match, then load saved settings.
    const [settings, setSettings] = useState(DEFAULTS);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        setSettings(loadSettings());
        setLoaded(true);
    }, []);

    useLiquidPaint(canvasRef, settings);

    // Save settings shortly after the last change.
    useEffect(() => {
        if (!loaded) return undefined;
        const id = setTimeout(() => saveSettings(settings), 200);
        return () => clearTimeout(id);
    }, [settings, loaded]);

    const handleChange = useCallback((key, value) => {
        setSettings((s) => ({ ...s, [key]: value }));
    }, []);

    const handlePreset = useCallback((preset) => {
        setSettings((s) => {
            const next = { ...s };
            COLOR_KEYS.forEach((k) => {
                next[k] = preset[k];
            });
            return next;
        });
    }, []);

    const handleReset = useCallback(() => {
        setSettings(getStartSettings());
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                className="lp-field"
                role="img"
                aria-label="Flowing liquid paint background"
                style={{ background: settings.surface1 }}
            />
            {showHint && (
                <div className="lp-hint">Drag the mouse across the paint to push it around and stir in color.</div>
            )}
            {showPanel && (
                <SettingsPanel
                    settings={settings}
                    onChange={handleChange}
                    onPreset={handlePreset}
                    onReset={handleReset}
                />
            )}
        </>
    );
}
