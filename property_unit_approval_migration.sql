-- ============================================
-- Property and Unit Approval Status Database Migration
-- ============================================
-- This script adds the approval_status column to properties and units tables
-- ============================================

-- Add approval_status column to properties table
ALTER TABLE properties 
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Set default value for existing properties (they are already approved)
UPDATE properties 
  SET approval_status = 'approved' 
  WHERE approval_status IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_properties_approval_status ON properties(approval_status);

-- Add approval_status column to units table
ALTER TABLE units 
  ADD COLUMN IF NOT EXISTS approval_status TEXT CHECK (approval_status IN ('pending', 'approved', 'rejected'));

-- Set default value for existing units (they are already approved)
UPDATE units 
  SET approval_status = 'approved' 
  WHERE approval_status IS NULL;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_units_approval_status ON units(approval_status);

