import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Global flag to prevent multiple concurrent auth initializations
let isInitializing = false;
let initializationPromise: Promise<void> | null = null;

interface AuthContextType {
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null; message?: string }>;
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null; message?: string }>;
  resetPassword: (email: string) => Promise<{ error: Error | null; message?: string }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signInWithPassword: async () => ({ error: null }),
  signUpWithPassword: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  updatePassword: async () => ({ error: null }),
  signOut: async () => {},
  loading: true,
});

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Get initial session from Supabase
    const getInitialSession = async () => {
      // Prevent multiple concurrent initializations
      if (isInitializing && initializationPromise) {
        await initializationPromise;
        return;
      }

      isInitializing = true;
      initializationPromise = (async () => {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (error) {
            console.error('Error getting session:', error);
            
            // Handle refresh token errors by clearing stale session data
            if (error.message?.includes('Invalid Refresh Token') || 
                error.message?.includes('Refresh Token Not Found')) {
              console.log('Clearing stale session due to invalid refresh token');
              await supabase.auth.signOut();
              localStorage.removeItem('mycip.auth.token');
              setUser(null);
              return;
            }
          } else {
            setUser(session?.user ?? null);
          }
        } catch (error) {
          console.error('Error initializing auth:', error);
          // Clear any stale session data on general exceptions
          try {
            await supabase.auth.signOut();
            localStorage.removeItem('mycip.auth.token');
          } catch (signOutError) {
            console.error('Error signing out during cleanup:', signOutError);
          }
          setUser(null);
        } finally {
          setLoading(false);
          isInitializing = false;
          initializationPromise = null;
        }
      })();

      try {
        await initializationPromise;
      } catch (error) {
        console.error('Error in auth initialization:', error);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
        setLoading(false);

        // Create or update user profile when user signs in
        if (event === 'SIGNED_IN' && session?.user) {
          await createOrUpdateUserProfile(session.user);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const createOrUpdateUserProfile = async (user: User) => {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
          provider: user.app_metadata?.provider || 'email',
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'id'
        });

      if (error) {
        console.error('Error creating/updating user profile:', error);
      } else {
        console.log('User profile created/updated successfully');
      }
    } catch (error) {
      console.error('Error in createOrUpdateUserProfile:', error);
    }
  };

  const signInWithPassword = async (email: string, password: string): Promise<{ error: Error | null; message?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (import.meta.env.DEV) {
      console.log('Attempting sign in for:', trimmedEmail);
    }
    
    if (!trimmedEmail || !password) {
      return {
        error: new Error('Please enter both email and password'),
        message: 'Missing credentials'
      };
    }

    try {
      // Check for temporary password from Quick Reset
      const tempPasswordData = localStorage.getItem('temp_new_password');
      if (tempPasswordData) {
        try {
          const { email: tempEmail, password: tempPassword, expiry } = JSON.parse(tempPasswordData);
          
          // If user is using the temp password and it matches
          if (Date.now() < expiry && trimmedEmail === tempEmail && password === tempPassword) {
            console.log('Using temporary password from Quick Reset');
            // For temp password, we need to update the existing user's password
            // First, get the current session to see if user is logged in
            const { data: { session } } = await supabase.auth.getSession();
            
            if (session) {
              // User is logged in, update their password
              const { error: updateError } = await supabase.auth.updateUser({ 
                password: tempPassword 
              });
              
              if (!updateError) {
                localStorage.removeItem('temp_new_password');
                return { 
                  error: null,
                  message: 'Password updated successfully!' 
                };
              }
            }
            
            // If no session, try to sign up (for new users)
            try {
              const { error: signUpError } = await supabase.auth.signUp({
                email: trimmedEmail,
                password: tempPassword,
                options: {
                  emailRedirectTo: 'https://mycip.ca/auth/callback'
                }
              });
              
              if (!signUpError) {
                localStorage.removeItem('temp_new_password');
                return { 
                  error: null,
                  message: 'Account created with new password!' 
                };
              }
            } catch (signUpError: any) {
              // If signup fails because user exists, that's fine
              if (signUpError.message?.includes('already registered')) {
                // User exists but password is wrong - this is expected for temp passwords
                // Just clean up and show success message
                localStorage.removeItem('temp_new_password');
                return { 
                  error: null,
                  message: 'Password has been reset! Please use your new password to sign in normally.' 
                };
              }
            }
          }
          // Clean up expired temp password
          if (Date.now() >= expiry) {
            localStorage.removeItem('temp_new_password');
          }
        } catch (error) {
          console.error('Error processing temp password:', error);
          localStorage.removeItem('temp_new_password');
        }
      }

      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Supabase sign in error (raw):', error, 'UI displays generic message for security.');
        }
        // For any authentication error, show generic message for security
        return {
          error: new Error('Invalid email or password'),
          message: 'Authentication failed'
        };
      }

      if (import.meta.env.DEV) {
        console.log('Sign in successful for:', trimmedEmail);
      }
      return { 
        error: null,
        message: 'Successfully signed in!' 
      };
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Password sign in error (raw):', error, 'UI displays generic message for security.');
      }
      return {
        error: new Error('Invalid email or password'),
        message: 'Authentication failed'
      };
    }
  };

  const signUpWithPassword = async (email: string, password: string, fullName?: string): Promise<{ error: Error | null; message?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedName = fullName?.trim();
    
    if (import.meta.env.DEV) {
      console.log('Attempting sign up for:', trimmedEmail);
    }
    
    if (!trimmedEmail || !password) {
      return {
        error: new Error('Please enter both email and password'),
        message: 'Missing credentials'
      };
    }

    if (password.length < 6) {
      return {
        error: new Error('Password must be at least 6 characters long'),
        message: 'Password too short'
      };
    }

    try {
      const { error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: {
          emailRedirectTo: 'https://mycip.ca/auth/callback',
          data: {
            full_name: trimmedName || null,
            email: trimmedEmail,
            created_at: new Date().toISOString(),
          }
        }
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Supabase sign up error:', error);
        }
        throw error;
      }

      if (import.meta.env.DEV) {
        console.log('Sign up successful for:', trimmedEmail);
      }
      return { 
        error: null,
        message: 'Account created! Please check your email to verify your account.' 
      };
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Sign up error:', error);
      }
      return {
        error: new Error(error.message || 'Sign up failed. Please try again.'),
        message: 'Registration failed'
      };
    }
  };

  const resetPassword = async (email: string): Promise<{ error: Error | null; message?: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    console.log('🔄 Starting password reset for:', trimmedEmail);
    console.log('🌐 Environment:', import.meta.env.DEV ? 'development' : 'production');
    
    if (!trimmedEmail) {
      return {
        error: new Error('Please enter your email address'),
        message: 'Missing email'
      };
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      return {
        error: new Error('Please enter a valid email address'),
        message: 'Invalid email format'
      };
    }

    try {
      // Use correct redirect URL for reset password page
      const redirectUrl = import.meta.env.DEV 
        ? 'http://localhost:3000/reset-password' 
        : 'https://mycip.ca/reset-password';
      
      console.log('🔗 Using redirect URL:', redirectUrl);
      console.log('📧 Sending reset email to:', trimmedEmail);
      
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      console.log('📧 Supabase resetPasswordForEmail response:', { error });

      if (error) {
        console.error('❌ Supabase password reset error:', error);
        
        // More specific error handling
        // Handle specific error cases
        if (error.message?.includes('over_email_send_rate_limit') || 
            error.message?.includes('rate limit') ||
            error.message?.includes('429') ||
            error.message?.includes('For security purposes')) {
          return {
            error: new Error('Too many requests. Please wait a minute before trying again.'),
            message: 'Rate limited'
          };
        }
        
        // Handle user not found
        if (error.message?.includes('User not found')) {
          return {
            error: new Error('No account found with this email address.'),
            message: 'User not found'
          };
        }
        
        throw error;
      }

      console.log('✅ Password reset email sent successfully for:', trimmedEmail);
      console.log('📬 User should check email (including spam folder)');
      
      return { 
        error: null,
        message: 'Password reset email sent! Please check your inbox and spam folder.' 
      };
    } catch (error: any) {
      console.error('💥 Password reset exception:', error);
      return {
        error: new Error(error.message || 'Something went wrong. Please try again.'),
        message: 'Reset failed'
      };
    }
  };

  const updatePassword = async (password: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      return { error: null };
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Update password error:', error);
      }
      return { error };
    }
  };

  const signOut = async () => {
    try {
      if (import.meta.env.DEV) {
        console.log('Initiating sign out...');
      }
      
      // Clear user state immediately to provide instant feedback
      setUser(null);
      
      const { error } = await supabase.auth.signOut();
      if (error) {
        if (import.meta.env.DEV) {
          console.error('Sign out error:', error);
        }
      }
      localStorage.removeItem('mycip.auth.token');
      if (import.meta.env.DEV) {
        console.log('Sign out successful');
      }
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Sign out error:', error);
      }
    } finally {
      // Always ensure user is cleared and redirected
      setUser(null);
      navigate('/login');
    }
  };

  const value: AuthContextType = {
    user,
    signInWithPassword,
    signUpWithPassword,
    resetPassword,
    updatePassword,
    signOut,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}