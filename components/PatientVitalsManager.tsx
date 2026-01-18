import React, { useState, useEffect } from 'react';
import { Activity, Heart, Weight, Droplet, Thermometer, Wind, AlertCircle, Save, Edit2, Check, X } from 'lucide-react';
import { api } from '../services/apiClient';
import { Button, Card } from './UIComponents';

interface VitalsData {
    blood_group?: string;
    height?: number;
    weight?: number;
    blood_pressure?: string;
    heart_rate?: number;
    temperature?: number;
    oxygen_saturation?: number;
    allergies?: string;
    chronic_conditions?: string;
    current_medications?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    last_updated?: string;
}

export const PatientVitalsManager: React.FC = () => {
    const [vitals, setVitals] = useState<VitalsData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [editedVitals, setEditedVitals] = useState<VitalsData>({});
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchVitals();
    }, []);

    const fetchVitals = async () => {
        try {
            setIsLoading(true);
            const response = await api.get<{ vitals: VitalsData | null }>('/vitals');
            setVitals(response.data.vitals);
            setEditedVitals(response.data.vitals || {});
            setIsLoading(false);
        } catch (error) {
            console.error('Failed to fetch vitals:', error);
            setIsLoading(false);
        }
    };

    const handleInputChange = (field: keyof VitalsData, value: any) => {
        setEditedVitals(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        try {
            setIsSaving(true);
            const response = await api.put<{ message: string; vitals: VitalsData }>('/vitals', editedVitals);
            setVitals(response.data.vitals);
            setIsEditing(false);
            setMessage({ type: 'success', text: 'Vitals updated successfully!' });
            setTimeout(() => setMessage(null), 3000);
            setIsSaving(false);
        } catch (error) {
            console.error('Failed to save vitals:', error);
            setMessage({ type: 'error', text: 'Failed to update vitals' });
            setTimeout(() => setMessage(null), 3000);
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setEditedVitals(vitals || {});
        setIsEditing(false);
    };

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Activity className="h-7 w-7 text-blue-600" />
                        My Health Profile
                    </h2>
                    <p className="text-gray-600 mt-1">Manage your vital signs and health information</p>
                </div>
                {!isEditing ? (
                    <Button onClick={() => setIsEditing(true)} variant="primary">
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Profile
                    </Button>
                ) : (
                    <div className="flex gap-2">
                        <Button onClick={handleCancel} variant="secondary">
                            <X className="h-4 w-4 mr-2" />
                            Cancel
                        </Button>
                        <Button onClick={handleSave} variant="primary" disabled={isSaving}>
                            {isSaving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Save Changes
                                </>
                            )}
                        </Button>
                    </div>
                )}
            </div>

            {/* Success/Error Message */}
            {message && (
                <div className={`p-4 rounded-lg ${message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
                    <div className="flex items-center gap-2">
                        {message.type === 'success' ? <Check className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                        {message.text}
                    </div>
                </div>
            )}

            {/* Basic Vitals */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Heart className="h-5 w-5 text-red-500" />
                    Basic Vitals
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Blood Group */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Blood Group</label>
                        {isEditing ? (
                            <select
                                value={editedVitals.blood_group || ''}
                                onChange={(e) => handleInputChange('blood_group', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Select Blood Group</option>
                                {bloodGroups.map(bg => (
                                    <option key={bg} value={bg}>{bg}</option>
                                ))}
                            </select>
                        ) : (
                            <div className="flex items-center gap-2 p-3 bg-red-50 rounded-lg">
                                <Droplet className="h-5 w-5 text-red-600" />
                                <span className="text-lg font-semibold text-red-900">{vitals?.blood_group || 'Not set'}</span>
                            </div>
                        )}
                    </div>

                    {/* Height */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Height (cm)</label>
                        {isEditing ? (
                            <input
                                type="number"
                                step="0.1"
                                value={editedVitals.height || ''}
                                onChange={(e) => handleInputChange('height', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="175.0"
                            />
                        ) : (
                            <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                                <Activity className="h-5 w-5 text-blue-600" />
                                <span className="text-lg font-semibold text-blue-900">{vitals?.height || 'Not set'} cm</span>
                            </div>
                        )}
                    </div>

                    {/* Weight */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                        {isEditing ? (
                            <input
                                type="number"
                                step="0.1"
                                value={editedVitals.weight || ''}
                                onChange={(e) => handleInputChange('weight', parseFloat(e.target.value))}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="70.0"
                            />
                        ) : (
                            <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                                <Weight className="h-5 w-5 text-green-600" />
                                <span className="text-lg font-semibold text-green-900">{vitals?.weight || 'Not set'} kg</span>
                            </div>
                        )}
                    </div>

                    {/* Blood Pressure */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Blood Pressure</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedVitals.blood_pressure || ''}
                                onChange={(e) => handleInputChange('blood_pressure', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="120/80"
                            />
                        ) : (
                            <div className="flex items-center gap-2 p-3 bg-purple-50 rounded-lg">
                                <Heart className="h-5 w-5 text-purple-600" />
                                <span className="text-lg font-semibold text-purple-900">{vitals?.blood_pressure || 'Not set'}</span>
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Additional Information */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    Medical Information
                </h3>
                <div className="space-y-4">
                    {/* Allergies */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Allergies</label>
                        {isEditing ? (
                            <textarea
                                value={editedVitals.allergies || ''}
                                onChange={(e) => handleInputChange('allergies', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={2}
                                placeholder="e.g., Penicillin, Pollen, None"
                            />
                        ) : (
                            <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{vitals?.allergies || 'Not specified'}</p>
                        )}
                    </div>

                    {/* Chronic Conditions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Chronic Conditions / Common Problems</label>
                        {isEditing ? (
                            <textarea
                                value={editedVitals.chronic_conditions || ''}
                                onChange={(e) => handleInputChange('chronic_conditions', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="e.g., Diabetes, Hypertension, Asthma"
                            />
                        ) : (
                            <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{vitals?.chronic_conditions || 'None reported'}</p>
                        )}
                    </div>

                    {/* Current Medications */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Current Medications</label>
                        {isEditing ? (
                            <textarea
                                value={editedVitals.current_medications || ''}
                                onChange={(e) => handleInputChange('current_medications', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={3}
                                placeholder="e.g., Metformin 500mg twice daily"
                            />
                        ) : (
                            <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{vitals?.current_medications || 'None'}</p>
                        )}
                    </div>
                </div>
            </Card>

            {/* Emergency Contact */}
            <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    Emergency Contact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
                        {isEditing ? (
                            <input
                                type="text"
                                value={editedVitals.emergency_contact_name || ''}
                                onChange={(e) => handleInputChange('emergency_contact_name', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="John Doe"
                            />
                        ) : (
                            <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{vitals?.emergency_contact_name || 'Not set'}</p>
                        )}
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                        {isEditing ? (
                            <input
                                type="tel"
                                value={editedVitals.emergency_contact_phone || ''}
                                onChange={(e) => handleInputChange('emergency_contact_phone', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                placeholder="+880-1712-345678"
                            />
                        ) : (
                            <p className="p-3 bg-gray-50 rounded-lg text-gray-900">{vitals?.emergency_contact_phone || 'Not set'}</p>
                        )}
                    </div>
                </div>
            </Card>

            {vitals?.last_updated && (
                <p className="text-sm text-gray-500 text-center">
                    Last updated: {new Date(vitals.last_updated).toLocaleString()}
                </p>
            )}
        </div>
    );
};
