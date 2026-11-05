// @ts-nocheck
'use client';

import { useEffect, useRef, useState } from 'react';
import { SCHEMA } from './liquidPaintConfig';
import { exportOptions, toHTML, toNext } from './liquidPaintExport';
import { Control, PresetControl } from './Controls';

export default function SettingsPanel({ settings, onChange, onPreset, onReset }) {
    // Start open on the server; collapse on small screens after mount (avoids hydration mismatch).
    const [open, setOpen] = useState(true);
    useEffect(() => {
        setOpen(window.innerWidth >= 640);
    }, []);
    const [status, setStatus] = useState('');
    const [jsonText, setJsonText] = useState(null); // null = hidden
    const statusTimer = useRef(0);
    const jsonRef = useRef(null);

    useEffect(() => () => clearTimeout(statusTimer.current), []);

    useEffect(() => {
        if (jsonText !== null && jsonRef.current) {
            jsonRef.current.focus();
            jsonRef.current.select();
        }
    }, [jsonText]);

    const say = (msg) => {
        setStatus(msg);
        clearTimeout(statusTimer.current);
        statusTimer.current = setTimeout(() => setStatus(''), 1800);
    };

    const copyText = async (txt, okMsg) => {
        try {
            await navigator.clipboard.writeText(txt);
            setJsonText(null);
            say(okMsg);
        } catch (e) {
            setJsonText(txt);
            say('Select and copy');
        }
    };

    const handleReset = () => {
        onReset();
        setJsonText(null);
        say('Reset');
    };

    return (
        <div className="lp-dock" data-liquid-ignore>
            <button
                className="lp-btn lp-open-btn"
                type="button"
                aria-expanded={open}
                aria-controls="lp-panel"
                onClick={() => setOpen((o) => !o)}
            >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M2 4h7M13 4h1M2 12h1M7 12h7" />
                    <circle cx="11" cy="4" r="1.8" />
                    <circle cx="5" cy="12" r="1.8" />
                </svg>
                Settings
            </button>

            <aside className="lp-panel" id="lp-panel" aria-label="Liquid paint settings" hidden={!open}>
                <div className="lp-panel-head">
                    <span className="lp-panel-title">Liquid Paint</span>
                    <span className="lp-head-actions">
                        <span className="lp-status" role="status" aria-live="polite">{status}</span>
                        <button className="lp-btn" type="button" onClick={handleReset}>Reset</button>
                    </span>
                </div>

                <div>
                    {SCHEMA.map((sec) => (
                        <section className="lp-section" key={sec.title}>
                            <h2 className="lp-h2">{sec.title}</h2>
                            {sec.items.map((it) =>
                                it.t === 'presets' ? (
                                    <PresetControl key="presets" settings={settings} onPreset={onPreset} />
                                ) : (
                                    <Control key={it.k} item={it} value={settings[it.k]} onChange={onChange} />
                                )
                            )}
                        </section>
                    ))}
                </div>

                <section className="lp-section lp-export">
                    <h2 className="lp-h2">Export</h2>
                    <div className="lp-export-actions">
                        <button className="lp-btn" type="button" onClick={() => copyText(toHTML(settings), 'HTML copied')}>
                            Copy HTML
                        </button>
                        <button className="lp-btn" type="button" onClick={() => copyText(toNext(settings), 'Next.js copied')}>
                            Copy Next.js
                        </button>
                        <button
                            className="lp-btn"
                            type="button"
                            onClick={() => copyText(JSON.stringify(exportOptions(settings), null, 2), 'JSON copied')}
                        >
                            Copy JSON
                        </button>
                    </div>
                    <p className="lp-note">
                        HTML is the whole animation in one file. Next.js is one component file. Both use your current
                        settings.
                    </p>
                    {jsonText !== null && (
                        <textarea
                            ref={jsonRef}
                            className="lp-json"
                            readOnly
                            value={jsonText}
                            aria-label="Exported code"
                        />
                    )}
                </section>
            </aside>
        </div>
    );
}
