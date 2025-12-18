-- Add daily credit tracking columns to users table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'last_daily_reset'
  ) THEN
    ALTER TABLE users ADD COLUMN last_daily_reset timestamptz DEFAULT NOW();
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_name = 'users'
      AND column_name = 'daily_used'
  ) THEN
    ALTER TABLE users ADD COLUMN daily_used INTEGER DEFAULT 0;
  END IF;
END$$;