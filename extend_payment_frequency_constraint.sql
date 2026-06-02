-- Extend payment_frequency CHECK constraint to allow 6_payment and 12_payment.
-- Run this in Supabase SQL Editor on the project.

ALTER TABLE contracts
  DROP CONSTRAINT IF EXISTS contracts_payment_frequency_check;

ALTER TABLE contracts
  ADD CONSTRAINT contracts_payment_frequency_check
  CHECK (payment_frequency IN (
    '1_payment',
    '2_payment',
    '3_payment',
    '4_payment',
    '6_payment',
    '12_payment'
  ));

-- Verify
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'contracts'::regclass
  AND conname = 'contracts_payment_frequency_check';
