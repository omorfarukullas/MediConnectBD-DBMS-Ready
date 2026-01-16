
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Video, Calendar, Clock, AlertCircle, ArrowLeft, Filter, CheckCircle, User, Star, Activity, ChevronRight, AlertTriangle, Settings, Bell, Lock, Globe, Save, Mail, Phone, Shield, LogOut, ChevronLeft, GraduationCap, Languages, Menu, FileText, Home, Upload } from 'lucide-react';
import { Doctor, Appointment, AppointmentStatus, User as UserType, UserRole } from '../types';
import { Button, Card, Badge, Modal } from '../components/UIComponents';
import { analyzeSymptoms, AISymptomResponse } from '../services/geminiService';
import { MedicalHistory } from './MedicalHistory';
import { api, AppointmentResponse, DoctorResponse } from '../services/apiClient';
import { NotificationBell } from '../components/NotificationBell';
import { ReviewModal, DoctorReviews } from '../components/ReviewSystem';
import { socketService } from '../services/socketService';

// Helper function to map API response to frontend type
const mapAppointmentResponse = (apiApt: AppointmentResponse): Appointment => ({
  id: apiApt.id,
  patientId: apiApt.patientId,
  doctorId: apiApt.doctorId,
  patientName: apiApt.patientName || 'Unknown',
  doctorName: apiApt.doctorName || 'Unknown Doctor',
  date: apiApt.appointmentDate,
  time: apiApt.appointmentTime,
  type: 'In-Person', // Default, API doesn't return this currently
  status: apiApt.status as AppointmentStatus,
  queueNumber: apiApt.queueNumber,
  symptoms: apiApt.reasonForVisit
});

// Helper function to map Doctor API response to frontend Doctor type
const mapDoctorResponse = (apiDoc: DoctorResponse): Doctor => ({
  id: apiDoc.id.toString(),
  name: apiDoc.name,
  role: UserRole.DOCTOR,
  email: apiDoc.email,
  specialization: apiDoc.specialization,
  hospital: apiDoc.city || 'Unknown Hospital',
  bmdcNumber: apiDoc.bmdcNumber || '',
  experienceYears: apiDoc.experienceYears || 0,
  degrees: [],
  education: [],
  languages: ['Bengali', 'English'],
  fees: apiDoc.fees,
  available: true,
  nextSlot: 'Tomorrow',
  rating: apiDoc.rating || 0,
  reviews: [],
  patientsInQueue: 0,
  isTelemedicineAvailable: true,
  isVerified: true,
  image: apiDoc.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400',
  location: apiDoc.city || 'Dhaka',
  status: 'Active'
});

interface PatientPortalProps {
  currentUser?: UserType;
  onNavigate: (view: string) => void;
  onBack: () => void;
  initialMode?: 'DASHBOARD' | 'MY_APPOINTMENTS' | 'SETTINGS' | 'MEDICAL_HISTORY';
}

