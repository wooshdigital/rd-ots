import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import OvertimeRequestForm from './components/OvertimeRequestForm';
import AdminDashboard from './pages/AdminDashboard';
import ThemeToggle from './components/ThemeToggle';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background transition-colors duration-300">
        {/* Navigation */}
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
                <Link
                  to="/admin"
                  className="text-foreground hover:text-secondary px-3 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  Admin Dashboard
                </Link>
                <ThemeToggle />
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <div className="py-12 px-4 sm:px-6 lg:px-8">
          <Routes>
            <Route
              path="/"
              element={
                <div className="max-w-4xl mx-auto">
                  <div className="text-center mb-8">
                    <h1 className="text-4xl font-bold text-foreground mb-2">
                      Rooche Digital
                    </h1>
                    <p className="text-lg text-muted-foreground">
                      Overtime & Undertime Management System
                    </p>
                  </div>
                  <OvertimeRequestForm />
                </div>
              }
            />
            <Route path="/admin" element={<AdminDashboard />} />
          </Routes>
        </div>

        {/* Footer */}
        <footer className="mt-12 pb-8 text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Rooche Digital. All rights reserved.</p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
