import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { Lock, Mail, Eye, EyeOff, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function NewPasswordReset() {
  const navigate = useNavigate();
  const { theme } = useTheme();
  const [searchParams] = useSearchParams();
  
  const [step, setStep] = useState<'email' | 'reset' | 'success'>('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if we have recovery tokens in the URL
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const urlParams = new URLSearchParams(window.location.search);
    
    const accessToken = hashParams.get('access_token') || urlParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token') || urlParams.get('refresh_token');
    const type = hashParams.get('type') || urlParams.get('type');
    const error = hashParams.get('error') || urlParams.get('error');
    const errorDescription = hashParams.get('error_description') || urlParams.get('error_description');

    console.log('URL check:', { 
      accessToken: !!accessToken, 
      refreshToken: !!refreshToken, 
      type, 
      error,
      errorDescription,
      hash: window.location.hash,
      search: window.location.search
    });

    if (error) {
      console.error('Auth error in URL:', error, errorDescription);
      setError(errorDescription || error);
      setStep('email');
    } else if (accessToken && refreshToken && type === 'recovery') {
      console.log('Recovery tokens found, processing...');
      processRecoveryTokens(accessToken, refreshToken);
    } else {
      console.log('No recovery tokens, showing email form');
      setStep('email');
    }
  }, [searchParams]);

  const processRecoveryTokens = async (accessToken: string, refreshToken: string) => {
    setLoading(true);
    try {
      console.log('Setting recovery session...');
      const { data, error } = await supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken
      });

      if (error) {
        console.error('Error setting recovery session:', error);
        setError('Invalid or expired reset link. Please request a new one.');
        setStep('email');
      } else if (data.user) {
        console.log('Recovery session established for:', data.user.email);
        setEmail(data.user.email || '');
        setStep('reset');
        // Clean up URL
        window.history.replaceState({}, document.title, '/new-password-reset');
      }
    } catch (error) {
      console.error('Error processing recovery tokens:', error);
      setError('Invalid or expired reset link. Please request a new one.');
      setStep('email');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email.trim()) {
      setError('Please enter your email address');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError('Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      console.log('Sending password reset email to:', email.trim());
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
        redirectTo: `${window.location.origin}/new-password-reset`,
      });

      if (error) {
        console.error('Password reset error:', error);
        if (error.message.includes('For security purposes') || 
            error.message.includes('rate limit') ||
            error.message.includes('Too many')) {
          setError('Too many requests. Please wait 5-10 minutes before trying again.');
        } else {
          setError(error.message || 'Failed to send password reset email');
        }
      } else {
        console.log('Password reset email sent successfully');
        toast.success('Password reset email sent! Please check your inbox and click the link.', {
          duration: 8000,
        });
        // Don't change step, let user click the email link
      }
    } catch (error: any) {
      console.error('Password reset exception:', error);
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!password) {
      setError('Please enter a new password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      console.log('Updating password...');
      const { error } = await supabase.auth.updateUser({ 
        password: password 
      });

      if (error) {
        console.error('Update password error:', error);
        setError(error.message || 'Failed to update password');
      } else {
        console.log('Password updated successfully');
        setStep('success');
        // Auto redirect after 5 seconds
        setTimeout(() => {
          navigate('/login');
        }, 5000);
      }
    } catch (error: any) {
      console.error('Error updating password:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderEmailStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Mail className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Reset Your Password
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your email address to receive a password reset link
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleEmailSubmit} className="space-y-4">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail className="h-5 w-5 text-gray-400" />
            </div>
            <input
              id="email"
              type="email"
              required
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Sending Reset Email...
            </div>
          ) : (
            'Send Reset Email'
          )}
        </button>
      </form>

      <div className="text-center">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Remember your password?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 font-medium"
          >
            Sign in instead
          </button>
        </p>
      </div>
    </div>
  );

  const renderResetStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Lock className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Set New Password
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Enter your new password for: <span className="font-medium">{email}</span>
        </p>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handlePasswordReset} className="space-y-4">
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              required
              className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              minLength={6}
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

        <div>
          <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Confirm New Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              required
              className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              minLength={6}
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

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Updating Password...
            </div>
          ) : (
            'Update Password'
          )}
        </button>
      </form>
    </div>
  );

  const renderSuccessStep = () => (
    <div className="text-center space-y-6">
      <div className="text-green-500">
        <CheckCircle className="h-16 w-16 mx-auto mb-4" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Password Updated Successfully!
      </h2>
      <div className="space-y-4">
        <p className="text-gray-600 dark:text-gray-400">
          Your password has been updated successfully.
        </p>
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-700 dark:text-green-300 font-medium">
            "The only impossible journey is the one you never begin."
          </p>
          <p className="text-green-600 dark:text-green-400 text-sm mt-2">
            - Tony Robbins
          </p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Redirecting you to the login page in a few seconds...
        </p>
      </div>
      <button
        onClick={() => navigate('/login')}
        className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:text-green-300 dark:hover:bg-green-900/50"
      >
        Go to Login Now
      </button>
    </div>
  );

  if (loading && step === 'email') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <Loader2 className="animate-spin h-12 w-12 mx-auto text-blue-500 mb-4" />
          <p className="text-gray-600 dark:text-gray-300">Processing reset link...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-center" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {step === 'email' && renderEmailStep()}
          {step === 'reset' && renderResetStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </div>

      <div className="mt-8 text-center">
        <button
          onClick={() => navigate('/login')}
          className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
        >
          Back to Login
        </button>
      </div>
    </div>
  );
}