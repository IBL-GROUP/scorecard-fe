// Live-mode gates for Supply Chain Pulse 2.0 (FEAT-AUTH, FEAT-PERM), in the
// new design system. The session and permission LOGIC is shared with 1.0
// (src/utils/session.ts, src/api/permissions.ts); only the screens are new.
//
// - AuthGate: nothing renders, and no API call fires, until a portal session
//   exists (ticket redeemed or token still valid). Starts usage tracking.
// - PermissionGate: waits for the permission codes, then shows "no access"
//   when the user holds none on this dashboard.
// Hiding UI is not security (SEC-PERM-001): scorecard-be checks the token.

import { Box, Flex, Link, Spinner, Text } from '@chakra-ui/react';
import { useEffect, useState, type ReactNode } from 'react';
import { FiLock } from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import { hasValidSession, joinPortalPath, redeemTicketFromUrl, redirectToPortal } from '@/utils/session';
import { usePermissions } from '@/api/permissions';
import { startUsageTracking } from '@/v2/features/usage';

function Centre({ children }: { children: ReactNode }) {
  return (
    <Flex minH="100vh" align="center" justify="center" bg={colors.pageBg} px={4}>
      {children}
    </Flex>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <Centre>
      <Flex direction="column" align="center" gap={3} color={colors.mutedText}>
        <Spinner size="lg" color={colors.brand} />
        <Text fontSize="14px">{text}</Text>
      </Flex>
    </Centre>
  );
}

type GateState = 'checking' | 'allowed' | 'redirecting';

export function AuthGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<GateState>('checking');

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // A ticket in the URL always wins: it is a fresh handoff from the portal.
      await redeemTicketFromUrl();
      if (cancelled) return;
      if (hasValidSession()) return setState('allowed');
      setState('redirecting');
      redirectToPortal();
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state !== 'allowed') return;
    const stop = startUsageTracking();
    // The token can expire while the tab is open: bounce instead of firing 401s.
    const recheck = () => {
      if (!hasValidSession()) redirectToPortal();
    };
    const id = window.setInterval(recheck, 60_000);
    document.addEventListener('visibilitychange', recheck);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', recheck);
      stop();
    };
  }, [state]);

  if (state !== 'allowed') return <Waiting text={state === 'redirecting' ? 'Redirecting to sign in…' : 'Signing you in…'} />;
  return <>{children}</>;
}

/** No permission anywhere on this dashboard: not an error, so no red. */
export function NoAccess({ title = 'You don’t have access', body }: { title?: string; body?: ReactNode }) {
  const portal = import.meta.env.VITE_AUTH_PORTAL_URL ? joinPortalPath('dashboard') : undefined;
  return (
    <Centre>
      <Box maxW="440px" textAlign="center" bg={colors.cardBg} border="1px solid" borderColor={colors.border} borderRadius="4px" px={8} py={10} data-testid="no-access">
        <Flex w="56px" h="56px" mx="auto" mb={4} borderRadius="50%" bg={colors.brandSoft} color={colors.brand} align="center" justify="center" fontSize="24px">
          <FiLock />
        </Flex>
        <Text fontSize="18px" fontWeight={700} color={colors.darkText} mb={2}>
          {title}
        </Text>
        <Text fontSize="14px" color={colors.bodyText} lineHeight="1.6">
          {body ?? (
            <>
              Your account has not been given permission to view <b>Supply Chain Pulse</b>. If you think this is a mistake, ask your administrator for a role that includes it.
            </>
          )}
        </Text>
        {portal && (
          <Link display="inline-block" mt={5} href={portal} bg={colors.brand} color="white" px={5} py="10px" borderRadius="4px" fontSize="14px" fontWeight={600}>
            Back to dashboards
          </Link>
        )}
      </Box>
    </Centre>
  );
}

export function PermissionGate({ children }: { children: ReactNode }) {
  const { isReady, hasAnyInResource, isError } = usePermissions();
  if (isError) return <NoAccess title="Couldn’t check your access" body="The sign-in service didn’t answer. Reload the page, or go back to the dashboards and try again." />;
  if (!isReady) return <Waiting text="Checking your access…" />;
  if (!hasAnyInResource) return <NoAccess />;
  return <>{children}</>;
}
