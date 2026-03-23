# TradersConnect-Style Architecture

This project has been updated to work like TradersConnect, a cloud-based trade copier that connects directly to broker servers without requiring user-side software or EA installation.

## Key Features

### 🔒 Secure Cloud-Based Connections

- **No client-side API management**: Users don't need to install software or manage API keys locally
- **Encrypted credential storage**: Credentials are stored securely in Supabase with encryption
- **Read-only API sync**: Direct connections to broker backends for trade data synchronization

### 🌐 Multi-Platform Support

- **MetaTrader 4 (MT4)**: Full support for MT4 brokers
- **MetaTrader 5 (MT5)**: Enhanced support for MT5 brokers
- **cTrader**: OpenAPI integration for cTrader platforms
- **DXTrade**: Added support for DXTrade platform

### 🔄 Automatic Synchronization

- **Background sync jobs**: Automatic trade synchronization from broker accounts
- **Real-time updates**: Live trade data streaming and balance updates
- **Webhook support**: Integration with Slack, Teams, and other services (coming soon)

### 🏗️ Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   User Client   │────│   Supabase       │────│   Broker APIs   │
│   (React App)   │    │   Edge Functions │    │   (MT4/MT5/     │
└─────────────────┘    │                  │    │    cTrader/     │
                       │ • Auth           │    │    DXTrade)     │
                       │ • Database       │    └─────────────────┘
                       │ • Edge Functions │
                       │ • Background Jobs│
                       └──────────────────┘
```

### 📊 Database Schema

#### Enhanced Trading Accounts

```sql
trading_accounts (
  id, user_id, account_name, platform, account_number,
  broker, broker_id, server, balance, equity,
  encrypted_credentials, last_sync, sync_status
)
```

#### Secure Credential Storage

```sql
account_credentials (
  account_id, encrypted_data
)
```

#### Background Synchronization

```sql
sync_jobs (
  account_id, job_type, status, started_at,
  completed_at, trades_synced
)
```

## How It Works

### 1. Account Setup

1. User selects broker and platform
2. Enters credentials once
3. System validates connection
4. Credentials stored encrypted in database

### 2. Automatic Synchronization

1. Background jobs run periodically
2. Fetch trades from broker APIs
3. Update account balances and positions
4. Store trade history for analytics

### 3. Trade Copying

1. Master account trades are detected
2. Copied to slave accounts via broker APIs
3. Risk management and lot sizing applied
4. Real-time monitoring and notifications

## API Endpoints

### Fetch Broker Accounts

```
POST /functions/v1/fetch-broker-accounts
```

Validates credentials and fetches account information.

### Sync Account Trades

```
POST /functions/v1/sync-account-trades
```

Background synchronization of trade data.

## Supported Brokers

### Real API Support

- **OANDA**: Full REST API integration
- **Dukascopy**: Direct API access
- **Interactive Brokers**: IB API integration

### Bridge APIs

- **FTMO, Exness, IC Markets, etc.**: MT4/MT5 REST bridges
- **Spotware**: cTrader OpenAPI
- **DXTrade**: DXTrade API integration

### Demo Fallback

For brokers without live APIs, demo data is provided for testing.

## Security Features

- **Encrypted credentials**: PGP encryption for sensitive data
- **Row Level Security**: Database-level access control
- **Service role access**: Background jobs use service role
- **Audit logging**: All API calls and sync operations logged

## Development Setup

1. **Database Migration**:

   ```bash
   # Apply TradersConnect features migration
   supabase db reset
   ```

2. **Environment Variables**:

   ```env
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

3. **Edge Functions**:
   - `fetch-broker-accounts`: Account validation and fetching
   - `sync-account-trades`: Background trade synchronization

## Usage

### Adding an Account

1. Go to Accounts page
2. Select platform (MT4/MT5/cTrader/DXTrade)
3. Choose broker from dropdown
4. Select server (Live/Demo)
5. Enter account credentials
6. System validates and stores securely

### Trade Copying

1. Set up master account
2. Add slave accounts
3. Configure copy settings (lot multiplier, risk management)
4. Enable copying - trades sync automatically

## Future Enhancements

- **Webhook integrations**: Slack, Teams notifications
- **Advanced analytics**: Performance metrics, risk analysis
- **Mobile app**: iOS/Android companion apps
- **Multi-asset support**: Crypto, commodities, indices
- **Social trading**: Follow other traders' strategies
