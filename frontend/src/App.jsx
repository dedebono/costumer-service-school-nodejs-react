import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Protected from './components/Protected.jsx';
import Supervisor from './pages/Supervisor.jsx';
import CustomerService from './pages/CustomerService.jsx';
import Login from './features/auth/login.jsx';
import Kiosk from './pages/Kiosk.jsx';
import OptionKiosk from './pages/OptionKiosk.jsx';
import FormKiosk from './pages/FormKiosk.jsx';
import QueueKiosk from './pages/QueueKiosk.jsx';
import LandingPage from './pages/LandingPage.jsx';
import ParentUpload from './pages/ParentUpload.jsx';
import StudentDataView from './pages/StudentDataView.jsx';

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app-shell">
      <main>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />

          {/* Public parent upload page (token-based access) */}
          <Route path="/parent-upload/:token" element={<ParentUpload />} />

          {/* Protected student data view for admin */}
          <Route
            path="/datasiswa/:applicantId"
            element={
              <Protected roles={['ADMIN', 'Supervisor', 'CustomerService']}>
                <StudentDataView />
              </Protected>
            }
          />

          <Route
            path="/supervisor/*"
            element={
              <Protected roles={['Supervisor']}>
                <Supervisor />
              </Protected>
            }
          />
          <Route
            path="/cs/*"
            element={
              <Protected roles={['CustomerService', 'Supervisor']}>
                <CustomerService />
              </Protected>
            }
          />
          <Route path="/kiosk" element={<Kiosk />}>
            <Route index element={<OptionKiosk />} />
            <Route path="form" element={<FormKiosk />} />
            <Route path="queue" element={<QueueKiosk />} />
          </Route>
          <Route
            path="*"
            element={
              user ? (
                <Navigate to={user.role === 'Supervisor' ? '/supervisor' : '/cs'} replace />
              ) : (
                <Navigate to="/" replace />
              )
            }
          />
        </Routes>
      </main>
    </div>
  );
}

