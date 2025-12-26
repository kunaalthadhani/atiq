-- ============================================
-- Tenant Approval System Database Migration
-- ============================================
-- This script updates the approval_requests table to support tenant creation approvals
-- ============================================

-- Update the request_type check constraint to include 'tenant_create'
ALTER TABLE approval_requests 
  DROP CONSTRAINT IF EXISTS approval_requests_request_type_check;

ALTER TABLE approval_requests 
  ADD CONSTRAINT approval_requests_request_type_check 
  CHECK (request_type IN ('contract_create', 'contract_terminate', 'contract_cancel', 'payment_create', 'payment_delete', 'tenant_create'));

-- Update the entity_type check constraint to include 'tenant'
ALTER TABLE approval_requests 
  DROP CONSTRAINT IF EXISTS approval_requests_entity_type_check;

ALTER TABLE approval_requests 
  ADD CONSTRAINT approval_requests_entity_type_check 
  CHECK (entity_type IN ('contract', 'payment', 'tenant'));

