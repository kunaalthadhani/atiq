-- ============================================
-- Remove Unit Approval System from Supabase
-- ============================================
-- This script removes unit approval functionality from the database
-- Run this in your Supabase SQL editor
-- ============================================

-- Step 1: Delete all existing unit_create approval requests
DELETE FROM approval_requests 
WHERE request_type = 'unit_create' OR entity_type = 'unit';

-- Step 2: Update approval_requests table constraints to remove unit_create
-- Drop the existing request_type check constraint
ALTER TABLE approval_requests 
  DROP CONSTRAINT IF EXISTS approval_requests_request_type_check;

-- Recreate the constraint without unit_create
ALTER TABLE approval_requests 
  ADD CONSTRAINT approval_requests_request_type_check 
  CHECK (request_type IN (
    'contract_create', 
    'contract_terminate', 
    'contract_cancel', 
    'payment_create', 
    'payment_delete', 
    'tenant_create',
    'property_create'
  ));

-- Step 3: Update entity_type constraint to remove 'unit'
ALTER TABLE approval_requests 
  DROP CONSTRAINT IF EXISTS approval_requests_entity_type_check;

-- Recreate the constraint without 'unit'
ALTER TABLE approval_requests 
  ADD CONSTRAINT approval_requests_entity_type_check 
  CHECK (entity_type IN ('contract', 'payment', 'tenant', 'property'));

-- Step 4: Update all existing units to have approved status (optional cleanup)
-- This ensures all units are marked as approved
UPDATE units 
SET approval_status = 'approved' 
WHERE approval_status IS NULL OR approval_status = 'pending';

-- ============================================
-- Verification Queries (Run these to verify)
-- ============================================

-- Check that no unit_create requests remain
-- SELECT COUNT(*) as remaining_unit_requests 
-- FROM approval_requests 
-- WHERE request_type = 'unit_create' OR entity_type = 'unit';
-- Expected: 0

-- Check the constraints
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'approval_requests'::regclass 
-- AND (conname LIKE '%request_type%' OR conname LIKE '%entity_type%');

-- ============================================
-- Migration Complete!
-- ============================================
-- The approval system no longer supports:
-- - unit_create requests
-- - unit entity_type
-- 
-- All units are now created without approval requirements
-- ============================================


