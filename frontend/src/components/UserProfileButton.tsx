import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function UserProfileButton() {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset image error when user changes
  useEffect(() => {
    setImageError(false);
  }, [user?.profile_picture]);

  if (!user) {
    return null;
  }

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  // Get initials for fallback avatar
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const showFallback = !user.profile_picture || imageError;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-3 bg-card border border-border p-2 rounded-lg hover:bg-accent transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <div className="flex items-center space-x-2">
          {/* Profile Picture or Fallback Avatar */}
          {showFallback ? (
            <div className="w-8 h-8 bg-gradient-to-br from-red-500 to-red-600 rounded-full flex items-center justify-center flex-shrink-0">
              <span className="text-white text-sm font-semibold">
                {getInitials(user.full_name)}
              </span>
            </div>
          ) : (
            <img
              src={user.profile_picture}
              alt={user.full_name}
              className="w-8 h-8 rounded-full border-2 border-border object-cover flex-shrink-0"
              onError={() => setImageError(true)}
            />
          )}

          {/* User Info */}
          <div className="text-left">
            <div className="font-medium text-sm text-foreground">
              {user.full_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.email}
            </div>
          </div>
        </div>

        {/* Dropdown Icon */}
        <svg
          className={`w-4 h-4 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-48 bg-card rounded-md shadow-lg py-1 z-50 border border-border"
          style={{
            animation: 'fadeIn 0.1s ease-out'
          }}
        >
          {/* User Info Section */}
          <div className="px-4 py-2 border-b border-border">
            <div className="text-sm font-medium text-foreground">
              {user.full_name}
            </div>
            <div className="text-xs text-muted-foreground">
              {user.email}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              {user.designation || user.role}
            </div>
          </div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
          >
            <svg
              className="w-4 h-4 mr-3 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            Logout
          </button>
        </div>
      )}

      {/* CSS for fade-in animation */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: scale(0.95);
          }
          to {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
