-- ============================================
-- Verify Approval System Setup
-- ============================================
-- Run this to verify all necessary components are in place
-- ============================================

-- 1. Check if approval_requests table exists
SELECT 
  'approval_requests table' AS check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'approval_requests'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status;

-- 2. Check request_type constraint includes all types
SELECT 
  'request_type constraint' AS check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'approval_requests'::regclass 
    AND conname = 'approval_requests_request_type_check'
    AND pg_get_constraintdef(oid) LIKE '%property_create%'
    AND pg_get_constraintdef(oid) LIKE '%unit_create%'
  ) THEN '✓ CORRECT' ELSE '✗ NEEDS UPDATE' END AS status;

-- 3. Check entity_type constraint includes all types
SELECT 
  'entity_type constraint' AS check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conrelid = 'approval_requests'::regclass 
    AND conname = 'approval_requests_entity_type_check'
    AND pg_get_constraintdef(oid) LIKE '%property%'
    AND pg_get_constraintdef(oid) LIKE '%unit%'
  ) THEN '✓ CORRECT' ELSE '✗ NEEDS UPDATE' END AS status;

-- 4. Check if units table has approval_status column
SELECT 
  'units.approval_status column' AS check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'units' AND column_name = 'approval_status'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status;

-- 5. Check if properties table has approval_status column
SELECT 
  'properties.approval_status column' AS check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'properties' AND column_name = 'approval_status'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status;

-- 6. Check if tenants table has approval_status column
SELECT 
  'tenants.approval_status column' AS check_item,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tenants' AND column_name = 'approval_status'
  ) THEN '✓ EXISTS' ELSE '✗ MISSING' END AS status;

-- 7. Show the actual constraint definitions (for manual verification)
SELECT 
  'Constraint Details' AS info,
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint 
WHERE conrelid = 'approval_requests'::regclass 
AND (conname LIKE '%request_type%' OR conname LIKE '%entity_type%');


