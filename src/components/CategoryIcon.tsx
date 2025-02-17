import {
  Sparkles,
  Droplets,
  Sofa,
  Apple,
  Home,
  UtensilsCrossed,
  Laptop,
  Shirt,
  Footprints,
  Watch,
  Smartphone,
  Bike,
  Flower2,
  Phone,
  Dumbbell,
  Glasses,
  Tablet,
  Shirt as ShirtIcon,
  Car,
  ShoppingBag,
  ShoppingBag as DressIcon,
  Gem,
  Footprints as ShoeIcon,
  Clock,
  Package,
  LucideProps,
} from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * A mapping of category slugs to their corresponding Lucide icons.
 * This mapping is based on the category slugs defined in `src/data/categories.ts`,
 * which contains the source of truth for available product categories in the application.
 * Each category is mapped to an appropriate Lucide icon that best represents its content.
 *
 * This object is marked as const to enable TypeScript to infer exact types for the keys.
 *
 * @see {@link '../data/categories.ts'} for the complete list of category definitions
 */
const categoryIcons = {
  beauty: Sparkles,
  fragrances: Droplets,
  furniture: Sofa,
  groceries: Apple,
  "home-decoration": Home,
  "kitchen-accessories": UtensilsCrossed,
  laptops: Laptop,
  "mens-shirts": Shirt,
  "mens-shoes": Footprints,
  "mens-watches": Watch,
  "mobile-accessories": Smartphone,
  motorcycle: Bike,
  "skin-care": Flower2,
  smartphones: Phone,
  "sports-accessories": Dumbbell,
  sunglasses: Glasses,
  tablets: Tablet,
  tops: ShirtIcon,
  vehicle: Car,
  "womens-bags": ShoppingBag,
  "womens-dresses": DressIcon,
  "womens-jewellery": Gem,
  "womens-shoes": ShoeIcon,
  "womens-watches": Clock,
} as const;

/**
 * Type representing valid category slugs that have associated icons.
 * This type is automatically generated from the keys of the categoryIcons object,
 * which matches the slugs defined in `src/data/categories.ts`.
 */
export type CategorySlug = keyof typeof categoryIcons;

/**
 * Props for the CategoryIcon component.
 * Extends LucideProps to allow all Lucide icon properties to be passed through.
 */
interface CategoryIconProps extends LucideProps {
  /**
   * The category identifier to display an icon for.
   * Should match one of the slugs from `src/data/categories.ts`.
   * If the category doesn't match any known category, a default Package icon will be shown.
   */
  category: string;
  /**
   * Optional className to apply to the icon.
   * Will be merged with default classes using the cn utility.
   */
  className?: string;
}

/**
 * A component that displays an icon for a given category.
 * The icons are mapped to categories defined in `src/data/categories.ts`,
 * providing visual representation for each product category in the application.
 *
 * @example
 * // With a known category
 * <CategoryIcon category="beauty" />
 *
 * @example
 * // With an unknown category (shows Package icon)
 * <CategoryIcon category="unknown-category" />
 *
 * @example
 * // With custom styling
 * <CategoryIcon category="beauty" className="w-6 h-6 text-blue-500" />
 *
 * @example
 * // With additional Lucide props
 * <CategoryIcon category="beauty" strokeWidth={3} />
 */
export function CategoryIcon({
  category,
  className,
  ...props
}: CategoryIconProps) {
  const Icon = categoryIcons[category as CategorySlug] || Package;
  return <Icon className={cn("h-4 w-4", className)} {...props} />;
}
