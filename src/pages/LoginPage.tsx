import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Loader2, Mail, User, Shield, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const { user, sendToken, verifyToken } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  
  const [step, setStep] = useState<'email' | 'token'>('email');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [token, setToken] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenSent, setTokenSent] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);

  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
      navigate(from, { replace: true });
    }
  }, [user, navigate, location]);

  // Countdown timer for token expiry
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setTokenSent(false);
            setStep('email');
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timeLeft]);

  const handleSendToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await sendToken(email, name);
      if (result.success) {
        toast.success(result.message);
        setTokenSent(true);
        setStep('token');
        setTimeLeft(600); // 10 minutes
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const result = await verifyToken(email, token);
      if (result.success) {
        toast.success(result.message);
      } else if (result.shouldReset) {
        toast.error(result.message);
        // Auto-reset to email step after 3 failed attempts
        setTimeout(() => {
          setStep('email');
          setToken('');
          setTokenSent(false);
          setTimeLeft(0);
        }, 2000);
      } else {
        toast.error(result.message);
      }
    } catch (error: any) {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const resetForm = () => {
    setStep('email');
    setEmail('');
    setName('');
    setToken('');
    setTokenSent(false);
    setTimeLeft(0);
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 w-1/2 bg-red-50 dark:bg-red-900/20" />
        <div className="absolute inset-0 left-1/2 bg-blue-50 dark:bg-blue-900/20" />
      </div>
      
      <Toaster position="top-center" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <MapPin className="h-12 w-12 text-red-400 animate-bounce" />
        </div>
        <h2 className="mt-6 text-center text-3xl brand-text">
          Welcome to MyCIP
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Your gateway to <span className="text-red-600">C</span>anadian <span className="text-red-600">I</span>mmigration <span className="text-red-600">P</span>athways
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10">
          
          {/* Step Indicator */}
          <div className="flex items-center justify-center mb-8">
            <div className="flex items-center space-x-4">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step === 'email' ? 'bg-blue-500 text-white' : 'bg-green-500 text-white'
              }`}>
                <Mail className="h-4 w-4" />
              </div>
              <div className={`w-12 h-0.5 ${step === 'token' ? 'bg-green-500' : 'bg-gray-300'}`} />
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step === 'token' ? 'bg-blue-500 text-white' : 'bg-gray-300 text-gray-500'
              }`}>
                <Shield className="h-4 w-4" />
              </div>
            </div>
          </div>

          {step === 'email' ? (
            <form onSubmit={handleSendToken} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Email Address *
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <Mail className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="email"
                    required
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name (Optional)
                </label>
                <div className="mt-1 relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    className="block w-full pl-10 pr-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Send Login Token'
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyToken} className="space-y-6">
              <div className="text-center mb-6">
                <div className="flex items-center justify-center mb-2">
                  <Clock className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    Token expires in: {formatTime(timeLeft)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Check your email: <strong>{email}</strong>
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  6-Digit Token
                </label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    maxLength={6}
                    className="block w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono tracking-widest focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    value={token}
                    onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    placeholder="000000"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || token.length !== 6}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg text-white bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 focus:outline-none focus:ring-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-300"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin h-5 w-5" />
                ) : (
                  'Verify & Sign In'
                )}
              </button>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                >
                  ← Use different email
                </button>
                <button
                  type="button"
                  onClick={() => handleSendToken(new Event('submit') as any)}
                  disabled={isSubmitting}
                  className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-200 disabled:opacity-50"
                >
                  Resend token
                </button>
              </div>
            </form>
          )}

          {/* Security Notice */}
          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
            <div className="flex items-start">
              <Shield className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300">
                  Secure Token Authentication
                </h4>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  • Tokens expire in 10 minutes<br/>
                  • Maximum 3 verification attempts<br/>
                  • No passwords to remember or forget
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}