import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  subscribeToMedicines, 
  getTodaysMedicines, 
  getMedicineLogs,
  checkMissedDoses,
  logMedicineTaken,
  createMissedDoseAlert
} from '../services/medicineService';
import MedicineForm from './MedicineForm';
import MedicineCard from './MedicineCard';
import MedicineDashboard from './MedicineDashboard';
import ReminderNotification from './ReminderNotification';

export default function MedicineReminder() {
  const { user, userData } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [medicines, setMedicines] = useState([]);
  const [todaysMedicines, setTodaysMedicines] = useState([]);
  const [medicineLogs, setMedicineLogs] = useState([]);
  const [missedDoses, setMissedDoses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentReminder, setCurrentReminder] = useState(null);
  const [showReminder, setShowReminder] = useState(false);

  const userId = user?.uid;

  useEffect(() => {
    if (!userId) return;

    // Subscribe to medicines
    const unsubscribe = subscribeToMedicines(userId, (medicinesData) => {
      setMedicines(medicinesData);
      setLoading(false);
    });

    // Load today's medicines and logs
    loadTodaysData();
    
    // Check for missed doses immediately
    checkForMissedDosesAndAlert();

    // Check for missed doses every minute
    const missedDoseInterval = setInterval(() => {
      checkForMissedDosesAndAlert();
    }, 60000);

    // Check for upcoming reminders every 30 seconds
    const reminderInterval = setInterval(() => {
      checkForUpcomingReminders();
    }, 30000);

    return () => {
      unsubscribe();
      clearInterval(missedDoseInterval);
      clearInterval(reminderInterval);
    };
  }, [userId]);

  const loadTodaysData = async () => {
    if (!userId) return;
    
    try {
      const [todaysData, logsData] = await Promise.all([
        getTodaysMedicines(userId),
        getMedicineLogs(userId, new Date())
      ]);
      
      setTodaysMedicines(todaysData);
      setMedicineLogs(logsData);
    } catch (error) {
      console.error('Error loading today\'s data:', error);
    }
  };

  const checkForMissedDosesAndAlert = async () => {
    if (!userId) return;
    
    try {
      const missed = await checkMissedDoses(userId);
      setMissedDoses(missed);
      
      // Create alerts for new missed doses
      for (const missedDose of missed) {
        console.log('🚨 Creating missed dose alert for:', missedDose.medicineName);
        await createMissedDoseAlert(
          missedDose,
          missedDose.scheduledTime,
          missedDose.delayMinutes
        );
      }
    } catch (error) {
      console.error('Error checking missed doses:', error);
    }
  };

  const checkForUpcomingReminders = () => {
    const now = new Date();
    const upcomingMedicines = todaysMedicines.filter(medicine => {
      const scheduledTime = new Date(medicine.scheduledTime);
      const timeDiff = scheduledTime - now;
      // Show reminder 5 minutes before scheduled time
      return timeDiff > 0 && timeDiff <= 5 * 60 * 1000;
    });

    if (upcomingMedicines.length > 0 && !showReminder) {
      setCurrentReminder(upcomingMedicines[0]);
      setShowReminder(true);
    }
  };

  const handleMedicineTaken = async (medicineId, confirmationMethod = 'button') => {
    try {
      const medicine = medicines.find(m => m.id === medicineId);
      if (!medicine) return;

      await logMedicineTaken(medicineId, medicine);
      await loadTodaysData(); // Refresh data
      
      // Close reminder if it was for this medicine
      if (currentReminder?.id === medicineId) {
        setShowReminder(false);
        setCurrentReminder(null);
      }
    } catch (error) {
      console.error('Error logging medicine taken:', error);
    }
  };

  const handleVoiceConfirmation = async (medicineId) => {
    await handleMedicineTaken(medicineId, 'voice');
  };

  const dismissReminder = () => {
    setShowReminder(false);
    setCurrentReminder(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Medicine Reminder System</h1>
          <p className="text-gray-600">Manage your medication schedule and track intake</p>
        </div>
        <button
          onClick={() => setActiveTab('add')}
          className="bg-primary-600 text-white px-4 py-2 rounded-lg hover:bg-primary-700 transition-colors"
        >
          Add Medicine
        </button>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: '📊' },
            { id: 'today', label: "Today's Medicines", icon: '💊' },
            { id: 'history', label: 'History', icon: '📋' },
            { id: 'add', label: 'Add Medicine', icon: '➕' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'dashboard' && (
          <MedicineDashboard 
            medicines={medicines}
            todaysMedicines={todaysMedicines}
            medicineLogs={medicineLogs}
            missedDoses={missedDoses}
          />
        )}

        {activeTab === 'today' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Today's Medicines</h2>
            {todaysMedicines.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">💊</div>
                <p>No medicines scheduled for today</p>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {todaysMedicines.map((medicine) => (
                  <MedicineCard
                    key={medicine.id}
                    medicine={medicine}
                    onMedicineTaken={handleMedicineTaken}
                    onVoiceConfirmation={handleVoiceConfirmation}
                    isTaken={medicineLogs.some(log => 
                      log.medicineId === medicine.id && 
                      new Date(log.takenAt.toDate()).toDateString() === new Date().toDateString()
                    )}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-gray-900">Medicine History</h2>
            {medicineLogs.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <div className="text-4xl mb-4">📋</div>
                <p>No medicine history available</p>
              </div>
            ) : (
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Medicine
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Scheduled Time
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Taken At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {medicineLogs.map((log) => (
                        <tr key={log.id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-medium text-gray-900">
                              {log.medicineName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {log.dosage}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.scheduledTime).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(log.takenAt.toDate()).toLocaleTimeString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              log.isOnTime 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-red-100 text-red-800'
                            }`}>
                              {log.isOnTime ? 'On Time' : `Late (${log.delayMinutes}m)`}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'add' && (
          <MedicineForm onMedicineAdded={() => {
            setActiveTab('today');
            loadTodaysData();
          }} />
        )}
      </div>

      {/* Reminder Notification */}
      {showReminder && currentReminder && (
        <ReminderNotification
          medicine={currentReminder}
          onMedicineTaken={handleMedicineTaken}
          onVoiceConfirmation={handleVoiceConfirmation}
          onDismiss={dismissReminder}
        />
      )}
    </div>
  );
}

