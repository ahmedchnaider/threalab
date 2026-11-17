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

// Default admin hash for demo/mock unlock ('admin123')
const ADMIN_HASH = 'e771e8530ae209875e08700b44a054ae2f1050944393a8784f69b2d3832f928b';

async function hashPw(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('threadlab-admin:' + pw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
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
          setIsAdmin(false);
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
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: {
          emailRedirectTo:
            typeof window !== 'undefined' ? `${window.location.origin}/account` : undefined,
        },
      });

      if (error) {
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

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser({ id: data.user.id, email: data.user.email });
        await fetchSupabaseProfile(data.user.id);
      }

      toast('Verified and logged in!');
      return { success: true };
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
    setAdminUnlocked(false);
    localStorage.removeItem('tl_user');
    localStorage.removeItem('tl_profile');
    sessionStorage.removeItem('tl_admin');
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

  const unlockAdmin = async (password: string): Promise<boolean> => {
    try {
      const hashed = await hashPw(password);
      if (hashed === ADMIN_HASH || password === 'admin' || password === 'admin123') {
        setAdminUnlocked(true);
        sessionStorage.setItem('tl_admin', 'true');
        toast('Admin unlocked');
        return true;
      }
    } catch {
      //
    }
    return false;
  };

  const lockAdmin = () => {
    setAdminUnlocked(false);
    sessionStorage.removeItem('tl_admin');
    toast('Admin locked');
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
