-- ============================================
-- Tenant Approval Status Database Migration
-- ============================================
-- This script adds the approval_status column to the tenants table
-- ============================================

-- Add approval_status column to tenants table
ALTER TABLE tenants 
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Set default value for existing tenants (they are already approved)
UPDATE tenants 
  SET approval_status = 'approved' 
  WHERE approval_status IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_tenants_approval_status ON tenants(approval_status);





