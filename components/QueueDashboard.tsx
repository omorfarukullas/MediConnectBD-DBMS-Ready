import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, AlertCircle, Phone, User } from 'lucide-react';
import { api, TokenManager } from '../services/apiClient';

interface QueueAppointment {
    id: number;
    patientId: number;
    patientName: string;
    age: number;
    gender: string;
    phone: string;
    queueNumber: number;
    appointmentTime: string;
    consultationType: string;
    status: string;
    reasonForVisit: string;
    startedAt?: string;
    completedAt?: string;
}

interface QueueStats {
    total: number;
    waiting: number;
    inProgress: number;
    completed: number;
}

interface QueueData {
    appointments: QueueAppointment[];
    stats: QueueStats;
    currentPatient: {
        id: number;
        queueNumber: number;
        patientName: string;
    } | null;
    date: string;
}

const QueueDashboard: React.FC = () => {
    const [queueData, setQueueData] = useState<QueueData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [actionLoading, setActionLoading] = useState<number | null>(null);

    // Get doctor ID from stored user object
    const currentUser = TokenManager.getUser();
    const doctorId = currentUser?.id;

    // Fetch queue data
    const fetchQueue = async () => {
        if (!doctorId) {
            setError('Doctor ID not found. Please log in again.');
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            const response = await api.get(`/queue/doctor/${doctorId}/today`);
            if (response.data.success) {
                setQueueData(response.data.data);
                setError(null);
            }
        } catch (err: any) {
            console.error('Queue fetch error:', err);
            setError(err.response?.data?.message || err.message || 'Failed to fetch queue');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchQueue();
        // Refresh every 30 seconds
        const interval = setInterval(fetchQueue, 30000);
        return () => clearInterval(interval);
    }, [doctorId]);

    // Call next patient
    const handleCallNext = async () => {
        try {
            setActionLoading(-1);
            const response = await api.post('/queue/next');
            if (response.data.success) {
                await fetchQueue();
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to call next patient');
        } finally {
            setActionLoading(null);
        }
    };

    // Start appointment
    const handleStart = async (appointmentId: number) => {
        try {
            setActionLoading(appointmentId);
            const response = await api.put(`/queue/${appointmentId}/start`, {});
            if (response.data.success) {
                await fetchQueue();
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to start appointment');
        } finally {
            setActionLoading(null);
        }
    };

    // Complete appointment
    const handleComplete = async (appointmentId: number) => {
        try {
            setActionLoading(appointmentId);
            const response = await api.put(`/queue/${appointmentId}/complete`, {});
            if (response.data.success) {
                await fetchQueue();
            }
        } catch (err: any) {
            alert(err.response?.data?.message || 'Failed to complete appointment');
        } finally {
            setActionLoading(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'PENDING': return 'bg-yellow-100 text-yellow-800';
            case 'IN_PROGRESS': return 'bg-blue-100 text-blue-800';
            case 'COMPLETED': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'PENDING': return <Clock className="w-4 h-4" />;
            case 'IN_PROGRESS': return <AlertCircle className="w-4 h-4" />;
            case 'COMPLETED': return <CheckCircle className="w-4 h-4" />;
            default: return null;
        }
    };

    if (loading && !queueData) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading queue...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800">{error}</p>
                <button
                    onClick={fetchQueue}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                >
                    Try again
                </button>
            </div>
        );
    }

    if (!queueData) return null;

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-900">Today's Queue</h2>
                <button
                    onClick={fetchQueue}
                    className="px-4 py-2 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                    Refresh
                </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Total</p>
                            <p className="text-2xl font-bold text-gray-900">{queueData.stats.total}</p>
                        </div>
                        <Users className="w-8 h-8 text-gray-400" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Waiting</p>
                            <p className="text-2xl font-bold text-yellow-600">{queueData.stats.waiting}</p>
                        </div>
                        <Clock className="w-8 h-8 text-yellow-400" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">In Progress</p>
                            <p className="text-2xl font-bold text-blue-600">{queueData.stats.inProgress}</p>
                        </div>
                        <AlertCircle className="w-8 h-8 text-blue-400" />
                    </div>
                </div>

                <div className="bg-white rounded-lg shadow p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-gray-600">Completed</p>
                            <p className="text-2xl font-bold text-green-600">{queueData.stats.completed}</p>
                        </div>
                        <CheckCircle className="w-8 h-8 text-green-400" />
                    </div>
                </div>
            </div>

            {/* Current Patient */}
            {queueData.currentPatient && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm text-blue-600 font-medium">Currently Attending</p>
                            <p className="text-lg font-bold text-blue-900">
                                #{queueData.currentPatient.queueNumber} - {queueData.currentPatient.patientName}
                            </p>
                        </div>
                        <button
                            onClick={() => handleComplete(queueData.currentPatient!.id)}
                            disabled={actionLoading === queueData.currentPatient!.id}
                            className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                            {actionLoading === queueData.currentPatient!.id ? 'Completing...' : 'Complete'}
                        </button>
                    </div>
                </div>
            )}

            {/* Call Next Button */}
            {queueData.stats.waiting > 0 && !queueData.currentPatient && (
                <button
                    onClick={handleCallNext}
                    disabled={actionLoading === -1}
                    className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
                >
                    {actionLoading === -1 ? 'Calling...' : `Call Next Patient (${queueData.stats.waiting} waiting)`}
                </button>
            )}

            {/* Queue List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-900">Queue List</h3>
                </div>

                {queueData.appointments.length === 0 ? (
                    <div className="p-8 text-center text-gray-500">
                        <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                        <p>No appointments for today</p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200">
                        {queueData.appointments.map((appointment) => (
                            <div
                                key={appointment.id}
                                className={`p-4 hover:bg-gray-50 ${appointment.status === 'IN_PROGRESS' ? 'bg-blue-50' : ''
                                    }`}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-4 flex-1">
                                        {/* Queue Number */}
                                        <div className="flex-shrink-0">
                                            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                                <span className="text-lg font-bold text-blue-600">
                                                    #{appointment.queueNumber}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Patient Info */}
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <h4 className="font-semibold text-gray-900">
                                                    {appointment.patientName}
                                                </h4>
                                                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center space-x-1 ${getStatusColor(appointment.status)}`}>
                                                    {getStatusIcon(appointment.status)}
                                                    <span>{appointment.status}</span>
                                                </span>
                                            </div>
                                            <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
                                                <span className="flex items-center space-x-1">
                                                    <User className="w-4 h-4" />
                                                    <span>{appointment.age}y, {appointment.gender}</span>
                                                </span>
                                                <span className="flex items-center space-x-1">
                                                    <Phone className="w-4 h-4" />
                                                    <span>{appointment.phone}</span>
                                                </span>
                                                <span className="flex items-center space-x-1">
                                                    <Clock className="w-4 h-4" />
                                                    <span>{appointment.appointmentTime}</span>
                                                </span>
                                            </div>
                                            {appointment.reasonForVisit && (
                                                <p className="mt-1 text-sm text-gray-500">
                                                    Reason: {appointment.reasonForVisit}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex-shrink-0">
                                        {appointment.status === 'PENDING' && (
                                            <button
                                                onClick={() => handleStart(appointment.id)}
                                                disabled={actionLoading === appointment.id}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm disabled:opacity-50"
                                            >
                                                {actionLoading === appointment.id ? 'Starting...' : 'Start'}
                                            </button>
                                        )}
                                        {appointment.status === 'IN_PROGRESS' && (
                                            <button
                                                onClick={() => handleComplete(appointment.id)}
                                                disabled={actionLoading === appointment.id}
                                                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm disabled:opacity-50"
                                            >
                                                {actionLoading === appointment.id ? 'Completing...' : 'Complete'}
                                            </button>
                                        )}
                                        {appointment.status === 'COMPLETED' && (
                                            <span className="text-sm text-green-600 font-medium">✓ Done</span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default QueueDashboard;
