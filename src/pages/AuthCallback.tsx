import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Loader2, CheckCircle, AlertCircle } from 'lucide-react';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [processing, setProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        setProcessing(true);
        
        console.log('Auth callback started');
        console.log('URL:', window.location.href);
        console.log('Hash:', window.location.hash);
        console.log('Search params:', window.location.search);
        
        // Let Supabase automatically handle the auth callback
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session after callback:', error);
          throw error;
        }
        
        if (data.session) {
          console.log('Session established:', data.session.user.email);
          
          // Check if this is a recovery session (password reset)
          const urlType = searchParams.get('type');
          if (urlType === 'recovery' || window.location.hash.includes('type=recovery')) {
            console.log('Recovery session detected, redirecting to reset password');
            navigate('/reset-password');
            return;
          }
          
          // Regular sign in
          setSuccess(true);
          setTimeout(() => navigate('/'), 1500);
        } else {
          throw new Error('No session created after authentication');
        }
      } catch (error: any) {
        console.error('Error in auth callback:', error);
        setError(error.message || 'An unexpected error occurred. Please try again.');
        setTimeout(() => navigate('/login'), 3000);
      } finally {
        setProcessing(false);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-6 max-w-md">
          <div className="text-green-500 mb-4">
            <CheckCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Successfully signed in!</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">Redirecting you to the dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-6 max-w-md">
          <div className="text-red-500 mb-4">
            <AlertCircle className="h-12 w-12 mx-auto" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Authentication Error</h2>
          <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400">Redirecting you to the login page...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center">
        <Loader2 className="animate-spin h-12 w-12 mx-auto text-purple-500 mb-4" />
        <p className="text-gray-600 dark:text-gray-300">
          {processing ? 'Verifying your login...' : 'Redirecting...'}
        </p>
      </div>
    </div>
  );
}