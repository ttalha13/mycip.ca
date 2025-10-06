import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';

interface User {
  email: string;
  id: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  sendToken: (email: string, name?: string) => Promise<{ success: boolean; message: string }>;
  verifyToken: (email: string, token: string) => Promise<{ success: boolean; message: string }>;
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

// Local storage keys
const USERS_KEY = 'mycip_users';
const CURRENT_USER_KEY = 'mycip_current_user';
const TOKENS_KEY = 'mycip_tokens';

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
  const navigate = useNavigate();

  // Initialize - check for existing session
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

  const getTokens = (): StoredToken[] => {
    try {
      const tokens = localStorage.getItem(TOKENS_KEY);
      return tokens ? JSON.parse(tokens) : [];
    } catch {
      return [];
    }
  };

  const saveTokens = (tokens: StoredToken[]) => {
    localStorage.setItem(TOKENS_KEY, JSON.stringify(tokens));
  };

  const generateToken = (): string => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const cleanExpiredTokens = () => {
    const tokens = getTokens();
    const validTokens = tokens.filter(t => t.expiresAt > Date.now());
    saveTokens(validTokens);
  };

  const sendToken = async (email: string, name?: string): Promise<{ success: boolean; message: string }> => {
    // Generate new token
    const token = generateToken();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes

    // Save token
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

    // Create or update user record
    const users = getUsers();
    const existingUserIndex = users.findIndex(u => u.email === trimmedEmail);
    
    if (existingUserIndex >= 0) {
      // Update existing user
      if (name) {
        users[existingUserIndex].name = name;
      }
    } else {
      // Create new user
      const newUser: StoredUser = {
        email: trimmedEmail,
        name: name || '',
        id: Date.now().toString(),
        createdAt: new Date().toISOString()
      };
      users.push(newUser);
    }
    saveUsers(users);

    // In a real app, you would send this via email service
    // For demo purposes, we'll show it in console and alert
    console.log(`🔐 Login Token for ${trimmedEmail}: ${token}`);
    
    // Show token in alert for demo (remove in production)
    alert(`Demo Mode: Your login token is ${token}\n\nIn production, this would be sent to your email.`);

    return { 
      success: true, 
      message: `Login token sent to ${trimmedEmail}. Please check your email and enter the 6-digit code.` 
    };
  };

  const verifyToken = async (email: string, token: string): Promise<{ success: boolean; message: string }> => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedToken = token.trim();
    
    if (!trimmedEmail || !trimmedToken) {
      return { success: false, message: 'Please enter both email and token' };
    }

    if (trimmedToken.length !== 6) {
      return { success: false, message: 'Token must be 6 digits' };
    }

    // Clean expired tokens
    cleanExpiredTokens();

    const tokens = getTokens();
    const tokenRecord = tokens.find(t => t.email === trimmedEmail);

    if (!tokenRecord) {
      return { success: false, message: 'No valid token found. Please request a new one.' };
    }

    if (tokenRecord.expiresAt <= Date.now()) {
      // Remove expired token
      const updatedTokens = tokens.filter(t => t.email !== trimmedEmail);
      saveTokens(updatedTokens);
      return { success: false, message: 'Token has expired. Please request a new one.' };
    }

    // Check attempts (max 3 attempts)
    if (tokenRecord.attempts >= 3) {
      // Remove token after max attempts
      const updatedTokens = tokens.filter(t => t.email !== trimmedEmail);
      saveTokens(updatedTokens);
      return { success: false, message: 'Too many failed attempts. Please request a new token.' };
    }

        shouldReset: true
    if (tokenRecord.token !== trimmedToken) {
      // Increment attempts
      tokenRecord.attempts += 1;
      saveTokens(tokens);
      const attemptsLeft = 3 - tokenRecord.attempts;
      return { 
        success: false, 
        message: `Invalid token. ${attemptsLeft} attempts remaining.` 
      };
    }

    // Token is valid - sign in user
    const users = getUsers();
    const user = users.find(u => u.email === trimmedEmail);

    if (!user) {
      return { success: false, message: 'User not found. Please try again.' };
    }

    // Remove used token
    const updatedTokens = tokens.filter(t => t.email !== trimmedEmail);
    saveTokens(updatedTokens);

    // Set user session
    const userData: User = {
      email: user.email,
      id: user.id,
      name: user.name
    };

    setUser(userData);
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(userData));

    return { success: true, message: 'Successfully signed in!' };
  };

  const signOut = async () => {
    setUser(null);
    localStorage.removeItem(CURRENT_USER_KEY);
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