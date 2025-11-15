import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import History from '../History';

// Mock the file upload service
jest.mock('../../services/fileUploadService', () => ({
  uploadFile: jest.fn(() => Promise.resolve({ success: true, file: { id: '1', fileName: 'test.pdf' } })),
  getUserFiles: jest.fn(() => Promise.resolve({ success: true, files: [] })),
  deleteFile: jest.fn(() => Promise.resolve({ success: true })),
  getFileIcon: jest.fn(() => '📄'),
  downloadFileAsBlob: jest.fn(() => ({ success: true }))
}));

// Mock useAuth
const mockAuthContext = {
  user: { uid: 'test-user-id', email: 'test@example.com' },
  userData: { fullName: 'Test User' },
  isAuthenticated: true,
  loading: false
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext
}));

const TestWrapper = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider>
        {children}
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('History Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders history page with correct title', () => {
    render(
      <TestWrapper>
        <History />
      </TestWrapper>
    );

    expect(screen.getByText('History for Test User')).toBeInTheDocument();
    expect(screen.getByText('Manage your prescriptions, reports, and medical documents')).toBeInTheDocument();
  });

  test('renders upload button', () => {
    render(
      <TestWrapper>
        <History />
      </TestWrapper>
    );

    expect(screen.getByText('Add Prescription/Report')).toBeInTheDocument();
  });

  test('opens upload modal when upload button is clicked', async () => {
    render(
      <TestWrapper>
        <History />
      </TestWrapper>
    );

    const uploadButton = screen.getByText('Add Prescription/Report');
    fireEvent.click(uploadButton);

    await waitFor(() => {
      expect(screen.getByText('Upload Medical Files')).toBeInTheDocument();
      expect(screen.getByText('Uploaded By')).toBeInTheDocument();
      expect(screen.getByText('Document Type')).toBeInTheDocument();
      expect(screen.getByText('Doctor Name (Optional)')).toBeInTheDocument();
    });
  });

  test('renders filter options', () => {
    render(
      <TestWrapper>
        <History />
      </TestWrapper>
    );

    expect(screen.getByText('File Type:')).toBeInTheDocument();
    expect(screen.getByText('Document Type:')).toBeInTheDocument();
    expect(screen.getByText('Doctor:')).toBeInTheDocument();
    expect(screen.getByText('Date:')).toBeInTheDocument();
    expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
  });

  test('shows empty state when no files', () => {
    render(
      <TestWrapper>
        <History />
      </TestWrapper>
    );

    expect(screen.getByText('No documents uploaded yet')).toBeInTheDocument();
    expect(screen.getByText('Upload your first prescription or report to get started.')).toBeInTheDocument();
  });
});
