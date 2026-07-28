import { useRef } from 'react';

function ExitingDigit({ digit, height }) {
  return (
    <span
      className="rolling-digit-exit"
      style={{
        display: 'block',
        height,
        lineHeight: height,
        textAlign: 'center',
        fontWeight: 700,
        fontVariantNumeric: 'tabular-nums',
        position: 'absolute',
        top: 0, left: 0, right: 0,
        animation: 'rollOut 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
        willChange: 'transform',
      }}
    >
      {digit}
    </span>
  );
}

function RollingDigit({ digit, prevDigit, height, exitKey }) {
  return (
    <span
      className="rolling-digit"
      style={{
        display: 'inline-block',
        overflow: 'hidden',
        verticalAlign: 'middle',
        lineHeight: 1,
        height,
        width: '0.6em',
        position: 'relative',
      }}
    >
      <span
        key={digit}
        className="rolling-digit-inner"
        style={{
          display: 'block',
          height,
          lineHeight: height,
          textAlign: 'center',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          animation: prevDigit != null ? 'rollIn 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
          willChange: 'transform',
        }}
      >
        {digit}
      </span>
      {exitKey != null && (
        <span key={exitKey} className="rolling-digit-exit" style={{
          display: 'block',
          height,
          lineHeight: height,
          textAlign: 'center',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          position: 'absolute',
          top: 0, left: 0, right: 0,
          animation: 'rollOut 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards',
          willChange: 'transform',
        }}>
          {prevDigit}
        </span>
      )}
    </span>
  );
}

export default function RollingNumber({ value, height = '1.2em', className = '' }) {
  const formatted = String(value == null ? '' : value).split('');
  const prevRef = useRef(null);
  const prevChars = prevRef.current;
  prevRef.current = formatted;

  const exitRef = useRef({});

  return (
    <span
      className={`rolling-number ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}
    >
      {formatted.map((ch, i) => {
        const isDigit = /^[0-9]$/.test(ch);
        if (!isDigit) {
          return (
            <span key={`s${i}`} className="rolling-static" style={{ display: 'inline-block', lineHeight: height, fontWeight: 700 }}>
              {ch}
            </span>
          );
        }
        const prevCh = prevChars ? prevChars[i] : undefined;
        const changed = prevCh !== undefined && prevCh !== ch;
        let exitKey = null;
        if (changed) {
          const entry = exitRef.current[i];
          const nextKey = (entry?.key || 0) + 1;
          exitRef.current[i] = { digit: prevCh, key: nextKey };
          exitKey = nextKey;
        }
        return (
          <RollingDigit
            key={`d${i}`}
            digit={ch}
            prevDigit={changed ? prevCh : null}
            height={height}
            exitKey={exitKey}
          />
        );
      })}
    </span>
  );
}
