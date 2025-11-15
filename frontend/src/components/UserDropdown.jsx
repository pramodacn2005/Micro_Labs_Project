import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { logout } from '../services/firebaseService';
import { useNavigate } from 'react-router-dom';

export default function UserDropdown({ isCollapsed = false }) {
  const { user, userData, isAuthenticated } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getUserDisplayName = () => {
    return userData?.fullName || user?.displayName || 'User';
  };

  const getUserEmail = () => {
    return user?.email || '';
  };

  const getUserName = () => {
    // If we have a full name, extract first name, otherwise use display name
    const fullName = userData?.fullName || user?.displayName;
    if (fullName) {
      return fullName.split(' ')[0];
    }
    return 'User';
  };

  if (!isAuthenticated) {
    return (
      <button
        onClick={() => navigate('/login')}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 transition-colors ${isCollapsed ? "justify-center" : ""}`}
      >
        <span className="text-lg">🔑</span>
        {!isCollapsed && <span>Sign In</span>}
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* User Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 transition-colors ${isCollapsed ? "justify-center" : ""}`}
      >
        {/* Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 text-xs font-medium text-primary-700">
          {getInitials(getUserDisplayName())}
        </div>
        
        {/* User Info - Hidden when collapsed or on mobile */}
        {!isCollapsed && (
          <div className="hidden sm:block text-left flex-1">
            <div className="text-sm font-medium text-gray-900 truncate max-w-32">
              {getUserName()}
            </div>
            <div className="text-xs text-gray-500 truncate max-w-32">
              {getUserEmail()}
            </div>
          </div>
        )}
        
        {/* Dropdown Arrow - Hidden when collapsed */}
        {!isCollapsed && (
          <svg
            className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className={`absolute mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50 ${
          isCollapsed ? 'left-full ml-2' : 'right-0'
        } w-56 sm:w-64`}>
          {/* User Info Section */}
          <div className="px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary-100 text-sm font-medium text-primary-700">
                {getInitials(getUserDisplayName())}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-gray-900 truncate">
                  {getUserDisplayName()}
                </div>
                <div className="text-xs text-gray-500 truncate">
                  {getUserEmail()}
                </div>
                {userData?.username && (
                  <div className="text-xs text-gray-400 truncate">
                    @{userData.username}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100 my-2"></div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 transition-colors"
          >
            <span className="text-lg">🚪</span>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}
