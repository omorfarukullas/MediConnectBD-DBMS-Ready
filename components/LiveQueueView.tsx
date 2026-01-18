import React, { useState, useEffect } from 'react';
import { Users, Clock, CheckCircle, Play, RotateCcw, Calendar } from 'lucide-react';
import { Button, Card } from './UIComponents';
import { api } from '../services/apiClient';
import { socketService } from '../services/socketService';

interface QueueDate {
  date: string;
  total_appointments: number;
  waiting: number;
  in_progress: number;
  completed: number;
}

interface QueuePatient {
  id: number;
  date: string;
  time: string;
  queue_number: number;
  queue_status: 'waiting' | 'in_progress' | 'completed' | 'cancelled';
  estimated_time: string;
  called_at: string;
  reason: string;
  patient_id: number;
  patient_name: string;
  patient_email: string;
  patient_phone: string;
}

const LiveQueueView: React.FC = () => {
  const [queueDates, setQueueDates] = useState<QueueDate[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [patients, setPatients] = useState<QueuePatient[]>([]);
  const [currentPatient, setCurrentPatient] = useState<QueuePatient | null>(null);
  const [loading, setLoading] = useState(false);

  // Load queue dates on mount
  useEffect(() => {
    loadQueueDates();
  }, []);

  // Load patients when date changes
  useEffect(() => {
    if (selectedDate) {
      loadQueue(selectedDate);
    }
  }, [selectedDate]);

  // WebSocket listener for real-time updates
  useEffect(() => {
    if (!socketService.isConnected()) return;

    socketService.on('queue_updated', (data: any) => {
      if (data.date === selectedDate) {
        loadQueue(selectedDate);
      }
    });

    return () => {
      socketService.off('queue_updated');
    };
  }, [selectedDate]);

  const loadQueueDates = async () => {
    try {
      const response = await api.get('/queue/dates');
      setQueueDates(response.data);
      
      // Auto-select today's date if available
      const today = new Date().toISOString().split('T')[0];
      const todayExists = response.data.find((d: QueueDate) => d.date === today);
      if (todayExists) {
        setSelectedDate(today);
      } else if (response.data.length > 0) {
        setSelectedDate(response.data[0].date);
      }
    } catch (error) {
      console.error('Error loading queue dates:', error);
    }
  };

  const loadQueue = async (date: string) => {
    setLoading(true);
    try {
      const response = await api.get(`/queue/${date}`);
      setPatients(response.data);
      
      // Find current patient
      const current = response.data.find((p: QueuePatient) => p.queue_status === 'in_progress');
      setCurrentPatient(current || null);
    } catch (error) {
      console.error('Error loading queue:', error);
    } finally {
      setLoading(false);
    }
  };

  const callNextPatient = async () => {
    if (!selectedDate) return;
    
    setLoading(true);
    try {
      const response = await api.post('/queue/next', {
        date: selectedDate,
        currentAppointmentId: currentPatient?.id
      });

      if (response.data.completed) {
        alert('All patients have been seen!');
        setCurrentPatient(null);
      } else {
        setCurrentPatient(response.data.patient);
      }
      
      // Reload queue
      await loadQueue(selectedDate);
    } catch (error: any) {
      console.error('Error calling next patient:', error);
      alert(error.response?.data?.message || 'Error calling next patient');
    } finally {
      setLoading(false);
    }
  };

  const resetQueue = async () => {
    if (!selectedDate) return;
    
    const confirm = window.confirm('Are you sure you want to reset the queue for this date?');
    if (!confirm) return;

    setLoading(true);
    try {
      await api.post('/queue/reset', { date: selectedDate });
      await loadQueue(selectedDate);
      setCurrentPatient(null);
    } catch (error) {
      console.error('Error resetting queue:', error);
      alert('Error resetting queue');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'in_progress': return 'bg-green-100 text-green-800 border-green-300';
      case 'completed': return 'bg-gray-100 text-gray-600 border-gray-300';
      default: return 'bg-gray-100 text-gray-600 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting': return <Clock className="w-4 h-4" />;
      case 'in_progress': return <Play className="w-4 h-4" />;
      case 'completed': return <CheckCircle className="w-4 h-4" />;
      default: return null;
    }
  };

  const formatEstimatedTime = (estimatedTime: string) => {
    if (!estimatedTime) return 'N/A';
    const date = new Date(estimatedTime);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Live Queue Management</h1>
        <p className="text-gray-600">Manage your appointment queue in real-time</p>
      </div>

      {/* Date Selection */}
      <Card className="mb-6 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Calendar className="text-blue-600" size={24} />
            <h2 className="text-xl font-semibold">Select Date</h2>
          </div>
          <Button onClick={loadQueueDates} className="bg-gray-100 text-gray-700 hover:bg-gray-200">
            <RotateCcw size={16} className="mr-2" />
            Refresh Dates
          </Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {queueDates.map((dateInfo) => (
            <button
              key={dateInfo.date}
              onClick={() => setSelectedDate(dateInfo.date)}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedDate === dateInfo.date
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-semibold text-gray-900">
                {new Date(dateInfo.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className="text-xs text-gray-600 mt-1">
                {dateInfo.total_appointments} appointments
              </div>
              <div className="flex gap-2 mt-2 text-xs">
                <span className="text-yellow-600">⏳ {dateInfo.waiting}</span>
                <span className="text-green-600">▶ {dateInfo.in_progress}</span>
                <span className="text-gray-500">✓ {dateInfo.completed}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Current Patient Card */}
      {selectedDate && (
        <Card className="mb-6 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Users className="text-blue-600" size={24} />
              <h2 className="text-xl font-semibold">Current Patient</h2>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={resetQueue}
                className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                disabled={loading}
              >
                <RotateCcw size={16} className="mr-2" />
                Reset Queue
              </Button>
              <Button 
                onClick={callNextPatient}
                className="bg-blue-600 hover:bg-blue-700 text-white"
                disabled={loading || patients.filter(p => p.queue_status === 'waiting').length === 0}
              >
                <Play size={16} className="mr-2" />
                Call Next Patient
              </Button>
            </div>
          </div>

          {currentPatient ? (
            <div className="bg-white rounded-lg p-6 shadow-md">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    Queue #{currentPatient.queue_number} - {currentPatient.patient_name}
                  </div>
                  <div className="text-gray-600 mb-2">
                    📧 {currentPatient.patient_email} | 📱 {currentPatient.patient_phone}
                  </div>
                  <div className="text-gray-700 mb-2">
                    <strong>Reason:</strong> {currentPatient.reason || 'Not specified'}
                  </div>
                  <div className="text-sm text-gray-500">
                    Scheduled: {currentPatient.time} | Called at: {
                      currentPatient.called_at 
                        ? new Date(currentPatient.called_at).toLocaleTimeString()
                        : 'Just now'
                    }
                  </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-800 rounded-lg border-2 border-green-300">
                  <Play size={20} />
                  <span className="font-semibold">In Progress</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg p-12 text-center text-gray-500">
              <Users size={48} className="mx-auto mb-4 opacity-50" />
              <p className="text-lg">No patient currently being seen</p>
              <p className="text-sm mt-2">Click "Call Next Patient" to start</p>
            </div>
          )}
        </Card>
      )}

      {/* Queue List */}
      {selectedDate && (
        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">
            Queue for {new Date(selectedDate).toLocaleDateString('en-US', { 
              weekday: 'long',
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </h2>

          {loading && <p className="text-center py-8 text-gray-500">Loading queue...</p>}

          {!loading && patients.length === 0 && (
            <p className="text-center py-8 text-gray-500">No appointments for this date</p>
          )}

          {!loading && patients.length > 0 && (
            <div className="space-y-3">
              {patients.map((patient) => (
                <div
                  key={patient.id}
                  className={`p-4 rounded-lg border-2 transition-all ${
                    getStatusColor(patient.queue_status)
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl font-bold">#{patient.queue_number}</div>
                      <div>
                        <div className="font-semibold text-gray-900">{patient.patient_name}</div>
                        <div className="text-sm text-gray-600">
                          {patient.patient_phone} | Scheduled: {patient.time}
                        </div>
                        {patient.reason && (
                          <div className="text-sm text-gray-600 mt-1">
                            Reason: {patient.reason}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      {patient.queue_status === 'waiting' && (
                        <div className="text-sm text-gray-600">
                          <Clock size={16} className="inline mr-1" />
                          Est. {formatEstimatedTime(patient.estimated_time)}
                        </div>
                      )}
                      <div className={`flex items-center gap-2 px-3 py-1 rounded-lg border capitalize`}>
                        {getStatusIcon(patient.queue_status)}
                        <span className="text-sm font-medium">{patient.queue_status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default LiveQueueView;
