// Entry for Supply Chain Pulse 2.0 (VITE_APP_VERSION=2). Uses only the new
// design system (src/v2): no 1.0 theme, provider or component is imported.
// Shared 1.0 logic it does use: src/utils/session.ts, src/api/permissions.ts,
// src/api/account.ts (session handoff, permission codes, user menu data).
//
// Live mode (default): portal session → permission codes → the dashboard on
// scorecard-be v2 (VITE_API_BASE_URL). Demo mode (VITE_DEMO_DATA=true): no
// session, generated data, demo controls.

import React, { type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { system } from '@/v2/theme/theme';
import { ColorModeProvider } from '@/v2/theme/color-mode';
import { themeCss } from '@/v2/constants/theme';
import { classColorCss } from '@/v2/constants/classColors';
import { StoreProvider } from '@/v2/features/store';
import { ALL_SECTIONS } from '@/v2/features/tabs';
import { Shell } from '@/v2/shell/Shell';
import { DetailProvider } from '@/v2/features/detail';
import { DEMO_DATA } from '@/v2/config/api';
import { AuthGate, PermissionGate } from '@/v2/auth/AuthGate';
import { permissionCode, usePermissions } from '@/api/permissions';
import { useDisplayName } from '@/api/account';
import { getSessionUser } from '@/utils/session';

/** The signed-in user and the sections they hold (FEAT-PERM), into the store. */
function LiveStore({ children }: { children: ReactNode }) {
  const perms = usePermissions();
  const display = useDisplayName();
  const session = getSessionUser();
  const sections = ALL_SECTIONS.filter((s) => perms.has(permissionCode(s)));
  const id = session?.userName ?? 'user';
  return <StoreProvider live={{ id, name: display.data || session?.userName || 'Signed-in user', sections }}>{children}</StoreProvider>;
}

export function mount() {
  // Light and dark colour variables before the first paint.
  const style = document.createElement('style');
  style.id = 'supply-chain-pulse-2-theme';
  style.textContent = themeCss + classColorCss;
  document.head.appendChild(style);
  document.title = 'Supply Chain Pulse 2.0';

  const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });
  const router = createBrowserRouter([{ path: '*', element: <Shell /> }], { basename: '/scorecard-dashboard' });

  const app = (
    <DetailProvider>
      <RouterProvider router={router} />
    </DetailProvider>
  );

  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ChakraProvider value={system}>
          <ColorModeProvider>
            {DEMO_DATA ? (
              <StoreProvider>{app}</StoreProvider>
            ) : (
              <AuthGate>
                <PermissionGate>
                  <LiveStore>{app}</LiveStore>
                </PermissionGate>
              </AuthGate>
            )}
          </ColorModeProvider>
        </ChakraProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );
}
