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
import CanvaEmbed from './components/CanvaEmbed.jsx'

export default function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="app-shell">
      <main>
        <Routes>
          <Route path="/" element={<div className="landing-page"><CanvaEmbed src="https://www.canva.com/design/DAG1pmcHjkM/XKMk2Tut5p4AqFeRkChhLQ/view?embed
" title="Marketing Landing" /></div>} />
          <Route path="/login" element={<Login />} />
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
            path="/*"
            element={
              user ? (
                <Navigate to={user.role === 'Supervisor' ? '/supervisor' : '/cs'} replace />
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Routes>
      </main>
    </div>
  );
}
