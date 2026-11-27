import Svg, { Path, Rect } from 'react-native-svg';

/**
 * Icone della barra delle schede, disegnate come nel riferimento: casa (Oggi), calendario (Settimana),
 * cestino (Spesa), barattolo (Dispensa), cappello da chef (Ricette). Contorno quando la scheda non è attiva,
 * forma piena verde con i dettagli bianchi quando è attiva.
 */
export type NavGlyphName = 'today' | 'week' | 'shopping' | 'pantry' | 'recipes';

export function NavGlyph({ name, focused, color, size = 26 }: { name: NavGlyphName; focused: boolean; color: string; size?: number }) {
  const sw = 1.9;
  const fill = focused ? color : 'none';
  const detail = focused ? '#FFFFFF' : color;
  const line = { stroke: color, strokeWidth: sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  const inner = { stroke: detail, strokeWidth: focused ? 1.7 : sw, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, fill: 'none' };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'today' ? (
        <>
          <Path d="M3.8 11 L12 4.2 L20.2 11 V19 Q20.2 20.6 18.6 20.6 H5.4 Q3.8 20.6 3.8 19 Z" fill={fill} {...line} />
          <Path d="M9.8 20.6 V15.4 Q9.8 14.4 10.8 14.4 H13.2 Q14.2 14.4 14.2 15.4 V20.6" {...inner} />
        </>
      ) : name === 'week' ? (
        <>
          <Rect x="3.6" y="5.4" width="16.8" height="15.2" rx="3" fill={fill} {...line} />
          <Path d="M8 3.4 V7.2 M16 3.4 V7.2" {...line} />
          <Path d="M3.8 10 H20.2" {...inner} />
          <Path d="M8 13.6 H8.01 M12 13.6 H12.01 M16 13.6 H16.01 M8 17 H8.01 M12 17 H12.01" {...inner} strokeWidth={2.4} />
        </>
      ) : name === 'shopping' ? (
        <>
          <Path d="M8 10 Q8.6 4.6 12 4.6 Q15.4 4.6 16 10" {...line} fill="none" />
          <Path d="M3.4 10 H20.6 L18.6 19.2 Q18.3 20.6 16.9 20.6 H7.1 Q5.7 20.6 5.4 19.2 Z" fill={fill} {...line} />
          <Path d="M9.4 13.6 V17 M12 13.6 V17 M14.6 13.6 V17" {...inner} />
        </>
      ) : name === 'pantry' ? (
        <>
          <Rect x="6.6" y="3.4" width="10.8" height="3.6" rx="1.4" fill={fill} {...line} />
          <Path d="M7.4 7 Q5.4 8.6 5.4 11 V18.4 Q5.4 20.6 7.6 20.6 H16.4 Q18.6 20.6 18.6 18.4 V11 Q18.6 8.6 16.6 7 Z" fill={fill} {...line} />
          <Rect x="8.6" y="12.4" width="6.8" height="4.4" rx="1.2" {...inner} />
        </>
      ) : (
        <>
          <Path
            d="M7 14.6 Q3.4 13.8 3.8 10.4 Q4.3 7.4 7.4 7.6 Q8.4 4.4 12 4.4 Q15.6 4.4 16.6 7.6 Q19.7 7.4 20.2 10.4 Q20.6 13.8 17 14.6 Z"
            fill={fill}
            {...line}
          />
          <Path d="M7 14.6 V19 Q7 20.6 8.6 20.6 H15.4 Q17 20.6 17 19 V14.6" fill={fill} {...line} />
          <Path d="M7.2 17.2 H16.8" {...inner} />
        </>
      )}
    </Svg>
  );
}
