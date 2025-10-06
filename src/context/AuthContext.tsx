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
      const { data, error } = await supabase.auth.signInWithOtp({
        email: trimmedEmail,
        type: 'email',
        options: {
          data: name ? { name, full_name: name } : undefined,
          shouldCreateUser: true,
        }
      });

      if (error) {
        console.error('Supabase OTP error:', error);
        
        // Handle specific error cases
        if (error.message.includes('rate limit')) {
          return { success: false, message: 'Too many requests. Please wait a moment before trying again.' };
        }
        
        if (error.message.includes('invalid email')) {
          return { success: false, message: 'Please enter a valid email address.' };
        }

        return { success: false, message: error.message || 'Failed to send verification code. Please try again.' };
      }

      return { 
        success: true, 
        message: `Verification code sent to ${trimmedEmail}. Please check your email and enter the 6-digit code.` 
      };
    } catch (error: any) {
      console.error('Unexpected error sending OTP:', error);
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
      const { data, error } = await supabase.auth.verifyOtp({
        email: trimmedEmail,
        token: trimmedToken,
        type: 'email'
      });

      if (error) {
        console.error('Supabase verify OTP error:', error);
        
        // Handle specific error cases
        if (error.message.includes('expired')) {
          return { success: false, message: 'Verification code has expired. Please request a new one.', shouldReset: true };
        }
        
        if (error.message.includes('invalid')) {
          return { success: false, message: 'Invalid verification code. Please check and try again.' };
        }

        if (error.message.includes('too many')) {
          return { success: false, message: 'Too many failed attempts. Please request a new code.', shouldReset: true };
        }

        return { success: false, message: error.message || 'Invalid verification code. Please try again.' };
      }

      if (data.user) {
        // User will be set automatically via onAuthStateChange
        return { success: true, message: 'Successfully signed in!' };
      }

      return { success: false, message: 'Verification failed. Please try again.' };
    } catch (error: any) {
      console.error('Unexpected error verifying OTP:', error);
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