import Svg, { Circle, Ellipse, Path, Rect } from 'react-native-svg';

/**
 * Piccole illustrazioni piatte per le tessere del questionario (pasti e alimentazione), nello stile delle
 * immagini del riferimento: forme piene e calde, un contorno morbido. Decorative: l'etichetta è nel testo.
 */
export type ChoiceArtName = 'colazione' | 'pranzo' | 'cena' | 'spuntino' | 'onnivoro' | 'pescetariano' | 'vegetariano' | 'vegano';

const INK = '#5A3A1E';

export function ChoiceArt({ name, size = 56 }: { name: ChoiceArtName; size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {name === 'colazione' ? (
        // cornetto
        <>
          <Path d="M8 40 C6 28 18 18 32 18 C46 18 58 28 56 40 C52 46 44 44 40 40 C36 46 28 46 24 40 C20 44 12 46 8 40 Z" fill="#F2A541" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M24 40 C24 30 27 22 32 19 M40 40 C40 30 37 22 32 19" stroke={INK} strokeWidth={1.8} fill="none" strokeLinecap="round" />
          <Path d="M14 30 C17 27 21 26 24 27 M50 30 C47 27 43 26 40 27" stroke="#FFD58A" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </>
      ) : name === 'pranzo' ? (
        // ciotola con verdure
        <>
          <Circle cx="24" cy="26" r="7" fill="#E9573F" stroke={INK} strokeWidth={1.6} />
          <Path d="M30 22 C34 14 44 14 46 22 C42 20 36 20 30 22 Z" fill="#6DB33F" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
          <Circle cx="38" cy="27" r="5" fill="#F5C542" stroke={INK} strokeWidth={1.6} />
          <Path d="M8 30 H56 C56 44 46 52 32 52 C18 52 8 44 8 30 Z" fill="#FFFFFF" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M12 34 H52" stroke="#DCECD8" strokeWidth={3} strokeLinecap="round" />
        </>
      ) : name === 'cena' ? (
        // cloche
        <>
          <Path d="M10 44 C10 30 20 20 32 20 C44 20 54 30 54 44 Z" fill="#C9D3D6" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M18 36 C19 30 24 25 30 24" stroke="#FFFFFF" strokeWidth={2.6} fill="none" strokeLinecap="round" />
          <Circle cx="32" cy="17" r="3.4" fill="#C9D3D6" stroke={INK} strokeWidth={1.8} />
          <Rect x="6" y="44" width="52" height="5" rx="2.5" fill="#A7B4B8" stroke={INK} strokeWidth={1.8} />
        </>
      ) : name === 'spuntino' ? (
        // mela
        <>
          <Path d="M32 22 C26 16 12 18 12 32 C12 44 22 54 28 52 C30 51 34 51 36 52 C42 54 52 44 52 32 C52 18 38 16 32 22 Z" fill="#E9573F" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M32 22 C32 17 34 13 37 11" stroke={INK} strokeWidth={2} fill="none" strokeLinecap="round" />
          <Path d="M35 15 C39 9 47 10 48 13 C44 17 39 17 35 15 Z" fill="#6DB33F" stroke={INK} strokeWidth={1.6} strokeLinejoin="round" />
          <Path d="M20 30 C21 27 23 25 26 24" stroke="#FFB3A3" strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </>
      ) : name === 'onnivoro' ? (
        // coscia di pollo
        <>
          <Path d="M14 40 C8 30 14 14 28 12 C42 10 52 22 46 34 C42 42 30 42 26 44 C22 46 18 46 14 40 Z" fill="#D98B45" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M26 44 L40 54" stroke="#F4EBDD" strokeWidth={6} strokeLinecap="round" />
          <Circle cx="42" cy="56" r="4" fill="#F4EBDD" stroke={INK} strokeWidth={1.6} />
          <Circle cx="44" cy="51" r="3.6" fill="#F4EBDD" stroke={INK} strokeWidth={1.6} />
          <Path d="M20 24 C23 19 28 17 33 17" stroke="#F2B57A" strokeWidth={2.6} fill="none" strokeLinecap="round" />
        </>
      ) : name === 'pescetariano' ? (
        // pesce
        <>
          <Path d="M8 32 C16 20 34 18 44 26 L56 18 L54 32 L56 46 L44 38 C34 46 16 44 8 32 Z" fill="#5BA4CF" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Circle cx="18" cy="30" r="2.6" fill={INK} />
          <Path d="M28 24 C31 28 31 36 28 40" stroke="#B9DDF0" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </>
      ) : name === 'vegetariano' ? (
        // formaggio e uovo
        <>
          <Path d="M8 42 L38 22 L50 40 Z" fill="#F5C542" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Circle cx="26" cy="36" r="2.4" fill="#E0A82E" />
          <Circle cx="36" cy="33" r="1.8" fill="#E0A82E" />
          <Ellipse cx="46" cy="44" rx="11" ry="8" fill="#FFFFFF" stroke={INK} strokeWidth={1.8} />
          <Circle cx="46" cy="44" r="4" fill="#F2A541" />
        </>
      ) : (
        // foglie
        <>
          <Path d="M12 50 C10 30 24 14 50 12 C52 36 38 52 12 50 Z" fill="#6DB33F" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
          <Path d="M14 48 C24 38 34 28 44 20" stroke="#E6F4D7" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        </>
      )}
    </Svg>
  );
}
