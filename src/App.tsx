import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import HomePage from './pages/HomePage';
import ProvincePage from './pages/ProvincePage';
import LoginPage from './pages/LoginPage';
import ContactPage from './pages/ContactPage';
import AuthCallback from './pages/AuthCallback';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SimplePasswordReset from './pages/SimplePasswordReset';

function App() {
  return (
    <Router
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <ThemeProvider>
        <AuthProvider>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200 flex flex-col">
            <Routes>
              {/* Public routes */}
              <Route path="/login" element={<LoginPage />} />
              <Route path="/reset-password" element={<ResetPasswordPage />} />
              <Route path="/auth/callback" element={<AuthCallback />} />
              
              {/* Protected routes */}
              <Route
                path="/*"
                element={
                  <ProtectedRoute>
                    <>
                      <Navbar />
                      <div className="flex-grow pt-16">
                        <Routes>
                          <Route path="/" element={<HomePage />} />
                          <Route path="/province/:id" element={<ProvincePage />} />
                          <Route path="/contact" element={<ContactPage />} />
                          {/* Catch-all route for unmatched paths */}
                          <Route path="*" element={<Navigate to="/" replace />} />
                        </Routes>
                      </div>
                      <Footer />
                    </>
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;