import React, { useState, useEffect } from 'react';
import { 
  MagnifyingGlassIcon, 
  FunnelIcon,
  MapPinIcon,
  StarIcon,
  UserIcon,
  CalendarIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { getDoctors } from '../services/appointmentService';
import { useNavigate } from 'react-router-dom';

const specializations = [
  'General Physician',
  'Pediatrician',
  'Infectious Disease Specialist',
  'Pulmonologist',
  'Internal Medicine Doctor',
  'Emergency Care Specialist'
];

export default function DoctorList() {
  const [doctors, setDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({
    name: '',
    specialization: '',
    location: ''
  });

  const navigate = useNavigate();

  useEffect(() => {
    loadDoctors();
  }, [filters]);

  const loadDoctors = async () => {
    try {
      setLoading(true);
      const response = await getDoctors(filters);
      if (response.success) {
        setDoctors(response.doctors || []);
      }
    } catch (err) {
      setError(err.message);
      console.error('Error loading doctors:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleBookAppointment = (doctorId) => {
    // Navigate to booking page with doctor ID
    window.dispatchEvent(new CustomEvent('navigate', { 
      detail: { page: 'book-appointment', doctorId } 
    }));
  };

  const handleCallDoctor = (phoneNumber) => {
    if (phoneNumber) {
      // Remove any non-digit characters except + for international numbers
      const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 >= 0.5;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<StarIconSolid key={i} className="w-4 h-4 text-yellow-400" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<StarIconSolid key={i} className="w-4 h-4 text-yellow-400 opacity-50" />);
      } else {
        stars.push(<StarIcon key={i} className="w-4 h-4 text-gray-300" />);
      }
    }
    return stars;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Find a Doctor</h1>
        <p className="text-gray-600">Book an appointment with a fever-related specialist</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <FunnelIcon className="w-5 h-5 text-gray-500" />
          <h2 className="text-lg font-semibold text-gray-900">Search & Filter</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Name Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Search by Name
            </label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Doctor name..."
                value={filters.name}
                onChange={(e) => handleFilterChange('name', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Specialization Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Specialization
            </label>
            <select
              value={filters.specialization}
              onChange={(e) => handleFilterChange('specialization', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">All Specializations</option>
              {specializations.map(spec => (
                <option key={spec} value={spec}>{spec}</option>
              ))}
            </select>
          </div>

          {/* Location Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPinIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="City or area..."
                value={filters.location}
                onChange={(e) => handleFilterChange('location', e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          <p className="mt-2 text-gray-600">Loading doctors...</p>
        </div>
      )}

      {/* Doctors Grid */}
      {!loading && doctors.length === 0 && (
        <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
          <UserIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No doctors found matching your criteria.</p>
        </div>
      )}

      {!loading && doctors.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {doctors.map((doctor) => {
            // Get availability badge color
            const getAvailabilityBadge = () => {
              const status = doctor.availability_status || 'Available';
              if (status === 'Available') {
                return 'bg-green-100 text-green-800 border-green-200';
              } else if (status === 'In Consultation') {
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
              } else {
                return 'bg-red-100 text-red-800 border-red-200';
              }
            };

            // Get location string (handle both string and object formats)
            const locationStr = typeof doctor.location === 'string' 
              ? doctor.location 
              : (doctor.location?.city || doctor.location?.address || '');

            return (
              <div
                key={doctor.doctor_id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden relative"
              >
                {/* Availability Badge - Top Right */}
                <div className={`absolute top-3 right-3 px-2 py-1 rounded-full text-xs font-medium border ${getAvailabilityBadge()}`}>
                  {doctor.availability_status || 'Available'}
                </div>

                {/* Doctor Photo - Top Area - Portrait with transparent PNG support */}
                <div className="relative h-64 bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden">
                  {doctor.profile_photo_url ? (
                    <div className="w-full h-full bg-gradient-to-br from-gray-50 to-gray-100">
                      <img
                        src={doctor.profile_photo_url}
                        alt={doctor.name}
                        className="w-full h-full object-cover object-top rounded-xl"
                        style={{ 
                          background: 'linear-gradient(135deg, #f9fafb 0%, #f3f4f6 100%)'
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <UserIcon className="w-20 h-20 text-primary-400" />
                    </div>
                  )}
                </div>

                {/* Doctor Info */}
                <div className="p-6">
                  <div className="mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{doctor.name}</h3>
                    <p className="text-sm text-primary-600 font-medium mb-2">{doctor.specialization}</p>
                    {/* Unavailable Status - Small Red Text */}
                    {doctor.availability_status === 'Unavailable' && (
                      <p className="text-xs text-red-600 font-medium mb-2">Unavailable</p>
                    )}
                    
                    {/* Rating */}
                    <div className="flex items-center gap-1 mb-2">
                      {renderStars(doctor.rating || 0)}
                      <span className="text-sm text-gray-600">
                        ({doctor.rating?.toFixed(1) || '0.0'})
                      </span>
                    </div>

                    {/* Location */}
                    {locationStr && (
                      <div className="flex items-center gap-1 text-xs text-gray-600 mb-2">
                        <MapPinIcon className="w-4 h-4" />
                        <span>{locationStr}</span>
                      </div>
                    )}

                    {/* Experience */}
                    <p className="text-xs text-gray-500">
                      {doctor.experience_years || 0} years of experience
                    </p>
                  </div>

                  {/* Fee and Action Buttons Row */}
                  <div className="pt-4 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-3">
                      <div className="text-left">
                        <p className="text-xs text-gray-500">Consultation Fee</p>
                        <p className="text-lg font-bold text-blue-600">
                          ₹{doctor.consultation_fee || 0}
                        </p>
                      </div>
                      {doctor.phone && (
                        <button
                          onClick={() => handleCallDoctor(doctor.phone)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                          title={`Call ${doctor.name}`}
                        >
                          <PhoneIcon className="w-5 h-5" />
                          Call
                        </button>
                      )}
                    </div>
                    <button
                      onClick={() => handleBookAppointment(doctor.doctor_id)}
                      disabled={doctor.availability_status === 'Unavailable'}
                      className={`w-full px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
                        doctor.availability_status === 'Unavailable'
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-primary-600 text-white hover:bg-primary-700'
                      }`}
                      title={doctor.availability_status === 'Unavailable' ? 'Doctor is currently unavailable' : 'Book an appointment'}
                    >
                      <CalendarIcon className="w-5 h-5" />
                      {doctor.availability_status === 'Unavailable' ? 'Unavailable' : 'Book Appointment'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}





