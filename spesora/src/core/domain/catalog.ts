import { z } from 'zod';
import {
  ALLERGENS,
  DISH_CATEGORIES,
  EQUIPMENT,
  MEAL_TYPES,
  PERISHABILITY,
  SHOPPING_CATEGORIES,
  type Allergen,
  type Catalog,
  type Ingredient,
  type Recipe,
  type RecipeFacts,
} from './types';

const idSchema = z.string().regex(/^[a-z0-9_]+$/, 'ID non valido: usare snake_case');

export const ingredientSchema = z
  .object({
    id: idSchema,
    name: z.string().min(2),
    aliases: z.array(z.string().min(2)),
    unit: z.enum(['g', 'ml', 'pz']),
    category: z.enum(SHOPPING_CATEGORIES),
    allergens: z.array(z.enum(ALLERGENS)),
    allergenStatus: z.enum(['verificato', 'non_verificato']),
    vegan: z.boolean(),
    vegetarian: z.boolean(),
    pescatarian: z.boolean(),
    perishability: z.enum(PERISHABILITY),
    commonPackSizes: z.array(z.number().positive()).optional(),
    staple: z.boolean().optional(),
  })
  .strict()
  .refine((i) => !i.vegan || i.vegetarian, { message: 'Un ingrediente vegano deve essere vegetariano' })
  .refine((i) => !i.vegetarian || i.pescatarian, {
    message: 'Un ingrediente vegetariano è anche pescetariano',
  })
  .refine((i) => !(i.vegan && (i.allergens.includes('latte') || i.allergens.includes('uova'))), {
    message: 'Ingrediente vegano con latte o uova',
  });

export const recipeSchema = z
  .object({
    id: idSchema,
    name: z.string().min(3),
    description: z.string().min(10),
    mealTypes: z.array(z.enum(MEAL_TYPES)).min(1),
    dishCategory: z.enum(DISH_CATEGORIES),
    baseServings: z.number().int().min(1).max(12),
    prepMinutes: z.number().int().min(0),
    cookMinutes: z.number().int().min(0),
    totalMinutes: z.number().int().min(1),
    ingredients: z
      .array(
        z
          .object({
            ingredientId: idSchema,
            qty: z.number().positive().optional(),
            toTaste: z.boolean().optional(),
            hint: z.string().optional(),
          })
          .strict()
          .refine((ri) => (ri.toTaste ? ri.qty === undefined : ri.qty !== undefined), {
            message: 'Ogni ingrediente deve avere una quantità oppure essere "q.b."',
          }),
      )
      .min(1),
    equipment: z.array(z.enum(EQUIPMENT)),
    steps: z
      .array(
        z
          .object({
            text: z.string().min(8),
            timerMinutes: z.number().int().positive().optional(),
            mediaRef: z.string().optional(),
          })
          .strict(),
      )
      .min(2),
    substitutions: z
      .array(z.object({ ingredientId: idSchema, substituteId: idSchema, note: z.string() }).strict())
      .optional(),
    image: z.null().optional(),
    videoRef: z.string().nullable().optional(),
  })
  .strict()
  .refine((r) => r.totalMinutes >= r.prepMinutes + r.cookMinutes, {
    message: 'totalMinutes deve essere almeno prep + cottura',
  });

export interface CatalogValidationResult {
  ok: boolean;
  errors: string[];
}

