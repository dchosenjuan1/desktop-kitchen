import { lazy, type ComponentType } from 'react';
import type { TemplateViewProps } from '../../../types/menu-board';

export interface TemplateDefinition {
  slug: string;
  name: string;
  description: string;
  component: ComponentType<TemplateViewProps>;
  fontsUrl?: string;
}

export const TEMPLATE_REGISTRY: Record<string, TemplateDefinition> = {
  'dark-editorial': {
    slug: 'dark-editorial',
    name: 'Dark Editorial',
    description: 'Alternating hero images, gold prices, brush stroke accents',
    component: lazy(() => import('./DarkEditorialView')),
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=Inter:wght@400;500;600&display=swap',
  },
  'chalkboard': {
    slug: 'chalkboard',
    name: 'Chalkboard',
    description: 'Hand-drawn chalk feel, textured dark background',
    component: lazy(() => import('./ChalkboardView')),
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Patrick+Hand&display=swap',
  },
  'modern-minimalist': {
    slug: 'modern-minimalist',
    name: 'Modern Minimal',
    description: 'Light background, clean grid, lots of whitespace',
    component: lazy(() => import('./ModernMinimalistView')),
    fontsUrl: 'https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&display=swap',
  },
  'bold-neon': {
    slug: 'bold-neon',
    name: 'Bold Neon',
    description: 'Neon glow effects, glass-morphism cards, vibrant energy',
    component: lazy(() => import('./BoldNeonView')),
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Exo+2:wght@400;600;700&display=swap',
  },
  'classic-elegant': {
    slug: 'classic-elegant',
    name: 'Classic Elegant',
    description: 'Serif fonts, ornamental dividers, fine-dining feel',
    component: lazy(() => import('./ClassicElegantView')),
    fontsUrl: 'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Lora:wght@400;500;600&display=swap',
  },
};

export const TEMPLATE_LIST = Object.values(TEMPLATE_REGISTRY);
