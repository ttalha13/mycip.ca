import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

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
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setUser(session?.user ?? null);
        }
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setLoading(false);
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
      const { error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Supabase sign in error:', error);
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
        console.error('Password sign in error:', error);
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
    
    if (import.meta.env.DEV) {
      console.log('Attempting password reset for:', trimmedEmail);
    }
    
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
      const redirectUrl = 'https://mycip.ca/auth/callback?type=recovery';
      
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
        redirectTo: redirectUrl,
      });

      if (error) {
        if (import.meta.env.DEV) {
          console.error('Supabase password reset error:', error);
        }
        throw error;
      }

      if (import.meta.env.DEV) {
        console.log('Password reset email sent for:', trimmedEmail);
      }
      return { 
        error: null,
        message: 'Password reset email sent! Please check your inbox.' 
      };
    } catch (error: any) {
      if (import.meta.env.DEV) {
        console.error('Password reset error:', error);
      }
      return {
        error: new Error(error.message || 'Failed to send password reset email. Please try again.'),
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