/** Valida l'intero catalogo: schema, riferimenti, duplicati e alias ambigui. */
export function validateCatalog(catalog: Catalog): CatalogValidationResult {
  const errors: string[] = [];
  const ingredientIds = new Set<string>();
  const aliasOwner = new Map<string, string>();

  for (const ing of catalog.ingredients) {
    const parsed = ingredientSchema.safeParse(ing);
    if (!parsed.success) {
      errors.push(`Ingrediente ${ing?.id ?? '?'}: ${parsed.error.issues.map((i) => i.message).join('; ')}`);
    }
    if (ingredientIds.has(ing.id)) errors.push(`Ingrediente duplicato: ${ing.id}`);
    ingredientIds.add(ing.id);
    for (const alias of [ing.name, ...(ing.aliases ?? [])]) {
      const key = normalizeText(alias);
      const owner = aliasOwner.get(key);
      if (owner && owner !== ing.id) errors.push(`Alias "${alias}" ambiguo tra ${owner} e ${ing.id}`);
      aliasOwner.set(key, ing.id);
    }
  }

  const recipeIds = new Set<string>();
  for (const recipe of catalog.recipes) {
    const parsed = recipeSchema.safeParse(recipe);
    if (!parsed.success) {
      errors.push(`Ricetta ${recipe?.id ?? '?'}: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}`);
      continue;
    }
    if (recipeIds.has(recipe.id)) errors.push(`Ricetta duplicata: ${recipe.id}`);
    recipeIds.add(recipe.id);
    const seen = new Set<string>();
    for (const ri of recipe.ingredients) {
      if (!ingredientIds.has(ri.ingredientId)) {
        errors.push(`Ricetta ${recipe.id}: ingrediente sconosciuto ${ri.ingredientId}`);
      }
      if (seen.has(ri.ingredientId)) errors.push(`Ricetta ${recipe.id}: ingrediente ripetuto ${ri.ingredientId}`);
      seen.add(ri.ingredientId);
    }
    for (const sub of recipe.substitutions ?? []) {
      if (!ingredientIds.has(sub.substituteId) || !seen.has(sub.ingredientId)) {
        errors.push(`Ricetta ${recipe.id}: sostituzione non valida ${sub.ingredientId}→${sub.substituteId}`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/** Minuscole, senza accenti e spazi superflui: base per gli alias. */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** Indice rapido del catalogo con fatti derivati. */
export class CatalogIndex {
  readonly ingredients = new Map<string, Ingredient>();
  readonly recipes = new Map<string, Recipe>();
  private readonly facts = new Map<string, RecipeFacts>();
  private readonly aliasIndex = new Map<string, string>();

  constructor(readonly catalog: Catalog) {
    for (const ing of catalog.ingredients) {
      this.ingredients.set(ing.id, ing);
      for (const alias of [ing.name, ...ing.aliases]) this.aliasIndex.set(normalizeText(alias), ing.id);
    }
    for (const r of catalog.recipes) this.recipes.set(r.id, r);
  }

  ingredient(id: string): Ingredient {
    const ing = this.ingredients.get(id);
    if (!ing) throw new Error(`Ingrediente sconosciuto: ${id}`);
    return ing;
  }

  recipe(id: string): Recipe | undefined {
    return this.recipes.get(id);
  }

  /** Risolve un nome libero ("Pomodori") all'ID canonico, se noto. */
  resolveIngredient(text: string): string | undefined {
    return this.aliasIndex.get(normalizeText(text));
  }

  factsOf(recipe: Recipe): RecipeFacts {
    const cached = this.facts.get(recipe.id);
    if (cached) return cached;
    const allergens = new Set<Allergen>();
    let incomplete = false;
    let vegan = true;
    let vegetarian = true;
    let pescatarian = true;
    for (const ri of recipe.ingredients) {
      const ing = this.ingredient(ri.ingredientId);
      ing.allergens.forEach((a) => allergens.add(a));
      if (ing.allergenStatus === 'non_verificato') incomplete = true;
      vegan &&= ing.vegan;
      vegetarian &&= ing.vegetarian;
      pescatarian &&= ing.pescatarian;
    }
    const facts: RecipeFacts = {
      allergens: [...allergens].sort(),
      allergenInfoIncomplete: incomplete,
      vegan,
      vegetarian,
      pescatarian,
    };
    this.facts.set(recipe.id, facts);
    return facts;
  }
}
