-- ============================================
-- Add Attachments Column to Contracts Table
-- ============================================
-- This script adds the attachments column to the contracts table
-- Run this in your Supabase SQL editor when you're ready to use attachments
-- ============================================

-- Add attachments column as TEXT array (stores file URLs or base64 strings)
ALTER TABLE contracts 
  ADD COLUMN IF NOT EXISTS attachments TEXT[] DEFAULT '{}';

-- Add comment for documentation
COMMENT ON COLUMN contracts.attachments IS 'Array of file URLs or base64 strings for contract attachments';

-- ============================================
-- Verification Query (Run this to verify)
-- ============================================
-- SELECT column_name, data_type, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'contracts' AND column_name = 'attachments';

-- ============================================
-- Migration Complete!
-- ============================================
-- The contracts table now supports attachments.
-- The code will work with or without this column (it's optional).
-- ============================================

