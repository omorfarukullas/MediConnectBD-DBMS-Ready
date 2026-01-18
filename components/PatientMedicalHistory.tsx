/**
 * Patient Medical History Component with Privacy Controls
 * Allows patients to view, download, and control visibility of their medical records
 */

import React, { useState, useEffect } from 'react';
import { 
  FileText, Download, Eye, EyeOff, Pill, Upload, Trash2, 
  Lock, Unlock, AlertCircle, Calendar, User 
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UIComponents';
import { FileUpload } from '../components/FileUpload';
import { api } from '../services/apiClient';

interface MedicalDocument {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  category: string;
  isPrivate: boolean;
}

interface Prescription {
  id: number;
  doctorName: string;
  date: string;
  diagnosis: string;
  medicines: Array<{
    name: string;
    dosage: string;
    duration: string;
    instruction: string;
  }>;
}

export const PatientMedicalHistory = () => {
  const [activeTab, setActiveTab] = useState<'PRESCRIPTIONS' | 'DOCUMENTS'>('PRESCRIPTIONS');
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingPrivacy, setUpdatingPrivacy] = useState<number | null>(null);

  useEffect(() => {
    fetchMedicalHistory();
  }, []);

  const fetchMedicalHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch all documents (including private ones - patient can see all)
      const docsData = await api.getDocuments();
      setDocuments(docsData);

      // Fetch prescriptions
      const prescriptionsData = await api.getPrescriptions();
      setPrescriptions(prescriptionsData);
    } catch (error) {
      console.error('Error fetching medical history:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Toggle privacy setting for a document
   * When isPrivate = true, doctors cannot see this document
   * When isPrivate = false, doctors can view this document
   */
  const toggleDocumentPrivacy = async (documentId: number, currentPrivacy: boolean) => {
    try {
      setUpdatingPrivacy(documentId);
      
      await api.updateDocumentPrivacy(documentId, !currentPrivacy);
      
      // Update local state
      setDocuments(prevDocs =>
        prevDocs.map(doc =>
          doc.id === documentId
            ? { ...doc, isPrivate: !currentPrivacy }
            : doc
        )
      );
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to update privacy setting');
    } finally {
      setUpdatingPrivacy(null);
    }
  };

  /**
   * Download document - no time restrictions for patients
   */
  const handleDownload = async (documentId: number, fileName: string) => {
    try {
      const blob = await api.downloadDocument(documentId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      alert('Failed to download file');
    }
  };

  /**
   * Delete document
   */
  const handleDeleteDocument = async (documentId: number) => {
    if (!confirm('Are you sure you want to delete this document?')) return;

    try {
      await api.deleteDocument(documentId);
      setDocuments(prevDocs => prevDocs.filter(doc => doc.id !== documentId));
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to delete document');
    }
  };

  /**
   * Handle file upload success
   */
  const handleUploadSuccess = (document: MedicalDocument) => {
    setDocuments(prev => [document, ...prev]);
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  const getCategoryLabel = (category: string): string => {
    const labels: Record<string, string> = {
      'PRESCRIPTION': 'Prescription',
      'LAB_REPORT': 'Lab Report',
      'MEDICAL_REPORT': 'Medical Report',
      'XRAY': 'X-Ray',
      'SCAN': 'Scan',
      'OTHER': 'Other'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string): string => {
    const colors: Record<string, string> = {
      'PRESCRIPTION': 'blue',
      'LAB_REPORT': 'green',
      'MEDICAL_REPORT': 'purple',
      'XRAY': 'orange',
      'SCAN': 'red',
      'OTHER': 'gray'
    };
    return colors[category] || 'gray';
  };

  return (
    <div className="space-y-6 animate-fade-in pb-10">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">My Medical History</h2>
          <p className="text-gray-600 mt-1">View and manage your medical records</p>
        </div>
      </div>

      {/* Privacy Notice */}
      <Card className="bg-blue-50 border-blue-200">
        <div className="flex items-start gap-3">
          <Lock className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900">Privacy Controls</h3>
            <p className="text-sm text-blue-700 mt-1">
              Use the visibility toggle to control which documents your doctors can see. 
              Private documents are only visible to you.
            </p>
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <div className="flex gap-4">
          <button
            onClick={() => setActiveTab('PRESCRIPTIONS')}
            className={`py-3 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'PRESCRIPTIONS'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <Pill size={18} />
              Prescriptions ({prescriptions.length})
            </div>
          </button>
          <button
            onClick={() => setActiveTab('DOCUMENTS')}
            className={`py-3 px-4 border-b-2 font-medium transition-colors ${
              activeTab === 'DOCUMENTS'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-600 hover:text-gray-900'
            }`}
          >
            <div className="flex items-center gap-2">
              <FileText size={18} />
              Documents & Reports ({documents.length})
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading medical history...</p>
        </div>
      ) : (
        <>
          {/* Prescriptions Tab */}
          {activeTab === 'PRESCRIPTIONS' && (
            <div className="space-y-4">
              {prescriptions.length === 0 ? (
                <Card className="text-center py-12">
                  <Pill className="mx-auto text-gray-400 mb-3" size={48} />
                  <p className="text-gray-600">No prescriptions found</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Your prescriptions will appear here after doctor consultations
                  </p>
                </Card>
              ) : (
                prescriptions.map((prescription) => (
                  <Card key={prescription.id} className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <User className="text-primary-600" size={18} />
                          <p className="font-semibold text-slate-900">
                            Dr. {prescription.doctorName}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={14} />
                          {new Date(prescription.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <p className="text-sm font-medium text-gray-700 mb-1">Diagnosis:</p>
                      <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">
                        {prescription.diagnosis}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">Prescribed Medicines:</p>
                      <div className="space-y-2">
                        {prescription.medicines.map((medicine, idx) => (
                          <div
                            key={idx}
                            className="bg-blue-50 border border-blue-100 p-3 rounded-lg"
                          >
                            <p className="font-medium text-slate-900 mb-1">
                              {medicine.name}
                            </p>
                            <div className="grid grid-cols-3 gap-2 text-sm text-gray-600">
                              <div>
                                <span className="font-medium">Dosage:</span> {medicine.dosage}
                              </div>
                              <div>
                                <span className="font-medium">Duration:</span> {medicine.duration}
                              </div>
                              <div>
                                <span className="font-medium">Instructions:</span> {medicine.instruction}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </Card>
                ))
              )}
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'DOCUMENTS' && (
            <div className="space-y-4">
              {/* Upload Section */}
              <Card className="p-4 bg-gradient-to-r from-primary-50 to-blue-50">
                <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
                  <Upload className="text-primary-600" size={20} />
                  Upload New Document
                </h3>
                <FileUpload onUploadSuccess={handleUploadSuccess} />
              </Card>

              {/* Documents List */}
              <div className="space-y-3">
                <h3 className="font-semibold text-gray-900 text-lg">
                  My Documents & Reports
                </h3>
                
                {documents.length === 0 ? (
                  <Card className="text-center py-12">
                    <FileText className="mx-auto text-gray-400 mb-3" size={48} />
                    <p className="text-gray-600">No documents uploaded yet</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Upload your medical reports, lab results, and other documents
                    </p>
                  </Card>
                ) : (
                  documents.map((doc) => (
                    <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-start gap-4">
                        {/* File Icon */}
                        <div className="flex-shrink-0 p-3 bg-primary-100 rounded-lg">
                          <FileText className="text-primary-600" size={24} />
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-3 mb-2">
                            <div className="flex-1">
                              <h4 className="font-semibold text-slate-900 truncate">
                                {doc.fileName}
                              </h4>
                              <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                <span>{formatFileSize(doc.fileSize)}</span>
                                <span>•</span>
                                <span>
                                  {new Date(doc.uploadDate).toLocaleDateString()}
                                </span>
                                <Badge
                                  variant={getCategoryColor(doc.category)}
                                  size="sm"
                                >
                                  {getCategoryLabel(doc.category)}
                                </Badge>
                              </div>
                            </div>
                          </div>

                          {/* Privacy Toggle */}
                          <div className="flex items-center gap-3 mb-3">
                            <button
                              onClick={() => toggleDocumentPrivacy(doc.id, doc.isPrivate)}
                              disabled={updatingPrivacy === doc.id}
                              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                doc.isPrivate
                                  ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                                  : 'bg-green-100 text-green-700 hover:bg-green-200'
                              } ${updatingPrivacy === doc.id ? 'opacity-50 cursor-wait' : ''}`}
                            >
                              {doc.isPrivate ? (
                                <>
                                  <Lock size={14} />
                                  Private (Only You)
                                </>
                              ) : (
                                <>
                                  <Unlock size={14} />
                                  Visible to Doctors
                                </>
                              )}
                            </button>
                            
                            {doc.isPrivate && (
                              <span className="text-xs text-gray-500 flex items-center gap-1">
                                <AlertCircle size={12} />
                                Doctors cannot see this document
                              </span>
                            )}
                          </div>

                          {/* Action Buttons */}
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleDownload(doc.id, doc.fileName)}
                              variant="outline"
                              size="sm"
                            >
                              <Download size={16} />
                              Download
                            </Button>
                            
                            <Button
                              onClick={() => handleDeleteDocument(doc.id)}
                              variant="outline"
                              size="sm"
                              className="text-red-600 hover:text-red-700 hover:border-red-300"
                            >
                              <Trash2 size={16} />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
