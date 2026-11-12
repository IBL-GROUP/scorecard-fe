import { Grid, Skeleton } from '@chakra-ui/react';
import { useMemo } from 'react';
import { HighlightCard } from '@/v2/components/branch-highlights';
import { HELP } from '@/v2/constants/help';

export const LOW_COVER_DAYS = 7;
export const HIGH_COVER_DAYS = 90;

export interface InventoryHighlightsProps {
  /** SKU-level stock (all locations): item_code, sku_desc, total_stock_qty, total_stock_value. */
  allRows: Record<string, unknown>[];
  /** Branch stock rows: branch, stock_value. */
  branchRows: Record<string, unknown>[];
  /** Distributor stock rows: distributor_desc, stock_value. */
  rdRows: Record<string, unknown>[];
  /** Days of cover per SKU code (Infinity = stock but no sales). */
  coverBySku: Map<string, number>;
  /** TP sales per day across everything in scope. */
  dailySales: number;
  isLoading?: boolean;
  fmt: (n: number) => string;
}

const days = (n: number) => (n >= 100 ? `${Math.round(n)} days` : `${n.toFixed(1)} days`);
const pct = (n: number) => `${n.toFixed(0)}%`;
const names = (list: { name: string; cover: number }[], n = 2) =>
  list
    .slice(0, n)
    .map((r) => `${r.name} (${days(r.cover)})`)
    .join(', ');

/**
 * Stock against sales: how long it lasts, what runs out, what's tied up, and
 * where it sits. Cover = stock value at TP ÷ TP sales per day.
 */
export function InventoryHighlights({
  allRows,
  branchRows,
  rdRows,
  coverBySku,
  dailySales,
  isLoading,
  fmt,
}: InventoryHighlightsProps) {
  const s = useMemo(() => {
    const skus = allRows.map((r) => ({
      code: String(r.item_code ?? ''),
      name: String(r.sku_desc ?? r.item_code ?? ''),
      value: Number(r.total_stock_value) || 0,
      qty: Number(r.total_stock_qty) || 0,
      cover: coverBySku.get(String(r.item_code ?? '')) ?? Number.POSITIVE_INFINITY,
    }));
    const stocked = skus.filter((r) => r.value > 0);
    const totalValue = stocked.reduce((a, r) => a + r.value, 0);
    const totalQty = stocked.reduce((a, r) => a + r.qty, 0);
    const low = stocked.filter((r) => r.cover < LOW_COVER_DAYS).sort((a, b) => a.cover - b.cover);
    const high = stocked
      .filter((r) => Number.isFinite(r.cover) && r.cover > HIGH_COVER_DAYS)
      .sort((a, b) => b.value - a.value);
    const dead = stocked.filter((r) => !Number.isFinite(r.cover)).sort((a, b) => b.value - a.value);

    const sumBy = (rows: Record<string, unknown>[], key: string) => {
      const m = new Map<string, number>();
      for (const r of rows) {
        const k = String(r[key] ?? '').trim() || 'Other';
        m.set(k, (m.get(k) ?? 0) + (Number(r.stock_value) || 0));
      }
      return [...m.entries()].sort((a, b) => b[1] - a[1]);
    };
    const byBranch = sumBy(branchRows, 'branch');
    const byRd = sumBy(rdRows, 'distributor_desc');
    const branchTotal = byBranch.reduce((a, [, v]) => a + v, 0);
    const rdTotal = byRd.reduce((a, [, v]) => a + v, 0);

    return { stocked, totalValue, totalQty, low, high, dead, byBranch, byRd, branchTotal, rdTotal };
  }, [allRows, branchRows, rdRows, coverBySku]);

  if (isLoading && !allRows.length) {
    return (
      <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }} gap={3} flexShrink={0} className="sp-stagger">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} h="104px" borderRadius="4px" />
        ))}
      </Grid>
    );
  }
  if (!s.stocked.length) return null;

  const overallCover = dailySales > 0 ? s.totalValue / dailySales : null;
  const highValue = s.high.reduce((a, r) => a + r.value, 0);
  const deadValue = s.dead.reduce((a, r) => a + r.value, 0);
  const split = s.branchTotal + s.rdTotal;
  const topBranch = s.byBranch[0];
  const topRd = s.byRd[0];

  return (
    <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }} gap={3} flexShrink={0}>
      <HighlightCard
        label="Stock on hand (TP value)"
        help={HELP.stockOnHand}
        tone="sales"
        name={overallCover != null ? `${days(overallCover)} of cover` : 'No sales to measure cover'}
        value={fmt(s.totalValue)}
        caption={`${Math.round(s.totalQty).toLocaleString()} units · ${s.stocked.length} SKUs in stock`}
      />
      <HighlightCard
        label="Stock-out risk"
        help={HELP.stockOutRisk}
        tone="bad"
        name={`Under ${LOW_COVER_DAYS} days of cover`}
        value={`${s.low.length} SKU${s.low.length === 1 ? '' : 's'}`}
        caption={s.low.length ? `Lowest: ${names(s.low)}` : 'Every selling SKU has a week or more of stock'}
      />
      <HighlightCard
        label="Overstock"
        help={HELP.overstock}
        tone="target"
        name={`${s.high.length} SKUs over ${HIGH_COVER_DAYS} days`}
        value={fmt(highValue)}
        caption={s.high.length ? `Most tied up: ${names(s.high, 1)}` : 'No SKU holds more than 3 months of stock'}
      />
      <HighlightCard
        label="Dead stock"
        help={HELP.deadStock}
        tone="bad"
        name={`${s.dead.length} SKUs with no sales`}
        value={fmt(deadValue)}
        caption={s.dead.length ? `Largest: ${s.dead[0].name}` : 'Every SKU in stock sold this period'}
      />
      <HighlightCard
        label="Where stock sits"
        help={HELP.whereStock}
        tone="sales"
        name={split ? `Branches ${pct((s.branchTotal / split) * 100)} · RDs ${pct((s.rdTotal / split) * 100)}` : '—'}
        value={topBranch ? topBranch[0] : '—'}
        caption={
          topBranch
            ? `${fmt(topBranch[1])} in the top branch${topRd ? ` · top RD: ${topRd[0]}` : ''}`
            : 'No branch stock in this selection'
        }
      />
    </Grid>
  );
}
