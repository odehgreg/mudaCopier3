-- Add TradersConnect-style features to trading_accounts table
-- This migration enhances the platform to work like TradersConnect with secure credential storage

-- Add new columns to trading_accounts table
ALTER TABLE trading_accounts
ADD COLUMN IF NOT EXISTS broker_id uuid REFERENCES brokers(id),
ADD COLUMN IF NOT EXISTS server text,
ADD COLUMN IF NOT EXISTS encrypted_credentials text, -- Encrypted JSON with account_id, password, api_key
ADD COLUMN IF NOT EXISTS last_sync timestamptz,
ADD COLUMN IF NOT EXISTS sync_status text DEFAULT 'pending' CHECK (sync_status IN ('pending', 'syncing', 'success', 'error')),
ADD COLUMN IF NOT EXISTS sync_error text;

-- Update platform constraint to include DXTrade
ALTER TABLE trading_accounts
DROP CONSTRAINT IF EXISTS trading_accounts_platform_check;

ALTER TABLE trading_accounts
ADD CONSTRAINT trading_accounts_platform_check
CHECK (platform IN ('MT4', 'MT5', 'cTrader', 'DXTrade'));

-- Create encrypted_credentials table for better security (optional enhancement)
CREATE TABLE IF NOT EXISTS account_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  encrypted_data text NOT NULL, -- PGP encrypted JSON with credentials
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE account_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own account credentials"
  ON account_credentials FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      WHERE ta.id = account_credentials.account_id
      AND ta.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own account credentials"
  ON account_credentials FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      WHERE ta.id = account_credentials.account_id
      AND ta.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own account credentials"
  ON account_credentials FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      WHERE ta.id = account_credentials.account_id
      AND ta.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      WHERE ta.id = account_credentials.account_id
      AND ta.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own account credentials"
  ON account_credentials FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      WHERE ta.id = account_credentials.account_id
      AND ta.user_id = auth.uid()
    )
  );

-- Create sync_jobs table for background synchronization
CREATE TABLE IF NOT EXISTS sync_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  job_type text NOT NULL CHECK (job_type IN ('full_sync', 'incremental_sync', 'balance_update')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  trades_synced integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE sync_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sync jobs"
  ON sync_jobs FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM trading_accounts ta
      WHERE ta.id = sync_jobs.account_id
      AND ta.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_trading_accounts_broker_id ON trading_accounts(broker_id);
CREATE INDEX IF NOT EXISTS idx_trading_accounts_last_sync ON trading_accounts(last_sync);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_account_id ON sync_jobs(account_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Add triggers for updated_at
DROP TRIGGER IF EXISTS update_trading_accounts_updated_at ON trading_accounts;
CREATE TRIGGER update_trading_accounts_updated_at
  BEFORE UPDATE ON trading_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_account_credentials_updated_at ON account_credentials;
CREATE TRIGGER update_account_credentials_updated_at
  BEFORE UPDATE ON account_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();