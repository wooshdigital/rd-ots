import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  full_name: string;
  google_id: string;
  profile_picture: string;
  role: string;
  erpnext_employee_id: string | null;
  designation: string | null;
  reports_to: string | null;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (sessionToken: string) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Get session token from localStorage
  const getSessionToken = () => localStorage.getItem('session_token');

  // Set session token to localStorage
  const setSessionToken = (token: string) => localStorage.setItem('session_token', token);

  // Remove session token from localStorage
  const removeSessionToken = () => localStorage.removeItem('session_token');

  // Fetch current user from API
  const fetchUser = async (token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }

      const data = await response.json();
      if (data.success && data.user) {
        setUser(data.user);
        setIsAuthenticated(true);
        return data.user;
      } else {
        throw new Error('Invalid user data');
      }
    } catch (error) {
      console.error('Failed to fetch user:', error);
      removeSessionToken();
      setUser(null);
      setIsAuthenticated(false);
      return null;
    }
  };

  // Initialize auth state on mount
  useEffect(() => {
    const initAuth = async () => {
      // Check URL for session token (from OAuth redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const urlToken = urlParams.get('session_token');

      if (urlToken) {
        setSessionToken(urlToken);
        // Clean URL
        window.history.replaceState({}, document.title, window.location.pathname);
        await fetchUser(urlToken);
      } else {
        // Check localStorage for existing token
        const storedToken = getSessionToken();
        if (storedToken) {
          await fetchUser(storedToken);
        }
      }

      setIsLoading(false);
    };

    initAuth();
  }, []);

  // Login function (called after OAuth redirect)
  const login = (sessionToken: string) => {
    setSessionToken(sessionToken);
    fetchUser(sessionToken);
  };

  // Logout function
  const logout = async () => {
    const token = getSessionToken();

    if (token) {
      try {
        await fetch(`${API_BASE_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      } catch (error) {
        console.error('Logout error:', error);
      }
    }

    removeSessionToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  // Refresh user data
  const refreshUser = async () => {
    const token = getSessionToken();
    if (token) {
      await fetchUser(token);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated,
      isLoading,
      login,
      logout,
      refreshUser
    }}>
      {children}
    </AuthContext.Provider>
  );
}

// Custom hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
