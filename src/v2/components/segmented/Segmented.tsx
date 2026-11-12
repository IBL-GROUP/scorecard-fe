import { Box, HStack } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { colors } from '@/v2/constants/theme';

export interface SegmentedOption<T extends string> {
  value: T;
  label: ReactNode;
  title?: string;
  /** Greyed out and not clickable; the title says why. */
  disabled?: boolean;
}

export interface SegmentedProps<T extends string> {
  options: SegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  size?: 'xs' | 'sm';
  ariaLabel?: string;
}

// Odoo-style button group (btn-group of btn-secondary): joined grey buttons,
// the pressed one darker with brand-coloured text.
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  size = 'sm',
  ariaLabel,
}: SegmentedProps<T>) {
  const h = size === 'xs' ? '26px' : '31px';
  const px = size === 'xs' ? '8px' : '11px';
  const fontSize = size === 'xs' ? '12.5px' : '13.5px';
  return (
    <HStack role="radiogroup" aria-label={ariaLabel} gap={0} flexShrink={0}>
      {options.map((opt, i) => {
        const active = opt.value === value;
        const first = i === 0;
        const last = i === options.length - 1;
        return (
          <Box
            as="button"
            key={opt.value}
            role="radio"
            aria-checked={active}
            title={opt.title}
            onClick={() => !opt.disabled && onChange(opt.value)}
            aria-disabled={opt.disabled || undefined}
            opacity={opt.disabled ? 0.45 : 1}
            display="inline-flex"
            alignItems="center"
            gap="6px"
            h={h}
            px={px}
            fontSize={fontSize}
            fontWeight={active ? 600 : 500}
            whiteSpace="nowrap"
            cursor={opt.disabled ? 'not-allowed' : 'pointer'}
            color={active ? colors.brand : colors.darkText}
            bg={active ? colors.border : colors.sunkBg}
            boxShadow={active ? 'inset 0 1px 2px rgba(0,0,0,.12)' : 'none'}
            borderLeft={first ? 'none' : `1px solid ${colors.cardBg}`}
            borderTopLeftRadius={first ? '4px' : 0}
            borderBottomLeftRadius={first ? '4px' : 0}
            borderTopRightRadius={last ? '4px' : 0}
            borderBottomRightRadius={last ? '4px' : 0}
            transition="background .12s"
            _hover={active || opt.disabled ? undefined : { bg: colors.border }}
            _focusVisible={{ outline: `2px solid ${colors.brand}`, outlineOffset: '1px', zIndex: 1 }}
          >
            {opt.label}
          </Box>
        );
      })}
    </HStack>
  );
}
