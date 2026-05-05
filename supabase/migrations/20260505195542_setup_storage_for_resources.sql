/*
  # Setup Storage for Resource Uploads

  ## Summary
  Creates a public storage bucket for teachers to upload resource files.

  1. New Storage Bucket
    - `resources` bucket for storing PDF, DOCX, and other files
    - Public bucket so users can download files via public URLs

  2. Security
    - RLS policies on storage.objects for the resources bucket
    - Only authenticated teachers can upload
    - All authenticated users can read/download
*/

INSERT INTO storage.buckets (id, name, public)
VALUES ('resources', 'resources', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated teachers to upload to resources bucket
CREATE POLICY "Teachers can upload resources"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'resources'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );

-- Allow authenticated users to download resources
CREATE POLICY "Users can download resources"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'resources');

-- Allow teachers to delete their own resources
CREATE POLICY "Teachers can delete resources"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'resources'
    AND (SELECT role FROM profiles WHERE id = auth.uid()) = 'teacher'
  );
