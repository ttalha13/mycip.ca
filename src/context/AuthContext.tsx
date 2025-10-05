import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

interface User {
  email: string;
  id: string;
  source?: 'supabase' | 'local';
}

interface AuthContextType {
  user: User | null;
  signInWithPassword: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithPassword: (email: string, password: string, fullName?: string) => Promise<{ error: Error | null }>;
  resetPassword: (email: string, newPassword: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  signInWithPassword: async () => ({ error: null }),
  signUpWithPassword: async () => ({ error: null }),
  resetPassword: async () => ({ error: null }),
  signOut: async () => {},
  loading: true,
});

// Local storage keys
const USERS_KEY = 'mycip_users';
const CURRENT_USER_KEY = 'mycip_current_user';

interface StoredUser {
  email: string;
  password: string;
  fullName?: string;
  id: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  // Initialize - check both Supabase and local storage
  useEffect(() => {
    const initAuth = async () => {
      try {
        // First check Supabase session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!error && session?.user) {
          console.log('✅ Found existing Supabase user:', session.user.email);
          setUser({
            email: session.user.email || '',
            id: session.user.id,
            source: 'supabase'
          });
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log('⚠️ Supabase not available, checking local storage');
      }

      // If no Supabase session, check local storage
      const currentUser = localStorage.getItem(CURRENT_USER_KEY);
      if (currentUser) {
        try {
          const userData = JSON.parse(currentUser);
          console.log('✅ Found existing local user:', userData.email);
          setUser({ ...userData, source: 'local' });
        } catch (error) {
          localStorage.removeItem(CURRENT_USER_KEY);
        }
      }
      
      setLoading(false);
    };

    initAuth();

    // Listen for Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        console.log('🔄 Supabase user signed in:', session.user.email);
        setUser({
          email: session.user.email || '',
          id: session.user.id,
          source: 'supabase'
        });
      } else if (event === 'SIGNED_OUT') {
        console.log('🔄 Supabase user signed out');
        // Only clear if it was a Supabase user
        if (user?.source === 'supabase') {
          setUser(null);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const getLocalUsers = (): StoredUser[] => {
    try {
      const users = localStorage.getItem(USERS_KEY);
      return users ? JSON.parse(users) : [];
    } catch {
      return [];
    }
  };

  const saveLocalUsers = (users: StoredUser[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const signInWithPassword = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail || !password) {
      return { error: new Error('Please enter both email and password') };
    }

    // Check for temporary password reset first
    try {
      const tempPasswordData = localStorage.getItem('temp_new_password');
      if (tempPasswordData) {
        const { email: tempEmail, password: tempPassword, expiry } = JSON.parse(tempPasswordData);
        if (tempEmail === trimmedEmail && Date.now() < expiry) {
          if (password === tempPassword) {
            // Use the new password and clean up
            localStorage.removeItem('temp_new_password');
            console.log('✅ Using temporary reset password');
            
            // Create/update local user with new password
            const localUsers = getLocalUsers();
            const existingIndex = localUsers.findIndex(u => u.email === trimmedEmail);
            if (existingIndex >= 0) {
              localUsers[existingIndex].password = password;
            } else {
              localUsers.push({
                email: trimmedEmail,
                password: password,
                id: Date.now().toString()
              });
            }
            saveLocalUsers(localUsers);
            
            const userData = { 
              email: trimmedEmail, 
              id: Date.now().toString(),
              source: 'local' as const
            };
            setUser(userData);
            localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
            return { error: null };
          }
        } else if (Date.now() >= expiry) {
          // Clean up expired temp password
          localStorage.removeItem('temp_new_password');
        }
      }
    } catch (error) {
      console.log('Error checking temp password:', error);
    }

    // First try Supabase authentication
    try {
      console.log('🔄 Trying Supabase authentication for:', trimmedEmail);
      const { data, error } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password: password,
      });

      if (!error && data.user) {
        console.log('✅ Supabase authentication successful');
        const userData = { 
          email: data.user.email || '', 
          id: data.user.id,
          source: 'supabase' as const
        };
        setUser(userData);
        return { error: null };
      }
      
      if (error) {
        console.log('⚠️ Supabase auth failed:', error.message);
      }
    } catch (error) {
      console.log('⚠️ Supabase not available, trying local auth');
    }

    // If Supabase fails, try local authentication
    console.log('🔄 Trying local authentication for:', trimmedEmail);
    const localUsers = getLocalUsers();
    const localUser = localUsers.find(u => u.email === trimmedEmail && u.password === password);
    
    if (localUser) {
      console.log('✅ Local authentication successful');
      const userData = { 
        email: localUser.email, 
        id: localUser.id,
        source: 'local' as const
      };
      setUser(userData);
      localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
      return { error: null };
    }

    return { error: new Error('Invalid email or password') };
  };

  const signUpWithPassword = async (email: string, password: string, fullName?: string): Promise<{ error: Error | null }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail || !password) {
      return { error: new Error('Please enter both email and password') };
    }

