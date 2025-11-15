import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../contexts/AuthContext";
import { uploadFileToDatabase, getUserPrescriptions, deletePrescription, getFileIcon } from "../services/firebaseDatabaseService";
import SuccessPopup from "./SuccessPopup";
import DocumentPreview from "./DocumentPreview";

export default function History() {
  const { userData, user } = useAuth();
  const patientName = userData?.fullName || user?.displayName || "User";
  const [files, setFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [filterType, setFilterType] = useState("all");
  const [filterDate, setFilterDate] = useState("all");
  const [filterDoctor, setFilterDoctor] = useState("all");
  const [filterDocumentType, setFilterDocumentType] = useState("all");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadedBy, setUploadedBy] = useState("Doctor"); // Default to Doctor for medical file uploads
  const [doctorName, setDoctorName] = useState(""); // Doctor name field
  const [documentType, setDocumentType] = useState("prescription"); // Document type
  const [fileDescription, setFileDescription] = useState(""); // Description for the uploaded file
  const [dragActive, setDragActive] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef(null);

  // Load files from Firebase
  useEffect(() => {
    loadFiles();
  }, [user?.uid, filterType, filterDate, filterDoctor, filterDocumentType]);

  const loadFiles = async () => {
    try {
      if (!user?.uid) {
        console.log("No user ID available");
        setFiles([]);
        return;
      }

      console.log("Loading prescriptions for user:", user.uid);
      const result = await getUserPrescriptions(user.uid, {
        type: filterType,
        date: filterDate,
        doctor: filterDoctor,
        documentType: filterDocumentType
      });
      
      if (result.success) {
        console.log("Prescriptions loaded successfully:", result.files.length);
        setFiles(result.files);
      } else {
        console.error("Failed to load prescriptions:", result.error);
        setFiles([]);
      }
    } catch (error) {
      console.error("Error loading prescriptions:", error);
      setFiles([]);
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleFiles(e.target.files);
    }
  };

  const handleFiles = async (fileList) => {
    const filesArray = Array.from(fileList);
    const validFiles = filesArray.filter(file => {
      const isValidType = file.type === "application/pdf" || 
                         file.type.startsWith("image/");
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB limit
      
      if (!isValidType) {
        alert(`File ${file.name} is not a valid PDF or image file.`);
        return false;
      }
      if (!isValidSize) {
        alert(`File ${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const uploadedFiles = [];
      
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        setUploadProgress((i / validFiles.length) * 100);
        
        const result = await uploadFileToDatabase(file, user.uid, {
          patientName,
          uploadedBy,
          doctorName,
          documentType,
          description: fileDescription
        });
        
        if (result.success) {
          uploadedFiles.push(result.file);
        } else {
          console.error(`Failed to upload ${file.name}:`, result.error);
        }
      }

      if (uploadedFiles.length > 0) {
        // Update the files list with new uploads
        setFiles(prev => [...uploadedFiles, ...prev]);
        setUploadProgress(100);
        
        // Show success popup
        setSuccessMessage(`${uploadedFiles.length} file(s) uploaded successfully!`);
        setShowSuccessPopup(true);
        
        // Close modal and reset form
        handleCloseModal();
      } else {
        throw new Error('No files were uploaded successfully');
      }
    } catch (error) {
      console.error("Upload error:", error);
      alert("❌ Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDownload = (file) => {
    try {
      // For Firebase Database files (base64), create download link
      if (file.base64Data) {
        const link = document.createElement('a');
        link.href = file.base64Data;
        link.download = file.documentName || file.fileName || 'document';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (file.downloadURL) {
        // Fallback: try download URL
        const link = document.createElement('a');
        link.href = file.downloadURL;
        link.download = file.documentName || file.fileName || 'document';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error('No data available for download');
        alert('Unable to download this file. No data available.');
      }
    } catch (error) {
      console.error('Download error:', error);
      alert('Error downloading file: ' + error.message);
    }
  };

  const handleView = (file) => {
    try {
      console.log('🔍 Viewing file:', file); // Debug log
      
      if (file.base64Data) {
        // Method 1: Try to open base64 data directly
        try {
          window.open(file.base64Data, '_blank');
          return;
        } catch (directError) {
          console.warn('Direct base64 open failed, trying iframe method:', directError);
        }
        
        // Method 2: Create a new window with iframe
        try {
          const newWindow = window.open('', '_blank');
          if (newWindow) {
            newWindow.document.write(`
              <html>
                <head>
                  <title>${file.documentName || file.fileName || 'Document'}</title>
                  <style>
                    body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                    iframe { width: 100%; height: calc(100vh - 40px); border: none; }
                    .header { margin-bottom: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; }
                    .error { color: red; margin: 20px; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <h2>${file.documentName || file.fileName || 'Document'}</h2>
                    <p>Type: ${file.documentType || 'Unknown'} | Size: ${file.fileSize || 'Unknown'}</p>
                  </div>
                  <iframe src="${file.base64Data}" type="${file.fileType || 'application/pdf'}"></iframe>
                  <div class="error">
                    <p>If the document doesn't display above, try downloading it instead.</p>
                    <button onclick="window.location.href='${file.base64Data}'" style="padding: 10px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">Download File</button>
                  </div>
                </body>
              </html>
            `);
            newWindow.document.close();
            return;
          }
        } catch (iframeError) {
          console.warn('Iframe method failed:', iframeError);
        }
        
        // Method 3: Force download as fallback
        console.log('All view methods failed, forcing download...');
        const link = document.createElement('a');
        link.href = file.base64Data;
        link.download = file.documentName || file.fileName || 'document';
        link.target = '_blank';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
      } else if (file.downloadURL) {
        // Fallback: try download URL
        window.open(file.downloadURL, '_blank');
      } else {
        console.error('No data available for viewing');
        alert('Unable to view this file. No data available.');
      }
    } catch (error) {
      console.error('Error viewing file:', error);
      alert('Error opening file: ' + error.message);
    }
  };

  const handleDelete = async (file) => {
    if (window.confirm("Are you sure you want to delete this prescription?")) {
      try {
        const result = await deletePrescription(file.id, user.uid);

        if (result.success) {
          setFiles(prev => prev.filter(f => f.id !== file.id));
          setSuccessMessage("Prescription deleted successfully!");
          setShowSuccessPopup(true);
        } else {
          throw new Error(result.error || 'Delete failed');
        }
      } catch (error) {
        console.error("Delete error:", error);
        alert("❌ Failed to delete prescription. Please try again.");
      }
    }
  };

  const handleCloseModal = () => {
    setShowUploadModal(false);
    setFileDescription("");
    setUploadedBy("Doctor");
    setDoctorName("");
    setDocumentType("prescription");
  };

  // Files are already filtered by the backend API
  const filteredFiles = files;

  const formatDate = (date) => {
    // Handle both Date objects and date strings
    const dateObj = date instanceof Date ? date : new Date(date);
    
    // Check if the date is valid
    if (isNaN(dateObj.getTime())) {
      return 'Invalid Date';
    }
    
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // getFileIcon is now imported from the service

  return (
    <div className="space-y-6">
      {/* Success Popup */}
      <SuccessPopup
        isVisible={showSuccessPopup}
        message={successMessage}
        onClose={() => setShowSuccessPopup(false)}
      />
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">History for {patientName}</h1>
          <p className="text-gray-600">Manage your prescriptions, reports, and medical documents</p>
        </div>
        
        <button
          onClick={() => setShowUploadModal(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors flex items-center space-x-2"
        >
          <span>+</span>
          <span>Add Prescription/Report</span>
        </button>
      </div>

      {/* Filters */}
      <div className="p-4 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">File Type:</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Types</option>
              <option value="pdf">PDF</option>
              <option value="image">Image</option>
            </select>
          </div>
          
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Document Type:</label>
            <select
              value={filterDocumentType}
              onChange={(e) => setFilterDocumentType(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Documents</option>
              <option value="prescription">Prescription</option>
              <option value="report">Medical Report</option>
              <option value="lab_result">Lab Result</option>
              <option value="xray">X-Ray</option>
              <option value="scan">Scan (CT/MRI)</option>
              <option value="other">Other</option>
            </select>
          </div>
          
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Doctor:</label>
            <input
              type="text"
              value={filterDoctor}
              onChange={(e) => setFilterDoctor(e.target.value)}
              placeholder="Search by doctor name..."
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-medium text-gray-700">Date:</label>
            <select
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
        
        {/* Clear Filters Button */}
        <div className="mt-4 flex justify-end">
          <button
            onClick={() => {
              setFilterType("all");
              setFilterDate("all");
              setFilterDoctor("all");
              setFilterDocumentType("all");
            }}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Clear All Filters
          </button>
        </div>
      </div>

      {/* Files List */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {filteredFiles.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl text-gray-300 mb-4">📁</div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">No documents uploaded yet</h3>
            <p className="text-gray-600">
              {filterType !== "all" || filterDate !== "all" 
                ? "No files match your current filters." 
                : "Upload your first prescription or report to get started."
              }
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Document
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Doctor Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Uploaded By
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredFiles.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="w-12 h-12 mr-3 flex-shrink-0">
                          <DocumentPreview 
                            file={file} 
                            className="w-full h-full"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate">
                            {file.documentName || file.fileName || 'Unknown File'}
                          </div>
                          {file.description && (
                            <div className="text-xs text-gray-500 mt-1 truncate">{file.description}</div>
                          )}
                          <div className="text-xs text-gray-400 mt-1">
                            {file.fileSize || 'Unknown Size'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        file.documentType === "prescription" ? "bg-green-100 text-green-800" :
                        file.documentType === "report" ? "bg-blue-100 text-blue-800" :
                        file.documentType === "lab_result" ? "bg-purple-100 text-purple-800" :
                        file.documentType === "xray" ? "bg-yellow-100 text-yellow-800" :
                        file.documentType === "scan" ? "bg-indigo-100 text-indigo-800" :
                        "bg-gray-100 text-gray-800"
                      }`}>
                        {file.documentType ? file.documentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) : 
                         file.fileType === "application/pdf" ? "PDF" : 
                         file.fileType?.startsWith("image/") ? "Image" : 
                         'Other'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.doctorName || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.uploadedBy || 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {file.uploadedDate ? formatDate(file.uploadedDate) : 'Unknown Date'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleView(file)}
                          className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                          title="View file"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleDownload(file)}
                          className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                          title="Download file"
                        >
                          ⬇️
                        </button>
                        <button
                          onClick={() => handleDelete(file)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                          title="Delete file"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Upload Medical Files</h3>
              <button
                onClick={handleCloseModal}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            {/* Uploader and Description Fields */}
            <div className="mb-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Uploaded By
                  </label>
                  <select
                    value={uploadedBy}
                    onChange={(e) => setUploadedBy(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="Doctor">Doctor</option>
                    <option value="Nurse">Nurse</option>
                    <option value="Patient">Patient</option>
                    <option value="Caregiver">Caregiver</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Document Type
                  </label>
                  <select
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="prescription">Prescription</option>
                    <option value="report">Medical Report</option>
                    <option value="lab_result">Lab Result</option>
                    <option value="xray">X-Ray</option>
                    <option value="scan">Scan (CT/MRI)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Doctor Name (Optional)
                </label>
                <input
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  placeholder="e.g., Dr. John Smith"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  File Description (Optional)
                </label>
                <input
                  type="text"
                  value={fileDescription}
                  onChange={(e) => setFileDescription(e.target.value)}
                  placeholder="e.g., Prescription for diabetes medication"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div
              className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                dragActive 
                  ? "border-blue-500 bg-blue-50" 
                  : "border-gray-300 hover:border-gray-400"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <div className="text-4xl text-gray-400 mb-4">📁</div>
              <p className="text-lg font-medium text-gray-900 mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-gray-500 mb-4">
                Supports PDF and image files up to 10MB each
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                disabled={isUploading}
              >
                {isUploading ? "Uploading..." : "Choose Files"}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.jpg,.jpeg,.png,.gif"
                onChange={handleFileInput}
                className="hidden"
                disabled={isUploading}
              />
            </div>
            
            {isUploading && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Uploading...</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
