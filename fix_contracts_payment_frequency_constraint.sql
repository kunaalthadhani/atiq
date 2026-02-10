-- ============================================
-- Fix Contracts Payment Frequency Constraint
-- ============================================
-- This script updates the payment_frequency check constraint
-- to match the values used in the application code
-- ============================================

-- Drop the existing constraint if it exists
ALTER TABLE contracts 
  DROP CONSTRAINT IF EXISTS contracts_payment_frequency_check;

-- Add the correct constraint with the values used in the code
ALTER TABLE contracts 
  ADD CONSTRAINT contracts_payment_frequency_check 
  CHECK (payment_frequency IN ('1_payment', '2_payment', '3_payment', '4_payment'));

-- ============================================
-- Verification Query (Run this to verify)
-- ============================================
-- SELECT conname, pg_get_constraintdef(oid) 
-- FROM pg_constraint 
-- WHERE conrelid = 'contracts'::regclass 
-- AND conname = 'contracts_payment_frequency_check';

-- ============================================
-- Migration Complete!
-- ============================================
-- The payment_frequency constraint now matches the application code values:
-- - 1_payment
-- - 2_payment
-- - 3_payment
-- - 4_payment
-- ============================================

