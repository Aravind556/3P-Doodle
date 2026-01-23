import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AuthSuccess } from './pages/AuthSuccess';
import { OptionScreen } from './pages/OptionScreen';
import { AuthProvider, useAuth } from './context/AuthContext';

import { Loading } from './components/Loading';

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
      </Router>
    </AuthProvider>
  );
}

export default App;
