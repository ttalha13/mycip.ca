import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { MapPin, Loader2, Mail, CheckCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import toast, { Toaster } from 'react-hot-toast';

export default function LoginPage() {
  const { user, signInWithPassword, signUpWithPassword, resetPassword } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { theme } = useTheme();
  
  const [isSignUp, setIsSignUp] = useState(false);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      const from = location.state?.from?.pathname || '/';
      // Add a small delay to ensure state is properly updated
      setTimeout(() => {
        navigate(from, { replace: true });
      }, 100);
    }
  }, [user, navigate, location]);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email.trim());
  };

  const validatePassword = (password: string): boolean => {
    return password.length >= 6;
  };

  const validateFullName = (name: string): boolean => {
    return name.trim().length >= 2;
  };


  const handleEmailPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName.trim();
    
    if (!trimmedEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    if (isSignUp && !validateFullName(trimmedName)) {
      toast.error('Please enter your full name (at least 2 characters)');
      return;
    }

    if (!password) {
      toast.error('Please enter your password');
      return;
    }

    if (!validatePassword(password)) {
      toast.error('Password must be at least 6 characters long');
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    setIsSubmitting(true);
    
    try {
      let result;
      if (isSignUp) {
        result = await signUpWithPassword(trimmedEmail, password, trimmedName);
      } else {
        result = await signInWithPassword(trimmedEmail, password);
      }
      
      if (result.error) {
        console.error('Email/password auth error:', result.error);
        toast.error(result.error.message || `${isSignUp ? 'Sign up' : 'Sign in'} failed`);
      } else {
        if (isSignUp) {
          toast.success('Account created successfully! Please check your email to verify your account.', {
            duration: 5000,
          });
        } else {
          toast.success('Successfully signed in!', {
            duration: 3000,
          });
        }
      }
    } catch (error: any) {
      console.error('Email/password auth exception:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      toast.error('Please enter your email address');
      return;
    }

    if (!validateEmail(trimmedEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const result = await resetPassword(trimmedEmail);
      
      if (result.error) {
        console.error('Password reset error:', result.error);
        // Check for rate limiting error
        if (result.error.message?.includes('For security purposes, you can only request this after')) {
          toast.error('Please wait before requesting another password reset email. Try again in a few seconds.', {
            duration: 5000,
          });
        } else {
          toast.error(result.error.message || 'Failed to send password reset email');
        }
      } else {
        toast.success('Password reset email sent! Please check your inbox.', {
          duration: 5000,
        });
        setIsForgotPassword(false);
        setEmail('');
      }
    } catch (error: any) {
      console.error('Password reset exception:', error);
      toast.error('Something went wrong. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <div className="absolute inset-0">
        <div className="absolute inset-0 w-1/2 bg-red-50 dark:bg-red-900/20" />
        <div className="absolute inset-0 left-1/2 bg-blue-50 dark:bg-blue-900/20" />
      </div>
      
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-red-200/30 dark:bg-red-500/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-200/30 dark:bg-blue-500/10 rounded-full filter blur-3xl" />

      <Toaster position="top-center" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <div className="transform transition-transform duration-500 animate-bounce">
            <MapPin className={`h-12 w-12 ${theme === 'dark' ? 'text-red-400' : 'text-red-400'}`} />
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl brand-text">
          Welcome to MyCIP
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Your gateway to <span className="text-red-600">C</span>anadian <span className="text-red-600">I</span>mmigration <span className="text-red-600">P</span>athways
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border-2 border-white/50 dark:border-gray-700/50">
          
          {isForgotPassword ? (
            <>
              <div className="text-center mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Reset Your Password
                </h3>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-6">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Email address
                  </label>
                  <div className="mt-1 relative rounded-md shadow-sm">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      id="reset-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      required
                      className={`mt-1 block w-full px-4 py-3 pl-10 rounded-lg border-2 shadow-lg 
                        backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white
                        ${theme === 'dark' 
                          ? 'border-red-400/30 focus:border-red-400 focus:ring focus:ring-red-300 focus:ring-opacity-50'
                          : 'border-red-200 focus:border-red-400 focus:ring focus:ring-red-200 focus:ring-opacity-50'
                        }
                        transition-all duration-200 ease-in-out`}
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isSubmitting}
                      placeholder="Enter your email"
                    />
                  </div>
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white 
                      ${theme === 'dark'
                        ? 'bg-red-500 hover:bg-red-600'
                        : 'bg-gradient-to-r from-red-400 to-blue-400 hover:from-red-500 hover:to-blue-500'
                      } 
                      focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-500 
                      transition-all duration-200
                      ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <Loader2 className="animate-spin h-5 w-5 mr-2" />
                        Sending reset email...
                      </div>
                    ) : (
                      'Send Reset Email'
                    )}
                  </button>
                </div>
              </form>

              <div className="mt-6 text-center">
                <button
                  onClick={() => {
                    setIsForgotPassword(false);
                    setEmail('');
                  }}
                  className="text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
                >
                  Back to sign in
                </button>
              </div>
            </>
          ) : (
            <>

          {/* Tab Navigation */}
          <div className="flex mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setIsSignUp(false)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                !isSignUp
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsSignUp(true)}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all duration-200 ${
                isSignUp
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          <form onSubmit={handleEmailPasswordSubmit} className="space-y-6">
            {isSignUp && (
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Full Name
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="fullName"
                    name="fullName"
                    type="text"
                    autoComplete="name"
                    required={isSignUp}
                    className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-lg 
                      backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white
                      ${theme === 'dark' 
                        ? 'border-red-400/30 focus:border-red-400 focus:ring focus:ring-red-300 focus:ring-opacity-50'
                        : 'border-red-200 focus:border-red-400 focus:ring focus:ring-red-200 focus:ring-opacity-50'
                      }
                      transition-all duration-200 ease-in-out`}
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Enter your full name"
                  />
                </div>
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Email address
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  className={`mt-1 block w-full px-4 py-3 pl-10 rounded-lg border-2 shadow-lg 
                    backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white
                    ${theme === 'dark' 
                      ? 'border-red-400/30 focus:border-red-400 focus:ring focus:ring-red-300 focus:ring-opacity-50'
                      : 'border-red-200 focus:border-red-400 focus:ring focus:ring-red-200 focus:ring-opacity-50'
                    }
                    transition-all duration-200 ease-in-out`}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isSignUp ? 'new-password' : 'current-password'}
                  required
                  className={`mt-1 block w-full px-4 py-3 pr-10 rounded-lg border-2 shadow-lg 
                    backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white
                    ${theme === 'dark' 
                      ? 'border-red-400/30 focus:border-red-400 focus:ring focus:ring-red-300 focus:ring-opacity-50'
                      : 'border-red-200 focus:border-red-400 focus:ring focus:ring-red-200 focus:ring-opacity-50'
                    }
                    transition-all duration-200 ease-in-out`}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be at least 6 characters long
              </p>
            </div>

            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Confirm Password
                </label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    className={`mt-1 block w-full px-4 py-3 pr-10 rounded-lg border-2 shadow-lg 
                      backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white
                      ${theme === 'dark' 
                        ? 'border-red-400/30 focus:border-red-400 focus:ring focus:ring-red-300 focus:ring-opacity-50'
                        : 'border-red-200 focus:border-red-400 focus:ring focus:ring-red-200 focus:ring-opacity-50'
                      }
                      transition-all duration-200 ease-in-out`}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSubmitting}
                    placeholder="Confirm your password"
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5 text-gray-400" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400" />
                    )}
                  </button>
                </div>
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white 
                  ${theme === 'dark'
                    ? 'bg-red-500 hover:bg-red-600'
                    : 'bg-gradient-to-r from-red-400 to-blue-400 hover:from-red-500 hover:to-blue-500'
                  } 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:focus:ring-red-500 
                  transition-all duration-200
                  ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    {isSignUp ? 'Creating account...' : 'Signing in...'}
                  </div>
                ) : (
                  isSignUp ? 'Create Account' : 'Sign In'
                )}
              </button>
            </div>
          </form>

          {!isSignUp && (
            <div className="mt-4 text-center">
              <button
                onClick={() => navigate('/simple-password-reset')}
                className="text-sm text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
              >
                Quick Reset: No email required
              </button>
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-medium text-red-600 dark:text-red-400 hover:text-red-500 dark:hover:text-red-300"
              >
                {isSignUp ? 'Sign in' : 'Sign up'}
              </button>
            </p>
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}