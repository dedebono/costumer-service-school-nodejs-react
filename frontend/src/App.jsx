import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './context/AuthContext.jsx';
import Protected from './components/Protected.jsx';
import Supervisor from './pages/Supervisor.jsx';
import CustomerService from './pages/CustomerService.jsx';
import Login from './features/auth/login.jsx';


export default function App() {
const { user, loading } = useAuth();
if (loading) return <div>Loading...</div>;
return (
<Routes>
<Route path="/" element={!user ? <Login /> : <Navigate to={user.role === 'Supervisor' ? '/supervisor' : '/cs'} replace />} />
<Route
path="/supervisor/*"
element={
<Protected roles={["Supervisor"]}>
<Supervisor />
</Protected>
}
/>
<Route
path="/cs/*"
element={
<Protected roles={["CustomerService", "Supervisor"]}>
<CustomerService />
</Protected>
}
/>
<Route path="*" element={<Navigate to="/" replace />} />
</Routes>
);
}