-- ============================================
-- Add payment_amounts column to contracts table
-- ============================================
-- This column stores individual payment amounts for each installment
-- as a JSONB array, e.g. [50000, 30000] for a 2-payment contract.
-- When present, invoices will be generated using these amounts
-- instead of splitting the total equally.
-- ============================================

ALTER TABLE contracts
ADD COLUMN IF NOT EXISTS payment_amounts JSONB DEFAULT '[]'::jsonb;

-- Add a comment for documentation
COMMENT ON COLUMN contracts.payment_amounts IS 'JSONB array of individual payment amounts per installment. Sum must equal yearly rent.';

-- ============================================
-- Verification (optional - uncomment to run)
-- ============================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'contracts' AND column_name = 'payment_amounts';
