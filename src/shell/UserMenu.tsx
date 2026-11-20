import { Avatar, Box, Flex, Menu, Portal, Text, chakra } from '@chakra-ui/react';
import { useMemo, type ReactNode } from 'react';
import { FiBookOpen, FiGrid, FiLogOut, FiSettings } from 'react-icons/fi';
import { DashboardIcon, dashboardAccent } from './DashboardIcons';
import {
  USER_MANUAL_URL,
  isCurrentDashboard,
  logout,
  openDashboard,
  useDisplayName,
  useUserDashboards,
} from '@/api/account';
import { colors } from '@/constants/theme';
import { useStore } from '@/features/store';
import { getSessionUser, joinPortalPath } from '@/utils/session';

/** "syed.sharjeel" -> "Syed Sharjeel" — used until the display name loads. */
function nameFromUserName(userName: string): string {
  return userName
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/** A menu row: rounded, inset from the menu's edge, the icon in a small tile. */
const itemProps = {
  gap: 3,
  px: 2,
  py: '7px',
  borderRadius: '6px',
  fontSize: '14px',
  fontWeight: 500,
  color: colors.bodyText,
  cursor: 'pointer',
  _highlighted: { bg: colors.hoverBg, color: colors.darkText },
} as const;

/** The icon tile at the start of a row: grey for the app's own items, the dashboard's colour for a dashboard. */
function IconTile({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <Flex
      w="28px"
      h="28px"
      borderRadius="7px"
      align="center"
      justify="center"
      flexShrink={0}
      color={accent ?? colors.bodyText}
      bg={accent ? `color-mix(in srgb, ${accent} 13%, transparent)` : colors.sunkBg}
    >
      {children}
    </Flex>
  );
}

// Sales Pulse 2.0's user menu (dsr-fe components/user-menu/UserMenu), for
// Supply Chain Pulse 2.0. The "Planner view" switch is gone with it: it only
// expanded the old Operational Detail tables, which no tab has any more.

/**
 * The signed-in user's avatar, in the header's top-right corner. Clicking it opens a menu with
 * the user's full name and email, Home (the portal), every dashboard they may open (each in its
 * portal colour), then the user manual, Settings and Log out.
 *
 * Built on Chakra's Avatar and Menu, so keyboard navigation, focus handling,
 * positioning and the open/close animation come with them.
 */
export function UserMenu() {
  const session = useMemo(() => getSessionUser(), []);
  const displayName = useDisplayName();
  const dashboards = useUserDashboards();
  const { user } = useStore();

  const name =
    displayName.data ?? (session ? nameFromUserName(session.userName) : user.name);

  const handleSelect = ({ value }: { value: string }) => {
    if (value === 'portalHome') {
      // The portal's own dashboard page — every dashboard, in one place.
      window.location.href = joinPortalPath('dashboard');
      return;
    }
    if (value === 'userManual') {
      // A new tab, so the dashboard behind it keeps its filters and its loaded
      // data — the manual is read alongside the screen it describes.
      window.open(USER_MANUAL_URL, '_blank', 'noopener,noreferrer');
      return;
    }
    if (value === 'settings') {
      // Straight to the portal's Settings section, not its dashboard list.
      window.location.href = joinPortalPath('dashboard?view=settings');
      return;
    }
    if (value === 'logout') {
      logout();
      return;
    }
    const dashboard = dashboards.data?.find((d) => d.menu_id === value);
    if (dashboard && !isCurrentDashboard(dashboard)) void openDashboard(dashboard);
  };

  return (
    <Menu.Root positioning={{ placement: 'bottom-end', gutter: 8 }} onSelect={handleSelect}>
      <Menu.Trigger asChild>
        <chakra.button
          type="button"
          aria-label="User menu"
          flexShrink={0}
          borderRadius="full"
          cursor="pointer"
          transition="box-shadow 0.2s ease"
          // Only the ring moves; the circle stays still. Hovering sends a
          // ripple out from the edge (keyframes in theme/theme.ts); while the
          // menu is open the ring holds steady instead.
          _hover={{ animation: 'avatarRing 1.4s ease-out infinite' }}
          css={{
            '&[aria-expanded=true], &[aria-expanded=true]:hover': {
              animation: 'none',
              boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.3)',
            },
          }}
        >
          <Avatar.Root size="md" colorPalette="blue" variant="subtle">
            <Avatar.Fallback name={name} />
          </Avatar.Root>
        </chakra.button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content
            minW="300px"
            p={2}
            bg={colors.cardBg}
            border="1px solid"
            borderColor={colors.border}
            borderRadius="10px"
            boxShadow={`0 12px 32px ${colors.shadow}`}
          >
            {/* Who is signed in, on a light Cobalt wash. */}
            <Flex
              align="center"
              gap={3}
              px={3}
              py={3}
              mb={1}
              borderRadius="8px"
              bg={`linear-gradient(135deg, color-mix(in srgb, ${colors.brand} 12%, ${colors.cardBg}) 0%, ${colors.cardBg} 85%)`}
            >
              <Avatar.Root size="md" colorPalette="blue" variant="solid" flexShrink={0}>
                <Avatar.Fallback name={name} />
              </Avatar.Root>
              <Box minW={0}>
                <Text fontWeight={700} fontSize="15px" color={colors.darkText} truncate>
                  {name}
                </Text>
                {session?.email && (
                  <Text fontSize="12px" color={colors.mutedText} truncate title={session.email}>
                    {session.email}
                  </Text>
                )}
              </Box>
            </Flex>

            {/* Back to the One Thunder portal's dashboard page. Fixed, not from
                the user's dashboards — it is where every dashboard is listed. */}
            <Menu.Item value="portalHome" {...itemProps}>
              <IconTile>
                <FiGrid size={15} />
              </IconTile>
              <Box flex="1">Home</Box>
            </Menu.Item>

            <Menu.ItemGroup>
              <Menu.ItemGroupLabel px={2} pt={2} pb={1} fontSize="11px" fontWeight={700} letterSpacing=".06em" textTransform="uppercase" color={colors.mutedText}>
                Dashboards
              </Menu.ItemGroupLabel>

              {dashboards.isPending && (
                <Text px={2} py={2} fontSize="13px" color={colors.mutedText}>
                  Loading…
                </Text>
              )}
              {dashboards.isError && (
                <Text px={2} py={2} fontSize="13px" color={colors.mutedText}>
                  Couldn't load dashboards
                </Text>
              )}

              {dashboards.data?.map((dashboard) => {
                const current = isCurrentDashboard(dashboard);
                const accent = dashboardAccent(dashboard.resource_code);
                return (
                  <Menu.Item
                    key={dashboard.menu_id}
                    value={dashboard.menu_id}
                    disabled={current}
                    {...itemProps}
                    color={current ? colors.darkText : colors.bodyText}
                    fontWeight={current ? 600 : 500}
                    cursor={current ? 'default' : 'pointer'}
                    bg={current ? colors.brandSoft : undefined}
                    _disabled={{ opacity: 1 }}
                  >
                    <IconTile accent={accent}>
                      <DashboardIcon resourceCode={dashboard.resource_code} size={15} />
                    </IconTile>
                    <Box flex="1" minW={0} truncate>
                      {dashboard.label}
                    </Box>
                    {current && (
                      <Text as="span" fontSize="11px" fontWeight={600} color={colors.brand} bg={colors.cardBg} px="7px" py="1px" borderRadius="999px">
                        Current
                      </Text>
                    )}
                  </Menu.Item>
                );
              })}
            </Menu.ItemGroup>

            <Box h="1px" bg={colors.border} my={2} mx={1} />

            {/* Opens this app's own /usermanual route in a new tab. */}
            <Menu.Item value="userManual" {...itemProps}>
              <IconTile>
                <FiBookOpen size={15} />
              </IconTile>
              <Box flex="1">User Manual</Box>
            </Menu.Item>

            <Menu.Item value="settings" {...itemProps}>
              <IconTile>
                <FiSettings size={15} />
              </IconTile>
              Settings
            </Menu.Item>

            <Menu.Item
              value="logout"
              {...itemProps}
              mt={1}
              color={colors.bad}
              _highlighted={{ bg: colors.badSoft, color: colors.bad }}
            >
              <IconTile accent={colors.bad}>
                <FiLogOut size={15} />
              </IconTile>
              Log out
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
