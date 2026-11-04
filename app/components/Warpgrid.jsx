'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import useWarpGrid from './Usewarpgrid';
import SettingsPanel from './Settingspanel';
import { DEFAULTS, loadSettings, saveSettings, getStartSettings } from './warpGridConfig';
import './Warpgrid.css';


export default function WarpGrid({ showPanel = true, showHint = true }) {
    const canvasRef = useRef(null);

    const [settings, setSettings] = useState(DEFAULTS);
    const [loaded, setLoaded] = useState(false);


    useEffect(() => {
        setSettings(loadSettings());
        setLoaded(true);
    }, []);

    useWarpGrid(canvasRef, settings);


    useEffect(() => {
        if (!loaded) return undefined;
        const id = setTimeout(() => saveSettings(settings), 200);
        return () => clearTimeout(id);
    }, [settings, loaded]);

    const handleChange = useCallback((key, value) => {
        setSettings((s) => ({ ...s, [key]: value }));
    }, []);

    const handleReset = useCallback(() => {
        setSettings(getStartSettings());
    }, []);

    return (
        <>
            <canvas
                ref={canvasRef}
                className="wg-field"
                role="img"
                aria-label="Interactive warp grid background"
            />
            {showHint && (
                <div className="wg-hint">Move across the grid to bend it. Click to send a ripple.</div>
            )}
            {showPanel && (
                <SettingsPanel settings={settings} onChange={handleChange} onReset={handleReset} />
            )}
        </>
    );
}