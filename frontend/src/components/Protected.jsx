import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';


export default function Protected({ roles, children }) {
const { user } = useAuth();
const loc = useLocation();
if (!user) return <Navigate to="/" state={{ from: loc }} replace />;
if (roles && !roles.includes(user.role)) return <Navigate to="/" replace />;
return children;
}