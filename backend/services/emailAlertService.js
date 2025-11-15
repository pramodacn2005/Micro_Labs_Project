import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

// Create email transporter
const createTransporter = () => {
  // Option 1: Gmail SMTP (easiest)
  if (process.env.GMAIL_USER && process.env.GMAIL_PASS) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_PASS
      }
    });
  }
  
  // Option 2: Custom SMTP
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }
  
  return null;
};

const transporter = createTransporter();

/**
 * Send missed dose alert via email
 */
export async function sendMissedDoseEmail(medicineData, scheduledTime, delayMinutes) {
  try {
    if (!transporter) {
      console.log('📧 [SIMULATED EMAIL] Email not configured - simulating email send');
      return {
        success: true,
        messageId: 'simulated_' + Date.now(),
        status: 'simulated'
      };
    }

    const patientName = medicineData.patientName || 'Patient';
    const medicineName = medicineData.medicineName;
    const dosage = medicineData.dosage;
    
    const scheduledDate = new Date(scheduledTime);
    const timeString = scheduledDate.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
    
    const subject = `🚨 MISSED DOSE ALERT - ${patientName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #ff4444; color: white; padding: 20px; text-align: center;">
          <h1>🚨 MISSED DOSE ALERT 🚨</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Patient Information</h2>
          <p><strong>Patient Name:</strong> ${patientName}</p>
          <p><strong>Medicine:</strong> ${medicineName} ${dosage}</p>
          <p><strong>Scheduled Time:</strong> ${timeString}</p>
          <p><strong>Overdue by:</strong> ${delayMinutes} minutes</p>
          <p><strong>Current Time:</strong> ${new Date().toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: true
          })}</p>
        </div>
        
        <div style="padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107;">
          <h3>⚠️ Action Required</h3>
          <p>Please check on the patient immediately and ensure they take their medicine.</p>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>This is an automated alert from the HealthMonitor system.</p>
          <p>Generated at: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
    
    const textContent = `
🚨 MISSED DOSE ALERT 🚨

Patient: ${patientName}
Medicine: ${medicineName} ${dosage}
Scheduled Time: ${timeString}
Overdue by: ${delayMinutes} minutes
Current Time: ${new Date().toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    })}

