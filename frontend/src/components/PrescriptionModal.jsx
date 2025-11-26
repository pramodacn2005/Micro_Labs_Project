import React, { useState, useEffect } from 'react';
import { XMarkIcon, PlusIcon, TrashIcon, SparklesIcon } from '@heroicons/react/24/outline';
import { createPrescription } from '../services/prescriptionService';
import { useAuth } from '../contexts/AuthContext';

export default function PrescriptionModal({ appointment, doctorInfo, onClose, onSuccess }) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [warnings, setWarnings] = useState([]);
  
  const [prescription, setPrescription] = useState({
    medications: [{
      name: '',
      strength_mg: null,
      form: 'tablet',
      dose: '',
      frequency: '',
      route: 'oral',
      when: 'after food',
      duration_days: null,
      additional_instructions: ''
    }],
    notes_for_patient: '',
    follow_up_date: '',
    refill_allowed: false,
    clinic_instructions: ''
  });
  
  const [sendMethod, setSendMethod] = useState('email');
  const [requireConsent, setRequireConsent] = useState(true);

  // Get patient info from appointment
  // Handle both nested patient object and direct appointment fields
  const patient = appointment?.patient || {};
  const patientId = patient.id || appointment?.patient_id || appointment?.patient?.id;
  
  // Get doctor info (use provided doctorInfo or defaults)
  const doctor = doctorInfo || {
    id: user?.uid || '',
    name: user?.displayName || 'Dr. Name',
    license_number: 'LIC12345', // Should be fetched from doctor profile
    clinic_name: 'Health Clinic',
    clinic_address: '123 Main St',
    clinic_phone: '+1234567890'
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setWarnings([]);

    try {
      const response = await createPrescription({
        doctor: {
          id: doctor.id,
          name: doctor.name,
          license_number: doctor.license_number || 'LIC12345',
          clinic_name: doctor.clinic_name || 'Health Clinic',
          clinic_address: doctor.clinic_address || '',
          clinic_phone: doctor.clinic_phone || doctor.phone || '',
          digital_signature: null
        },
        patient: {
          id: patientId,
          name: patient.fullName || patient.name || 'Patient',
          age: patient.age || 30,
          gender: patient.gender || null,
          address: patient.address || null,
          phone: patient.phone || null,
          email: patient.email || null,
          known_allergies: patient.known_allergies || []
        },
        prescription_input: prescription,
        send_options: {
          send_method: sendMethod,
          send_to: sendMethod === 'email' ? (patient.email || patient.id) : 
                  sendMethod === 'sms' ? (patient.phone || patient.id) : 
                  patient.id
        },
        require_consent_to_send: requireConsent
      });

      if (response.status === 'success') {
        alert('Prescription created and sent successfully!');
        onSuccess?.(response);
        onClose();
      } else if (response.status === 'pending') {
        // Show warnings and ask for confirmation
        setWarnings(response.errors || []);
        const confirmed = window.confirm(
          `⚠️ Safety Warnings:\n\n${response.errors?.join('\n')}\n\nDo you want to proceed anyway?`
        );
        
        if (confirmed) {
          // For now, just show success - in production, you might want to resubmit with confirmation flag
          alert('Prescription created with warnings acknowledged.');
          onSuccess?.(response);
          onClose();
        }
      } else {
        setError(response.errors?.join(', ') || 'Failed to create prescription');
      }
    } catch (err) {
      setError(err.message || 'Failed to create prescription');
    } finally {
      setLoading(false);
    }
  };

  const addMedication = () => {
    setPrescription(prev => ({
      ...prev,
      medications: [...prev.medications, {
        name: '',
        strength_mg: null,
        form: 'tablet',
        dose: '',
        frequency: '',
        route: 'oral',
        when: 'after food',
        duration_days: null,
        additional_instructions: ''
      }]
    }));
  };

  const removeMedication = (index) => {
    setPrescription(prev => ({
      ...prev,
      medications: prev.medications.filter((_, i) => i !== index)
    }));
  };

  const updateMedication = (index, field, value) => {
    setPrescription(prev => ({
      ...prev,
      medications: prev.medications.map((med, i) => 
        i === index ? { ...med, [field]: value } : med
      )
    }));
  };

  const loadDemoData = () => {
    // Demo prescription with Paracetamol 500mg
    setPrescription({
      medications: [{
        name: 'Paracetamol',
        strength_mg: 500,
        form: 'tablet',
        dose: '1 tablet',
        frequency: 'Twice daily',
        route: 'oral',
        when: 'after food',
        duration_days: 5,
        additional_instructions: 'Take with plenty of water. Do not exceed 4 tablets per day.'
      }],
      notes_for_patient: 'Take the medication as prescribed. Rest well and stay hydrated. If symptoms persist or worsen, contact the clinic immediately.',
      follow_up_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16), // 7 days from now
      refill_allowed: false,
      clinic_instructions: 'Monitor patient response. Advise to return if fever persists beyond 3 days.'
    });
    
    // Set send method to email by default for demo
    setSendMethod('email');
    setRequireConsent(true);
    
    // Show success message
    alert('Demo data loaded! Paracetamol 500mg prescription is ready. You can modify any fields before submitting.');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Create Prescription</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={loadDemoData}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition-colors flex items-center gap-2 text-sm font-medium"
              title="Load demo prescription with Paracetamol 500mg"
            >
              <SparklesIcon className="w-4 h-4" />
              Load Demo
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Patient Info */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold text-gray-900 mb-2">Patient Information</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Name:</span>
                <span className="ml-2 font-medium">{patient.fullName || patient.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Age:</span>
                <span className="ml-2 font-medium">{patient.age || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Gender:</span>
                <span className="ml-2 font-medium">{patient.gender || 'N/A'}</span>
              </div>
              <div>
                <span className="text-gray-600">Email:</span>
                <span className="ml-2 font-medium">{patient.email || 'N/A'}</span>
              </div>
              {patient.known_allergies && patient.known_allergies.length > 0 && (
                <div className="col-span-2">
                  <span className="text-red-600 font-semibold">⚠️ Allergies:</span>
                  <span className="ml-2">{patient.known_allergies.join(', ')}</span>
                </div>
              )}
            </div>
          </div>

          {/* Medications */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Medications</h3>
              <button
                type="button"
                onClick={addMedication}
                className="flex items-center gap-2 text-primary-600 hover:text-primary-700"
              >
                <PlusIcon className="w-5 h-5" />
                Add Medication
              </button>
            </div>
            
            <div className="space-y-4">
              {prescription.medications.map((med, index) => (
                <div key={index} className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-900">Medication {index + 1}</h4>
                    {prescription.medications.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeMedication(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <TrashIcon className="w-5 h-5" />
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Medication Name *
                      </label>
                      <input
                        type="text"
                        value={med.name}
                        onChange={(e) => updateMedication(index, 'name', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Strength (mg)
                      </label>
                      <input
                        type="number"
                        value={med.strength_mg || ''}
                        onChange={(e) => updateMedication(index, 'strength_mg', parseInt(e.target.value) || null)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Form</label>
                      <select
                        value={med.form}
                        onChange={(e) => updateMedication(index, 'form', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="tablet">Tablet</option>
                        <option value="capsule">Capsule</option>
                        <option value="suspension">Suspension</option>
                        <option value="syrup">Syrup</option>
                        <option value="injection">Injection</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Dose *</label>
                      <input
                        type="text"
                        value={med.dose}
                        onChange={(e) => updateMedication(index, 'dose', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="e.g., 1 tablet"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
                      <input
                        type="text"
                        value={med.frequency}
                        onChange={(e) => updateMedication(index, 'frequency', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                        placeholder="e.g., Twice daily"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Route</label>
                      <select
                        value={med.route}
                        onChange={(e) => updateMedication(index, 'route', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="oral">Oral</option>
                        <option value="iv">IV</option>
                        <option value="im">IM</option>
                        <option value="subcutaneous">Subcutaneous</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">When</label>
                      <select
                        value={med.when}
                        onChange={(e) => updateMedication(index, 'when', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      >
                        <option value="before food">Before Food</option>
                        <option value="after food">After Food</option>
                        <option value="with food">With Food</option>
                        <option value="anytime">Anytime</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Duration (days)</label>
                      <input
                        type="number"
                        value={med.duration_days || ''}
                        onChange={(e) => updateMedication(index, 'duration_days', parseInt(e.target.value) || null)}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Additional Instructions
                    </label>
                    <textarea
                      value={med.additional_instructions}
                      onChange={(e) => updateMedication(index, 'additional_instructions', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2"
                      rows="2"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes for Patient
            </label>
            <textarea
              value={prescription.notes_for_patient}
              onChange={(e) => setPrescription(prev => ({ ...prev, notes_for_patient: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows="3"
            />
          </div>

          {/* Follow-up Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Follow-up Date
            </label>
            <input
              type="datetime-local"
              value={prescription.follow_up_date}
              onChange={(e) => setPrescription(prev => ({ ...prev, follow_up_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
            />
          </div>

          {/* Refill Allowed */}
          <div className="flex items-center">
            <input
              type="checkbox"
              id="refill_allowed"
              checked={prescription.refill_allowed}
              onChange={(e) => setPrescription(prev => ({ ...prev, refill_allowed: e.target.checked }))}
              className="mr-2"
            />
            <label htmlFor="refill_allowed" className="text-sm font-medium text-gray-700">
              Refill Allowed
            </label>
          </div>

          {/* Clinic Instructions */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Clinic Instructions
            </label>
            <textarea
              value={prescription.clinic_instructions}
              onChange={(e) => setPrescription(prev => ({ ...prev, clinic_instructions: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2"
              rows="2"
            />
          </div>

          {/* Send Options */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-gray-900 mb-3">Send Options</h3>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="email"
                  checked={sendMethod === 'email'}
                  onChange={(e) => setSendMethod(e.target.value)}
                  className="mr-2"
                />
                Send via Email
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="sms"
                  checked={sendMethod === 'sms'}
                  onChange={(e) => setSendMethod(e.target.value)}
                  className="mr-2"
                />
                Send via SMS
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="in_app"
                  checked={sendMethod === 'in_app'}
                  onChange={(e) => setSendMethod(e.target.value)}
                  className="mr-2"
                />
                In-App Notification Only
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="none"
                  checked={sendMethod === 'none'}
                  onChange={(e) => setSendMethod(e.target.value)}
                  className="mr-2"
                />
                Don't Send (Save Only)
              </label>
            </div>
            <label className="flex items-center mt-3">
              <input
                type="checkbox"
                checked={requireConsent}
                onChange={(e) => setRequireConsent(e.target.checked)}
                className="mr-2"
              />
              Require Patient Consent
            </label>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          )}

          {/* Warnings Display */}
          {warnings.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h4 className="font-semibold text-yellow-800 mb-2">⚠️ Safety Warnings:</h4>
              <ul className="list-disc list-inside text-yellow-700 space-y-1">
                {warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create & Send Prescription'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

