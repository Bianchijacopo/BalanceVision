import { useMemo, useRef, useState, useEffect, useCallback } from 'react';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

function ExitingDigit({ digit, height, onDone }) {
  return (
    <span
      className="rolling-digit-exit"
      onAnimationEnd={onDone}
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
      }}
    >
      {digit}
    </span>
  );
}

function RollingDigit({ digit, prevDigit, height }) {
  const [exiting, setExiting] = useState(null);
  const prevRef = useRef(digit);
  const animKeyRef = useRef(0);

  useEffect(() => {
    if (prevRef.current !== digit) {
      animKeyRef.current += 1;
      setExiting(prevRef.current);
      prevRef.current = digit;
    }
  }, [digit]);

  const handleExitDone = useCallback(() => {
    setExiting(null);
  }, []);

  return (
    <span
      className="rolling-digit"
      style={{
        display: 'inline-block',
        overflow: 'hidden',
        verticalAlign: 'middle',
        lineHeight: 1,
        height,
        width: height ? `${parseFloat(height) * 0.6}px` : 'auto',
        position: 'relative',
      }}
    >
      <span
        key={`${digit}-${animKeyRef.current}`}
        className="rolling-digit-inner"
        style={{
          display: 'block',
          height,
          lineHeight: height,
          textAlign: 'center',
          fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          animation: exiting ? 'rollIn 0.45s cubic-bezier(0.25, 0.46, 0.45, 0.94)' : 'none',
        }}
      >
        {digit}
      </span>
      {exiting && (
        <ExitingDigit digit={exiting} height={height} onDone={handleExitDone} />
      )}
    </span>
  );
}

export default function RollingNumber({ value, height = '1.2em', className = '' }) {
  const formatted = useMemo(() => {
    if (value == null) return [];
    return String(value).split('').map(ch => ({ ch, isDigit: /^[0-9]$/.test(ch) }));
  }, [value]);

  const prevRef = useRef(null);
  const [prevArr, setPrevArr] = useState(null);

  useEffect(() => {
    const arr = formatted.map(f => (f.isDigit ? f.ch : null));
    if (prevRef.current) {
      setPrevArr(prevRef.current);
    } else {
      setPrevArr(null);
    }
    prevRef.current = arr;
  }, [formatted]);

  return (
    <span
      className={`rolling-number ${className}`}
      style={{ display: 'inline-flex', alignItems: 'center', whiteSpace: 'nowrap' }}
    >
      {formatted.map((f, i) => {
        if (f.isDigit) {
          const pd = prevArr ? prevArr[i] : null;
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
