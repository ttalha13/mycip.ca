import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { User as SupabaseUser, AuthError } from '@supabase/supabase-js';

interface User {
  email: string;
  id: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  sendToken: (email: string, name?: string) => Promise<{ success: boolean; message: string }>;
  verifyToken: (email: string, token: string) => Promise<{ success: boolean; message: string; shouldReset?: boolean }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  sendToken: async () => ({ success: false, message: '' }),
  verifyToken: async () => ({ success: false, message: '' }),
  signOut: async () => {},
  loading: true,
});

// Fallback local storage implementation
const LOCAL_STORAGE_FALLBACK = {
  USERS_KEY: 'mycip_users',
  CURRENT_USER_KEY: 'mycip_current_user',
  TOKENS_KEY: 'mycip_tokens',
};

interface StoredUser {
  email: string;
  name?: string;
  id: string;
  createdAt: string;
}

interface StoredToken {
  email: string;
  token: string;
  expiresAt: number;
  attempts: number;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSupabaseAvailable, setIsSupabaseAvailable] = useState(true);
  const navigate = useNavigate();

  // Check if Supabase is available
  useEffect(() => {
    const checkSupabase = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error && error.message.includes('not available')) {
          setIsSupabaseAvailable(false);
        }
      } catch (error) {
        console.warn('Supabase not available, falling back to local auth');
        setIsSupabaseAvailable(false);
      }
    };
    checkSupabase();
  }, []);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      if (isSupabaseAvailable) {
        // Supabase Auth
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('Error getting session:', error);
            setIsSupabaseAvailable(false);
            initializeLocalAuth();
            return;
          }

          if (session?.user) {
            const userData: User = {
              email: session.user.email!,
              id: session.user.id,
              name: session.user.user_metadata?.name || session.user.user_metadata?.full_name
            };
            setUser(userData);
          }

          // Listen for auth changes
          const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
              console.log('Auth state changed:', event);
              
              if (session?.user) {
                const userData: User = {
                  email: session.user.email!,
                  id: session.user.id,
                  name: session.user.user_metadata?.name || session.user.user_metadata?.full_name
                };
                setUser(userData);
              } else {
                setUser(null);
              }
            }
          );

          setLoading(false);
          return () => subscription.unsubscribe();
        } catch (error) {
          console.error('Supabase auth initialization failed:', error);
          setIsSupabaseAvailable(false);
          initializeLocalAuth();
        }
      } else {
        initializeLocalAuth();
      }
    };

    const initializeLocalAuth = () => {
      const currentUser = localStorage.getItem(LOCAL_STORAGE_FALLBACK.CURRENT_USER_KEY);
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          setUser(userData);
        } catch (error) {
          localStorage.removeItem(LOCAL_STORAGE_FALLBACK.CURRENT_USER_KEY);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [isSupabaseAvailable]);

  // Supabase Auth Functions
  const sendTokenSupabase = async (email: string, name?: string): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      return { success: false, message: 'Please enter a valid email address' };
    }

    try {
      // Generate 6-digit token
      const token = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes
      
      // Store token in localStorage for verification
      const tokens = JSON.parse(localStorage.getItem('mycip_pending_tokens') || '[]');
      const newToken = {
        email: trimmedEmail,
        token,
        expiresAt,
        attempts: 0,
        name: name || ''
      };
      
      // Remove any existing tokens for this email
      const filteredTokens = tokens.filter((t: any) => t.email !== trimmedEmail);
      filteredTokens.push(newToken);
      localStorage.setItem('mycip_pending_tokens', JSON.stringify(filteredTokens));
      
      // Send email via Edge Function
      const { data, error } = await supabase.functions.invoke('send-otp-email', {
        body: {
          email: trimmedEmail,
          token,
          name: name || ''
        }
      });

      if (error) {
        console.error('Email sending error:', error);
        
        // Enhanced error logging
        console.error('Full error object:', JSON.stringify(error, null, 2));
        
        let errorMessage = 'Failed to send email. Please try again.';
        if (error.message) {
          errorMessage = error.message;
          console.error('Error message:', error.message);
        }
        
        return { success: false, message: errorMessage };
      }

      // Check if the response indicates an error
      if (data && data.error) {
        console.error('Edge Function returned error:', JSON.stringify(data, null, 2));
        
        // Show debug info in development
        if (import.meta.env.DEV && data.debug) {
          console.error('Debug info:', data.debug);
        }
        
        let userMessage = data.details || data.error;
        
        // Add helpful hints for common errors
        if (data.debug?.resendStatus === 422) {
          userMessage += '\n\nTip: Check if your domain is verified in Resend dashboard.';
        } else if (data.debug?.apiKeyLength && data.debug.apiKeyLength < 10) {
          userMessage += '\n\nTip: Check if RESEND_API_KEY is set correctly in Supabase.';
        }
        
        return { success: false, message: userMessage };
      }

      return { 
        success: true, 
        message: `6-digit code sent to ${trimmedEmail}. Please check your email and enter the code.` 
      };
    } catch (error: any) {
      console.error('Unexpected error sending email:', error);
      console.error('Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      return { success: false, message: 'Something went wrong. Please try again.' };
    }
  };

  const verifyTokenSupabase = async (email: string, token: string): Promise<{ success: boolean; message: string; shouldReset?: boolean }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();
    
    if (!trimmedEmail || !trimmedToken) {
      return { success: false, message: 'Please enter both email and verification code' };
    }

    if (trimmedToken.length !== 6) {
      return { success: false, message: 'Verification code must be 6 digits' };
    }

    try {
      // Get stored tokens
      const tokens = JSON.parse(localStorage.getItem('mycip_pending_tokens') || '[]');
      const tokenRecord = tokens.find((t: any) => t.email === trimmedEmail);
      
      if (!tokenRecord) {
        return { success: false, message: 'No valid token found. Please request a new one.' };
      }
      
      if (tokenRecord.expiresAt <= Date.now()) {
        // Remove expired token
        const filteredTokens = tokens.filter((t: any) => t.email !== trimmedEmail);
        localStorage.setItem('mycip_pending_tokens', JSON.stringify(filteredTokens));
        return { success: false, message: 'Code has expired. Please request a new one.', shouldReset: true };
      }
      
      if (tokenRecord.attempts >= 3) {
        // Remove token after too many attempts
        const filteredTokens = tokens.filter((t: any) => t.email !== trimmedEmail);
        localStorage.setItem('mycip_pending_tokens', JSON.stringify(filteredTokens));
        return { success: false, message: 'Too many failed attempts. Please request a new code.', shouldReset: true };
      }
      
      if (tokenRecord.token !== trimmedToken) {
        // Increment attempts
        tokenRecord.attempts += 1;
        localStorage.setItem('mycip_pending_tokens', JSON.stringify(tokens));
        const attemptsLeft = 3 - tokenRecord.attempts;
        return { 
          success: false, 
          message: `Invalid code. ${attemptsLeft} attempts remaining.`,
          shouldReset: attemptsLeft === 0
        };
      }
      
      // Token is valid - create/sign in user
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: `temp_${trimmedToken}_${Date.now()}` // Temporary password
      });
      
      // If user doesn't exist, create them
      if (error && error.message.includes('Invalid login credentials')) {
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
          email: trimmedEmail,
          password: `temp_${trimmedToken}_${Date.now()}`,
          options: {
            data: {
              name: tokenRecord.name || '',
              full_name: tokenRecord.name || ''
            }
          }
        });
        
        if (signUpError) {
          console.error('Sign up error:', signUpError);
          return { success: false, message: 'Failed to create account. Please try again.' };
        }
        
        // Remove used token
        const filteredTokens = tokens.filter((t: any) => t.email !== trimmedEmail);
        localStorage.setItem('mycip_pending_tokens', JSON.stringify(filteredTokens));
        
        return { success: true, message: 'Account created and signed in successfully!' };
      }

      if (error) {
        console.error('Sign in error:', error);
        return { success: false, message: 'Sign in failed. Please try again.' };
      }

      // Remove used token
      const filteredTokens = tokens.filter((t: any) => t.email !== trimmedEmail);
      localStorage.setItem('mycip_pending_tokens', JSON.stringify(filteredTokens));

      return { success: true, message: 'Successfully signed in!' };
      
    } catch (error: any) {
      console.error('Unexpected error verifying token:', error);
      return { success: false, message: 'Something went wrong. Please try again.' };
    }
  };

  // Local Storage Fallback Functions
  const getUsers = (): StoredUser[] => {
    try {
      const users = localStorage.getItem(LOCAL_STORAGE_FALLBACK.USERS_KEY);
      return users ? JSON.parse(users) : [];
    } catch {
      return [];
    }
  };

  const saveUsers = (users: StoredUser[]) => {
    localStorage.setItem(LOCAL_STORAGE_FALLBACK.USERS_KEY, JSON.stringify(users));
  };

  const getTokens = (): StoredToken[] => {
    try {
      const tokens = localStorage.getItem(LOCAL_STORAGE_FALLBACK.TOKENS_KEY);
      return tokens ? JSON.parse(tokens) : [];
    } catch {
      return [];
    }
  };

  const saveTokens = (tokens: StoredToken[]) => {
    localStorage.setItem(LOCAL_STORAGE_FALLBACK.TOKENS_KEY, JSON.stringify(tokens));
  };

  const generateToken = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const cleanExpiredTokens = () => {
    const tokens = getTokens();
    const validTokens = tokens.filter(t => t.expiresAt > Date.now());
    saveTokens(validTokens);
  };

  const sendTokenLocal = async (email: string, name?: string): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail) {
      return { success: false, message: 'Please enter a valid email address' };
    }

    const token = generateToken();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    const newToken: StoredToken = {
      email: trimmedEmail,
      token,
      expiresAt,
      attempts: 0
    };

    const tokens = getTokens();
    const updatedTokens = tokens.filter(t => t.email !== trimmedEmail);
    updatedTokens.push(newToken);
    saveTokens(updatedTokens);

    const users = getUsers();
    const existingUserIndex = users.findIndex(u => u.email === trimmedEmail);
    
    if (existingUserIndex >= 0) {
      if (name) {
        users[existingUserIndex].name = name;
      }
    } else {
      const newUser: StoredUser = {
        email: trimmedEmail,
        name: name || '',
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
    }
    saveUsers(users);

    console.log(`🔐 Login Token for ${trimmedEmail}: ${token}`);
    alert(`Demo Mode: Your login token is ${token}\n\nIn production, this would be sent to your email.`);

    return { 
      success: true, 
      message: `Login token sent to ${trimmedEmail}. Please check your email and enter the 6-digit code.` 
    };
  };

  const verifyTokenLocal = async (email: string, token: string): Promise<{ success: boolean; message: string; shouldReset?: boolean }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();
    
    if (!trimmedEmail || !trimmedToken) {
      return { success: false, message: 'Please enter both email and token' };
    }

    if (trimmedToken.length !== 6) {
      return { success: false, message: 'Token must be 6 digits' };
    }

    cleanExpiredTokens();

    const tokens = getTokens();
    const tokenRecord = tokens.find(t => t.email === trimmedEmail);

    if (!tokenRecord) {
      return { success: false, message: 'No valid token found. Please request a new one.' };
    }

    if (tokenRecord.expiresAt <= Date.now()) {
      const updatedTokens = tokens.filter(t => t.email !== trimmedEmail);
      saveTokens(updatedTokens);
      return { success: false, message: 'Token has expired. Please request a new one.' };
    }

    if (tokenRecord.attempts >= 3) {
      const updatedTokens = tokens.filter(t => t.email !== trimmedEmail);
      saveTokens(updatedTokens);
      return { success: false, message: 'Too many failed attempts. Please request a new token.' };
    }

    if (tokenRecord.token !== trimmedToken) {
      tokenRecord.attempts += 1;
      saveTokens(tokens);
      const attemptsLeft = 3 - tokenRecord.attempts;
      return { 
        success: false, 
        message: `Invalid token. ${attemptsLeft} attempts remaining.`,
        shouldReset: attemptsLeft === 0
      };
    }

    const users = getUsers();
    const userRecord = users.find(u => u.email === trimmedEmail);

    if (!userRecord) {
      return { success: false, message: 'User not found. Please try again.' };
    }

    const updatedTokens = tokens.filter(t => t.email !== trimmedEmail);
    saveTokens(updatedTokens);

    const userData: User = {
      email: userRecord.email,
      id: userRecord.id,
      name: userRecord.name
    };

    setUser(userData);
    localStorage.setItem(LOCAL_STORAGE_FALLBACK.CURRENT_USER_KEY, JSON.stringify(userData));

    return { success: true, message: 'Successfully signed in!' };
  };

  // Main API functions that choose between Supabase and local
  const sendToken = async (email: string, name?: string): Promise<{ success: boolean; message: string }> => {
    if (isSupabaseAvailable) {
      return sendTokenSupabase(email, name);
    } else {
      return sendTokenLocal(email, name);
    }
  };

  const verifyToken = async (email: string, token: string): Promise<{ success: boolean; message: string; shouldReset?: boolean }> => {
    if (isSupabaseAvailable) {
      return verifyTokenSupabase(email, token);
    } else {
      return verifyTokenLocal(email, token);
    }
  };

  const signOut = async () => {
    if (isSupabaseAvailable) {
      try {
        const { error } = await supabase.auth.signOut();
        if (error) {
          console.error('Supabase sign out error:', error);
        }
      } catch (error) {
        console.error('Error signing out from Supabase:', error);
      }
    }
    
    // Always clear local state
    setUser(null);
    localStorage.removeItem(LOCAL_STORAGE_FALLBACK.CURRENT_USER_KEY);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      sendToken,
      verifyToken,
      signOut,
      loading
    }}>
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