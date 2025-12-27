-- ============================================
-- Delete All Data Except Users
-- ============================================
-- This script deletes all data from all tables except the users table
-- Tables are deleted in dependency order to respect foreign key constraints
-- ============================================

-- Disable foreign key checks temporarily (PostgreSQL doesn't support this directly,
-- but we'll delete in the correct order instead)

-- 1. Delete reminders (depends on invoices)
DELETE FROM reminders;

-- 2. Delete payments (depends on invoices)
DELETE FROM payments;

-- 3. Delete invoices (depends on contracts)
DELETE FROM invoices;

-- 4. Delete approval_requests (depends on users, but we're keeping users)
-- Note: This will delete approval requests but keep the users table intact
DELETE FROM approval_requests;

-- 5. Delete contracts (depends on tenants and units)
DELETE FROM contracts;

-- 6. Delete units (depends on properties)
DELETE FROM units;

-- 7. Delete properties
DELETE FROM properties;

-- 8. Delete tenants
DELETE FROM tenants;

-- ============================================
-- Verification: Check that only users table has data
-- ============================================
-- Uncomment the following to verify:

-- SELECT 'tenants' as table_name, COUNT(*) as count FROM tenants
-- UNION ALL
-- SELECT 'properties', COUNT(*) FROM properties
-- UNION ALL
-- SELECT 'units', COUNT(*) FROM units
-- UNION ALL
-- SELECT 'contracts', COUNT(*) FROM contracts
-- UNION ALL
-- SELECT 'invoices', COUNT(*) FROM invoices
-- UNION ALL
-- SELECT 'payments', COUNT(*) FROM payments
-- UNION ALL
-- SELECT 'reminders', COUNT(*) FROM reminders
-- UNION ALL
-- SELECT 'approval_requests', COUNT(*) FROM approval_requests
-- UNION ALL
-- SELECT 'users', COUNT(*) FROM users;



