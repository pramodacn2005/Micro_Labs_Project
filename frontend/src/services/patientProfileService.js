// Patient Profile Service for Firebase/Backend Integration
// This is an example of how to integrate with Firebase or any backend API

export class PatientProfileService {
  constructor() {
    // In a real app, initialize Firebase or API client here
    this.baseUrl = import.meta.env.VITE_BACKEND_URL || import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000/api';
  }

  // Save patient profile data to Firebase/backend
  async savePatientProfile(patientId, profileData) {
    try {
      // Example Firebase Firestore integration:
      // const db = getFirestore();
      // const docRef = doc(db, 'patients', patientId);
      // await setDoc(docRef, profileData, { merge: true });

      // Example REST API call:
      const response = await fetch(`${this.baseUrl}/patients/${patientId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}` // if using JWT
        },
        body: JSON.stringify(profileData)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error saving patient profile:', error);
      throw error;
    }
  }

  // Get patient profile data from Firebase/backend
  async getPatientProfile(patientId) {
    try {
      // Example Firebase Firestore integration:
      // const db = getFirestore();
      // const docRef = doc(db, 'patients', patientId);
      // const docSnap = await getDoc(docRef);
      // return docSnap.exists() ? docSnap.data() : null;

      // Example REST API call:
      const response = await fetch(`${this.baseUrl}/patients/${patientId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error fetching patient profile:', error);
      throw error;
    }
  }

  // Update specific fields in patient profile
  async updatePatientFields(patientId, fields) {
    try {
      const response = await fetch(`${this.baseUrl}/patients/${patientId}/fields`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify(fields)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('Error updating patient fields:', error);
      throw error;
    }
  }

  // Export patient data as CSV (server-side generation)
  async exportPatientData(patientId, format = 'csv') {
    try {
      const response = await fetch(`${this.baseUrl}/patients/${patientId}/export?format=${format}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Handle file download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      link.download = `patient_profile_${timestamp}.${format}`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      return true;
    } catch (error) {
      console.error('Error exporting patient data:', error);
      throw error;
    }
  }
}

// Example usage in the PatientProfile component:
/*
import { PatientProfileService } from '../services/patientProfileService';

const patientService = new PatientProfileService();

// In the handleSave function:
const handleSave = async () => {
  // ... validation code ...
  
  setIsSaving(true);
  
  try {
    await patientService.savePatientProfile('patient-id', editableData);
    
    setOriginalData({ ...editableData });
    setIsEditMode(false);
    setValidationErrors({});
    
    setToastMessage("Profile updated successfully!");
    setShowToast(true);
  } catch (error) {
    setToastMessage("Failed to update profile. Please try again.");
    setShowToast(true);
  } finally {
    setIsSaving(false);
  }
};

// In the handleExportCSV function:
const handleExportCSV = async () => {
  try {
    await patientService.exportPatientData('patient-id', 'csv');
    setToastMessage("Profile data exported successfully!");
    setShowToast(true);
  } catch (error) {
    setToastMessage("Failed to export data. Please try again.");
    setShowToast(true);
  }
};
*/

