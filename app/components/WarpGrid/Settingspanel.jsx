'use client';

import { useEffect, useRef, useState } from 'react';
import { SCHEMA, toCSS } from './warpGridConfig';
import { toHTML, toNext } from './warpGridExport';
import { Control } from './Controls';

export default function SettingsPanel({ settings, onChange, onReset }) {
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
        <div className="wg-dock" data-wg-ignore>
            <button
                className="wg-btn wg-open-btn"
                type="button"
                aria-expanded={open}
                aria-controls="wg-panel"
                onClick={() => setOpen((o) => !o)}
            >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                    <path d="M2 4h7M13 4h1M2 12h1M7 12h7" />
                    <circle cx="11" cy="4" r="1.8" />
                    <circle cx="5" cy="12" r="1.8" />
                </svg>
                Settings
            </button>

            <aside className="wg-panel" id="wg-panel" aria-label="Warp grid settings" hidden={!open}>
                <div className="wg-panel-head">
                    <span className="wg-panel-title">Warp Grid</span>
                    <span className="wg-head-actions">
                        <span className="wg-status" role="status" aria-live="polite">{status}</span>
                        <button className="wg-btn" type="button" onClick={handleReset}>Reset</button>
                    </span>
                </div>

                <div>
                    {SCHEMA.map((sec) => (
                        <section className="wg-section" key={sec.title}>
                            <h2 className="wg-h2">{sec.title}</h2>
                            {sec.items.map((it) => (
                                <Control key={it.k} item={it} value={settings[it.k]} onChange={onChange} />
                            ))}
                        </section>
                    ))}
                </div>

                <section className="wg-section wg-export">
                    <h2 className="wg-h2">Export</h2>
                    <div className="wg-export-actions">
                        <button className="wg-btn" type="button" onClick={() => copyText(toHTML(settings), 'HTML copied')}>
                            Copy HTML
                        </button>
                        <button className="wg-btn" type="button" onClick={() => copyText(toNext(settings), 'Next.js copied')}>
                            Copy Next.js
                        </button>
                        <button className="wg-btn" type="button" onClick={() => copyText(toCSS(settings), 'CSS copied')}>
                            Copy CSS
                        </button>
                        <button
                            className="wg-btn"
                            type="button"
                            onClick={() => copyText(JSON.stringify(settings, null, 2), 'JSON copied')}
                        >
                            Copy JSON
                        </button>
                    </div>
                    <p className="wg-note">
                        HTML is the whole animation in one file. Next.js is one component file. Both use your current
                        settings.
                    </p>
                    {jsonText !== null && (
                        <textarea
                            ref={jsonRef}
                            className="wg-json"
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
