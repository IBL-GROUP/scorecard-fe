// Every "by …" view of Supply Chain Pulse 2.0 as columns, drawn like Sales Pulse 2.0's daily
// chart (user, 24 Nov 2026: no horizontal bars): one group per item, a column per series with
// its value upright on it, the target as a dashed line across the group, and the name and
// "target · %" (or a note) beneath. Legend in the card header.

import { Box } from '@chakra-ui/react';
import type { ReactNode } from 'react';
import { colors, fmt1 } from '@/constants/theme';
import { ColumnGroups } from '@/ui/charts/ColumnGroups';
import { useCardLegend, type LegendItem } from '@/ui/chart-card/legend';
import { useOpenedRow } from '@/features/detail';
import { titleCase } from '@/utils/titleCase';

/** One series of a row: its value and colour, and its name for the tooltip. */
export interface RowBarPart {
  value: number;
  color: string;
  label: string;
}

export interface RowBar {
  key: string;
  name: string;
  parts: RowBarPart[];
  /** A target or threshold: a tick through the bars, and "target · %" (first series ÷ target) on top. */
  target?: number;
  /** Shown on top, right, in place of "target · %" ("153 orders"; a KPI's own target and status). */
  note?: ReactNode;
}

const statusInk = (pct: number) => (pct >= 100 ? colors.good : pct >= 80 ? colors.warn : colors.bad);

export function RowBars({
  rows,
  legend,
  fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 }),
  targetLabel = 'target',
  status = statusInk,
  onPick,
}: {
  rows: RowBar[];
  legend: LegendItem[];
  /** How a value prints (default: whole numbers with separators). */
  fmt?: (n: number) => string;
  /** The target's name in the row header ("target", "ordered", "threshold"). */
  targetLabel?: string;
  /** The colour of the "%" on top, by its value (Sales Pulse: green ≥ 100%, amber ≥ 80%). */
  status?: (pct: number) => string;
  onPick?: (key: string) => void;
}) {
  useCardLegend(legend);
  const opened = useOpenedRow();
  // Columns, not bars (user, 24 Nov 2026): one group per row, a column per series
  // (each value upright on it), the target as a dashed line across the group.
  const width = Math.max(1, ...rows.map((r) => r.parts.length));
  const series = Array.from({ length: width }, (_, i) => ({
    key: `p${i}`,
    name: rows.find((r) => r.parts[i])?.parts[i].label ?? '',
    color: rows.find((r) => r.parts[i])?.parts[i].color ?? colors.sales,
  }));
  return (
    <ColumnGroups
      groups={rows.map((r) => {
        const pct = r.target && r.target > 0 && r.parts[0] ? (r.parts[0].value / r.target) * 100 : null;
        return {
          key: r.key,
          name: r.name,
          values: Object.fromEntries(r.parts.map((p, i) => [`p${i}`, p.value])),
          colors: Object.fromEntries(r.parts.map((p, i) => [`p${i}`, p.color])),
          target: r.target,
          foot:
            r.note == null && r.target != null ? (
              <>
                {r.target > 0 ? fmt(r.target) : `No ${titleCase(targetLabel)}`}
                {pct != null && (
                  <>
                    {' · '}
                    <Box as="span" color={status(pct)} fontWeight={700}>
                      {`${fmt1(pct)}%`}
                    </Box>
                  </>
                )}
              </>
            ) : (
              r.note
            ),
        };
      })}
      series={series}
      fmt={fmt}
      targetName={titleCase(targetLabel)}
      isActive={opened.isActive}
      onPick={onPick ? (key) => opened.open(key, () => onPick(key)) : undefined}
    />
  );
}
