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

      // Store token in Supabase database
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

      // Delete any existing OTP tokens for this email
      await supabase.from('otp_tokens').delete().eq('email', trimmedEmail);

      // Insert new OTP token
      console.log('📝 Storing OTP in database:', {
        email: trimmedEmail,
        token: token,
        expires_at: expiresAt
      });

      const { error: insertError } = await supabase
        .from('otp_tokens')
        .insert({
          email: trimmedEmail,
          token,
          name: name || null,
          expires_at: expiresAt,
          attempts: 0,
          verified: false
        });

      if (insertError) {
        console.error('❌ Failed to store OTP in database:', insertError);
        console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        // Fallback to localStorage
        const tokenData = {
          email: trimmedEmail,
          token,
          name: name || '',
          expiresAt: Date.now() + (10 * 60 * 1000),
          attempts: 0
        };
        localStorage.setItem(`mycip_token_${trimmedEmail}`, JSON.stringify(tokenData));
      } else {
        console.log('✅ OTP stored successfully in database');
        // Also store in localStorage as backup
        const tokenData = {
          email: trimmedEmail,
          token,
          name: name || '',
          expiresAt: Date.now() + (10 * 60 * 1000),
          attempts: 0
        };
        localStorage.setItem(`mycip_token_${trimmedEmail}`, JSON.stringify(tokenData));
      }

      // Check if we're in production and Supabase URL is available
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Supabase environment variables missing');
        // Fall back to local auth with alert
        console.log(`🔐 Login Token for ${trimmedEmail}: ${token}`);
        alert(`Demo Mode: Your login token is ${token}\n\nIn production, this would be sent to your email.`);
        return { 
          success: true, 
          message: `Supabase not configured. Your login token is: ${token}` 
        };
      }
      
      // Send email via SendGrid Edge Function
      const edgeFunctionUrl = `${supabaseUrl}/functions/v1/send-otp-email`;
      console.log('🌐 Calling Edge Function:', edgeFunctionUrl);
      console.log('🔑 Using Supabase Key:', supabaseKey ? 'Present' : 'Missing');
      
      const response = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
          'apikey': supabaseKey,
        },
        body: JSON.stringify({
          email: trimmedEmail,
          token,
          name: name || ''
        }),
      });
      
      console.log('📡 Edge Function Response Status:', response.status);
      console.log('📡 Edge Function Response Headers:', Object.fromEntries(response.headers.entries()));
      
      // Log the raw response for debugging
      const responseText = await response.text();
      console.log('📡 Raw Response Text:', responseText);
      
      let result;
      try {
        result = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('📄 Raw response text:', responseText);
        
        // If it's a network error, fall back to showing token
        console.log('🔄 Network error, falling back to local auth');
        console.log(`🔐 Login Token for ${trimmedEmail}: ${token}`);
        alert(`Network error occurred. Your login token is: ${token}`);
        return { 
          success: true, 
          message: `Network error occurred. Your login token is: ${token}` 
        };
      }
      
      console.log('📡 Edge Function Response Body:', result);

      if (!response.ok) {
        console.error('❌ Email sending error:', result);
        
        // Always fall back to showing token if email fails
        console.log('🔄 Email failed, falling back to local auth');
        console.log(`🔐 Login Token for ${trimmedEmail}: ${token}`);
        alert(`Email service temporarily unavailable. Your login token is: ${token}`);
        return { 
          success: true, 
          message: `Email service temporarily unavailable. Your login token is: ${token}` 
        };
      }

      // Check for TMU email and provide specific guidance
      if (trimmedEmail.includes('@torontomu.ca') || trimmedEmail.includes('@ryerson.ca')) {
        return { 
          success: true, 
          message: `📧 Code sent to ${trimmedEmail}!\n\n⚠️ TMU Email Notice: Toronto Metropolitan University has strict email security. If you don't receive the email within 5 minutes:\n\n1. Check your SPAM/Junk folder\n2. Check TMU email quarantine\n3. Try using a personal email (Gmail, Yahoo, etc.)\n\nDelivery may be delayed due to university email policies.`
        };
      }
      return { 
        success: true, 
        message: `6-digit code sent to ${trimmedEmail} via SendGrid. Please check your email and enter the code.`
      };
    } catch (error: any) {
      console.error('Unexpected error sending email:', error);
      
      // In production, provide fallback
      if (import.meta.env.PROD) {
        // Generate token and show it to user as fallback
        const fallbackToken = Math.floor(100000 + Math.random() * 900000).toString();
        const tokenData = {
          email: trimmedEmail,
          token: fallbackToken,
          name: name || '',
          expiresAt: Date.now() + (10 * 60 * 1000),
          attempts: 0
        };
        localStorage.setItem(`mycip_token_${trimmedEmail}`, JSON.stringify(tokenData));
        
        console.log(`🔐 Fallback Login Token for ${trimmedEmail}: ${fallbackToken}`);
        alert(`Network error occurred. Your login token is: ${fallbackToken}`);
        return { 
          success: true, 
          message: `Network error occurred. Your login token is: ${fallbackToken}` 
        };
      }
      
      return { success: false, message: 'Failed to send verification code. Please try again.' };
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
      console.log('🔍 Verifying token for email:', trimmedEmail);
      console.log('🔍 Token to verify:', trimmedToken);

      // First, try to get OTP from Supabase
      const { data: otpRecords, error: fetchError } = await supabase
        .from('otp_tokens')
        .select('*')
        .eq('email', trimmedEmail)
        .eq('verified', false)
        .order('created_at', { ascending: false });

      console.log('📦 OTP Records from database:', otpRecords);
      console.log('📊 Number of records found:', otpRecords?.length || 0);
      console.log('❌ Fetch error:', fetchError);

      const otpRecord = otpRecords && otpRecords.length > 0 ? otpRecords[0] : null;

      if (fetchError) {
        console.error('Error fetching OTP from database:', fetchError);
        // Fallback to localStorage
        return verifyTokenLocal(email, token);
      }

      if (!otpRecord) {
        // Try localStorage fallback
        const storedTokenData = localStorage.getItem(`mycip_token_${trimmedEmail}`);
        if (storedTokenData) {
          return verifyTokenLocal(email, token);
        }
        return { success: false, message: 'No valid code found. Please request a new one.', shouldReset: true };
      }

      // Check if token expired
      if (new Date(otpRecord.expires_at) <= new Date()) {
        await supabase.from('otp_tokens').delete().eq('id', otpRecord.id);
        return { success: false, message: 'Code has expired. Please request a new one.', shouldReset: true };
      }

      // Check attempts
      if (otpRecord.attempts >= 3) {
        await supabase.from('otp_tokens').delete().eq('id', otpRecord.id);
        return { success: false, message: 'Too many failed attempts. Please request a new code.', shouldReset: true };
      }

      // Verify token
      if (otpRecord.token === trimmedToken) {
        console.log('✅ Token matches! Creating user session...');

        // Success - mark as verified and create user
        const { error: updateError } = await supabase
          .from('otp_tokens')
          .update({ verified: true })
          .eq('id', otpRecord.id);

        if (updateError) {
          console.error('Error updating OTP token:', updateError);
        }

        // Generate a UUID (fallback for browsers without crypto.randomUUID)
        const generateUUID = () => {
          if (typeof crypto !== 'undefined' && crypto.randomUUID) {
            return crypto.randomUUID();
          }
          return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
            const r = Math.random() * 16 | 0;
            const v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
        };

        const userId = generateUUID();
        console.log('🆔 Generated user ID:', userId);

        // Create or update user profile in user_profiles table
        const { error: profileError } = await supabase
          .from('user_profiles')
          .upsert({
            id: userId,
            email: trimmedEmail,
            full_name: otpRecord.name || null,
            email_verified: true,
            last_login_at: new Date().toISOString(),
            login_count: 1
          }, {
            onConflict: 'email',
            ignoreDuplicates: false
          });

        if (profileError) {
          console.error('⚠️ Error creating user profile:', profileError);
          console.error('Profile error details:', JSON.stringify(profileError, null, 2));
        } else {
          console.log('✅ User profile created/updated successfully');
        }

        // Get the user profile to set in state
        const { data: profile, error: selectError } = await supabase
          .from('user_profiles')
          .select('id, email, full_name')
          .eq('email', trimmedEmail)
          .maybeSingle();

        if (selectError) {
          console.error('Error fetching user profile:', selectError);
        }

        console.log('👤 User profile from DB:', profile);

        const userData: User = {
          email: trimmedEmail,
          id: profile?.id || userId,
          name: profile?.full_name || otpRecord.name
        };

        console.log('✅ Setting user data:', userData);
        setUser(userData);
        localStorage.setItem(LOCAL_STORAGE_FALLBACK.CURRENT_USER_KEY, JSON.stringify(userData));

        return { success: true, message: 'Successfully signed in!' };
      } else {
        console.log('❌ Token does not match. Expected:', otpRecord.token, 'Got:', trimmedToken);
        // Wrong token - increment attempts
        const newAttempts = otpRecord.attempts + 1;
        await supabase
          .from('otp_tokens')
          .update({ attempts: newAttempts })
          .eq('id', otpRecord.id);

        const attemptsLeft = 3 - newAttempts;
        return {
          success: false,
          message: `Invalid code. ${attemptsLeft} attempts remaining.`,
          shouldReset: attemptsLeft === 0
        };
      }

    } catch (error: any) {
      console.error('💥 Unexpected error verifying token:', error);
      console.error('💥 Error name:', error?.name);
      console.error('💥 Error message:', error?.message);
      console.error('💥 Error stack:', error?.stack);

      // Try localStorage fallback if Supabase fails
      try {
        const storedTokenData = localStorage.getItem(`mycip_token_${trimmedEmail}`);
        if (storedTokenData) {
          console.log('🔄 Falling back to localStorage verification');
          return verifyTokenLocal(email, token);
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }

      return {
        success: false,
        message: 'Verification failed. Please try again.'
      };
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