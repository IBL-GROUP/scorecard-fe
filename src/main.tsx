// Supply Chain Pulse: portal session → permission codes → the dashboard on
// scorecard-be (VITE_API_BASE_URL). /usermanual is the manual the user menu opens.

import React, { lazy, Suspense, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { system } from '@/theme/theme';
import { ColorModeProvider } from '@/theme/color-mode';
import { themeCss } from '@/constants/theme';
import { classColorCss } from '@/constants/classColors';
import { StoreProvider } from '@/features/store';
import { ALL_SECTIONS } from '@/features/tabs';
import { Shell } from '@/shell/Shell';
import { DetailProvider } from '@/features/detail';
import { AuthGate, PermissionGate } from '@/auth/AuthGate';
import { BrandLoader } from '@/components/brand';
import { permissionCode, usePermissions } from '@/api/permissions';
import { useDisplayName } from '@/api/account';
import { getSessionUser } from '@/utils/session';

// Its own chunk: most sessions never open the manual.
const UserManual = lazy(() => import('@/pages/UserManual'));

/** The signed-in user and the sections they hold, into the store. */
function UserStore({ children }: { children: ReactNode }) {
  const perms = usePermissions();
  const display = useDisplayName();
  const session = getSessionUser();
  const sections = ALL_SECTIONS.filter((s) => perms.has(permissionCode(s)));
  const id = session?.userName ?? 'user';
  return <StoreProvider user={{ id, name: display.data || session?.userName || 'Signed-in user', sections }}>{children}</StoreProvider>;
}

// Light and dark colour variables before the first paint.
const style = document.createElement('style');
style.id = 'supply-chain-pulse-theme';
style.textContent = themeCss + classColorCss;
document.head.appendChild(style);

const queryClient = new QueryClient({ defaultOptions: { queries: { refetchOnWindowFocus: false } } });
const router = createBrowserRouter(
  [
    {
      path: '/usermanual',
      element: (
        <Suspense fallback={<BrandLoader message="Opening the user manual…" />}>
          <UserManual />
        </Suspense>
      ),
    },
    { path: '*', element: <Shell /> },
  ],
  { basename: '/scorecard-dashboard' },
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ChakraProvider value={system}>
        <ColorModeProvider>
          <AuthGate>
            <PermissionGate>
              <UserStore>
                <DetailProvider>
                  <RouterProvider router={router} />
                </DetailProvider>
              </UserStore>
            </PermissionGate>
          </AuthGate>
        </ColorModeProvider>
      </ChakraProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
