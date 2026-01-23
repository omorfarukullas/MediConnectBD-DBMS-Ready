/**
 * API Client for MediConnect BD
 * Handles all HTTP requests to the backend API
 * ARCHITECTURE: Direct connection to Node.js Backend (No API Gateway)
 */

// Ensure the API URL is correctly set - backend runs on port 5000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

console.log('🌐 API Client initialized with base URL:', API_BASE_URL);
console.log('🔍 Environment check:', {
  VITE_API_URL: import.meta.env.VITE_API_URL,
  mode: import.meta.env.MODE,
  dev: import.meta.env.DEV
});

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

    const fullUrl = `${this.baseURL}${endpoint}`;
    console.log(`📡 ${options.method || 'GET'} ${fullUrl}`, options.body ? JSON.parse(options.body as string) : '');

    try {
      const response = await fetch(fullUrl, config);
      const data = await response.json();

      console.log(`📥 Response from ${endpoint}:`, { status: response.status, data });

      if (!response.ok) {
        console.error(`❌ Request failed:`, data);
        throw new Error(data.message || 'Request failed');
      }

      return data as T;
    } catch (error) {
      console.error(`❌ Network error for ${endpoint}:`, error);
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

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }
}

// API Service
class ApiService {
  private http: HttpClient;

  constructor() {
    this.http = new HttpClient(API_BASE_URL);
  }

  // Expose base URL for direct fetch calls
  private get baseURL(): string {
    return API_BASE_URL;
  }

  // ==================== Authentication ====================

