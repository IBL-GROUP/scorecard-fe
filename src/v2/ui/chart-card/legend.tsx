import { Box, Flex } from '@chakra-ui/react';
import { createContext, useContext, useEffect, useId } from 'react';
import { colors } from '@/v2/constants/theme';

/**
 * A chart's legend, shown in its ChartCard's header — where a subtitle used to
 * sit — rather than inside the chart. A chart outside a card (a drill sheet,
 * say) still draws its own.
 */
export interface LegendItem {
  label: string;
  color: string;
  /** box: a bar or column · line: a line series · dash: a dashed benchmark · tick: a target marker. */
  shape?: 'box' | 'line' | 'dash' | 'tick';
}

/** The card's slot: a chart hands its items in by id, and takes them back when it unmounts. */
export const CardLegendContext = createContext<((id: string, items: LegendItem[] | null) => void) | null>(null);

/**
 * In a ChartCard, give the card this chart's legend and return true: the chart
 * then draws none of its own. Outside a card it returns false.
 */
export function useCardLegend(items: LegendItem[] | null): boolean {
  const put = useContext(CardLegendContext);
  const id = useId();
  const key = JSON.stringify(items);
  useEffect(() => {
    if (!put) return;
    put(id, items);
    return () => put(id, null);
    // `key` stands for `items`: the same legend in a new array is not a change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [put, id, key]);
  return !!put;
}

function Swatch({ item }: { item: LegendItem }) {
  switch (item.shape) {
    case 'line':
      return <Box w="14px" h="2px" bg={item.color} flexShrink={0} />;
    case 'dash':
      return <Box w="14px" h="0" borderTop="2px dashed" borderColor={item.color} flexShrink={0} />;
    case 'tick':
      return <Box w="2px" h="12px" bg={item.color} flexShrink={0} />;
    default:
      return <Box w="10px" h="10px" borderRadius="2px" bg={item.color} flexShrink={0} />;
  }
}

/** The legend as one row of swatches and names. */
export function LegendRow({ items }: { items: LegendItem[] }) {
  return (
    <Flex gap="4px 12px" wrap="wrap" fontSize="12px" color={colors.mutedText}>
      {items.map((item) => (
        <Flex key={`${item.shape ?? 'box'}:${item.label}`} align="center" gap="6px" whiteSpace="nowrap">
          <Swatch item={item} />
          {item.label}
        </Flex>
      ))}
    </Flex>
  );
}
