import React, { useState, useEffect } from 'react';
import { FileText, Pill, Download, Lock, Calendar, User, AlertCircle, X } from 'lucide-react';
import { Card, Badge, Button } from './UIComponents';
import { api } from '../services/apiClient';

interface Prescription {
    id: number;
    doctorName: string;
    diagnosis: string;
    medicines: Array<{
        name: string;
        dosage: string;
        duration: string;
        instruction: string;
    }>;
    date: string;
    createdAt: string;
}

interface Document {
    id: number;
    fileName: string;
    filePath: string;
    category: string;
    description?: string;
    uploadDate: string;
}

interface DoctorPatientHistoryViewProps {
    patientId: number;
    patientName: string;
    onClose?: () => void;
}

export const DoctorPatientHistoryView: React.FC<DoctorPatientHistoryViewProps> = ({
    patientId,
    patientName,
    onClose
}) => {
    const [activeTab, setActiveTab] = useState<'PRESCRIPTIONS' | 'DOCUMENTS'>('PRESCRIPTIONS');
    const [prescriptions, setPrescriptions] = useState<Prescription[]>([]);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchMedicalHistory();
    }, [patientId]);

    const fetchMedicalHistory = async () => {
        try {
            setLoading(true);
            setError(null);

            // Fetch prescriptions
            const prescData = await api.getPatientPrescriptions(patientId);
            setPrescriptions(prescData);

            // Fetch documents
            const docsData = await api.getPatientDocuments(patientId);
            setDocuments(docsData);
        } catch (err: any) {
            console.error('Error fetching medical history:', err);
            setError(err.message || 'Failed to load medical history');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadDocument = async (documentId: number, fileName: string) => {
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
            alert('Failed to download document');
        }
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="bg-gradient-to-r from-primary-600 to-blue-600 text-white p-6">
                    <div className="flex justify-between items-start">
                        <div>
                            <h2 className="text-2xl font-bold mb-1">Medical History</h2>
                            <p className="text-primary-100 flex items-center gap-2">
                                <User size={16} />
                                {patientName}
                            </p>
                        </div>
                        {onClose && (
                            <button
                                onClick={onClose}
                                className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
                            >
                                <X size={24} />
                            </button>
                        )}
                    </div>
                </div>

                {/* Privacy Notice */}
                <div className="px-6 pt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
                        <Lock className="text-blue-600 flex-shrink-0 mt-0.5" size={18} />
                        <p className="text-sm text-blue-800">
                            Viewing patient's shared medical history. Private items are hidden per patient preferences.
                        </p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="border-b border-gray-200 px-6 mt-4">
                    <div className="flex gap-4">
                        <button
                            onClick={() => setActiveTab('PRESCRIPTIONS')}
                            className={`py-3 px-4 border-b-2 font-medium transition-colors ${activeTab === 'PRESCRIPTIONS'
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
                            className={`py-3 px-4 border-b-2 font-medium transition-colors ${activeTab === 'DOCUMENTS'
                                    ? 'border-primary-600 text-primary-600'
                                    : 'border-transparent text-gray-600 hover:text-gray-900'
                                }`}
                        >
                            <div className="flex items-center gap-2">
                                <FileText size={18} />
                                Documents ({documents.length})
                            </div>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                            <p className="mt-4 text-gray-600">Loading medical history...</p>
                        </div>
                    ) : error ? (
                        <div className="text-center py-12">
                            <AlertCircle className="mx-auto text-red-500 mb-3" size={48} />
                            <p className="text-red-600 font-semibold">{error}</p>
                        </div>
                    ) : (
                        <>
                            {/* Prescriptions Tab */}
                            {activeTab === 'PRESCRIPTIONS' && (
                                <div className="space-y-4">
                                    {prescriptions.length === 0 ? (
                                        <div className="text-center py-12">
                                            <Pill className="mx-auto text-gray-400 mb-3" size={48} />
                                            <p className="text-gray-600">No prescriptions available</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Patient has no shared prescriptions or history sharing is disabled
                                            </p>
                                        </div>
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
                                <div className="space-y-3">
                                    {documents.length === 0 ? (
                                        <div className="text-center py-12">
                                            <FileText className="mx-auto text-gray-400 mb-3" size={48} />
                                            <p className="text-gray-600">No documents available</p>
                                            <p className="text-sm text-gray-500 mt-1">
                                                Patient has no shared documents or history sharing is disabled
                                            </p>
                                        </div>
                                    ) : (
                                        documents.map((doc) => (
                                            <Card key={doc.id} className="p-4 hover:shadow-md transition-shadow">
                                                <div className="flex items-start gap-4">
                                                    <div className="flex-shrink-0 p-3 bg-primary-100 rounded-lg">
                                                        <FileText className="text-primary-600" size={24} />
                                                    </div>

                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-3 mb-2">
                                                            <div className="flex-1">
                                                                <h4 className="font-semibold text-slate-900 truncate">
                                                                    {doc.fileName}
                                                                </h4>
                                                                <div className="flex items-center gap-3 mt-1 text-sm text-gray-600">
                                                                    <span>
                                                                        {new Date(doc.uploadDate).toLocaleDateString()}
                                                                    </span>
                                                                    <Badge variant={getCategoryColor(doc.category)} size="sm">
                                                                        {doc.category.replace('_', ' ')}
                                                                    </Badge>
                                                                </div>
                                                                {doc.description && (
                                                                    <p className="text-sm text-gray-600 mt-1">{doc.description}</p>
                                                                )}
                                                            </div>
                                                        </div>

                                                        <Button
                                                            onClick={() => handleDownloadDocument(doc.id, doc.fileName)}
                                                            variant="outline"
                                                            size="sm"
                                                        >
                                                            <Download size={16} />
                                                            Download
                                                        </Button>
                                                    </div>
                                                </div>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};