  async register(data: RegisterData): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/auth/register', data);
    TokenManager.setToken(response.token);
    TokenManager.setUser(response as User);
    return response;
  }

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/auth/login', {
      email,
      password,
    });
    TokenManager.setToken(response.token);
    TokenManager.setUser(response as User);
    return response;
  }

  async loginDoctor(email: string, password: string): Promise<LoginResponse> {
    const response = await this.http.post<LoginResponse>('/doctors/login', {
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
    return this.http.get<User>('/auth/profile');
  }

  async updateProfile(data: Partial<User>): Promise<LoginResponse> {
    const response = await this.http.put<LoginResponse>('/auth/profile', data);
    TokenManager.setUser(response as User);
    return response;
  }

  // ==================== Doctors ====================

  async registerDoctor(data: any): Promise<any> {
    console.log('🔗 API Client: Sending doctor registration to /doctors/register');
    console.log('📤 Payload:', data);
    const response = await this.http.post('/doctors/register', data);
    console.log('📥 Response:', response);
    return response;
  }

  async getDoctors(params?: { specialization?: string; search?: string }): Promise<any> {
    let endpoint = '/doctors';
    if (params) {
      const queryParams = new URLSearchParams(params as any).toString();
      endpoint += `?${queryParams}`;
    }
    return this.http.get(endpoint);
  }

  async getDoctorById(id: number): Promise<any> {
    return this.http.get(`/doctors/${id}`);
  }

  // ==================== Appointments ====================

  async getAppointments(): Promise<any> {
    return this.http.get('/appointments/my');
  }

  async createAppointment(data: any): Promise<any> {
    console.log('📡 API Client: Creating appointment...');
    console.log('📤 Endpoint: POST /appointments');
    console.log('📦 Data:', data);
    console.log('🔑 Token:', TokenManager.getToken() ? 'Present' : 'MISSING!');

    try {
      const response = await this.http.post('/appointments', data);
      console.log('✅ API Response:', response);
      return response;
    } catch (error) {
      console.error('❌ API Error:', error);
      throw error;
    }
  }

  async getAppointmentById(id: number): Promise<any> {
    return this.http.get(`/appointments/${id}`);
  }

  async updateAppointment(id: number, data: any): Promise<any> {
    return this.http.put(`/appointments/${id}`, data);
  }

  async cancelAppointment(id: number): Promise<any> {
    return this.http.patch(`/appointments/${id}/cancel`, {});
  }

  // ==================== Reviews ====================

  async createReview(data: {
    doctorId: number;
    rating: number;
    comment?: string;
    appointmentId?: number;
  }) {
    return this.http.post('/reviews', data);
  }

  async getDoctorReviews(doctorId: number) {
    return this.http.get(`/reviews/doctor/${doctorId}`);
  }

  async getMyReviews() {
    return this.http.get('/reviews/my-reviews');
  }

  async updateReview(id: number, data: { rating?: number; comment?: string }) {
    return this.http.put(`/reviews/${id}`, data);
  }

  async deleteReview(id: number) {
    return this.http.delete(`/reviews/${id}`);
  }

  // ==================== Notifications ====================

  async getNotifications(unreadOnly = false) {
    return this.http.get(`/notifications?unreadOnly=${unreadOnly}`);
  }

  async markNotificationAsRead(id: number) {
    return this.http.put(`/notifications/${id}/read`, {});
  }

  async markAllNotificationsAsRead() {
    return this.http.put('/notifications/read-all', {});
  }

  async deleteNotification(id: number) {
    return this.http.delete(`/notifications/${id}`);
  }

  // ==================== Emergency ====================

  async requestEmergency(data: any) {
    return this.http.post('/emergency', data);
  }

  // ==================== Documents ====================

  async uploadDocument(file: File | FormData, documentType?: string, description?: string) {
    let formData: FormData;

    if (file instanceof FormData) {
      formData = file;
    } else {
      formData = new FormData();
      formData.append('document', file);
      if (documentType) formData.append('documentType', documentType);
      if (description) formData.append('description', description);
    }

    // Note: For file uploads, we need to use fetch directly
    // because the http client adds Content-Type: application/json
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

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Upload failed');
    }

    return response.json();
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

  async updateDocumentPrivacy(documentId: number, isPrivate: boolean) {
    return this.http.patch(`/documents/${documentId}/privacy`, { isPrivate });
  }

  async downloadDocument(documentId: number): Promise<Blob> {
    const response = await fetch(`${this.baseURL}/documents/${documentId}/download`, {
      headers: {
        'Authorization': `Bearer ${TokenManager.getToken()}`
      }
    });

    if (!response.ok) {
      throw new Error('Failed to download document');
    }

    return response.blob();
  }

  // ==================== Prescriptions ====================

  async createPrescription(data: {
    patientId: number;
    appointmentId: string | number;
    diagnosis: string;
    medicines: Array<{
      name: string;
      dosage: string;
      duration: string;
      instruction: string;
    }>;
  }) {
    return this.http.post('/prescriptions', data);
  }

  async getPrescriptions() {
    return this.http.get('/prescriptions');
  }

  async getPatientPrescriptions(patientId: number) {
    return this.http.get(`/prescriptions/patient/${patientId}`);
  }

  // ==================== Health Check ====================

  async healthCheck() {
    return this.http.get('/health');
  }

  // ==================== Generic Methods ====================

  async get<T = any>(endpoint: string): Promise<{ data: T }> {
    const result = await this.http.get<T>(endpoint);
    return { data: result };
  }

  async post<T = any>(endpoint: string, data?: any): Promise<{ data: T }> {
    const result = await this.http.post<T>(endpoint, data);
    return { data: result };
  }

  async put<T = any>(endpoint: string, data: any): Promise<{ data: T }> {
    const result = await this.http.put<T>(endpoint, data);
    return { data: result };
  }

  async patch<T = any>(endpoint: string, data: any): Promise<{ data: T }> {
    const result = await this.http.put<T>(endpoint, data);
    return { data: result };
  }

  async delete<T = any>(endpoint: string): Promise<{ data: T }> {
    const result = await this.http.delete<T>(endpoint);
    return { data: result };
  }
}

// Export singleton instance
export const api = new ApiService();
export { TokenManager };
export default api;
