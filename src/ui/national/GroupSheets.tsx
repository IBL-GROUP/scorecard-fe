// Ported from Sales Pulse 2.0 (dsr-fe src/components/national/GroupSheets.tsx), 19 Nov 2026,
// without the daily sales chart of the last level.
import { Box, Flex, Grid, HStack, Input, Text } from '@chakra-ui/react';
import { Fragment, useState, type ReactNode } from 'react';
import { FiArrowLeft, FiArrowUpRight, FiX } from 'react-icons/fi';
import { SheetStack } from '@/ui/drill/SheetStack';
import { colors } from '@/constants/theme';
import { nodeKey, type FigureColumn, type GroupKpi, type GroupNode, type Sums } from './GroupedTable';
import { AnimatedValue } from '@/ui/motion';
import { useRowWindow } from '@/features/rowWindow';

/**
 * The grouped tables' deeper levels, in the same stacked right-hand sheets as
 * Sales Details. The table shows two levels; a second-level row opens a sheet
 * with that group's figures and the level below it, and a row there opens the
 * next sheet on top — down to the SKUs. Built from the rows the table already
 * has: nothing is fetched.
 */
export interface GroupSheetsProps {
  /** The open sheets, outermost first; each one's group. */
  path: GroupNode[];
  /** What each node is ("Team", "Brand"…), by its level. */
  levelLabel: (node: GroupNode) => string;
  /** Where the trail starts: the table's name. */
  rootLabel: string;
  /** The groups above the first sheet (its division, its branch…), outermost first. */
  ancestors: GroupNode[];
  columns: FigureColumn[];
  kpis?: (t: Sums, parent: Sums, parentName: string) => GroupKpi[];
  /** The figures of whatever holds the first sheet, for its "share of" tiles. */
  rootSums: Sums;
  onPush: (node: GroupNode) => void;
  onPopTo: (depth: number) => void;
  onClose: () => void;
  /** Opens a group's full detail sheet (daily sales, diagnosis), where there is one. */
  detailsFor?: (node: GroupNode) => (() => void) | undefined;
  /** What a last-level row (a SKU) opens, when it has more below it (Sales Details); else it is not clickable. */
  openLeaf?: (node: GroupNode) => (() => void) | undefined;
  /** A leaf whose detail sheet is open (see GroupedTable activeKey). */
  activeKey?: string | null;
  /**
   * The daily-chart query for a group or a SKU (period, filters and the slice),
   * or null when it cannot be filtered. When given, the sheet of the last level
   * shows the group's chart above its list.
   */
  dailyFor?: (node: GroupNode) => Record<string, string> | null;
}

export function GroupSheets(props: GroupSheetsProps) {
  const { path, onPopTo, onClose } = props;
  return (
    <SheetStack
      keys={path.map((n) => n.id)}
      labels={path.map((n) => n.name)}
      onPopTo={onPopTo}
      onClose={onClose}
      renderSheet={(i, isTop) => <GroupSheet {...props} depth={i} isTop={isTop} />}
    />
  );
}

