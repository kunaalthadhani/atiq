-- ============================================
-- Update Approval Requests for Properties and Units
-- ============================================
-- This script updates the approval_requests table constraints to support
-- property_create and unit_create request types
-- ============================================

-- Update the request_type check constraint to include 'property_create' and 'unit_create'
ALTER TABLE approval_requests 
  DROP CONSTRAINT IF EXISTS approval_requests_request_type_check;

ALTER TABLE approval_requests 
  ADD CONSTRAINT approval_requests_request_type_check 
  CHECK (request_type IN (
    'contract_create', 
    'contract_terminate', 
    'contract_cancel', 
    'payment_create', 
    'payment_delete', 
    'tenant_create',
    'property_create',
    'unit_create'
  ));

-- Update the entity_type check constraint to include 'property' and 'unit'
ALTER TABLE approval_requests 
  DROP CONSTRAINT IF EXISTS approval_requests_entity_type_check;

ALTER TABLE approval_requests 
  ADD CONSTRAINT approval_requests_entity_type_check 
  CHECK (entity_type IN ('contract', 'payment', 'tenant', 'property', 'unit'));

-- ============================================
-- Verification Queries (Run these to verify)
-- ============================================

-- Check the constraints
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'approval_requests'::regclass 
-- AND conname LIKE '%request_type%' OR conname LIKE '%entity_type%';

-- ============================================
-- Migration Complete!
-- ============================================
-- The approval_requests table now supports:
-- - property_create requests
-- - unit_create requests
-- ============================================


