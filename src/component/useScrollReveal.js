
import React, { useRef, useEffect, useState } from 'react';

export function useScrollReveal(delay = 0) {
  const ref = useRef(null);
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || animated) return;

    const check = () => {
      const rect = el.getBoundingClientRect();
      if (rect.top < window.innerHeight - 50) {
        setAnimated(true);
      }
    };

    // Check immediately on mount
    check();

    // Also check on scroll
    window.addEventListener('scroll', check, { passive: true });
    return () => window.removeEventListener('scroll', check);
  }, [animated]);

  return [ref, animated];
}

// ─────────────────────────────────────────────────────────────────────────────
// <Reveal> component
// Content is always visible. When it scrolls into view, animateIn class fires.
// ─────────────────────────────────────────────────────────────────────────────
export function Reveal({ children, delay = 0, direction = 'up', style: extra = {} }) {
  const [ref, animated] = useScrollReveal(delay);

  const getTransform = () => {
    if (!animated) return 'none';
    return 'none';
  };

  return (
    <div
      ref={ref}
      style={{
        // Always visible — never opacity:0
        opacity: 1,
        transform: getTransform(),
        ...extra,
      }}
      className={animated ? `sr-animated sr-${direction}` : `sr-pending sr-${direction}`}
    >
      {children}
    </div>
  );
}
