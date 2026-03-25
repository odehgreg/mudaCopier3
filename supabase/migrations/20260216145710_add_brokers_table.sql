/*
  # Add Brokers Table and Connections

  ## Overview
  Creates broker management system for automated account fetching.

  ## New Tables
  - `brokers`: Available trading brokers with API endpoints
  - `broker_connections`: User authentication to brokers
*/

-- Create brokers table
CREATE TABLE IF NOT EXISTS brokers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  logo_url text,
  supported_platforms text[] DEFAULT ARRAY[]::text[],
  api_endpoint text,
  created_at timestamptz DEFAULT now()
);

-- Create broker_connections table
CREATE TABLE IF NOT EXISTS broker_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  broker_id uuid NOT NULL REFERENCES brokers(id) ON DELETE CASCADE,
  api_key text NOT NULL,
  api_secret text NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'error')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, broker_id)
);

-- Enable RLS
ALTER TABLE brokers ENABLE ROW LEVEL SECURITY;
ALTER TABLE broker_connections ENABLE ROW LEVEL SECURITY;

-- Broker policies
DROP POLICY IF EXISTS "Everyone can view brokers" ON brokers;
CREATE POLICY "Everyone can view brokers"
  ON brokers FOR SELECT
  TO authenticated
  USING (true);

-- Broker connection policies
DROP POLICY IF EXISTS "Users can view own broker connections" ON broker_connections;
CREATE POLICY "Users can view own broker connections"
  ON broker_connections FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own broker connections" ON broker_connections;
CREATE POLICY "Users can insert own broker connections"
  ON broker_connections FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own broker connections" ON broker_connections;
CREATE POLICY "Users can update own broker connections"
  ON broker_connections FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own broker connections" ON broker_connections;
CREATE POLICY "Users can delete own broker connections"
  ON broker_connections FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Add columns to trading_accounts
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'trading_accounts' AND column_name = 'broker_id'
  ) THEN
    ALTER TABLE trading_accounts ADD COLUMN broker_id uuid REFERENCES brokers(id);
    ALTER TABLE trading_accounts ADD COLUMN api_key text;
    ALTER TABLE trading_accounts ADD COLUMN last_sync timestamptz;
  END IF;
END $$;

-- Insert default brokers
INSERT INTO brokers (name, logo_url, supported_platforms, api_endpoint)
VALUES
  ('FTMO', 'https://via.placeholder.com/100?text=FTMO', ARRAY['MT4', 'MT5'], 'https://api.ftmo.com'),
  ('ICMarkets', 'https://via.placeholder.com/100?text=ICMarkets', ARRAY['MT4', 'MT5', 'cTrader'], 'https://api.icmarkets.com'),
  ('Prop Firm X', 'https://via.placeholder.com/100?text=PFX', ARRAY['MT4', 'MT5'], 'https://api.propfirmx.com'),
  ('XM', 'https://via.placeholder.com/100?text=XM', ARRAY['MT4', 'MT5'], 'https://api.xmtrading.com'),
  ('OctaFX', 'https://via.placeholder.com/100?text=OctaFX', ARRAY['MT4', 'MT5'], 'https://api.octafx.com'),
  ('HotForex', 'https://via.placeholder.com/100?text=HotForex', ARRAY['MT4', 'MT5'], 'https://api.hotforex.com')
ON CONFLICT (name) DO NOTHING;

CREATE INDEX IF NOT EXISTS idx_broker_connections_user_id ON broker_connections(user_id);
CREATE INDEX IF NOT EXISTS idx_broker_connections_broker_id ON broker_connections(broker_id);
