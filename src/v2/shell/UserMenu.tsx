// User menu (S3 app shell): who is signed in, the "Planner view" switch
// (Operational Detail expanded by default, decision of 11 Nov 2026), the other
// dashboards the user may open, and sign out. Demo mode shows the demo user only.

import { Box, Flex, Text } from '@chakra-ui/react';
import { useEffect, useRef, useState } from 'react';
import { FiGrid, FiLogOut } from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import { DEMO_DATA } from '@/v2/config/api';
import { useStore } from '@/v2/features/store';
import { isCurrentDashboard, logout, openDashboard, useUserDashboards } from '@/api/account';
import { getSessionUser } from '@/utils/session';

const initials = (name: string) =>
  name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');

function OtherDashboards() {
  const q = useUserDashboards();
  const others = (q.data ?? []).filter((d) => !isCurrentDashboard(d));
  if (!others.length) return null;
  return (
    <Box borderTop="1px solid" borderColor={colors.border} py="6px">
      <Text px="14px" py="4px" fontSize="11px" color={colors.mutedText} textTransform="uppercase" letterSpacing=".05em">
        Other dashboards
      </Text>
      {others.map((d) => (
        <Flex key={d.menu_id} as="button" w="100%" align="center" gap="8px" px="14px" py="7px" fontSize="13px" color={colors.bodyText} _hover={{ bg: colors.navbarHover }} onClick={() => void openDashboard(d)}>
          <FiGrid /> {d.label}
        </Flex>
      ))}
    </Box>
  );
}

export function UserMenu() {
  const st = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const email = DEMO_DATA ? null : getSessionUser()?.email;
  const planner = st.user.persona === 'planner';

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !ref.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  return (
    <Box position="relative" ref={ref} flexShrink={0}>
      <Flex
        as="button"
        aria-label="User menu"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        align="center"
        justify="center"
        w="30px"
        h="30px"
        borderRadius="50%"
        bg={colors.brandSoft}
        color={colors.brand}
        fontSize="12px"
        fontWeight={700}
        title={st.user.name}
      >
        {initials(st.user.name) || '?'}
      </Flex>
      {open && (
        <Box role="menu" position="absolute" right={0} top="38px" w="260px" bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px" boxShadow={`0 6px 24px ${colors.shadow}`} zIndex={60} overflow="hidden">
          <Box px="14px" py="10px">
            <Text fontSize="14px" fontWeight={700} color={colors.darkText} truncate>
              {st.user.name}
            </Text>
            {email && (
              <Text fontSize="12px" color={colors.mutedText} truncate>
                {email}
              </Text>
            )}
          </Box>
          <Flex as="label" borderTop="1px solid" borderColor={colors.border} align="flex-start" gap="10px" px="14px" py="10px" cursor="pointer" _hover={{ bg: colors.navbarHover }}>
            <input type="checkbox" checked={planner} onChange={(e) => st.setPersona(e.target.checked ? 'planner' : 'executive')} aria-describedby="planner-view-help" style={{ marginTop: 3 }} />
            <Box>
              <Text fontSize="13px" fontWeight={600} color={colors.bodyText}>
                Planner view
              </Text>
              <Text id="planner-view-help" fontSize="12px" color={colors.mutedText}>
                Open the Operational Detail tables expanded on every tab.
              </Text>
            </Box>
          </Flex>
          {!DEMO_DATA && <OtherDashboards />}
          {!DEMO_DATA && (
            <Flex as="button" w="100%" borderTop="1px solid" borderColor={colors.border} align="center" gap="8px" px="14px" py="10px" fontSize="13px" color={colors.bodyText} _hover={{ bg: colors.navbarHover }} onClick={logout}>
              <FiLogOut /> Sign out
            </Flex>
          )}
        </Box>
      )}
    </Box>
  );
}
