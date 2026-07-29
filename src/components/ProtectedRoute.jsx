// @ts-nocheck
// // ProtectedRoute.jsx - Fixed version
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';

const ProtectedRoute = ({ unauthenticatedElement }) => {
  const { isAuthenticated, isLoadingAuth } = useAuth();

  // Show loading while checking authentication
  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // If not authenticated, redirect to login or show custom element
  if (!isAuthenticated) {
    // If a custom element is provided, render it
    if (unauthenticatedElement) {
      return unauthenticatedElement;
    }
    // Otherwise redirect to login
    return <Navigate to="/login" replace />;
  }

  // Render child routes
  return <Outlet />;
};

export default ProtectedRoute;