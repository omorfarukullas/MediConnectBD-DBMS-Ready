/**
 * Doctor Medical History Modal
 * Time-gated access to patient records with prescription and report upload
 */

import React, { useState, useEffect } from 'react';
import { 
  X, FileText, Download, Upload, Clock, AlertCircle, 
  Pill, Activity, Calendar, User, Check 
} from 'lucide-react';
import { Card, Button, Badge } from './UIComponents';
import { Appointment } from '../types';
import { isAppointmentActive, formatTime } from '../utils/timeValidation';
import { api } from '../services/apiClient';

interface MedicalHistoryModalProps {
  appointment: Appointment;
  patientId: number;
  onClose: () => void;
  onRefresh?: () => void;
}

interface MedicalDocument {
  id: number;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadDate: string;
  category: string;
  isPrivate: boolean; // Privacy flag - doctor cannot see private documents
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

export const MedicalHistoryModal: React.FC<MedicalHistoryModalProps> = ({
  appointment,
  patientId,
  onClose,
  onRefresh
}) => {
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'PRESCRIPTIONS' | 'REPORTS'>('PRESCRIPTIONS');
  
  // Prescription form state
  const [showPrescriptionForm, setShowPrescriptionForm] = useState(false);
  const [prescriptionData, setPrescriptionData] = useState({
    diagnosis: '',
    medicines: [{ name: '', dosage: '', duration: '', instruction: '' }]
  });

  // Upload state
  const [uploadingReport, setUploadingReport] = useState(false);

  // Doctors always have access to patient records
  const isActive = true;

  // Fetch patient medical history
  useEffect(() => {
    fetchMedicalHistory();
  }, [patientId]);

  const fetchMedicalHistory = async () => {
    try {
      setLoading(true);
      
      // Fetch documents (filtered by privacy - exclude isPrivate === true)
      const allDocuments: any = await api.getPatientDocuments(patientId);
      const visibleDocuments = Array.isArray(allDocuments) 
        ? allDocuments.filter((doc: MedicalDocument) => !doc.isPrivate)
        : [];
      setDocuments(visibleDocuments);

      // Fetch prescriptions
      const prescriptionData = await api.getPatientPrescriptions(patientId);
      setPrescriptions(prescriptionData);
    } catch (error) {
      console.error('Error fetching medical history:', error);
    } finally {
      setLoading(false);
    }
  };

  // Add medicine row
  const addMedicineRow = () => {
    setPrescriptionData({
      ...prescriptionData,
      medicines: [
        ...prescriptionData.medicines,
        { name: '', dosage: '', duration: '', instruction: '' }
      ]
    });
  };

  // Update medicine row
  const updateMedicine = (index: number, field: string, value: string) => {
    const updatedMedicines = [...prescriptionData.medicines];
    updatedMedicines[index] = { ...updatedMedicines[index], [field]: value };
    setPrescriptionData({ ...prescriptionData, medicines: updatedMedicines });
  };

  // Remove medicine row
  const removeMedicine = (index: number) => {
    const updatedMedicines = prescriptionData.medicines.filter((_, i) => i !== index);
    setPrescriptionData({ ...prescriptionData, medicines: updatedMedicines });
  };

  // Submit prescription
  const handleSubmitPrescription = async () => {
    try {
      await api.createPrescription({
        patientId,
        appointmentId: appointment.id,
        ...prescriptionData
      });

      alert('Prescription saved successfully');
      setShowPrescriptionForm(false);
      setPrescriptionData({
        diagnosis: '',
        medicines: [{ name: '', dosage: '', duration: '', instruction: '' }]
      });
      fetchMedicalHistory();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to save prescription');
    }
  };

  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setUploadingReport(true);
      
      await api.uploadDocument(file, 'MEDICAL_REPORT', `Report for appointment ${appointment.id}`);
      alert('Report uploaded successfully');
      fetchMedicalHistory();
    } catch (error: any) {
      alert(error.response?.data?.message || 'Failed to upload report');
    } finally {
      setUploadingReport(false);
    }
  };

  // Download file
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

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    else return (bytes / 1048576).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {appointment.patientName}'s Medical History
              </h2>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                <span className="flex items-center gap-1">
                  <Calendar size={14} />
                  {new Date(appointment.date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Clock size={14} />
                  {formatTime(appointment.time)}
                </span>
                {isActive ? (
                  <Badge variant="success">Active Now</Badge>
                ) : (
                  <Badge variant="gray">Time Expired</Badge>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X size={24} />
            </button>
          </div>

        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 px-6">
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
                Prescriptions
              </div>
            </button>
            <button
              onClick={() => setActiveTab('REPORTS')}
              className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                activeTab === 'REPORTS'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText size={18} />
                Reports & Documents
              </div>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
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
                  {/* Write New Prescription Button */}
                  <Button
                    onClick={() => setShowPrescriptionForm(!showPrescriptionForm)}
                    variant="primary"
                    disabled={!isActive}
                    className="w-full"
                  >
                    <Pill size={18} />
                    {showPrescriptionForm ? 'Cancel' : 'Write New Prescription'}
                  </Button>

                  {/* Prescription Form */}
                  {showPrescriptionForm && (
                    <Card className="p-4 bg-blue-50">
                      <h3 className="font-semibold text-lg mb-4">New Prescription</h3>
                      
                      {/* Diagnosis */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Diagnosis
                        </label>
                        <textarea
                          value={prescriptionData.diagnosis}
                          onChange={(e) => setPrescriptionData({ ...prescriptionData, diagnosis: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                          rows={3}
                          placeholder="Enter diagnosis..."
                        />
                      </div>

                      {/* Medicines */}
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Medicines
                        </label>
                        <div className="space-y-3">
                          {prescriptionData.medicines.map((medicine, index) => (
                            <div key={index} className="grid grid-cols-4 gap-2">
                              <input
                                type="text"
                                placeholder="Medicine name"
                                value={medicine.name}
                                onChange={(e) => updateMedicine(index, 'name', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <input
                                type="text"
                                placeholder="Dosage"
                                value={medicine.dosage}
                                onChange={(e) => updateMedicine(index, 'dosage', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <input
                                type="text"
                                placeholder="Duration"
                                value={medicine.duration}
                                onChange={(e) => updateMedicine(index, 'duration', e.target.value)}
                                className="px-3 py-2 border border-gray-300 rounded-lg"
                              />
                              <div className="flex gap-2">
                                <input
                                  type="text"
                                  placeholder="Instructions"
                                  value={medicine.instruction}
                                  onChange={(e) => updateMedicine(index, 'instruction', e.target.value)}
                                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
                                />
                                {prescriptionData.medicines.length > 1 && (
                                  <button
                                    onClick={() => removeMedicine(index)}
                                    className="text-red-600 hover:text-red-700"
                                  >
                                    <X size={20} />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        <Button
                          onClick={addMedicineRow}
                          variant="outline"
                          size="sm"
                          className="mt-2"
                        >
                          + Add Medicine
                        </Button>
                      </div>

                      {/* Submit */}
                      <Button
                        onClick={handleSubmitPrescription}
                        variant="primary"
                        className="w-full"
                      >
                        <Check size={18} />
                        Save Prescription
                      </Button>
                    </Card>
                  )}

                  {/* Previous Prescriptions */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Previous Prescriptions</h3>
                    {prescriptions.length === 0 ? (
                      <Card className="text-center py-8">
                        <Pill className="mx-auto text-gray-400 mb-2" size={40} />
                        <p className="text-gray-600">No prescriptions found</p>
                      </Card>
                    ) : (
                      prescriptions.map((prescription) => (
                        <Card key={prescription.id} className="p-4">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <p className="font-semibold text-slate-900">
                                Dr. {prescription.doctorName}
                              </p>
                              <p className="text-sm text-gray-600">
                                {new Date(prescription.date).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="mb-3">
                            <p className="text-sm font-medium text-gray-700">Diagnosis:</p>
                            <p className="text-gray-900">{prescription.diagnosis}</p>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-700 mb-2">Medicines:</p>
                            <div className="space-y-2">
                              {prescription.medicines.map((med, idx) => (
                                <div key={idx} className="text-sm bg-gray-50 p-2 rounded">
                                  <p className="font-medium">{med.name}</p>
                                  <p className="text-gray-600">
                                    {med.dosage} - {med.duration} - {med.instruction}
                                  </p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Reports Tab */}
              {activeTab === 'REPORTS' && (
                <div className="space-y-4">
                  {/* Upload Report Button */}
                  <div>
                    <input
                      type="file"
                      id="report-upload"
                      className="hidden"
                      onChange={handleFileUpload}
                      disabled={!isActive || uploadingReport}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    />
                    <label htmlFor="report-upload">
                      <Button
                        as="span"
                        variant="primary"
                        disabled={!isActive || uploadingReport}
                        className="w-full cursor-pointer"
                      >
                        <Upload size={18} />
                        {uploadingReport ? 'Uploading...' : 'Upload Report'}
                      </Button>
                    </label>
                  </div>

                  {/* Documents List */}
                  <div className="space-y-3">
                    <h3 className="font-semibold text-gray-900">Medical Reports & Documents</h3>
                    {documents.length === 0 ? (
                      <Card className="text-center py-8">
                        <FileText className="mx-auto text-gray-400 mb-2" size={40} />
                        <p className="text-gray-600">No documents found</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Patient may have set documents to private
                        </p>
                      </Card>
                    ) : (
                      documents.map((doc) => (
                        <Card key={doc.id} className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3 flex-1">
                              <div className="p-2 bg-primary-100 rounded-lg">
                                <FileText className="text-primary-600" size={20} />
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-slate-900">{doc.fileName}</p>
                                <p className="text-sm text-gray-600">
                                  {formatFileSize(doc.fileSize)} • {new Date(doc.uploadDate).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleDownload(doc.id, doc.fileName)}
                              variant="outline"
                              size="sm"
                              disabled={!isActive}
                            >
                              <Download size={16} />
                              Download
                            </Button>
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

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50">
          <Button onClick={onClose} variant="outline" className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
