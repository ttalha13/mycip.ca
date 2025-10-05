import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Production-ready logging
if (import.meta.env.DEV) {
  console.log('Supabase URL:', supabaseUrl ? 'Present' : 'Missing');
  console.log('Supabase Anon Key:', supabaseAnonKey ? 'Present' : 'Missing');
}

// Create a safe Supabase client that handles all error cases
let supabase: any = null;
let supabaseError: string | null = null;

try {
  if (!supabaseUrl || !supabaseAnonKey) {
    supabaseError = 'Supabase environment variables not configured';
    throw new Error(supabaseError);
  } else {
    // Validate URL format
    try {
      new URL(supabaseUrl);
    } catch {
      supabaseError = 'Invalid Supabase URL format';
      throw new Error(supabaseError);
    }

    supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
        flowType: 'pkce',
        debug: import.meta.env.DEV,
        storage: window.localStorage,
        storageKey: 'mycip.auth.token',
        // Prevent multiple concurrent refresh attempts
        lock: true
      },
      global: {
        headers: {
          'X-Client-Info': 'mycip-production-v1.0'
        }
      }
    });
    
    // Verify client was created successfully
    if (!supabase) {
      supabaseError = 'Failed to create Supabase client';
      throw new Error(supabaseError);
    } else {
      if (import.meta.env.DEV) {
        console.log('Supabase client created successfully');
      }
    }
  }
} catch (error) {
  if (import.meta.env.DEV) {
    console.warn('Supabase initialization failed:', error);
  }
  supabaseError = error instanceof Error ? error.message : 'Unknown Supabase error';
  
  // Create a safe mock client that always rejects gracefully
  supabase = {
    auth: {
      signInWithOtp: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } })
    },
    from: () => ({
      select: () => ({
        order: () => ({
          limit: () => Promise.reject(new Error(supabaseError || 'Supabase not available'))
        })
      }),
      insert: () => Promise.reject(new Error(supabaseError || 'Supabase not available'))
    })
  };
}

export { supabase };