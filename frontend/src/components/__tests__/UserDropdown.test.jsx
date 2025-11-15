import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import UserDropdown from '../UserDropdown';

// Mock the firebase service
jest.mock('../../services/firebaseService', () => ({
  logout: jest.fn(() => Promise.resolve({ success: true }))
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate
}));

const TestWrapper = ({ children, user = null, userData = null, isAuthenticated = false }) => {
  const mockAuthContext = {
    user,
    userData,
    isAuthenticated,
    loading: false
  };

  return (
    <BrowserRouter>
      <AuthContext.Provider value={mockAuthContext}>
        {children}
      </AuthContext.Provider>
    </BrowserRouter>
  );
};

describe('UserDropdown', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders Sign In button when not authenticated', () => {
    render(
      <TestWrapper isAuthenticated={false}>
        <UserDropdown />
      </TestWrapper>
    );

    expect(screen.getByText('Sign In')).toBeInTheDocument();
    expect(screen.getByText('🔑')).toBeInTheDocument();
  });

  test('renders user info when authenticated', () => {
    const mockUser = {
      email: 'test@example.com',
      displayName: 'John Doe'
    };

    const mockUserData = {
      fullName: 'John Doe',
      username: 'johndoe'
    };

    render(
      <TestWrapper 
        isAuthenticated={true} 
        user={mockUser} 
        userData={mockUserData}
      >
        <UserDropdown />
      </TestWrapper>
    );

    expect(screen.getByText('John')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });

  test('opens dropdown when clicked', async () => {
    const mockUser = {
      email: 'test@example.com',
      displayName: 'John Doe'
    };

    render(
      <TestWrapper 
        isAuthenticated={true} 
        user={mockUser}
      >
        <UserDropdown />
      </TestWrapper>
    );

    const userButton = screen.getByRole('button');
    fireEvent.click(userButton);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('test@example.com')).toBeInTheDocument();
      expect(screen.getByText('Logout')).toBeInTheDocument();
    });
  });

  test('calls logout and navigates to login when logout is clicked', async () => {
    const { logout } = require('../../services/firebaseService');
    const mockUser = {
      email: 'test@example.com',
      displayName: 'John Doe'
    };

    render(
      <TestWrapper 
        isAuthenticated={true} 
        user={mockUser}
      >
        <UserDropdown />
      </TestWrapper>
    );

    // Open dropdown
    const userButton = screen.getByRole('button');
    fireEvent.click(userButton);

    // Click logout
    await waitFor(() => {
      const logoutButton = screen.getByText('Logout');
      fireEvent.click(logoutButton);
    });

    expect(logout).toHaveBeenCalled();
    expect(mockNavigate).toHaveBeenCalledWith('/login');
  });
});
