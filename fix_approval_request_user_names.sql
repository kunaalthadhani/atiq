-- ============================================
-- Fix Approval Request User Names
-- ============================================
-- This script helps diagnose and fix the issue where approval requests
-- show "Unknown" instead of user names
-- ============================================

-- 1. Check if users exist in the users table for all approval request creators
SELECT 
  ar.id as approval_request_id,
  ar.request_type,
  ar.requested_by,
  u.id as user_id,
  u.name as user_name,
  u.email as user_email,
  CASE 
    WHEN u.id IS NULL THEN 'USER NOT FOUND IN USERS TABLE'
    WHEN u.name IS NULL OR u.name = '' THEN 'USER HAS NO NAME'
    ELSE 'OK'
  END as status
FROM approval_requests ar
LEFT JOIN users u ON ar.requested_by = u.id
ORDER BY ar.created_at DESC
LIMIT 20;

-- 2. Check RLS policies on users table
-- Run this to see current policies:
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'users';

-- 3. If users are missing, you may need to ensure all auth users have corresponding records in users table
-- Check which auth users don't have records in users table:
SELECT 
  au.id,
  au.email,
  au.created_at
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;

-- 4. If you need to create missing user records, you can run:
-- (Replace with actual user IDs and details)
/*
INSERT INTO users (id, email, name, role)
SELECT 
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)) as name,
  COALESCE(au.raw_user_meta_data->>'role', 'user') as role
FROM auth.users au
LEFT JOIN users u ON au.id = u.id
WHERE u.id IS NULL;
*/

-- 5. Ensure RLS policy allows admins to read all users
-- Drop existing policy if it causes issues:
-- DROP POLICY IF EXISTS "Admins can view all users" ON users;

-- Create/update policy to allow admins to read all users:
CREATE POLICY IF NOT EXISTS "Admins can view all users for approvals"
  ON users FOR SELECT
  USING (
    -- Allow users to see their own record
    auth.uid() = id
    OR
    -- Allow admins to see all users
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 6. Verify the fix by checking approval requests again:
SELECT 
  ar.id,
  ar.request_type,
  u.name as requester_name,
  u.email as requester_email,
  ar.created_at
FROM approval_requests ar
LEFT JOIN users u ON ar.requested_by = u.id
WHERE ar.status = 'pending'
ORDER BY ar.created_at DESC;


