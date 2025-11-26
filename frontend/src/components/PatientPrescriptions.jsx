import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  DocumentArrowDownIcon,
  CalendarIcon,
  UserIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import { getPatientPrescriptions, downloadPrescription } from '../services/prescriptionService';
import { useAuth } from '../contexts/AuthContext';

export default function PatientPrescriptions() {
  const { user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.uid) {
      loadPrescriptions();
    }
  }, [user]);

  const loadPrescriptions = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await getPatientPrescriptions(user.uid);
      if (response.success) {
        setPrescriptions(response.prescriptions || []);
      } else {
        setError(response.error || 'Failed to load prescriptions');
      }
    } catch (err) {
      setError(err.message || 'Failed to load prescriptions');
      console.error('Error loading prescriptions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (prescriptionId) => {
    try {
      const blob = await downloadPrescription(prescriptionId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `prescription_${prescriptionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      alert('Failed to download prescription: ' + err.message);
      console.error('Error downloading prescription:', err);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return dateStr;
    }
  };

  const getSentStatusBadge = (status) => {
    const statusConfig = {
      sent: { color: 'bg-green-100 text-green-800', icon: CheckCircleIcon },
      failed: { color: 'bg-red-100 text-red-800', icon: XCircleIcon },
      pending_consent: { color: 'bg-yellow-100 text-yellow-800', icon: ClockIcon },
      not_sent: { color: 'bg-gray-100 text-gray-800', icon: ClockIcon }
    };

    const config = statusConfig[status] || statusConfig.not_sent;
    const Icon = config.icon;

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="w-3 h-3" />
        {status.replace('_', ' ').toUpperCase()}
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">My Prescriptions</h1>
          <p className="text-gray-600">View and download your prescriptions from doctors</p>
        </div>
        <button
          onClick={loadPrescriptions}
          disabled={loading}
          className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2 disabled:opacity-50"
        >
          <ArrowPathIcon className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
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
          <p className="mt-2 text-gray-600">Loading prescriptions...</p>
        </div>
      )}

      {/* Prescriptions List */}
      {!loading && prescriptions.length > 0 && (
        <div className="space-y-4">
          {prescriptions.map((prescription) => {
            const prescriptionData = prescription.prescription_json || {};
            const doctor = prescriptionData.doctor || {};
            const medications = prescriptionData.medications || [];

            return (
              <div
                key={prescription.prescription_id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                  {/* Left: Prescription Info */}
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                        <DocumentTextIcon className="w-6 h-6 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900">
                            Prescription from {doctor.name || 'Doctor'}
                          </h3>
                          {getSentStatusBadge(prescription.sent_status || 'not_sent')}
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <UserIcon className="w-4 h-4" />
                              <span>Dr. {doctor.name || 'N/A'}</span>
                            </div>
                            {doctor.license_number && (
                              <span className="text-xs text-gray-500">
                                License: {doctor.license_number}
                              </span>
                            )}
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1">
                              <CalendarIcon className="w-4 h-4" />
                              <span>Issued: {formatDate(prescriptionData.timestamp_issued || prescription.created_at)}</span>
                            </div>
                            {prescription.sent_via && (
                              <span className="text-xs text-gray-500">
                                Sent via: {prescription.sent_via}
                              </span>
                            )}
                          </div>

                          {doctor.clinic_name && (
                            <div className="text-xs text-gray-500">
                              {doctor.clinic_name}
                              {doctor.clinic_address && ` • ${doctor.clinic_address}`}
                            </div>
                          )}
                        </div>

                        {/* Medications Summary */}
                        {medications.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-gray-200">
                            <h4 className="text-sm font-semibold text-gray-900 mb-2">
                              Medications ({medications.length})
                            </h4>
                            <div className="space-y-1">
                              {medications.slice(0, 3).map((med, idx) => (
                                <div key={idx} className="text-sm text-gray-600">
                                  • {med.name} {med.strength_mg ? `(${med.strength_mg}mg)` : ''} - {med.dose} {med.frequency}
                                </div>
                              ))}
                              {medications.length > 3 && (
                                <div className="text-xs text-gray-500">
                                  + {medications.length - 3} more medication(s)
                                </div>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Notes */}
                        {prescriptionData.notes_for_patient && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Notes:</span> {prescriptionData.notes_for_patient}
                            </p>
                          </div>
                        )}

                        {/* Follow-up Date */}
                        {prescriptionData.follow_up_date && (
                          <div className="mt-2">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium">Follow-up:</span> {formatDate(prescriptionData.follow_up_date)}
                            </p>
                          </div>
                        )}

                        {/* Refill Status */}
                        <div className="mt-2">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            prescriptionData.refill_allowed 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            Refill: {prescriptionData.refill_allowed ? 'Allowed' : 'Not Allowed'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-col items-end gap-3">
                    {prescription.pdf_url && (
                      <button
                        onClick={() => handleDownload(prescription.prescription_id)}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors flex items-center gap-2"
                      >
                        <DocumentArrowDownIcon className="w-5 h-5" />
                        Download PDF
                      </button>
                    )}
                    <div className="text-xs text-gray-500">
                      ID: {prescription.prescription_id}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && prescriptions.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No Prescriptions</h3>
          <p className="text-gray-600">
            You don't have any prescriptions yet. Prescriptions will appear here after your doctor sends them.
          </p>
        </div>
      )}
    </div>
  );
}

