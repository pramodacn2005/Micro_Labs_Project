import React, { useState, useEffect } from 'react';

export default function DocumentPreview({ file, className = "" }) {
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    generatePreview();
    return () => {
      // Cleanup preview URL when component unmounts
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [file]);

  const generatePreview = async () => {
    if (!file) return;

    setIsLoading(true);
    setError(null);

    try {
      // For images, create a preview directly
      if (file.fileType?.startsWith('image/')) {
        if (file.isBase64 && file.base64Data) {
          setPreviewUrl(file.base64Data);
        } else if (file.downloadURL || file.viewUrl) {
          setPreviewUrl(file.downloadURL || file.viewUrl);
        }
        setIsLoading(false);
        return;
      }

      // For PDFs, we'll show a PDF icon for now
      // In a real implementation, you might want to use a PDF.js library
      if (file.fileType === 'application/pdf') {
        setPreviewUrl(null); // We'll show an icon instead
        setIsLoading(false);
        return;
      }

      // For other file types, no preview
      setPreviewUrl(null);
      setIsLoading(false);
    } catch (err) {
      console.error('Error generating preview:', err);
      setError('Failed to generate preview');
      setIsLoading(false);
    }
  };

  const getFileIcon = (fileType) => {
    if (fileType === 'application/pdf') return '📄';
    if (fileType?.startsWith('image/')) return '🖼️';
    if (fileType?.includes('word')) return '📝';
    if (fileType?.includes('excel')) return '📊';
    if (fileType?.includes('powerpoint')) return '📊';
    return '📁';
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`flex items-center justify-center bg-red-50 rounded ${className}`}>
        <span className="text-red-500 text-xs">Preview Error</span>
      </div>
    );
  }

  if (previewUrl && file.fileType?.startsWith('image/')) {
    return (
      <div className={`relative ${className}`}>
        <img
          src={previewUrl}
          alt={file.documentName || file.fileName || 'Document preview'}
          className="w-full h-full object-cover rounded"
          onError={() => setError('Failed to load preview')}
        />
        <div className="absolute inset-0 bg-black bg-opacity-0 hover:bg-opacity-10 transition-opacity rounded"></div>
      </div>
    );
  }

  // For PDFs and other files, show an icon
  return (
    <div className={`flex items-center justify-center bg-gray-100 rounded ${className}`}>
      <span className="text-2xl">{getFileIcon(file.fileType)}</span>
    </div>
  );
}
