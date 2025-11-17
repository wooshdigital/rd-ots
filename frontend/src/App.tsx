import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import OvertimeRequestForm from './components/OvertimeRequestForm';
import AdminDashboard from './pages/AdminDashboard';
import Login from './pages/Login';
import ThemeToggle from './components/ThemeToggle';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfileButton from './components/UserProfileButton';
import { AuthProvider, useAuth } from './contexts/AuthContext';

function AppContent() {
  const { isAuthenticated, user } = useAuth();

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Navigation */}
      {isAuthenticated && (
        <nav className="bg-card shadow-sm border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center">
                <Link to="/" className="text-xl font-bold text-primary hover:text-secondary transition-colors">
                  Rooche Digital OT/UT System
                </Link>
              </div>
              <div className="flex items-center gap-4">
                <Link
                  to="/"
                  className="text-foreground hover:text-secondary px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Submit Request
                </Link>
                {(user?.role === 'Owner' || user?.role === 'HR' || user?.role === 'Project Coordinator') && (
                  <Link
                    to="/admin"
                    className="text-foreground hover:text-secondary px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Admin Dashboard
                  </Link>
                )}
                <ThemeToggle />
                <UserProfileButton />
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* Main Content */}
      <div>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <div className="max-w-4xl mx-auto">
                  <OvertimeRequestForm />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin"
            element={
              <ProtectedRoute requireRole={['Owner', 'HR', 'Project Coordinator']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
        </Routes>
      </div>

      {/* Footer */}
      {isAuthenticated && (
        <footer className="mt-12 pb-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Rooche Digital. All rights reserved.</p>
        </footer>
      )}
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
