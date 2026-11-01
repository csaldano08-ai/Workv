import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Vero se l'utente ha chiesto di ridurre il movimento (iOS: Impostazioni → Accessibilità; web: prefers-reduced-motion). */
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    let alive = true;
    void AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduced(v))
      .catch(() => undefined);
    const sub = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => {
      alive = false;
      sub.remove();
    };
  }, []);
  return reduced;
}