    if (password.length < 6) {
      return { error: new Error('Password must be at least 6 characters long') };
    }

    // Try Supabase first
    try {
      console.log('🔄 Trying Supabase signup for:', trimmedEmail);
      const { data, error } = await supabase.auth.signUp({
        email: trimmedEmail,
        password: password,
        options: {
          data: {
            full_name: fullName
          }
        }
      });

      if (!error && data.user) {
        console.log('✅ Supabase signup successful');
        const userData = { 
          email: data.user.email || '', 
          id: data.user.id,
          source: 'supabase' as const
        };
        setUser(userData);
        return { error: null };
      }

      if (error) {
        console.log('⚠️ Supabase signup failed:', error.message);
      }
    } catch (error) {
      console.log('⚠️ Supabase not available, using local signup');
    }

    // Fallback to local storage
    console.log('🔄 Using local signup for:', trimmedEmail);
    const localUsers = getLocalUsers();
    
    // Check if user already exists locally
    if (localUsers.find(u => u.email === trimmedEmail)) {
      return { error: new Error('An account with this email already exists') };
    }

    // Create new local user
    const newUser: StoredUser = {
      email: trimmedEmail,
      password,
      fullName,
      id: Date.now().toString()
    };

    localUsers.push(newUser);
    saveLocalUsers(localUsers);

    // Auto sign in
    const userData = { 
      email: newUser.email, 
      id: newUser.id,
      source: 'local' as const
    };
    setUser(userData);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));

    console.log('✅ Local signup successful');
    return { error: null };
  };

  const resetPassword = async (email: string, newPassword: string): Promise<{ error: Error | null }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail || !newPassword) {
      return { error: new Error('Please enter both email and new password') };
    }

    if (newPassword.length < 6) {
      return { error: new Error('Password must be at least 6 characters long') };
    }

    // For local users, update password directly
    const localUsers = getLocalUsers();
    const userIndex = localUsers.findIndex(u => u.email === trimmedEmail);
    
    if (userIndex !== -1) {
      console.log('🔄 Resetting password for local user:', trimmedEmail);
      localUsers[userIndex].password = newPassword;
      saveLocalUsers(localUsers);
      console.log('✅ Local password reset successful');
      return { error: null };
    }

    // For Supabase users, we can't reset password directly
    // But we can create a local override
    console.log('🔄 Creating local password override for:', trimmedEmail);
    const newLocalUser: StoredUser = {
      email: trimmedEmail,
      password: newPassword,
      id: Date.now().toString()
    };

    localUsers.push(newLocalUser);
    saveLocalUsers(localUsers);
    
    console.log('✅ Password reset successful (local override created)');
    return { error: null };
  };

  const signOut = async () => {
    console.log('🔄 Signing out user:', user?.email);
    
    // Sign out from Supabase if it's a Supabase user
    if (user?.source === 'supabase') {
      try {
        await supabase.auth.signOut();
      } catch (error) {
        console.log('⚠️ Supabase signout failed, continuing with local signout');
      }
    }
    
    // Clear local storage
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{
      user,
      signInWithPassword,
      signUpWithPassword,
      resetPassword,
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