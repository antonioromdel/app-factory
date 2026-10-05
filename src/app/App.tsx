import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/app/AuthProvider.tsx'
import {
  AccessDeniedRoute,
  LoginRoute,
  RequireAuth,
} from '@/app/RequireAuth.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { GlobalError, GlobalLoading } from '@/layouts/AppState.tsx'
import { DashboardLayout } from '@/layouts/DashboardLayout.tsx'
import { DashboardPage } from '@/pages/DashboardPage.tsx'
import { PlaceholderPage } from '@/pages/PlaceholderPage.tsx'

export function App(): ReactElement {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}

function AppRoutes(): ReactElement {
  const { status, configError } = useAuth()

  if (status === 'loading') {
    return <GlobalLoading />
  }

  if (status === 'error') {
    return (
      <GlobalError message={configError ?? 'Could not start authentication.'} />
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/access-denied" element={<AccessDeniedRoute />} />
      <Route element={<ProtectedShell />}>
        <Route index element={<DashboardPage />} />
        <Route
          path="applications"
          element={
            <PlaceholderPage
              title="No applications yet"
              description="This section will list and manage your Flutter projects."
            />
          }
        />
        <Route
          path="knowledge"
          element={
            <PlaceholderPage
              title="No articles yet"
              description="This section will hold your development notes."
            />
          }
        />
        <Route
          path="checklists"
          element={
            <PlaceholderPage
              title="No checklists yet"
              description="This section will track development and publishing tasks."
            />
          }
        />
        <Route
          path="assets"
          element={
            <PlaceholderPage
              title="No assets yet"
              description="This section will keep icons, screenshots and store images."
            />
          }
        />
        <Route
          path="releases"
          element={
            <PlaceholderPage
              title="No releases yet"
              description="This section will track versions and builds."
            />
          }
        />
        <Route
          path="settings"
          element={
            <PlaceholderPage
              title="No settings yet"
              description="Settings will live here."
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function ProtectedShell(): ReactElement {
  return (
    <RequireAuth>
      <DashboardLayout />
    </RequireAuth>
  )
}
