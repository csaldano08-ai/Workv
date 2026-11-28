import { memo } from 'react';
import { StyleSheet, Text as RNText, View, type ViewStyle } from 'react-native';
import type { ShoppingCategory } from '../../core/domain/types';
import { INGREDIENT_SYMBOLS } from '../../data/ingredientSymbols';
import { colors } from '../../theme/tokens';
import { CategoryIcon } from './CategoryIcon';

/**
 * Simbolo di un ingrediente: l'immagine dell'alimento SOLO se è proprio quello (mappa per id in
 * `src/data/ingredientSymbols.ts`), altrimenti il simbolo neutro del suo reparto. Mai l'immagine di un altro alimento
 * (prima: la carota del reparto accanto a mela, pera e uva). Decorativo: il nome è sempre scritto accanto.
 */
export const IngredientSymbol = memo(function IngredientSymbol({ id, category, size = 34, style }: { id: string; category: ShoppingCategory; size?: number; style?: ViewStyle }) {
  const symbol = INGREDIENT_SYMBOLS[id];
  return (
    <View style={[styles.box, { width: size, height: size, borderRadius: size / 2 }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" pointerEvents="none">
      {symbol ? (
        <RNText style={{ fontSize: Math.round(size * 0.62), lineHeight: Math.round(size * 0.8) }} allowFontScaling={false}>
          {symbol}
        </RNText>
      ) : (
        <CategoryIcon category={category} size={Math.round(size * 0.78)} />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  box: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.greenMist },
});
