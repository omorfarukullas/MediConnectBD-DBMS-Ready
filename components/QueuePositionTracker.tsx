import React, { useState, useEffect } from 'react';
import { Clock, Users, AlertCircle, CheckCircle2 } from 'lucide-react';
import { api } from '../services/apiClient';

interface QueuePosition {
    appointmentId: number;
    queueNumber: number;
    status: string;
    appointmentTime: string;
    doctorName: string;
    specialization: string;
    patientsAhead: number;
    estimatedWaitMinutes: number;
    isYourTurn: boolean;
}

const QueuePositionTracker: React.FC = () => {
    const [position, setPosition] = useState<QueuePosition | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPosition = async () => {
        try {
            setLoading(true);
            const response = await api.get('/queue/my-position');
            if (response.data.success) {
                setPosition(response.data.data);
            } else {
                setPosition(null);
            }
        } catch (err: any) {
            if (err.response?.status === 404 || err.response?.data?.message?.includes('No active')) {
                setPosition(null);
            } else {
                setError(err.response?.data?.message || 'Failed to fetch queue position');
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPosition();
        // Refresh every 15 seconds for real-time updates
        const interval = setInterval(fetchPosition, 15000);
        return () => clearInterval(interval);
    }, []);

    if (loading && !position) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <p className="ml-3 text-gray-600">Checking queue position...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
            </div>
        );
    }

    if (!position) {
        return (
            <div className="bg-gray-50 rounded-lg p-6 text-center">
                <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p className="text-gray-600">No active appointments in queue today</p>
            </div>
        );
    }

    const getStatusDisplay = () => {
        if (position.isYourTurn || position.status === 'IN_PROGRESS') {
            return {
                icon: <AlertCircle className="w-6 h-6 text-blue-600" />,
                text: "It's your turn!",
                subtext: "Please proceed to the doctor",
                bgColor: 'bg-blue-50',
                borderColor: 'border-blue-200',
                textColor: 'text-blue-800'
            };
        }

        if (position.status === 'COMPLETED') {
            return {
                icon: <CheckCircle2 className="w-6 h-6 text-green-600" />,
                text: "Appointment Completed",
                subtext: "Thank you for visiting",
                bgColor: 'bg-green-50',
                borderColor: 'border-green-200',
                textColor: 'text-green-800'
            };
        }

        if (position.patientsAhead === 0) {
            return {
                icon: <AlertCircle className="w-6 h-6 text-yellow-600" />,
                text: "You're next!",
                subtext: "Please be ready",
                bgColor: 'bg-yellow-50',
                borderColor: 'border-yellow-200',
                textColor: 'text-yellow-800'
            };
        }

        return {
            icon: <Clock className="w-6 h-6 text-gray-600" />,
            text: "Waiting in queue",
            subtext: `${position.patientsAhead} patient${position.patientsAhead > 1 ? 's' : ''} ahead of you`,
            bgColor: 'bg-white',
            borderColor: 'border-gray-200',
            textColor: 'text-gray-800'
        };
    };

    const statusDisplay = getStatusDisplay();

    return (
        <div className="space-y-4">
            {/* Main Status Card */}
            <div className={`${statusDisplay.bgColor} border-2 ${statusDisplay.borderColor} rounded-lg p-6`}>
                <div className="flex items-center space-x-4">
                    {statusDisplay.icon}
                    <div className="flex-1">
                        <h3 className={`text-xl font-bold ${statusDisplay.textColor}`}>
                            {statusDisplay.text}
                        </h3>
                        <p className="text-sm text-gray-600 mt-1">
                            {statusDisplay.subtext}
                        </p>
                    </div>
                </div>
            </div>

            {/* Queue Details */}
            <div className="bg-white rounded-lg shadow p-6">
                <h4 className="font-semibold text-gray-900 mb-4">Queue Details</h4>

                <div className="space-y-4">
                    {/* Queue Number */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <span className="text-gray-600">Your Queue Number</span>
                        <span className="text-2xl font-bold text-blue-600">
                            #{position.queueNumber}
                        </span>
                    </div>

                    {/* Doctor Info */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <span className="text-gray-600">Doctor</span>
                        <div className="text-right">
                            <p className="font-semibold text-gray-900">{position.doctorName}</p>
                            <p className="text-sm text-gray-500">{position.specialization}</p>
                        </div>
                    </div>

                    {/* Appointment Time */}
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <span className="text-gray-600">Scheduled Time</span>
                        <span className="font-semibold text-gray-900">
                            {position.appointmentTime}
                        </span>
                    </div>

                    {/* Patients Ahead */}
                    {position.status === 'PENDING' && (
                        <div className="flex items-center justify-between py-3 border-b border-gray-100">
                            <span className="text-gray-600">Patients Ahead</span>
                            <span className="font-semibold text-gray-900">
                                {position.patientsAhead}
                            </span>
                        </div>
                    )}

                    {/* Estimated Wait Time */}
                    {position.status === 'PENDING' && position.patientsAhead > 0 && (
                        <div className="flex items-center justify-between py-3">
                            <span className="text-gray-600">Estimated Wait</span>
                            <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span className="font-semibold text-gray-900">
                                    ~{position.estimatedWaitMinutes} minutes
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Status Badge */}
            <div className="bg-gray-50 rounded-lg p-4 text-center">
                <p className="text-sm text-gray-600">
                    Status: <span className={`font-semibold ${position.status === 'IN_PROGRESS' ? 'text-blue-600' :
                        position.status === 'COMPLETED' ? 'text-green-600' :
                            'text-yellow-600'
                        }`}>
                        {position.status === 'IN_PROGRESS' ? 'In Progress' :
                            position.status === 'COMPLETED' ? 'Completed' :
                                'Waiting'}
                    </span>
                </p>
                <p className="text-xs text-gray-500 mt-1">
                    Updates automatically every 15 seconds
                </p>
            </div>

            {/* Helpful Tips */}
            {position.status === 'PENDING' && position.patientsAhead <= 2 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <p className="text-sm text-yellow-800">
                        <strong>💡 Tip:</strong> Please stay nearby. You'll be called soon!
                    </p>
                </div>
            )}
        </div>
    );
};

export default QueuePositionTracker;
