import React, { useState, useRef } from 'react';
import { Upload, X, File, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import { api } from '../services/apiClient';
import { Button } from './UIComponents';

interface FileUploadProps {
  onUploadSuccess?: (document: any) => void;
  onUploadError?: (error: string) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({
  onUploadSuccess,
  onUploadError
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [documentType, setDocumentType] = useState('OTHER');
  const [description, setDescription] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    if (!allowedTypes.includes(file.type)) {
      setUploadStatus('error');
      onUploadError?.('Invalid file type. Please upload PDF, DOC, DOCX, or image files.');
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatus('error');
      onUploadError?.('File too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
    setUploadStatus('idle');
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploading(true);
    setUploadProgress(0);

    try {
      // Simulate upload progress (in a real app, you'd use XMLHttpRequest or axios with onUploadProgress)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 100);

      const response = await api.uploadDocument(selectedFile, documentType, description);

      clearInterval(progressInterval);
      setUploadProgress(100);
      setUploadStatus('success');
      setUploading(false);

      // Reset form after 2 seconds
      setTimeout(() => {
        setSelectedFile(null);
        setDocumentType('OTHER');
        setDescription('');
        setUploadProgress(0);
        setUploadStatus('idle');
      }, 2000);

      onUploadSuccess?.((response as any).document);
    } catch (error: any) {
      setUploading(false);
      setUploadStatus('error');
      onUploadError?.(error.response?.data?.message || 'Upload failed');
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setUploadStatus('idle');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="space-y-4">
      {/* Drag & Drop Zone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
          isDragging
            ? 'border-primary-500 bg-primary-50'
            : 'border-slate-300 hover:border-primary-400 bg-slate-50'
        }`}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
          onChange={handleFileInputChange}
        />

        <Upload size={48} className={`mx-auto mb-4 ${isDragging ? 'text-primary-600' : 'text-slate-400'}`} />
        
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          {isDragging ? 'Drop your file here' : 'Upload Medical Document'}
        </h3>
        
        <p className="text-slate-500 text-sm mb-4">
          Drag and drop or click to browse
        </p>
        
        <p className="text-xs text-slate-400">
          Supported formats: PDF, DOC, DOCX, JPG, PNG • Max size: 10MB
        </p>
      </div>

      {/* Selected File Display */}
      {selectedFile && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-12 h-12 rounded-lg bg-primary-100 flex items-center justify-center flex-shrink-0">
                <File size={24} className="text-primary-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900 truncate">{selectedFile.name}</p>
                <p className="text-sm text-slate-500">{formatFileSize(selectedFile.size)}</p>
              </div>
            </div>
            
            {!uploading && uploadStatus !== 'success' && (
              <button
                onClick={handleRemoveFile}
                className="p-1 hover:bg-slate-100 rounded transition-colors"
              >
                <X size={20} className="text-slate-400" />
              </button>
            )}
          </div>

          {/* Document Type Selection */}
          {uploadStatus === 'idle' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Document Type
                </label>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="OTHER">Other</option>
                  <option value="PRESCRIPTION">Prescription</option>
                  <option value="LAB_REPORT">Lab Report</option>
                  <option value="MEDICAL_REPORT">Medical Report</option>
                  <option value="XRAY">X-Ray</option>
                  <option value="SCAN">Scan (CT/MRI)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add notes about this document..."
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                />
              </div>
            </div>
          )}

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Uploading...</span>
                <span className="text-primary-600 font-medium">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-primary-600 h-full transition-all duration-300 ease-out"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadStatus === 'success' && (
            <div className="flex items-center gap-2 text-green-600 bg-green-50 p-3 rounded-lg">
              <CheckCircle size={20} />
              <span className="font-medium">Upload successful!</span>
            </div>
          )}

          {/* Error Message */}
          {uploadStatus === 'error' && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 p-3 rounded-lg">
              <AlertCircle size={20} />
              <span className="font-medium">Upload failed. Please try again.</span>
            </div>
          )}

          {/* Upload Button */}
          {uploadStatus === 'idle' && (
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="w-full"
            >
              {uploading ? (
                <>
                  <Loader size={18} className="animate-spin mr-2" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload size={18} className="mr-2" />
                  Upload Document
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
