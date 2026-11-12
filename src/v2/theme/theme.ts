import { createSystem, defaultConfig } from '@chakra-ui/react';
import { colors } from './colors';
import { tableSlotRecipe } from '@/v2/components/table/table.recipe';
import { inputRecipe } from '@/v2/components/input';
import { buttonRecipe } from '@/v2/components/button';
import { paginationSlotRecipe } from '@/v2/components/pagination';

const customConfig = {
  theme: {
    tokens: {
      colors,
      fonts: {
        heading: {
          value: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`,
        },
        body: {
          value: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif`,
        },
        mono: {
          value: `SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace`,
        },
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
