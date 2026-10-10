import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router'
import { AuthProvider } from '@/app/AuthProvider.tsx'
import { LanguageProvider } from '@/app/LanguageProvider.tsx'
import {
  AccessDeniedRoute,
  LoginRoute,
  RequireAuth,
} from '@/app/RequireAuth.tsx'
import { useAuth } from '@/hooks/useAuth.ts'
import { useLanguage } from '@/hooks/useLanguage.ts'
import { GlobalError, GlobalLoading } from '@/layouts/AppState.tsx'
import { DashboardLayout } from '@/layouts/DashboardLayout.tsx'
import { ApplicationDetailPage } from '@/pages/ApplicationDetailPage.tsx'
import {
  ApplicationCreatePage,
  ApplicationEditPage,
} from '@/pages/ApplicationFormPage.tsx'
import { ApplicationsPage } from '@/pages/ApplicationsPage.tsx'
import { AssetToolPage } from '@/pages/AssetToolPage.tsx'
import { AssetsPage } from '@/pages/AssetsPage.tsx'
import { ChecklistsPage } from '@/pages/ChecklistsPage.tsx'
import { DashboardPage } from '@/pages/DashboardPage.tsx'
import { KnowledgeArticlePage } from '@/pages/KnowledgeArticlePage.tsx'
import {
  KnowledgeCreatePage,
  KnowledgeEditPage,
} from '@/pages/KnowledgeFormPage.tsx'
import { KnowledgePage } from '@/pages/KnowledgePage.tsx'
import { ReleasesPage } from '@/pages/ReleasesPage.tsx'
import { SettingsPage } from '@/pages/SettingsPage.tsx'

export function App(): ReactElement {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </BrowserRouter>
    </LanguageProvider>
  )
}

function AppRoutes(): ReactElement {
  const { status, configError } = useAuth()
  const { messages } = useLanguage()

  if (status === 'loading') {
    return <GlobalLoading />
  }

  if (status === 'error') {
    return (
      <GlobalError
        message={
          configError === 'missing-config'
            ? messages.auth.errors['missing-config']
            : messages.auth.startFailed
        }
      />
    )
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/access-denied" element={<AccessDeniedRoute />} />
      <Route element={<ProtectedShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="applications" element={<ApplicationsPage />} />
        <Route path="applications/new" element={<ApplicationCreatePage />} />
        <Route
          path="applications/:applicationId/edit"
          element={<ApplicationEditPage />}
        />
        <Route
          path="applications/:applicationId"
          element={<ApplicationDetailPage />}
        />
        <Route path="knowledge" element={<KnowledgePage />} />
        <Route path="knowledge/new" element={<KnowledgeCreatePage />} />
        <Route
          path="knowledge/:articleId/edit"
          element={<KnowledgeEditPage />}
        />
        <Route path="knowledge/:articleId" element={<KnowledgeArticlePage />} />
        <Route path="checklists" element={<ChecklistsPage />} />
        <Route path="assets" element={<AssetsPage />} />
        <Route path="assets/:toolId" element={<AssetToolPage />} />
        <Route path="releases" element={<ReleasesPage />} />
        <Route path="settings" element={<SettingsPage />} />
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
