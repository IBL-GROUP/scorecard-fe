import { useEffect, useState } from 'react';

const DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

/** A formatted number ("391.98M", "88.8%") whose digits roll into place when
 *  it changes, and roll up from 0 the first time it shows. Columns are keyed
 *  from the right, so "98.0M" → "102.4M" keeps the units digit in place.
 *  Screen readers get the plain text. Styling (size, weight, colour) comes
 *  from the parent; classes live in themeCss. */
export function RollingNumber({ value }: { value: string }) {
  const [shown, setShown] = useState(false);
  useEffect(() => {
    // rAF can be held back in a background tab; the timeout makes sure the
    // real digits always land.
    const id = requestAnimationFrame(() => setShown(true));
    const t = setTimeout(() => setShown(true), 60);
    return () => {
      cancelAnimationFrame(id);
      clearTimeout(t);
    };
  }, []);
  const chars = [...value];
  return (
    <span className="sp-rn" aria-label={value} role="img">
      {chars.map((ch, i) => {
        const key = chars.length - i;
        if (!/\d/.test(ch))
          return (
            <span key={`c${key}${ch}`} aria-hidden>
              {ch}
            </span>
          );
        const d = shown ? Number(ch) : 0;
        return (
          <span key={`d${key}`} className="sp-rn-col" aria-hidden>
            <span className="sp-rn-strip" style={{ transform: `translateY(-${d * 1.15}em)`, transitionDelay: `${Math.min(i, 6) * 20}ms` }}>
              {DIGITS.map((n) => (
                <span key={n}>{n}</span>
              ))}
            </span>
          </span>
        );
      })}
    </span>
  );
}
