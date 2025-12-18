-- Add paid_points column to users table for tracking purchased credits
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'paid_points'
  ) THEN
    ALTER TABLE users ADD COLUMN paid_points INTEGER DEFAULT 0;
  END IF;
END$$;