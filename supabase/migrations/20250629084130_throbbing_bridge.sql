/*
  # Create Storage Buckets

  1. New Storage Buckets
    - `kyc-documents` - For storing KYC verification documents
    - `profile-images` - For storing user profile images
    - `emergency-documents` - For storing emergency case supporting documents

  2. Security
    - Enable RLS on all buckets
    - Add policies for authenticated users to access their own files
    - Add admin policies for managing all files
*/

-- Create KYC Documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Create Profile Images bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('profile-images', 'profile-images', true)
ON CONFLICT (id) DO NOTHING;

-- Create Emergency Documents bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('emergency-documents', 'emergency-documents', false)
ON CONFLICT (id) DO NOTHING;

-- Enable RLS on all buckets
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policy for users to access their own KYC documents
CREATE POLICY "Users can upload their own KYC documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can access their own KYC documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own KYC documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own KYC documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'kyc-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for users to access their own profile images
CREATE POLICY "Users can upload their own profile images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can access their own profile images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own profile images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own profile images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'profile-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for users to access their own emergency documents
CREATE POLICY "Users can upload their own emergency documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'emergency-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can access their own emergency documents"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'emergency-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own emergency documents"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'emergency-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own emergency documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'emergency-documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Create policy for admins to access all files
CREATE POLICY "Admins can access all files"
ON storage.objects FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid() AND users.role = 'admin'
  )
);

-- Create policy for public access to public profile images
CREATE POLICY "Public access to profile images"
ON storage.objects FOR SELECT TO anon
USING (
  bucket_id = 'profile-images'
);

-- Create policy for NGOs to access emergency documents for their assigned cases
CREATE POLICY "NGOs can access emergency documents for assigned cases"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'emergency-documents' AND
  EXISTS (
    SELECT 1 FROM public.emergency_cases ec
    JOIN public.ngos n ON ec.assigned_ngo_id = n.id
    WHERE n.user_id = auth.uid() AND
    (storage.foldername(name))[1] = ec.user_id::text
  )
);