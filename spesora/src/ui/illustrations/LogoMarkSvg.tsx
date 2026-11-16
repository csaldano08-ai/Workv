import { Circle, G, Path, Rect } from 'react-native-svg';
import { clamp } from '../motion/shapes';
import { illo } from './palette';

/** Stato di costruzione del marchio (0..1 per parte). */
export interface MarkParts {
  body?: number;
  header?: number;
  ringL?: number;
  ringR?: number;
  plate?: number;
  ring?: number;
  check?: number;
}

const RING_LEN = 2 * Math.PI * 9;
const CHECK_LEN = Math.hypot(2.5, 2.5) + Math.hypot(5, 5.5);

/**
 * Marchio Spesora con la stessa geometria di src/ui/Logo.tsx (viewBox 64), disegnato per parti
 * per poterlo costruire in animazione. Da usare dentro un <Svg>; (cx, cy) = centro, size = lato.
 */
export function LogoMarkSvg({ cx, cy, size, parts = {}, opacity = 1 }: { cx: number; cy: number; size: number; parts?: MarkParts; opacity?: number }) {
  const p = { body: 1, header: 1, ringL: 1, ringR: 1, plate: 1, ring: 1, check: 1, ...parts };
  const u = size / 64;
  const bodyT = `translate(32 34) scale(${Math.max(0.0001, p.body)}) translate(-32 -34)`;
  const ring = (x: number, k: number) => (k > 0 ? <Rect x={x} y={3 + (1 - k) * -26} width={5} height={12} rx={2.5} fill={illo.peach} /> : null);
  return (
    <G transform={`translate(${cx - 32 * u} ${cy - 32 * u}) scale(${u})`} opacity={opacity}>
      {p.body > 0 ? (
        <G transform={bodyT}>
          <Rect x={4} y={8} width={56} height={52} rx={14} fill={illo.green} />
          {p.header > 0 ? <Rect x={4} y={8} width={56} height={14 * clamp(p.header)} rx={7} fill={illo.greenDark} opacity={clamp(p.header)} /> : null}
        </G>
      ) : null}
      {ring(16, p.ringL)}
      {ring(43, p.ringR)}
      {p.plate > 0 ? <Circle cx={32} cy={40} r={14 * p.plate} fill={illo.ivory} /> : null}
      {p.ring > 0 ? (
        <Circle
          cx={32}
          cy={40}
          r={9}
          fill="none"
          stroke={illo.peach}
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeDasharray={`${RING_LEN} ${RING_LEN}`}
          strokeDashoffset={RING_LEN * (1 - clamp(p.ring))}
          transform="rotate(-90 32 40)"
        />
      ) : null}
      {p.check > 0 ? (
        <Path
          d="M29 40 l2.5 2.5 l5 -5.5"
          stroke={illo.green}
          strokeWidth={2.6}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray={`${CHECK_LEN} ${CHECK_LEN}`}
          strokeDashoffset={CHECK_LEN * (1 - clamp(p.check))}
        />
      ) : null}
    </G>
  );
}
