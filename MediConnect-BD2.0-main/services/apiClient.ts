/**
 * API Client for MediConnect BD
 * Handles all HTTP requests to the backend API
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

// Types
export interface LoginResponse {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  token: string;
  hospitalId?: number;
}

export interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  phone?: string;
  role: string;
  image?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiError {
  message: string;
  error?: string;
}

export interface DoctorResponse {
  id: number;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  specialization: string;
  bmdcNumber?: string;
  fees: {
    online: number;
    physical: number;
  };
  image?: string;
  rating?: number;
  experienceYears?: number;
}

export interface AppointmentResponse {
  id: number;
  patientId: number;
  doctorId: number;
  patientName?: string;
  doctorName?: string;
  appointmentDate: string;
  appointmentTime: string;
  reasonForVisit?: string;
  status: string;
  queueNumber?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface NotificationResponse {
  id: number;
  userId: number;
  title: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

export interface ReviewResponse {
  id: number;
  doctorId: number;
  patientId: number;
  appointmentId?: number;
  rating: number;
  comment?: string;
  createdAt: string;
}

// Token Management
class TokenManager {
  private static TOKEN_KEY = 'mediconnect_token';
  private static USER_KEY = 'mediconnect_user';

  static getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  static setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  static removeToken(): void {
    localStorage.removeItem(this.TOKEN_KEY);
  }

  static getUser(): User | null {
    const userStr = localStorage.getItem(this.USER_KEY);
    return userStr ? JSON.parse(userStr) : null;
  }

  static setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }

  static removeUser(): void {
    localStorage.removeItem(this.USER_KEY);
  }

  static clear(): void {
    this.removeToken();
    this.removeUser();
  }
}

// HTTP Client
class HttpClient {
  private baseURL: string;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = TokenManager.getToken();
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Add authorization header if token exists
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const config: RequestInit = {
      ...options,
      headers,
    };

    try {
      const response = await fetch(`${this.baseURL}${endpoint}`, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data as T;
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error('An unexpected error occurred');
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

// API Service
class ApiService {
  private http: HttpClient;

  constructor() {
    this.http = new HttpClient(API_BASE_URL);
  }

  // ==================== Authentication ====================
  
  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/v2/auth/register', data);
    TokenManager.setToken(response.token);
    TokenManager.setUser(response as User);
    return response;
  }

  async registerDoctor(data: {
    full_name: string;
    email: string;
    password: string;
    phone: string;
    city: string;
    specialization: string;
    hospital?: string;
    visit_fee?: number;
  }): Promise<LoginResponse> {
    console.log('🏥 [API Client] Registering doctor with data:', { ...data, password: '***' });
    const response = await this.http.post<LoginResponse>('/v2/auth/doctor/register', data);
    console.log('✅ [API Client] Doctor registration successful:', response);
    TokenManager.setToken(response.token);
    TokenManager.setUser(response as User);
    return response;
  }

  async registerPatient(data: {
    full_name: string;
    email: string;
    password: string;
    phone?: string;
    address?: string;
  }): Promise<LoginResponse> {
    console.log('👤 [API Client] Registering patient with data:', { ...data, password: '***' });
    const response = await this.http.post<LoginResponse>('/v2/auth/patient/register', data);
    console.log('✅ [API Client] Patient registration successful:', response);
    TokenManager.setToken(response.token);
    TokenManager.setUser(response as User);
    return response;
  }

  async loginUnified(email: string, password: string): Promise<LoginResponse> {
    console.log('🔐 [API Client] Unified login for:', email);
    const response = await this.http.post<LoginResponse>('/v2/auth/login', {
      email,
      password,
    });
    console.log('✅ [API Client] Login successful as:', response.role);
    TokenManager.setToken(response.token);
    TokenManager.setUser(response as User);
    return response;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/v2/auth/login', {
      email,
      password,
    });
    TokenManager.setToken(response.token);
    TokenManager.setUser(response as User);
    return response;
  }

  logout(): void {
    TokenManager.clear();
  }

  async getProfile(): Promise<User> {
    return this.http.get<User>('/v2/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<LoginResponse> {
    const response = await this.http.put<LoginResponse>('/auth/profile', data);
    TokenManager.setUser(response as User);
    return response;
  }

  // ==================== Doctors ====================

  async getDoctors(params?: { specialization?: string; search?: string }): Promise<DoctorResponse[]> {
    let endpoint = '/v2/doctors';
    if (params) {
      const queryParams = new URLSearchParams(params as any).toString();
      endpoint += `?${queryParams}`;
    }
    return this.http.get<DoctorResponse[]>(endpoint);
  }

  async getDoctorById(id: number): Promise<DoctorResponse> {
    return this.http.get<DoctorResponse>(`/v2/doctors/${id}`);
  }

  // ==================== Appointments ====================

  async getAppointments(): Promise<AppointmentResponse[]> {
    const response = await this.http.get<{ success: boolean; count: number; appointments: any[] }>('/v2/appointments');
    
    // Transform snake_case to camelCase
    return response.appointments.map(apt => ({
      id: apt.id,
      patientId: apt.patient_id,
      doctorId: apt.doctor_id,
      patientName: apt.patient?.full_name,
      doctorName: apt.doctor?.full_name,
      appointmentDate: apt.appointment_date,
      appointmentTime: apt.appointment_time,
      reasonForVisit: apt.reason_for_visit,
      status: apt.status,
      queueNumber: Math.floor(Math.random() * 20) + 10
    }));
  }

  async createAppointment(data: any): Promise<AppointmentResponse> {
    // Transform camelCase to snake_case for backend
    const backendData = {
      doctor_id: data.doctorId,
      appointment_date: data.appointmentDate,
      appointment_time: data.appointmentTime,
      reason_for_visit: data.symptoms || data.reasonForVisit || 'General checkup'
    };
    
    const response = await this.http.post<{ message: string; appointment: any }>('/v2/appointments', backendData);
    
    // Transform response back to camelCase
    const apt = response.appointment;
    return {
      id: apt.id,
      patientId: apt.patient_id,
      doctorId: apt.doctor_id,
      patientName: apt.patient?.full_name,
      doctorName: apt.doctor?.full_name,
      appointmentDate: apt.appointment_date,
      appointmentTime: apt.appointment_time,
      reasonForVisit: apt.reason_for_visit,
      status: apt.status,
      queueNumber: Math.floor(Math.random() * 20) + 10
    };
  }

  async getAppointmentById(id: number): Promise<AppointmentResponse> {
    return this.http.get<AppointmentResponse>(`/v2/appointments/${id}`);
  }

  async updateAppointment(id: number, data: any): Promise<AppointmentResponse> {
    return this.http.put<AppointmentResponse>(`/v2/appointments/${id}`, data);
  }

  async cancelAppointment(id: number): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/v2/appointments/${id}`);
  }

  // ==================== Patients ====================

  async getPatientProfile(): Promise<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    profileImage?: string;
    bloodGroup?: string;
  }> {
    const response = await this.http.get<{ success: boolean; data: any }>('/v2/patients/profile');
    return response.data;
  }

  async updatePatientProfile(id: number, data: {
    full_name?: string;
    phone?: string;
    address?: string;
    blood_group?: string;
  }): Promise<{
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    bloodGroup?: string;
  }> {
    const response = await this.http.put<{ success: boolean; data: any }>(`/v2/patients/${id}`, data);
    return response.data;
  }

  async changePatientPassword(id: number, oldPassword: string, newPassword: string): Promise<{ message: string }> {
    const response = await this.http.put<{ success: boolean; message: string }>(`/v2/patients/${id}/password`, {
      oldPassword,
      newPassword
    });
    return { message: response.message };
  }

  async uploadPatientPhoto(id: number, file: File): Promise<{ profileImage: string }> {
    const formData = new FormData();
    formData.append('photo', file);

    const token = TokenManager.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/v2/patients/${id}/photo`, {
      method: 'POST',
      headers,
      body: formData
    });

    const responseData = await response.json();
    if (!response.ok) {
      throw new Error(responseData.message || 'Upload failed');
    }
    return responseData.data;
  }

  // ==================== Reviews ====================

  async createReview(data: {
    doctorId: number;
    rating: number;
    comment?: string;
    appointmentId?: number;
  }): Promise<ReviewResponse> {
    return this.http.post<ReviewResponse>('/reviews', data);
  }

  async getDoctorReviews(doctorId: number): Promise<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>(`/reviews/doctor/${doctorId}`);
  }

  async getMyReviews(): Promise<ReviewResponse[]> {
    return this.http.get<ReviewResponse[]>('/reviews/my-reviews');
  }

  async updateReview(id: number, data: { rating?: number; comment?: string }): Promise<ReviewResponse> {
    return this.http.put<ReviewResponse>(`/reviews/${id}`, data);
  }

  async deleteReview(id: number): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/reviews/${id}`);
  }

  // ==================== Notifications ====================

  async getNotifications(unreadOnly = false): Promise<NotificationResponse[]> {
    return this.http.get<NotificationResponse[]>(`/notifications?unreadOnly=${unreadOnly}`);
  }

  async markNotificationAsRead(id: number): Promise<NotificationResponse> {
    return this.http.put<NotificationResponse>(`/notifications/${id}/read`, {});
  }

  async markAllNotificationsAsRead(): Promise<{ message: string }> {
    return this.http.put<{ message: string }>('/notifications/read-all', {});
  }

  async deleteNotification(id: number): Promise<{ message: string }> {
    return this.http.delete<{ message: string }>(`/notifications/${id}`);
  }

  // ==================== Emergency ====================

  async requestEmergency(data: any) {
    return this.http.post('/emergency', data);
  }

  // ==================== Documents ====================

  async uploadDocument(file: File, documentType?: string, description?: string) {
    const formData = new FormData();
    formData.append('document', file);
    if (documentType) formData.append('documentType', documentType);
    if (description) formData.append('description', description);

    // Note: Don't set Content-Type for FormData, browser will set it automatically with boundary
    const token = TokenManager.getToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      headers,
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Upload failed');
    }
    return data;
  }

  async getDocuments() {
    return this.http.get('/documents');
  }

  async getPatientDocuments(userId: number) {
    return this.http.get(`/documents/patient/${userId}`);
  }

  async deleteDocument(id: number) {
    return this.http.delete(`/documents/${id}`);
  }

  // ==================== Health Check ====================

  async healthCheck() {
    return this.http.get('/health');
  }
}

// Export singleton instance
export const api = new ApiService();
export { TokenManager };
export default api;
