import React, { useState, useEffect } from 'react';
import { X, Clock, Users, MapPin, TrendingUp } from 'lucide-react';
import { Button, Card } from './UIComponents';
import { api } from '../services/apiClient';
import { socketService } from '../services/socketService';

interface QueueStatusModalProps {
  appointmentId: number;
  onClose: () => void;
}

interface QueueStatus {
  id: number;
  date: string;
  time: string;
  queue_number: number;
  queue_status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  estimated_time: string;
  called_at: string;
  doctor_name: string;
  specialization: string;
  room_number: string;
  patients_before: number;
}

const QueueStatusModal: React.FC<QueueStatusModalProps> = ({ appointmentId, onClose }) => {
  const [queueStatus, setQueueStatus] = useState<QueueStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    loadQueueStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadQueueStatus, 30000);

    // WebSocket listener for real-time updates
    if (socketService.isConnected()) {
      socketService.on('queue_update', handleQueueUpdate);
    }

    return () => {
      clearInterval(interval);
      if (socketService.isConnected()) {
        socketService.off('queue_update');
      }
    };
  }, [appointmentId]);

  const handleQueueUpdate = (data: any) => {
    if (data.appointmentId === appointmentId) {
      loadQueueStatus();
      
      // Show notification
      if (data.status === 'called') {
        showNotification('Your turn! The doctor is calling you now.');
      }
    }
  };

  const showNotification = (message: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('MediConnect - Queue Update', {
        body: message,
        icon: '/logo.png'
      });
    }
  };

  const loadQueueStatus = async () => {
    try {
      const response = await api.get(`/queue/patient/${appointmentId}`);
      setQueueStatus(response.data);
      setLastUpdate(new Date());
    } catch (error) {
      console.error('Error loading queue status:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'waiting':
        return {
          color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
          icon: <Clock className="w-5 h-5" />,
          text: 'Waiting in Queue'
        };
      case 'in_progress':
        return {
          color: 'bg-green-100 text-green-800 border-green-300',
          icon: <Users className="w-5 h-5" />,
          text: 'Your Turn - Doctor is Calling You!'
        };
      case 'completed':
        return {
          color: 'bg-gray-100 text-gray-600 border-gray-300',
          icon: <Clock className="w-5 h-5" />,
          text: 'Consultation Completed'
        };
      default:
        return {
          color: 'bg-gray-100 text-gray-600 border-gray-300',
          icon: <Clock className="w-5 h-5" />,
          text: 'Unknown Status'
        };
    }
  };

  const formatEstimatedTime = (estimatedTime: string) => {
    if (!estimatedTime) return 'N/A';
    const date = new Date(estimatedTime);
    const now = new Date();
    const diff = date.getTime() - now.getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 0) return 'Soon';
    if (minutes === 0) return 'Now';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6 pb-4 border-b">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Live Queue Status</h2>
            <p className="text-sm text-gray-600 mt-1">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading queue status...</p>
          </div>
        ) : !queueStatus ? (
          <div className="text-center py-12 text-gray-600">
            <p>Could not load queue status</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Status Badge */}
            <div className={`flex items-center justify-center gap-3 p-6 rounded-lg border-2 ${getStatusInfo(queueStatus.queue_status).color}`}>
              {getStatusInfo(queueStatus.queue_status).icon}
              <span className="font-bold text-lg">{getStatusInfo(queueStatus.queue_status).text}</span>
            </div>

            {/* Queue Number */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-8 text-center border-2 border-blue-200">
              <p className="text-gray-600 font-medium mb-2">Your Queue Number</p>
              <div className="text-6xl font-bold text-blue-600 mb-2">#{queueStatus.queue_number}</div>
              {queueStatus.queue_status === 'waiting' && (
                <p className="text-gray-700 font-medium">
                  <TrendingUp className="inline mr-2" size={18} />
                  {queueStatus.patients_before} patient{queueStatus.patients_before !== 1 ? 's' : ''} ahead of you
                </p>
              )}
            </div>

            {/* Doctor Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="bg-white border-2">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Doctor</h3>
                </div>
                <p className="font-bold text-lg text-gray-900">{queueStatus.doctor_name}</p>
                <p className="text-sm text-gray-600">{queueStatus.specialization}</p>
              </Card>

              <Card className="bg-white border-2">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="text-blue-600" size={20} />
                  <h3 className="font-semibold text-gray-900">Location</h3>
                </div>
                <p className="font-bold text-lg text-gray-900">
                  Room {queueStatus.room_number || 'TBA'}
                </p>
                <p className="text-sm text-gray-600">Please wait for your turn</p>
              </Card>
            </div>

            {/* Timing Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="text-blue-600" size={18} />
                  <span className="text-sm font-medium text-blue-900">Scheduled Time</span>
                </div>
                <p className="text-xl font-bold text-blue-900">{queueStatus.time}</p>
                <p className="text-xs text-blue-700 mt-1">{new Date(queueStatus.date).toLocaleDateString()}</p>
              </div>

              {queueStatus.queue_status === 'waiting' && (
                <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Clock className="text-yellow-600" size={18} />
                    <span className="text-sm font-medium text-yellow-900">Estimated Wait</span>
                  </div>
                  <p className="text-xl font-bold text-yellow-900">
                    {formatEstimatedTime(queueStatus.estimated_time)}
                  </p>
                  <p className="text-xs text-yellow-700 mt-1">Approximate - may vary</p>
                </div>
              )}

              {queueStatus.queue_status === 'in_progress' && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <div className="flex items-center gap-2 mb-1">
                    <Users className="text-green-600" size={18} />
                    <span className="text-sm font-medium text-green-900">Called At</span>
                  </div>
                  <p className="text-xl font-bold text-green-900">
                    {queueStatus.called_at ? new Date(queueStatus.called_at).toLocaleTimeString() : 'Now'}
                  </p>
                  <p className="text-xs text-green-700 mt-1">Please proceed to the doctor's room</p>
                </div>
              )}
            </div>

            {/* Instructions */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <h4 className="font-semibold text-gray-900 mb-2">📋 Instructions</h4>
              <ul className="text-sm text-gray-700 space-y-2">
                <li>• Please stay in the waiting area</li>
                <li>• You will be notified when it's your turn</li>
                <li>• Keep this page open for real-time updates</li>
                <li>• Average consultation time: 15 minutes</li>
              </ul>
            </div>

            {/* Refresh Button */}
            <div className="flex gap-3">
              <Button 
                onClick={loadQueueStatus}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Clock size={18} className="mr-2" />
                Refresh Status
              </Button>
              <Button 
                onClick={onClose}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Close
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default QueueStatusModal;
