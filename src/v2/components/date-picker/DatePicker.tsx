import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import { Box, useToken } from '@chakra-ui/react';
import { LuCalendar } from 'react-icons/lu';
import { forwardRef } from 'react';

export interface DatePickerProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  variant?: 'outline' | 'range-start' | 'range-mid' | 'range-end';
  minDate?: string;
  maxDate?: string;
  displayValue?: string;
  /** Month-only mode: shows a month/year grid and emits the first day of the month. */
  monthOnly?: boolean;
}

/**
 * CustomDatePicker — wraps react-datepicker inside Chakra UI's style system.
 * `value` and `onChange` still use ISO date-strings ("YYYY-MM-DD") so all
 * existing call-sites remain unchanged.
 */
const RangeInput = forwardRef<
  HTMLInputElement,
  {
    value?: string;
    displayValue?: string;
    onClick?: () => void;
    onClear?: () => void;
    borderRadius: string;
    gray200: string;
  }
>(({ value, displayValue, onClick, borderRadius }, ref) => (
  <input
    ref={ref}
    readOnly
    value={displayValue ?? value ?? ''}
    onClick={onClick}
    placeholder="Select date"
    style={{
      width: '100%',
      fontSize: '13px',
      fontWeight: 500,
      height: '34px',
      paddingInline: '0.75rem',
      paddingRight: '2rem',
      borderRadius,
      border: '1px solid #DDE2EC',
      outline: 'none',
      background: 'white',
      color: '#141A2A',
      fontVariantNumeric: 'tabular-nums',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }}
  />
));

