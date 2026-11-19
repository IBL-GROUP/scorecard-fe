import { Box, Flex, Text } from '@chakra-ui/react';
import { colors } from '@/v2/constants/theme';
import { Logo } from './Logo';

/**
 * Sales Pulse 2.0's loading screen (dsr-fe components/brand/BrandLoader), for
 * Supply Chain Pulse 2.0: the full-page wait before the dashboard can show — signing in, checking
 * access. A light traces round the ONEThunder tile while, inside it, three
 * sales bars rise in turn, the mark draws its rising line and the node at its
 * end pops with a halo; a slim running bar sits beneath the product name.
 *
 * Under reduced motion (Windows "Animation effects" off sets it) nothing
 * moves: the tracer is hidden and the mark and bar breathe in opacity instead,
 * so the page still reads as working rather than frozen.
 */
const EASE = 'var(--sp-ease-out, cubic-bezier(.16,1,.3,1))';
const CYCLE = '2.4s';

export function BrandLoader({ message }: { message: string }) {
  return (
    <Flex
      minH="100vh"
      align="center"
      justify="center"
      direction="column"
      gap={5}
      bg={colors.pageBg}
      role="status"
      aria-live="polite"
      css={{
        '@keyframes sp-mark-draw': {
          '0%, 20%': { strokeDashoffset: 18 },
          '55%, 85%': { strokeDashoffset: 0 },
          '100%': { strokeDashoffset: -18 },
        },
        '@keyframes sp-mark-node': {
          '0%, 50%': { transform: 'scale(0)', opacity: 0 },
          '62%': { transform: 'scale(1.4)', opacity: 1 },
          '72%, 88%': { transform: 'scale(1)', opacity: 1 },
          '100%': { transform: 'scale(0)', opacity: 0 },
        },
        '@keyframes sp-mark-halo': {
          '0%, 58%': { transform: 'scale(.6)', opacity: 0 },
          '64%': { opacity: 0.4 },
          '100%': { transform: 'scale(2.8)', opacity: 0 },
        },
        '@keyframes sp-mark-bar': {
          '0%': { transform: 'scaleY(0)' },
          '30%, 80%': { transform: 'scaleY(1)' },
          '100%': { transform: 'scaleY(0)' },
        },
        '@keyframes sp-tile-trace': {
          from: { strokeDashoffset: 100 },
          to: { strokeDashoffset: 0 },
        },
        '@keyframes sp-tile-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        '@keyframes sp-loader-bar': {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(250%)' },
        },
        '@keyframes sp-breathe': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.45 },
        },
        '& .sp-line': {
          strokeDasharray: 18,
          animation: `sp-mark-draw ${CYCLE} ${EASE} infinite`,
        },
        '& .sp-node, & .sp-halo': {
          transformBox: 'fill-box',
          transformOrigin: 'center',
        },
        '& .sp-node': { animation: `sp-mark-node ${CYCLE} ${EASE} infinite` },
        '& .sp-halo': { animation: `sp-mark-halo ${CYCLE} ease-out infinite` },
        '& .sp-col': {
          transformBox: 'fill-box',
          transformOrigin: 'bottom',
          animation: `sp-mark-bar ${CYCLE} ${EASE} infinite`,
        },
        '& .sp-col:nth-of-type(2)': { animationDelay: '.15s' },
        '& .sp-col:nth-of-type(3)': { animationDelay: '.3s' },
        '& .sp-trace': {
          strokeDasharray: '22 78',
          animation: 'sp-tile-trace 1.6s linear infinite',
        },
        '& .sp-tile': {
          animation: `sp-tile-float ${CYCLE} ease-in-out infinite`,
        },
        '& .sp-bar': { animation: `sp-loader-bar 1.4s ${EASE} infinite` },
        '@media (prefers-reduced-motion: reduce)': {
          '& .sp-line, & .sp-node, & .sp-halo, & .sp-col, & .sp-tile, & .sp-bar': { animation: 'none' },
          '& .sp-halo, & .sp-trace': { display: 'none' },
          '& .sp-mark, & .sp-bar': {
            animation: 'sp-breathe 1.6s ease-in-out infinite',
          },
        },
      }}
    >
      <Box className="sp-tile" position="relative" w="72px" h="72px">
        {/* The tracer: a short lit arc running round the tile edge. */}
        <Box as="svg" position="absolute" inset="-7px" w="86px" h="86px" overflow="visible" aria-hidden>
          <rect x="1" y="1" width="84" height="84" rx="22" fill="none" stroke={colors.sunkBg} strokeWidth="2" />
          <rect
            className="sp-trace"
            x="1"
            y="1"
            width="84"
            height="84"
            rx="22"
            pathLength={100}
            fill="none"
            stroke={colors.brand}
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </Box>
        <Flex
          w="72px"
          h="72px"
          align="center"
          justify="center"
          borderRadius="18px"
          bg={colors.cardBg}
          border="1px solid"
          borderColor={colors.border}
          boxShadow="0 10px 28px rgba(22,22,49,.10)"
          color={colors.brand}
        >
          <svg className="sp-mark" width={42} height={42} viewBox="0 0 16 16" fill="none" aria-hidden>
            <g opacity={0.16} fill="currentColor">
              <rect className="sp-col" x="1.6" y="10" width="2.6" height="5" rx=".5" />
              <rect className="sp-col" x="6.2" y="7.5" width="2.6" height="7.5" rx=".5" />
              <rect className="sp-col" x="10.8" y="5" width="2.6" height="10" rx=".5" />
            </g>
            <path
              className="sp-line"
              d="M1.5 14 6 9.5l3 2.2 4.2-6"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinejoin="miter"
              strokeLinecap="butt"
            />
            <circle className="sp-halo" cx="13.6" cy="3.4" r="2" fill="currentColor" />
            <circle className="sp-node" cx="13.6" cy="3.4" r="2" fill="currentColor" />
          </svg>
        </Flex>
      </Box>

      <Flex direction="column" align="center" gap={2}>
        <Flex align="center" gap="10px">
          <Logo height={22} />
          <Box w="1px" h="18px" bg={colors.border} />
          <Text fontSize="14px" fontWeight={600} color={colors.midnight} whiteSpace="nowrap">
            Supply Chain Pulse
          </Text>
          <Text
            fontSize="11px"
            fontWeight={700}
            color={colors.brand}
            border="1px solid"
            borderColor={colors.brand}
            px="4px"
            borderRadius="3px"
            lineHeight="14px"
          >
            2.0
          </Text>
        </Flex>
        <Text fontSize="13.5px" color={colors.mutedText}>
          {message}
        </Text>
      </Flex>

      <Box w="160px" h="3px" borderRadius="2px" bg={colors.sunkBg} overflow="hidden">
        <Box className="sp-bar" w="40%" h="100%" borderRadius="2px" bg={colors.brand} />
      </Box>
    </Flex>
  );
}
