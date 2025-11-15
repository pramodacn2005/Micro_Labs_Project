import React, { useState, useEffect } from 'react';

export default function MedicineDashboard({ 
  medicines, 
  todaysMedicines, 
  medicineLogs, 
  missedDoses 
}) {
  const [stats, setStats] = useState({
    totalMedicines: 0,
    todaysMedicines: 0,
    takenToday: 0,
    missedToday: 0,
    onTimeRate: 0
  });

  useEffect(() => {
    calculateStats();
  }, [medicines, todaysMedicines, medicineLogs, missedDoses]);

  const calculateStats = () => {
    const totalMedicines = medicines.length;
    const todaysMedicinesCount = todaysMedicines.length;
    
    // Count medicines taken today
    const today = new Date().toDateString();
    const takenToday = medicineLogs.filter(log => 
      new Date(log.takenAt.toDate()).toDateString() === today
    ).length;
    
    // Count missed doses today
    const missedToday = missedDoses.length;
    
    // Calculate on-time rate
    const totalTaken = medicineLogs.length;
    const onTimeCount = medicineLogs.filter(log => log.isOnTime).length;
    const onTimeRate = totalTaken > 0 ? Math.round((onTimeCount / totalTaken) * 100) : 0;

    setStats({
      totalMedicines,
      todaysMedicines: todaysMedicinesCount,
      takenToday,
      missedToday,
      onTimeRate
    });
  };

  const getUpcomingMedicines = () => {
    const now = new Date();
    return todaysMedicines
      .filter(medicine => {
        const scheduledTime = new Date(medicine.scheduledTime);
        return scheduledTime > now;
      })
      .sort((a, b) => new Date(a.scheduledTime) - new Date(b.scheduledTime))
      .slice(0, 3);
  };

  const getRecentLogs = () => {
    return medicineLogs
      .sort((a, b) => new Date(b.takenAt.toDate()) - new Date(a.takenAt.toDate()))
      .slice(0, 5);
  };

  const upcomingMedicines = getUpcomingMedicines();
  const recentLogs = getRecentLogs();

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <span className="text-2xl">💊</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Medicines</p>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMedicines}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">📅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Today's Schedule</p>
              <p className="text-2xl font-bold text-gray-900">{stats.todaysMedicines}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <span className="text-2xl">✅</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Taken Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.takenToday}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <span className="text-2xl">⚠️</span>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Missed Today</p>
              <p className="text-2xl font-bold text-gray-900">{stats.missedToday}</p>
            </div>
          </div>
        </div>
      </div>

      {/* On-time Rate */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">On-Time Rate</h3>
        <div className="flex items-center">
          <div className="flex-1 bg-gray-200 rounded-full h-4 mr-4">
            <div 
              className="bg-green-500 h-4 rounded-full transition-all duration-300"
              style={{ width: `${stats.onTimeRate}%` }}
            ></div>
          </div>
          <span className="text-2xl font-bold text-gray-900">{stats.onTimeRate}%</span>
        </div>
        <p className="text-sm text-gray-600 mt-2">
          {stats.onTimeRate >= 80 ? 'Excellent adherence!' : 
           stats.onTimeRate >= 60 ? 'Good adherence' : 
           'Needs improvement'}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Upcoming Medicines */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upcoming Medicines</h3>
          {upcomingMedicines.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <div className="text-4xl mb-2">🎉</div>
              <p>No more medicines scheduled for today!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingMedicines.map((medicine) => {
                const scheduledTime = new Date(medicine.scheduledTime);
                const now = new Date();
                const timeDiff = scheduledTime - now;
                const hours = Math.floor(timeDiff / (1000 * 60 * 60));
                const minutes = Math.floor((timeDiff % (1000 * 60 * 60)) / (1000 * 60));
                
                return (
                  <div key={medicine.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{medicine.medicineName}</p>
                      <p className="text-sm text-gray-600">{medicine.dosage}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">
                        {scheduledTime.toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                      <p className="text-xs text-gray-500">
                        {hours > 0 ? `In ${hours}h ${minutes}m` : `In ${minutes}m`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          {recentLogs.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              <div className="text-4xl mb-2">📋</div>
              <p>No recent activity</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentLogs.map((log) => (
                <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">{log.medicineName}</p>
                    <p className="text-sm text-gray-600">
                      {new Date(log.takenAt.toDate()).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      log.isOnTime 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {log.isOnTime ? 'On Time' : `Late (${log.delayMinutes}m)`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Missed Doses Alert */}
      {missedDoses.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center">
            <span className="text-red-500 text-2xl mr-3">⚠️</span>
            <div>
              <h3 className="text-lg font-semibold text-red-800">Missed Doses Alert</h3>
              <p className="text-red-700">
                {missedDoses.length} medicine{missedDoses.length > 1 ? 's' : ''} have been missed today.
                Emergency alerts have been sent to your doctor/caregiver.
              </p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {missedDoses.map((dose) => (
              <div key={dose.id} className="bg-white p-3 rounded border border-red-200">
                <p className="font-medium text-gray-900">{dose.medicineName}</p>
                <p className="text-sm text-gray-600">
                  Scheduled: {new Date(dose.scheduledTime).toLocaleTimeString()}
                </p>
                <p className="text-sm text-red-600">
                  Overdue by: {dose.delayMinutes} minutes
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
















