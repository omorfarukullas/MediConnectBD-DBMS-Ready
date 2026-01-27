
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Video, Calendar, Clock, AlertCircle, ArrowLeft, Filter, CheckCircle, User, Star, Activity, ChevronRight, AlertTriangle, Settings, Bell, Lock, Globe, Save, Mail, Phone, Shield, LogOut, ChevronLeft, GraduationCap, Languages, Menu, FileText, Home, Building2, CalendarClock, Edit2 } from 'lucide-react';
import { MOCK_VITALS } from '../constants';
import { Doctor, Appointment, AppointmentStatus, User as UserType } from '../types';
import { Button, Card, Badge, Modal } from '../components/UIComponents';
import { analyzeSymptoms, AISymptomResponse } from '../services/geminiService';
import { MedicalHistory } from './MedicalHistory';
import { PatientMedicalHistory } from '../components/PatientMedicalHistory';
import { api } from '../services/apiClient';
import { NotificationBell } from '../components/NotificationBell';
import { ReviewModal, DoctorReviews } from '../components/ReviewSystem';
import QueueStatusModal from '../components/QueueStatusModal';
import QueuePositionTracker from '../components/QueuePositionTracker';
import { socketService } from '../services/socketService';
import { PatientVitalsManager } from '../components/PatientVitalsManager';
import { SlotBookingModal } from '../components/SlotBookingModal';
import { HospitalResourcesView } from '../components/HospitalResourcesView';

interface PatientPortalProps {
  currentUser?: UserType;
  onNavigate: (view: string) => void;
  onBack: () => void;
  initialMode?: 'DASHBOARD' | 'PHYSICAL_APPOINTMENTS' | 'SETTINGS' | 'MEDICAL_HISTORY' | 'HOSPITAL_RESOURCES' | 'TELEMEDICINE';
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ currentUser, onNavigate, onBack, initialMode = 'DASHBOARD' }) => {
  console.log('🎯 PatientPortal component rendering...', { currentUser, initialMode });

  // View State
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'PHYSICAL_APPOINTMENTS' | 'SETTINGS' | 'MEDICAL_HISTORY' | 'HOSPITAL_RESOURCES' | 'TELEMEDICINE'>(initialMode);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Data Loading State
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Sync prop change to state
  useEffect(() => {
    setViewMode(initialMode);
    if (initialMode === 'SETTINGS') {
      setActiveSettingsTab('PROFILE');
    }
  }, [initialMode]);

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Queue Modal State (moved here to prevent ReferenceError in useEffect)
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [trackedAppointment, setTrackedAppointment] = useState<Appointment | null>(null);

  // Fetch doctors and appointments on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch doctors
        setIsLoadingDoctors(true);
        const doctorsData = await api.getDoctors();
        console.log('🔍 DOCTORS FETCHED:', doctorsData);
        console.log('🔍 DOCTORS COUNT:', doctorsData?.length || 0);
        console.log('🔍 FIRST DOCTOR:', doctorsData?.[0]);
        console.log('🔍 DOCTORS IS ARRAY:', Array.isArray(doctorsData));
        setDoctors(doctorsData);
        console.log('✅ Doctors state updated');
        setIsLoadingDoctors(false);

        // Fetch appointments if user is logged in
        if (currentUser) {
          setIsLoadingAppointments(true);
          console.log('📋 Fetching appointments for user:', currentUser.id);
          const appointmentsResponse = await api.getAppointments();
          console.log('✅ Appointments response:', appointmentsResponse);
          // Handle response with {success, data} format or direct array
          const appointmentsData = appointmentsResponse.data || appointmentsResponse;
          setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
          setIsLoadingAppointments(false);

          // Fetch privacy settings
          try {
            const privacyData = await api.get<{ shareHistory: boolean, visibleToSearch: boolean }>('/auth/privacy');
            console.log('🔒 Privacy settings loaded:', privacyData);
            setSettingsForm(prev => ({
              ...prev,
              privacy: {
                shareHistory: privacyData.data.shareHistory,
                visibleToSearch: privacyData.data.visibleToSearch
              }
            }));
          } catch (err) {
            console.warn('Could not load privacy settings:', err);
          }
        }
      } catch (err: any) {
        console.error('❌ Error fetching data:', err);
        setError(err.message || 'Failed to load data');
        setIsLoadingDoctors(false);
        setIsLoadingAppointments(false);
      }
    };

    fetchData();
  }, [currentUser]);

  // WebSocket real-time updates
  useEffect(() => {
    if (!currentUser) return;

    // Listen for appointment updates
    socketService.onAppointmentUpdated((appointmentData: any) => {
      setAppointments(prev =>
        prev.map(apt =>
          apt.id === appointmentData.id ? { ...apt, ...appointmentData } : apt
        )
      );
      console.log('📅 Appointment updated:', appointmentData);
    });

    // Listen for queue updates
    socketService.onQueueUpdated((queueData: any) => {
      if (trackedAppointment && trackedAppointment.doctorId === queueData.doctorId) {
        setTrackedAppointment(prev => prev ? { ...prev, queueNumber: queueData.currentQueue } : null);
      }
      console.log('📊 Queue updated:', queueData);
    });

    return () => {
      socketService.off('appointment_updated');
      socketService.off('queue_updated');
    };
  }, [currentUser, trackedAppointment]);

  // Search & Filter State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedArea, setSelectedArea] = useState('All Areas');
  const [selectedHospital, setSelectedHospital] = useState('All Hospitals');
  const [selectedSpecialty, setSelectedSpecialty] = useState('All Specialties');

  // AI State
  const [symptomInput, setSymptomInput] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiRecommendation, setAiRecommendation] = useState<AISymptomResponse | null>(null);

  // Booking Modal State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingDoctor, setBookingDoctor] = useState<Doctor | null>(null);
  const [bookingStep, setBookingStep] = useState(1); // 1: Profile/Date/Time, 2: Review, 3: Success
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookingType, setBookingType] = useState<'In-Person' | 'Telemedicine'>('In-Person');

  // Debug: Track modal state changes
  useEffect(() => {
    console.log('🔄 Booking Modal State Changed:', {
      isOpen: isBookingModalOpen,
      doctor: bookingDoctor?.name,
      step: bookingStep,
      date: selectedDate,
      time: selectedTime
    });
  }, [isBookingModalOpen, bookingDoctor, bookingStep, selectedDate, selectedTime]);

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedAptIdCancel, setSelectedAptIdCancel] = useState<string | null>(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewDoctorId, setReviewDoctorId] = useState<number | null>(null);
  const [reviewDoctorName, setReviewDoctorName] = useState<string>('');
  const [reviewAppointmentId, setReviewAppointmentId] = useState<number | null>(null);
  const [reviewInitialData, setReviewInitialData] = useState<{ rating: number; comment: string } | undefined>(undefined);

  const [activeSettingsTab, setActiveSettingsTab] = useState<'PROFILE' | 'VITALS' | 'SECURITY' | 'NOTIFICATIONS' | 'PRIVACY'>('PROFILE');
  const [message, setMessage] = useState<{ type: string, text: string }>({ type: '', text: '' });

  const handleWriteReview = (appointment: Appointment) => {
    // Extract doctor ID from appointment
    const doctorId = (appointment as any).doctorId || 1;
    const doctorName = (appointment as any).doctorName || 'Doctor';
    const apptId = Number(appointment.id);
    const existingReview = (appointment as any).review;

    setReviewDoctorId(doctorId);
    setReviewDoctorName(doctorName);
    setReviewAppointmentId(apptId);
    setReviewInitialData(existingReview ? { rating: existingReview.rating, comment: existingReview.comment } : undefined);
    setIsReviewModalOpen(true);
  };

  const [settingsForm, setSettingsForm] = useState({
    name: currentUser?.name || 'Rahim Uddin',
    email: currentUser?.email || 'rahim@example.com',
    phone: '01712345678',
    bloodGroup: MOCK_VITALS.bloodGroup,
    notifications: {
      email: true,
      sms: true,
      push: false
    },
    privacy: {
      shareHistory: true,
      visibleToSearch: false
    }
  });

  // Update form if currentUser changes (e.g. login)
  useEffect(() => {
    if (currentUser) {
      setSettingsForm(prev => ({
        ...prev,
        name: currentUser.name,
        email: currentUser.email
      }));
    }
  }, [currentUser]);

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Handler: Save Privacy Settings
  const handleSavePrivacySettings = async () => {
    try {
      setIsSavingSettings(true);
      console.log('🔒 Saving privacy settings:', settingsForm.privacy);

      const response = await api.put('/auth/privacy', {
        shareHistory: settingsForm.privacy.shareHistory,
        visibleToSearch: settingsForm.privacy.visibleToSearch
      });

      console.log('✅ Privacy settings saved successfully:', response);

      // Show success message with better UI
      setMessage({ type: 'success', text: 'Privacy settings updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 3000);

    } catch (err: any) {
      console.error('❌ Error saving privacy settings:', err);
      console.error('Error details:', err.response || err);

      // Show error message
      setMessage({
        type: 'error',
        text: 'Failed to save privacy settings: ' + (err.message || 'Unknown error')
      });
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);

    } finally {
      setIsSavingSettings(false);
    }
  };

  // Filter Data Population
  const cities = ['All Cities', 'Dhaka', 'Chittagong', 'Sylhet'];
  const areas = ['All Areas', 'Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mirpur', 'Panthapath', 'Bakshibazar', 'Bashundhara R/A'];
  const hospitals = ['All Hospitals', ...(Array.isArray(doctors) && doctors.length > 0 ? Array.from(new Set(doctors.map(d => d.hospital))) : [])];
  const specialties = ['All Specialties', ...(Array.isArray(doctors) && doctors.length > 0 ? Array.from(new Set(doctors.map(d => d.specialization))) : [])];

  // Logic: Filtering Doctors
  const filteredDoctors = Array.isArray(doctors) ? doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.hospital.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = selectedCity === 'All Cities' || doc.location.includes(selectedCity);
    const matchesArea = selectedArea === 'All Areas' || doc.location.includes(selectedArea);
    const matchesHospital = selectedHospital === 'All Hospitals' || doc.hospital === selectedHospital;
    const matchesSpec = selectedSpecialty === 'All Specialties' || doc.specialization === selectedSpecialty;
    const matchesAi = aiRecommendation ? doc.specialization.includes(aiRecommendation.specialist) : true;

    return matchesSearch && matchesCity && matchesArea && matchesHospital && matchesSpec && matchesAi;
  }) : [];

  console.log('🔍 FILTER DEBUG:', {
    doctorsCount: doctors?.length,
    filteredCount: filteredDoctors.length,
    isArray: Array.isArray(doctors),
    selectedCity,
    selectedArea,
    selectedHospital,
    selectedSpecialty,
    searchTerm
  });
  console.log('🔍 FILTER DEBUG:', {
    totalDoctors: doctors.length,
    filteredCount: filteredDoctors.length,
    filters: { selectedCity, selectedArea, selectedHospital, selectedSpecialty, searchTerm }
  });

  // Logic: Handle Booking Flow
  const handleBookClick = (doctor: Doctor) => {
    console.log('🎯 Book Appointment Button Clicked!', { doctorId: doctor.id, doctorName: doctor.name });
    console.log('👤 Current User:', currentUser);

    // Check if user is logged in
    if (!currentUser) {
      console.log('⚠️ User not logged in - redirecting to login');
      // Save booking intent to sessionStorage for guest users
      const guestBooking = {
        doctorId: doctor.id,
        doctorName: doctor.name,
        timestamp: new Date().toISOString()
      };
      sessionStorage.setItem('mediconnect_pending_booking', JSON.stringify(guestBooking));

      // Redirect to login
      alert('Please log in to book an appointment. Your selection will be saved.');
      onNavigate('patient_login');
      return;
    }

    console.log('✅ Opening slot booking modal...');
    setBookingDoctor(doctor);
    setIsBookingModalOpen(true);
    setIsBookingModalOpen(true);
    console.log('📋 Modal should now be open. isBookingModalOpen will be true');
  };

  // Check for pending booking after login
  useEffect(() => {
    if (currentUser) {
      const pendingBooking = sessionStorage.getItem('mediconnect_pending_booking');
      if (pendingBooking) {
        try {
          const bookingData = JSON.parse(pendingBooking);
          console.log('📋 Found pending booking from guest session:', bookingData);

          // Find the doctor from the saved booking
          const doctor = doctors.find(d => d.id === bookingData.doctorId);
          if (doctor) {
            // Clear the pending booking
            sessionStorage.removeItem('mediconnect_pending_booking');

            // Auto-open booking modal
            setBookingDoctor(doctor);
            setBookingStep(1);
            setIsBookingModalOpen(true);

            console.log('✅ Auto-opened booking modal for:', doctor.name);
          }
        } catch (error) {
          console.error('❌ Error processing pending booking:', error);
          sessionStorage.removeItem('mediconnect_pending_booking');
        }
      }
    }
  }, [currentUser, doctors]);

  const handleConfirmBooking = async () => {
    console.log('🔄 Confirm Booking Clicked!');
    console.log('📋 Booking Details:', {
      doctor: bookingDoctor?.name,
      doctorId: bookingDoctor?.id,
      date: selectedDate,
      time: selectedTime,
      type: bookingType
    });

    // Validation
    if (!bookingDoctor) {
      console.error('❌ No doctor selected!');
      alert('Please select a doctor');
      return;
    }

    if (!selectedDate || !selectedTime) {
      console.error('❌ Missing date or time!', { selectedDate, selectedTime });
      alert('Please select both date and time');
      return;
    }

    try {
      // Check authentication
      const token = localStorage.getItem('mediconnect_token');
      console.log('🔑 Token exists:', !!token);
      console.log('👤 Current user:', currentUser);

      if (!token || !currentUser) {
        console.error('❌ User not authenticated!');
        alert('Please log in to book an appointment');
        onNavigate('patient_login');
        return;
      }

      const appointmentData = {
        doctorId: bookingDoctor.id,
        appointmentDate: selectedDate,
        appointmentTime: selectedTime,
        symptoms: symptomInput || 'General checkup'
      };

      console.log('📝 Booking payload being sent:', appointmentData);
      console.log('🌐 API Base URL:', 'http://localhost:5000/api');

      const response = await api.createAppointment(appointmentData);

      console.log('✅ Booking successful, response:', response);

      // Show success alert
      alert('Booking Successful! Your appointment has been confirmed.');

      // Refresh appointments list
      if (currentUser) {
        console.log('🔄 Refreshing appointments list...');
        const appointmentsResponse = await api.getAppointments();
        const appointmentsData = appointmentsResponse.data || appointmentsResponse;
        setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
        console.log('✅ Appointments refreshed, total:', appointmentsData.length);
      }

      // Close modal and navigate to My Appointments
      setIsBookingModalOpen(false);
      setViewMode('PHYSICAL_APPOINTMENTS');
      onNavigate('patient_appointments');

      console.log('✅ Redirected to My Appointments');
    } catch (err: any) {
      console.error('❌ Error creating appointment:', err);
      console.error('❌ Error name:', err.name);
      console.error('❌ Error message:', err.message);
      console.error('❌ Full error:', JSON.stringify(err, null, 2));

      // Show user-friendly error
      let errorMessage = 'Failed to book appointment. ';
      if (err.message.includes('Failed to fetch')) {
        errorMessage += 'Backend server might be down. Please try again later.';
      } else if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        errorMessage += 'Please log in again.';
      } else {
        errorMessage += err.message || 'Please try again.';
      }

      alert(errorMessage);
    }
  };

  const handleSymptomAnalysis = async () => {
    if (!symptomInput.trim()) return;
    setIsAnalyzing(true);
    const result = await analyzeSymptoms(symptomInput);
    if (result) {
      setAiRecommendation(result);
      setSelectedSpecialty('All Specialties');
      setSearchTerm(result.specialist);
    }
    setIsAnalyzing(false);
  };

  const openQueueTracker = (apt: Appointment) => {
    if (apt.status === AppointmentStatus.CANCELLED || apt.status === AppointmentStatus.COMPLETED) return;
    setTrackedAppointment(apt);
    setIsQueueModalOpen(true);

    // Join queue room for real-time updates
    if ((apt as any).doctorId) {
      socketService.joinQueue((apt as any).doctorId);
    }
  }

  // Handle queue modal close
  const closeQueueModal = () => {
    if (trackedAppointment && (trackedAppointment as any).doctorId) {
      socketService.leaveQueue((trackedAppointment as any).doctorId);
    }
    setIsQueueModalOpen(false);
    setTrackedAppointment(null);
  };

  const handleCancelClick = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setSelectedAptIdCancel(id);
    setIsCancelModalOpen(true);
  };

  const confirmCancel = async () => {
    if (selectedAptIdCancel) {
      try {
        console.log('🗑️ Cancelling appointment:', selectedAptIdCancel);

        await api.updateAppointment(selectedAptIdCancel, { status: 'CANCELLED' });

        console.log('✅ Appointment cancelled successfully');

        setAppointments(prev => prev.map(apt =>
          apt.id === selectedAptIdCancel ? { ...apt, status: AppointmentStatus.CANCELLED } : apt
        ));
      } catch (err: any) {
        console.error('❌ Error cancelling appointment:', err);
        alert(err.message || 'Failed to cancel appointment');
      }
    }
    setIsCancelModalOpen(false);
    setSelectedAptIdCancel(null);
  };



  const handleReviewSubmit = async () => {
    // Refresh appointments to show updated review status
    if (currentUser) {
      try {
        const appointmentsData = await api.getAppointments();
        const appointmentsArray = appointmentsData.data || appointmentsData; // Handle both formats
        setAppointments(Array.isArray(appointmentsArray) ? appointmentsArray : []);
      } catch (err) {
        console.error('Error refreshing appointments:', err);
      }
    }
    setIsReviewModalOpen(false);
  };

  const saveSettings = async () => {
    setIsSavingSettings(true);
    try {
      await api.updateProfile({
        name: settingsForm.name,
        phone: settingsForm.phone,
        email: settingsForm.email
      });
      alert("Settings saved successfully!");
    } catch (err: any) {
      console.error('Error saving settings:', err);
      alert(err.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // ... (render helpers)

  // ...



  const getNext7Days = () => {
    const dates = [];
    const today = new Date();
    for (let i = 1; i <= 6; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      dates.push({
        day: d.toLocaleDateString('en-US', { weekday: 'short' }),
        date: d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' }),
        fullDate: d.toISOString().split('T')[0]
      });
    }
    return dates;
  }

  // Helper for Sidebar items
  const SidebarItem = ({ view, icon, label }: { view: typeof viewMode, icon: React.ReactNode, label: string }) => (
    <button
      onClick={() => {
        setViewMode(view);
        setIsSidebarOpen(false);
        // Only navigate if it's a separate route, otherwise stay on portal and change view
        // Ideally, we should just update viewMode if it's a single page app. 
        // But assuming onNavigate updates URL or parent state:
        const route =
          view === 'DASHBOARD' ? 'patient' :
            view === 'PHYSICAL_APPOINTMENTS' ? 'patient_appointments' :
              view === 'SETTINGS' ? 'patient_settings' :
                view === 'TELEMEDICINE' ? 'patient_telemedicine' :
                  view === 'HOSPITAL_RESOURCES' ? 'patient_resources' :
                    'medical_history';

        onNavigate(route);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${viewMode === view ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
    >
      {icon} {label}
    </button>
  );

  return (
    <div className="flex min-h-screen bg-slate-50">

      {/* PATIENT SIDEBAR (Matching Doctor Portal Style) */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shadow-sm flex items-center justify-center text-slate-500">
              <User size={24} />
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-sm truncate w-32">{settingsForm.name}</h3>
              <p className="text-xs text-primary-600 font-bold flex items-center gap-1">Patient Portal</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          <SidebarItem view="DASHBOARD" icon={<Home size={18} />} label="Find Doctor" />
          <SidebarItem view="PHYSICAL_APPOINTMENTS" icon={<Calendar size={18} />} label="My Appointments" />
          <SidebarItem view="TELEMEDICINE" icon={<Video size={18} />} label="Telemedicine" />
          <SidebarItem view="MEDICAL_HISTORY" icon={<FileText size={18} />} label="Medical History" />
          <SidebarItem view="HOSPITAL_RESOURCES" icon={<Building2 size={18} />} label="Hospital Resources" />
          <SidebarItem view="SETTINGS" icon={<Settings size={18} />} label="Settings" />
        </nav>
        <div className="p-4 border-t border-slate-100">
          <button onClick={() => onNavigate('emergency')} className="flex items-center gap-2 text-white bg-red-600 hover:bg-red-700 font-medium p-3 rounded-lg w-full transition-colors mb-2 justify-center shadow-md shadow-red-200">
            <AlertTriangle size={18} /> Emergency Mode
          </button>
          <button onClick={onBack} className="flex items-center gap-2 text-slate-500 font-medium hover:bg-slate-100 p-3 rounded-lg w-full transition-colors justify-center">
            <LogOut size={18} /> Logout
          </button>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">

        {/* Header for Mobile/Context */}
        <div className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center md:bg-transparent md:border-b-0 md:pt-8 md:px-8">
          <div className="flex items-center gap-3">
            <button className="md:hidden text-slate-600" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                {viewMode === 'DASHBOARD' ? 'Find Doctor' :
                  viewMode === 'PHYSICAL_APPOINTMENTS' ? 'My Appointments' :
                    viewMode === 'TELEMEDICINE' ? 'Telemedicine' :
                      viewMode === 'MEDICAL_HISTORY' ? 'Medical Records' :
                        viewMode === 'HOSPITAL_RESOURCES' ? 'Hospital Resources' : 'Settings'}
              </h2>
            </div>
          </div>
          <div className="flex gap-3">
            <NotificationBell />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth">

          {/* --- VIEW: MEDICAL HISTORY --- */}
          {viewMode === 'MEDICAL_HISTORY' && (
            <div className="animate-fade-in pb-20">
              <div className="mb-6">
                <Button
                  variant="ghost"
                  onClick={() => setViewMode('DASHBOARD')}
                  className="text-slate-500 hover:text-slate-800 -ml-2"
                >
                  <ArrowLeft size={20} /> Back to Dashboard
                </Button>
              </div>
              <PatientMedicalHistory />
            </div>
          )}


          {/* --- VIEW: HOSPITAL RESOURCES --- */}
          {viewMode === 'HOSPITAL_RESOURCES' && (
            <div className="animate-fade-in">
              <HospitalResourcesView />
            </div>
          )}


          {/* --- VIEW: TELEMEDICINE --- */}
          {viewMode === 'TELEMEDICINE' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900">Telemedicine Sessions</h2>
                  <p className="text-gray-600 mt-1">Your video consultation history and upcoming sessions</p>
                </div>
                <Button onClick={() => setViewMode('DASHBOARD')} variant="outline" className="flex items-center gap-2">
                  <CalendarClock size={18} /> Book New Session
                </Button>
              </div>

              {/* Telemedicine Appointments List */}
              <div className="space-y-4">
                {appointments.filter(apt => ['TELEMEDICINE', 'ONLINE', 'VIDEO'].includes((apt.consultationType || apt.type || '').toUpperCase())).length === 0 ? (
                  <Card className="text-center py-12">
                    <div className="w-16 h-16 bg-purple-50 text-purple-600 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Video size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900">No Telemedicine Sessions</h3>
                    <p className="text-slate-500 mt-2 mb-6">You haven't booked any video consultations yet.</p>
                    <Button onClick={() => setViewMode('DASHBOARD')} className="bg-purple-600 hover:bg-purple-700 text-white">
                      Find a Doctor
                    </Button>
                  </Card>
                ) : (
                  appointments
                    .filter(apt => ['TELEMEDICINE', 'ONLINE', 'VIDEO'].includes((apt.consultationType || apt.type || '').toUpperCase()))
                    .sort((a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime()) // Newest first
                    .map(apt => (
                      <Card key={apt.id} className="hover:border-purple-200 transition-all border-l-4 border-l-purple-500">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                              <Video size={24} />
                            </div>
                            <div>
                              <h4 className="font-bold text-slate-900 text-lg">{apt.doctorName}</h4>
                              <div className="flex items-center gap-4 text-sm text-slate-500 mt-1">
                                <span className="flex items-center gap-1"><Calendar size={14} /> {apt.date}</span>
                                <span className="flex items-center gap-1"><Clock size={14} /> {apt.time}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 w-full md:w-auto">
                            {apt.queueNumber && (
                              <Badge variant="blue" className="mr-2">
                                Queue #{apt.queueNumber}
                              </Badge>
                            )}
                            <Badge variant={apt.status === 'CONFIRMED' ? 'green' : apt.status === 'COMPLETED' ? 'blue' : 'default'}>
                              {apt.status}
                            </Badge>

                            {apt.status === 'CONFIRMED' && (
                              <Button
                                onClick={() => onNavigate('telemedicine', apt)}
                                className="bg-purple-600 hover:bg-purple-700 text-white flex-1 md:flex-none"
                              >
                                Join Call
                              </Button>
                            )}

                            {apt.status === 'COMPLETED' && (
                              <Button variant="outline" className="flex-1 md:flex-none" onClick={() => handleWriteReview(apt)}>
                                <Star size={16} className="mr-2" /> Rate
                              </Button>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))
                )}
              </div>
            </div>
          )}

          {/* --- VIEW: SETTINGS --- */}
          {viewMode === 'SETTINGS' && (
            <div className="animate-fade-in pb-20">
              <div className="flex flex-col md:flex-row gap-6 min-h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                {/* Settings Internal Sidebar */}
                <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 flex flex-col">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <Settings size={20} className="text-primary-600" /> Preferences
                    </h2>
                  </div>
                  <nav className="flex-1 p-4 space-y-1">
                    <button
                      onClick={() => setActiveSettingsTab('PROFILE')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${activeSettingsTab === 'PROFILE' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <User size={18} /> My Profile
                    </button>
                    <button
                      onClick={() => setActiveSettingsTab('VITALS')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${activeSettingsTab === 'VITALS' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Activity size={18} /> Health Profile
                    </button>
                    <button
                      onClick={() => setActiveSettingsTab('SECURITY')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${activeSettingsTab === 'SECURITY' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Lock size={18} /> Security
                    </button>
                    <button
                      onClick={() => setActiveSettingsTab('NOTIFICATIONS')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${activeSettingsTab === 'NOTIFICATIONS' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Bell size={18} /> Notifications
                    </button>
                    <button
                      onClick={() => setActiveSettingsTab('PRIVACY')}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${activeSettingsTab === 'PRIVACY' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                    >
                      <Shield size={18} /> Privacy
                    </button>
                  </nav>
                </div>

                {/* Right Content Area */}
                <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                  {activeSettingsTab === 'PROFILE' && (
                    <div className="space-y-6 animate-fade-in">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6">Personal Information</h3>
                      <div className="flex items-center gap-6 mb-8">
                        <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 border-4 border-white shadow-lg">
                          <User size={40} />
                        </div>
                        <div>
                          <Button variant="outline" className="text-sm">Change Photo</Button>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                          <input type="text" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" value={settingsForm.name} onChange={e => setSettingsForm({ ...settingsForm, name: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                          <input type="text" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" value={settingsForm.bloodGroup} onChange={e => setSettingsForm({ ...settingsForm, bloodGroup: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                          <input type="email" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" value={settingsForm.email} onChange={e => setSettingsForm({ ...settingsForm, email: e.target.value })} />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                          <input type="tel" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" value={settingsForm.phone} onChange={e => setSettingsForm({ ...settingsForm, phone: e.target.value })} />
                        </div>
                      </div>
                      <div className="flex justify-end pt-4">
                        <Button onClick={saveSettings} loading={isSavingSettings} className="px-8"><Save size={18} className="mr-2" /> Save Changes</Button>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'VITALS' && (
                    <div className="animate-fade-in">
                      <PatientVitalsManager />
                    </div>
                  )}

                  {activeSettingsTab === 'SECURITY' && (
                    <div className="space-y-6 animate-fade-in">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6">Security Settings</h3>
                      <div className="max-w-md space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                          <input type="password" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" placeholder="••••••••" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                          <input type="password" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" placeholder="••••••••" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                          <input type="password" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" placeholder="••••••••" />
                        </div>
                        <Button className="mt-4">Update Password</Button>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'NOTIFICATIONS' && (
                    <div className="space-y-6 animate-fade-in">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6">Notification Preferences</h3>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Mail className="text-slate-500" />
                            <div>
                              <p className="font-bold text-slate-800">Email Notifications</p>
                              <p className="text-sm text-slate-500">Receive appointment confirmations</p>
                            </div>
                          </div>
                          <input type="checkbox" checked={settingsForm.notifications.email} onChange={e => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, email: e.target.checked } })} className="w-5 h-5 text-primary-600 rounded bg-white" />
                        </div>
                        <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <Phone className="text-slate-500" />
                            <div>
                              <p className="font-bold text-slate-800">SMS Alerts</p>
                              <p className="text-sm text-slate-500">Receive reminders for queue tracking</p>
                            </div>
                          </div>
                          <input type="checkbox" checked={settingsForm.notifications.sms} onChange={e => setSettingsForm({ ...settingsForm, notifications: { ...settingsForm.notifications, sms: e.target.checked } })} className="w-5 h-5 text-primary-600 rounded bg-white" />
                        </div>
                      </div>
                    </div>
                  )}

                  {activeSettingsTab === 'PRIVACY' && (
                    <div className="space-y-6 animate-fade-in">
                      <h3 className="text-2xl font-bold text-slate-900 mb-6">Privacy & Data</h3>

                      {/* Success/Error Message */}
                      {message.text && (
                        <div className={`p-4 rounded-lg border ${message.type === 'success'
                          ? 'bg-green-50 border-green-200 text-green-800'
                          : 'bg-red-50 border-red-200 text-red-800'
                          } animate-fade-in`}>
                          <p className="font-semibold flex items-center gap-2">
                            {message.type === 'success' ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                            {message.text}
                          </p>
                        </div>
                      )}

                      <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg text-yellow-800 text-sm mb-6">
                        <p className="font-bold flex items-center gap-2"><AlertCircle size={16} /> Medical Data Privacy</p>
                        <p className="mt-1">Your medical history is encrypted. Only doctors with active appointments can view your current symptoms.</p>
                      </div>

                      {/* Share Medical History */}
                      <div className="bg-white border border-slate-200 rounded-lg p-5 hover:border-primary-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 mb-1 flex items-center gap-2">
                              Share Medical History
                              {!settingsForm.privacy.shareHistory && (
                                <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-semibold">
                                  🔒 HIDDEN FROM DOCTORS
                                </span>
                              )}
                              {settingsForm.privacy.shareHistory && (
                                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">
                                  ✓ VISIBLE TO DOCTORS
                                </span>
                              )}
                            </p>
                            <p className="text-sm text-slate-600">
                              {settingsForm.privacy.shareHistory
                                ? 'Doctors can see your past prescriptions and medical reports during consultations'
                                : 'Your medical history is hidden. Doctors will NOT see your past prescriptions and reports'}
                            </p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              checked={settingsForm.privacy.shareHistory}
                              onChange={e => setSettingsForm({ ...settingsForm, privacy: { ...settingsForm.privacy, shareHistory: e.target.checked } })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      </div>

                      {/* Visible in Search */}
                      <div className="bg-white border border-slate-200 rounded-lg p-5 hover:border-primary-300 transition-colors">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="font-bold text-slate-900 mb-1">Visible in Search</p>
                            <p className="text-sm text-slate-600">Allow your profile to appear in public search results</p>
                          </div>
                          <label className="relative inline-flex items-center cursor-pointer ml-4">
                            <input
                              type="checkbox"
                              checked={settingsForm.privacy.visibleToSearch}
                              onChange={e => setSettingsForm({ ...settingsForm, privacy: { ...settingsForm.privacy, visibleToSearch: e.target.checked } })}
                              className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                          </label>
                        </div>
                      </div>

                      {/* Save Button */}
                      <Button
                        onClick={handleSavePrivacySettings}
                        disabled={isSavingSettings}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white py-3"
                      >
                        {isSavingSettings ? (
                          <>
                            <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save className="w-4 h-4 mr-2" />
                            Save Privacy Settings
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* --- VIEW: PHYSICAL APPOINTMENTS --- */}
          {viewMode === 'PHYSICAL_APPOINTMENTS' && (
            <div className="space-y-6 animate-fade-in pb-20">
              <Card>
                <div className="space-y-4">
                  {isLoadingAppointments ? (
                    // Loading skeleton
                    Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between p-5 bg-white rounded-xl border border-slate-100 animate-pulse">
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-full bg-slate-200"></div>
                          <div className="space-y-2">
                            <div className="h-4 bg-slate-200 rounded w-32"></div>
                            <div className="h-3 bg-slate-200 rounded w-24"></div>
                          </div>
                        </div>
                        <div className="h-6 bg-slate-200 rounded w-20"></div>
                      </div>
                    ))
                  ) : appointments.filter(apt => !['TELEMEDICINE', 'ONLINE', 'VIDEO'].includes((apt.consultationType || apt.type || '').toUpperCase())).length > 0 ? (
                    appointments
                      .filter(apt => !['TELEMEDICINE', 'ONLINE', 'VIDEO'].includes((apt.consultationType || apt.type || '').toUpperCase()))
                      .map(apt => {
                        // Handle both old and new field names
                        const appointmentType = apt.consultationType || apt.type || 'In-Person';
                        const isTelemedicine = appointmentType === 'ONLINE' || appointmentType === 'Telemedicine';
                        const appointmentStatus = apt.status.toUpperCase();

                        return (
                          <div
                            key={apt.id}
                            onClick={() => openQueueTracker(apt)}
                            className={`flex flex-col md:flex-row md:items-center justify-between p-5 bg-white rounded-xl border shadow-sm transition-all cursor-pointer group ${appointmentStatus === 'CANCELLED' ? 'opacity-60 border-slate-100 bg-slate-50' : 'border-slate-100 hover:shadow-md hover:border-primary-200'}`}
                          >
                            <div className="flex items-center gap-5 mb-4 md:mb-0">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${appointmentStatus === 'CONFIRMED' || appointmentStatus === 'ACCEPTED' ? 'bg-green-100 text-green-600' : appointmentStatus === 'CANCELLED' || appointmentStatus === 'REJECTED' ? 'bg-red-50 text-red-300' : 'bg-orange-100 text-orange-600'}`}>
                                {isTelemedicine ? <Video size={24} /> : <MapPin size={24} />}
                              </div>
                              <div>
                                <h3 className={`font-bold text-lg transition-colors ${appointmentStatus === 'CANCELLED' || appointmentStatus === 'REJECTED' ? 'text-slate-500 line-through' : 'text-slate-900 group-hover:text-primary-600'}`}>{apt.doctorName}</h3>
                                <div className="text-sm text-slate-500 space-y-1">
                                  <p className="flex items-center gap-2"><Calendar size={14} /> {new Date(apt.date).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                                  <p className="flex items-center gap-2"><Clock size={14} /> {apt.time}</p>
                                  {apt.queueNumber && (
                                    <p className="flex items-center gap-2 text-primary-600 font-bold">
                                      <span className="bg-primary-50 px-2 py-0.5 rounded text-xs border border-primary-100">Queue #{apt.queueNumber}</span>
                                    </p>
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 md:gap-1 pl-14 md:pl-0">
                              {/* Live Queue Tracker Button */}
                              {(appointmentStatus === 'PENDING' || appointmentStatus === 'IN_PROGRESS' || appointmentStatus === 'CONFIRMED' || appointmentStatus === 'ACCEPTED') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); openQueueTracker(apt); }}
                                  className="w-full flex items-center justify-center gap-2 mb-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-all animate-fade-in"
                                >
                                  <span className="relative flex h-3 w-3">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-3 w-3 bg-white"></span>
                                  </span>
                                  Track Live Queue
                                </button>
                              )}

                              {(appointmentStatus === 'CONFIRMED' || appointmentStatus === 'ACCEPTED') && (
                                <div className="flex items-center gap-2 mb-1 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                  <span className="text-xs font-bold text-green-700">Live Queue Active</span>
                                </div>
                              )}
                              <Badge color={appointmentStatus === 'CONFIRMED' || appointmentStatus === 'ACCEPTED' ? 'green' : appointmentStatus === 'CANCELLED' || appointmentStatus === 'REJECTED' ? 'red' : appointmentStatus === 'COMPLETED' ? 'blue' : 'yellow'}>{apt.status}</Badge>

                              {(appointmentStatus === 'PENDING' || appointmentStatus === 'CONFIRMED' || appointmentStatus === 'ACCEPTED') && (
                                <button
                                  onClick={(e) => handleCancelClick(e, apt.id)}
                                  className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline mt-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                >
                                  Cancel Appointment
                                </button>
                              )}

                              {/* Review Action */}
                              {['COMPLETED', 'CONFIRMED'].includes(apt.status) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleWriteReview(apt);
                                  }}
                                  className={`text-xs font-medium hover:underline mt-1 px-2 py-1 rounded transition-colors flex items-center gap-1 ${(apt as any).review
                                    ? 'text-green-600 hover:text-green-800 hover:bg-green-50'
                                    : 'text-primary-600 hover:text-primary-800 hover:bg-primary-50'
                                    }`}
                                >
                                  {(apt as any).review ? <Edit2 size={12} /> : <Star size={12} />}
                                  {(apt as any).review ? 'Edit Review' : 'Write Review'}
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })
                  ) : (
                    <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                      <p className="text-slate-500 font-medium">No physical appointments scheduled.</p>
                      <Button variant="outline" className="mt-4" onClick={() => setViewMode('DASHBOARD')}>Book an Appointment</Button>
                    </div>
                  )}
                </div>
              </Card>

              {/* Queue Status Modal */}
              {isQueueModalOpen && trackedAppointment && (
                <QueueStatusModal
                  appointmentId={trackedAppointment.id}
                  onClose={closeQueueModal}
                />
              )}

              {/* Cancel Modal */}
              <Modal isOpen={isCancelModalOpen} onClose={() => setIsCancelModalOpen(false)} title="Cancel Appointment">
                <div className="space-y-4">
                  <p>Are you sure?</p>
                  <div className="flex gap-2 justify-end">
                    <Button variant="danger" onClick={confirmCancel}>Yes, Cancel</Button>
                  </div>
                </div>
              </Modal>

              {/* Review Modal */}
              {isReviewModalOpen && reviewDoctorId && reviewAppointmentId && (
                <ReviewModal
                  isOpen={isReviewModalOpen}
                  doctorId={reviewDoctorId}
                  doctorName={reviewDoctorName}
                  appointmentId={reviewAppointmentId}
                  initialData={reviewInitialData}
                  onClose={() => setIsReviewModalOpen(false)}
                  onReviewSubmitted={handleReviewSubmit}
                />
              )}
            </div>
          )}

          {/* --- VIEW: DASHBOARD (FIND DOCTOR) --- */}
          {viewMode === 'DASHBOARD' && (
            <div className="space-y-8 animate-fade-in pb-20">

              {/* Header & AI Symptom Checker */}
              <section className="bg-primary-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
                {/* ... (AI Logic same as before) ... */}
                <div className="relative z-10 max-w-2xl">
                  <h1 className="text-3xl font-bold mb-4">Find the Right Care</h1>
                  <p className="text-primary-100 mb-6">Describe your symptoms to get AI recommendations, or search manually below.</p>

                  <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/20 shadow-inner">
                    <div className="flex items-start gap-3">
                      <Activity className="text-primary-200 mt-2" size={20} />
                      <textarea
                        className="w-full bg-white text-slate-900 rounded-lg p-3 placeholder-slate-400 border-none focus:ring-0 resize-none h-20 text-lg"
                        placeholder="e.g., I have a severe headache and nausea since morning..."
                        value={symptomInput}
                        onChange={(e) => setSymptomInput(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-between items-center mt-2 border-t border-white/10 pt-2">
                      <span className="text-xs text-primary-200">Powered by Gemini AI</span>
                      <Button
                        variant="secondary"
                        className="bg-white text-primary-700 hover:bg-primary-50 hover:text-primary-800 text-sm py-1.5 px-4 h-auto shadow-none"
                        onClick={handleSymptomAnalysis}
                        loading={isAnalyzing}
                      >
                        Analyze Symptoms
                      </Button>
                    </div>
                  </div>
                </div>
              </section>

              {/* Advanced Doctor Search & Filters */}
              <section id="doctors">
                {/* Error Display */}
                {error && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 text-red-800">
                      <AlertCircle size={20} />
                      <p className="font-semibold">Error Loading Data</p>
                    </div>
                    <p className="text-red-600 text-sm mt-1">{error}</p>
                    <Button
                      onClick={() => window.location.reload()}
                      className="mt-3 bg-red-600 hover:bg-red-700"
                      size="sm"
                    >
                      Reload Page
                    </Button>
                  </div>
                )}

                {/* ... Search & Filter UI (same as before) ... */}
                <div className="flex flex-col gap-4 mb-6">
                  {/* Search inputs... */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div className="md:col-span-2 relative">
                      <Search className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <input
                        type="text"
                        placeholder="Search doctor or hospital..."
                        className="w-full pl-10 p-3 rounded-xl border border-slate-200 shadow-sm bg-white focus:ring-2 focus:ring-primary-500"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <select
                        className="w-full pl-10 p-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-primary-500 bg-white"
                        value={selectedCity}
                        onChange={(e) => setSelectedCity(e.target.value)}
                      >
                        {cities.map(c => <option key={c}>{c}</option>)}
                      </select>
                    </div>
                    <div className="relative">
                      <Filter className="absolute left-3 top-3.5 text-slate-400" size={18} />
                      <select
                        className="w-full pl-10 p-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-primary-500 bg-white"
                        value={selectedSpecialty}
                        onChange={(e) => setSelectedSpecialty(e.target.value)}
                      >
                        {specialties.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Results Grid - UPDATED DOCTOR CARD */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {isLoadingDoctors ? (
                    // Loading skeleton
                    Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-pulse">
                        <div className="h-48 bg-slate-200"></div>
                        <div className="p-5 space-y-3">
                          <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                          <div className="h-3 bg-slate-200 rounded w-1/2"></div>
                          <div className="space-y-2">
                            <div className="h-2 bg-slate-200 rounded"></div>
                            <div className="h-2 bg-slate-200 rounded"></div>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : filteredDoctors.length === 0 ? (
                    <div className="col-span-full text-center py-12">
                      <AlertCircle className="mx-auto mb-4 text-slate-300" size={48} />
                      <p className="text-slate-500">No doctors found matching your criteria</p>
                    </div>
                  ) : (
                    filteredDoctors.map(doctor => (
                      <div key={doctor.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col">
                        {/* Doctor Image Header */}
                        <div className="h-48 overflow-hidden relative bg-slate-100">
                          <img src={doctor.image} alt={doctor.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />

                          {/* Verified Badge Overlay */}
                          {doctor.isVerified && (
                            <div className="absolute top-3 left-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm text-green-700">
                              <CheckCircle size={12} fill="currentColor" className="text-white" /> BMDC Verified
                            </div>
                          )}

                          <div className="absolute top-3 right-3 bg-white/90 backdrop-blur px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm">
                            <Star size={12} className="text-yellow-500 fill-yellow-500" /> {doctor.rating}
                          </div>
                        </div>

                        <div className="p-5 flex-1 flex flex-col">
                          <h3 className="font-bold text-lg text-slate-900 leading-tight mb-1">{doctor.name}</h3>
                          <p className="text-primary-600 font-medium text-sm mb-2">{doctor.specialization}</p>

                          {/* Rich Profile Details Summary */}
                          <div className="text-xs text-slate-500 mb-4 space-y-1.5">
                            <p className="flex items-center gap-1.5 font-medium"><GraduationCap size={12} /> {doctor.degrees?.join(', ') || 'MBBS'}</p>
                            <p className="flex items-center gap-1.5"><MapPin size={12} /> {doctor.hospital}</p>
                            <p className="flex items-center gap-1.5"><Languages size={12} /> {doctor.languages?.join(', ') || 'Bangla, English'}</p>
                          </div>

                          <div className="mt-auto pt-4 border-t border-slate-50">
                            <div className="flex justify-between items-center mb-3">
                              <div>
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Physical</p>
                                <p className="font-bold text-slate-900">৳{doctor.fees.physical}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-[10px] text-slate-400 uppercase tracking-wide font-bold">Online</p>
                                <p className="font-bold text-slate-900">৳{doctor.fees.online}</p>
                              </div>
                            </div>
                            <Button
                              onClick={() => handleBookClick(doctor)}
                              className="w-full rounded-xl shadow-primary-500/30"
                            >
                              View Profile & Book
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>

              {/* Slot-Based Booking Modal */}
              {bookingDoctor && (
                <SlotBookingModal
                  isOpen={isBookingModalOpen}
                  onClose={() => {
                    console.log('🚪 Closing booking modal');
                    setIsBookingModalOpen(false);
                    setBookingDoctor(null);
                  }}
                  doctorId={bookingDoctor.id}
                  doctorName={bookingDoctor.name}
                  doctorSpecialization={bookingDoctor.specialization}
                  onBookingComplete={(appointment) => {
                    console.log('✅ Booking completed:', appointment);
                    // Refresh appointments list
                    api.getAppointments().then(response => {
                      const appointmentsData = response.data || response;
                      setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
                    });
                  }}
                  onAppointmentUpdate={(newList) => {
                    setAppointments(newList);
                    setViewMode('PHYSICAL_APPOINTMENTS');
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div >
    </div >
  );
};
