import { defineSlotRecipe } from '@chakra-ui/react';
import { tableAnatomy } from '@chakra-ui/react/anatomy';

export const tableSlotRecipe = defineSlotRecipe({
  className: 'chakra-table',
  slots: tableAnatomy.keys(),
  base: {
    root: {
      fontVariantNumeric: 'lining-nums tabular-nums',
      borderCollapse: 'collapse',
      width: 'full',
      textAlign: 'start',
      verticalAlign: 'top',
      overflow: 'hidden',
      borderRadius: 'lg',
    },
    row: {
      _selected: {
        bg: 'colorPalette.subtle',
      },
    },
    cell: {
      textAlign: 'start',
      alignItems: 'center',
      whiteSpace: 'nowrap',

    },
    columnHeader: {
      fontWeight: 'medium',
      textAlign: 'start',
      color: 'fg',
      whiteSpace: 'nowrap',
    },
    caption: {
      fontWeight: 'medium',
      textStyle: 'xs',
    },
    footer: {
      fontWeight: 'medium',
    },
  },

  variants: {
    interactive: {
      true: {
        body: {
          '& tr': {
            _hover: {
              bg: 'colorPalette.subtle',
            },
          },
        },
      },
    },

    stickyHeader: {
      true: {
        header: {
          '& :where(tr)': {
            top: 'var(--table-sticky-offset, 0)',
            position: 'sticky',
            zIndex: 1,
          },
        },
      },
    },

    striped: {
      true: {
        row: {
          '&:nth-of-type(odd) td': {
            bg: 'bg.muted',
          },
        },
      },
    },

    showColumnBorder: {
      true: {
        columnHeader: {
          '&:not(:last-of-type)': {
            borderInlineEndWidth: '1px',
          },
        },
        cell: {
          '&:not(:last-of-type)': {
            borderInlineEndWidth: '1px',
          },
        },
      },
    },

    variant: {
      primary: {
        header: {
          bg: 'var(--sp-card-bg)',
        },
        columnHeader: {
          bg: 'var(--sp-card-bg)',
          color: 'var(--sp-dark-text)',
          fontSize: '13px',
          fontWeight: '700',
          borderBottomWidth: '1px',
          borderColor: 'var(--sp-border)',
        },
        cell: {
          color: 'var(--sp-body-text)',
          borderColor: 'var(--sp-sunk-bg)',
        },
        row: {
          borderBottomWidth: '1px',
          borderColor: 'var(--sp-sunk-bg)',
          _odd: {
            bg: 'var(--sp-card-bg)',
          },
          _even: {
            bg: 'var(--sp-card-bg)',
          },
          _hover: {
            bg: 'var(--sp-hover-bg)',
          },
          transition: 'background 0.15s ease',
        },
      },
    },

    size: {
      sm: {
        root: {
          textStyle: 'sm',
        },
        columnHeader: {
          px: '2.5',
          py: '2',
        },
        cell: {
          px: '2.5',
          py: '1.5',
        },
      },

      md: {
        root: {
          textStyle: 'sm',
        },
        columnHeader: {
          px: '3',
          py: '3',
        },
        cell: {
          px: '3',
          py: '3',
        },
      },

      lg: {
        root: {
          textStyle: 'md',
        },
        columnHeader: {
          px: '4',
          py: '3',
        },
        cell: {
          px: '4',
          py: '3',
        },
      },
    },
  },

  defaultVariants: {
    variant: 'primary',
    size: 'sm',
  },
});
