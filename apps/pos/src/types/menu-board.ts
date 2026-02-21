export interface Badge {
  type: string;
  label: string;
}

export interface MenuItemData {
  id: number;
  name: string;
  price: number;
  description?: string;
  imageUrl?: string | null;
  badges: Badge[];
}

export interface CategoryData {
  id: number;
  name: string;
  items: MenuItemData[];
}

export interface BrandTheme {
  primaryColor: string;
  secondaryColor?: string;
  fontFamily?: string;
  darkBg: string;
}

export interface BrandData {
  id: number;
  name: string;
  slug: string;
  description?: string;
  theme: BrandTheme;
  categories: CategoryData[];
}
