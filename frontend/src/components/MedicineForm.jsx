import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { addMedicine } from '../services/medicineService';

export default function MedicineForm({ onMedicineAdded }) {
  const { user, userData } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    medicineName: '',
    dosage: '',
    scheduledTime: '',
    foodTiming: 'after', // 'before' or 'after'
    maxDelayMinutes: 30,
    instructions: '',
    frequency: 'daily' // 'daily', 'weekly', 'custom'
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.medicineName.trim()) {
      newErrors.medicineName = 'Medicine name is required';
    }

    if (!formData.dosage.trim()) {
      newErrors.dosage = 'Dosage is required';
    }

    if (!formData.scheduledTime) {
      newErrors.scheduledTime = 'Scheduled time is required';
    }

    if (formData.maxDelayMinutes < 0) {
      newErrors.maxDelayMinutes = 'Delay time cannot be negative';
    }

    if (formData.maxDelayMinutes > 1440) {
      newErrors.maxDelayMinutes = 'Delay time cannot exceed 24 hours';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const medicineData = {
        ...formData,
        userId: user.uid,
        patientName: userData?.fullName || user?.displayName || 'Patient',
        scheduledTime: new Date(formData.scheduledTime).toISOString(),
        createdAt: new Date().toISOString()
      };

      await addMedicine(medicineData);
      
      // Reset form
      setFormData({
        medicineName: '',
        dosage: '',
        scheduledTime: '',
        foodTiming: 'after',
        maxDelayMinutes: 30,
        instructions: '',
        frequency: 'daily'
      });

      onMedicineAdded?.();
    } catch (error) {
      console.error('Error adding medicine:', error);
      setErrors({ submit: 'Failed to add medicine. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Add New Medicine</h2>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Medicine Name */}
          <div>
            <label htmlFor="medicineName" className="block text-sm font-medium text-gray-700 mb-2">
              Medicine Name *
            </label>
            <input
              type="text"
              id="medicineName"
              name="medicineName"
              value={formData.medicineName}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.medicineName ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., Metformin, Aspirin, Vitamin D"
            />
            {errors.medicineName && (
              <p className="mt-1 text-sm text-red-600">{errors.medicineName}</p>
            )}
          </div>

          {/* Dosage */}
          <div>
            <label htmlFor="dosage" className="block text-sm font-medium text-gray-700 mb-2">
              Dosage *
            </label>
            <input
              type="text"
              id="dosage"
              name="dosage"
              value={formData.dosage}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.dosage ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="e.g., 500mg, 2 tablets, 1 capsule"
            />
            {errors.dosage && (
              <p className="mt-1 text-sm text-red-600">{errors.dosage}</p>
            )}
          </div>

          {/* Scheduled Time */}
          <div>
            <label htmlFor="scheduledTime" className="block text-sm font-medium text-gray-700 mb-2">
              Scheduled Time *
            </label>
            <input
              type="datetime-local"
              id="scheduledTime"
              name="scheduledTime"
              value={formData.scheduledTime}
              onChange={handleInputChange}
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.scheduledTime ? 'border-red-500' : 'border-gray-300'
              }`}
            />
            {errors.scheduledTime && (
              <p className="mt-1 text-sm text-red-600">{errors.scheduledTime}</p>
            )}
          </div>

          {/* Food Timing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Food Timing *
            </label>
            <div className="flex space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  name="foodTiming"
                  value="before"
                  checked={formData.foodTiming === 'before'}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                Before Food
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="foodTiming"
                  value="after"
                  checked={formData.foodTiming === 'after'}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                After Food
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  name="foodTiming"
                  value="with"
                  checked={formData.foodTiming === 'with'}
                  onChange={handleInputChange}
                  className="mr-2"
                />
                With Food
              </label>
            </div>
          </div>

          {/* Max Delay Time */}
          <div>
            <label htmlFor="maxDelayMinutes" className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Allowed Delay (minutes) *
            </label>
            <input
              type="number"
              id="maxDelayMinutes"
              name="maxDelayMinutes"
              value={formData.maxDelayMinutes}
              onChange={handleInputChange}
              min="0"
              max="1440"
              className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                errors.maxDelayMinutes ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="30"
            />
            <p className="mt-1 text-sm text-gray-500">
              How long after the scheduled time should we wait before sending an alert?
            </p>
            {errors.maxDelayMinutes && (
              <p className="mt-1 text-sm text-red-600">{errors.maxDelayMinutes}</p>
            )}
          </div>

          {/* Frequency */}
          <div>
            <label htmlFor="frequency" className="block text-sm font-medium text-gray-700 mb-2">
              Frequency
            </label>
            <select
              id="frequency"
              name="frequency"
              value={formData.frequency}
              onChange={handleInputChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="custom">Custom</option>
            </select>
          </div>

          {/* Instructions */}
          <div>
            <label htmlFor="instructions" className="block text-sm font-medium text-gray-700 mb-2">
              Additional Instructions
            </label>
            <textarea
              id="instructions"
              name="instructions"
              value={formData.instructions}
              onChange={handleInputChange}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              placeholder="Any special instructions for taking this medicine..."
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => onMedicineAdded?.()}
              className="px-4 py-2 text-gray-700 bg-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Adding...' : 'Add Medicine'}
            </button>
          </div>

          {errors.submit && (
            <p className="text-sm text-red-600 text-center">{errors.submit}</p>
          )}
        </form>
      </div>
    </div>
  );
}

