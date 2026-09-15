import { Avatar, Badge, Box, Menu, Portal, Text, chakra } from '@chakra-ui/react';
import { useMemo } from 'react';
import { FiBookOpen, FiLogOut, FiSettings } from 'react-icons/fi';
import { DashboardIcon } from './DashboardIcons';
import {
  USER_MANUAL_URL,
  isCurrentDashboard,
  logout,
  openDashboard,
  useDisplayName,
  useUserDashboards,
} from '@/api/account';
import { getSessionUser, joinPortalPath } from '@/utils/session';

/** "syed.sharjeel" -> "Syed Sharjeel" — used until the display name loads. */
function nameFromUserName(userName: string): string {
  return userName
    .split(/[.\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

const itemProps = {
  gap: 3,
  px: 4,
  py: 2.5,
  fontSize: 'sm',
  color: 'gray.700',
  cursor: 'pointer',
} as const;

/**
 * The signed-in user's avatar, in the header's top-right corner. Clicking it opens a menu with
 * the user's full name and email, every dashboard they may open, and then the
 * user manual, the portal (Settings) and Log out.
 *
 * Built on Chakra's Avatar and Menu, so keyboard navigation, focus handling,
 * positioning and the open/close animation come with them.
 */
export function UserMenu() {
  const session = useMemo(() => getSessionUser(), []);
  const displayName = useDisplayName();
  const dashboards = useUserDashboards();

  const name =
    displayName.data ?? (session ? nameFromUserName(session.userName) : 'Unknown user');

  const handleSelect = ({ value }: { value: string }) => {
    if (value === 'userManual') {
      if (USER_MANUAL_URL) window.open(USER_MANUAL_URL, '_blank', 'noopener,noreferrer');
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
          focusVisibleRing="outside"
        >
          <Avatar.Root size="md" colorPalette="blue" variant="subtle">
            <Avatar.Fallback name={name} />
          </Avatar.Root>
        </chakra.button>
      </Menu.Trigger>

      <Portal>
        <Menu.Positioner>
          <Menu.Content minW="270px" py={3}>
            <Box px={4} pt={1} pb={3}>
              <Text fontWeight="bold" fontSize="sm" color="gray.900">
                {name}
              </Text>
              {session?.email && (
                <Text fontSize="xs" color="gray.500" wordBreak="break-all">
                  {session.email}
                </Text>
              )}
            </Box>

            <Menu.Separator />

            <Menu.ItemGroup>
              <Menu.ItemGroupLabel px={4} fontSize="xs" color="gray.500" textTransform="uppercase" letterSpacing="wider">
                Dashboards
              </Menu.ItemGroupLabel>

              {dashboards.isPending && (
                <Text px={4} py={2} fontSize="sm" color="gray.500">
                  Loading…
                </Text>
              )}
              {dashboards.isError && (
                <Text px={4} py={2} fontSize="sm" color="gray.500">
                  Couldn't load dashboards
                </Text>
              )}

              {dashboards.data?.map((dashboard) => {
                const current = isCurrentDashboard(dashboard);
                return (
                  <Menu.Item
                    key={dashboard.menu_id}
                    value={dashboard.menu_id}
                    disabled={current}
                    gap={3}
                    px={4}
                    py={2.5}
                    fontSize="sm"
                    color={current ? 'blue.700' : 'gray.700'}
                    fontWeight={current ? 'semibold' : 'normal'}
                    cursor={current ? 'default' : 'pointer'}
                    _disabled={{ opacity: 1 }}
                  >
                    <DashboardIcon resourceCode={dashboard.resource_code} size={16} />
                    <Box flex="1">{dashboard.label}</Box>
                    {current && (
                      <Badge size="xs" colorPalette="blue" variant="subtle">
                        Current
                      </Badge>
                    )}
                  </Menu.Item>
                );
              })}
            </Menu.ItemGroup>

            <Menu.Separator />

            {/* Each project sets its own manual in VITE_USER_MANUAL_URL. */}
            <Menu.Item
              value="userManual"
              {...itemProps}
              disabled={!USER_MANUAL_URL}
              _disabled={{ opacity: 1, cursor: 'default', color: 'gray.400' }}
            >
              <FiBookOpen size={16} />
              <Box flex="1">User Manual</Box>
              {!USER_MANUAL_URL && (
                <Badge size="xs" colorPalette="gray" variant="subtle">
                  Coming soon
                </Badge>
              )}
            </Menu.Item>

            <Menu.Item value="settings" {...itemProps}>
              <FiSettings size={16} />
              Settings
            </Menu.Item>

            <Menu.Separator />

            <Menu.Item
              value="logout"
              {...itemProps}
              color="red.600"
              _highlighted={{ bg: 'red.50', color: 'red.700' }}
            >
              <FiLogOut size={16} />
              Log out
            </Menu.Item>
          </Menu.Content>
        </Menu.Positioner>
      </Portal>
    </Menu.Root>
  );
}
