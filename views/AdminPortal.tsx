
import React, { useState, useEffect, useMemo } from 'react';
import {
    LayoutDashboard, Users, Calendar, Clock, Video, FileText,
    Ambulance, Building2, CreditCard, Star, Settings, LogOut,
    Menu, Bell, Plus, Filter, Search, MoreVertical, MapPin,
    Activity, CheckCircle, Edit3, Save, AlertCircle, Trash2, X, AlertTriangle,
    ChevronDown, Check, UserPlus, Play, Pause, RotateCcw, Mic, Monitor, ArrowLeft,
    MessageCircle, TrendingUp
} from 'lucide-react';
import {
    XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { MOCK_HOSPITALS, MOCK_AMBULANCES, MOCK_DEPARTMENTS, MOCK_TRANSACTIONS, MOCK_APPOINTMENTS } from '../constants';
import { Card, Badge, Button, Modal } from '../components/UIComponents';
import { User, Doctor, UserRole, Appointment, AppointmentStatus } from '../types';
import { api } from '../services/apiClient';

export const AdminPortal = ({ currentUser, onBack }: { currentUser: User, onBack: () => void }) => {
    const [activeView, setActiveView] = useState<'DASHBOARD' | 'DOCTORS' | 'DOCTOR_SCHEDULES' | 'APPOINTMENTS' | 'QUEUE' | 'TELEMEDICINE' | 'RECORDS' | 'AMBULANCE' | 'DEPARTMENTS' | 'PROFILE' | 'FINANCIALS' | 'FEEDBACK' | 'SETTINGS'>('DASHBOARD');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Hospital State & Resources (Fetched from API)
    const [hospital, setHospital] = useState<any>(null);
    const [hospitalResources, setHospitalResources] = useState<any[]>([]);
    const [departments, setDepartments] = useState<any[]>([]);
    const [tests, setTests] = useState<any[]>([]);
    const [isLoadingResources, setIsLoadingResources] = useState(false);

    // Doctors Management State
    const [doctors, setDoctors] = useState<Doctor[]>([]);
    const [isLoadingDoctors, setIsLoadingDoctors] = useState(true);

    // Fetch doctors on mount
    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                setIsLoadingDoctors(true);
                console.log('🔍 Fetching hospital doctors...');
                const doctorsData = await api.getHospitalDoctors();
                console.log('📥 Raw API response:', doctorsData);
                console.log('📊 Type of response:', typeof doctorsData);
                console.log('📊 Is Array?:', Array.isArray(doctorsData));
                console.log('📊 Length:', Array.isArray(doctorsData) ? doctorsData.length : 'N/A');

                // Handle different response formats
                const doctorsList = Array.isArray(doctorsData) ? doctorsData : [];
                console.log('✅ Setting doctors:', doctorsList.length, 'doctors');
                setDoctors(doctorsList);
            } catch (err) {
                console.error('❌ Error fetching doctors:', err);
                setDoctors([]);
            } finally {
                setIsLoadingDoctors(false);
            }
        };
        fetchDoctors();
    }, []);
    const [isDoctorModalOpen, setIsDoctorModalOpen] = useState(false);
    const [isEditingDoctor, setIsEditingDoctor] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [doctorToDelete, setDoctorToDelete] = useState<string | null>(null);

    // Initial Doctor Form State
    const initialDoctorForm = {
        id: '',
        name: '',
        email: '',
        specialization: 'General Medicine',
        bmdcNumber: '',
        fees: { online: 500, physical: 1000 },
        status: 'Active' as 'Active' | 'Inactive' | 'On Leave',
        image: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300'
    };
    const [doctorForm, setDoctorForm] = useState(initialDoctorForm);

    // Appointments Management State
    const [appointments, setAppointments] = useState<Appointment[]>(MOCK_APPOINTMENTS);
    const [appointmentFilter, setAppointmentFilter] = useState({
        search: '',
        status: 'All',
        date: '',
        doctor: 'All'
    });

    // Appointment Action Modals
    const [isRescheduleModalOpen, setIsRescheduleModalOpen] = useState(false);
    const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
    const [rescheduleData, setRescheduleData] = useState({ date: '', time: '' });

    const [isReassignModalOpen, setIsReassignModalOpen] = useState(false);
    const [reassignDoctorId, setReassignDoctorId] = useState('');

    // Queue Management State  
    const [selectedQueueDoctor, setSelectedQueueDoctor] = useState<Doctor | null>(null);
    const [queueStatus, setQueueStatus] = useState<'ACTIVE' | 'PAUSED' | 'STOPPED'>('ACTIVE');
    const [currentQueueToken, setCurrentQueueToken] = useState(15);
    const [hospitalQueue, setHospitalQueue] = useState<any[]>([]);
    const [isLoadingQueue, setIsLoadingQueue] = useState(false);

    // Fetch hospital-wide queue data
    useEffect(() => {
        const fetchHospitalQueue = async () => {
            try {
                setIsLoadingQueue(true);
                const queueData = await api.getHospitalQueue() as any[];
                setHospitalQueue(queueData);
                console.log('✅ Fetched hospital queue:', queueData.length, 'appointments');
            } catch (err) {
                console.error('❌ Error fetching hospital queue:', err);
            } finally {
                setIsLoadingQueue(false);
            }
        };

        // Initial fetch
        fetchHospitalQueue();

        // Poll every 10 seconds for live updates
        const interval = setInterval(fetchHospitalQueue, 10000);

        return () => clearInterval(interval);
    }, []);

    // Feedback State
    const [reviews, setReviews] = useState<any[]>([]);
    const [isLoadingReviews, setIsLoadingReviews] = useState(false);
    const [reviewsPerPage, setReviewsPerPage] = useState(10);
    const [currentReviewPage, setCurrentReviewPage] = useState(1);

    // Fetch reviews when on Feedback view
    useEffect(() => {
        if (activeView === 'FEEDBACK') {
            const fetchReviews = async () => {
                try {
                    setIsLoadingReviews(true);
                    console.log('🔍 Fetching hospital reviews...');
                    const data: any = await api.getAllReviews();
                    setReviews(data.reviews || []);
                    console.log('✅ Fetched reviews:', data.reviews?.length);
                } catch (err) {
                    console.error('❌ Error fetching reviews:', err);
                } finally {
                    setIsLoadingReviews(false);
                }
            };
            fetchReviews();
        }
    }, [activeView]);

    // Memoize feedback statistics to avoid recalculating on every render
    const feedbackStats = useMemo(() => {
        if (reviews.length === 0) return null;

        return {
            averageRating: (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1),
            totalReviews: reviews.length,
            verifiedCount: reviews.filter(r => r.isVerified).length,
            fiveStarCount: reviews.filter(r => r.rating === 5).length,
            ratingDistribution: [5, 4, 3, 2, 1].map(rating => ({
                rating,
                count: reviews.filter(r => r.rating === rating).length,
                percentage: (reviews.filter(r => r.rating === rating).length / reviews.length) * 100
            }))
        };
    }, [reviews]);

    // Paginate reviews
    const paginatedReviews = useMemo(() => {
        const startIndex = (currentReviewPage - 1) * reviewsPerPage;
        const endIndex = startIndex + reviewsPerPage;
        return reviews.slice(startIndex, endIndex);
    }, [reviews, currentReviewPage, reviewsPerPage]);

    const totalReviewPages = Math.ceil(reviews.length / reviewsPerPage);

    // Fetch hospital resources on mount
    useEffect(() => {
        const fetchResources = async () => {
            try {
                setIsLoadingResources(true);

                // Fetch hospital details and resources together
                const [hospitalData, resourcesData] = await Promise.all([
                    api.getHospitalDetails(),
                    api.getHospitalResources()
                ]);

                console.log('✅ Fetched hospital details:', hospitalData);
                console.log('✅ Fetched hospital resources:', resourcesData);

                // @ts-ignore
                setHospital(hospitalData);
                // @ts-ignore
                setHospitalResources(resourcesData.resources || []);
                // @ts-ignore
                setDepartments(resourcesData.departments || []);
                // @ts-ignore
                setTests(resourcesData.tests || []);
                // @ts-ignore - ambulances already fetched separately
            } catch (err) {
                console.error('❌ Error fetching resources:', err);
            } finally {
                setIsLoadingResources(false);
            }
        };
        fetchResources();

        // Fetch Appointments
        const fetchAppointments = async () => {
            try {
                const appointmentsData = await api.getHospitalAppointments();
                // Map API data to Appointment type if needed, or cast it.
                // API returns snake_case (consultation_type), frontend might expect camelCase
                // Let's map it to be safe
                const formattedAppointments = (appointmentsData as any[]).map(apt => ({
                    id: apt.id.toString(),
                    patientId: apt.patient_id,
                    patientName: apt.patient_name || 'Unknown',
                    doctorId: apt.doctor_id,
                    doctorName: apt.doctor_name || 'Unknown',
                    date: apt.appointment_date,
                    time: apt.appointment_time,
                    type: apt.consultation_type === 'TELEMEDICINE' ? 'Telemedicine' : 'In-Person',
                    consultationType: apt.consultation_type === 'TELEMEDICINE' ? 'Telemedicine' : 'In-Person',
                    status: apt.status,
                    symptoms: apt.reason_for_visit
                }));
                setAppointments(formattedAppointments);
            } catch (err) {
                console.error('❌ Error fetching appointments:', err);
            }
        };
        fetchAppointments();
    }, []);

    // Test Management State
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [isEditingTest, setIsEditingTest] = useState(false);
    const [selectedTest, setSelectedTest] = useState<any>(null);
    const [testForm, setTestForm] = useState({
        id: 0,
        department_id: '',
        name: '',
        description: '',
        cost: 0,
        duration_minutes: 30,
        is_available: true
    });

    const handleAddTestClick = () => {
        setIsEditingTest(false);
        setTestForm({
            id: 0,
            department_id: departments.length > 0 ? departments[0].id : '',
            name: '',
            description: '',
            cost: 0,
            duration_minutes: 30,
            is_available: true
        });
        setIsTestModalOpen(true);
    };

    const handleEditTestClick = (test: any) => {
        setIsEditingTest(true);
        // Find department ID for this test
        const dept = departments.find(d => d.name === test.department_name);
        setTestForm({
            id: test.id,
            department_id: dept ? dept.id : '', // We might need to fetch dept ID if not in view model
            name: test.name,
            description: test.description || '',
            cost: test.cost,
            duration_minutes: test.duration_minutes || 30,
            is_available: test.is_available ?? true
        });
        setIsTestModalOpen(true);
    };

    const handleSaveTest = async () => {
        if (!testForm.name || !testForm.cost || !testForm.department_id) {
            alert("Please fill in required fields (Name, Department, Cost)");
            return;
        }

        try {
            if (isEditingTest) {
                // Update existing test
                await api.updateTest(testForm.id, {
                    name: testForm.name,
                    description: testForm.description,
                    cost: parseInt(testForm.cost.toString()),
                    duration_minutes: parseInt(testForm.duration_minutes.toString()),
                    is_available: testForm.is_available
                });
                console.log('✅ Test updated successfully');
            } else {
                // Add new test
                await api.addTest({
                    department_id: parseInt(testForm.department_id.toString()),
                    name: testForm.name,
                    description: testForm.description,
                    cost: parseInt(testForm.cost.toString()),
                    duration_minutes: parseInt(testForm.duration_minutes.toString())
                });
                console.log('✅ Test added successfully');
            }

            // Refresh resources to get updated tests
            const data = await api.getHospitalResources();
            // @ts-ignore
            setTests(data.tests || []);

            setIsTestModalOpen(false);
        } catch (err) {
            console.error('❌ Error saving test:', err);
            alert('Failed to save test. Please try again.');
        }
    };

    const handleDeleteTest = async (id: number) => {
        if (!confirm('Are you sure you want to delete this test?')) return;

        try {
            await api.deleteTest(id);
            // Refresh resources
            const data = await api.getHospitalResources();
            // @ts-ignore
            setTests(data.tests || []);
            console.log('✅ Test deleted successfully');
        } catch (err) {
            console.error('❌ Error deleting test:', err);
            alert('Failed to delete test. Please try again.');
        }
    };

    // Resource Edit State
    const [isResourceModalOpen, setIsResourceModalOpen] = useState(false);
    const [selectedResource, setSelectedResource] = useState<any>(null);
    const [resourceForm, setResourceForm] = useState({
        available: 0,
        total_capacity: 0
    });

    const handleOpenResourceEdit = (resource: any) => {
        setSelectedResource(resource);
        setResourceForm({
            available: resource.available,
            total_capacity: resource.total_capacity
        });
        setIsResourceModalOpen(true);
    };

    const handleUpdateResources = async () => {
        try {
            if (!selectedResource) return;

            console.log('📝 Updating resource via API...');
            await api.updateResource(selectedResource.id, {
                available: parseInt(resourceForm.available.toString()),
                total_capacity: parseInt(resourceForm.total_capacity.toString())
            });

            // Refresh resources
            const data = await api.getHospitalResources();
            // @ts-ignore
            setHospitalResources(data.resources || []);

            setIsResourceModalOpen(false);
            console.log('✅ Resource updated successfully');
        } catch (err) {
            console.error('❌ Error updating resource:', err);
            alert('Failed to update resource. Please try again.');
        }
    };

    // Ambulance Management State
    const [ambulances, setAmbulances] = useState<any[]>([]);
    const [isLoadingAmbulances, setIsLoadingAmbulances] = useState(false);
    const [isAmbulanceModalOpen, setIsAmbulanceModalOpen] = useState(false);
    const [isEditingAmbulance, setIsEditingAmbulance] = useState(false);
    const [ambulanceForm, setAmbulanceForm] = useState({
        id: 0,
        vehicle_number: '',
        driver_name: '',
        driver_phone: '',
        ambulance_type: 'BASIC' as 'BASIC' | 'ADVANCED' | 'ICU',
        status: 'AVAILABLE' as 'AVAILABLE' | 'BUSY' | 'MAINTENANCE'
    });

    // Fetch ambulances on mount
    useEffect(() => {
        const fetchAmbulances = async () => {
            try {
                setIsLoadingAmbulances(true);
                const ambulancesData = await api.getAmbulances();
                setAmbulances(ambulancesData);
                console.log('✅ Fetched ambulances:', ambulancesData.length);
            } catch (err) {
                console.error('❌ Error fetching ambulances:', err);
                setAmbulances([]);
            } finally {
                setIsLoadingAmbulances(false);
            }
        };
        fetchAmbulances();
    }, []);

    // Ambulance CRUD Handlers
    const handleAddAmbulanceClick = () => {
        setIsEditingAmbulance(false);
        setAmbulanceForm({
            id: 0,
            vehicle_number: '',
            driver_name: '',
            driver_phone: '',
            ambulance_type: 'BASIC',
            status: 'AVAILABLE'
        });
        setIsAmbulanceModalOpen(true);
    };

    const handleEditAmbulanceClick = (ambulance: any) => {
        setIsEditingAmbulance(true);
        setAmbulanceForm({
            id: ambulance.id,
            vehicle_number: ambulance.vehicle_number,
            driver_name: ambulance.driver_name || '',
            driver_phone: ambulance.driver_phone || '',
            ambulance_type: ambulance.ambulance_type,
            status: ambulance.status
        });
        setIsAmbulanceModalOpen(true);
    };

    const handleSaveAmbulance = async () => {
        if (!ambulanceForm.vehicle_number || !ambulanceForm.driver_name) {
            alert("Please fill in required fields (vehicle number and driver name)");
            return;
        }

        try {
            if (isEditingAmbulance) {
                // Update ambulance status
                await api.updateAmbulance(ambulanceForm.id, {
                    status: ambulanceForm.status
                });

                setAmbulances(prev => prev.map(a => a.id === ambulanceForm.id ? {
                    ...a,
                    status: ambulanceForm.status
                } : a));

                console.log('✅ Ambulance updated successfully');
            } else {
                // Add new ambulance
                await api.addAmbulance({
                    vehicle_number: ambulanceForm.vehicle_number,
                    driver_name: ambulanceForm.driver_name,
                    driver_phone: ambulanceForm.driver_phone,
                    ambulance_type: ambulanceForm.ambulance_type
                });

                const updatedAmbulances = await api.getAmbulances();
                setAmbulances(updatedAmbulances);

                console.log('✅ Ambulance added successfully');
            }

            setIsAmbulanceModalOpen(false);
        } catch (err) {
            console.error('❌ Error saving ambulance:', err);
            alert('Failed to save ambulance. Please try again.');
        }
    };

    const handleDeleteAmbulance = async (id: number) => {
        if (!confirm('Are you sure you want to delete this ambulance?')) return;

        try {
            await api.deleteAmbulance(id);
            setAmbulances(prev => prev.filter(a => a.id !== id));
            console.log('✅ Ambulance deleted successfully');
        } catch (err) {
            console.error('❌ Error deleting ambulance:', err);
            alert('Failed to delete ambulance. Please try again.');
        }
    };

    // ============================================================
    // DOCTOR SCHEDULE MANAGEMENT
    // ============================================================
    const [schedules, setSchedules] = useState<any[]>([]);
    const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);
    const [selectedDoctorSchedule, setSelectedDoctorSchedule] = useState<number | null>(null);
    const [doctorSlots, setDoctorSlots] = useState<any[]>([]);
    const [isLoadingSlots, setIsLoadingSlots] = useState(false);
    const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
    const [isEditingSlot, setIsEditingSlot] = useState(false);
    const [slotForm, setSlotForm] = useState({
        id: 0,
        day_of_week: 'Monday',
        start_time: '09:00',
        end_time: '10:00',
        max_patients: 10,
        consultation_duration: 15,
        is_active: true
    });

    // Fetch schedules overview
    useEffect(() => {
        if (activeView === 'DOCTOR_SCHEDULES' && !selectedDoctorSchedule) {
            fetchSchedulesOverview();
        }
    }, [activeView, selectedDoctorSchedule]);

    // Fetch doctor slots when doctor is selected
    useEffect(() => {
        if (selectedDoctorSchedule) {
            fetchDoctorSlots(selectedDoctorSchedule);
        }
    }, [selectedDoctorSchedule]);

    const fetchSchedulesOverview = async () => {
        try {
            setIsLoadingSchedules(true);
            const schedulesData = await api.getAllDoctorSchedules();
            setSchedules(schedulesData);
            console.log('✅ Fetched schedules overview:', schedulesData.length);
        } catch (err) {
            console.error('❌ Error fetching schedules:', err);
            setSchedules([]);
        } finally {
            setIsLoadingSchedules(false);
        }
    };

    const fetchDoctorSlots = async (doctorId: number) => {
        try {
            setIsLoadingSlots(true);
            const slotsData = await api.getDoctorSlots(doctorId);
            setDoctorSlots(slotsData);
            console.log('✅ Fetched doctor slots:', slotsData.length);
        } catch (err) {
            console.error('❌ Error fetching doctor slots:', err);
            setDoctorSlots([]);
        } finally {
            setIsLoadingSlots(false);
        }
    };

    const handleAddSlotClick = () => {
        setIsEditingSlot(false);
        setSlotForm({
            id: 0,
            day_of_week: 'Monday',
            start_time: '09:00',
            end_time: '10:00',
            max_patients: 10,
            consultation_duration: 15,
            is_active: true
        });
        setIsSlotModalOpen(true);
    };

    const handleEditSlotClick = (slot: any) => {
        setIsEditingSlot(true);
        setSlotForm({
            id: slot.id,
            day_of_week: slot.day_of_week,
            start_time: slot.start_time,
            end_time: slot.end_time,
            max_patients: slot.max_patients,
            consultation_duration: slot.consultation_duration,
            is_active: slot.is_active
        });
        setIsSlotModalOpen(true);
    };

    const handleSaveSlot = async () => {
        if (!selectedDoctorSchedule) return;

        try {
            if (isEditingSlot) {
                // Update existing slot
                await api.updateDoctorSlot(slotForm.id, {
                    day_of_week: slotForm.day_of_week,
                    start_time: slotForm.start_time,
                    end_time: slotForm.end_time,
                    max_patients: slotForm.max_patients,
                    consultation_duration: slotForm.consultation_duration,
                    is_active: slotForm.is_active
                });
                console.log('✅ Slot updated successfully');
            } else {
                // Add new slot
                await api.addDoctorSlot(selectedDoctorSchedule, {
                    day_of_week: slotForm.day_of_week,
                    start_time: slotForm.start_time,
                    end_time: slotForm.end_time,
                    max_patients: slotForm.max_patients,
                    consultation_duration: slotForm.consultation_duration
                });
                console.log('✅ Slot added successfully');
            }

            // Refresh slots
            await fetchDoctorSlots(selectedDoctorSchedule);
            setIsSlotModalOpen(false);
        } catch (err) {
            console.error('❌ Error saving slot:', err);
            alert('Failed to save slot. Please check for time conflicts.');
        }
    };

    const handleDeleteSlot = async (slotId: number) => {
        if (!confirm('Are you sure you want to delete this time slot?')) return;

        try {
            await api.deleteDoctorSlot(slotId);
            if (selectedDoctorSchedule) {
                await fetchDoctorSlots(selectedDoctorSchedule);
            }
            console.log('✅ Slot deleted successfully');
        } catch (err) {
            console.error('❌ Error deleting slot:', err);
            alert('Failed to delete slot. Please try again.');
        }
    };

    const handleToggleSlotStatus = async (slotId: number) => {
        try {
            await api.toggleSlotStatus(slotId);
            if (selectedDoctorSchedule) {
                await fetchDoctorSlots(selectedDoctorSchedule);
            }
            console.log('✅ Slot status toggled successfully');
        } catch (err) {
            console.error('❌ Error toggling slot status:', err);
            alert('Failed to toggle slot status. Please try again.');
        }
    };

    // Doctor CRUD Handlers
    const handleAddDoctorClick = () => {
        setIsEditingDoctor(false);
        setDoctorForm({ ...initialDoctorForm, id: Date.now().toString() });
        setIsDoctorModalOpen(true);
    };

    const handleEditDoctorClick = (doc: any) => {
        setIsEditingDoctor(true);
        // Map database fields to form fields
        // API returns: full_name, email, specialization, bmdc_number, consultation_fee
        setDoctorForm({
            id: doc.id?.toString() || '',
            name: doc.full_name || doc.name || '',
            email: doc.email || '',
            specialization: doc.specialization || 'General Medicine',
            bmdcNumber: doc.bmdc_number || doc.bmdcNumber || '',
            fees: {
                online: doc.consultation_fee || doc.fees?.online || 500,
                physical: doc.consultation_fee || doc.fees?.physical || 1000
            },
            status: 'Active', // Default value, not saved to DB
            image: doc.image || 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=300&h=300'
        });
        setIsDoctorModalOpen(true);
    };

    const handleDeleteClick = (id: string) => {
        setDoctorToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDeleteDoctor = async () => {
        if (doctorToDelete) {
            try {
                await api.deleteDoctor(parseInt(doctorToDelete));
                setDoctors(prev => prev.filter(d => d.id !== doctorToDelete));
                setDoctorToDelete(null);
                setIsDeleteModalOpen(false);
                console.log('✅ Doctor deleted successfully');
            } catch (err) {
                console.error('❌ Error deleting doctor:', err);
                alert('Failed to delete doctor. Please try again.');
            }
        }
    };

    const handleSaveDoctor = async () => {
        if (!doctorForm.name || !doctorForm.email) {
            alert("Please fill in required fields (name and email)");
            return;
        }

        try {
            if (isEditingDoctor) {
                // Update existing doctor
                await api.updateDoctor(parseInt(doctorForm.id), {
                    name: doctorForm.name,
                    specialization: doctorForm.specialization,
                    consultation_fee: doctorForm.fees.online,
                    experience_years: 0,
                });

                // Update local state
                setDoctors(prev => prev.map(d => d.id === doctorForm.id ? {
                    ...d,
                    name: doctorForm.name,
                    email: doctorForm.email,
                    specialization: doctorForm.specialization,
                    fees: doctorForm.fees,
                    status: doctorForm.status
                } : d));

                console.log('✅ Doctor updated successfully');
            } else {
                // Add new doctor
                const response = await api.addDoctor({
                    email: doctorForm.email,
                    password: 'temp123', // Temporary password
                    name: doctorForm.name,
                    specialization: doctorForm.specialization,
                    consultation_fee: doctorForm.fees.online,
                    experience_years: 0
                });

                // Refresh doctor list from API
                const updatedDoctors = await api.getHospitalDoctors();
                setDoctors(updatedDoctors);

                console.log('✅ Doctor added successfully:', response);
            }

            setIsDoctorModalOpen(false);
        } catch (err) {
            console.error('❌ Error saving doctor:', err);
            alert('Failed to save doctor. Please try again.');
        }
    };

    // Queue Logic - Now using real API data from hospital queue
    const handleNextPatient = () => {
        // This is now handled by the doctor's individual queue dashboard
        // Real API calls would be made through that interface
        console.log('Next patient would be called via doctor queue API');
    };

    // Appointment Logic
    const filteredAppointments = appointments.filter(apt => {
        const matchesSearch = apt.patientName.toLowerCase().includes(appointmentFilter.search.toLowerCase()) ||
            apt.id.toLowerCase().includes(appointmentFilter.search.toLowerCase());
        const matchesStatus = appointmentFilter.status === 'All' || apt.status === appointmentFilter.status;
        const matchesDate = !appointmentFilter.date || apt.date === appointmentFilter.date;
        const matchesDoctor = appointmentFilter.doctor === 'All' || apt.doctorName === appointmentFilter.doctor;
        return matchesSearch && matchesStatus && matchesDate && matchesDoctor;
    });

    const updateAppointmentStatus = (id: string, status: AppointmentStatus) => {
        setAppointments(prev => prev.map(a => a.id === id ? { ...a, status } : a));
    };

    const openRescheduleModal = (apt: Appointment) => {
        setSelectedAppointment(apt);
        setRescheduleData({ date: apt.date, time: apt.time });
        setIsRescheduleModalOpen(true);
    };

    const handleRescheduleSubmit = () => {
        if (selectedAppointment) {
            setAppointments(prev => prev.map(a => a.id === selectedAppointment.id ? {
                ...a,
                date: rescheduleData.date,
                time: rescheduleData.time,
                status: AppointmentStatus.CONFIRMED // Reset status if it was missed/cancelled
            } : a));
            setIsRescheduleModalOpen(false);
            setSelectedAppointment(null);
        }
    };

    const openReassignModal = (apt: Appointment) => {
        setSelectedAppointment(apt);
        // Try to find doctor id by name match (simple mock logic)
        const currentDoc = doctors.find(d => d.name === apt.doctorName);
        setReassignDoctorId(currentDoc?.id || '');
        setIsReassignModalOpen(true);
    };

    const handleReassignSubmit = () => {
        if (selectedAppointment && reassignDoctorId) {
            const newDoc = doctors.find(d => d.id === reassignDoctorId);
            if (newDoc) {
                setAppointments(prev => prev.map(a => a.id === selectedAppointment.id ? {
                    ...a,
                    doctorName: newDoc.name
                } : a));
            }
            setIsReassignModalOpen(false);
            setSelectedAppointment(null);
        }
    };

    // Sidebar Menu Item Component
    const MenuItem = ({ view, icon, label }: { view: typeof activeView, icon: React.ReactNode, label: string }) => (
        <button
            onClick={() => { setActiveView(view); setIsSidebarOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all font-medium text-sm ${activeView === view ? 'bg-primary-600 text-white shadow-lg shadow-primary-500/20' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
        >
            {icon} {label}
        </button>
    );

    const revenueData = [
        { name: 'Mon', value: 45000 },
        { name: 'Tue', value: 52000 },
        { name: 'Wed', value: 48000 },
        { name: 'Thu', value: 61000 },
        { name: 'Fri', value: 55000 },
        { name: 'Sat', value: 67000 },
        { name: 'Sun', value: 72000 },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50 font-sans">

            {/* HOSPITAL ADMIN SIDEBAR */}
            <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col transition-transform duration-300 lg:relative lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="p-6 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 shadow-sm border border-primary-100">
                            <Building2 size={24} />
                        </div>
                        <div>
                            <h3 className="font-bold text-slate-900 text-sm truncate w-32 font-heading">{hospital?.name || 'Loading...'}</h3>
                            <p className="text-xs text-slate-500 font-medium">Admin Portal</p>
                        </div>
                    </div>
                </div>
                <nav className="flex-1 p-3 space-y-1 overflow-y-auto custom-scrollbar">
                    <MenuItem view="DASHBOARD" icon={<LayoutDashboard size={18} />} label="Dashboard" />
                    <MenuItem view="DOCTORS" icon={<Users size={18} />} label="Doctors Management" />
                    <MenuItem view="DOCTOR_SCHEDULES" icon={<Clock size={18} />} label="Doctor Schedules" />
                    <MenuItem view="APPOINTMENTS" icon={<Calendar size={18} />} label="Appointments" />
                    <MenuItem view="TELEMEDICINE" icon={<Video size={18} />} label="Telemedicine" />
                    <MenuItem view="RECORDS" icon={<FileText size={18} />} label="Patient Records" />
                    <MenuItem view="AMBULANCE" icon={<Ambulance size={18} />} label="Ambulance Service" />
                    <MenuItem view="DEPARTMENTS" icon={<Activity size={18} />} label="Departments" />
                    <MenuItem view="PROFILE" icon={<Building2 size={18} />} label="Hospital Profile" />
                    <MenuItem view="FEEDBACK" icon={<Star size={18} />} label="Patient Feedback" />
                    <MenuItem view="FINANCIALS" icon={<CreditCard size={18} />} label="Financials" />
                    <MenuItem view="SETTINGS" icon={<Settings size={18} />} label="Settings" />
                </nav>
                <div className="p-4 border-t border-slate-100">
                    <button onClick={onBack} className="flex items-center gap-2 text-red-600 font-medium hover:bg-red-50 p-3 rounded-lg w-full transition-colors justify-center">
                        <LogOut size={18} /> Logout
                    </button>
                </div>
            </aside>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)}></div>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Header */}
                <div className="bg-white/80 backdrop-blur-md border-b border-slate-200 px-6 py-4 flex justify-between items-center lg:bg-transparent lg:border-b-0 lg:pt-8 lg:px-8 z-10">
                    <div className="flex items-center gap-3">
                        <button className="lg:hidden text-slate-600" onClick={() => setIsSidebarOpen(true)}>
                            <Menu size={24} />
                        </button>
                        <div>
                            <h2 className="text-xl lg:text-3xl font-bold text-slate-900 capitalize font-heading">
                                {activeView === 'DASHBOARD' ? 'Hospital Overview' :
                                    activeView === 'QUEUE' ? 'Smart Queue Management' :
                                        activeView === 'DOCTOR_SCHEDULES' ? 'Doctor Schedule Management' :
                                            activeView.replace('_', ' ').toLowerCase()}
                            </h2>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button className="p-2 text-slate-500 hover:bg-white hover:shadow-sm rounded-full relative transition-all">
                            <Bell size={20} />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                        <div className="w-10 h-10 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-bold border border-white shadow-sm">
                            A
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">

                    {/* --- DASHBOARD VIEW --- */}
                    {activeView === 'DASHBOARD' && (
                        <div className="space-y-4 sm:space-y-6 animate-fade-in pb-10">
                            {/* Metrics Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                                <Card className="bg-white border-l-4 border-l-blue-500">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-500 font-bold text-[10px] sm:text-xs uppercase tracking-wide">Appointments Today</p>
                                            <h2 className="text-2xl sm:text-3xl font-heading font-bold text-slate-900 mt-1">42</h2>
                                        </div>
                                        <div className="p-2 sm:p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Calendar size={18} className="sm:w-5 sm:h-5" /></div>
                                    </div>
                                    <div className="mt-2 sm:mt-3 text-[10px] sm:text-xs text-blue-600 font-bold flex gap-1 sm:gap-2 bg-blue-50 px-2 py-1 rounded inline-block">
                                        <span>28 Physical</span> <span>•</span> <span>14 Online</span>
                                    </div>
                                </Card>
                                <Card className="bg-white border-l-4 border-l-green-500">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">Active Doctors</p>
                                            <h2 className="text-3xl font-heading font-bold text-slate-900 mt-1">{doctors.length}</h2>
                                        </div>
                                        <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><Users size={20} /></div>
                                    </div>
                                    <div className="mt-3 text-xs text-green-600 font-bold bg-green-50 px-2 py-1 rounded inline-block">
                                        3 Departments Active
                                    </div>
                                </Card>
                                <Card className="bg-white border-l-4 border-l-orange-500">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">Live Queue</p>
                                            <h2 className="text-3xl font-heading font-bold text-slate-900 mt-1">115</h2>
                                        </div>
                                        <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl"><Clock size={20} /></div>
                                    </div>
                                    <div className="mt-3 text-xs text-orange-600 font-bold bg-orange-50 px-2 py-1 rounded inline-block">
                                        Avg Wait: 22 mins
                                    </div>
                                </Card>
                                <Card className="bg-white border-l-4 border-l-purple-500">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">Daily Revenue</p>
                                            <h2 className="text-3xl font-heading font-bold text-slate-900 mt-1">৳ 1.2L</h2>
                                        </div>
                                        <div className="p-2.5 bg-purple-50 text-purple-600 rounded-xl"><CreditCard size={20} /></div>
                                    </div>
                                    <div className="mt-3 text-xs text-purple-600 font-bold bg-purple-50 px-2 py-1 rounded inline-block">
                                        +12% vs yesterday
                                    </div>
                                </Card>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
                                {/* Revenue Chart */}
                                <Card className="lg:col-span-2">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-0 mb-4 sm:mb-6">
                                        <h3 className="font-bold text-base sm:text-lg text-slate-800 font-heading">Revenue Analytics</h3>
                                        <select className="text-xs sm:text-sm border-slate-200 rounded-lg p-1.5 bg-white w-full sm:w-auto">
                                            <option>This Week</option>
                                            <option>This Month</option>
                                        </select>
                                    </div>
                                    <div className="h-64">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={revenueData}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                                                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                                                <Tooltip
                                                    contentStyle={{ backgroundColor: '#fff', borderRadius: '12px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1)' }}
                                                    itemStyle={{ color: '#0f172a', fontWeight: 'bold' }}
                                                    cursor={{ stroke: '#cbd5e1', strokeWidth: 1 }}
                                                />
                                                <Line type="monotone" dataKey="value" stroke="rgb(var(--primary-500))" strokeWidth={3} dot={{ r: 4, fill: '#fff', strokeWidth: 2 }} activeDot={{ r: 7 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </Card>

                                {/* Resource Monitor */}
                                <Card>
                                    <div className="flex justify-between items-center mb-6">
                                        <h3 className="font-bold text-lg text-slate-800 font-heading">Resource Availability</h3>
                                    </div>

                                    {isLoadingResources ? (
                                        <div className="text-center py-8">
                                            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                            <p className="mt-3 text-slate-500 text-sm">Loading resources...</p>
                                        </div>
                                    ) : hospitalResources.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                                            <p className="text-slate-500">No resources configured</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-4">
                                            {hospitalResources.map(resource => {
                                                const occupied = resource.total_capacity - resource.available;
                                                const occupiedPercent = (occupied / resource.total_capacity) * 100;
                                                const isLow = resource.available < (resource.total_capacity * 0.25);

                                                const color =
                                                    resource.resource_type === 'ICU' ? { bg: 'red', text: 'red' } :
                                                        resource.resource_type === 'CCU' ? { bg: 'orange', text: 'orange' } :
                                                            resource.resource_type === 'CABIN' ? { bg: 'purple', text: 'purple' } :
                                                                { bg: 'blue', text: 'blue' };

                                                return (
                                                    <div key={resource.id} className={`p-4 bg-${color.bg}-50 rounded-2xl border border-${color.bg}-100`}>
                                                        <div className="flex justify-between items-center mb-2">
                                                            <span className={`font-bold text-${color.text}-700 text-sm flex items-center gap-2`}>
                                                                <Activity size={16} /> {resource.resource_type.replace('_', ' ')}
                                                            </span>
                                                            <span className={`font-bold text-${color.text}-700 bg-white px-2 py-0.5 rounded text-xs border border-${color.text}-100 shadow-sm`}>
                                                                {resource.available}/{resource.total_capacity}
                                                            </span>
                                                        </div>
                                                        <div className={`w-full bg-${color.bg}-200/50 rounded-full h-2.5`}>
                                                            <div
                                                                className={`bg-${color.bg}-500 h-2.5 rounded-full transition-all duration-700 ease-out shadow-sm`}
                                                                style={{ width: `${occupiedPercent}%` }}
                                                            ></div>
                                                        </div>
                                                        {isLow && (
                                                            <p className={`text-[10px] text-${color.text}-600 mt-2 font-bold flex items-center gap-1`}>
                                                                <AlertCircle size={12} /> Low Availability
                                                            </p>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </Card>

                            </div>
                        </div>
                    )}

                    {/* --- SMART QUEUE MANAGEMENT --- */}
                    {activeView === 'QUEUE' && (
                        <div className="space-y-6 animate-fade-in pb-10">

                            {!selectedQueueDoctor ? (
                                <>
                                    <div className="mb-6">
                                        <h3 className="text-xl font-bold text-slate-900 font-heading">Select Doctor Queue</h3>
                                        <p className="text-slate-500 text-sm">Choose a doctor to manage their live patient queue</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                                        {doctors.map(doc => (
                                            <div
                                                key={doc.id}
                                                onClick={() => { setSelectedQueueDoctor(doc); setCurrentQueueToken(Math.floor(Math.random() * 20)); }}
                                                className="bg-white rounded-2xl border border-slate-100 p-6 hover:shadow-lg hover:border-primary-200 transition-all cursor-pointer group hover:-translate-y-1"
                                            >
                                                <div className="flex items-center gap-4 mb-4">
                                                    <img src={doc.image} className="w-16 h-16 rounded-2xl object-cover group-hover:scale-105 transition-transform shadow-sm" />
                                                    <div>
                                                        <h4 className="font-bold text-slate-900 text-lg font-heading">{doc.name}</h4>
                                                        <p className="text-xs text-primary-600 font-bold uppercase tracking-wide">{doc.specialization}</p>
                                                    </div>
                                                </div>
                                                <div className="flex justify-between items-center text-sm border-t border-slate-50 pt-4">
                                                    <span className="text-slate-500 font-medium">Status</span>
                                                    <Badge color={doc.status === 'Active' ? 'green' : 'yellow'}>{doc.status || 'Active'}</Badge>
                                                </div>
                                                <div className="flex justify-between items-center text-sm mt-3">
                                                    <span className="text-slate-500 font-medium">In Queue</span>
                                                    <span className="font-bold text-slate-900 bg-slate-50 px-2 py-1 rounded">{Math.floor(Math.random() * 15)} Patients</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </>
                            ) : (
                                <div className="animate-fade-in">
                                    <div className="flex items-center gap-4 mb-6">
                                        <Button variant="ghost" onClick={() => setSelectedQueueDoctor(null)} className="-ml-2">
                                            <ArrowLeft size={20} /> Back
                                        </Button>
                                        <div>
                                            <h3 className="text-2xl font-bold text-slate-900 font-heading">{selectedQueueDoctor.name}'s Queue</h3>
                                            <p className="text-slate-500 text-sm font-medium">{selectedQueueDoctor.specialization}</p>
                                        </div>
                                        <Badge color="blue" className="ml-auto">Live Console</Badge>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Left: Queue List */}
                                        <Card className="lg:col-span-1 h-[600px] flex flex-col">
                                            <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-4">
                                                <h4 className="font-bold text-slate-800 font-heading">Waiting List</h4>
                                                <span className="text-xs bg-slate-100 px-2.5 py-1 rounded-lg text-slate-600 font-bold">Total: {hospitalQueue.filter(q => q.doctor_id === selectedQueueDoctor?.id).length}</span>
                                            </div>
                                            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                                                {hospitalQueue.filter(q => q.doctor_id === selectedQueueDoctor?.id).map((item, index) => (
                                                    <div
                                                        key={index}
                                                        className={`p-4 rounded-xl border flex justify-between items-center transition-all ${item.status === 'Serving' ? 'bg-green-50 border-green-200 shadow-sm scale-[1.02]' : 'bg-white border-slate-100 hover:bg-slate-50'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg ${item.status === 'Serving' ? 'bg-green-500 text-white shadow-lg shadow-green-200 animate-pulse' : 'bg-slate-100 text-slate-500'}`}>
                                                                {item.token}
                                                            </div>
                                                            <div>
                                                                <p className={`font-bold text-sm ${item.status === 'Serving' ? 'text-green-900' : 'text-slate-900'}`}>{item.name}</p>
                                                                <p className="text-xs text-slate-500 font-medium">{item.time}</p>
                                                            </div>
                                                        </div>
                                                        {item.status === 'Serving' && <Badge color="green">Serving</Badge>}
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="mt-4 pt-4 border-t border-slate-100">
                                                <h5 className="font-bold text-xs text-slate-500 uppercase tracking-wider mb-3">Manual Entry</h5>
                                                <div className="flex gap-2">
                                                    <input type="text" placeholder="Patient Name" className="flex-1 p-3 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 bg-white" />
                                                    <Button className="h-11 px-4 rounded-xl"><Plus size={20} /></Button>
                                                </div>
                                            </div>
                                        </Card>

                                        {/* Right: Live Control Panel */}
                                        <div className="lg:col-span-2 space-y-6">
                                            <Card className="bg-slate-900 text-white relative overflow-hidden h-[340px] flex flex-col items-center justify-center shadow-2xl">
                                                {/* Abstract Background */}
                                                <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-slate-800 to-primary-900 opacity-80"></div>
                                                <div className="absolute top-0 right-0 w-64 h-64 bg-primary-500 rounded-full blur-[100px] opacity-20"></div>
                                                <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full blur-[100px] opacity-20"></div>

                                                <div className="relative z-10 text-center">
                                                    <p className="text-primary-300 uppercase tracking-[0.3em] text-xs font-bold mb-4">Current Token Serving</p>
                                                    <div className="text-[140px] font-heading font-black leading-none mb-6 text-transparent bg-clip-text bg-gradient-to-b from-white to-slate-400 drop-shadow-2xl">
                                                        {currentQueueToken}
                                                    </div>
                                                    <div className="inline-flex items-center gap-3 bg-green-500/10 text-green-400 px-6 py-2 rounded-full border border-green-500/20 backdrop-blur-md animate-pulse">
                                                        <div className="w-2.5 h-2.5 bg-green-500 rounded-full shadow-[0_0_10px_#22c55e]"></div>
                                                        <span className="text-sm font-bold tracking-wide">LIVE NOW</span>
                                                    </div>
                                                </div>
                                            </Card>

                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                                <Card className="flex flex-col justify-between border-l-4 border-l-orange-500">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 font-heading">Estimated Wait</h4>
                                                            <p className="text-xs text-slate-500 font-medium uppercase mt-1">Per patient average</p>
                                                        </div>
                                                        <div className="bg-orange-50 p-2 rounded-lg text-orange-500"><Clock size={24} /></div>
                                                    </div>
                                                    <div className="text-4xl font-heading font-bold text-slate-800">15 <span className="text-sm font-medium text-slate-400">mins</span></div>
                                                </Card>
                                                <Card className="flex flex-col justify-between border-l-4 border-l-blue-500">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 font-heading">Total Served</h4>
                                                            <p className="text-xs text-slate-500 font-medium uppercase mt-1">Today's count</p>
                                                        </div>
                                                        <div className="bg-blue-50 p-2 rounded-lg text-blue-500"><Users size={24} /></div>
                                                    </div>
                                                    <div className="text-4xl font-heading font-bold text-slate-800">42 <span className="text-sm font-medium text-slate-400">patients</span></div>
                                                </Card>
                                            </div>

                                            <Card>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <Button
                                                        variant="outline"
                                                        className="h-16 flex flex-col gap-1 items-center justify-center text-slate-600 border-slate-200 hover:bg-slate-50 hover:border-slate-300 rounded-xl"
                                                        onClick={() => setCurrentQueueToken(c => Math.max(1, c - 1))}
                                                    >
                                                        <RotateCcw size={20} />
                                                        <span className="text-xs font-bold">Recall</span>
                                                    </Button>
                                                    <Button
                                                        className={`col-span-2 h-16 flex items-center justify-center gap-3 text-lg font-bold shadow-xl rounded-xl transition-all hover:-translate-y-1 ${queueStatus === 'ACTIVE' ? 'bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400' : 'bg-slate-400'}`}
                                                        onClick={handleNextPatient}
                                                        disabled={queueStatus !== 'ACTIVE'}
                                                    >
                                                        <Play size={24} fill="currentColor" /> Call Next Token
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        className="h-16 flex flex-col gap-1 items-center justify-center bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 rounded-xl"
                                                        onClick={() => setQueueStatus(s => s === 'ACTIVE' ? 'PAUSED' : 'ACTIVE')}
                                                    >
                                                        {queueStatus === 'ACTIVE' ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                                                        <span className="text-xs font-bold">{queueStatus === 'ACTIVE' ? 'Pause' : 'Resume'}</span>
                                                    </Button>
                                                </div>
                                            </Card>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )
                    }

                    {/* --- AMBULANCE SERVICE MANAGEMENT --- */}
                    {
                        activeView === 'AMBULANCE' && (
                            <div className="space-y-6 animate-fade-in pb-10">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 font-heading">Ambulance Fleet Management</h3>
                                        <p className="text-slate-500 text-sm">Manage your hospital's ambulance fleet and track availability</p>
                                    </div>
                                    <Button onClick={handleAddAmbulanceClick} className="flex items-center gap-2">
                                        <Plus size={18} /> Add Ambulance
                                    </Button>
                                </div>

                                {/* Ambulance Statistics */}
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <Card className="bg-white border-l-4 border-l-green-500">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">Available</p>
                                                <h2 className="text-3xl font-heading font-bold text-slate-900 mt-1">
                                                    {ambulances.filter(a => a.status === 'AVAILABLE').length}
                                                </h2>
                                            </div>
                                            <div className="p-2.5 bg-green-50 text-green-600 rounded-xl"><Ambulance size={20} /></div>
                                        </div>
                                    </Card>
                                    <Card className="bg-white border-l-4 border-l-yellow-500">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">On Duty</p>
                                                <h2 className="text-3xl font-heading font-bold text-slate-900 mt-1">
                                                    {ambulances.filter(a => a.status === 'BUSY').length}
                                                </h2>
                                            </div>
                                            <div className="p-2.5 bg-yellow-50 text-yellow-600 rounded-xl"><Activity size={20} /></div>
                                        </div>
                                    </Card>
                                    <Card className="bg-white border-l-4 border-l-red-500">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">Maintenance</p>
                                                <h2 className="text-3xl font-heading font-bold text-slate-900 mt-1">
                                                    {ambulances.filter(a => a.status === 'MAINTENANCE').length}
                                                </h2>
                                            </div>
                                            <div className="p-2.5 bg-red-50 text-red-600 rounded-xl"><AlertCircle size={20} /></div>
                                        </div>
                                    </Card>
                                    <Card className="bg-white border-l-4 border-l-blue-500">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">Total Fleet</p>
                                                <h2 className="text-3xl font-heading font-bold text-slate-900 mt-1">{ambulances.length}</h2>
                                            </div>
                                            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl"><Building2 size={20} /></div>
                                        </div>
                                    </Card>
                                </div>

                                {/* Ambulance List */}
                                {isLoadingAmbulances ? (
                                    <Card className="p-12 text-center">
                                        <div className="animate-spin w-8 h-8 border-4 border-primary-500 border-t-transparent rounded-full mx-auto"></div>
                                        <p className="text-slate-500 mt-4">Loading ambulances...</p>
                                    </Card>
                                ) : ambulances.length === 0 ? (
                                    <Card className="p-12 text-center">
                                        <Ambulance size={48} className="mx-auto text-slate-300 mb-4" />
                                        <h3 className="text-lg font-bold text-slate-900 mb-2">No Ambulances Added Yet</h3>
                                        <p className="text-slate-500 mb-4">Start by adding your first ambulance to the fleet</p>
                                        <Button onClick={handleAddAmbulanceClick}>
                                            <Plus size={18} className="mr-2" /> Add First Ambulance
                                        </Button>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {ambulances.map(ambulance => (
                                            <Card key={ambulance.id} className="hover:shadow-lg transition-shadow">
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${ambulance.status === 'AVAILABLE' ? 'bg-green-50 text-green-600' :
                                                            ambulance.status === 'BUSY' ? 'bg-yellow-50 text-yellow-600' :
                                                                'bg-red-50 text-red-600'
                                                            }`}>
                                                            <Ambulance size={24} />
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-900 font-heading">{ambulance.vehicle_number}</h4>
                                                            <Badge color={
                                                                ambulance.ambulance_type === 'ICU' ? 'red' :
                                                                    ambulance.ambulance_type === 'ADVANCED' ? 'blue' : 'gray'
                                                            }>
                                                                {ambulance.ambulance_type}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <Badge color={
                                                        ambulance.status === 'AVAILABLE' ? 'green' :
                                                            ambulance.status === 'BUSY' ? 'yellow' : 'red'
                                                    }>
                                                        {ambulance.status}
                                                    </Badge>
                                                </div>

                                                <div className="space-y-2 text-sm border-t border-slate-100 pt-4">
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Driver</span>
                                                        <span className="font-bold text-slate-900">{ambulance.driver_name || 'Not assigned'}</span>
                                                    </div>
                                                    <div className="flex justify-between">
                                                        <span className="text-slate-500">Contact</span>
                                                        <span className="font-bold text-slate-900">{ambulance.driver_phone || 'N/A'}</span>
                                                    </div>
                                                    {ambulance.current_location && (
                                                        <div className="flex items-center gap-2 text-slate-600 mt-2">
                                                            <MapPin size={14} />
                                                            <span className="text-xs">{ambulance.current_location}</span>
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => handleEditAmbulanceClick(ambulance)}
                                                    >
                                                        <Edit3 size={16} className="mr-2" /> Edit
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        onClick={() => handleDeleteAmbulance(ambulance.id)}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* --- DOCTORS MANAGEMENT --- */}
                    {
                        activeView === 'DOCTORS' && (
                            <div className="space-y-6 animate-fade-in pb-10">
                                <div className="flex justify-between items-center">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 font-heading">Doctors Management</h3>
                                        <p className="text-slate-500 text-sm">Add, edit availability, and manage your hospital's doctors</p>
                                    </div>
                                    <Button onClick={handleAddDoctorClick} className="flex items-center gap-2">
                                        <UserPlus size={18} /> Add New Doctor
                                    </Button>
                                </div>

                                {isLoadingDoctors ? (
                                    <div className="text-center py-12">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                        <p className="mt-3 text-slate-500">Loading doctors...</p>
                                    </div>
                                ) : doctors.length === 0 ? (
                                    <Card className="text-center py-12">
                                        <Users size={48} className="mx-auto text-slate-300 mb-4" />
                                        <p className="text-slate-500 mb-4">No doctors found for this hospital</p>
                                        <Button onClick={handleAddDoctorClick}>
                                            <UserPlus size={18} className="mr-2" /> Add First Doctor
                                        </Button>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {doctors.map((doctor: any) => (
                                            <Card key={doctor.id} className="hover:shadow-lg transition-shadow">
                                                <div className="flex items-start gap-4 mb-4">
                                                    <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center text-primary-600 font-bold text-xl">
                                                        {doctor.full_name?.charAt(0) || 'D'}
                                                    </div>
                                                    <div className="flex-1">
                                                        <h4 className="font-bold text-slate-900 font-heading text-lg">{doctor.full_name}</h4>
                                                        <p className="text-primary-600 font-medium text-sm">{doctor.specialization}</p>
                                                    </div>
                                                </div>

                                                <div className="space-y-3 text-sm border-t border-slate-100 pt-4">
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500">Personal Email</span>
                                                        <span className="font-medium text-slate-900 truncate max-w-[180px]">{doctor.email || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500">Phone</span>
                                                        <span className="font-medium text-slate-900">{doctor.phone || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500">BMDC Number</span>
                                                        <span className="font-medium text-slate-900">{doctor.bmdc_number || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500">Consultation Fee</span>
                                                        <span className="font-bold text-green-600">৳ {doctor.consultation_fee || 'N/A'}</span>
                                                    </div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-slate-500">Experience</span>
                                                        <span className="font-medium text-slate-900">{doctor.experience_years || 0} years</span>
                                                    </div>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="flex gap-2 mt-4 pt-4 border-t border-slate-100">
                                                    <Button
                                                        variant="outline"
                                                        className="flex-1"
                                                        onClick={() => handleEditDoctorClick(doctor)}
                                                    >
                                                        <Edit3 size={16} className="mr-2" /> Edit Availability
                                                    </Button>
                                                    <Button
                                                        variant="danger"
                                                        onClick={() => {
                                                            setDoctorToDelete(doctor.id);
                                                            setIsDeleteModalOpen(true);
                                                        }}
                                                    >
                                                        <Trash2 size={16} />
                                                    </Button>
                                                </div>
                                            </Card>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    }

                    {/* --- APPOINTMENTS MANAGEMENT --- */}
                    {
                        activeView === 'APPOINTMENTS' && (
                            <div className="space-y-4 sm:space-y-6 animate-fade-in pb-10">
                                <div>
                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">Appointments</h3>
                                    <p className="text-slate-500 text-xs sm:text-sm">View and manage all hospital appointments</p>
                                </div>

                                {/* Filters */}
                                <div className="flex flex-col sm:flex-row flex-wrap gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-xl border border-slate-200">
                                    <div className="flex-1 min-w-full sm:min-w-[200px]">
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                                            <input
                                                type="text"
                                                placeholder="Search by patient name or ID..."
                                                className="w-full pl-10 p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px]"
                                                value={appointmentFilter.search}
                                                onChange={(e) => setAppointmentFilter({ ...appointmentFilter, search: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <select
                                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] w-full sm:w-auto"
                                        value={appointmentFilter.status}
                                        onChange={(e) => setAppointmentFilter({ ...appointmentFilter, status: e.target.value })}
                                    >
                                        <option value="All">All Status</option>
                                        <option value="Scheduled">Scheduled</option>
                                        <option value="Completed">Completed</option>
                                        <option value="Cancelled">Cancelled</option>
                                    </select>
                                    <input
                                        type="date"
                                        className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[44px] w-full sm:w-auto"
                                        value={appointmentFilter.date}
                                        onChange={(e) => setAppointmentFilter({ ...appointmentFilter, date: e.target.value })}
                                    />
                                </div>

                                {/* Appointments Table */}
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-slate-50 border-b border-slate-200">
                                                <tr>
                                                    <th className="text-left p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Patient</th>
                                                    <th className="text-left p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide hidden md:table-cell">Doctor</th>
                                                    <th className="text-left p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Date & Time</th>
                                                    <th className="text-left p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:table-cell">Status</th>
                                                    <th className="text-right p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {appointments.length === 0 ? (
                                                    <tr>
                                                        <td colSpan={5} className="p-8 text-center text-slate-500">
                                                            No appointments found matching your filters
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    appointments.map((apt: any) => (
                                                        <tr key={apt.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-3 sm:p-4">
                                                                <div className="font-bold text-slate-900 text-sm sm:text-base">{apt.patientName}</div>
                                                                <div className="text-xs text-slate-500">ID: #{apt.patientId}</div>
                                                                <div className="text-xs text-slate-500 md:hidden mt-1">{apt.doctorName}</div>
                                                            </td>
                                                            <td className="p-3 sm:p-4 hidden md:table-cell">
                                                                <div className="font-medium text-slate-900">{apt.doctorName}</div>
                                                                <div className="text-xs text-slate-500">{apt.specialization}</div>
                                                            </td>
                                                            <td className="p-3 sm:p-4">
                                                                <div className="font-medium text-slate-900 text-xs sm:text-sm">{new Date(apt.date).toLocaleDateString()}</div>
                                                                <div className="text-xs text-slate-500">{apt.time}</div>
                                                            </td>
                                                            <td className="p-3 sm:p-4 hidden sm:table-cell">
                                                                <Badge variant={
                                                                    apt.status === 'Completed' ? 'success' :
                                                                        apt.status === 'Cancelled' ? 'danger' : 'warning'
                                                                }>
                                                                    {apt.status}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-3 sm:p-4 text-right">
                                                                <Button variant="outline" size="sm" className="min-h-[40px] text-xs sm:text-sm px-2 sm:px-3">Details</Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )
                    }

                    {/* --- DEPARTMENTS & RESOURCES --- */}
                    {
                        activeView === 'DEPARTMENTS' && (
                            <div className="space-y-6 animate-fade-in pb-10">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900 font-heading">Hospital Resources & Departments</h3>
                                    <p className="text-slate-500 text-sm">Manage beds, departments, tests, and resources</p>
                                </div>

                                {/* Bed Statistics */}
                                {isLoadingResources ? (
                                    <Card className="p-12 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                                        <p className="mt-4 text-slate-600">Loading resources...</p>
                                    </Card>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {hospitalResources.length === 0 ? (
                                            <Card className="col-span-full p-8 text-center">
                                                <AlertCircle size={48} className="mx-auto text-slate-300 mb-4" />
                                                <p className="text-slate-500">No bed resources configured yet</p>
                                            </Card>
                                        ) : (
                                            hospitalResources.map(resource => {
                                                const resourceName = resource.resource_type.replace('_', ' ');
                                                const availabilityPercent = (resource.available / resource.total_capacity) * 100;
                                                const color =
                                                    resource.resource_type === 'ICU' ? 'red' :
                                                        resource.resource_type === 'CCU' ? 'orange' :
                                                            resource.resource_type === 'CABIN' ? 'purple' : 'blue';

                                                return (
                                                    <Card key={resource.id} className={`bg-white border-l-4 border-l-${color}-500 cursor-pointer hover:shadow-lg transition-shadow`} onClick={() => handleOpenResourceEdit(resource)}>
                                                        <div className="flex justify-between items-start">
                                                            <div>
                                                                <p className="text-slate-500 font-bold text-xs uppercase tracking-wide">{resourceName}</p>
                                                                <h2 className="text-3xl font-heading font-bold text-slate-900 mt-1">
                                                                    {resource.available}/{resource.total_capacity}
                                                                </h2>
                                                            </div>
                                                            <div className={`p-2.5 bg-${color}-50 text-${color}-600 rounded-xl`}><Activity size={20} /></div>
                                                        </div>
                                                        <div className="mt-3">
                                                            <div className="flex justify-between text-xs mb-1">
                                                                <span className="text-slate-500">Availability</span>
                                                                <span className={`font-bold ${availabilityPercent > 50 ? 'text-green-600' : availabilityPercent > 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                                                                    {availabilityPercent.toFixed(0)}%
                                                                </span>
                                                            </div>
                                                            <div className="w-full bg-slate-200 rounded-full h-2">
                                                                <div
                                                                    className={`h-2 rounded-full transition-all ${availabilityPercent > 50 ? 'bg-green-500' : availabilityPercent > 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                                                    style={{ width: `${availabilityPercent}%` }}
                                                                ></div>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 text-xs">
                                                            <Button variant="outline" size="sm" className="w-full" onClick={(e) => { e.stopPropagation(); handleOpenResourceEdit(resource); }}>
                                                                <Edit3 size={14} className="mr-1" /> Update
                                                            </Button>
                                                        </div>
                                                    </Card>
                                                );
                                            })
                                        )}
                                    </div>
                                )}

                                {/* Departments List */}
                                <Card>
                                    <div className="flex justify-between items-center mb-6">
                                        <h4 className="font-bold text-lg text-slate-800 font-heading">Departments & Services</h4>
                                        <Badge variant="success">{departments.length} Active</Badge>
                                    </div>
                                    {departments.length === 0 ? (
                                        <div className="text-center py-8">
                                            <Building2 size={48} className="mx-auto text-slate-300 mb-4" />
                                            <p className="text-slate-500">No departments configured yet</p>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            {departments.map((dept: any) => (
                                                <div key={dept.id} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <h5 className="font-bold text-slate-900">{dept.name}</h5>
                                                            {dept.description && (
                                                                <p className="text-sm text-slate-500 mt-1">{dept.description}</p>
                                                            )}
                                                        </div>
                                                        <Badge variant={dept.is_active ? "success" : "default"}>
                                                            {dept.is_active ? 'Active' : 'Inactive'}
                                                        </Badge>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </Card>

                                {/* Diagnostic Tests Section */}
                                <Card>
                                    <div className="flex justify-between items-center mb-6">
                                        <div>
                                            <h4 className="font-bold text-lg text-slate-800 font-heading">Diagnostic Tests & Services</h4>
                                            <p className="text-sm text-slate-500">Manage test prices and availability</p>
                                        </div>
                                        <Button onClick={handleAddTestClick} size="sm">
                                            <Plus size={16} className="mr-2" /> Add New Test
                                        </Button>
                                    </div>

                                    {tests.length === 0 ? (
                                        <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <FileText size={48} className="mx-auto text-slate-300 mb-4" />
                                            <p className="text-slate-500">No tests configured yet</p>
                                        </div>
                                    ) : (
                                        <div className="overflow-x-auto">
                                            <table className="w-full">
                                                <thead className="bg-slate-50 border-b border-slate-200">
                                                    <tr>
                                                        <th className="text-left p-4 text-xs font-bold text-slate-600 uppercase">Test Name</th>
                                                        <th className="text-left p-4 text-xs font-bold text-slate-600 uppercase">Department</th>
                                                        <th className="text-left p-4 text-xs font-bold text-slate-600 uppercase">Cost (৳)</th>
                                                        <th className="text-left p-4 text-xs font-bold text-slate-600 uppercase text-center">Status</th>
                                                        <th className="text-right p-4 text-xs font-bold text-slate-600 uppercase">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-slate-100">
                                                    {tests.map((test: any) => (
                                                        <tr key={test.id} className="hover:bg-slate-50 transition-colors">
                                                            <td className="p-4">
                                                                <div className="font-bold text-slate-900">{test.name}</div>
                                                                {test.description && <div className="text-xs text-slate-500 truncate max-w-[200px]">{test.description}</div>}
                                                            </td>
                                                            <td className="p-4 text-slate-600 text-sm">
                                                                {test.department_name || departments.find(d => d.id === test.department_id)?.name || 'N/A'}
                                                            </td>
                                                            <td className="p-4">
                                                                <span className="font-bold text-slate-900">৳{test.cost}</span>
                                                            </td>
                                                            <td className="p-4 text-center">
                                                                <Badge variant={test.is_available ? "success" : "default"}>
                                                                    {test.is_available ? 'Available' : 'Unavailable'}
                                                                </Badge>
                                                            </td>
                                                            <td className="p-4 text-right">
                                                                <div className="flex justify-end gap-2">
                                                                    <Button variant="outline" size="sm" onClick={() => handleEditTestClick(test)}>
                                                                        <Edit3 size={14} className="mr-1" /> Edit
                                                                    </Button>
                                                                    <Button variant="danger" size="sm" onClick={() => handleDeleteTest(test.id)}>
                                                                        <Trash2 size={14} />
                                                                    </Button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )}
                                </Card>
                            </div>
                        )
                    }

                    {/* --- DOCTOR SCHEDULE MANAGEMENT --- */}
                    {
                        activeView === 'DOCTOR_SCHEDULES' && (
                            <div className="space-y-6 animate-fade-in pb-10">
                                {!selectedDoctorSchedule ? (
                                    // OVERVIEW: All doctors schedule summary
                                    <>
                                        <div>
                                            <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">Doctor Schedule Overview</h3>
                                            <p className="text-slate-500 text-xs sm:text-sm">Manage availability schedules for all doctors</p>
                                        </div>

                                        {isLoadingSchedules ? (
                                            <div className="text-center py-12">
                                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <p className="mt-3 text-slate-500">Loading schedules...</p>
                                            </div>
                                        ) : schedules.length === 0 ? (
                                            <Card className="text-center py-12">
                                                <Calendar size={48} className="mx-auto text-slate-300 mb-4" />
                                                <p className="text-slate-500">No doctors found</p>
                                            </Card>
                                        ) : (
                                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                                <div className="overflow-x-auto">
                                                    <table className="w-full">
                                                        <thead className="bg-slate-50 border-b border-slate-200">
                                                            <tr>
                                                                <th className="text-left p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Doctor</th>
                                                                <th className="text-left p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide hidden sm:table-cell">Specialization</th>
                                                                <th className="text-center p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Slots</th>
                                                                <th className="text-center p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide hidden md:table-cell">Active</th>
                                                                <th className="text-center p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide hidden md:table-cell">Inactive</th>
                                                                <th className="text-right p-3 sm:p-4 text-xs font-bold text-slate-600 uppercase tracking-wide">Actions</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody className="divide-y divide-slate-100">
                                                            {schedules.map((schedule: any) => (
                                                                <tr key={schedule.id} className="hover:bg-slate-50 transition-colors">
                                                                    <td className="p-3 sm:p-4">
                                                                        <div className="font-bold text-slate-900 text-sm sm:text-base">{schedule.name}</div>
                                                                        <div className="text-xs text-slate-500 sm:hidden">{schedule.specialization}</div>
                                                                    </td>
                                                                    <td className="p-3 sm:p-4 text-slate-600 text-sm hidden sm:table-cell">{schedule.specialization}</td>
                                                                    <td className="p-3 sm:p-4 text-center">
                                                                        <Badge variant={schedule.total_slots > 0 ? 'success' : 'default'}>
                                                                            {schedule.total_slots}
                                                                        </Badge>
                                                                    </td>
                                                                    <td className="p-3 sm:p-4 text-center hidden md:table-cell">
                                                                        <Badge variant="success">{schedule.active_slots}</Badge>
                                                                    </td>
                                                                    <td className="p-3 sm:p-4 text-center hidden md:table-cell">
                                                                        <Badge variant="default">{schedule.inactive_slots}</Badge>
                                                                    </td>
                                                                    <td className="p-3 sm:p-4 text-right">
                                                                        <Button
                                                                            variant="outline"
                                                                            size="sm"
                                                                            onClick={() => setSelectedDoctorSchedule(schedule.id)}
                                                                            className="min-h-[40px] text-xs sm:text-sm"
                                                                        >
                                                                            <Calendar size={14} className="mr-1 sm:mr-2" /> Manage
                                                                        </Button>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    // DETAILED VIEW: Individual doctor schedule management
                                    <>
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                            <div className="flex items-center gap-3">
                                                <Button variant="outline" onClick={() => setSelectedDoctorSchedule(null)} className="min-h-[44px]">
                                                    <ArrowLeft size={18} />
                                                </Button>
                                                <div>
                                                    <h3 className="text-lg sm:text-xl font-bold text-slate-900 font-heading">
                                                        {schedules.find(s => s.id === selectedDoctorSchedule)?.name}'s Schedule
                                                    </h3>
                                                    <p className="text-slate-500 text-xs sm:text-sm">Manage time slots and availability</p>
                                                </div>
                                            </div>
                                            <Button onClick={handleAddSlotClick} className="flex items-center gap-2 justify-center min-h-[44px] w-full sm:w-auto">
                                                <Plus size={18} /> Add Time Slot
                                            </Button>
                                        </div>

                                        {isLoadingSlots ? (
                                            <div className="text-center py-12">
                                                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                                <p className="mt-3 text-slate-500">Loading slots...</p>
                                            </div>
                                        ) : doctorSlots.length === 0 ? (
                                            <Card className="text-center py-12">
                                                <Clock size={48} className="mx-auto text-slate-300 mb-4" />
                                                <p className="text-slate-500 mb-4">No time slots configured yet</p>
                                                <Button onClick={handleAddSlotClick}>
                                                    <Plus size={18} className="mr-2" /> Add First Time Slot
                                                </Button>
                                            </Card>
                                        ) : (
                                            // Group slots by day
                                            <div className="space-y-4">
                                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => {
                                                    const daySlots = doctorSlots.filter(slot => slot.day_of_week === day);
                                                    if (daySlots.length === 0) return null;

                                                    return (
                                                        <Card key={day}>
                                                            <div className="border-b border-slate-100 pb-3 mb-4">
                                                                <h4 className="font-bold text-slate-900">{day}</h4>
                                                            </div>
                                                            <div className="space-y-3">
                                                                {daySlots.map(slot => (
                                                                    <div key={slot.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 bg-slate-50 rounded-xl border border-slate-100 gap-3">
                                                                        <div className="flex items-start sm:items-center gap-3 sm:gap-6 flex-1">
                                                                            <div className="flex-1">
                                                                                <div className="font-bold text-slate-900 text-sm sm:text-base">{slot.start_time} - {slot.end_time}</div>
                                                                                <div className="text-xs sm:text-sm text-slate-500">
                                                                                    {slot.max_patients} patients • {slot.consultation_duration} min/patient
                                                                                </div>
                                                                            </div>
                                                                            <Badge variant={slot.is_active ? 'success' : 'default'}>
                                                                                {slot.is_active ? 'Active' : 'Inactive'}
                                                                            </Badge>
                                                                        </div>
                                                                        <div className="flex gap-2 justify-end sm:justify-start">
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleToggleSlotStatus(slot.id)}
                                                                                className="min-h-[40px] px-3"
                                                                            >
                                                                                {slot.is_active ? <Pause size={14} /> : <Play size={14} />}
                                                                            </Button>
                                                                            <Button
                                                                                variant="outline"
                                                                                size="sm"
                                                                                onClick={() => handleEditSlotClick(slot)}
                                                                                className="min-h-[40px] px-3"
                                                                            >
                                                                                <Edit3 size={14} />
                                                                            </Button>
                                                                            <Button
                                                                                variant="danger"
                                                                                size="sm"
                                                                                onClick={() => handleDeleteSlot(slot.id)}
                                                                                className="min-h-[40px] px-3"
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </Button>
                                                                        </div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        </Card>
                                                    );
                                                })}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        )
                    }

                    {/* VIEW: TELEMEDICINE */}
                    {activeView === 'TELEMEDICINE' && (
                        <div className="space-y-4 sm:space-y-6 animate-fade-in pb-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Telemedicine Dashboard</h2>
                                    <p className="text-gray-600 mt-1 text-xs sm:text-sm">Overview of all video consultations in the hospital</p>
                                </div>
                            </div>

                            {/* Telemedicine Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                <Card>
                                    <p className="text-slate-500 font-medium mb-1 text-xs sm:text-sm">Total Sessions</p>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                                        {appointments.filter(a => a.consultationType === 'Telemedicine').length}
                                    </h2>
                                </Card>
                                <Card>
                                    <p className="text-purple-600 font-medium mb-1 text-xs sm:text-sm">Today's Sessions</p>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-purple-900">
                                        {appointments.filter(a => a.consultationType === 'Telemedicine' && a.date === new Date().toISOString().split('T')[0]).length}
                                    </h2>
                                </Card>
                                <Card>
                                    <p className="text-green-600 font-medium mb-1 text-xs sm:text-sm">Completed</p>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-green-900">
                                        {appointments.filter(a => a.consultationType === 'Telemedicine' && a.status === 'COMPLETED').length}
                                    </h2>
                                </Card>
                                <Card>
                                    <p className="text-blue-600 font-medium mb-1 text-xs sm:text-sm">Pending</p>
                                    <h2 className="text-2xl sm:text-3xl font-bold text-blue-900">
                                        {appointments.filter(a => a.consultationType === 'Telemedicine' && (a.status === 'PENDING' || a.status === 'CONFIRMED')).length}
                                    </h2>
                                </Card>
                            </div>

                            {/* Appointments List */}
                            <Card>
                                <h3 className="font-bold text-base sm:text-lg mb-4">All Telemedicine Appointments</h3>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="bg-slate-50 text-slate-500">
                                            <tr>
                                                <th className="p-2 sm:p-3 text-xs sm:text-sm">Date & Time</th>
                                                <th className="p-2 sm:p-3 text-xs sm:text-sm hidden md:table-cell">Doctor</th>
                                                <th className="p-2 sm:p-3 text-xs sm:text-sm">Patient</th>
                                                <th className="p-2 sm:p-3 text-xs sm:text-sm">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {appointments.filter(a => a.consultationType === 'Telemedicine').length === 0 ? (
                                                <tr>
                                                    <td colSpan={4} className="p-8 text-center text-slate-500">
                                                        No telemedicine appointments found.
                                                    </td>
                                                </tr>
                                            ) : (
                                                appointments
                                                    .filter(a => a.consultationType === 'Telemedicine')
                                                    .sort((a, b) => new Date(`${b.date} ${b.time}`).getTime() - new Date(`${a.date} ${a.time}`).getTime())
                                                    .map((apt) => (
                                                        <tr key={apt.id} className="border-b border-slate-100 hover:bg-slate-50">
                                                            <td className="p-2 sm:p-3">
                                                                <div className="font-medium text-xs sm:text-sm">{apt.date}</div>
                                                                <div className="text-xs text-slate-500">{apt.time}</div>
                                                            </td>
                                                            <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm hidden md:table-cell">{apt.doctorName}</td>
                                                            <td className="p-2 sm:p-3 text-xs sm:text-sm">
                                                                <div>{apt.patientName}</div>
                                                                <div className="text-xs text-slate-500 md:hidden">{apt.doctorName}</div>
                                                            </td>
                                                            <td className="p-2 sm:p-3">
                                                                <Badge color={apt.status === 'CONFIRMED' ? 'green' : apt.status === 'COMPLETED' ? 'blue' : 'yellow'}>
                                                                    {apt.status}
                                                                </Badge>
                                                            </td>
                                                        </tr>
                                                    ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </Card>
                        </div>
                    )}

                    {/* ... (Other views fallback) ... */}


                    {/* --- VIEW: FEEDBACK --- */}
                    {activeView === 'FEEDBACK' && (
                        <div className="space-y-4 sm:space-y-6 animate-fade-in pb-10">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                    <h2 className="text-xl sm:text-2xl font-bold text-slate-900">Patient Feedback</h2>
                                    <p className="text-gray-600 mt-1 text-xs sm:text-sm">View and manage patient reviews and ratings</p>
                                </div>
                            </div>

                            {isLoadingReviews ? (
                                <div className="text-center py-16">
                                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
                                    <p className="text-slate-500">Loading reviews...</p>
                                </div>
                            ) : reviews.length === 0 ? (
                                <Card className="text-center py-16">
                                    <Star size={64} className="mx-auto text-slate-300 mb-4" />
                                    <h3 className="text-xl font-bold text-slate-900 mb-2">No Reviews Yet</h3>
                                    <p className="text-slate-500">Patient reviews will appear here once submitted.</p>
                                </Card>
                            ) : (
                                <>
                                    {/* Statistics Cards */}
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
                                        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 text-white border-0 shadow-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-white/80 text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-1">Average Rating</p>
                                                    <h3 className="text-2xl sm:text-3xl font-bold">
                                                        {feedbackStats?.averageRating || '0.0'}
                                                    </h3>
                                                </div>
                                                <Star className="text-white/40" size={32} />
                                            </div>
                                            <div className="mt-2 flex items-center gap-1">
                                                {[1, 2, 3, 4, 5].map((star) => (
                                                    <Star
                                                        key={star}
                                                        size={12}
                                                        className={`${star <= Math.round(parseFloat(feedbackStats?.averageRating || '0')) ? 'text-white fill-white' : 'text-white/40'}`}
                                                    />
                                                ))}
                                            </div>
                                        </Card>

                                        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0 shadow-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-white/80 text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-1">Total Reviews</p>
                                                    <h3 className="text-2xl sm:text-3xl font-bold">{feedbackStats?.totalReviews || 0}</h3>
                                                </div>
                                                <MessageCircle className="text-white/40" size={32} />
                                            </div>
                                            <p className="text-xs sm:text-sm text-white/90 mt-2">All time feedback</p>
                                        </Card>

                                        <Card className="bg-gradient-to-br from-emerald-500 to-emerald-600 text-white border-0 shadow-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-white/80 text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-1">Verified Reviews</p>
                                                    <h3 className="text-2xl sm:text-3xl font-bold">
                                                        {feedbackStats?.verifiedCount || 0}
                                                    </h3>
                                                </div>
                                                <CheckCircle className="text-white/40" size={32} />
                                            </div>
                                            <p className="text-xs sm:text-sm text-white/90 mt-2">
                                                {feedbackStats ? ((feedbackStats.verifiedCount / feedbackStats.totalReviews) * 100).toFixed(0) : 0}% verified
                                            </p>
                                        </Card>

                                        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0 shadow-lg">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <p className="text-white/80 text-[10px] sm:text-xs font-medium uppercase tracking-wide mb-1">5-Star Reviews</p>
                                                    <h3 className="text-2xl sm:text-3xl font-bold">
                                                        {feedbackStats?.fiveStarCount || 0}
                                                    </h3>
                                                </div>
                                                <TrendingUp className="text-white/40" size={32} />
                                            </div>
                                            <p className="text-xs sm:text-sm text-white/90 mt-2">
                                                {feedbackStats ? ((feedbackStats.fiveStarCount / feedbackStats.totalReviews) * 100).toFixed(0) : 0}% excellent
                                            </p>
                                        </Card>
                                    </div>

                                    {/* Rating Distribution */}
                                    <Card className="shadow-lg">
                                        <h3 className="text-lg font-bold text-slate-900 mb-4">Rating Distribution</h3>
                                        <div className="space-y-3">
                                            {feedbackStats?.ratingDistribution.map(({ rating, count, percentage }) => (
                                                <div key={rating} className="flex items-center gap-3">
                                                    <div className="flex items-center gap-1 w-16">
                                                        <span className="text-sm font-semibold text-slate-700">{rating}</span>
                                                        <Star size={14} className="text-amber-400 fill-amber-400" />
                                                    </div>
                                                    <div className="flex-1 h-4 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all"
                                                            style={{ width: `${percentage}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className="text-sm font-medium text-slate-600 w-12 text-right">{count}</span>
                                                    <span className="text-xs text-slate-500 w-12 text-right">({percentage.toFixed(0)}%)</span>
                                                </div>
                                            )) || null}
                                        </div>
                                    </Card>

                                    {/* Filters */}
                                    <Card className="shadow-lg">
                                        <div className="flex flex-wrap gap-3 items-center">
                                            <span className="text-sm font-semibold text-slate-700">Filter by:</span>
                                            <button className="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors">
                                                All Reviews ({reviews.length})
                                            </button>
                                            <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                                                5 Stars ({reviews.filter(r => r.rating === 5).length})
                                            </button>
                                            <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                                                4 Stars ({reviews.filter(r => r.rating === 4).length})
                                            </button>
                                            <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                                                ≤3 Stars ({reviews.filter(r => r.rating <= 3).length})
                                            </button>
                                            <button className="px-4 py-2 bg-white text-slate-600 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
                                                Verified ({reviews.filter(r => r.isVerified).length})
                                            </button>
                                        </div>
                                    </Card>

                                    {/* Reviews List */}
                                    <div>
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-lg font-bold text-slate-900">Recent Reviews</h3>
                                            <span className="text-sm text-slate-500">Showing {Math.min(reviewsPerPage, reviews.length - (currentReviewPage - 1) * reviewsPerPage)} of {reviews.length} reviews</span>
                                        </div>
                                        <div className="grid gap-4">
                                            {paginatedReviews.map((review) => (
                                                <Card key={review.id} className="shadow-md hover:shadow-lg transition-all">
                                                    <div className="flex gap-4">
                                                        {/* Avatar */}
                                                        <div className="flex-shrink-0">
                                                            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-primary-600 font-bold text-xl border-2 border-primary-300">
                                                                {review.patientName?.[0] || 'P'}
                                                            </div>
                                                        </div>

                                                        {/* Content */}
                                                        <div className="flex-1 min-w-0">
                                                            {/* Header */}
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div>
                                                                    <h4 className="font-bold text-slate-900 text-lg">{review.patientName || 'Anonymous Patient'}</h4>
                                                                    <p className="text-sm text-slate-600">
                                                                        Reviewed <span className="font-semibold text-slate-800">{review.doctorName}</span>
                                                                        <span className="text-slate-400"> • </span>
                                                                        <span className="text-slate-500">{review.specialization}</span>
                                                                    </p>
                                                                </div>
                                                                <Button
                                                                    variant="ghost"
                                                                    className="text-slate-400 hover:text-red-600 hover:bg-red-50"
                                                                    onClick={async () => {
                                                                        if (confirm('Delete this review?')) {
                                                                            try {
                                                                                await api.deleteReview(review.id);
                                                                                setReviews(prev => prev.filter(r => r.id !== review.id));
                                                                            } catch (e) { console.error(e); alert('Failed to delete'); }
                                                                        }
                                                                    }}
                                                                >
                                                                    <Trash2 size={18} />
                                                                </Button>
                                                            </div>

                                                            {/* Rating & Date */}
                                                            <div className="flex flex-wrap items-center gap-3 mb-3">
                                                                <div className="flex items-center gap-0.5">
                                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                                        <Star
                                                                            key={star}
                                                                            size={18}
                                                                            className={`${star <= review.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-300'}`}
                                                                        />
                                                                    ))}
                                                                </div>
                                                                <span className="text-sm text-slate-500">
                                                                    {new Date(review.createdAt).toLocaleDateString('en-US', {
                                                                        month: 'short',
                                                                        day: 'numeric',
                                                                        year: 'numeric'
                                                                    })}
                                                                </span>
                                                                {review.isVerified && (
                                                                    <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-semibold flex items-center gap-1">
                                                                        <CheckCircle size={12} /> Verified Visit
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {/* Comment */}
                                                            <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                                                <p className="text-slate-700 leading-relaxed italic">
                                                                    "{review.comment}"
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </Card>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    )}

                </div >
            </div >

            {/* MODALS (Kept same structure, inherits new styles) */}
            {/* RESOURCE UPDATE MODAL */}
            <Modal isOpen={isResourceModalOpen} onClose={() => setIsResourceModalOpen(false)} title={selectedResource ? `Update ${selectedResource.resource_type.replace('_', ' ')} Beds` : "Update Resource"}>
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Available Beds</label>
                        <div className="flex items-center gap-3">
                            <input
                                type="number"
                                className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-bold text-lg bg-white"
                                value={resourceForm.available}
                                onChange={(e) => setResourceForm({ ...resourceForm, available: Number(e.target.value) })}
                                min={0}
                                max={resourceForm.total_capacity}
                            />
                            <span className="text-slate-400 font-medium">/ {resourceForm.total_capacity}</span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Number of beds currently available</p>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Total Capacity</label>
                        <input
                            type="number"
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-bold text-lg bg-white"
                            value={resourceForm.total_capacity}
                            onChange={(e) => setResourceForm({ ...resourceForm, total_capacity: Number(e.target.value) })}
                            min={1}
                        />
                        <p className="text-xs text-slate-500 mt-1">Maximum number of beds in this category</p>
                    </div>

                    <div className="p-4 bg-yellow-50 rounded-xl text-yellow-800 text-sm flex items-start gap-3 border border-yellow-100">
                        <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                        <p>Changes will be instantly reflected on the Patient Portal and Emergency dashboard.</p>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsResourceModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleUpdateResources}><Save size={18} className="mr-2" /> Update Status</Button>
                    </div>
                </div>
            </Modal>

            {/* AMBULANCE ADD/EDIT MODAL */}
            <Modal
                isOpen={isAmbulanceModalOpen}
                onClose={() => setIsAmbulanceModalOpen(false)}
                title={isEditingAmbulance ? 'Edit Ambulance' : 'Add New Ambulance'}
            >
                <div className="space-y-6">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Vehicle Number <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-medium bg-white"
                            placeholder="e.g., DH-01-1234"
                            value={ambulanceForm.vehicle_number}
                            onChange={(e) => setAmbulanceForm({ ...ambulanceForm, vehicle_number: e.target.value })}
                            disabled={isEditingAmbulance}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Driver Name <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-medium bg-white"
                            placeholder="Enter driver name"
                            value={ambulanceForm.driver_name}
                            onChange={(e) => setAmbulanceForm({ ...ambulanceForm, driver_name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Driver Phone
                        </label>
                        <input
                            type="tel"
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-medium bg-white"
                            placeholder="Enter phone number"
                            value={ambulanceForm.driver_phone}
                            onChange={(e) => setAmbulanceForm({ ...ambulanceForm, driver_phone: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Ambulance Type
                        </label>
                        <select
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-medium bg-white"
                            value={ambulanceForm.ambulance_type}
                            onChange={(e) => setAmbulanceForm({ ...ambulanceForm, ambulance_type: e.target.value as any })}
                            disabled={isEditingAmbulance}
                        >
                            <option value="BASIC">Basic</option>
                            <option value="ADVANCED">Advanced Life Support (ALS)</option>
                            <option value="ICU">ICU Ambulance</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">
                            Status
                        </label>
                        <select
                            className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 transition-all font-medium bg-white"
                            value={ambulanceForm.status}
                            onChange={(e) => setAmbulanceForm({ ...ambulanceForm, status: e.target.value as any })}
                        >
                            <option value="AVAILABLE">Available</option>
                            <option value="BUSY">On Duty</option>
                            <option value="MAINTENANCE">Under Maintenance</option>
                        </select>
                    </div>

                    {!isEditingAmbulance && (
                        <div className="p-4 bg-blue-50 rounded-xl text-blue-800 text-sm flex items-start gap-3 border border-blue-100">
                            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                            <p>The ambulance will be added to your fleet and will be available for emergency services.</p>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsAmbulanceModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveAmbulance}>
                            <Save size={18} className="mr-2" />
                            {isEditingAmbulance ? 'Update' : 'Add'} Ambulance
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* DOCTOR ADD/EDIT MODAL */}
            <Modal isOpen={isDoctorModalOpen} onClose={() => setIsDoctorModalOpen(false)} title={isEditingDoctor ? 'Edit Doctor' : 'Add New Doctor'}>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Full Name *</label>
                        <input
                            type="text"
                            required
                            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            placeholder="Dr. John Doe"
                            value={doctorForm.name}
                            onChange={(e) => setDoctorForm({ ...doctorForm, name: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Email Address *</label>
                        <input
                            type="email"
                            required
                            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            placeholder="doctor@hospital.com"
                            value={doctorForm.email}
                            onChange={(e) => setDoctorForm({ ...doctorForm, email: e.target.value })}
                            disabled={isEditingDoctor}
                        />
                        {isEditingDoctor && (
                            <p className="text-xs text-slate-500 mt-1">Email cannot be changed after creation</p>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Specialization</label>
                            <select
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                value={doctorForm.specialization}
                                onChange={(e) => setDoctorForm({ ...doctorForm, specialization: e.target.value })}
                            >
                                <option value="General Medicine">General Medicine</option>
                                <option value="Cardiology">Cardiology</option>
                                <option value="Orthopedics">Orthopedics</option>
                                <option value="Pediatrics">Pediatrics</option>
                                <option value="Dermatology">Dermatology</option>
                                <option value="Neurology">Neurology</option>
                                <option value="Gynecology">Gynecology</option>
                                <option value="Dentistry">Dentistry</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">BMDC Number</label>
                            <input
                                type="text"
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="A-12345"
                                value={doctorForm.bmdcNumber}
                                onChange={(e) => setDoctorForm({ ...doctorForm, bmdcNumber: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Online Consultation Fee (৳)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="500"
                                value={doctorForm.fees.online}
                                onChange={(e) => setDoctorForm({
                                    ...doctorForm,
                                    fees: { ...doctorForm.fees, online: parseInt(e.target.value) || 0 }
                                })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Physical Consultation Fee (৳)</label>
                            <input
                                type="number"
                                min="0"
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                placeholder="1000"
                                value={doctorForm.fees.physical}
                                onChange={(e) => setDoctorForm({
                                    ...doctorForm,
                                    fees: { ...doctorForm.fees, physical: parseInt(e.target.value) || 0 }
                                })}
                            />
                        </div>
                    </div>

                    {isEditingDoctor && (
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Status</label>
                            <select
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                value={doctorForm.status}
                                onChange={(e) => setDoctorForm({ ...doctorForm, status: e.target.value as 'Active' | 'Inactive' | 'On Leave' })}
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                                <option value="On Leave">On Leave</option>
                            </select>
                        </div>
                    )}

                    {!isEditingDoctor && (
                        <div className="p-4 bg-blue-50 rounded-xl text-blue-800 text-sm flex items-start gap-3 border border-blue-100">
                            <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                            <div>
                                <p className="font-bold mb-1">🔐 Temporary Password</p>
                                <p>A temporary password 'temp123' will be assigned. The doctor should change it upon first login.</p>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsDoctorModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveDoctor}>
                            <Save size={18} className="mr-2" />
                            {isEditingDoctor ? 'Update' : 'Add'} Doctor
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* DOCTOR DELETE CONFIRMATION MODAL */}
            <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Confirm Delete">
                <div className="space-y-4">
                    <div className="p-4 bg-red-50 rounded-xl text-red-800 text-sm flex items-start gap-3 border border-red-100">
                        <AlertTriangle size={20} className="mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-bold mb-1">⚠️ Warning: Permanent Action</p>
                            <p>Are you sure you want to delete this doctor? This action cannot be undone.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>Cancel</Button>
                        <Button variant="danger" onClick={confirmDeleteDoctor}>
                            <Trash2 size={18} className="mr-2" />
                            Delete Doctor
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* SLOT ADD/EDIT MODAL */}
            <Modal isOpen={isSlotModalOpen} onClose={() => setIsSlotModalOpen(false)} title={isEditingSlot ? 'Edit Time Slot' : 'Add Time Slot'}>
                <div className="space-y-5">
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Day of Week</label>
                        <select
                            className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                            value={slotForm.day_of_week}
                            onChange={(e) => setSlotForm({ ...slotForm, day_of_week: e.target.value })}
                        >
                            <option value="Monday">Monday</option>
                            <option value="Tuesday">Tuesday</option>
                            <option value="Wednesday">Wednesday</option>
                            <option value="Thursday">Thursday</option>
                            <option value="Friday">Friday</option>
                            <option value="Saturday">Saturday</option>
                            <option value="Sunday">Sunday</option>
                        </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Start Time</label>
                            <input
                                type="time"
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                value={slotForm.start_time}
                                onChange={(e) => setSlotForm({ ...slotForm, start_time: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">End Time</label>
                            <input
                                type="time"
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                value={slotForm.end_time}
                                onChange={(e) => setSlotForm({ ...slotForm, end_time: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Max Patients</label>
                            <input
                                type="number"
                                min="1"
                                max="100"
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                value={slotForm.max_patients}
                                onChange={(e) => setSlotForm({ ...slotForm, max_patients: parseInt(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-2">Duration (mins)</label>
                            <input
                                type="number"
                                min="5"
                                max="120"
                                step="5"
                                className="w-full p-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                                value={slotForm.consultation_duration}
                                onChange={(e) => setSlotForm({ ...slotForm, consultation_duration: parseInt(e.target.value) })}
                            />
                        </div>
                    </div>

                    {isEditingSlot && (
                        <div>
                            <label className="flex items-center gap-3 cursor-pointer">
                                <input
                                    type="checkbox"
                                    className="w-5 h-5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                                    checked={slotForm.is_active}
                                    onChange={(e) => setSlotForm({ ...slotForm, is_active: e.target.checked })}
                                />
                                <span className="text-sm font-bold text-slate-700">Active (patients can book this slot)</span>
                            </label>
                        </div>
                    )}

                    <div className="p-4 bg-blue-50 rounded-xl text-blue-800 text-sm flex items-start gap-3 border border-blue-100">
                        <AlertCircle size={20} className="mt-0.5 flex-shrink-0" />
                        <div>
                            <p className="font-bold mb-1">⏰ Slot Configuration</p>
                            <p>This time slot will be available for patient bookings. Make sure there are no conflicts with existing slots.</p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsSlotModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveSlot}>
                            <Save size={18} className="mr-2" />
                            {isEditingSlot ? 'Update' : 'Add'} Time Slot
                        </Button>
                    </div>
                </div>
            </Modal>

            {/* TEST MANAGEMENT MODAL */}
            <Modal
                isOpen={isTestModalOpen}
                onClose={() => setIsTestModalOpen(false)}
                title={isEditingTest ? "Edit Test" : "Add New Test"}
            >
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Test Name</label>
                        <input
                            type="text"
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            placeholder="e.g., Whole Body MRI"
                            value={testForm.name}
                            onChange={e => setTestForm({ ...testForm, name: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Department</label>
                        <select
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            value={testForm.department_id}
                            onChange={e => setTestForm({ ...testForm, department_id: e.target.value })}
                            disabled={departments.length === 0}
                        >
                            <option value="">Select Department</option>
                            {departments.map((dept: any) => (
                                <option key={dept.id} value={dept.id}>{dept.name}</option>
                            ))}
                        </select>
                        {departments.length === 0 && <p className="text-xs text-red-500 mt-1">No departments found. Please add a department first.</p>}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Cost (৳)</label>
                            <input
                                type="number"
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                placeholder="0"
                                value={testForm.cost}
                                onChange={e => setTestForm({ ...testForm, cost: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Duration (min)</label>
                            <input
                                type="number"
                                className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                                placeholder="30"
                                value={testForm.duration_minutes}
                                onChange={e => setTestForm({ ...testForm, duration_minutes: parseInt(e.target.value) || 0 })}
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
                        <textarea
                            className="w-full p-2.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none transition-all"
                            rows={3}
                            placeholder="Details about the test..."
                            value={testForm.description}
                            onChange={e => setTestForm({ ...testForm, description: e.target.value })}
                        ></textarea>
                    </div>

                    {isEditingTest && (
                        <div className="flex items-center gap-2">
                            <input
                                type="checkbox"
                                id="is_available"
                                checked={testForm.is_available}
                                onChange={e => setTestForm({ ...testForm, is_available: e.target.checked })}
                                className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
                            />
                            <label htmlFor="is_available" className="text-sm font-medium text-gray-900">Available for booking</label>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 gap-2">
                        <Button variant="ghost" onClick={() => setIsTestModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveTest}>Save Test</Button>
                    </div>
                </div>
            </Modal>

            {/* ... (Other Modals) ... */}
        </div >
    );
};
