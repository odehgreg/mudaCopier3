/*
  # Comprehensive Brokers and Prop Firms List

  ## Overview
  Populates the brokers table with a complete list of major prop trading firms and retail brokers
  that support MT4, MT5, and cTrader platforms.
*/

-- Delete old records to repopulate
DELETE FROM brokers WHERE 1=1;

-- Insert comprehensive list of prop trading firms
INSERT INTO brokers (name, logo_url, supported_platforms, api_endpoint) VALUES
  -- Prop Trading Firms
  ('FTMO', 'https://brand.ftmo.com/download/ftmo-logo-150x150.png', ARRAY['MT4', 'MT5'], 'https://api.ftmo.com'),
  ('Funded Trading Plus', 'https://fundedtradingplus.com/ftp-logo.png', ARRAY['MT4', 'MT5'], 'https://api.fundedtradingplus.com'),
  ('The Prop Trader', 'https://theproptrade.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.theproptrade.com'),
  ('E8 Markets', 'https://e8markets.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.e8markets.com'),
  ('5er Funding', 'https://5erfunding.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.5erfunding.com'),
  ('TopStep Trader', 'https://topsteptrader.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.topsteptrader.com'),
  ('Earn2Trade', 'https://earn2trade.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.earn2trade.com'),
  ('SMC Trading', 'https://smctrading.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.smctrading.com'),
  ('Apex Trader Funding', 'https://apextrader.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.apextrader.com'),
  ('My Funded FX', 'https://myfxbook.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.myfxbook.com'),
  ('Funded Trader Plus', 'https://fundedtraderplus.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.fundedtraderplus.com'),
  ('PropCharts', 'https://propcharts.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.propcharts.com'),
  ('FinMatch', 'https://finmatch.io/logo.png', ARRAY['MT4', 'MT5'], 'https://api.finmatch.io'),
  ('TradingFuel', 'https://tradingfuel.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.tradingfuel.com'),
  ('Urja', 'https://urjafunded.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.urjafunded.com'),
  
  -- Major Retail Brokers
  ('Exness', 'https://exnessbranding.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.exness.com'),
  ('Forex.com', 'https://forex.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.forex.com'),
  ('OANDA', 'https://oanda.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.oanda.com'),
  ('IC Markets', 'https://icmarkets.com/assets/images/logo.png', ARRAY['MT4', 'MT5', 'cTrader'], 'https://api.icmarkets.com'),
  ('XM.COM', 'https://xmtrading.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.xmtrading.com'),
  ('HotForex', 'https://hotforex.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.hotforex.com'),
  ('Pepperstone', 'https://pepperstone.com/logo.png', ARRAY['MT4', 'MT5', 'cTrader'], 'https://api.pepperstone.com'),
  ('FxPro', 'https://fxpro.com/logo.png', ARRAY['MT4', 'MT5', 'cTrader'], 'https://api.fxpro.com'),
  ('IG', 'https://ig.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.ig.com'),
  ('Plus500', 'https://plus500.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.plus500.com'),
  ('eToro', 'https://etoro.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.etoro.com'),
  ('Libertex', 'https://libertex.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.libertex.com'),
  ('Capital.com', 'https://capital.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.capital.com'),
  ('Avatrade', 'https://avatrade.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.avatrade.com'),
  ('FBS', 'https://fbs.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.fbs.com'),
  ('FXTM', 'https://fxtm.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.fxtm.com'),
  ('Roboforex', 'https://roboforex.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.roboforex.com'),
  ('Instaforex', 'https://instaforex.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.instaforex.com'),
  ('Alpari', 'https://alpari.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.alpari.com'),
  ('Interactive Brokers', 'https://interactivebrokers.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.interactivebrokers.com'),
  ('Saxo Bank', 'https://saxobank.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.saxobank.com'),
  ('ThinkMarkets', 'https://thinkmarkets.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.thinkmarkets.com'),
  ('Swissquote', 'https://swissquote.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.swissquote.com'),
  ('Dukascopy', 'https://dukascopy.com/logo.png', ARRAY['MT4', 'MT5'], 'https://api.dukascopy.com'),
  
  -- cTrader Brokers
  ('Ctrader Alliance', 'https://ctrader.com/logo.png', ARRAY['cTrader'], 'https://api.ctrader-alliance.com'),
  ('LiqTech', 'https://liqtech.com/logo.png', ARRAY['cTrader'], 'https://api.liqtech.com'),
  ('Spotware', 'https://spotware.com/logo.png', ARRAY['cTrader'], 'https://api.spotware.com');

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_brokers_name ON brokers(name);
CREATE INDEX IF NOT EXISTS idx_brokers_platforms ON brokers USING GIN(supported_platforms);
