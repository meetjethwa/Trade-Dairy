import { Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import LandingPage from './pages/LandingPage';  // add this
import useAuthStore from './store/authStore';

const PrivateRoute = ({ children }) => {
  const token = useAuthStore((s) => s.token);
  return token ? children : <Navigate to="/login" />;
};

export default function App() {
  return (
    <Routes>
      <Route path="/"          element={<LandingPage />} />  {/* add this */}
      <Route path="/login"     element={<LoginPage />} />
      <Route path="/register"  element={<RegisterPage />} />
      <Route path="/dashboard" element={
        <PrivateRoute><DashboardPage /></PrivateRoute>
      }/>
      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}