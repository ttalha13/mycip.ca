import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Lock, Loader2, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function ResetPassword() {
  const { updatePassword } = useAuth();
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  // Handle auth state change and check for recovery session
  useEffect(() => {
    let mounted = true;

    const handleAuthStateChange = async () => {
      try {
        // First, let Supabase process any auth tokens from the URL
        const hashParams = new URLSearchParams(window.location.hash.substring(1));
        const urlParams = new URLSearchParams(window.location.search);
        
        const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
        const type = hashParams.get('type') || urlParams.get('type');
        
        console.log('Reset password page - Auth params:', { 
          hasAccessToken: !!accessToken, 
          hasRefreshToken: !!refreshToken, 
          type 
        });

        // If we have tokens, let Supabase handle them
        if (accessToken && refreshToken && type === 'recovery') {
          console.log('Processing recovery tokens...');
          const { data, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken
          });
          
          if (error) {
            console.error('Error setting recovery session:', error);
            if (mounted) {
              toast.error('Invalid or expired reset link. Please request a new one.');
              navigate('/login');
            }
            return;
          }
          
          console.log('Recovery session set successfully:', data.user?.email);
          if (mounted) {
            setSessionChecked(true);
            // Clear the URL parameters
            window.history.replaceState({}, document.title, '/reset-password');
          }
          return;
        }

        // Check existing session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          if (mounted) {
            toast.error('Invalid or expired reset link. Please request a new one.');
            navigate('/login');
          }
          return;
        }
        
        if (!session) {
          console.log('No session found for password reset');
          if (mounted) {
            toast.error('Invalid or expired reset link. Please request a new one.');
            navigate('/login');
          }
          return;
        }
        
        console.log('Valid recovery session found for:', session.user.email);
        if (mounted) {
          setSessionChecked(true);
        }
      } catch (error) {
        console.error('Error checking recovery session:', error);
        if (mounted) {
          toast.error('Invalid or expired reset link. Please request a new one.');
          navigate('/login');
        }
      }
    };
    
    handleAuthStateChange();
    
    return () => {
      mounted = false;
    };
  }, [navigate]);

  const validatePassword = (pass: string): string | null => {
    if (pass.length < 6) {
      return 'Password must be at least 6 characters long';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validate password
    const passwordError = validatePassword(password);
    if (passwordError) {
      setValidationError(passwordError);
      toast.error(passwordError);
      return;
    }

    if (password !== confirmPassword) {
      setValidationError('Passwords do not match');
      toast.error('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const { error } = await updatePassword(password);

      if (error) {
        console.error('Update password error:', error);
        throw error;
      }

      toast.success('Password updated successfully! Please sign in with your new password.');
      
      // Show success message for a moment before redirecting
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error: any) {
      console.error('Error updating password:', error);
      toast.error(error.message || 'Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Show loading while checking session
  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mx-auto text-purple-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      <Toaster position="top-center" />
      
      <div className="absolute inset-0">
        <div className="absolute inset-0 w-1/2 bg-pink-50 dark:bg-pink-900/20" />
        <div className="absolute inset-0 left-1/2 bg-blue-50 dark:bg-blue-900/20" />
      </div>
      
      <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-pink-200/30 dark:bg-pink-500/10 rounded-full filter blur-3xl" />
      <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-blue-200/30 dark:bg-blue-500/10 rounded-full filter blur-3xl" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="flex justify-center">
          <Lock className={`h-12 w-12 ${theme === 'dark' ? 'text-purple-400' : 'text-pink-400'}`} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900 dark:text-white">
          Reset your password
        </h2>
        <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
          Please enter your new password
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md relative z-10">
        <div className="backdrop-blur-lg bg-white/80 dark:bg-gray-800/80 py-8 px-4 shadow-2xl sm:rounded-lg sm:px-10 border-2 border-white/50 dark:border-gray-700/50">
          {validationError && (
            <div className="mb-4 p-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
              <div className="flex">
                <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                <p className="text-sm text-red-600 dark:text-red-300">{validationError}</p>
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                New Password
              </label>
              <input
                id="password"
                type="password"
                required
                className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-lg 
                  backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white
                  ${theme === 'dark' 
                    ? 'border-purple-400/30 focus:border-purple-400 focus:ring focus:ring-purple-300 focus:ring-opacity-50'
                    : 'border-pink-200 focus:border-pink-400 focus:ring focus:ring-pink-200 focus:ring-opacity-50'
                  }
                  transition-all duration-200 ease-in-out`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
              />
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Must be at least 6 characters long
              </p>
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Confirm New Password
              </label>
              <input
                id="confirmPassword"
                type="password"
                required
                className={`mt-1 block w-full px-4 py-3 rounded-lg border-2 shadow-lg 
                  backdrop-blur-sm bg-white/80 dark:bg-gray-800/80 text-gray-900 dark:text-white
                  ${theme === 'dark' 
                    ? 'border-purple-400/30 focus:border-purple-400 focus:ring focus:ring-purple-300 focus:ring-opacity-50'
                    : 'border-pink-200 focus:border-pink-400 focus:ring focus:ring-pink-200 focus:ring-opacity-50'
                  }
                  transition-all duration-200 ease-in-out`}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                minLength={6}
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className={`w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-lg text-sm font-medium text-white 
                  ${theme === 'dark'
                    ? 'bg-purple-500 hover:bg-purple-600'
                    : 'bg-gradient-to-r from-pink-400 to-blue-400 hover:from-pink-500 hover:to-blue-500'
                  } 
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-pink-500 dark:focus:ring-purple-500 
                  transition-all duration-200
                  disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {loading ? (
                  <div className="flex items-center">
                    <Loader2 className="animate-spin h-5 w-5 mr-2" />
                    Updating password...
                  </div>
                ) : (
                  'Reset Password'
                )}
              </button>
            </div>
          </form>
          
          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => navigate('/login')}
              className="text-sm text-pink-500 dark:text-purple-400 hover:text-pink-600 dark:hover:text-purple-300"
            >
              Return to login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}