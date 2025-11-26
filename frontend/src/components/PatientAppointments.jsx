import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { getPatientAppointments, cancelAppointment } from '../services/appointmentService';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-gray-100 text-gray-800'
};

const STATUS_ICONS = {
  pending: PendingIcon,
  accepted: CheckCircleIcon,
  rejected: XCircleIcon,
  completed: CheckCircleIcon,
  cancelled: XMarkIcon
};

export default function PatientAppointments() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    if (user?.uid) {
      loadAppointments();
    }
  }, [user, filter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const filters = filter !== 'all' ? { status: filter } : {};
      const response = await getPatientAppointments(user.uid, filters);
      if (response.success) {
        setAppointments(response.appointments || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    try {
      const response = await cancelAppointment(appointmentId);
      if (response.success) {
        loadAppointments();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCallDoctor = (phoneNumber) => {
    if (phoneNumber) {
      // Remove any non-digit characters except + for international numbers
      const cleanPhone = phoneNumber.replace(/[^\d+]/g, '');
      window.location.href = `tel:${cleanPhone}`;
    }
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">My Appointments</h1>
        <p className="text-gray-600">View and manage your scheduled appointments</p>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex gap-2 overflow-x-auto">
          {['all', 'pending', 'accepted', 'completed', 'cancelled'].map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors whitespace-nowrap ${
                filter === status
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
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
          <p className="mt-2 text-gray-600">Loading appointments...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && appointments.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments</h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' 
              ? "You don't have any appointments yet."
              : `You don't have any ${filter} appointments.`
            }
          </p>
          <button
            onClick={() => {
              window.dispatchEvent(new CustomEvent('navigate', { detail: { page: 'doctor-list' } }));
            }}
            className="bg-primary-600 text-white px-6 py-2 rounded-lg hover:bg-primary-700 transition-colors"
          >
            Book an Appointment
          </button>
        </div>
      )}

      {/* Appointments List */}
      {!loading && appointments.length > 0 && (
        <div className="space-y-4">
          {appointments.map((appointment) => {
            const StatusIcon = STATUS_ICONS[appointment.status] || PendingIcon;
            
            return (
              <div
                key={appointment.appointment_id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  {/* Left: Doctor Info & Details */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4 mb-4">
                      {appointment.doctor?.profile_photo_url ? (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-gray-50 to-gray-100 border border-gray-200 overflow-hidden">
                          <img
                            src={appointment.doctor.profile_photo_url}
                            alt={appointment.doctor.name}
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
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {appointment.doctor?.name || 'Unknown Doctor'}
                        </h3>
                        <p className="text-sm text-primary-600 mb-2">
                          {appointment.doctor?.specialization || 'Specialist'}
                        </p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <div className="flex items-center gap-1">
                            <CalendarIcon className="w-4 h-4" />
                            <span>{formatDate(appointment.date)}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <ClockIcon className="w-4 h-4" />
                            <span>{appointment.time_slot}</span>
                          </div>
                        </div>
                        {appointment.reason && (
                          <p className="text-sm text-gray-600 mt-2">
                            <span className="font-medium">Reason:</span> {appointment.reason}
                          </p>
                        )}
                        {appointment.doctor?.phone && (
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Phone:</span> {appointment.doctor.phone}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="flex flex-col items-end gap-3">
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[appointment.status] || STATUS_COLORS.pending}`}>
                      <StatusIcon className="w-4 h-4" />
                      <span>{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {appointment.doctor?.phone && (
                        <button
                          onClick={() => handleCallDoctor(appointment.doctor.phone)}
                          className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors flex items-center gap-2"
                          title={`Call ${appointment.doctor.name}`}
                        >
                          <PhoneIcon className="w-4 h-4" />
                          Call
                        </button>
                      )}
                      {appointment.status === 'pending' && (
                        <button
                          onClick={() => handleCancel(appointment.appointment_id)}
                          className="text-red-600 hover:text-red-700 text-sm font-medium flex items-center gap-1"
                        >
                          <XMarkIcon className="w-4 h-4" />
                          Cancel
                        </button>
                      )}
                    </div>
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





