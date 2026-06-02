-- Add RLS policies allowing admins to DELETE rows on the main tables.
-- Mirrors the existing admin UPDATE policies (uses TRIM on users.role for whitespace safety).
-- Safe to re-run — uses DROP POLICY IF EXISTS.

-- =============================================================
-- 1) Inspect current DELETE policies (for diagnosis)
-- =============================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('units', 'properties', 'tenants', 'contracts')
ORDER BY tablename, cmd, policyname;

-- =============================================================
-- 2) Add admin DELETE policies
-- =============================================================

-- UNITS
DROP POLICY IF EXISTS "Admins can delete units" ON units;
CREATE POLICY "Admins can delete units"
  ON units FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND TRIM(users.role) = 'admin'
    )
  );

-- PROPERTIES
DROP POLICY IF EXISTS "Admins can delete properties" ON properties;
CREATE POLICY "Admins can delete properties"
  ON properties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND TRIM(users.role) = 'admin'
    )
  );

-- TENANTS
DROP POLICY IF EXISTS "Admins can delete tenants" ON tenants;
CREATE POLICY "Admins can delete tenants"
  ON tenants FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND TRIM(users.role) = 'admin'
    )
  );

-- CONTRACTS
DROP POLICY IF EXISTS "Admins can delete contracts" ON contracts;
CREATE POLICY "Admins can delete contracts"
  ON contracts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
      AND TRIM(users.role) = 'admin'
    )
  );

-- =============================================================
-- 3) Verify final policy list
-- =============================================================
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('units', 'properties', 'tenants', 'contracts')
ORDER BY tablename, cmd, policyname;