function GroupSheet({
  path,
  levelLabel,
  rootLabel,
  ancestors,
  columns,
  kpis,
  rootSums,
  onPush,
  onPopTo,
  onClose,
  detailsFor,
  openLeaf,
  activeKey,
  depth,
  isTop,
}: GroupSheetsProps & { depth: number; isTop: boolean }) {
  const node = path[depth];
  const parent = depth ? path[depth - 1] : ancestors[ancestors.length - 1];
  const parentSums = parent?.sums ?? rootSums;
  const parentName = parent?.name ?? rootLabel;
  const childLabel = node.children[0] ? levelLabel(node.children[0]) : '';
  const details = detailsFor?.(node);

  // The last level (SKUs): the group's daily chart above the list.
  const [query, setQuery] = useState('');
  const q = query.trim().toLowerCase();
  const shown = q
    ? node.children.filter((c) => `${c.name} ${c.code ?? ''}`.toLowerCase().includes(q))
    : node.children;
  const win = useRowWindow(shown, `${node.id}|${q}`);
  // The sheet is narrower than the page: the name column gives way first.
  // The columns that mean something for this sheet's rows (see FigureColumn.levels).
  const childLevel = node.children[0]?.level;
  const cols = columns.filter((c) => !c.levels || (childLevel != null && c.levels.includes(childLevel)));
  const template = `minmax(170px, 1.6fr) ${cols.map((c) => c.width).join(' ')} 22px`;
  const trail = [...ancestors, ...path.slice(0, depth + 1)];

  return (
    <Flex
      direction="column"
      h="100%"
      bg={colors.cardBg}
      borderLeft="1px solid"
      borderColor={colors.border}
      boxShadow="-16px 0 40px rgba(0,0,0,.22)"
      overflow="hidden"
      aria-hidden={!isTop}
      role="dialog"
      aria-modal={isTop}
      aria-label={`${levelLabel(node)} ${node.name}`}
    >
      {/* Header */}
      <Flex align="flex-start" gap={3} px={5} pt={4} pb={3} flexShrink={0}>
        {depth > 0 && (
          <IconButton label="Back" onClick={() => onPopTo(depth - 1)}>
            <FiArrowLeft size={16} />
          </IconButton>
        )}
        <Box
          mt="3px"
          px="7px"
          py="2px"
          borderRadius="4px"
          bg={colors.brandSoft}
          color={colors.brand}
          fontSize="11px"
          fontWeight={700}
          letterSpacing=".05em"
          textTransform="uppercase"
          flexShrink={0}
        >
          {levelLabel(node)}
        </Box>
        <Box flex={1} minW={0}>
          <Flex align="baseline" gap={2} minW={0}>
            <Text fontSize="18px" fontWeight={700} color={colors.darkText} truncate title={node.name}>
              {node.name}
            </Text>
            {node.code && (
              <Text fontSize="13px" color={colors.mutedText} flexShrink={0} fontVariantNumeric="tabular-nums">
                {node.code}
              </Text>
            )}
          </Flex>
          <Flex fontSize="13px" color={colors.mutedText} gap="4px" align="center" wrap="wrap" minW={0}>
            <Crumb onClick={onClose} title={`Back to ${rootLabel}`}>
              {rootLabel}
            </Crumb>
            {trail.map((n, i) => {
              const sheetIndex = i - ancestors.length;
              return (
                <Flex key={n.id} gap="4px" align="center" minW={0}>
                  <Text as="span">›</Text>
                  {sheetIndex >= 0 && sheetIndex < depth ? (
                    <Crumb onClick={() => onPopTo(sheetIndex)}>{n.name}</Crumb>
                  ) : (
                    <Text as="span" color={sheetIndex === depth ? colors.darkText : undefined} fontWeight={sheetIndex === depth ? 600 : 400} truncate>
                      {n.name}
                    </Text>
                  )}
                </Flex>
              );
            })}
          </Flex>
        </Box>
        {details && (
          <Box
            as="button"
            onClick={details}
            mt="1px"
            px={2.5}
            py={1}
            borderRadius="4px"
            fontSize="13px"
            fontWeight={600}
            color={colors.brand}
            bg={colors.brandSoft}
            cursor="pointer"
            display="inline-flex"
            alignItems="center"
            gap={1}
            flexShrink={0}
            title="Daily sales, breakdowns and diagnosis for this group"
          >
            Details <FiArrowUpRight size={13} />
          </Box>
        )}
        <IconButton label={path.length > 1 ? 'Close all' : 'Close'} onClick={onClose} muted>
          <FiX size={18} />
        </IconButton>
      </Flex>

      {/* Body scrolls inside the sheet, never the page. */}
      <Flex direction="column" flex={1} minH={0} px={5} pb={5}>
        {kpis && (
          <Grid templateColumns="repeat(4, 1fr)" gap={3} mb={4} flexShrink={0} className="sp-stagger">
            {kpis(node.sums, parentSums, parentName).map((k) => (
              <Kpi key={k.label} {...k} />
            ))}
          </Grid>
        )}

        {node.children.length > 0 ? (
          <Flex direction="column" flex={1} minH={0} border="1px solid" borderColor={colors.border} borderRadius="4px">
            <Flex align="center" gap={2} px={3} py={2} borderBottom="1px solid" borderColor={colors.border} flexShrink={0}>
              <Text fontSize="13px" fontWeight={600} color={colors.cardAccent}>
                {plural(childLabel)} In {node.name}
              </Text>
              {node.children.length > 8 && (
                <Input
                  ml="auto"
                  size="sm"
                  h="28px"
                  maxW="200px"
                  borderRadius="4px"
                  fontSize="13px"
                  placeholder={`Find ${childLabel.toLowerCase()}…`}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              )}
            </Flex>
            {/* Header, Total and rows scroll sideways together when the figures
                outgrow the sheet. */}
            <Box flex={1} minH={0} overflow="auto">
              <Box minW="fit-content">
                <Grid
                  className="sp-pin sp-th"
                  templateColumns={template}
                  columnGap={5}
                  rowGap={2}
                  px={3}
                  py="7px"
                  bg={colors.pageBg}
                  borderBottom="1px solid"
                  borderColor={colors.border}
                  position="sticky"
                  top={0}
                  zIndex={2}
                >
                  <Text fontSize="12px" fontWeight={700} color={colors.darkText} whiteSpace="nowrap">
                    {childLabel}
                  </Text>
                  {cols.map((c) => (
                    // The sheet is narrower than the page: a long header wraps rather than run into the next.
                    <Text key={c.key} fontSize="12px" fontWeight={700} color={colors.darkText} textAlign="center" lineHeight="1.25">
                      {c.header}
                    </Text>
                  ))}
                  <span />
                </Grid>
                <Grid
                  className="sp-pin"
                  templateColumns={template}
                  columnGap={5}
                  rowGap={2}
                  px={3}
                  py="7px"
                  alignItems="center"
                  bg={colors.tableTotalStart}
                  borderBottom="1px solid"
                  borderColor={colors.border}
                  position="sticky"
                  top="33px"
                  zIndex={1}
                >
                  <Text fontSize="13px" fontWeight={700} color={colors.darkText}>
                    Total
                  </Text>
                  {cols.map((c) => (
                    <Fragment key={c.key}>{c.render(node.sums, node.sums, true)}</Fragment>
                  ))}
                  <span />
                </Grid>
                {shown.length === 0 ? (
                  <Text p={6} textAlign="center" fontSize="13px" color={colors.mutedText}>
                    Nothing matches “{query}”.
                  </Text>
                ) : (
                  win.rows.map((c) => {
                    const deeper = c.children.length > 0;
                    // A last-level row opens nothing unless the caller has more below it.
                    const open = deeper ? () => onPush(c) : openLeaf?.(c);
                    const unmapped = c.name === 'Other / Unmapped';
                    // The row whose sheet is open on top of this one, or whose daily chart shows below.
                    const active = path[depth + 1]?.id === c.id || (!!activeKey && nodeKey(c) === activeKey);
                    return (
                      <Grid
                        key={c.id}
                        as={open ? 'button' : 'div'}
                        onClick={open}
                        className="sp-pin"
                        w="100%"
                        templateColumns={template}
                        columnGap={5}
                        rowGap={2}
                        px={3}
                        py="7px"
                        alignItems="center"
                        textAlign="left"
                        borderBottom="1px solid"
                        borderColor={colors.sunkBg}
                        cursor={open ? 'pointer' : 'default'}
                        bg={active ? colors.brandSoft : colors.cardBg}
                        boxShadow={active ? `inset 3px 0 0 ${colors.brand}` : undefined}
                        _hover={open ? { bg: active ? colors.brandSoft : colors.hoverBg } : undefined}
                        aria-current={active || undefined}
                        title={open ? `Open ${c.name}` : undefined}
                      >
                        <HStack gap="6px" minW={0}>
                          <Text
                            fontSize="13px"
                            color={active ? colors.brand : unmapped ? colors.mutedText : colors.darkText}
                            fontStyle={unmapped ? 'italic' : undefined}
                            fontWeight={deeper || active ? 600 : 400}
                            truncate
                            title={c.name}
                          >
                            {c.name}
                          </Text>
                          {c.code && (
                            <Text fontSize="11px" color={colors.mutedText} flexShrink={0} fontVariantNumeric="tabular-nums">
                              {c.code}
                            </Text>
                          )}
                        </HStack>
                        {cols.map((col) => (
                          <Fragment key={col.key}>{col.render(c.sums, node.sums, false, c)}</Fragment>
                        ))}
                        <Box />
                      </Grid>
                    );
                  })
                )}
                {win.marker}
              </Box>
            </Box>
          </Flex>
        ) : (
          <Text fontSize="13px" color={colors.mutedText}>
            Nothing further to break down at this level.
          </Text>
        )}
      </Flex>
    </Flex>
  );
}