export function CustomDatePicker({
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  variant = 'outline',
  minDate,
  maxDate,
  displayValue,
  monthOnly = false,
}: DatePickerProps) {
  /* resolve a few Chakra tokens for inline use */
  const [gray200, gray600, blue500] = useToken('colors', [
    'gray.200',
    'gray.600',
    'blue.500',
  ]);

  const selected = value ? new Date(value) : null;

  const handleChange = (date: Date | null) => {
    if (!date) {
      onChange('');
      return;
    }
    // Format as YYYY-MM-DD to keep the same string contract.
    // In month-only mode we pin the day to 01 (first of the selected month).
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = monthOnly ? '01' : String(date.getDate()).padStart(2, '0');
    onChange(`${yyyy}-${mm}-${dd}`);
  };

  // Determine border radius based on variant
  const getBorderRadius = () => {
    if (variant === 'range-start') return '8px 0 0 8px';
    if (variant === 'range-mid') return '0';
    if (variant === 'range-end') return '0 8px 8px 0';
    return '8px';
  };

  // Segments that have another box to their right (thin separator, no calendar
  // icon) and to their left (drop the left border to avoid a double line).
  const hasRightNeighbor = variant === 'range-start' || variant === 'range-mid';
  const hasLeftNeighbor = variant === 'range-mid' || variant === 'range-end';
  const showCalendarIcon = variant === 'outline' || variant === 'range-end';

  return (
    <Box
      position="relative"
      display="inline-block"
      w="100%"
      css={{
        /* ---- react-datepicker overrides ---- */
        '& .react-datepicker-wrapper': { width: '100%' },

        /* keep the calendar popup above KPI cards, filter bar, etc. */
        '& .react-datepicker-popper': { zIndex: 1500 },

        /* --- input field --- */
        '& .react-datepicker__input-container input': {
          width: '100%',
          fontSize: '13px',
          fontWeight: 500,
          height: '34px',
          paddingInline: '0.75rem',
          paddingRight: showCalendarIcon ? '2rem' : '0.75rem',
          borderRadius: getBorderRadius(),
          border: '1px solid #DDE2EC', // matches colors.border
          borderRightWidth: '1px',
          borderLeftWidth: hasLeftNeighbor ? '0px' : '1px', // Prevent double border
          outline: 'none',
          background: 'white',
          color: '#141A2A',
          fontVariantNumeric: 'tabular-nums',
          transition: 'border-color 0.15s, box-shadow 0.15s',
          '&:focus': {
            borderColor: '#1A3980', // matches colors.brand
            boxShadow: 'none',
          },
        },

        /* --- calendar popup container --- */
        '& .react-datepicker': {
          fontFamily: 'inherit',
          fontSize: '0.8rem',
          background: 'white',
          border: `1px solid ${gray200}`,
          borderRadius: '0.75rem',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
          overflow: 'hidden',
        },
        '& .react-datepicker__triangle': { display: 'none' },

        /* --- header --- */
        '& .react-datepicker__header': {
          background: 'white',
          borderBottom: `1px solid ${gray200}`,
          paddingTop: '0.75rem',
          paddingBottom: '0.5rem',
        },
        '& .react-datepicker__current-month': {
          fontSize: '0.85rem',
          fontWeight: 600,
          color: '#1a202c',
          marginBottom: '0.4rem',
        },
        '& .react-datepicker__day-names': {
          display: 'flex',
          justifyContent: 'space-around',
        },
        '& .react-datepicker__day-name': {
          color: '#a0aec0',
          fontSize: '0.7rem',
          fontWeight: 600,
          width: '2rem',
          lineHeight: '2rem',
          textTransform: 'uppercase',
        },

        /* --- navigation arrows --- */
        '& .react-datepicker__navigation': {
          top: '0.65rem',
        },

        /* --- day cells --- */
        '& .react-datepicker__day': {
          width: '2rem',
          lineHeight: '2rem',
          margin: '0.15rem',
          borderRadius: '0.25rem',
          fontSize: '0.78rem',
          color: '#2d3748',
          transition: 'background 0.12s, color 0.12s',
        },
        '& .react-datepicker__day:hover': {
          background: '#edf2f7',
          borderRadius: '0.25rem',
        },
        '& .react-datepicker__day--selected': {
          background: `${blue500} !important`,
          color: '#ffffff !important',
          borderRadius: '0.25rem',
          fontWeight: 600,
        },
        '& .react-datepicker__day--keyboard-selected:not(.react-datepicker__day--selected)':
          {
            background: 'transparent',
            color: blue500,
          },
        '& .react-datepicker__day--today': {
          fontWeight: 700,
          color: blue500,
        },
        '& .react-datepicker__day--today.react-datepicker__day--selected': {
          background: `${blue500} !important`,
          color: '#ffffff !important',
          fontWeight: 700,
        },
        '& .react-datepicker__day--outside-month': {
          color: '#cbd5e0',
        },
        '& .react-datepicker__day--disabled': {
          color: '#cbd5e0',
          cursor: 'not-allowed',
          opacity: 0.4,
          '&:hover': {
            background: 'transparent',
          },
        },
        /* --- month picker (monthOnly mode): clean 3-column grid --- */
        '& .react-datepicker__monthPicker': {
          padding: '0.4rem',
          width: '232px',
        },
        '& .react-datepicker__month-wrapper': {
          display: 'flex',
          gap: '0.4rem',
          marginBottom: '0.4rem',
        },
        '& .react-datepicker__month-text': {
          flex: 1,
          width: 'auto',
          margin: 0,
          padding: '0.55rem 0',
          borderRadius: '0.375rem',
          fontSize: '0.78rem',
          fontWeight: 500,
          color: '#2d3748',
          textAlign: 'center',
          transition: 'background 0.12s, color 0.12s',
        },
        '& .react-datepicker__month-text:hover': {
          background: '#edf2f7',
        },
        '& .react-datepicker__month--selected, & .react-datepicker__month-text--selected':
          {
            background: `${blue500} !important`,
            color: '#ffffff !important',
            fontWeight: 600,
          },
        '& .react-datepicker__month-text--keyboard-selected:not(.react-datepicker__month--selected)':
          {
            background: 'transparent',
            color: blue500,
          },
        '& .react-datepicker__month-text--today': {
          fontWeight: 700,
          color: blue500,
        },

        '& .react-datepicker__close-icon': {
          right: hasRightNeighbor ? '6px' : '28px',
        },
        '& .react-datepicker__close-icon::after': {
          background: '#e2e8f0',
          color: '#4a5568',
          fontSize: '0.75rem',
          borderRadius: '9999px',
          padding: '0.1rem 0.35rem',
        },
      }}
    >
      <DatePicker
        selected={selected}
        onChange={handleChange}
        placeholderText={placeholder}
        dateFormat={monthOnly ? 'MMMM yyyy' : 'yyyy-MM-dd'}
        showMonthYearPicker={monthOnly}
        isClearable={!monthOnly}
        showPopperArrow={false}
        // Month picker sits at the far right of the filter bar; anchor the popup
        // to the input's right edge so it expands left and stays in view.
        popperPlacement={monthOnly ? 'bottom-end' : 'bottom-start'}
        minDate={minDate ? new Date(minDate) : undefined}
        maxDate={maxDate ? new Date(maxDate) : undefined}
        {...(displayValue
          ? {
              customInput: (
                <RangeInput
                  displayValue={displayValue}
                  borderRadius={getBorderRadius()}
                  gray200={gray200}
                />
              ),
            }
          : {})}
      />
      {/* calendar icon positioned inside the input */}
      {showCalendarIcon && (
        <Box
          position="absolute"
          right="10px"
          top="50%"
          transform="translateY(-50%)"
          pointerEvents="none"
          color={gray600}
          fontSize="sm"
        >
          <LuCalendar />
        </Box>
      )}
    </Box>
  );
}
