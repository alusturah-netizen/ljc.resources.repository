/*
  # Auth System: Profiles Table + Resources Access Level

  ## Summary
  Sets up the full authentication infrastructure for ScholarVault:

  1. New Tables
    - `profiles`
      - `id` (uuid, FK to auth.users, primary key)
      - `email` (text, unique)
      - `role` (text, either 'student' or 'teacher')
      - `created_at` (timestamp)

  2. Modified Tables
    - `resources`
      - Added `access_level` (text, default 'student') — 'student' means visible to all authenticated users; 'teacher' means teachers only

  3. Security
    - RLS enabled on `profiles`
    - Users can only read/update their own profile
    - Service role can insert profiles (for trigger-based creation)

  4. Automation
    - Trigger on auth.users insert to auto-create a profile with correct role
    - Role detection: email matching pattern \d{4}@loyolajesuit\.org → student, else → teacher

  5. Resources RLS
    - Students can only select resources where access_level = 'student'
    - Teachers can select all resources
*/

-- Profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE NOT NULL,
  role text NOT NULL DEFAULT 'student' CHECK (role IN ('student', 'teacher')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Service role can insert profiles"
  ON profiles FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Function to determine role from email
CREATE OR REPLACE FUNCTION get_role_from_email(email text)
RETURNS text AS $$
BEGIN
  -- Pattern: ends with 4 digits before @loyolajesuit.org → student
  IF email ~* '^[a-z]+[0-9]{4}@loyolajesuit\.org$' THEN
    RETURN 'student';
  ELSE
    RETURN 'teacher';
  END IF;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger function to auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (
    NEW.id,
    NEW.email,
    get_role_from_email(NEW.email)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Add access_level to resources if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'resources' AND column_name = 'access_level'
  ) THEN
    ALTER TABLE resources ADD COLUMN access_level text NOT NULL DEFAULT 'student' CHECK (access_level IN ('student', 'teacher'));
  END IF;
END $$;

-- Drop old permissive resources policies and replace with role-aware ones
DROP POLICY IF EXISTS "Anyone can view resources" ON resources;
DROP POLICY IF EXISTS "Public can view resources" ON resources;
DROP POLICY IF EXISTS "resources_select_policy" ON resources;

-- Students see only student-level resources; teachers see all
CREATE POLICY "Students see student resources"
  ON resources FOR SELECT
  TO authenticated
  USING (
    access_level = 'student'
    OR
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );
