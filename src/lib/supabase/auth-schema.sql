-- Nammos Authentication Schema
-- Run this in Supabase SQL Editor

-- 1. Create user_profiles table
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'sales')) DEFAULT 'sales',
  avatar_url TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS on user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 3. User profiles policies
-- Users can view all profiles (for displaying names in UI)
CREATE POLICY "Users can view all profiles"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id);

-- Only admins can insert new profiles
CREATE POLICY "Admins can insert profiles"
  ON user_profiles FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Only admins can delete profiles
CREATE POLICY "Admins can delete profiles"
  ON user_profiles FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 4. Add created_by to quotations
ALTER TABLE quotations
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 5. Enable RLS on quotations (if not already enabled)
ALTER TABLE quotations ENABLE ROW LEVEL SECURITY;

-- 6. Quotation policies
-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view quotations" ON quotations;
DROP POLICY IF EXISTS "Users can insert quotations" ON quotations;
DROP POLICY IF EXISTS "Users can update quotations" ON quotations;
DROP POLICY IF EXISTS "Users can delete quotations" ON quotations;

-- Sales can only see their own quotations, managers/admins see all
CREATE POLICY "Users can view quotations"
  ON quotations FOR SELECT
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- All authenticated users can create quotations
CREATE POLICY "Users can insert quotations"
  ON quotations FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Sales can only update their own, managers/admins can update all
CREATE POLICY "Users can update quotations"
  ON quotations FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'manager')
    )
  );

-- Only admins can delete quotations
CREATE POLICY "Admins can delete quotations"
  ON quotations FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 7. Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'sales')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Trigger to auto-create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 9. Enable RLS on related tables
ALTER TABLE quotation_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotations ENABLE ROW LEVEL SECURITY;

-- Quotation items follow parent quotation permissions
CREATE POLICY "Users can view quotation_items"
  ON quotation_items FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_id
      AND (
        q.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can insert quotation_items"
  ON quotation_items FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update quotation_items"
  ON quotation_items FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_id
      AND (
        q.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND role IN ('admin', 'manager')
        )
      )
    )
  );

CREATE POLICY "Users can delete quotation_items"
  ON quotation_items FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM quotations q
      WHERE q.id = quotation_id
      AND (
        q.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM user_profiles
          WHERE id = auth.uid() AND role = 'admin'
        )
      )
    )
  );

-- Annotations follow quotation_items permissions
CREATE POLICY "Users can view annotations"
  ON annotations FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can insert annotations"
  ON annotations FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update annotations"
  ON annotations FOR UPDATE
  TO authenticated
  USING (true);

CREATE POLICY "Users can delete annotations"
  ON annotations FOR DELETE
  TO authenticated
  USING (true);

-- 10. Products and Materials are viewable by all authenticated users
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE annotatable_parts ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;

-- Products policies
CREATE POLICY "Authenticated users can view products"
  ON products FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage products"
  ON products FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Materials policies
CREATE POLICY "Authenticated users can view materials"
  ON materials FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage materials"
  ON materials FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Annotatable parts policies
CREATE POLICY "Authenticated users can view parts"
  ON annotatable_parts FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage parts"
  ON annotatable_parts FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM user_profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Clients policies
CREATE POLICY "Authenticated users can view clients"
  ON clients FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can manage clients"
  ON clients FOR ALL TO authenticated USING (true);

-- 11. Create initial admin user (run after first signup)
-- UPDATE user_profiles SET role = 'admin' WHERE email = 'your-admin@email.com';
