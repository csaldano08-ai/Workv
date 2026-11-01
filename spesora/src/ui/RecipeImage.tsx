import { memo, useState } from 'react';
import { Image, StyleSheet, View, type ViewStyle } from 'react-native';
import type { Recipe } from '../core/domain/types';
import { RECIPE_IMAGE_CARDS } from '../data/recipe-image-cards';
import { RECIPE_IMAGE_THUMBS } from '../data/recipe-image-thumbs';
import { colors } from '../theme/tokens';
import { DishArt } from './DishArt';

/**
 * Immagine della ricetta: foto/illustrazione generata se disponibile per quell'ID,
 * altrimenti l'illustrazione vettoriale originale. Proporzioni fisse: il layout non si rompe mai.
 * Solo asset locali (nessuna richiesta di rete). `variant="thumb"` per le miniature nelle liste
 * (320×240, decodifica leggera); `card` (800×600) per hero e card grandi.
 */
export const RecipeImage = memo(function RecipeImage({
  recipe,
  aspectRatio = 4 / 3,
  rounded = 18,
  style,
  variant = 'card',
}: {
  recipe: Pick<Recipe, 'id' | 'dishCategory'>;
  aspectRatio?: number;
  rounded?: number;
  style?: ViewStyle;
  variant?: 'thumb' | 'card';
}) {
  const source = (variant === 'thumb' ? RECIPE_IMAGE_THUMBS[recipe.id] : undefined) ?? RECIPE_IMAGE_CARDS[recipe.id];
  const [failed, setFailed] = useState(false);
  if (!source || failed) {
    return <DishArt category={recipe.dishCategory} recipeId={recipe.id} rounded={rounded} style={{ aspectRatio, ...style }} />;
  }
  return (
    <View style={[styles.frame, { aspectRatio, borderRadius: rounded }, style]} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Image source={source} style={styles.image} resizeMode="cover" onError={() => setFailed(true)} fadeDuration={0} />
    </View>
  );
});

export function hasRecipeImage(id: string): boolean {
  return id in RECIPE_IMAGE_CARDS;
}

const styles = StyleSheet.create({
  frame: { overflow: 'hidden', backgroundColor: colors.peachSoft, width: '100%' },
  image: { width: '100%', height: '100%' },
});
