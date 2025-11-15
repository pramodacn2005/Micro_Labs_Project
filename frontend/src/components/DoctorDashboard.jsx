import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  ClockIcon,
  UserIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon as PendingIcon
} from '@heroicons/react/24/outline';
import { getDoctorAppointments, acceptAppointment, rejectAppointment, completeAppointment } from '../services/appointmentService';
import { useAuth } from '../contexts/AuthContext';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  completed: 'bg-blue-100 text-blue-800'
};

export default function DoctorDashboard() {
  const { user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('pending');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    if (user?.uid) {
      loadAppointments();
    }
  }, [user, filter, selectedDate]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const filters = { 
        status: filter !== 'all' ? filter : undefined,
        date: filter === 'today' ? selectedDate : undefined
      };
      const response = await getDoctorAppointments(user.uid, filters);
      if (response.success) {
        setAppointments(response.appointments || []);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAccept = async (appointmentId) => {
    try {
      const response = await acceptAppointment(appointmentId);
      if (response.success) {
        loadAppointments();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleReject = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to reject this appointment?')) {
      return;
    }
    try {
      const response = await rejectAppointment(appointmentId);
      if (response.success) {
        loadAppointments();
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleComplete = async (appointmentId) => {
    try {
      const response = await completeAppointment(appointmentId);
      if (response.success) {
        loadAppointments();
      }
    } catch (err) {
      setError(err.message);
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

  const pendingCount = appointments.filter(a => a.status === 'pending').length;
  const todayCount = appointments.filter(a => 
    a.status === 'accepted' && a.date === selectedDate
  ).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Doctor Dashboard</h1>
        <p className="text-gray-600">Manage your appointments and patient requests</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Pending Requests</p>
              <p className="text-3xl font-bold text-yellow-600">{pendingCount}</p>
            </div>
            <PendingIcon className="w-12 h-12 text-yellow-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Today's Appointments</p>
              <p className="text-3xl font-bold text-green-600">{todayCount}</p>
            </div>
            <CalendarIcon className="w-12 h-12 text-green-400" />
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 mb-1">Total Appointments</p>
              <p className="text-3xl font-bold text-primary-600">{appointments.length}</p>
            </div>
            <UserIcon className="w-12 h-12 text-primary-400" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex gap-2 overflow-x-auto">
            {['pending', 'accepted', 'today', 'all'].map((status) => (
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
          {filter === 'today' && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
            />
          )}
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

      {/* Appointments List */}
      {!loading && appointments.length > 0 && (
        <div className="space-y-4">
          {appointments.map((appointment) => (
            <div
              key={appointment.appointment_id}
              className="bg-white rounded-xl border border-gray-200 shadow-sm p-6"
            >
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Left: Patient Info & Details */}
                <div className="flex-1">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary-100 flex items-center justify-center">
                      <UserIcon className="w-6 h-6 text-primary-600" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {appointment.patient?.fullName || appointment.patient?.name || 'Patient'}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {appointment.patient?.email || 'No email'}
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
                    </div>
                  </div>
                </div>

                {/* Right: Status & Actions */}
                <div className="flex flex-col items-end gap-3">
                  <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${STATUS_COLORS[appointment.status] || STATUS_COLORS.pending}`}>
                    <span>{appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1)}</span>
                  </div>
                  <div className="flex gap-2">
                    {appointment.status === 'pending' && (
                      <>
                        <button
                          onClick={() => handleAccept(appointment.appointment_id)}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(appointment.appointment_id)}
                          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                          <XCircleIcon className="w-4 h-4" />
                          Reject
                        </button>
                      </>
                    )}
                    {appointment.status === 'accepted' && (
                      <button
                        onClick={() => handleComplete(appointment.appointment_id)}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                      >
                        <CheckCircleIcon className="w-4 h-4" />
                        Mark Complete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && appointments.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <CalendarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Appointments</h3>
          <p className="text-gray-600">
            {filter === 'pending' 
              ? "You don't have any pending appointment requests."
              : `You don't have any ${filter} appointments.`
            }
          </p>
        </div>
      )}
    </div>
  );
}







