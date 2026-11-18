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
  logout: (customMessage?: any) => Promise<void>;
  updateProfile: (profile: CustomerProfile) => Promise<void>;
  getProfileByEmail: (email: string) => Promise<CustomerProfile | null>;
  deleteAccount: (email?: string, orderIds?: string[], phone?: string) => Promise<boolean>;
  unlockAdmin: (password: string) => Promise<boolean>;
  lockAdmin: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Admin hash for 'adam080gacem'
const ADMIN_HASH = 'e771e8530ae209875e08700b44a054ae2f1050944393a8784f69b2d3832f928b';

async function hashPw(pw: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('threadlab-admin:' + pw));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function normalizePhone(p?: string | null): string {
  if (!p) return '';
  const digits = p.replace(/\D/g, '');
  if (digits.startsWith('216') && digits.length === 11) {
    return digits.slice(3);
  }
  return digits;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<{ id: string; email?: string } | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(true);
  const [adminUnlocked, setAdminUnlocked] = useState(false);
  const { toast } = useToast();

  const userRef = React.useRef(user);
  const profileRef = React.useRef(profile);
  const adminUnlockedRef = React.useRef(adminUnlocked);
  userRef.current = user;
  profileRef.current = profile;
  adminUnlockedRef.current = adminUnlocked;

  useEffect(() => {
    // Check saved admin unlock state in session
    try {
      if (typeof window !== 'undefined' && sessionStorage.getItem('tl_admin') === 'true') {
        setAdminUnlocked(true);
      }
    } catch {}

    // Load cached profile immediately from localStorage so UI is instantly populated
    try {
      const savedUser = localStorage.getItem('tl_user');
      const savedProfile = localStorage.getItem('tl_profile');
      if (savedUser) setUser(JSON.parse(savedUser));
      if (savedProfile) setProfile(JSON.parse(savedProfile));
    } catch {}

    // Listen for account deletion broadcasts across all tabs/windows and in current window
    const handleDeletedAccount = (data: { email?: string; phone?: string; userId?: string; orderIds?: string[]; clearAll?: boolean }) => {
      if (data?.clearAll) {
        logout('All customer and order data was cleared.');
        return;
      }

      const activeEmail = (userRef.current?.email || profileRef.current?.email || '').trim().toLowerCase();
      const activeNormPhone = normalizePhone(profileRef.current?.phone);
      const activeUid = userRef.current?.id || profileRef.current?.user_id;

      const delEmail = (data?.email || '').trim().toLowerCase();
      const delNormPhone = normalizePhone(data?.phone);
      const delUid = data?.userId;

      const matchesEmail = Boolean(delEmail && activeEmail && activeEmail === delEmail);
      const matchesPhone = Boolean(delNormPhone && activeNormPhone && activeNormPhone === delNormPhone);
      const matchesUid = Boolean(delUid && activeUid && activeUid === delUid);

      if (matchesEmail || matchesPhone || matchesUid) {
        logout('Your customer account was deleted and you have been logged out.');
      }
    };

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'tl_deleted_account' && e.newValue) {
        try {
          handleDeletedAccount(JSON.parse(e.newValue));
        } catch {}
      }
    };

    const handleCustom = (e: Event) => {
      try {
        handleDeletedAccount((e as CustomEvent).detail);
      } catch {}
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorage);
      window.addEventListener('tl_deleted_account', handleCustom);
    }

    // Check local session or Supabase
    let authListener: any = null;
    if (isSupabaseConfigured && supabase) {
      const client = supabase;
      client.auth.getSession().then(async ({ data: { session } }) => {
        if (session?.user) {
          // Verify with Supabase auth server whether user still exists in auth.users
          try {
            const { data: userData, error: userError } = await client.auth.getUser();
            if (userError || !userData?.user) {
              await logout('Your customer account was deleted.');
              setIsLoading(false);
              return;
            }
          } catch {}

          setUser({ id: session.user.id, email: session.user.email });
          await fetchSupabaseProfile(session.user.id, session.user.email);
        } else {
          // No active Supabase session
          setUser(null);
          setProfile(null);
          try {
            localStorage.removeItem('tl_user');
            localStorage.removeItem('tl_profile');
          } catch {}
        }
        setIsLoading(false);
      });

      const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email });
          await fetchSupabaseProfile(session.user.id, session.user.email);
        } else {
          setUser(null);
          setProfile(null);
          try {
            localStorage.removeItem('tl_user');
            localStorage.removeItem('tl_profile');
          } catch {}
        }
      });
      authListener = data;
    } else {
      setIsLoading(false);
    }

    return () => {
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorage);
        window.removeEventListener('tl_deleted_account', handleCustom);
      }
    };
  }, []);

  const fetchSupabaseProfile = async (uid: string, userEmail?: string) => {
    // 1. Try server endpoint
    try {
      const q = new URLSearchParams();
      if (uid) q.set('userId', uid);
      if (userEmail) q.set('email', userEmail);
      const res = await fetch(`/api/profile?${q.toString()}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          setProfile(data.profile);
          localStorage.setItem('tl_profile', JSON.stringify(data.profile));
          if (data.profile.is_admin) {
            setIsAdmin(true);
          }
          return;
        } else if (data?.profile === null) {
          // Profile was deleted on server - log out customer session immediately
          await logout('Your customer account was deleted.');
          return;
        }
      }
    } catch {}

    // 2. Direct client fallback
    if (supabase) {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('user_id', uid).maybeSingle();
        if (data && !error) {
          setProfile(data);
          localStorage.setItem('tl_profile', JSON.stringify(data));
        }
        const adminCheck = await supabase.rpc('is_admin');
        if (adminCheck?.data) {
          setIsAdmin(true);
        }
      } catch {}
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
            await fetchSupabaseProfile(sessionData.user.id, sessionData.user.email);
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
        await fetchSupabaseProfile(data.user.id, data.user.email);
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

  const logout = async (customMessage?: any) => {
    if (isSupabaseConfigured && supabase) {
      await supabase.auth.signOut().catch(() => {});
    }
    const currentEmail = (userRef.current?.email || profileRef.current?.email || '').trim().toLowerCase();
    const currentNormPhone = normalizePhone(profileRef.current?.phone);
    const currentUid = userRef.current?.id || (profileRef.current as any)?.user_id;
    setUser(null);
    setProfile(null);
    try {
      localStorage.removeItem('tl_user');
      localStorage.removeItem('tl_profile');
      localStorage.removeItem('tl_checkout_info');
      if (currentEmail) {
        localStorage.removeItem(`tl_profile_${currentEmail}`);
      }

      // Purge any orders belonging to this customer from localStorage tl_orders
      const rawOrders = localStorage.getItem('tl_orders');
      if (rawOrders) {
        const parsedOrders = JSON.parse(rawOrders);
        if (Array.isArray(parsedOrders)) {
          const filteredOrders = parsedOrders.filter((o: any) => {
            if (currentUid && o.uid && o.uid === currentUid) return false;
            const oEmail = (o.customer?.email || '').trim().toLowerCase();
            const oPhone = normalizePhone(o.customer?.phone);
            if (currentEmail && oEmail && oEmail === currentEmail) return false;
            if (currentNormPhone && oPhone && oPhone === currentNormPhone) return false;
            return true;
          });
          localStorage.setItem('tl_orders', JSON.stringify(filteredOrders));
        }
      }
    } catch {}
    if (typeof customMessage === 'string' && customMessage) {
      toast(customMessage);
    } else if (customMessage !== false) {
      toast('You have logged out');
    }
  };

  const deleteAccount = async (
    emailToDelete?: string,
    orderIds?: string[],
    phoneToDelete?: string
  ): Promise<boolean> => {
    const targetEmail = (emailToDelete || user?.email || profile?.email || '').trim().toLowerCase();
    const targetPhone = (phoneToDelete || profile?.phone || '').trim();
    const uid = user?.id || '';

    // 1. Delete on server API
    try {
      const q = new URLSearchParams();
      if (targetEmail) q.set('email', targetEmail);
      if (uid) q.set('userId', uid);
      if (targetPhone) q.set('phone', targetPhone);
      if (orderIds && orderIds.length > 0) q.set('orderIds', orderIds.join(','));

      await fetch(`/api/profile?${q.toString()}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Delete account API error:', err);
    }

    // 2. Broadcast deletion across all browser windows / tabs
    try {
      const payload = {
        email: targetEmail || undefined,
        phone: targetPhone || undefined,
        orderIds: orderIds && orderIds.length > 0 ? orderIds : undefined,
        time: Date.now(),
      };
      localStorage.setItem('tl_deleted_account', JSON.stringify(payload));
      if (targetEmail) {
        localStorage.removeItem(`tl_profile_${targetEmail}`);
      }
      localStorage.removeItem('tl_user');
      localStorage.removeItem('tl_profile');
      localStorage.removeItem('tl_checkout_info');

      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('tl_deleted_account', { detail: payload }));
      }
    } catch {}

    // 3. Log out immediately and reset customer state
    await logout('Your account has been deleted.');
    return true;
  };

  const getProfileByEmail = async (email: string): Promise<CustomerProfile | null> => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) return null;

    // 1. Check local storage by email
    try {
      const cached = localStorage.getItem(`tl_profile_${cleanEmail}`);
      if (cached) {
        return JSON.parse(cached);
      }
    } catch {}

    // 2. Fetch from backend API by email
    try {
      const res = await fetch(`/api/profile?email=${encodeURIComponent(cleanEmail)}`);
      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          try {
            localStorage.setItem(`tl_profile_${cleanEmail}`, JSON.stringify(data.profile));
          } catch {}
          return data.profile;
        }
      }
    } catch {}

    return null;
  };

  const updateProfile = async (newProfile: CustomerProfile) => {
    const cleanEmail = (newProfile.email || user?.email || '').trim().toLowerCase();
    const updatedProfile: CustomerProfile = {
      ...newProfile,
      name: (newProfile.name || '').trim(),
      email: cleanEmail,
      phone: (newProfile.phone || '').trim(),
      city: (newProfile.city || '').trim(),
      address: (newProfile.address || '').trim(),
    };

    // 1. Update state and localStorage immediately (keyed by email)
    setProfile(updatedProfile);
    try {
      localStorage.setItem('tl_profile', JSON.stringify(updatedProfile));
      if (cleanEmail) {
        localStorage.setItem(`tl_profile_${cleanEmail}`, JSON.stringify(updatedProfile));
        const uid = user?.id || 'user-' + cleanEmail.replace(/[^a-z0-9]/gi, '');
        const updatedUser = { id: uid, email: cleanEmail };
        setUser(updatedUser);
        localStorage.setItem('tl_user', JSON.stringify(updatedUser));
      }
    } catch {}

    // 2. Persist to server API route /api/profile
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...updatedProfile,
          email: cleanEmail,
          userId: user?.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data?.profile) {
          setProfile(data.profile);
          localStorage.setItem('tl_profile', JSON.stringify(data.profile));
          if (cleanEmail) {
            localStorage.setItem(`tl_profile_${cleanEmail}`, JSON.stringify(data.profile));
          }
        }
      } else {
        throw new Error('API save failed');
      }
    } catch {
      // 3. Direct client fallback if API route fails
      if (isSupabaseConfigured && supabase && user) {
        try {
          await supabase.from('profiles').upsert({
            user_id: user.id,
            name: updatedProfile.name,
            email: cleanEmail,
            phone: updatedProfile.phone,
            city: updatedProfile.city,
            address: updatedProfile.address,
            updated_at: new Date().toISOString(),
          });
        } catch {}
      }
    }

    toast('Profile updated ✓');
  };

  const unlockAdmin = async (password: string): Promise<boolean> => {
    try {
      const trimmed = (password || '').trim();
      const hashed = await hashPw(trimmed);
      if (hashed === ADMIN_HASH || trimmed === 'adam080gacem') {
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
    try {
      sessionStorage.removeItem('tl_admin');
    } catch {}
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
        getProfileByEmail,
        deleteAccount,
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
