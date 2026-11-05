// @ts-nocheck
'use client';

import { useId } from 'react';
import { COLOR_KEYS, PRESETS } from './liquidPaintConfig';

export function RangeControl({ item, value, onChange }) {
    const id = useId();
    const p = ((value - item.min) / (item.max - item.min)) * 100 + '%';
    return (
        <div className="lp-row">
            <div className="lp-row-head">
                <label className="lp-row-label" htmlFor={id}>{item.label}</label>
                <span className="lp-val">{item.fmt(value)}</span>
            </div>
            <input
                id={id}
                type="range"
                min={item.min}
                max={item.max}
                step={item.step}
                value={value}
                style={{ '--p': p }}
                onChange={(e) => onChange(item.k, parseFloat(e.target.value))}
            />
        </div>
    );
}

export function SegControl({ item, value, onChange }) {
    const id = useId();
    return (
        <div className="lp-row">
            <span className="lp-row-label" id={id}>{item.label}</span>
            <div className="lp-seg" role="radiogroup" aria-labelledby={id}>
                {item.opts.map(([v, text]) => (
                    <button
                        key={v}
                        type="button"
                        role="radio"
                        aria-checked={value === v}
                        onClick={() => onChange(item.k, v)}
                    >
                        {text}
                    </button>
                ))}
            </div>
        </div>
    );
}

export function ColorControl({ item, value, onChange }) {
    const id = useId();
    return (
        <div className="lp-row lp-inline">
            <label className="lp-row-label" htmlFor={id}>{item.label}</label>
            <input
                id={id}
                type="color"
                value={value}
                onChange={(e) => onChange(item.k, e.target.value)}
            />
        </div>
    );
}

export function PresetControl({ settings, onPreset }) {
    const id = useId();
    return (
        <div className="lp-row">
            <span className="lp-row-label" id={id}>Preset</span>
            <div className="lp-presets" role="group" aria-labelledby={id}>
                {PRESETS.map((p) => {
                    const active = COLOR_KEYS.every((k) => String(settings[k]).toLowerCase() === p[k]);
                    return (
                        <button
                            key={p.id}
                            type="button"
                            className="lp-preset"
                            aria-pressed={active}
                            onClick={() => onPreset(p)}
                        >
                            <span
                                className="lp-preset-bar"
                                style={{ background: `linear-gradient(90deg, ${p.surface1}, ${p.surface2}, ${p.surface3}, ${p.surface4})` }}
                            />
                            <span className="lp-preset-name">{p.name}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}

export function Control({ item, value, onChange }) {
    switch (item.t) {
        case 'range': return <RangeControl item={item} value={value} onChange={onChange} />;
        case 'seg': return <SegControl item={item} value={value} onChange={onChange} />;
        case 'color': return <ColorControl item={item} value={value} onChange={onChange} />;
        default: return null;
    }
}
