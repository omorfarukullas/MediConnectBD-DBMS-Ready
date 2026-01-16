import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { api, TokenManager, User as ApiUser, LoginResponse } from '../services/apiClient';

// Context type
interface AuthContextType {
  user: ApiUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  register: (data: RegisterData) => Promise<LoginResponse>;
  logout: () => void;
  updateUser: (data: Partial<ApiUser>) => Promise<void>;
}

interface RegisterData {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role?: string;
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Provider props
interface AuthProviderProps {
  children: ReactNode;
}

// Auth Provider Component
export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check for existing auth on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = TokenManager.getToken();
      const savedUser = TokenManager.getUser();

      if (token && savedUser) {
        try {
          // Verify token is still valid by fetching profile
          const profile = await api.getProfile();
          setUser(profile);
        } catch (error) {
          // Token invalid, clear storage
          TokenManager.clear();
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string): Promise<LoginResponse> => {
    try {
      const response = await api.login(email, password);
      setUser(response as ApiUser);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (data: RegisterData): Promise<LoginResponse> => {
    try {
      const response = await api.register(data);
      setUser(response as ApiUser);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    api.logout();
    setUser(null);
  };

  const updateUser = async (data: Partial<ApiUser>) => {
    try {
      const response = await api.updateProfile(data);
      setUser(response as ApiUser);
    } catch (error) {
      throw error;
    }
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    register,
    logout,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthProvider;
