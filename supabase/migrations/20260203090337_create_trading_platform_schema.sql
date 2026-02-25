/*
  # Trading Platform Schema - TradersConnect Clone

  ## Overview
  Creates the core database schema for a cloud-based trade copier platform that allows traders to copy trades between multiple trading accounts with analytics and risk management.

  ## New Tables

  ### 1. profiles
  User profile information linked to auth.users
  - `id` (uuid, primary key) - Links to auth.users
  - `email` (text) - User email
  - `full_name` (text) - User full name
  - `created_at` (timestamptz) - Account creation timestamp
  - `updated_at` (timestamptz) - Last update timestamp

  ### 2. trading_accounts
  Trading account details (MT4, MT5, cTrader)
  - `id` (uuid, primary key) - Unique account ID
  - `user_id` (uuid) - Links to profiles
  - `account_name` (text) - Custom name for the account
  - `platform` (text) - Platform type (MT4/MT5/cTrader)
  - `account_number` (text) - Trading account number
  - `broker` (text) - Broker name
  - `balance` (decimal) - Current account balance
  - `equity` (decimal) - Current equity
  - `status` (text) - Connection status (connected/disconnected/error)
  - `is_master` (boolean) - Whether this is a source account
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 3. copier_configurations
  Trade copying setup between accounts
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Links to profiles
  - `master_account_id` (uuid) - Source account
  - `slave_account_id` (uuid) - Destination account
  - `enabled` (boolean) - Whether copying is active
  - `lot_multiplier` (decimal) - Lot size multiplier
  - `max_daily_loss` (decimal) - Maximum daily loss limit
  - `max_trades` (integer) - Maximum concurrent trades
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)

  ### 4. trades
  Trade history and monitoring
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Links to profiles
  - `account_id` (uuid) - Links to trading_accounts
  - `ticket_number` (text) - Trade ticket number
  - `symbol` (text) - Trading pair (e.g., EURUSD)
  - `trade_type` (text) - Buy or Sell
  - `lot_size` (decimal) - Position size
  - `open_price` (decimal) - Entry price
  - `close_price` (decimal) - Exit price (null if open)
  - `profit` (decimal) - Profit/loss in account currency
  - `status` (text) - open/closed/pending
  - `opened_at` (timestamptz) - Trade open time
  - `closed_at` (timestamptz) - Trade close time
  - `created_at` (timestamptz)

  ### 5. performance_stats
  Analytics and performance metrics
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Links to profiles
  - `account_id` (uuid) - Links to trading_accounts
  - `total_trades` (integer) - Total number of trades
  - `winning_trades` (integer) - Number of winning trades
  - `losing_trades` (integer) - Number of losing trades
  - `total_profit` (decimal) - Total profit
  - `total_loss` (decimal) - Total loss
  - `win_rate` (decimal) - Win rate percentage
  - `date` (date) - Stats date
  - `created_at` (timestamptz)

  ## Security
  
  ### Row Level Security (RLS)
  - All tables have RLS enabled
  - Users can only access their own data
  - Policies enforce user_id matching for all operations

  ### Policies
  Each table has 4 policies:
  - SELECT: Users can view their own records
  - INSERT: Users can create records for themselves
  - UPDATE: Users can update their own records
  - DELETE: Users can delete their own records
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Create trading_accounts table
CREATE TABLE IF NOT EXISTS trading_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_name text NOT NULL,
  platform text NOT NULL CHECK (platform IN ('MT4', 'MT5', 'cTrader')),
  account_number text NOT NULL,
  broker text NOT NULL,
  balance decimal(15,2) DEFAULT 0,
  equity decimal(15,2) DEFAULT 0,
  status text DEFAULT 'disconnected' CHECK (status IN ('connected', 'disconnected', 'error')),
  is_master boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE trading_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trading accounts"
  ON trading_accounts FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trading accounts"
  ON trading_accounts FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trading accounts"
  ON trading_accounts FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trading accounts"
  ON trading_accounts FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create copier_configurations table
CREATE TABLE IF NOT EXISTS copier_configurations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  master_account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  slave_account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  enabled boolean DEFAULT true,
  lot_multiplier decimal(5,2) DEFAULT 1.0,
  max_daily_loss decimal(15,2) DEFAULT 1000,
  max_trades integer DEFAULT 10,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  CONSTRAINT different_accounts CHECK (master_account_id != slave_account_id)
);

ALTER TABLE copier_configurations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own copier configurations"
  ON copier_configurations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own copier configurations"
  ON copier_configurations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own copier configurations"
  ON copier_configurations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own copier configurations"
  ON copier_configurations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create trades table
CREATE TABLE IF NOT EXISTS trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  ticket_number text NOT NULL,
  symbol text NOT NULL,
  trade_type text NOT NULL CHECK (trade_type IN ('BUY', 'SELL')),
  lot_size decimal(10,2) NOT NULL,
  open_price decimal(15,5) NOT NULL,
  close_price decimal(15,5),
  profit decimal(15,2) DEFAULT 0,
  status text DEFAULT 'open' CHECK (status IN ('open', 'closed', 'pending')),
  opened_at timestamptz DEFAULT now(),
  closed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE trades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own trades"
  ON trades FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own trades"
  ON trades FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own trades"
  ON trades FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own trades"
  ON trades FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create performance_stats table
CREATE TABLE IF NOT EXISTS performance_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES trading_accounts(id) ON DELETE CASCADE,
  total_trades integer DEFAULT 0,
  winning_trades integer DEFAULT 0,
  losing_trades integer DEFAULT 0,
  total_profit decimal(15,2) DEFAULT 0,
  total_loss decimal(15,2) DEFAULT 0,
  win_rate decimal(5,2) DEFAULT 0,
  date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, date)
);

ALTER TABLE performance_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own performance stats"
  ON performance_stats FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own performance stats"
  ON performance_stats FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own performance stats"
  ON performance_stats FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own performance stats"
  ON performance_stats FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_trading_accounts_user_id ON trading_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_copier_configurations_user_id ON copier_configurations(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_user_id ON trades(user_id);
CREATE INDEX IF NOT EXISTS idx_trades_account_id ON trades(account_id);
CREATE INDEX IF NOT EXISTS idx_trades_status ON trades(status);
CREATE INDEX IF NOT EXISTS idx_performance_stats_user_id ON performance_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_performance_stats_account_date ON performance_stats(account_id, date);