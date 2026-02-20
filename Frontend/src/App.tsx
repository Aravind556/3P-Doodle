import { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Loading } from './components/Loading';

// Lazy load pages for better initial load performance
const LandingPage = lazy(() => import('./pages/LandingPage').then(module => ({ default: module.LandingPage })));
const AuthSuccess = lazy(() => import('./pages/AuthSuccess').then(module => ({ default: module.AuthSuccess })));
const OptionScreen = lazy(() => import('./pages/OptionScreen').then(module => ({ default: module.OptionScreen })));

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { user, loading } = useAuth();
  if (loading) return <Loading />;
  if (!user) return <Navigate to="/" />;
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route
              path="/Home"
              element={
                <ProtectedRoute>
                  <AuthSuccess />
                </ProtectedRoute>
              }
            />
            <Route
              path="/options"
              element={
                <ProtectedRoute>
                  <OptionScreen />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;