export const PatientPortal: React.FC<PatientPortalProps> = ({ currentUser, onNavigate, onBack, initialMode = 'DASHBOARD' }) => {
  // View State
  const [viewMode, setViewMode] = useState<'DASHBOARD' | 'MY_APPOINTMENTS' | 'SETTINGS' | 'MEDICAL_HISTORY'>(initialMode);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  console.log('🏥 PatientPortal rendered - ViewMode:', viewMode, 'User:', currentUser?.name || 'Guest');
  
  // Data Loading State
  const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);
  const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  // Queue Modal State - Declare early to avoid ReferenceError in WebSocket useEffect
  const [isQueueModalOpen, setIsQueueModalOpen] = useState(false);
  const [trackedAppointment, setTrackedAppointment] = useState<Appointment | null>(null);

  // Sync prop change to state
  useEffect(() => {
    setViewMode(initialMode);
    if (initialMode === 'SETTINGS') {
        setActiveSettingsTab('PROFILE');
    }
  }, [initialMode]);

  // Appointments State
  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // Fetch doctors and appointments on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch doctors
        setIsLoadingDoctors(true);
        const doctorsData = await api.getDoctors();
        console.log('✅ Doctors fetched:', doctorsData.length);
        setDoctors(doctorsData.map(mapDoctorResponse));
        setIsLoadingDoctors(false);

        // Fetch appointments if user is logged in
        if (currentUser) {
          setIsLoadingAppointments(true);
          const appointmentsData = await api.getAppointments();
          setAppointments(appointmentsData.map(mapAppointmentResponse));
          setIsLoadingAppointments(false);
        } else {
          setIsLoadingAppointments(false);
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

  // Cancellation Modal State
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedAptIdCancel, setSelectedAptIdCancel] = useState<number | null>(null);

  // Review Modal State
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [reviewDoctorId, setReviewDoctorId] = useState<number | null>(null);
  const [reviewAppointmentId, setReviewAppointmentId] = useState<number | null>(null);

  // Settings Internal State
  const [activeSettingsTab, setActiveSettingsTab] = useState<'PROFILE' | 'SECURITY' | 'NOTIFICATIONS' | 'PRIVACY'>('PROFILE');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [passwordForm, setPasswordForm] = useState({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  
  const [settingsForm, setSettingsForm] = useState({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      phone: '',
      bloodGroup: '',
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

  // Fetch patient profile data on mount
  useEffect(() => {
      const fetchProfile = async () => {
          if (!currentUser) return;
          
          try {
              const profile = await api.getPatientProfile();
              setSettingsForm(prev => ({
                  ...prev,
                  name: profile.name,
                  email: profile.email,
                  phone: profile.phone || '',
                  bloodGroup: profile.bloodGroup || ''
              }));
              setProfileImage(profile.profileImage || null);
          } catch (err: any) {
              console.error('Error fetching profile:', err);
          }
      };
      
      fetchProfile();
  }, [currentUser]);

  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Filter Data Population
  const cities = ['All Cities', 'Dhaka', 'Chittagong', 'Sylhet'];
  const areas = ['All Areas', 'Dhanmondi', 'Gulshan', 'Banani', 'Uttara', 'Mirpur', 'Panthapath', 'Bakshibazar', 'Bashundhara R/A'];
  const hospitals = ['All Hospitals', ...Array.from(new Set(doctors.map(d => d.hospital)))];
  const specialties = ['All Specialties', ...Array.from(new Set(doctors.map(d => d.specialization)))];

  // Logic: Filtering Doctors
  const filteredDoctors = doctors.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          doc.hospital.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCity = selectedCity === 'All Cities' || doc.location.includes(selectedCity);
    const matchesArea = selectedArea === 'All Areas' || doc.location.includes(selectedArea);
    const matchesHospital = selectedHospital === 'All Hospitals' || doc.hospital === selectedHospital;
    const matchesSpec = selectedSpecialty === 'All Specialties' || doc.specialization === selectedSpecialty;
    const matchesAi = aiRecommendation ? doc.specialization.includes(aiRecommendation.specialist) : true;
    
    return matchesSearch && matchesCity && matchesArea && matchesHospital && matchesSpec && matchesAi;
  });

  // Logic: Handle Booking Flow
  const handleBookClick = (doctor: Doctor) => {
      setBookingDoctor(doctor);
      setBookingStep(1);
      setSelectedDate('');
      setSelectedTime('');
      setBookingType('In-Person');
      setIsBookingModalOpen(true);
  };

  const handleConfirmBooking = async () => {
      try {
        const appointmentData = {
          doctorId: Number(bookingDoctor!.id),
          appointmentDate: selectedDate,
          appointmentTime: selectedTime,
          symptoms: symptomInput || 'General checkup'
        };

        console.log('📅 Booking appointment:', appointmentData);
        const newApt = await api.createAppointment(appointmentData);
        console.log('✅ Appointment created:', newApt);
        
        // Refresh appointments list from database
        const updatedAppointments = await api.getAppointments();
        setAppointments(updatedAppointments.map(mapAppointmentResponse));
        
        console.log('✅ Appointment list refreshed');
        setBookingStep(3);
      } catch (err: any) {
        console.error('❌ Error creating appointment:', err);
        alert(err.message || 'Failed to book appointment. Please try again.');
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

  const handleCancelClick = (e: React.MouseEvent, id: number) => {
      e.stopPropagation();
      setSelectedAptIdCancel(id);
      setIsCancelModalOpen(true);
  };

  const confirmCancel = async () => {
      if (selectedAptIdCancel) {
          try {
              // Use PATCH to update status to CANCELLED
              await api.updateAppointment(selectedAptIdCancel, { status: 'CANCELLED' });
              
              // Update local state to reflect cancellation
              setAppointments(prev => prev.map(apt => 
                  apt.id === selectedAptIdCancel ? { ...apt, status: AppointmentStatus.CANCELLED } : apt
              ));
              
              console.log('✅ Appointment cancelled:', selectedAptIdCancel);
          } catch (err: any) {
              console.error('❌ Error cancelling appointment:', err);
              alert(err.message || 'Failed to cancel appointment');
          }
      }
      setIsCancelModalOpen(false);
      setSelectedAptIdCancel(null);
  };

  const handleWriteReview = (appointment: Appointment) => {
      // Extract doctor ID from appointment (assuming it's stored as doctorId)
      const doctorId = (appointment as any).doctorId || 1; // Fallback to 1 if not available
      setReviewDoctorId(doctorId);
      setReviewAppointmentId(Number(appointment.id));
      setIsReviewModalOpen(true);
  };

  const handleReviewSubmit = async () => {
      // Refresh appointments to show updated review status
      if (currentUser) {
          try {
              const appointmentsData = await api.getAppointments();
              setAppointments(appointmentsData.map(mapAppointmentResponse));
          } catch (err) {
              console.error('Error refreshing appointments:', err);
          }
      }
      setIsReviewModalOpen(false);
  };

  const saveSettings = async () => {
      if (!currentUser) return;
      
      setIsSavingSettings(true);
      try {
          const updatedProfile = await api.updatePatientProfile(Number(currentUser.id), {
              full_name: settingsForm.name,
              phone: settingsForm.phone,
              blood_group: settingsForm.bloodGroup
          });
          
          // Update local user state to reflect changes immediately
          const updatedUser = {
              ...currentUser,
              name: updatedProfile.name,
              email: updatedProfile.email
          };
          
          // Update localStorage
          localStorage.setItem('mediconnect_user', JSON.stringify(updatedUser));
          
          alert("Profile updated successfully!");
          console.log('✅ Profile settings saved and user state updated');
          
          // Refresh profile data from server to ensure sync
          const profile = await api.getPatientProfile();
          setSettingsForm(prev => ({
              ...prev,
              name: profile.name,
              email: profile.email,
              phone: profile.phone || '',
              bloodGroup: profile.bloodGroup || ''
          }));
      } catch (err: any) {
          console.error('❌ Error saving settings:', err);
          alert(err.message || 'Failed to save settings');
      } finally {
          setIsSavingSettings(false);
      }
  };

  const handlePasswordChange = async () => {
      if (!currentUser) return;

      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
          alert('New passwords do not match');
          return;
      }

      if (passwordForm.newPassword.length < 6) {
          alert('Password must be at least 6 characters');
          return;
      }

      setIsChangingPassword(true);
      try {
          await api.changePatientPassword(
              Number(currentUser.id),
              passwordForm.oldPassword,
              passwordForm.newPassword
          );
          alert('Password changed successfully!');
          setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
          console.log('✅ Password changed successfully');
      } catch (err: any) {
          console.error('❌ Error changing password:', err);
          alert(err.message || 'Failed to change password');
      } finally {
          setIsChangingPassword(false);
      }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
      if (!currentUser || !event.target.files || event.target.files.length === 0) return;

      const file = event.target.files[0];
      
      // Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
          alert('File size must be less than 5MB');
          return;
      }

      // Validate file type
      if (!file.type.match(/image\/(jpeg|jpg|png|gif)/)) {
          alert('Only image files (JPEG, PNG, GIF) are allowed');
          return;
      }

      setIsUploadingPhoto(true);
      try {
          const result = await api.uploadPatientPhoto(Number(currentUser.id), file);
          setProfileImage(result.profileImage);
          alert('Profile picture updated successfully!');
          console.log('✅ Profile photo uploaded:', result.profileImage);
      } catch (err: any) {
          console.error('❌ Error uploading photo:', err);
          alert(err.message || 'Failed to upload photo');
      } finally {
          setIsUploadingPhoto(false);
      }
  };

  const getNext7Days = () => {
      const dates = [];
      const today = new Date();
      for(let i=1; i<=6; i++) {
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
        onClick={() => { setViewMode(view); setIsSidebarOpen(false); onNavigate(view === 'DASHBOARD' ? 'patient' : view === 'MY_APPOINTMENTS' ? 'patient_appointments' : view === 'SETTINGS' ? 'patient_settings' : 'medical_history'); }}
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
                    {profileImage ? (
                        <img 
                            src={`http://localhost:5000${profileImage}`} 
                            alt={settingsForm.name}
                            className="w-12 h-12 rounded-full object-cover shadow-sm"
                        />
                    ) : (
                        <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shadow-sm flex items-center justify-center text-slate-500">
                            <User size={24} />
                        </div>
                    )}
                    <div>
                        <h3 className="font-bold text-slate-800 text-sm truncate w-32">{settingsForm.name || 'Patient'}</h3>
                        <p className="text-xs text-primary-600 font-bold flex items-center gap-1">Patient Portal</p>
                    </div>
                </div>
            </div>
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <SidebarItem view="DASHBOARD" icon={<Home size={18}/>} label="Find Doctor" />
                <SidebarItem view="MY_APPOINTMENTS" icon={<Calendar size={18}/>} label="My Appointments" />
                <SidebarItem view="MEDICAL_HISTORY" icon={<FileText size={18}/>} label="Medical History" />
                <SidebarItem view="SETTINGS" icon={<Settings size={18}/>} label="Settings" />
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
                             viewMode === 'MY_APPOINTMENTS' ? 'My Appointments' : 
                             viewMode === 'MEDICAL_HISTORY' ? 'Medical Records' : 'Settings'}
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
             <MedicalHistory onBack={() => setViewMode('DASHBOARD')} />
          )}

          {/* --- VIEW: SETTINGS --- */}
          {viewMode === 'SETTINGS' && (
              <div className="animate-fade-in pb-20">
                  <div className="flex flex-col md:flex-row gap-6 min-h-[600px] bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                      {/* Settings Internal Sidebar */}
                      <div className="w-full md:w-64 bg-slate-50 border-r border-slate-100 flex flex-col">
                          <div className="p-6 border-b border-slate-100">
                              <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                  <Settings size={20} className="text-primary-600"/> Preferences
                              </h2>
                          </div>
                          <nav className="flex-1 p-4 space-y-1">
                              <button 
                                 onClick={() => setActiveSettingsTab('PROFILE')}
                                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${activeSettingsTab === 'PROFILE' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                 <User size={18}/> My Profile
                              </button>
                              <button 
                                 onClick={() => setActiveSettingsTab('SECURITY')}
                                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${activeSettingsTab === 'SECURITY' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                 <Lock size={18}/> Security
                              </button>
                              <button 
                                 onClick={() => setActiveSettingsTab('NOTIFICATIONS')}
                                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${activeSettingsTab === 'NOTIFICATIONS' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                 <Bell size={18}/> Notifications
                              </button>
                              <button 
                                 onClick={() => setActiveSettingsTab('PRIVACY')}
                                 className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium text-sm ${activeSettingsTab === 'PRIVACY' ? 'bg-white text-primary-600 shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                 <Shield size={18}/> Privacy
                              </button>
                          </nav>
                      </div>

                      {/* Right Content Area */}
                      <div className="flex-1 p-6 md:p-8 overflow-y-auto">
                          {activeSettingsTab === 'PROFILE' && (
                              <div className="space-y-6 animate-fade-in">
                                  <h3 className="text-2xl font-bold text-slate-900 mb-6">Personal Information</h3>
                                  <div className="flex items-center gap-6 mb-8">
                                      {profileImage ? (
                                          <img 
                                              src={`http://localhost:5000${profileImage}`} 
                                              alt="Profile" 
                                              className="w-24 h-24 rounded-full object-cover border-4 border-white shadow-lg"
                                          />
                                      ) : (
                                          <div className="w-24 h-24 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 border-4 border-white shadow-lg">
                                              <User size={40}/>
                                          </div>
                                      )}
                                      <div>
                                          <input 
                                              type="file" 
                                              id="photoUpload" 
                                              accept="image/jpeg,image/jpg,image/png,image/gif"
                                              onChange={handlePhotoUpload}
                                              className="hidden"
                                          />
                                          <label htmlFor="photoUpload">
                                              <span 
                                                  className={`inline-flex items-center px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium transition-colors cursor-pointer ${isUploadingPhoto ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                                              >
                                                  <Upload size={16} className="mr-2" />
                                                  {isUploadingPhoto ? 'Uploading...' : 'Change Photo'}
                                              </span>
                                          </label>
                                          <p className="text-xs text-slate-500 mt-2">Max 5MB. JPG, PNG, GIF only.</p>
                                      </div>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                      <div>
                                          <label className="block text-sm font-medium text-slate-700 mb-1">Full Name</label>
                                          <input type="text" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-slate-700 mb-1">Blood Group</label>
                                          <select 
                                              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" 
                                              value={settingsForm.bloodGroup} 
                                              onChange={e => setSettingsForm({...settingsForm, bloodGroup: e.target.value})}
                                          >
                                              <option value="">Select Blood Group</option>
                                              <option value="A+">A+</option>
                                              <option value="A-">A-</option>
                                              <option value="B+">B+</option>
                                              <option value="B-">B-</option>
                                              <option value="AB+">AB+</option>
                                              <option value="AB-">AB-</option>
                                              <option value="O+">O+</option>
                                              <option value="O-">O-</option>
                                          </select>
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
                                          <input 
                                              type="email" 
                                              className="w-full p-2.5 rounded-lg border border-slate-300 bg-slate-50 cursor-not-allowed" 
                                              value={settingsForm.email} 
                                              disabled
                                              title="Email cannot be changed"
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
                                          <input type="tel" className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} placeholder="01712345678" />
                                      </div>
                                  </div>
                                  <div className="flex justify-end pt-4">
                                      <Button onClick={saveSettings} loading={isSavingSettings} className="px-8"><Save size={18} className="mr-2"/> Save Changes</Button>
                                  </div>
                              </div>
                          )}

                          {activeSettingsTab === 'SECURITY' && (
                              <div className="space-y-6 animate-fade-in">
                                  <h3 className="text-2xl font-bold text-slate-900 mb-6">Security Settings</h3>
                                  <div className="max-w-md space-y-4">
                                      <div>
                                          <label className="block text-sm font-medium text-slate-700 mb-1">Current Password</label>
                                          <input 
                                              type="password" 
                                              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" 
                                              placeholder="••••••••"
                                              value={passwordForm.oldPassword}
                                              onChange={e => setPasswordForm({...passwordForm, oldPassword: e.target.value})}
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-slate-700 mb-1">New Password</label>
                                          <input 
                                              type="password" 
                                              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" 
                                              placeholder="••••••••"
                                              value={passwordForm.newPassword}
                                              onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                                          />
                                      </div>
                                      <div>
                                          <label className="block text-sm font-medium text-slate-700 mb-1">Confirm New Password</label>
                                          <input 
                                              type="password" 
                                              className="w-full p-2.5 rounded-lg border border-slate-300 bg-white" 
                                              placeholder="••••••••"
                                              value={passwordForm.confirmPassword}
                                              onChange={e => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                                          />
                                      </div>
                                      <Button 
                                          className="mt-4" 
                                          onClick={handlePasswordChange}
                                          loading={isChangingPassword}
                                          disabled={!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword}
                                      >
                                          <Lock size={16} className="mr-2" />
                                          {isChangingPassword ? 'Updating...' : 'Update Password'}
                                      </Button>
                                  </div>
                              </div>
                          )}

                          {activeSettingsTab === 'NOTIFICATIONS' && (
                              <div className="space-y-6 animate-fade-in">
                                  <h3 className="text-2xl font-bold text-slate-900 mb-6">Notification Preferences</h3>
                                  <div className="space-y-4">
                                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                              <Mail className="text-slate-500"/>
                                              <div>
                                                  <p className="font-bold text-slate-800">Email Notifications</p>
                                                  <p className="text-sm text-slate-500">Receive appointment confirmations</p>
                                              </div>
                                          </div>
                                          <input type="checkbox" checked={settingsForm.notifications.email} onChange={e => setSettingsForm({...settingsForm, notifications: {...settingsForm.notifications, email: e.target.checked}})} className="w-5 h-5 text-primary-600 rounded bg-white" />
                                      </div>
                                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                          <div className="flex items-center gap-3">
                                              <Phone className="text-slate-500"/>
                                              <div>
                                                  <p className="font-bold text-slate-800">SMS Alerts</p>
                                                  <p className="text-sm text-slate-500">Receive reminders for queue tracking</p>
                                              </div>
                                          </div>
                                          <input type="checkbox" checked={settingsForm.notifications.sms} onChange={e => setSettingsForm({...settingsForm, notifications: {...settingsForm.notifications, sms: e.target.checked}})} className="w-5 h-5 text-primary-600 rounded bg-white" />
                                      </div>
                                  </div>
                              </div>
                          )}
                          
                          {activeSettingsTab === 'PRIVACY' && (
                              <div className="space-y-6 animate-fade-in">
                                   <h3 className="text-2xl font-bold text-slate-900 mb-6">Privacy & Data</h3>
                                   <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg text-yellow-800 text-sm mb-6">
                                       <p className="font-bold flex items-center gap-2"><AlertCircle size={16}/> Medical Data Privacy</p>
                                       <p className="mt-1">Your medical history is encrypted. Only doctors with active appointments can view your current symptoms.</p>
                                   </div>
                                   <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                                       <div>
                                           <p className="font-bold text-slate-800">Share Medical History</p>
                                           <p className="text-sm text-slate-500">Allow doctors to see past prescriptions</p>
                                       </div>
                                       <input type="checkbox" checked={settingsForm.privacy.shareHistory} onChange={e => setSettingsForm({...settingsForm, privacy: {...settingsForm.privacy, shareHistory: e.target.checked}})} className="w-5 h-5 text-primary-600 rounded bg-white" />
                                   </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          )}

          {/* --- VIEW: MY APPOINTMENTS --- */}
          {viewMode === 'MY_APPOINTMENTS' && (
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
                      ) : appointments.length > 0 ? (
                        appointments.map(apt => (
                          <div 
                            key={apt.id} 
                            onClick={() => openQueueTracker(apt)}
                            className={`flex flex-col md:flex-row md:items-center justify-between p-5 bg-white rounded-xl border shadow-sm transition-all cursor-pointer group ${apt.status === AppointmentStatus.CANCELLED ? 'opacity-60 border-slate-100 bg-slate-50' : 'border-slate-100 hover:shadow-md hover:border-primary-200'}`}
                          >
                            <div className="flex items-center gap-5 mb-4 md:mb-0">
                              <div className={`w-14 h-14 rounded-full flex items-center justify-center shadow-sm ${apt.status === AppointmentStatus.CONFIRMED ? 'bg-green-100 text-green-600' : apt.status === AppointmentStatus.CANCELLED ? 'bg-red-50 text-red-300' : 'bg-orange-100 text-orange-600'}`}>
                                {apt.type === 'Telemedicine' ? <Video size={24} /> : <MapPin size={24} />}
                              </div>
                              <div>
                                <h3 className={`font-bold text-lg transition-colors ${apt.status === AppointmentStatus.CANCELLED ? 'text-slate-500 line-through' : 'text-slate-900 group-hover:text-primary-600'}`}>{apt.doctorName}</h3>
                                <div className="text-sm text-slate-500 space-y-1">
                                    <p className="flex items-center gap-2"><Calendar size={14}/> {apt.date}</p>
                                    <p className="flex items-center gap-2"><Clock size={14}/> {apt.time}</p>
                                </div>
                              </div>
                            </div>
                            <div className="text-right flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center gap-2 md:gap-1 pl-14 md:pl-0">
                               {apt.status === AppointmentStatus.CONFIRMED && (
                                   <div className="flex items-center gap-2 mb-1 bg-green-50 px-3 py-1 rounded-full border border-green-100">
                                       <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                                       <span className="text-xs font-bold text-green-700">Live Queue</span>
                                   </div>
                               )}
                               <Badge color={apt.status === AppointmentStatus.CONFIRMED ? 'green' : apt.status === AppointmentStatus.CANCELLED ? 'red' : apt.status === AppointmentStatus.COMPLETED ? 'blue' : 'yellow'}>{apt.status}</Badge>
                               
                               {(apt.status === AppointmentStatus.PENDING || apt.status === AppointmentStatus.CONFIRMED) && (
                                   <button 
                                       onClick={(e) => handleCancelClick(e, apt.id)}
                                       className="text-xs text-red-500 hover:text-red-700 font-medium hover:underline mt-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                                   >
                                       Cancel Appointment
                                   </button>
                               )}
                               
                               {apt.status === AppointmentStatus.COMPLETED && (
                                   <button 
                                       onClick={(e) => { e.stopPropagation(); handleWriteReview(apt); }}
                                       className="text-xs text-primary-600 hover:text-primary-800 font-medium hover:underline mt-1 px-2 py-1 rounded hover:bg-primary-50 transition-colors flex items-center gap-1"
                                   >
                                       <Star size={12} />
                                       Write Review
                                   </button>
                               )}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-16 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                            <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                            <p className="text-slate-500 font-medium">No appointments scheduled.</p>
                            <Button variant="outline" className="mt-4" onClick={() => setViewMode('DASHBOARD')}>Book an Appointment</Button>
                        </div>
                      )}
                    </div>
                  </Card>

                  {/* Queue Modal & Cancel Modal (Same as before) */}
                  <Modal isOpen={isQueueModalOpen} onClose={closeQueueModal} title="Smart Live Queue">
                     {/* ... Queue Logic ... */}
                     {trackedAppointment && (
                          <div className="space-y-8 text-center pb-4">
                              <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-lg relative overflow-hidden">
                                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-500 via-blue-500 to-purple-500"></div>
                                  <p className="text-slate-400 text-sm font-medium uppercase tracking-widest mb-2">Your Token Number</p>
                                  <h2 className="text-6xl font-bold mb-2 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400">
                                      {trackedAppointment.queueNumber || 'N/A'}
                                  </h2>
                                  <p className="text-primary-300 text-sm">Est. Wait: 25 mins</p>
                              </div>
                          </div>
                      )}
                  </Modal>
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
                          appointmentId={reviewAppointmentId}
                          onClose={() => setIsReviewModalOpen(false)}
                          onSubmitSuccess={handleReviewSubmit}
                      />
                  )}
              </div>
          )}

          {/* --- VIEW: DASHBOARD (FIND DOCTOR) --- */}
          {viewMode === 'DASHBOARD' && (
            <div className="space-y-8 pb-20">
              
              {/* Debug Info - Remove after testing */}
              <div className="bg-yellow-100 border border-yellow-400 p-4 rounded-lg text-sm">
                <p><strong>Debug:</strong> Dashboard View Active</p>
                <p>Doctors loaded: {doctors.length}</p>
                <p>Loading: {isLoadingDoctors ? 'Yes' : 'No'}</p>
                <p>Filtered: {filteredDoctors.length}</p>
              </div>
              
              {/* Header & AI Symptom Checker */}
              <section className="bg-primary-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
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
                {/* ... Search & Filter UI (same as before) ... */}
                <div className="flex flex-col gap-4 mb-6">
                    {/* Search inputs... */}
                     <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                        <div className="md:col-span-2 relative">
                            <Search className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                            <input 
                              type="text" 
                              placeholder="Search doctor or hospital..." 
                              className="w-full pl-10 p-3 rounded-xl border border-slate-200 shadow-sm bg-white focus:ring-2 focus:ring-primary-500"
                              value={searchTerm}
                              onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="relative">
                            <MapPin className="absolute left-3 top-3.5 text-slate-400" size={18}/>
                            <select 
                              className="w-full pl-10 p-3 rounded-xl border border-slate-200 shadow-sm focus:ring-2 focus:ring-primary-500 bg-white"
                              value={selectedCity}
                              onChange={(e) => setSelectedCity(e.target.value)}
                            >
                                {cities.map(c => <option key={c}>{c}</option>)}
                            </select>
                        </div>
                        <div className="relative">
                             <Filter className="absolute left-3 top-3.5 text-slate-400" size={18}/>
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
                                  <CheckCircle size={12} fill="currentColor" className="text-white"/> BMDC Verified
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
                              <p className="flex items-center gap-1.5 font-medium"><GraduationCap size={12}/> {doctor.degrees.join(', ')}</p>
                              <p className="flex items-center gap-1.5"><MapPin size={12}/> {doctor.hospital}</p>
                              <p className="flex items-center gap-1.5"><Languages size={12}/> {doctor.languages.join(', ')}</p>
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

              {/* Enhanced Booking Modal */}
              <Modal 
                 isOpen={isBookingModalOpen} 
                 onClose={() => setIsBookingModalOpen(false)}
                 title={bookingStep === 3 ? "Booking Confirmed!" : ""}
                 className="max-w-4xl" // Wider modal for profile
              >
                 {bookingStep === 1 && bookingDoctor && (
                     <div className="flex flex-col lg:flex-row gap-6">
                         {/* Left: Doctor Profile Detail */}
                         <div className="lg:w-1/3 bg-slate-50 rounded-xl p-6 border border-slate-100">
                              <div className="text-center mb-4">
                                  <img src={bookingDoctor.image} className="w-32 h-32 rounded-full object-cover mx-auto mb-3 shadow-md border-4 border-white" />
                                  <h3 className="font-bold text-xl text-slate-900">{bookingDoctor.name}</h3>
                                  <p className="text-primary-600 font-medium">{bookingDoctor.specialization}</p>
                                  <div className="flex justify-center gap-2 mt-2">
                                     {bookingDoctor.isVerified && <Badge color="green">BMDC Verified</Badge>}
                                     <Badge color="yellow">{bookingDoctor.rating} ★</Badge>
                                  </div>
                              </div>
                              
                              <div className="space-y-4 text-sm">
                                  <div>
                                      <p className="font-bold text-slate-700 mb-1">Registration</p>
                                      <p className="text-slate-500 font-mono text-xs">BMDC-{bookingDoctor.bmdcNumber}****</p>
                                  </div>
                                  <div>
                                      <p className="font-bold text-slate-700 mb-1">Education</p>
                                      <ul className="list-disc list-inside text-slate-500 space-y-1">
                                          {bookingDoctor.education.map((edu, i) => (
                                              <li key={i}>{edu.degree} - {edu.institute}</li>
                                          ))}
                                      </ul>
                                  </div>
                                   <div>
                                      <p className="font-bold text-slate-700 mb-1 flex items-center gap-2">
                                          <Star size={16} className="text-yellow-500" />
                                          Patient Reviews
                                      </p>
                                      <DoctorReviews doctorId={Number(bookingDoctor.id)} limit={2} compact={true} />
                                  </div>
                              </div>
                         </div>

                         {/* Right: Booking Actions */}
                         <div className="flex-1 space-y-6">
                             <div>
                                 <h2 className="text-2xl font-bold text-slate-900 mb-4">Book Appointment</h2>
                                 
                                 {/* Consultation Type Toggle */}
                                 <div className="grid grid-cols-2 gap-4 mb-6">
                                     <label className={`p-4 border rounded-xl cursor-pointer flex flex-col items-center gap-2 transition-all ${bookingType === 'In-Person' ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-slate-200 bg-white'}`}>
                                         <input type="radio" name="type" className="hidden" checked={bookingType === 'In-Person'} onChange={() => setBookingType('In-Person')} />
                                         <MapPin className={bookingType === 'In-Person' ? 'text-primary-600' : 'text-slate-400'} size={24} />
                                         <div className="text-center">
                                             <span className="block font-bold text-slate-900">Physical Visit</span>
                                             <span className="text-xs text-slate-500">৳{bookingDoctor.fees.physical} • 20 mins</span>
                                         </div>
                                     </label>

                                     {bookingDoctor.isTelemedicineAvailable ? (
                                         <label className={`p-4 border rounded-xl cursor-pointer flex flex-col items-center gap-2 transition-all ${bookingType === 'Telemedicine' ? 'border-primary-500 bg-primary-50 ring-2 ring-primary-200' : 'border-slate-200 bg-white'}`}>
                                             <input type="radio" name="type" className="hidden" checked={bookingType === 'Telemedicine'} onChange={() => setBookingType('Telemedicine')} />
                                             <Video className={bookingType === 'Telemedicine' ? 'text-primary-600' : 'text-slate-400'} size={24} />
                                             <div className="text-center">
                                                 <span className="block font-bold text-slate-900">Video Consult</span>
                                                 <span className="text-xs text-slate-500">৳{bookingDoctor.fees.online} • 15 mins</span>
                                             </div>
                                         </label>
                                     ) : (
                                         <div className="p-4 border border-slate-100 rounded-xl bg-slate-50 opacity-60 flex flex-col items-center justify-center gap-1">
                                             <Video className="text-slate-300" size={24}/>
                                             <span className="text-xs font-bold text-slate-400">Telemedicine Unavailable</span>
                                         </div>
                                     )}
                                 </div>

                                 {/* Date Selection */}
                                 <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Calendar size={18}/> Select Date</h4>
                                 <div className="flex gap-3 overflow-x-auto pb-2 mb-6">
                                     {getNext7Days().map((d, i) => (
                                         <button 
                                            key={i}
                                            onClick={() => setSelectedDate(d.fullDate)}
                                            className={`flex-shrink-0 w-20 h-24 rounded-xl border flex flex-col items-center justify-center gap-1 transition-all ${selectedDate === d.fullDate ? 'bg-primary-600 border-primary-600 text-white ring-2 ring-primary-200' : 'bg-white border-slate-200 hover:border-primary-300 text-slate-600'}`}
                                         >
                                             <span className="text-xs font-medium uppercase opacity-80">{d.day}</span>
                                             <span className="text-xl font-bold">{d.date.split(' ')[0]}</span>
                                             <span className="text-[10px] opacity-80">{d.date.split(' ')[1]}</span>
                                         </button>
                                     ))}
                                 </div>

                                 {/* Time Selection */}
                                 <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2"><Clock size={18}/> Select Time Slot</h4>
                                 <div className="grid grid-cols-3 sm:grid-cols-4 gap-3 mb-6">
                                     {['10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM', '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM'].map(time => (
                                         <button
                                            key={time}
                                            onClick={() => setSelectedTime(time)}
                                            className={`py-2 rounded-lg text-sm font-medium border transition-all ${selectedTime === time ? 'bg-primary-50 border-primary-500 text-primary-700' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                                         >
                                             {time}
                                         </button>
                                     ))}
                                 </div>

                                 <Button 
                                    className="w-full h-12 text-lg" 
                                    disabled={!selectedDate || !selectedTime}
                                    onClick={() => setBookingStep(2)}
                                 >
                                     Proceed to Confirmation
                                 </Button>
                             </div>
                         </div>
                     </div>
                 )}
                 
                 {bookingStep === 2 && (
                     <div className="max-w-md mx-auto space-y-6">
                         <h2 className="text-2xl font-bold text-slate-900 text-center">Confirm Booking</h2>
                         <div className="bg-slate-50 p-6 rounded-xl border border-slate-100">
                             <div className="space-y-3 text-sm">
                                 <div className="flex justify-between"><span className="text-slate-500">Doctor</span><span className="font-medium text-slate-900">{bookingDoctor?.name}</span></div>
                                 <div className="flex justify-between"><span className="text-slate-500">Date</span><span className="font-medium text-slate-900">{selectedDate}</span></div>
                                 <div className="flex justify-between"><span className="text-slate-500">Time</span><span className="font-medium text-slate-900">{selectedTime}</span></div>
                                 <div className="flex justify-between"><span className="text-slate-500">Type</span><span className="font-medium text-slate-900">{bookingType}</span></div>
                                 <div className="flex justify-between pt-2 border-t border-slate-200 mt-2">
                                     <span className="font-bold text-slate-700">Total Fee</span>
                                     <span className="font-bold text-primary-600 text-lg">৳{bookingType === 'In-Person' ? bookingDoctor?.fees.physical : bookingDoctor?.fees.online}</span>
                                 </div>
                             </div>
                         </div>
                         <div className="flex gap-3">
                             <Button variant="outline" className="flex-1" onClick={() => setBookingStep(1)}>Back</Button>
                             <Button className="flex-[2]" onClick={handleConfirmBooking}>Confirm & Book</Button>
                         </div>
                     </div>
                 )}

                 {bookingStep === 3 && (
                     <div className="text-center py-8">
                         <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600 mb-6 animate-bounce">
                             <CheckCircle size={40} />
                         </div>
                         <h2 className="text-2xl font-bold text-slate-900 mb-2">Booking Successful!</h2>
                         <Button onClick={() => { setIsBookingModalOpen(false); setViewMode('MY_APPOINTMENTS'); onNavigate('patient_appointments'); }} className="w-full">
                             View My Appointments
                         </Button>
                     </div>
                 )}
              </Modal>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
