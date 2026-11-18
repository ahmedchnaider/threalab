'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { CustomerProfile } from '@/lib/types';
import { supabase, isSupabaseConfigured } from '@/lib/supabase';
import { useToast } from './ToastContext';

interface AuthContextType {
  user: { id: string; email?: string } | null;
  profile: CustomerProfile | null;
  isLoading: boolean;
  isAdmin: boolean;
  adminUnlocked: boolean;
  login: (email: string) => Promise<{ success: boolean; error?: string; requiresOtp?: boolean }>;
  verifyOtp: (email: string, token: string) => Promise<{ success: boolean; error?: string }>;
  signup: (data: CustomerProfile) => Promise<{ success: boolean; error?: string; requiresOtp?: boolean }>;
  logout: () => Promise<void>;
  updateProfile: (profile: CustomerProfile) => Promise<void>;
  unlockAdmin: (password: string) => Promise<boolean>;
  lockAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    // Check local session or Supabase
    if (isSupabaseConfigured && supabase) {
      supabase.auth.getSession().then(({ data: { session } }) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });
          fetchSupabaseProfile(session.user.id);
        }
        setIsLoading(false);
      });

      const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });
          fetchSupabaseProfile(session.user.id);
        } else {
          setUser(null);
          setProfile(null);
        }
      });

      return () => {
        authListener.subscription.unsubscribe();
      };
    } else {
      // Local demo persistence
      try {
        const savedUser = localStorage.getItem('tl_user');
        const savedProfile = localStorage.getItem('tl_profile');
        const savedAdmin = sessionStorage.getItem('tl_admin') === 'true';
        if (savedUser && savedProfile) {
          setUser(JSON.parse(savedUser));
          setProfile(JSON.parse(savedProfile));
        }
        setAdminUnlocked(savedAdmin);
        setIsAdmin(true); // Enable admin tab visibility in mock mode
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }
  }, []);

  const fetchSupabaseProfile = async (uid: string) => {
    if (!supabase) return;
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle();
      if (data && !error) {
        setProfile(data);
      }
      const adminCheck = await supabase.rpc('is_admin');
      if (adminCheck?.data) {
        setIsAdmin(true);
      }
    } catch {
      // fallback
    }
  };

  /**
   * Passwordless login via Email OTP / Magic Link or Instant Local Login
   */
  const login = async (
    email: string
  ): Promise<{ success: boolean; error?: string; requiresOtp?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      // 1. Primary path: Server-side passwordless login (bypasses Supabase free SMTP rate limit completely)
      try {
        const res = await fetch('/api/auth/passwordless', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const data = await res.json();

        if (data?.success && data?.token_hash) {
          const { data: sessionData, error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: data.token_hash,
            type: data.verification_type || 'magiclink',
          });

          if (!verifyErr && sessionData?.user) {
            setUser({ id: sessionData.user.id, email: sessionData.user.email });
            await fetchSupabaseProfile(sessionData.user.id);
            toast('Logged in successfully!');
            return { success: true, requiresOtp: false };
          }
        }
      } catch {
        // Fallback to client-side signInWithOtp if server call fails
      }

      // 2. Client-side fallback if needed
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit') || (error as any).status === 429) {
          return {
            success: false,
            error:
              'Supabase email rate limit exceeded. Please wait a moment or click instant login below.',
          };
        }
        return { success: false, error: error.message };
      }

      toast('Sign-in code / link sent to your email!');
      return { success: true, requiresOtp: true };
    }

    // Mock/Local Instant Passwordless Login
    const mockUser = { id: 'user-' + cleanEmail.replace(/[^a-z0-9]/gi, ''), email: cleanEmail };
    const mockProfile: CustomerProfile = profile || {
      name: cleanEmail.split('@')[0],
      email: cleanEmail,
      phone: '+216 20 000 000',
      city: 'Tunis',
      address: 'Avenue Habib Bourguiba',
    };
    setUser(mockUser);
    setProfile(mockProfile);
    localStorage.setItem('tl_user', JSON.stringify(mockUser));
    localStorage.setItem('tl_profile', JSON.stringify(mockProfile));
    toast('Logged in as ' + mockProfile.name);
    return { success: true, requiresOtp: false };
  };

  /**
   * Verify 6-digit OTP code sent to user email
   */
  const verifyOtp = async (
    email: string,
    token: string
  ): Promise<{ success: boolean; error?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      const { data, error } = await supabase.auth.verifyOtp({
        email: cleanEmail,
        token: token.trim(),
        type: 'email',
      });

      if (!error && data?.user) {
        setUser({ id: data.user.id, email: data.user.email });
        await fetchSupabaseProfile(data.user.id);
        toast('Verified and logged in!');
        return { success: true };
      }

      // If OTP failed or rate-limited, attempt instant login fallback
      try {
        const res = await fetch('/api/auth/passwordless', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail }),
        });
        const resData = await res.json();
        if (resData?.success && resData?.token_hash) {
          const { data: sessionData, error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: resData.token_hash,
            type: resData.verification_type || 'magiclink',
          });
          if (!verifyErr && sessionData?.user) {
            setUser({ id: sessionData.user.id, email: sessionData.user.email });
            await fetchSupabaseProfile(sessionData.user.id);
            toast('Verified and logged in!');
            return { success: true };
          }
        }
      } catch {}

      return { success: false, error: error?.message || 'Invalid or expired code.' };
    }

    // Mock verify
    return login(cleanEmail);
  };

  /**
   * Passwordless signup (creates profile without password)
   */
  const signup = async (
    data: CustomerProfile
  ): Promise<{ success: boolean; error?: string; requiresOtp?: boolean }> => {
    const cleanEmail = data.email.trim().toLowerCase();

    if (isSupabaseConfigured && supabase) {
      // 1. Primary path: Server-side passwordless signup (bypasses Supabase free SMTP rate limit)
      try {
        const res = await fetch('/api/auth/passwordless', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data),
        });
        const resData = await res.json();

        if (resData?.success && resData?.token_hash) {
          const { data: sessionData, error: verifyErr } = await supabase.auth.verifyOtp({
            token_hash: resData.token_hash,
            type: resData.verification_type || 'signup',
          });

          if (!verifyErr && sessionData?.user) {
            setUser({ id: sessionData.user.id, email: sessionData.user.email });
            setProfile(data);
            await fetchSupabaseProfile(sessionData.user.id);
            toast('Account created and logged in!');
            return { success: true, requiresOtp: false };
          }
        }
      } catch {
        // Fallback
      }

      // 2. Client-side fallback
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          data: {
            name: data.name,
            phone: data.phone,
            city: data.city,
            address: data.address,
          },
          emailRedirectTo:
            typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined,
        },
      });

      if (error) {
        if (error.message.toLowerCase().includes('rate limit') || (error as any).status === 429) {
          return {
            success: false,
            error:
              'Supabase email rate limit exceeded. Please wait a moment or click instant login below.',
          };
        }
        return { success: false, error: error.message };
      }

      toast('Confirmation link / code sent to your email!');
      return { success: true, requiresOtp: true };
    }

    // Mock Signup
    const mockUser = { id: 'user-' + Date.now(), email: cleanEmail };
    setUser(mockUser);
    setProfile(data);
    localStorage.setItem('tl_user', JSON.stringify(mockUser));
    localStorage.setItem('tl_profile', JSON.stringify(data));
    toast('Account created successfully!');
    return { success: true, requiresOtp: false };
  };

  const logout = async () => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut();
    }
    setUser(null);
    setProfile(null);
    localStorage.removeItem('tl_user');
    localStorage.removeItem('tl_profile');
    toast('You have logged out');
  };

  const updateProfile = async (newProfile: CustomerProfile) => {
    setProfile(newProfile);
    if (isSupabaseConfigured && supabase && user) {
      await supabase.from('profiles').upsert({
        user_id: user.id,
        ...newProfile,
      });
    } else {
      localStorage.setItem('tl_profile', JSON.stringify(newProfile));
    }
    toast('Profile updated ✓');
  };

  const unlockAdmin = async (_password?: string): Promise<boolean> => {
    setAdminUnlocked(true);
    return true;
  };

  const lockAdmin = () => {
    // Secondary admin lock disabled
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        isLoading,
        isAdmin,
        adminUnlocked,
        login,
        verifyOtp,
        signup,
        logout,
        updateProfile,
        unlockAdmin,
        lockAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
