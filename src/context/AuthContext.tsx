import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  email: string;
  id: string;
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

// Simple local storage based auth
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

  // Initialize - check if user is logged in
  useEffect(() => {
    const currentUser = localStorage.getItem(CURRENT_USER_KEY);
    if (currentUser) {
      try {
        const userData = JSON.parse(currentUser);
        setUser(userData);
      } catch (error) {
        localStorage.removeItem(CURRENT_USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  const getUsers = (): StoredUser[] => {
    try {
      const users = localStorage.getItem(USERS_KEY);
      return users ? JSON.parse(users) : [];
    } catch {
      return [];
    }
  };

  const saveUsers = (users: StoredUser[]) => {
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
  };

  const signInWithPassword = async (email: string, password: string): Promise<{ error: Error | null }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail || !password) {
      return { error: new Error('Please enter both email and password') };
    }

    const users = getUsers();
    const user = users.find(u => u.email === trimmedEmail && u.password === password);
    
    if (!user) {
      return { error: new Error('Invalid email or password') };
    }

    const userData = { email: user.email, id: user.id };
    setUser(userData);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));
    
    return { error: null };
  };

  const signUpWithPassword = async (email: string, password: string, fullName?: string): Promise<{ error: Error | null }> => {
    const trimmedEmail = email.trim().toLowerCase();
    
    if (!trimmedEmail || !password) {
      return { error: new Error('Please enter both email and password') };
    }

    if (password.length < 6) {
      return { error: new Error('Password must be at least 6 characters long') };
    }

    const users = getUsers();
    
    // Check if user already exists
    if (users.find(u => u.email === trimmedEmail)) {
      return { error: new Error('An account with this email already exists') };
    }

    // Create new user
    const newUser: StoredUser = {
      email: trimmedEmail,
      password,
      fullName,
      id: Date.now().toString()
    };

    users.push(newUser);
    saveUsers(users);

    // Auto sign in
    const userData = { email: newUser.email, id: newUser.id };
    setUser(userData);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));

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

    const users = getUsers();
    const userIndex = users.findIndex(u => u.email === trimmedEmail);
    
    if (userIndex === -1) {
      return { error: new Error('No account found with this email address') };
    }

    // Update password
    users[userIndex].password = newPassword;
    saveUsers(users);

    return { error: null };
  };

  const signOut = async () => {
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