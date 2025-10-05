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
        
        // Get URL parameters
        const hash = window.location.hash;
        const urlType = searchParams.get('type');
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        
        console.log('Auth callback - type:', urlType, 'hash:', hash, 'accessToken:', !!accessToken);
        
        // Handle password recovery specifically
        if (urlType === 'recovery') {
          if (hash && hash.includes('access_token')) {
            // Extract tokens from hash for recovery
            const hashParams = new URLSearchParams(hash.substring(1));
            const hashAccessToken = hashParams.get('access_token');
            const hashRefreshToken = hashParams.get('refresh_token');
            
            if (hashAccessToken && hashRefreshToken) {
              // Set the session with the tokens
              const { data, error } = await supabase.auth.setSession({
                access_token: hashAccessToken,
                refresh_token: hashRefreshToken
              });
              
              if (error) {
                throw error;
              }
              
              if (data.session) {
                console.log('Recovery session established, redirecting to reset password');
                navigate('/reset-password');
                return;
              }
            }
          } else if (accessToken && refreshToken) {
            // Handle tokens from URL parameters
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            });
            
            if (error) {
              throw error;
            }
            
            if (data.session) {
              console.log('Recovery session established from params, redirecting to reset password');
              navigate('/reset-password');
              return;
            }
          }
          
          throw new Error('Invalid recovery link. Missing authentication tokens.');
        }
        
        // Handle regular authentication (magic links, etc.)
        if (hash && hash.includes('access_token')) {
          // Let Supabase handle the hash for regular auth
          const { data, error } = await supabase.auth.getSession();
          
          if (error) {
            throw error;
          }
          
          if (data.session) {
            setSuccess(true);
            setTimeout(() => navigate('/'), 1500);
            return;
          }
        }
        
        // Handle email verification tokens
        const email = searchParams.get('email');
        const token = searchParams.get('token');
        
        if (!email || !token) {
          console.error('Missing email or token in URL');
          setError('Invalid login link. Missing required parameters.');
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
        
        // Verify the OTP
        const { data, error } = await supabase.auth.verifyOtp({
          type: 'magiclink',
          email,
          token,
        });
        
        if (error) {
          console.error('Error verifying OTP:', error);
          throw error;
        }
        
        if (data.session) {
          setSuccess(true);
          setTimeout(() => navigate('/'), 1500);
        } else {
          throw new Error('No session created after verification');
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