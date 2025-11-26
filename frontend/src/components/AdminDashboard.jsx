import React, { useState, useEffect } from 'react';
import { 
  UserPlusIcon,
  PencilIcon,
  TrashIcon,
  ChartBarIcon,
  CalendarIcon,
  PhotoIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';
import { 
  getAllDoctors, 
  addDoctor, 
  updateDoctor, 
  deleteDoctor,
  getAllAppointments,
  getAnalytics
} from '../services/appointmentService';
import { useAuth } from '../contexts/AuthContext';
import { uploadFile } from '../services/fileUploadService';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('doctors');
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    try {
      setLoading(true);
      if (activeTab === 'doctors') {
        const response = await getAllDoctors();
        if (response.success) {
          setDoctors(response.doctors || []);
        }
      } else if (activeTab === 'appointments') {
        const response = await getAllAppointments();
        if (response.success) {
          setAppointments(response.appointments || []);
        }
      } else if (activeTab === 'analytics') {
        const response = await getAnalytics();
        if (response.success) {
          setAnalytics(response.analytics);
        }
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddDoctor = async (doctorData) => {
    try {
      // Validate email is present
      if (!doctorData.email || !doctorData.email.trim()) {
        setError('Email is required to add a doctor. This email links appointments to the doctor.');
        return;
      }
      
      const response = await addDoctor(doctorData);
      if (response.success) {
        setShowAddDoctorForm(false);
        setError(''); // Clear any previous errors
        loadData();
        // Show success message (you can add a toast notification here if needed)
        alert(`Doctor "${doctorData.name}" added successfully!\n\nImportant: The doctor must sign up with email: ${doctorData.email}`);
      } else {
        setError(response.error || 'Failed to add doctor');
      }
    } catch (err) {
      setError(err.message || 'Failed to add doctor. Please check that email is provided.');
    }
  };

  const handleUpdateDoctor = async (doctorData) => {
    try {
      if (!editingDoctor || !editingDoctor.doctor_id) {
        setError('No doctor selected for editing');
        return;
      }

      const response = await updateDoctor(editingDoctor.doctor_id, doctorData);
      if (response.success) {
        setEditingDoctor(null);
        setError('');
        loadData();
        alert(`Doctor "${doctorData.name}" updated successfully!`);
      } else {
        setError(response.error || 'Failed to update doctor');
      }
    } catch (err) {
      setError(err.message || 'Failed to update doctor');
    }
  };

  const handleDeleteDoctor = async (doctorId) => {
    if (!window.confirm('Are you sure you want to deactivate this doctor?')) {
      return;
    }
    try {
      const response = await deleteDoctor(doctorId);
      if (response.success) {
        loadData();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
        <p className="text-gray-600">Manage doctors, appointments, and view analytics</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex gap-2">
          {[
            { id: 'doctors', label: 'Doctors', icon: UserPlusIcon },
            { id: 'appointments', label: 'Appointments', icon: CalendarIcon },
            { id: 'analytics', label: 'Analytics', icon: ChartBarIcon }
          ].map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Icon className="w-5 h-5" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Doctors Tab */}
      {activeTab === 'doctors' && (
        <div>
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-gray-900">All Doctors</h2>
            <button
              onClick={() => setShowAddDoctorForm(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
            >
              <UserPlusIcon className="w-5 h-5" />
              Add Doctor
            </button>
          </div>

          {(showAddDoctorForm || editingDoctor) && (
            <AddDoctorForm
              editingDoctor={editingDoctor}
              onClose={() => {
                setShowAddDoctorForm(false);
                setEditingDoctor(null);
              }}
              onSave={editingDoctor ? handleUpdateDoctor : handleAddDoctor}
            />
          )}

          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {doctors.map((doctor) => (
                <div
                  key={doctor.doctor_id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                >
                  <h3 className="text-lg font-semibold text-gray-900 mb-1">{doctor.name}</h3>
                  <p className="text-sm text-primary-600 mb-4">{doctor.specialization}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditingDoctor(doctor)}
                      className="flex-1 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                    >
                      <PencilIcon className="w-4 h-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteDoctor(doctor.doctor_id)}
                      className="px-3 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Appointments Tab */}
      {activeTab === 'appointments' && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">All Appointments</h2>
          {loading ? (
            <div className="text-center py-12">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <div className="space-y-4">
              {appointments.map((apt) => (
                <div
                  key={apt.appointment_id}
                  className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold text-gray-900">
                        {apt.patient?.fullName || 'Patient'} with {apt.doctor?.name || 'Doctor'}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {apt.date} at {apt.time_slot}
                      </p>
                      <p className="text-sm text-gray-600">Status: {apt.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
            <p className="text-3xl font-bold text-primary-600">{analytics.total}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
            <p className="text-sm text-gray-600 mb-1">High Fever Triggered</p>
            <p className="text-3xl font-bold text-red-600">{analytics.highFeverTriggered}</p>
          </div>
          {/* Add more analytics cards as needed */}
        </div>
      )}
    </div>
  );
}

// Add Doctor Form Component
function AddDoctorForm({ editingDoctor, onClose, onSave }) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    name: editingDoctor?.name || '',
    email: editingDoctor?.email || '',
    phone: editingDoctor?.phone || '',
    specialization: editingDoctor?.specialization || '',
    experience_years: editingDoctor?.experience_years || '',
    qualifications: editingDoctor?.qualifications?.join(', ') || '',
    about: editingDoctor?.about || '',
    location: editingDoctor?.location || '',
    consultation_fee: editingDoctor?.consultation_fee || '',
    availability_status: editingDoctor?.availability_status || 'Available',
    profile_photo_url: editingDoctor?.profile_photo_url || '',
    working_hours: editingDoctor?.working_hours || {}
  });
  const [errors, setErrors] = useState({});
  const [photoPreview, setPhotoPreview] = useState(editingDoctor?.profile_photo_url || null);
  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Update form data when editingDoctor changes
  useEffect(() => {
    if (editingDoctor) {
      setFormData({
        name: editingDoctor.name || '',
        email: editingDoctor.email || '',
        phone: editingDoctor.phone || '',
        specialization: editingDoctor.specialization || '',
        experience_years: editingDoctor.experience_years || '',
        qualifications: Array.isArray(editingDoctor.qualifications) 
          ? editingDoctor.qualifications.join(', ') 
          : (editingDoctor.qualifications || ''),
        about: editingDoctor.about || '',
        location: editingDoctor.location || '',
        consultation_fee: editingDoctor.consultation_fee || '',
        availability_status: editingDoctor.availability_status || 'Available',
        profile_photo_url: editingDoctor.profile_photo_url || '',
        working_hours: editingDoctor.working_hours || {}
      });
      if (editingDoctor.profile_photo_url) {
        setPhotoPreview(editingDoctor.profile_photo_url);
      }
    } else {
      // Reset form when not editing
      setFormData({
        name: '',
        email: '',
        phone: '',
        specialization: '',
        experience_years: '',
        qualifications: '',
        about: '',
        location: '',
        consultation_fee: '',
        availability_status: 'Available',
        profile_photo_url: '',
        working_hours: {}
      });
      setPhotoPreview(null);
      setPhotoFile(null);
    }
  }, [editingDoctor]);

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type (PNG preferred, JPG/JPEG accepted)
    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setErrors(prev => ({ ...prev, photo: 'Please select a PNG or JPG image file' }));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors(prev => ({ ...prev, photo: 'Image size must be less than 5MB' }));
      return;
    }

    // Validate aspect ratio (prefer portrait, reject very wide/square)
    const img = new Image();
    const objectUrl = URL.createObjectURL(file);
    
    img.onload = () => {
      const aspectRatio = img.width / img.height;
      
      // Reject very wide images (landscape)
      if (aspectRatio > 1.2) {
        setErrors(prev => ({ 
          ...prev, 
          photo: 'Please use a portrait photo (height > width). Wide/landscape images are not recommended.' 
        }));
        URL.revokeObjectURL(objectUrl);
        return;
      }
      
      // Warn about square images (not preferred but allow)
      if (aspectRatio > 0.9 && aspectRatio < 1.1) {
        console.warn('Square image detected. Portrait photos are recommended.');
      }
      
      // Ideal aspect ratios: 4:5 (0.8), 3:4 (0.75), etc.
      // Accept anything between 0.6 and 1.2 (portrait to slightly square)
      if (aspectRatio < 0.6) {
        setErrors(prev => ({ 
          ...prev, 
          photo: 'Image is too tall. Please use a portrait photo with aspect ratio between 0.6 and 1.2.' 
        }));
        URL.revokeObjectURL(objectUrl);
        return;
      }
      
      // Validation passed
      setPhotoFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result);
        URL.revokeObjectURL(objectUrl);
      };
      reader.readAsDataURL(file);
      
      // Clear error
      if (errors.photo) {
        setErrors(prev => {
          const newErrors = { ...prev };
          delete newErrors.photo;
          return newErrors;
        });
      }
    };
    
    img.onerror = () => {
      setErrors(prev => ({ ...prev, photo: 'Failed to load image. Please try another file.' }));
      URL.revokeObjectURL(objectUrl);
    };
    
    img.src = objectUrl;
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
    setFormData(prev => ({ ...prev, profile_photo_url: '' }));
  };

  const uploadPhoto = async () => {
    if (!photoFile) return formData.profile_photo_url;

    try {
      setUploadingPhoto(true);
      const result = await uploadFile(photoFile, user?.uid || 'admin', {
        documentType: 'doctor-profile-photo',
        description: `Profile photo for ${formData.name}`
      });

      if (result.success) {
        return result.file.downloadURL || result.file.viewUrl;
      } else {
        throw new Error(result.error || 'Failed to upload photo');
      }
    } catch (error) {
      console.error('Photo upload error:', error);
      setErrors(prev => ({ ...prev, photo: error.message || 'Failed to upload photo' }));
      return null;
    } finally {
      setUploadingPhoto(false);
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!formData.specialization) {
      newErrors.specialization = 'Specialization is required';
    }

    if (formData.consultation_fee && (isNaN(parseFloat(formData.consultation_fee)) || parseFloat(formData.consultation_fee) < 0)) {
      newErrors.consultation_fee = 'Consultation fee must be a valid number >= 0';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // Upload photo if selected
    let photoUrl = formData.profile_photo_url;
    if (photoFile) {
      const uploadedUrl = await uploadPhoto();
      if (!uploadedUrl) {
        return; // Error already set in uploadPhoto
      }
      photoUrl = uploadedUrl;
    }
    
    const doctorData = {
      ...formData,
      email: formData.email.trim().toLowerCase(), // Normalize email
      experience_years: parseInt(formData.experience_years) || 0,
      consultation_fee: parseFloat(formData.consultation_fee) || 0,
      qualifications: formData.qualifications.split(',').map(q => q.trim()).filter(q => q),
      location: formData.location.trim(),
      profile_photo_url: photoUrl,
      availability_status: formData.availability_status || 'Available',
      working_hours: {
        Monday: { start: '09:00', end: '17:00' },
        Tuesday: { start: '09:00', end: '17:00' },
        Wednesday: { start: '09:00', end: '17:00' },
        Thursday: { start: '09:00', end: '17:00' },
        Friday: { start: '09:00', end: '17:00' }
      }
    };
    onSave(doctorData);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">
        {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        <strong>Important:</strong> Enter the doctor's email address. This email will be used to link appointments to the doctor when they log in.
      </p>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="Dr. John Doe"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                if (errors.name) setErrors({ ...errors, name: '' });
              }}
              className={`px-4 py-2 border rounded-lg w-full ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              placeholder="doctor@example.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                if (errors.email) setErrors({ ...errors, email: '' });
              }}
              className={`px-4 py-2 border rounded-lg w-full ${
                errors.email ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
            <p className="text-xs text-gray-500 mt-1">
              This email must match the doctor's login email
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Phone
            </label>
            <input
              type="tel"
              placeholder="+1 234 567 8900"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialization <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.specialization}
              onChange={(e) => {
                setFormData({ ...formData, specialization: e.target.value });
                if (errors.specialization) setErrors({ ...errors, specialization: '' });
              }}
              className={`px-4 py-2 border rounded-lg w-full ${
                errors.specialization ? 'border-red-500' : 'border-gray-300'
              }`}
              required
            >
              <option value="">Select Specialization</option>
              <option value="General Physician">General Physician</option>
              <option value="Pediatrician">Pediatrician</option>
              <option value="Infectious Disease Specialist">Infectious Disease Specialist</option>
              <option value="Pulmonologist">Pulmonologist</option>
              <option value="Internal Medicine Doctor">Internal Medicine Doctor</option>
              <option value="Emergency Care Specialist">Emergency Care Specialist</option>
            </select>
            {errors.specialization && <p className="text-red-500 text-xs mt-1">{errors.specialization}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Experience (years)
            </label>
            <input
              type="number"
              placeholder="5"
              value={formData.experience_years}
              onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
              min="0"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Qualifications
            </label>
            <input
              type="text"
              placeholder="MBBS, MD, PhD (comma-separated)"
              value={formData.qualifications}
              onChange={(e) => setFormData({ ...formData, qualifications: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Location
            </label>
            <input
              type="text"
              placeholder="Bengaluru, Hyderabad, MG Road Clinic"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Consultation Fee (₹)
            </label>
            <input
              type="number"
              placeholder="499"
              value={formData.consultation_fee}
              onChange={(e) => {
                setFormData({ ...formData, consultation_fee: e.target.value });
                if (errors.consultation_fee) setErrors({ ...errors, consultation_fee: '' });
              }}
              className={`px-4 py-2 border rounded-lg w-full ${
                errors.consultation_fee ? 'border-red-500' : 'border-gray-300'
              }`}
              min="0"
              step="1"
            />
            {errors.consultation_fee && <p className="text-red-500 text-xs mt-1">{errors.consultation_fee}</p>}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Availability Status
            </label>
            <select
              value={formData.availability_status}
              onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
              className="px-4 py-2 border border-gray-300 rounded-lg w-full"
            >
              <option value="Available">Available</option>
              <option value="Unavailable">Unavailable</option>
              <option value="In Consultation">In Consultation</option>
            </select>
          </div>
        </div>

        {/* Photo Upload Section */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Profile Photo
          </label>
          <div className="flex items-start gap-4">
            {/* Photo Preview - Portrait with transparent PNG support */}
            <div className="relative">
              {photoPreview ? (
                <div className="relative">
                  {/* White/light grey background for transparent PNGs */}
                  <div className="w-32 h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 overflow-hidden">
                    <img
                      src={photoPreview}
                      alt="Preview"
                      className="w-full h-full object-cover object-top rounded-xl"
                      style={{ 
                        background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={removePhoto}
                    className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 shadow-lg z-10"
                  >
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div className="w-32 h-40 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                  <PhotoIcon className="w-8 h-8 text-gray-400" />
                </div>
              )}
            </div>

            {/* Upload Button */}
            <div className="flex-1">
              <input
                type="file"
                accept="image/png,image/jpeg,image/jpg"
                onChange={handlePhotoChange}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="inline-block px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 cursor-pointer transition-colors"
              >
                {photoPreview ? 'Change Photo' : 'Upload Photo'}
              </label>
              {errors.photo && <p className="text-red-500 text-xs mt-1">{errors.photo}</p>}
              <div className="text-xs text-gray-500 mt-1 space-y-1">
                <p className="font-medium text-gray-700">Upload a doctor portrait photo:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-2 text-gray-600">
                  <li>PNG with transparent or light background</li>
                  <li>Up to 5MB</li>
                  <li>400×500 px preferred</li>
                  <li>Should look similar to the sample doctor images (clean, professional, upper-body portrait)</li>
                </ul>
                <p className="text-gray-500 mt-1.5 leading-relaxed">
                  <span className="font-medium">Recommended format:</span> Front-facing portrait, white lab coat or formal medical attire, stethoscope visible (optional but preferred), clean bright background, shoulders and upper body visible.
                </p>
              </div>
              {uploadingPhoto && (
                <p className="text-xs text-blue-600 mt-1">Uploading...</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 disabled:opacity-50"
            disabled={uploadingPhoto}
          >
            {uploadingPhoto ? 'Uploading...' : (editingDoctor ? 'Update Doctor' : 'Add Doctor')}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}




