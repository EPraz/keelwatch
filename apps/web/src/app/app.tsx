import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppErrorBoundary } from './app-error-boundary';
import { ProtectedRoute } from './protected-route';
import { ComplianceQueuePage } from '../features/compliance/compliance-queue-page';
import { CrewPage } from '../features/crew/crew-page';
import { CrewDetailPage } from '../features/crew/crew-detail-page';
import { FleetPage } from '../features/fleet/fleet-page';
import { VesselCreatePage } from '../features/fleet/vessel-create-page';
import { VesselDetailPage } from '../features/fleet/vessel-detail-page';
import { VesselEditPage } from '../features/fleet/vessel-edit-page';
import { MaintenanceDetailPage } from '../features/maintenance/maintenance-detail-page';
import { AuthCallbackPage } from '../pages/auth-callback-page';
import { AppShellPage } from '../pages/app-shell-page';
import { NotFoundPage } from '../pages/not-found-page';
import { OverviewPage } from '../pages/overview-page';
import { SignInPage } from '../pages/sign-in-page';

export function App() {
  return (
    <AppErrorBoundary>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/sign-in" element={<SignInPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/app" element={<AppShellPage />}>
              <Route index element={<OverviewPage />} />
              <Route path="compliance" element={<ComplianceQueuePage />} />
              <Route path="crew" element={<CrewPage />} />
              <Route path="crew/:crewMemberId" element={<CrewDetailPage />} />
              <Route path="vessels" element={<FleetPage />} />
              <Route path="vessels/new" element={<VesselCreatePage />} />
              <Route path="vessels/:vesselId" element={<VesselDetailPage />} />
              <Route path="vessels/:vesselId/edit" element={<VesselEditPage />} />
              <Route
                path="vessels/:vesselId/maintenance/:orderId"
                element={<MaintenanceDetailPage />}
              />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </AppErrorBoundary>
  );
}
