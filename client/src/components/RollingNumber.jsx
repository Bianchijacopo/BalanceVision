import { useMemo, useRef, useState, useEffect } from 'react';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function RollingDigit({ digit, prevDigit, height }) {
  const currIdx = DIGITS.indexOf(digit);
  const prevIdx = prevDigit !== null ? DIGITS.indexOf(prevDigit) : currIdx;

  return (
    <span
      className="rolling-digit"
      style={{
        display: 'inline-block',
        overflow: 'hidden',
        verticalAlign: 'middle',
        lineHeight: 1,
        height,
        width: height ? `${height * 0.6}px` : 'auto',
        position: 'relative',
      }}
    >
      <span
        className="rolling-strip"
        style={{
          display: 'block',
          transition: 'transform 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          transform: `translateY(${-currIdx * parseFloat(height)}px)`,
          willChange: 'transform',
        }}
      >
        {DIGITS.map(d => (
          <span
            key={d}
            className="rolling-digit-item"
            style={{
              display: 'block',
              height,
              lineHeight: height,
              textAlign: 'center',
              fontWeight: 700,
              fontVariantNumeric: 'tabular-nums',
            }}
          >
            {d}
          </span>
        ))}
      </span>
    </span>
  );
}

export default function RollingNumber({ value, height = '1.2em', className = '' }) {
  const formatted = useMemo(() => {
    if (value == null) return [];
    return String(value).split('').map(ch => ({ ch, isDigit: /^[0-9]$/.test(ch) }));
  }, [value]);

  const [prevDigits, setPrevDigits] = useState(null);
  const prevRef = useRef(null);

  useEffect(() => {
    const currentDigits = formatted.map(f => (f.isDigit ? f.ch : null));
    if (prevRef.current) {
      setPrevDigits(prevRef.current);
    }
    prevRef.current = currentDigits;
  }, [formatted]);

  return (
    <span
      className={`rolling-number ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}
    >
      {formatted.map((f, i) => {
        if (f.isDigit) {
          const pd = prevDigits ? prevDigits[i] : null;
          const changed = pd !== null && pd !== f.ch;
          return (
            <RollingDigit
              key={`${i}`}
              digit={f.ch}
              prevDigit={changed ? pd : null}
              height={height}
            />
          );
        }
        return (
          <span key={i} className="rolling-static" style={{ display: 'inline-block', lineHeight: height, fontWeight: 700 }}>
            {f.ch}
          </span>
        );
      })}
    </span>
  );
}
