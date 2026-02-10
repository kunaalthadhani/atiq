-- ============================================
-- Approval System Database Migration
-- ============================================
-- This script creates the approval_requests table and sets up
-- Row Level Security policies for the approval system.
-- ============================================

-- Create approval_requests table
CREATE TABLE IF NOT EXISTS approval_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_type TEXT NOT NULL CHECK (request_type IN ('contract_create', 'contract_terminate', 'contract_cancel', 'payment_create', 'payment_delete')),
  requested_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  entity_type TEXT NOT NULL CHECK (entity_type IN ('contract', 'payment')),
  entity_id UUID, -- ID of the contract/payment after creation
  request_data JSONB NOT NULL, -- Stores the full data for the request
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  approved_at TIMESTAMP WITH TIME ZONE
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_approval_requests_status ON approval_requests(status);
CREATE INDEX IF NOT EXISTS idx_approval_requests_type ON approval_requests(request_type);
CREATE INDEX IF NOT EXISTS idx_approval_requests_requested_by ON approval_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_approval_requests_created_at ON approval_requests(created_at DESC);

-- Create updated_at trigger function (if it doesn't exist)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_approval_requests_updated_at ON approval_requests;
CREATE TRIGGER update_approval_requests_updated_at
  BEFORE UPDATE ON approval_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security
ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for re-running the script)
DROP POLICY IF EXISTS "Users can view own approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Admins can view all approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Admins can update approval requests" ON approval_requests;
DROP POLICY IF EXISTS "Users can create approval requests" ON approval_requests;

-- Policy: Users can view their own requests
CREATE POLICY "Users can view own approval requests"
  ON approval_requests FOR SELECT
  USING (auth.uid() = requested_by);

-- Policy: Admins can view all requests
CREATE POLICY "Admins can view all approval requests"
  ON approval_requests FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Policy: Users can create approval requests
CREATE POLICY "Users can create approval requests"
  ON approval_requests FOR INSERT
  WITH CHECK (auth.uid() = requested_by);

-- Policy: Admins can update approval requests
CREATE POLICY "Admins can update approval requests"
  ON approval_requests FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'admin'
    )
  );

-- Add comments for documentation
COMMENT ON TABLE approval_requests IS 'Stores approval requests for contracts and payments that require admin approval';
COMMENT ON COLUMN approval_requests.request_type IS 'Type of request: contract_create, contract_terminate, contract_cancel, payment_create';
COMMENT ON COLUMN approval_requests.status IS 'Current status: pending, approved, rejected';
COMMENT ON COLUMN approval_requests.entity_type IS 'Type of entity: contract or payment';
COMMENT ON COLUMN approval_requests.entity_id IS 'ID of the created entity after approval';
COMMENT ON COLUMN approval_requests.request_data IS 'JSONB field storing the full request data';

-- ============================================
-- Verification Queries (Optional - run these to verify)
-- ============================================

-- Check if table was created
-- SELECT table_name, column_name, data_type 
-- FROM information_schema.columns 
-- WHERE table_name = 'approval_requests';

-- Check RLS policies
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
-- FROM pg_policies 
-- WHERE tablename = 'approval_requests';

-- ============================================
-- Migration Complete!
-- ============================================
-- The approval system is now ready to use.
-- Non-admin users will need approval for:
-- - Creating contracts
-- - Creating payments
-- - Terminating contracts
-- ============================================

