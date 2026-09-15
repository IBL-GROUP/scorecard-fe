import { createSystem, defaultConfig } from '@chakra-ui/react';
import { colors } from './colors';
import { tableSlotRecipe } from '@/components/table/table.recipe';
import { inputRecipe } from '@/components/input';
import { buttonRecipe } from '@/components/button';
import { paginationSlotRecipe } from '@/components/pagination';

const customConfig = {
  theme: {
    tokens: {
      colors,
      fonts: {
        heading: {
          value: `'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
        },
        body: {
          value: `'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`,
        },
        mono: {
          value: `'Roboto Mono', 'Fira Code', 'Consolas', 'Monaco', monospace`,
        },
      },
    },
    keyframes: {
      // The user avatar's hover ring: a ripple that spreads out from the edge
      // and fades. Only the shadow moves, so the circle itself stays still.
      avatarRing: {
        '0%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0.45)' },
        '70%': { boxShadow: '0 0 0 8px rgba(59, 130, 246, 0)' },
        '100%': { boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)' },
      },
    },
    recipes: {
      input: inputRecipe,
      button: buttonRecipe,
    },
    slotRecipes: {
      table: tableSlotRecipe,
      pagination: paginationSlotRecipe,
    },
  },
};

export const system = createSystem(defaultConfig, customConfig);
