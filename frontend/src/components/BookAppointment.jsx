import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowUpIcon,
  XMarkIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { 
  getDoctorById, 
  getDoctorSlots, 
  createAppointment 
} from '../services/appointmentService';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile } from '../services/fileUploadService';

const REASONS = [
  'Fever symptoms',
  'High fever emergency',
  'Persistent fever',
  'Fever with other symptoms',
  'Follow-up consultation',
  'Other'
];

export default function BookAppointment({ doctorId: initialDoctorId = null }) {
  const { user } = useAuth();
  const [doctor, setDoctor] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState('');
  const [reason, setReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [medicalFiles, setMedicalFiles] = useState([]);
  const [uploadingFiles, setUploadingFiles] = useState(false);
  const [fileError, setFileError] = useState('');

  // Get doctorId from navigation event or sessionStorage if not provided
  useEffect(() => {
    // Check sessionStorage first
    const storedDoctorId = sessionStorage.getItem('selectedDoctorId');
    if (storedDoctorId) {
      setDoctorId(storedDoctorId);
      sessionStorage.removeItem('selectedDoctorId');
    }

    const handleNavigate = (event) => {
      if (event.detail && event.detail.doctorId) {
        setDoctorId(event.detail.doctorId);
      }
    };
    window.addEventListener('navigate', handleNavigate);
    return () => window.removeEventListener('navigate', handleNavigate);
  }, []);

  useEffect(() => {
    if (doctorId) {
      loadDoctor();
    }
  }, [doctorId]);

  useEffect(() => {
    if (doctorId && selectedDate) {
      loadAvailableSlots();
    }
  }, [doctorId, selectedDate]);

  const loadDoctor = async () => {
    try {
      setLoading(true);
      const response = await getDoctorById(doctorId);
      if (response.success) {
        setDoctor(response.doctor);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableSlots = async () => {
    try {
      setLoadingSlots(true);
      setAvailableSlots([]);
      setSelectedSlot('');
      const response = await getDoctorSlots(doctorId, selectedDate);
      if (response.success) {
        setAvailableSlots(response.slots || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingSlots(false);
    }
  };

  const handleCallDoctor = (phoneNumber) => {
    if (phoneNumber) {
      // Remove any non-digit characters except + for international numbers
      const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setFileError('');
    setUploadingFiles(true);

    try {
      const validFiles = files.filter(file => {
        const isValidType = file.type === 'application/pdf' || 
                           file.type === 'image/jpeg' || 
                           file.type === 'image/jpg' || 
                           file.type === 'image/png';
        const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB

        if (!isValidType) {
          setFileError(`File ${file.name} is not a valid format. Please upload PDF, JPG, or PNG only.`);
          return false;
        }
        if (!isValidSize) {
          setFileError(`File ${file.name} is too large. Maximum size is 10MB.`);
          return false;
        }
        return true;
      });

      if (validFiles.length === 0) {
        setUploadingFiles(false);
        return;
      }

      const uploadedFiles = [];
      for (const file of validFiles) {
        const result = await uploadFile(file, user?.uid || 'patient', {
          documentType: 'medical-report',
          description: `Medical report for appointment with ${doctor?.name || 'doctor'}`,
          patientName: user?.displayName || 'Patient',
          uploadedBy: 'Patient'
        });

        if (result.success) {
          uploadedFiles.push(result.file);
        }
      }

      if (uploadedFiles.length > 0) {
        setMedicalFiles(prev => [...prev, ...uploadedFiles]);
        setFileError('');
      }
    } catch (err) {
      setFileError(err.message || 'Failed to upload files. Please try again.');
    } finally {
      setUploadingFiles(false);
    }
  };

  const removeFile = (fileId) => {
    setMedicalFiles(prev => prev.filter(file => file.id !== fileId));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!doctorId || !selectedDate || !selectedSlot) {
      setError('Please select a doctor, date, and time slot');
      return;
    }

    const finalReason = reason === 'Other' ? customReason : reason;
    if (!finalReason) {
      setError('Please provide a reason for the appointment');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const response = await createAppointment({
        doctor_id: doctorId,
        date: selectedDate,
        time_slot: selectedSlot,
        reason: finalReason,
        medical_reports: medicalFiles.map(f => f.id) // Attach file IDs
      });

      if (response.success) {
        setSuccess(true);
        // Reset form
        setSelectedDate('');
        setSelectedSlot('');
        setReason('');
        setCustomReason('');
        setMedicalFiles([]);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Get minimum date (today)
  const getMinDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get maximum date (30 days from now)
  const getMaxDate = () => {
    const maxDate = new Date();
    maxDate.setDate(maxDate.getDate() + 30);
    return maxDate.toISOString().split('T')[0];
  };

  if (!doctorId) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800">Please select a doctor first.</p>
        </div>
      </div>
    );
  }

  if (loading && !doctor) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading doctor information...</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-8 text-center">
          <CheckCircleIcon className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Appointment Booked!</h2>
          <p className="text-gray-600 mb-6">
            Your appointment request has been submitted. The doctor will review and confirm.
          </p>
          <button
            onClick={() => {
              setSuccess(false);
              window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'my-appointments' } }));
            }}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            View My Appointments
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Book Appointment</h1>
        <p className="text-gray-600">Schedule your appointment with a healthcare professional</p>
      </div>

      {/* Doctor Info Card */}
      {doctor && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {doctor.profile_photo_url ? (
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 overflow-hidden">
                  <img
                    src={doctor.profile_photo_url}
                    alt={doctor.name}
                    className="w-full h-full object-cover object-top"
                    style={{ 
                      background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
                    }}
                  />
                </div>
              ) : (
                <div className="w-16 h-16 rounded-full bg-primary-100 flex items-center justify-center">
                  <UserIcon className="w-8 h-8 text-primary-600" />
                </div>
              )}
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{doctor.name}</h2>
                <p className="text-primary-600 font-medium">{doctor.specialization}</p>
                {doctor.location?.city && (
                  <p className="text-sm text-gray-600">{doctor.location.city}</p>
                )}
                {doctor.phone && (
                  <p className="text-sm text-gray-600 mt-1">📞 {doctor.phone}</p>
                )}
              </div>
            </div>
            {doctor.phone && (
              <button
                onClick={() => handleCallDoctor(doctor.phone)}
                className="bg-green-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2 shadow-sm"
                title={`Call ${doctor.name}`}
              >
                <PhoneIcon className="w-5 h-5" />
                Call Doctor
              </button>
            )}
          </div>
        </div>
      )}

      {/* Booking Form */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2">
            <XCircleIcon className="w-5 h-5 text-red-600" />
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Date Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <CalendarIcon className="w-5 h-5 inline mr-2" />
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={getMinDate()}
            max={getMaxDate()}
            required
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>

        {/* Time Slot Selection */}
        {selectedDate && (
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <ClockIcon className="w-5 h-5 inline mr-2" />
              Select Time Slot
            </label>
            {loadingSlots ? (
              <div className="text-center py-4">
                <div className="inline-block animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                <p className="mt-2 text-sm text-gray-600">Loading available slots...</p>
              </div>
            ) : availableSlots.length === 0 ? (
              <p className="text-sm text-gray-500 py-4">No available slots for this date.</p>
            ) : (
              <div className="grid grid-cols-3 md:grid-cols-4 gap-3">
                {availableSlots.map((slot) => (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => setSelectedSlot(slot)}
                    className={`px-4 py-2 rounded-lg border-2 transition-colors ${
                      selectedSlot === slot
                        ? 'border-primary-600 bg-primary-50 text-primary-700 font-medium'
                        : 'border-gray-200 hover:border-primary-300 text-gray-700'
                    }`}
                  >
                    {slot}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Reason Selection */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Reason for Visit
          </label>
          <div className="space-y-2">
            {REASONS.map((r) => (
              <label
                key={r}
                className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-primary-300 cursor-pointer"
              >
                <input
                  type="radio"
                  name="reason"
                  value={r}
                  checked={reason === r}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-4 h-4 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{r}</span>
              </label>
            ))}
          </div>
          {reason === 'Other' && (
            <textarea
              value={customReason}
              onChange={(e) => setCustomReason(e.target.value)}
              placeholder="Please describe your reason..."
              rows={3}
              className="mt-3 w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          )}
        </div>

        {/* Medical Reports Upload */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            <DocumentArrowUpIcon className="w-5 h-5 inline mr-2" />
            Upload Previous Medical Report (Optional)
          </label>
          
          <div className="space-y-3">
            {/* Helper Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-900 mb-2">
                This report is only for your appointment and will be shared with the doctor during the consultation.
              </p>
              <p className="text-xs text-blue-800 mb-2 font-medium">
                It will <strong>NOT</strong> appear in the doctor details section or the admin's doctor profile area.
              </p>
              <ul className="text-xs text-blue-800 space-y-1 list-disc list-inside">
                <li>Optional upload</li>
                <li>Supported formats: PDF, JPG, PNG</li>
                <li>Max size: 10MB</li>
              </ul>
            </div>

            {/* File Input */}
            <div>
              <input
                type="file"
                id="medical-reports"
                accept=".pdf,.jpg,.jpeg,.png"
                multiple
                onChange={handleFileChange}
                disabled={uploadingFiles}
                className="hidden"
              />
              <label
                htmlFor="medical-reports"
                className={`inline-flex items-center gap-2 px-4 py-2 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  uploadingFiles
                    ? 'border-gray-300 bg-gray-50 cursor-not-allowed'
                    : 'border-primary-300 bg-primary-50 hover:border-primary-400 hover:bg-primary-100'
                }`}
              >
                <DocumentArrowUpIcon className="w-5 h-5 text-primary-600" />
                <span className="text-sm font-medium text-primary-700">
                  {uploadingFiles ? 'Uploading...' : 'Choose Files'}
                </span>
              </label>
              <p className="text-xs text-gray-500 mt-1">
                Report upload is only for your appointment. It will not show in the doctor profile section.
              </p>
            </div>

            {/* File Error */}
            {fileError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-xs text-red-800">{fileError}</p>
              </div>
            )}

            {/* Uploaded Files List */}
            {medicalFiles.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-700">Uploaded Files:</p>
                {medicalFiles.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 bg-gray-50 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <DocumentArrowUpIcon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                      <span className="text-sm text-gray-700 truncate">
                        {file.documentName || file.fileName}
                      </span>
                      <span className="text-xs text-gray-500">
                        ({file.fileSize || 'N/A'})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(file.id)}
                      className="ml-2 p-1 text-red-600 hover:text-red-700 hover:bg-red-50 rounded"
                    >
                      <XMarkIcon className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={loading || !selectedDate || !selectedSlot || !reason}
          className="w-full bg-primary-600 text-white py-3 rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Booking...' : 'Book Appointment'}
        </button>
      </form>
    </div>
  );
}

