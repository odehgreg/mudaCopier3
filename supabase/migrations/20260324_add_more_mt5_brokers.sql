/*
  # Add More MT5 Brokers

  ## Overview
  Adds a wider set of MT5-capable retail brokers so they appear in the
  account-connect UI and can use the existing MT4/MT5 bridge flow.
*/

INSERT INTO brokers (name, logo_url, supported_platforms, api_endpoint)
VALUES
  ('Octa', 'https://octafx.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.octafx.com'),
  ('HFM', 'https://hfm.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.hfm.com'),
  ('Tickmill', 'https://tickmill.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.tickmill.com'),
  ('FP Markets', 'https://fpmarkets.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.fpmarkets.com'),
  ('Vantage', 'https://vantagemarkets.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.vantagemarkets.com'),
  ('Axi', 'https://axi.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.axi.com'),
  ('Eightcap', 'https://eightcap.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.eightcap.com'),
  ('Admirals', 'https://admirals.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.admirals.com'),
  ('BlackBull Markets', 'https://blackbull.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.blackbull.com'),
  ('BDSwiss', 'https://bdswiss.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.bdswiss.com'),
  ('ACY Securities', 'https://acy.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.acy.com'),
  ('Orbex', 'https://orbex.com/logo.png', ARRAY['MT4', 'MT5'], 'https://mt4-api.orbex.com')
ON CONFLICT (name) DO UPDATE
SET
  logo_url = EXCLUDED.logo_url,
  supported_platforms = EXCLUDED.supported_platforms,
  api_endpoint = EXCLUDED.api_endpoint;