// Branch → Branches, Class → Classes (Sales Pulse 2.0 only added an s: "Branchs").
const plural = (label: string) => (/(ch|sh|x|ss)$/.test(label) ? `${label}es` : label.endsWith('s') ? label : label === 'SKU' ? 'SKUs' : `${label}s`);

function Kpi({ label, value, note }: GroupKpi) {
  return (
    <Box
      className="sp-card sp-tint"
      border="1px solid"
      borderColor={colors.border}
      borderRadius="4px"
      px={3}
      py="10px"
      minW={0}
    >
      <Text
        fontSize="11px"
        fontWeight={600}
        letterSpacing=".05em"
        textTransform="uppercase"
        color={colors.cardAccent}
        truncate
      >
        {label}
      </Text>
      <Text fontSize="22px" fontWeight={700} color={colors.darkText} lineHeight="1.25" fontVariantNumeric="tabular-nums">
        <AnimatedValue value={value} />
      </Text>
      {note && (
        <Text fontSize="12px" color={colors.mutedText} mt="2px" lineClamp={2}>
          {note}
        </Text>
      )}
    </Box>
  );
}

function Crumb({ children, onClick, title }: { children: ReactNode; onClick: () => void; title?: string }) {
  return (
    <Box
      as="button"
      color={colors.brand}
      fontWeight={600}
      cursor="pointer"
      _hover={{ textDecoration: 'underline' }}
      onClick={onClick}
      title={title}
    >
      {children}
    </Box>
  );
}

function IconButton({
  label,
  onClick,
  muted,
  children,
}: {
  label: string;
  onClick: () => void;
  muted?: boolean;
  children: ReactNode;
}) {
  return (
    <Box
      as="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      mt="2px"
      p={1}
      borderRadius="4px"
      color={muted ? colors.mutedText : colors.bodyText}
      cursor="pointer"
      _hover={{ bg: colors.hoverBg, color: colors.darkText }}
    >
      {children}
    </Box>
  );
}
