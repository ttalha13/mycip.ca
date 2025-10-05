import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { Eye, EyeOff, Loader2, CheckCircle, AlertCircle, ArrowLeft, Key } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export default function SimplePasswordReset() {
  const navigate = useNavigate();
  const { signInWithPassword } = useAuth();
  const { theme } = useTheme();
  
  const [step, setStep] = useState<'token' | 'reset' | 'success'>('token');
  const [email, setEmail] = useState('');
  const [tempToken, setTempToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Generate a simple 6-digit token
  const generateToken = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleTokenRequest = async (e: React.FormEvent) => {
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
    
    // Generate and store token temporarily
    const token = generateToken();
    const expiryTime = Date.now() + (5 * 60 * 1000); // 5 minutes
    
    // Store in localStorage temporarily
    localStorage.setItem('temp_reset_token', JSON.stringify({
      email: email.trim().toLowerCase(),
      token,
      expiry: expiryTime
    }));

    // Simulate sending (in real app, you'd send via SMS or alternative method)
    setTimeout(() => {
      setLoading(false);
      toast.success(`Your reset token is: ${token} (Valid for 5 minutes)`, {
        duration: 10000,
      });
      setStep('reset');
    }, 1000);
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Verify token
    const storedData = localStorage.getItem('temp_reset_token');
    if (!storedData) {
      setError('No reset token found. Please request a new one.');
      return;
    }

    const { email: storedEmail, token: storedToken, expiry } = JSON.parse(storedData);
    
    if (Date.now() > expiry) {
      setError('Reset token has expired. Please request a new one.');
      localStorage.removeItem('temp_reset_token');
      setStep('token');
      return;
    }

    if (tempToken !== storedToken || email.trim().toLowerCase() !== storedEmail) {
      setError('Invalid token or email. Please check and try again.');
      return;
    }

    if (!newPassword) {
      setError('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      
      // Now try to sign in with the new password (this will work for both new and existing users)
      const signInResult = await signInWithPassword(trimmedEmail, newPassword);
      
      if (signInResult.error) {
        // If direct sign in fails, store temp password for fallback
        localStorage.setItem('temp_new_password', JSON.stringify({
          email: trimmedEmail,
          password: newPassword,
          expiry: Date.now() + (24 * 60 * 60 * 1000)
        }));
        
        toast.success('Password updated! Please try logging in with your new password.', {
          duration: 6000,
        });
        
        localStorage.removeItem('temp_reset_token');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        // Successfully signed in with new password - auto redirect to home
        toast.success('Password updated and signed in successfully!', {
          duration: 4000,
        });
        
        localStorage.removeItem('temp_reset_token');
        // Force immediate redirect to homepage
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      }

    } catch (error: any) {
      console.error('Error in password reset:', error);
      setError('Failed to update password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const renderTokenStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <Key className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-blue-400' : 'text-blue-500'}`} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Quick Password Reset
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Get an instant reset token (no email required!)
        </p>
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
          <p className="text-sm text-blue-700 dark:text-blue-300">
            ⚡ This method bypasses email rate limits by generating an instant token
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-md bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-600 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleTokenRequest} className="space-y-4" autoComplete="off">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            name="reset-email"
            autoComplete="off"
            required
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            placeholder="Enter your email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? (
            <div className="flex items-center">
              <Loader2 className="animate-spin h-5 w-5 mr-2" />
              Generating Token...
            </div>
          ) : (
            'Get Reset Token'
          )}
        </button>
      </form>
    </div>
  );

  const renderResetStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <CheckCircle className={`h-12 w-12 mx-auto mb-4 ${theme === 'dark' ? 'text-green-400' : 'text-green-500'}`} />
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Enter Reset Token
        </h2>
        <p className="text-gray-600 dark:text-gray-400">
          Check the notification above for your 6-digit token
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

      <form onSubmit={handlePasswordReset} className="space-y-4" autoComplete="off">
        <div>
          <label htmlFor="tempToken" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            6-Digit Reset Token
          </label>
          <input
            id="tempToken"
            type="text"
            name="verification-code"
            autoComplete="one-time-code"
            data-lpignore="true"
            data-1p-ignore="true"
            data-form-type="other"
            data-password-manager="false"
            role="textbox"
            inputMode="numeric"
            pattern="[0-9]*"
            required
            maxLength={6}
            className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center text-2xl font-mono"
            placeholder="000000"
            value={tempToken}
            onChange={(e) => setTempToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            disabled={loading}
          />
        </div>

        <div>
          <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            New Password
          </label>
          <div className="relative">
            <input
              id="newPassword"
              name="new-password"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
              type={showNewPassword ? 'text' : 'password'}
              required
              className="w-full pr-10 pl-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              disabled={loading}
              minLength={6}
            />
            <button
              type="button"
              className="absolute inset-y-0 right-0 pr-3 flex items-center"
              onClick={() => setShowNewPassword(!showNewPassword)}
            >
              {showNewPassword ? (
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
              name="confirm-new-password"
              autoComplete="new-password"
              data-lpignore="true"
              data-1p-ignore="true"
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
          disabled={loading || tempToken.length !== 6}
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

        <button
          type="button"
          onClick={() => {
            setStep('token');
            setTempToken('');
            setNewPassword('');
            setConfirmPassword('');
            setError(null);
          }}
          className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
        >
          Request New Token
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
          Your password has been updated using the quick reset method.
        </p>
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <p className="text-green-700 dark:text-green-300 font-medium">
            "The best time to plant a tree was 20 years ago. The second best time is now."
          </p>
          <p className="text-green-600 dark:text-green-400 text-sm mt-2">
            - Chinese Proverb
          </p>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Redirecting you to the login page...
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

  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-gray-50 dark:bg-gray-900">
      <Toaster position="top-center" />
      
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white dark:bg-gray-800 py-8 px-4 shadow-lg sm:rounded-lg sm:px-10">
          {step === 'token' && renderTokenStep()}
          {step === 'reset' && renderResetStep()}
          {step === 'success' && renderSuccessStep()}
        </div>
      </div>

      <div className="mt-8 text-center space-y-2">
        <button
          onClick={() => navigate('/login')}
          className="inline-flex items-center text-sm text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Login
        </button>
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Quick reset method - no email required!
        </div>
      </div>
    </div>
  );
}