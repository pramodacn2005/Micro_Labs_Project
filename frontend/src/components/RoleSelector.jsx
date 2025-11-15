import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { getFirestore } from '../services/firebaseService';
import { useAuth } from '../contexts/AuthContext';

export default function RoleSelector({ onRoleSelected }) {
  const { user, refreshUserData } = useAuth();
  const [selectedRole, setSelectedRole] = useState('patient');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!user) return;

    setIsSaving(true);
    setError('');

    try {
      const firestore = getFirestore();
      await setDoc(
        doc(firestore, 'users', user.uid),
        { role: selectedRole },
        { merge: true }
      );

      // Refresh user data
      await refreshUserData();
      
      if (onRoleSelected) {
        onRoleSelected(selectedRole);
      }
    } catch (err) {
      console.error('Error saving role:', err);
      setError('Failed to save role. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Select Your Role</h2>
        <p className="text-sm text-gray-600 mb-6">
          Please select your role to access the appropriate features
        </p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        <div className="space-y-3 mb-6">
          <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
            <input
              type="radio"
              name="role"
              value="patient"
              checked={selectedRole === 'patient'}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <div className="ml-3">
              <div className="font-medium text-gray-900">Patient</div>
              <div className="text-sm text-gray-500">Book appointments, track health, view vitals</div>
            </div>
          </label>

          <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
            <input
              type="radio"
              name="role"
              value="doctor"
              checked={selectedRole === 'doctor'}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <div className="ml-3">
              <div className="font-medium text-gray-900">Doctor</div>
              <div className="text-sm text-gray-500">Manage appointments, view patient requests</div>
            </div>
          </label>

          <label className="flex items-center p-4 border-2 border-gray-200 rounded-lg cursor-pointer hover:border-primary-300 transition-colors">
            <input
              type="radio"
              name="role"
              value="admin"
              checked={selectedRole === 'admin'}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-4 h-4 text-primary-600 focus:ring-primary-500"
            />
            <div className="ml-3">
              <div className="font-medium text-gray-900">Admin</div>
              <div className="text-sm text-gray-500">Manage doctors, view all appointments, analytics</div>
            </div>
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-primary-600 text-white py-2.5 rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSaving ? 'Saving...' : 'Continue'}
        </button>
      </div>
    </div>
  );
}

