
import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from './components/ui/ToastProvider';
import ErrorBoundary from './components/ui/ErrorBoundary';

import DashboardLayout from './layouts/DashboardLayout';
import AuthPage from './pages/AuthPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import UpdatePasswordPage from './pages/UpdatePasswordPage';
import AuthCallback from './pages/AuthCallback';
import NotFound from './pages/NotFound';
import LinkEditor from './pages/Dashboard/LinkEditor';
import ProfileSettings from './components/ProfileSettings';
import PublicProfile from './pages/PublicProfile';

const queryClient = new QueryClient();

// Component to handle global auth events like password recovery
function AuthListener() {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log(`AuthListener: Auth State Data Changed: ${event}`, session);

      if (event === 'PASSWORD_RECOVERY') {
        console.log('AuthListener: Password recovery event detected, redirecting to update password page');
        // Force redirect to update password page, overriding any other redirects
        navigate('/auth/update-password', { replace: true });
      }

      if (event === 'SIGNED_IN') {
        console.log('App: User signed in', session?.user?.email);
      }
      if (event === 'SIGNED_OUT') {
        console.log('App: User signed out');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  return null;
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <BrowserRouter>
            <AuthListener />
            <Routes>
              {/* Auth */}
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/update-password" element={<UpdatePasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />

              {/* Dashboard */}
              <Route path="/dashboard" element={<DashboardLayout />}>
                <Route index element={<LinkEditor />} />
                <Route path="settings" element={<ProfileSettings />} />
              </Route>

              {/* Public Profile */}
              <Route path="/u/:username" element={<PublicProfile />} />

              {/* Redirects */}
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
