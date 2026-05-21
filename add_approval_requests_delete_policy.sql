-- Add RLS policy allowing admins to DELETE approval requests
-- Run this in Supabase SQL Editor on the new project

DROP POLICY IF EXISTS "Admins can delete approval requests" ON approval_requests;

CREATE POLICY "Admins can delete approval requests"
  ON approval_requests FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND TRIM(users.role) = 'admin'
    )
  );

-- Verify the policy was created
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'approval_requests'
ORDER BY policyname;
