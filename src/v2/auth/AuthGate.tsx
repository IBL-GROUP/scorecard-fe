// Live-mode gates for Supply Chain Pulse 2.0 (FEAT-AUTH, FEAT-PERM), in the
// new design system. The session and permission LOGIC is shared with 1.0
// (src/utils/session.ts, src/api/permissions.ts); only the screens are new.
//
// - AuthGate: nothing renders, and no API call fires, until a portal session
//   exists (ticket redeemed or token still valid). Starts usage tracking.
// - PermissionGate: waits for the permission codes, then shows "no access"
//   when the user holds none on this dashboard.
// Hiding UI is not security (SEC-PERM-001): scorecard-be checks the token.

import { Box, Flex, Link, Text, VStack } from '@chakra-ui/react';
import { useEffect, useState, type ReactNode } from 'react';
import { FiLock } from 'react-icons/fi';
import { colors } from '@/v2/constants/theme';
import { BrandLoader } from '@/v2/components/brand';
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

  if (state !== 'allowed') return <BrandLoader message={state === 'redirecting' ? 'Redirecting to sign in…' : 'Signing you in…'} />;
  return <>{children}</>;
}

/**
 * No permission anywhere on this dashboard: Sales Pulse 2.0's screen (dsr-fe
 * components/no-access/NoAccess). Not an error, so no red: it names the
 * dashboard, says who to ask and offers the way back to the portal.
 */
export function NoAccess({ title = 'You don’t have access', body }: { title?: string; body?: ReactNode }) {
  const portal = import.meta.env.VITE_AUTH_PORTAL_URL ? joinPortalPath('dashboard') : undefined;
  return (
    <Centre>
      <VStack
        gap={5}
        maxW="440px"
        textAlign="center"
        bg="white"
        borderRadius="2xl"
        border="1px solid"
        borderColor="gray.200"
        boxShadow="0 2px 16px rgba(26,61,143,0.08)"
        px={10}
        py={12}
        data-testid="no-access"
      >
        <Flex w="72px" h="72px" borderRadius="full" bg="rgba(26,61,143,0.08)" align="center" justify="center" color="#1a3d8f" fontSize="30px">
          <FiLock />
        </Flex>
        <Box>
          <Text fontSize="20px" fontWeight="800" color="#1a3d8f" mb={2}>
            {title}
          </Text>
          <Text fontSize="14px" color="gray.600" lineHeight="1.7">
            {body ?? (
              <>
                Your account has not been given permission to view{' '}
                <Text as="span" fontWeight="700" color="gray.700">
                  Supply Chain Pulse
                </Text>
                . If you think this is a mistake, ask your administrator to grant you a role that includes it.
              </>
            )}
          </Text>
        </Box>
        {portal && (
          <Link href={portal} bg="#1a3d8f" color="white" px={6} py={3} borderRadius="lg" fontSize="14px" fontWeight="700" _hover={{ bg: '#1e4aa0', textDecoration: 'none' }}>
            Back to dashboards
          </Link>
        )}
      </VStack>
    </Centre>
  );
}

export function PermissionGate({ children }: { children: ReactNode }) {
  const { isReady, hasAnyInResource, isError } = usePermissions();
  if (isError) return <NoAccess title="Couldn’t check your access" body="The sign-in service didn’t answer. Reload the page, or go back to the dashboards and try again." />;
  if (!isReady) return <BrandLoader message="Checking your access…" />;
  if (!hasAnyInResource) return <NoAccess />;
  return <>{children}</>;
}
