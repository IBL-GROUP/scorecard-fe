import { Box, Flex, Text } from '@chakra-ui/react';
import ReactSelect, {
  type Props as ReactSelectProps,
  type StylesConfig,
} from 'react-select';
import { colors } from '@/v2/constants/theme';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends Omit<
  ReactSelectProps<SelectOption, false>,
  'value' | 'onChange' | 'options'
> {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: SelectOption[];
}

const selectStyles: StylesConfig<SelectOption, false> = {
  control: (base) => ({
    ...base,
    borderWidth: '1px',
    borderColor: colors.controlBorder,
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    minHeight: '36px',
    boxShadow: 'none',
    w: '100%',
    backgroundColor: colors.cardBg,
    '&:hover': { borderColor: colors.controlBorderHover },
  }),
  // WCAG 2.1 AA (S5): react-select's default placeholder grey is 3.9:1 on white.
  placeholder: (base) => ({ ...base, color: colors.mutedText }),
  singleValue: (base) => ({ ...base, color: colors.bodyText }),
  input: (base) => ({ ...base, color: colors.bodyText }),
  option: (base, state) => ({
    ...base,
    fontSize: '14px',
    fontWeight: 500,
    backgroundColor: state.isSelected ? colors.selectActive : colors.cardBg,
    color: state.isSelected ? colors.onBrand : colors.bodyText,
    '&:hover': {
      backgroundColor: state.isSelected
        ? colors.selectActive
        : colors.selectOptionHover,
    },
  }),
  menu: (base) => ({
    ...base,
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    zIndex: 10,
    backgroundColor: colors.cardBg,
  }),
};

export function Select({
  label,
  value,
  onChange,
  options,
  ...rest
}: SelectProps) {
  return (
    <Flex direction="row" gap={2} alignItems="center" wrap="nowrap" minW={0}>
      {label && (
        <Text
          fontSize="xs"
          fontWeight="bold"
          color="var(--sp-muted-text)"
          textTransform="uppercase"
          whiteSpace="nowrap"
          flexShrink={0}
        >
          {label}
        </Text>
      )}
      <Box flex={1} minW={0}>
        <ReactSelect<SelectOption, false>
          value={options.find((o) => o.value === value)}
          onChange={(selected) => onChange(selected?.value ?? '')}
          options={options}
          styles={selectStyles}
          isSearchable
          // An accessible name for the search input (WCAG 4.1.2): the label, else the placeholder.
          aria-label={label || (typeof rest.placeholder === 'string' ? rest.placeholder : undefined)}
          {...rest}
        />
      </Box>
    </Flex>
  );
}
