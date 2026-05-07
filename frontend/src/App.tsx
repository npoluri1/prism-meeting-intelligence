import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthGuard } from './components/AuthGuard'
import { AuthCallbackPage } from './pages/AuthCallbackPage'
import { CalendarPage } from './pages/CalendarPage'
import { DashboardPage } from './pages/DashboardPage'
import { LoginPage } from './pages/LoginPage'
import { NewMeetingPage } from './pages/NewMeetingPage'
import { NotesPage } from './pages/NotesPage'
import { OrgMembersPage } from './pages/OrgMembersPage'
import { OrgSettingsPage } from './pages/OrgSettingsPage'

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login"         element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />

        <Route path="/dashboard"      element={<AuthGuard><DashboardPage /></AuthGuard>} />
        <Route path="/calendar"       element={<AuthGuard><CalendarPage /></AuthGuard>} />
        <Route path="/meetings/new"   element={<AuthGuard><NewMeetingPage /></AuthGuard>} />
        <Route path="/meetings/:id"   element={<AuthGuard><NotesPage /></AuthGuard>} />

        <Route path="/org/:orgId/members"  element={<AuthGuard><OrgMembersPage /></AuthGuard>} />
        <Route path="/org/:orgId/settings" element={<AuthGuard><OrgSettingsPage /></AuthGuard>} />

        <Route path="/"  element={<Navigate to="/dashboard" replace />} />
        <Route path="*"  element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
