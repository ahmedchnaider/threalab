-- ==============================================================================
-- THREADLAB SUPABASE DATABASE SCHEMA & RLS POLICIES (CASCADE & RE-RUN SAFE)
-- ==============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CUSTOMER PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  city TEXT,
  address TEXT,
  last_order_at BIGINT DEFAULT 0,
  is_admin BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure columns exist if table was created previously
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS last_order_at BIGINT DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 3. PRODUCTS CATALOG TABLE
CREATE TABLE IF NOT EXISTS public.products (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  sort INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS sort INTEGER DEFAULT 0;
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS data JSONB;

-- 4. DESIGNS LIBRARY TABLE
CREATE TABLE IF NOT EXISTS public.designs (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.designs ADD COLUMN IF NOT EXISTS data JSONB;

-- 5. STORE SETTINGS TABLE
CREATE TABLE IF NOT EXISTS public.settings (
  id INTEGER PRIMARY KEY DEFAULT 1,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.orders (
  id TEXT PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'new',
  created_at BIGINT NOT NULL,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new';
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS data JSONB;

-- 7. ORDER ITEMS TABLE (DESIGNS & MOCKUPS)
CREATE TABLE IF NOT EXISTS public.order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ==============================================================================
-- 8. DROP EXISTING FUNCTIONS (WITH CASCADE TO CLEAR OLD DEPENDENT POLICIES)
-- ==============================================================================

DROP FUNCTION IF EXISTS public.cancel_order(text) CASCADE;
DROP FUNCTION IF EXISTS public.cancel_order(oid text) CASCADE;
DROP FUNCTION IF EXISTS public.is_admin() CASCADE;
DROP FUNCTION IF EXISTS public.admin_delete_user(uuid) CASCADE;

-- Check if current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND is_admin = TRUE
  );
END;
$$;

-- Securely cancel an order if it belongs to user and is still 'new'
CREATE OR REPLACE FUNCTION public.cancel_order(oid TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  order_owner UUID;
  order_status TEXT;
BEGIN
  SELECT user_id, status INTO order_owner, order_status
  FROM public.orders
  WHERE id = oid;

  IF order_owner IS NULL OR (order_owner != auth.uid() AND NOT public.is_admin()) THEN
    RAISE EXCEPTION 'Not authorized to cancel this order';
  END IF;

  IF order_status != 'new' THEN
    RAISE EXCEPTION 'Orders already in production cannot be cancelled online';
  END IF;

  UPDATE public.orders
  SET status = 'cancelled',
      data = jsonb_set(data, '{cancelledBy}', '"customer"')
  WHERE id = oid;

  RETURN TRUE;
END;
$$;

-- Admin function to delete a user profile and related records
CREATE OR REPLACE FUNCTION public.admin_delete_user(uid UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  DELETE FROM public.profiles WHERE user_id = uid;
  DELETE FROM public.orders WHERE user_id = uid;
  DELETE FROM public.order_items WHERE user_id = uid;
  DELETE FROM auth.users WHERE id = uid;

  RETURN TRUE;
END;
$$;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.designs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

-- Clean legacy policies from prior migrations
DROP POLICY IF EXISTS "settings admin write" ON public.settings;
DROP POLICY IF EXISTS "products admin write" ON public.products;
DROP POLICY IF EXISTS "designs admin write" ON public.designs;
DROP POLICY IF EXISTS "profiles own read" ON public.profiles;
DROP POLICY IF EXISTS "profiles own update" ON public.profiles;
DROP POLICY IF EXISTS "profiles admin delete" ON public.profiles;
DROP POLICY IF EXISTS "orders read" ON public.orders;
DROP POLICY IF EXISTS "orders admin update" ON public.orders;
DROP POLICY IF EXISTS "orders admin delete" ON public.orders;
DROP POLICY IF EXISTS "items read" ON public.order_items;
DROP POLICY IF EXISTS "items admin delete" ON public.order_items;

DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;

DROP POLICY IF EXISTS "Anyone can view products" ON public.products;
DROP POLICY IF EXISTS "Admins can insert products" ON public.products;
DROP POLICY IF EXISTS "Admins can update products" ON public.products;
DROP POLICY IF EXISTS "Admins can delete products" ON public.products;

DROP POLICY IF EXISTS "Anyone can view designs" ON public.designs;
DROP POLICY IF EXISTS "Admins can insert designs" ON public.designs;
DROP POLICY IF EXISTS "Admins can update designs" ON public.designs;
DROP POLICY IF EXISTS "Admins can delete designs" ON public.designs;

DROP POLICY IF EXISTS "Anyone can view settings" ON public.settings;
DROP POLICY IF EXISTS "Admins can update settings" ON public.settings;

DROP POLICY IF EXISTS "Users and admins can view orders" ON public.orders;
DROP POLICY IF EXISTS "Anyone can insert order" ON public.orders;
DROP POLICY IF EXISTS "Admins can update orders" ON public.orders;
DROP POLICY IF EXISTS "Admins can delete orders" ON public.orders;

DROP POLICY IF EXISTS "Users and admins can view order items" ON public.order_items;
DROP POLICY IF EXISTS "Anyone can insert order items" ON public.order_items;
DROP POLICY IF EXISTS "Admins can delete order items" ON public.order_items;

-- Recreate Profiles Policies
CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = user_id OR public.is_admin());

-- Recreate Products Policies
CREATE POLICY "Anyone can view products" ON public.products
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert products" ON public.products
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update products" ON public.products
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete products" ON public.products
  FOR DELETE USING (public.is_admin());

-- Recreate Designs Policies
CREATE POLICY "Anyone can view designs" ON public.designs
  FOR SELECT USING (true);

CREATE POLICY "Admins can insert designs" ON public.designs
  FOR INSERT WITH CHECK (public.is_admin());

CREATE POLICY "Admins can update designs" ON public.designs
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete designs" ON public.designs
  FOR DELETE USING (public.is_admin());

-- Recreate Settings Policies
CREATE POLICY "Anyone can view settings" ON public.settings
  FOR SELECT USING (true);

CREATE POLICY "Admins can update settings" ON public.settings
  FOR ALL USING (public.is_admin());

-- Recreate Orders Policies
CREATE POLICY "Users and admins can view orders" ON public.orders
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Anyone can insert order" ON public.orders
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can update orders" ON public.orders
  FOR UPDATE USING (public.is_admin());

CREATE POLICY "Admins can delete orders" ON public.orders
  FOR DELETE USING (public.is_admin());

-- Recreate Order Items Policies
CREATE POLICY "Users and admins can view order items" ON public.order_items
  FOR SELECT USING (auth.uid() = user_id OR public.is_admin());

CREATE POLICY "Anyone can insert order items" ON public.order_items
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can delete order items" ON public.order_items
  FOR DELETE USING (public.is_admin());

-- ==============================================================================
-- 10. STORAGE BUCKETS & POLICIES
-- ==============================================================================

-- Create public 'media' bucket for product photos and designs
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Create private 'orders' bucket for mockups and print files
INSERT INTO storage.buckets (id, name, public)
VALUES ('orders', 'orders', false)
ON CONFLICT (id) DO UPDATE SET public = false;

-- Clean legacy storage policies
DROP POLICY IF EXISTS "media admin insert" ON storage.objects;
DROP POLICY IF EXISTS "media admin update" ON storage.objects;
DROP POLICY IF EXISTS "media admin delete" ON storage.objects;
DROP POLICY IF EXISTS "orders files read" ON storage.objects;
DROP POLICY IF EXISTS "orders files admin delete" ON storage.objects;
DROP POLICY IF EXISTS "Public media access" ON storage.objects;
DROP POLICY IF EXISTS "Admin media upload" ON storage.objects;
DROP POLICY IF EXISTS "Order mockups upload" ON storage.objects;
DROP POLICY IF EXISTS "Order mockups access" ON storage.objects;

-- Recreate Storage policies
CREATE POLICY "Public media access" ON storage.objects
  FOR SELECT USING (bucket_id = 'media');

CREATE POLICY "Admin media upload" ON storage.objects
  FOR ALL USING (bucket_id = 'media' AND (public.is_admin() OR auth.role() = 'authenticated'));

CREATE POLICY "Order mockups upload" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'orders');

CREATE POLICY "Order mockups access" ON storage.objects
  FOR SELECT USING (bucket_id = 'orders' AND (auth.uid()::text = (storage.foldername(name))[1] OR public.is_admin()));

-- ==============================================================================
-- 11. INITIAL SEED DATA
-- ==============================================================================

INSERT INTO public.settings (id, data)
VALUES (1, '{"name": "THREADLAB", "currency": "TND", "tagline": "Pick a piece, drop in your artwork or words, and we print it just for you."}'::jsonb)
ON CONFLICT (id) DO NOTHING;
