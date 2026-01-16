
import React, { useState } from 'react';
import { User, Lock, ArrowLeft, AlertCircle, Mail } from 'lucide-react';
import { Button, Card } from '../components/UIComponents';
import { api } from '../services/apiClient';

interface PatientLoginProps {
  onBack: () => void;
  onLoginSuccess: (userData: any) => void;
  onRegisterClick: () => void;
}

export const PatientLogin: React.FC<PatientLoginProps> = ({ onBack, onLoginSuccess, onRegisterClick }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Call real API
      const response = await api.login(email, password);
      
      // Check if user is a patient
      if (response.role !== 'PATIENT') {
        setError('This portal is for patients only. Please use the correct login page.');
        setIsLoading(false);
        return;
      }

      // Success - pass user data to parent
      onLoginSuccess(response);
    } catch (err: any) {
      setError(err.message || 'Invalid email or password. Please try again.');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
       <div className="w-full max-w-md">
          <Button variant="ghost" onClick={onBack} className="mb-6 text-slate-600 hover:text-slate-900 -ml-2">
             <ArrowLeft size={20} /> <span className="ml-2">Back to Home</span>
          </Button>

          <Card className="p-8 shadow-xl border-t-4 border-t-primary-600 bg-white">
             <div className="text-center mb-8">
                <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                   <User size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900">Patient Portal</h1>
                <p className="text-slate-500 mt-1">Access your appointments & history</p>
             </div>

             <form onSubmit={handleLogin} className="space-y-5">
                {error && (
                   <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex items-center gap-2">
                      <AlertCircle size={16} /> {error}
                   </div>
                )}

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Email Address</label>
                   <div className="relative">
                      <Mail className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input 
                         type="email" 
                         required
                         className="w-full pl-10 p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                         placeholder="you@example.com"
                         value={email}
                         onChange={(e) => setEmail(e.target.value)}
                      />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
                   <div className="relative">
                      <Lock className="absolute left-3 top-3 text-slate-400" size={16} />
                      <input 
                         type="password" 
                         required
                         minLength={6}
                         className="w-full pl-10 p-2.5 rounded-lg border border-slate-300 bg-white focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                         placeholder="••••••••"
                         value={password}
                         onChange={(e) => setPassword(e.target.value)}
                      />
                   </div>
                </div>

                <div className="flex items-center justify-between text-sm">
                   <label className="flex items-center gap-2 text-slate-600">
                      <input type="checkbox" className="rounded border-slate-300 bg-white text-primary-600 focus:ring-primary-500" />
                      Remember me
                   </label>
                   <a href="#" className="text-primary-600 hover:underline">Forgot password?</a>
                </div>

                <Button type="submit" loading={isLoading} className="w-full text-lg h-12">
                   Log In
                </Button>

                <div className="mt-4 text-center">
                   <p className="text-slate-600 text-sm">
                      Don't have an account?{' '}
                      <button 
                        type="button"
                        onClick={onRegisterClick} 
                        className="text-primary-600 font-bold hover:underline"
                      >
                         Register Now
                      </button>
                   </p>
                </div>
             </form>
          </Card>
       </div>
    </div>
  );
};
