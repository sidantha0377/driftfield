'use client';

import { useId } from 'react';

export function RangeControl({ item, value, onChange }) {
    const id = useId();
    const p = ((value - item.min) / (item.max - item.min)) * 100 + '%';
    return (
        <div className="wg-row">
            <div className="wg-row-head">
                <label className="wg-row-label" htmlFor={id}>{item.label}</label>
                <span className="wg-val">{item.fmt(value)}</span>
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
        <div className="wg-row">
            <span className="wg-row-label" id={id}>{item.label}</span>
            <div className="wg-seg" role="radiogroup" aria-labelledby={id}>
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

export function ToggleControl({ item, value, onChange }) {
    const id = useId();
    return (
        <div className="wg-row wg-inline">
            <span className="wg-row-label" id={id}>{item.label}</span>
            <button
                type="button"
                role="switch"
                className="wg-switch"
                aria-labelledby={id}
                aria-checked={!!value}
                onClick={() => onChange(item.k, !value)}
            />
        </div>
    );
}

export function ColorControl({ item, value, onChange }) {
    const id = useId();
    return (
        <div className="wg-row wg-inline">
            <label className="wg-row-label" htmlFor={id}>{item.label}</label>
            <input
                id={id}
                type="color"
                value={value}
                onChange={(e) => onChange(item.k, e.target.value)}
            />
        </div>
    );
}

export function Control({ item, value, onChange }) {
    switch (item.t) {
        case 'range': return <RangeControl item={item} value={value} onChange={onChange} />;
        case 'seg': return <SegControl item={item} value={value} onChange={onChange} />;
        case 'toggle': return <ToggleControl item={item} value={value} onChange={onChange} />;
        case 'color': return <ColorControl item={item} value={value} onChange={onChange} />;
        default: return null;
    }
}