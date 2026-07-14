import { Navigate, Outlet } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

export function ProtectedRoute() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated());

  const user = useAuthStore((state) => state.user);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Handle default routes based on role
  if (user?.role === 'SUPERADMIN' && (window.location.pathname === '/' || window.location.pathname === '/orders')) {
    return <Navigate to="/tenants" replace />;
  }

  return <Outlet />;
}
