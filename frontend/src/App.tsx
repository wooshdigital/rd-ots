import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import OvertimeRequestForm from './components/OvertimeRequestForm';
import AdminDashboard from './pages/AdminDashboard';
import MyRequests from './pages/MyRequests';
import Login from './pages/Login';
import ThemeToggle from './components/ThemeToggle';
import ProtectedRoute from './components/ProtectedRoute';
import UserProfileButton from './components/UserProfileButton';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { PlusCircle, FileText, LayoutDashboard, Menu, X } from 'lucide-react';

function AppContent() {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Close mobile menu when route changes
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Navigation */}
      {isAuthenticated && (
        <nav className="bg-card shadow-sm border-b border-border sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Logo/Brand */}
              <div className="flex items-center">
                <Link
                  to="/"
                  className="text-base sm:text-xl font-bold text-primary hover:text-secondary transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <span className="hidden sm:inline">Rooche Digital OT/UT System</span>
                  <span className="sm:hidden">RD OT/UT</span>
                </Link>
              </div>

              {/* Desktop Navigation */}
              <div className="hidden md:flex items-center gap-2">
                {/* Tab Navigation */}
                <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-1 mr-4">
                  <Link
                    to="/"
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      location.pathname === '/'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Submit Request
                  </Link>
                  <Link
                    to="/my-requests"
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      location.pathname === '/my-requests'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    My Requests
                  </Link>
                  {(user?.role === 'Owner' || user?.role === 'HR' || user?.role === 'Project Coordinator') && (
                    <Link
                      to="/admin"
                      className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
                        location.pathname === '/admin'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}
                </div>
                <ThemeToggle />
                <UserProfileButton />
              </div>

              {/* Mobile Menu Button and Icons */}
              <div className="flex md:hidden items-center gap-2">
                <ThemeToggle />
                <UserProfileButton />
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  aria-label="Toggle menu"
                >
                  {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden pb-4 pt-2 border-t border-border mt-2">
                <div className="flex flex-col gap-2">
                  <Link
                    to="/"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                      location.pathname === '/'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <PlusCircle className="w-4 h-4" />
                    Submit Request
                  </Link>
                  <Link
                    to="/my-requests"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                      location.pathname === '/my-requests'
                        ? 'bg-primary text-primary-foreground shadow-sm'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    My Requests
                  </Link>
                  {(user?.role === 'Owner' || user?.role === 'HR' || user?.role === 'Project Coordinator') && (
                    <Link
                      to="/admin"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-2 px-4 py-3 rounded-md text-sm font-medium transition-all ${
                        location.pathname === '/admin'
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                      }`}
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Admin Dashboard
                    </Link>
                  )}
                </div>
              </div>
            )}
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
                <div className="max-w-4xl mx-auto mt-5">
                  <OvertimeRequestForm />
                </div>
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-requests"
            element={
              <ProtectedRoute>
                <MyRequests />
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
