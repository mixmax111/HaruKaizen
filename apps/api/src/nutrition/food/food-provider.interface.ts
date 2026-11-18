export interface StandardizedFoodItem {
  barcode?: string;
  name: string;
  brand?: string;
  kcalPer100g: number;
  proteinPer100g: number;
  carbsPer100g: number;
  fatPer100g: number;
  fiberPer100g?: number;
  sodium100g?: number;
  imageUrl?: string;
  source: 'LOCAL_DB' | 'OPENFOODFACTS_V3' | 'USDA_FALLBACK';
}

export interface FoodProvider {
  fetchByBarcode(barcode: string): Promise<StandardizedFoodItem | null>;
  searchByName(query: string): Promise<StandardizedFoodItem[]>;
}

