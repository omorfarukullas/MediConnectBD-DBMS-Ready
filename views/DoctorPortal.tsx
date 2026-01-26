
import React, { useState, useEffect } from 'react';
import {
    Users, Clock, Calendar, Video, CheckCircle, XCircle, ArrowLeft,
    Home, List, Activity, FileText, CreditCard, Star, Bell, Settings,
    Play, Pause, Square, TrendingUp, LogOut, Menu, CalendarClock
} from 'lucide-react';
import { Card, Button, Badge } from '../components/UIComponents';
import { MOCK_APPOINTMENTS } from '../constants';
import { User as UserType } from '../types';
import { NotificationBell } from '../components/NotificationBell';
import { DoctorAppointmentList } from '../components/DoctorAppointmentList';
import QueueDashboard from '../components/QueueDashboard';
import SlotManagement from '../components/SlotManagement';
import { DoctorReviews } from '../components/ReviewSystem';
import { api } from '../services/apiClient';

interface DoctorPortalProps {
    currentUser?: UserType;
    onNavigate: (view: string) => void;
    onBack: () => void;
}

export const DoctorPortal: React.FC<DoctorPortalProps> = ({ currentUser, onNavigate, onBack }) => {
    console.log('🏥 DoctorPortal: Rendering with user:', currentUser);

    const [activeView, setActiveView] = useState<'DASHBOARD' | 'APPOINTMENTS' | 'SLOTS' | 'QUEUE' | 'TELEMEDICINE' | 'RECORDS' | 'EARNINGS' | 'FEEDBACK'>('DASHBOARD');
    const [currentQueue, setCurrentQueue] = useState(12);
    const [queueStatus, setQueueStatus] = useState<'ACTIVE' | 'PAUSED' | 'STOPPED'>('ACTIVE');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Data loading state
    const [appointments, setAppointments] = useState<any[]>([]);
    const [isLoadingAppointments, setIsLoadingAppointments] = useState(true);
    const [doctorProfile, setDoctorProfile] = useState<any>(null);
    const [isLoadingProfile, setIsLoadingProfile] = useState(true);

    // Earnings State
    const [earnings, setEarnings] = useState<any>(null);
    const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

    // Fetch appointments and doctor profile on mount
    useEffect(() => {
        console.log('🏥 DoctorPortal: useEffect triggered, fetching data...');
        const fetchData = async () => {
            try {
                // Fetch appointments
                setIsLoadingAppointments(true);
                console.log('🏥 DoctorPortal: Fetching appointments...');
                const appointmentsResponse = await api.getAppointments();
                console.log('🏥 DoctorPortal: Appointments fetched:', appointmentsResponse);
                // Extract data array from response object
                const appointmentsData = appointmentsResponse.data || appointmentsResponse;
                console.log('🏥 DoctorPortal: Appointments array:', appointmentsData);
                setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
                setIsLoadingAppointments(false);

                // Fetch doctor profile if user has a linked doctor record
                if (currentUser) {
                    setIsLoadingProfile(true);
                    console.log('🏥 DoctorPortal: Fetching doctor profile for:', currentUser.email);
                    try {
                        const doctors = await api.getDoctors();
                        console.log('🏥 DoctorPortal: All doctors:', doctors);
                        const matchedDoctor = doctors.find((d: any) => d.email === currentUser.email);
                        console.log('🏥 DoctorPortal: Matched doctor:', matchedDoctor);
                        setDoctorProfile(matchedDoctor || {
                            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0D8ABC&color=fff`,
                            specialization: 'General Medicine'
                        });
                    } catch (err) {
                        console.error('Error fetching doctor profile:', err);
                        setDoctorProfile({
                            image: `https://ui-avatars.com/api/?name=${encodeURIComponent(currentUser.name)}&background=0D8ABC&color=fff`,
                            specialization: 'General Medicine'
                        });
                    }
                    setIsLoadingProfile(false);
                }
            } catch (err) {
                console.error('❌ Error fetching data:', err);
                setAppointments([]);
                setIsLoadingAppointments(false);
                setIsLoadingProfile(false);
            }
        };

        if (currentUser) {
            fetchData();
        }
    }, [currentUser]);

    // Fetch earnings when switching to earnings view
    useEffect(() => {
        if (activeView === 'EARNINGS') {
            const fetchEarnings = async () => {
                try {
                    setIsLoadingEarnings(true);
                    console.log('💰 Fetching earnings data...');
                    const data = await api.getDoctorEarnings();
                    console.log('✅ Earnings API Response:', data);
                    console.log('📊 Total Earnings:', data?.totalEarnings);
                    console.log('📊 Telemedicine:', data?.telemedicine);
                    console.log('📊 Physical:', data?.physical);
                    setEarnings(data);
                } catch (err) {
                    console.error('❌ Error fetching earnings:', err);
                    setEarnings(null);
                } finally {
                    setIsLoadingEarnings(false);
                }
            };
            fetchEarnings();
        }
    }, [activeView]);

    // Use currentUser or default to mock if testing without login
    const doctorName = currentUser?.name || 'Dr. Omor Faruck';

    // Sidebar Menu Item Component
    const MenuItem = ({ view, icon, label }: { view: typeof activeView, icon: React.ReactNode, label: string }) => (
        <button
            onClick={() => { setActiveView(view); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all font-medium ${activeView === view ? 'bg-primary-600 text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}
        >
            {icon} {label}
        </button>
    );

    return (
        <div className="flex min-h-screen bg-slate-50">

            {/* DOCTOR SIDEBAR (Green Interface) */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 md:relative md:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-slate-200 overflow-hidden shadow-sm">
                            <img src={doctorProfile?.image || `https://ui-avatars.com/api/?name=${encodeURIComponent(doctorName)}&background=0D8ABC&color=fff`} className="w-full h-full object-cover" alt="Dr Profile" />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-800 text-sm truncate w-32">{doctorName}</h3>
                            <p className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle size={10} /> Verified</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    <MenuItem view="DASHBOARD" icon={<Home size={18} />} label="Dashboard" />
                    <MenuItem view="APPOINTMENTS" icon={<List size={18} />} label="Appointments" />
                    <MenuItem view="SLOTS" icon={<CalendarClock size={18} />} label="Manage Slots" />
                    <MenuItem view="QUEUE" icon={<Activity size={18} />} label="Live Queue" />
                    <MenuItem view="TELEMEDICINE" icon={<Video size={18} />} label="Telemedicine" />
                    <MenuItem view="RECORDS" icon={<FileText size={18} />} label="Patient Records" />
                    <MenuItem view="EARNINGS" icon={<CreditCard size={18} />} label="Earnings" />
                    <MenuItem view="FEEDBACK" icon={<Star size={18} />} label="Feedback" />
                </nav>
                <div className="p-4 border-t border-slate-100">
                    <button onClick={onBack} className="flex items-center gap-2 text-red-600 font-medium hover:bg-red-50 p-3 rounded-lg w-full transition-colors">
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
                            {/* Back Button for sub-views or Logout for Dashboard */}
                            <div className="flex items-center gap-2">
                                {activeView !== 'DASHBOARD' ? (
                                    <Button variant="ghost" onClick={() => setActiveView('DASHBOARD')} className="text-slate-500 hover:text-slate-800 -ml-2 px-2">
                                        <ArrowLeft size={20} />
                                    </Button>
                                ) : (
                                    <Button variant="ghost" onClick={onBack} className="text-slate-500 hover:text-slate-800 -ml-2 px-2 md:hidden">
                                        <ArrowLeft size={20} />
                                    </Button>
                                )}

                                <div>
                                    <h2 className="text-xl md:text-2xl font-bold text-slate-900">
                                        {activeView === 'DASHBOARD' ? 'Dashboard Overview' :
                                            activeView === 'QUEUE' ? 'Live Queue Management' :
                                                activeView.charAt(0) + activeView.slice(1).toLowerCase()}
                                    </h2>
                                    <p className="text-slate-500 text-sm hidden md:block">Welcome back, Doctor.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <NotificationBell />
                        <button className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-full transition-all">
                            <Settings size={20} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 md:p-8">
                    {/* VIEW: DASHBOARD */}
                    {activeView === 'DASHBOARD' && (
                        <div className="space-y-6 animate-fade-in">
                            {/* Stats Cards */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <Card className="bg-blue-50 border-blue-100">
                                    <p className="text-blue-600 font-medium mb-1">Appointments Today</p>
                                    <h2 className="text-3xl font-bold text-blue-900">12</h2>
                                    <p className="text-xs text-blue-600 mt-2">4 Telemedicine • 8 Physical</p>
                                </Card>
                                <Card className="bg-green-50 border-green-100">
                                    <p className="text-green-600 font-medium mb-1">Total Patients</p>
                                    <h2 className="text-3xl font-bold text-green-900">1,250</h2>
                                    <p className="text-xs text-green-600 mt-2">+15 this week</p>
                                </Card>
                                <Card className="bg-purple-50 border-purple-100">
                                    <p className="text-purple-600 font-medium mb-1">Pending Telemed</p>
                                    <h2 className="text-3xl font-bold text-purple-900">3</h2>
                                    <p className="text-xs text-purple-600 mt-2">Next in 15 mins</p>
                                </Card>
                                <Card className="bg-yellow-50 border-yellow-100">
                                    <p className="text-yellow-600 font-medium mb-1">Patient Rating</p>
                                    <h2 className="text-3xl font-bold text-yellow-900">4.8</h2>
                                    <div className="flex text-yellow-500 text-xs mt-2"><Star size={12} fill="currentColor" /> <Star size={12} fill="currentColor" /> <Star size={12} fill="currentColor" /> <Star size={12} fill="currentColor" /></div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                {/* Upcoming Appointments */}
                                <div className="lg:col-span-2">
                                    <Card>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="font-bold text-lg">Upcoming Appointments</h3>
                                            <Button variant="ghost" className="text-sm">View All</Button>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-sm text-left">
                                                <thead className="bg-slate-50 text-slate-500">
                                                    <tr>
                                                        <th className="p-3">Time</th>
                                                        <th className="p-3">Patient</th>
                                                        <th className="p-3">Type</th>
                                                        <th className="p-3">Status</th>
                                                        <th className="p-3">Action</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {isLoadingAppointments ? (
                                                        Array.from({ length: 3 }).map((_, i) => (
                                                            <tr key={i} className="border-b border-slate-100 animate-pulse">
                                                                <td className="p-3"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                                                                <td className="p-3"><div className="h-4 bg-slate-200 rounded w-32"></div></td>
                                                                <td className="p-3"><div className="h-4 bg-slate-200 rounded w-20"></div></td>
                                                                <td className="p-3"><div className="h-4 bg-slate-200 rounded w-16"></div></td>
                                                                <td className="p-3"><div className="h-4 bg-slate-200 rounded w-12"></div></td>
                                                            </tr>
                                                        ))
                                                    ) : appointments.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={5} className="p-8 text-center text-slate-500">
                                                                No appointments scheduled
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        appointments.map((apt) => (
                                                            <tr key={apt.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                                <td className="p-3 font-medium">{apt.time}</td>
                                                                <td className="p-3">
                                                                    <div className="font-medium">{apt.patientName}</div>
                                                                    <div className="text-xs text-slate-500">{apt.symptoms || 'General Checkup'}</div>
                                                                </td>
                                                                <td className="p-3">
                                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${apt.type === 'Telemedicine' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                                                        {apt.type}
                                                                    </span>
                                                                </td>
                                                                <td className="p-3"><Badge color={apt.status === 'Confirmed' ? 'green' : 'yellow'}>{apt.status}</Badge></td>
                                                                <td className="p-3 flex gap-2">
                                                                    <button title="Mark Visited" className="text-green-600 hover:bg-green-50 p-1 rounded"><CheckCircle size={18} /></button>
                                                                    <button title="Cancel" className="text-red-600 hover:bg-red-50 p-1 rounded"><XCircle size={18} /></button>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>
                                            </table>
                                        </div>
                                    </Card>
                                </div>

                                {/* Quick Queue Control */}
                                <div>
                                    <Card className="bg-slate-900 text-white h-full flex flex-col justify-between">
                                        <div>
                                            <h3 className="font-bold mb-4 flex items-center gap-2"><Activity size={20} /> Live Queue Control</h3>
                                            <div className="text-center py-8">
                                                <div className="text-6xl font-bold mb-2">{currentQueue}</div>
                                                <p className="text-slate-400">Current Token Serving</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <Button
                                                className="bg-green-600 hover:bg-green-700 border-none"
                                                onClick={() => setCurrentQueue(c => c + 1)}
                                            >
                                                Next Patient
                                            </Button>
                                            <Button
                                                className="bg-red-600 hover:bg-red-700 border-none"
                                            >
                                                Stop Queue
                                            </Button>
                                        </div>
                                    </Card>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* VIEW: LIVE QUEUE */}
                    {activeView === 'QUEUE' && (
                        <div className="animate-fade-in">
                            <QueueDashboard />
                        </div>
                    )}

                    {/* VIEW: EARNINGS */}
                    {activeView === 'EARNINGS' && (
                        <div className="space-y-6 animate-fade-in">
                            {isLoadingEarnings ? (
                                <div className="text-center py-12">
                                    <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mb-4"></div>
                                    <p className="text-slate-500">Loading earnings data...</p>
                                </div>
                            ) : earnings ? (
                                <>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                        <Card className="bg-slate-900 text-white">
                                            <p className="text-slate-400 font-medium mb-1">Total Earnings</p>
                                            <h2 className="text-4xl font-bold mb-2">৳ {(earnings?.totalEarnings || 0).toLocaleString()}</h2>
                                            <p className="text-xs text-slate-400">From {(earnings?.telemedicine?.count || 0) + (earnings?.physical?.count || 0)} completed appointments</p>
                                        </Card>
                                        <Card className="bg-purple-50 border-purple-100">
                                            <p className="text-purple-600 font-medium mb-1">Telemedicine Earnings</p>
                                            <h2 className="text-3xl font-bold text-purple-900">৳ {(earnings?.telemedicine?.earnings || 0).toLocaleString()}</h2>
                                            <p className="text-xs text-purple-600 mt-2">{earnings?.telemedicine?.count || 0} online consultations</p>
                                        </Card>
                                        <Card className="bg-blue-50 border-blue-100">
                                            <p className="text-blue-600 font-medium mb-1">Physical Earnings</p>
                                            <h2 className="text-3xl font-bold text-blue-900">৳ {(earnings?.physical?.earnings || 0).toLocaleString()}</h2>
                                            <p className="text-xs text-blue-600 mt-2">{earnings?.physical?.count || 0} physical visits</p>
                                        </Card>
                                    </div>

                                    <Card>
                                        <h3 className="font-bold text-lg mb-4">Recent Completed Appointments</h3>
                                        {earnings.transactions.length === 0 ? (
                                            <div className="text-center py-8 text-slate-500">
                                                <p>No completed appointments yet</p>
                                            </div>
                                        ) : (
                                            <div className="overflow-x-auto">
                                                <table className="w-full text-sm text-left">
                                                    <thead className="bg-slate-50 text-slate-500">
                                                        <tr>
                                                            <th className="p-3">Date</th>
                                                            <th className="p-3">Patient</th>
                                                            <th className="p-3">Service</th>
                                                            <th className="p-3">Amount</th>
                                                            <th className="p-3">Status</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {earnings.transactions.map((transaction: any) => (
                                                            <tr key={transaction.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                                <td className="p-3">{transaction.date}</td>
                                                                <td className="p-3">{transaction.patientName}</td>
                                                                <td className="p-3">{transaction.service}</td>
                                                                <td className="p-3 font-bold text-green-600">+ ৳{transaction.amount}</td>
                                                                <td className="p-3"><Badge color="green">{transaction.status}</Badge></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </Card>
                                </>
                            ) : (
                                <Card className="text-center py-12">
                                    <p className="text-slate-500">Unable to load earnings data</p>
                                </Card>
                            )}
                        </div>
                    )}

                    {/* VIEW: APPOINTMENTS - Date-Grouped List */}
                    {activeView === 'APPOINTMENTS' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">My Appointments</h2>
                                    <p className="text-gray-600 mt-1">Manage your scheduled appointments</p>
                                </div>
                            </div>
                            <DoctorAppointmentList
                                appointments={appointments.filter(a => !['TELEMEDICINE', 'ONLINE', 'VIDEO'].includes((a.consultationType || a.type || '').toUpperCase()))}
                                onRefresh={async () => {
                                    const appointmentsResponse = await api.getAppointments();
                                    const appointmentsData = appointmentsResponse.data || appointmentsResponse;
                                    setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
                                }}
                            />
                        </div>
                    )}

                    {/* VIEW: SLOT MANAGEMENT */}
                    {activeView === 'SLOTS' && (
                        <div className="animate-fade-in">
                            <SlotManagement />
                        </div>
                    )}


                    {/* VIEW: TELEMEDICINE */}
                    {activeView === 'TELEMEDICINE' && (
                        <div className="space-y-6 animate-fade-in">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-2xl font-bold text-slate-900">Telemedicine Appointments</h2>
                                    <p className="text-gray-600 mt-1">Manage your video consultations (Past & Upcoming)</p>
                                </div>
                                <div className="flex gap-2">
                                    <Button variant="outline" className="flex items-center gap-2">
                                        <CalendarClock size={18} /> Schedule New
                                    </Button>
                                </div>
                            </div>

                            {/* Stats for Telemedicine */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <Card className="bg-purple-50 border-purple-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
                                            <Video size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-purple-600 font-medium">Total Sessions</p>
                                            <h3 className="text-2xl font-bold text-purple-900">
                                                {appointments.filter(a => ['TELEMEDICINE', 'ONLINE', 'VIDEO'].includes((a.consultationType || a.type || '').toUpperCase())).length}
                                            </h3>
                                        </div>
                                    </div>
                                </Card>
                                <Card className="bg-blue-50 border-blue-100">
                                    <div className="flex items-center gap-3">
                                        <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
                                            <Clock size={24} />
                                        </div>
                                        <div>
                                            <p className="text-sm text-blue-600 font-medium">Upcoming</p>
                                            <h3 className="text-2xl font-bold text-blue-900">
                                                {appointments.filter(a => ['TELEMEDICINE', 'ONLINE', 'VIDEO'].includes((a.consultationType || a.type || '').toUpperCase()) && a.status !== 'COMPLETED').length}
                                            </h3>
                                        </div>
                                    </div>
                                </Card>
                            </div>

                            <DoctorAppointmentList
                                appointments={appointments.filter(a => ['TELEMEDICINE', 'ONLINE', 'VIDEO'].includes((a.consultationType || a.type || '').toUpperCase()))}
                                onRefresh={async () => {
                                    const appointmentsResponse = await api.getAppointments();
                                    const appointmentsData = appointmentsResponse.data || appointmentsResponse;
                                    setAppointments(Array.isArray(appointmentsData) ? appointmentsData : []);
                                }}
                                onStartCall={(apt) => onNavigate('telemedicine', apt)}
                            />
                        </div>
                    )}

                    {/* VIEW: FEEDBACK */}
                    {activeView === 'FEEDBACK' && (
                        <div className="space-y-6 animate-fade-in">
                            <h2 className="text-2xl font-bold text-slate-900">Patient Feedback</h2>
                            <p className="text-gray-600 mt-1">See what your patients are saying about you</p>

                            {/* DEBUG: Log what we are passing */}
                            {console.log('⭐ Rendering DoctorReviews with ID:', (currentUser as any)?.profileId || doctorProfile?.id, 'Profile:', doctorProfile)}

                            <DoctorReviews doctorId={(currentUser as any)?.profileId || doctorProfile?.id || 1} />
                        </div>
                    )}

                    {/* Placeholder for other views */}
                    {activeView === 'RECORDS' && (
                        <div className="flex items-center justify-center h-64 text-slate-400">
                            <p>View content for RECORDS is under development.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};