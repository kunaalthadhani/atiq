-- SQL to allow admins to view all users for password management
-- Run this in your Supabase SQL Editor

-- Policy: Admins can view all users
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Note: Password reset emails are sent via Supabase Auth API
-- which doesn't require additional RLS policies