Please check on the patient immediately!
This is an automated alert from the HealthMonitor system.
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || process.env.SMTP_USER,
      to: process.env.DOCTOR_EMAIL || 'doctor@example.com',
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      status: 'sent'
    };
    
  } catch (error) {
    console.error('❌ Failed to send email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send daily summary via email
 */
export async function sendDailySummaryEmail(userId, todaysMedicines, medicineLogs) {
  try {
    if (!transporter) {
      console.log('📧 [SIMULATED EMAIL] Daily summary - email not configured');
      return { success: true, status: 'simulated' };
    }

    const totalMedicines = todaysMedicines.length;
    const takenMedicines = medicineLogs.length;
    const missedMedicines = totalMedicines - takenMedicines;
    const onTimeCount = medicineLogs.filter(log => log.isOnTime).length;
    const onTimeRate = takenMedicines > 0 ? Math.round((onTimeCount / takenMedicines) * 100) : 0;
    
    const subject = `📊 Daily Medicine Summary - ${new Date().toLocaleDateString()}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #007bff; color: white; padding: 20px; text-align: center;">
          <h1>📊 Daily Medicine Summary</h1>
          <p>Date: ${new Date().toLocaleDateString()}</p>
        </div>
        
        <div style="padding: 20px;">
          <h2>📈 Statistics</h2>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
            <div style="text-align: center; padding: 15px; background-color: #e9ecef; border-radius: 8px;">
              <h3 style="margin: 0; color: #007bff;">${totalMedicines}</h3>
              <p style="margin: 5px 0 0 0;">Total Medicines</p>
            </div>
            <div style="text-align: center; padding: 15px; background-color: #d4edda; border-radius: 8px;">
              <h3 style="margin: 0; color: #28a745;">${takenMedicines}</h3>
              <p style="margin: 5px 0 0 0;">Taken</p>
            </div>
            <div style="text-align: center; padding: 15px; background-color: ${missedMedicines > 0 ? '#f8d7da' : '#d4edda'}; border-radius: 8px;">
              <h3 style="margin: 0; color: ${missedMedicines > 0 ? '#dc3545' : '#28a745'};">${missedMedicines}</h3>
              <p style="margin: 5px 0 0 0;">Missed</p>
            </div>
            <div style="text-align: center; padding: 15px; background-color: #e2e3e5; border-radius: 8px;">
              <h3 style="margin: 0; color: #6c757d;">${onTimeRate}%</h3>
              <p style="margin: 5px 0 0 0;">On-time Rate</p>
            </div>
          </div>
          
          ${missedMedicines > 0 ? `
            <div style="padding: 15px; background-color: #f8d7da; border-left: 4px solid #dc3545; margin: 20px 0;">
              <h3 style="color: #dc3545; margin: 0 0 10px 0;">⚠️ Attention Required</h3>
              <p style="margin: 0;">Please check on missed medicines.</p>
            </div>
          ` : `
            <div style="padding: 15px; background-color: #d4edda; border-left: 4px solid #28a745; margin: 20px 0;">
              <h3 style="color: #28a745; margin: 0 0 10px 0;">✅ All Good!</h3>
              <p style="margin: 0;">All medicines taken successfully!</p>
            </div>
          `}
        </div>
        
        <div style="padding: 20px; text-align: center; color: #666; background-color: #f8f9fa;">
          <p>This is an automated daily summary from HealthMonitor.</p>
          <p>Generated at: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || process.env.SMTP_USER,
      to: process.env.DOCTOR_EMAIL || 'doctor@example.com',
      subject: subject,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Daily summary email sent:', result.messageId);
    
    return {
      success: true,
      messageId: result.messageId,
      status: 'sent'
    };
    
  } catch (error) {
    console.error('❌ Failed to send daily summary email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send abnormal vital readings alert via email
 */
export async function sendAbnormalVitalsEmail(patientData, abnormalVitals, timestamp) {
  try {
    if (!transporter) {
      console.log('📧 [SIMULATED EMAIL] Vital alert - email not configured - simulating email send');
      return {
        success: true,
        messageId: 'simulated_' + Date.now(),
        status: 'simulated'
      };
    }

    const patientName = patientData.patientName || patientData.name || 'Patient';
    const patientId = patientData.patientId || patientData.id || 'Unknown';
    const patientEmail = patientData.email || 'Not provided';
    
    const alertTime = new Date(timestamp);
    const timeString = alertTime.toLocaleString('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    
    // Format abnormal vitals for display
    const vitalDetails = abnormalVitals.map(vital => {
      const unit = getVitalUnit(vital.metric);
      const status = vital.status === 'critical' ? 'CRITICAL' : 'WARNING';
      return {
        name: getVitalDisplayName(vital.metric),
        value: vital.value,
        unit: unit,
        status: status,
        threshold: vital.threshold
      };
    });
    
    const subject = `🚨 Abnormal Health Vitals Alert for ${patientName}`;
    const htmlContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #dc3545; color: white; padding: 20px; text-align: center;">
          <h1>🚨 ABNORMAL VITALS ALERT 🚨</h1>
        </div>
        
        <div style="padding: 20px; background-color: #f9f9f9;">
          <h2>Patient Information</h2>
          <p><strong>Patient Name:</strong> ${patientName}</p>
          <p><strong>Patient ID:</strong> ${patientId}</p>
          <p><strong>Patient Email:</strong> ${patientEmail}</p>
          <p><strong>Alert Time:</strong> ${timeString}</p>
        </div>
        
        <div style="padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107;">
          <h3>⚠️ Abnormal Vital Readings</h3>
          <p><strong>This vital reading was abnormal for 3 consecutive times. Immediate medical attention may be required.</strong></p>
        </div>
        
        <div style="padding: 20px;">
          <h3>📊 Vital Details</h3>
          <div style="background-color: white; border: 1px solid #dee2e6; border-radius: 8px; overflow: hidden;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead style="background-color: #f8f9fa;">
                <tr>
                  <th style="padding: 12px; text-align: left; border-bottom: 1px solid #dee2e6;">Vital</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6;">Value</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6;">Status</th>
                  <th style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6;">Threshold</th>
                </tr>
              </thead>
              <tbody>
                ${vitalDetails.map(vital => `
                  <tr style="background-color: ${vital.status === 'CRITICAL' ? '#f8d7da' : '#fff3cd'};">
                    <td style="padding: 12px; border-bottom: 1px solid #dee2e6; font-weight: bold;">${vital.name}</td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6; font-weight: bold; color: ${vital.status === 'CRITICAL' ? '#dc3545' : '#856404'};">${vital.value} ${vital.unit}</td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6;">
                      <span style="background-color: ${vital.status === 'CRITICAL' ? '#dc3545' : '#ffc107'}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold;">
                        ${vital.status}
                      </span>
                    </td>
                    <td style="padding: 12px; text-align: center; border-bottom: 1px solid #dee2e6; color: #6c757d;">${vital.threshold}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
        
        <div style="padding: 20px; background-color: #f8d7da; border-left: 4px solid #dc3545;">
          <h3 style="color: #dc3545; margin: 0 0 10px 0;">🚨 Immediate Action Required</h3>
          <p style="margin: 0;">Please check on the patient immediately and assess their condition. These vital readings indicate potential health concerns that require immediate medical attention.</p>
        </div>
        
        <div style="padding: 20px; text-align: center; color: #666; background-color: #f8f9fa;">
          <p>This is an automated alert from the HealthMonitor system.</p>
          <p>Generated at: ${new Date().toLocaleString()}</p>
        </div>
      </div>
    `;
    
    const textContent = `
🚨 ABNORMAL VITALS ALERT 🚨

Patient Information:
- Patient Name: ${patientName}
- Patient ID: ${patientId}
- Patient Email: ${patientEmail}
- Alert Time: ${timeString}

ABNORMAL VITAL READINGS:
${vitalDetails.map(vital => `- ${vital.name}: ${vital.value} ${vital.unit} (${vital.status}) - Threshold: ${vital.threshold}`).join('\n')}

⚠️ This vital reading was abnormal for 3 consecutive times. Immediate medical attention may be required.

Please check on the patient immediately and assess their condition.

This is an automated alert from the HealthMonitor system.
Generated at: ${new Date().toLocaleString()}
    `;

    const mailOptions = {
      from: process.env.GMAIL_USER || process.env.SMTP_USER,
      to: process.env.DOCTOR_EMAIL || 'doctor@example.com',
      subject: subject,
      text: textContent,
      html: htmlContent
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Abnormal vitals email sent successfully:', result.messageId);
    console.log('📧 Email Details:');
    console.log('   From:', mailOptions.from);
    console.log('   To:', mailOptions.to);
    console.log('   Subject:', mailOptions.subject);
    console.log('   Message ID:', result.messageId);
    console.log('✅ ALERT MAIL SENT SUCCESSFULLY!');
    
    return {
      success: true,
      messageId: result.messageId,
      status: 'sent'
    };
    
  } catch (error) {
    console.error('❌ Failed to send abnormal vitals email:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Get display name for vital metric
 */
function getVitalDisplayName(metric) {
  const displayNames = {
    heartRate: 'Heart Rate',
    spo2: 'Blood Oxygen (SpO₂)',
    bodyTemp: 'Body Temperature',
    ambientTemp: 'Ambient Temperature',
    accMagnitude: 'Acceleration Magnitude',
    fallDetected: 'Fall Detection'
  };
  return displayNames[metric] || metric;
}

/**
 * Get unit for vital metric
 */
function getVitalUnit(metric) {
  const units = {
    heartRate: 'BPM',
    spo2: '%',
    bodyTemp: '°C',
    ambientTemp: '°C',
    accMagnitude: 'g',
    fallDetected: ''
  };
  return units[metric] || '';
}